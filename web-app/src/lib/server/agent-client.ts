import { CSHARP_AGENT_URL, CSHARP_AGENT_API_KEY } from '$env/static/private';
import {
	sendAgentCommand,
	isAgentConnected,
	getUserAgents,
	getAllConnectedAgents,
} from './websocket-server';
import { agentManager } from './agent-manager';
import { ServerMessageType } from '$lib/types/websocket';
import type { ConnectedAgent } from '$lib/types/websocket';

// ============================================================================
// Types
// ============================================================================

export interface EAControlRequest {
	accountId: string;
	action: 'start' | 'stop' | 'pause';
}

export interface EAStatusResponse {
	accountId: string;
	status: 'RUNNING' | 'STOPPED' | 'PAUSED' | 'ERROR';
	safetyIndicator: 'RED' | 'ORANGE' | 'GREEN';
	message?: string;
}

export interface AccountSetupRequest {
	userId: string;
	accountNumber: string;
	broker: string;
	serverName: string;
	login: string;
	password: string;
}

export interface AgentCommandResult {
	success: boolean;
	data?: unknown;
	error?: string;
	latencyMs?: number;
}

// ============================================================================
// WebSocket-First Agent Client
// ============================================================================

class CSharpAgentClient {
	private baseUrl: string;
	private apiKey: string;
	private commandTimeout: number;

	constructor() {
		this.baseUrl = CSHARP_AGENT_URL;
		this.apiKey = CSHARP_AGENT_API_KEY;
		this.commandTimeout = parseInt(process.env.WEBSOCKET_TIMEOUT || '30000');
	}

	// ============================================================================
	// HTTP Fallback (for agents without WebSocket)
	// ============================================================================

	private async httpRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': this.apiKey,
				...options.headers,
			},
		});

		if (!response.ok) {
			throw new Error(`Agent API error: ${response.statusText}`);
		}

		return response.json();
	}

	// ============================================================================
	// WebSocket Commands (Primary - Low Latency)
	// ============================================================================

	/**
	 * Send EA control command via WebSocket
	 * Falls back to HTTP if agent not connected via WebSocket
	 */
	async controlEA(request: EAControlRequest): Promise<EAStatusResponse> {
		const { accountId, action } = request;

		// Find connected agent for this account
		const agent = this.findAgentByAccountId(accountId);

		if (agent && isAgentConnected(agent.id)) {
			// Use WebSocket (low latency path)
			const startTime = Date.now();

			try {
				let commandType: ServerMessageType;
				switch (action) {
					case 'start':
						commandType = ServerMessageType.START_EA;
						break;
					case 'stop':
						commandType = ServerMessageType.STOP_EA;
						break;
					case 'pause':
						commandType = ServerMessageType.PAUSE_EA;
						break;
				}

				const result = await sendAgentCommand(
					agent.id,
					commandType,
					{ accountId },
					this.commandTimeout
				);

				const latencyMs = Date.now() - startTime;
				console.log(`[AgentClient] EA control via WebSocket completed in ${latencyMs}ms`);

				return result as EAStatusResponse;
			} catch (error) {
				console.warn('[AgentClient] WebSocket command failed, falling back to HTTP:', error);
			}
		}

		// HTTP fallback
		return this.httpRequest<EAStatusResponse>('/api/ea/control', {
			method: 'POST',
			body: JSON.stringify(request),
		});
	}

	/**
	 * Get EA status - prefer in-memory state from WebSocket connection
	 */
	async getEAStatus(accountId: string): Promise<EAStatusResponse> {
		// First check in-memory state (fastest)
		const agent = this.findAgentByAccountId(accountId);

		if (agent && agent.eaStatus) {
			// Return cached status from heartbeat data
			return {
				accountId,
				status: agent.eaStatus.running
					? 'RUNNING'
					: agent.eaStatus.loaded
						? 'PAUSED'
						: 'STOPPED',
				safetyIndicator: 'GREEN', // Would need to be tracked separately
				message: `Last heartbeat: ${new Date(agent.lastHeartbeat).toISOString()}`,
			};
		}

		// Fall back to HTTP request
		return this.httpRequest<EAStatusResponse>(`/api/ea/status/${accountId}`);
	}

	/**
	 * Start EA via WebSocket
	 */
	async startEA(
		agentId: string,
		eaName?: string,
		symbol?: string,
		timeframe?: string
	): Promise<AgentCommandResult> {
		if (!isAgentConnected(agentId)) {
			return { success: false, error: 'Agent not connected' };
		}

		const startTime = Date.now();

		try {
			const result = await sendAgentCommand(
				agentId,
				ServerMessageType.START_EA,
				{ eaName, symbol, timeframe },
				this.commandTimeout
			);

			return {
				success: true,
				data: result,
				latencyMs: Date.now() - startTime,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				latencyMs: Date.now() - startTime,
			};
		}
	}

	/**
	 * Stop EA via WebSocket
	 */
	async stopEA(agentId: string): Promise<AgentCommandResult> {
		if (!isAgentConnected(agentId)) {
			return { success: false, error: 'Agent not connected' };
		}

		const startTime = Date.now();

		try {
			const result = await sendAgentCommand(
				agentId,
				ServerMessageType.STOP_EA,
				{},
				this.commandTimeout
			);

			return {
				success: true,
				data: result,
				latencyMs: Date.now() - startTime,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				latencyMs: Date.now() - startTime,
			};
		}
	}

	/**
	 * Pause EA via WebSocket
	 */
	async pauseEA(agentId: string): Promise<AgentCommandResult> {
		if (!isAgentConnected(agentId)) {
			return { success: false, error: 'Agent not connected' };
		}

		const startTime = Date.now();

		try {
			const result = await sendAgentCommand(
				agentId,
				ServerMessageType.PAUSE_EA,
				{},
				this.commandTimeout
			);

			return {
				success: true,
				data: result,
				latencyMs: Date.now() - startTime,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				latencyMs: Date.now() - startTime,
			};
		}
	}

	/**
	 * Load EA file via WebSocket
	 */
	async loadEA(
		agentId: string,
		eaName: string,
		symbol: string,
		timeframe: string,
		settings?: Record<string, unknown>
	): Promise<AgentCommandResult> {
		if (!isAgentConnected(agentId)) {
			return { success: false, error: 'Agent not connected' };
		}

		const startTime = Date.now();

		try {
			const result = await sendAgentCommand(
				agentId,
				ServerMessageType.LOAD_EA,
				{ eaName, symbol, timeframe, settings },
				this.commandTimeout
			);

			return {
				success: true,
				data: result,
				latencyMs: Date.now() - startTime,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				latencyMs: Date.now() - startTime,
			};
		}
	}

	/**
	 * Update EA settings via WebSocket
	 */
	async updateEASettings(
		agentId: string,
		settings: Record<string, unknown>
	): Promise<AgentCommandResult> {
		if (!isAgentConnected(agentId)) {
			return { success: false, error: 'Agent not connected' };
		}

		const startTime = Date.now();

		try {
			const result = await sendAgentCommand(
				agentId,
				ServerMessageType.UPDATE_SETTINGS,
				{ settings },
				this.commandTimeout
			);

			return {
				success: true,
				data: result,
				latencyMs: Date.now() - startTime,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				latencyMs: Date.now() - startTime,
			};
		}
	}

	/**
	 * Request trade sync via WebSocket
	 */
	async syncTradesWS(agentId: string): Promise<AgentCommandResult> {
		if (!isAgentConnected(agentId)) {
			return { success: false, error: 'Agent not connected' };
		}

		const startTime = Date.now();

		try {
			const result = await sendAgentCommand(
				agentId,
				ServerMessageType.SYNC_TRADES,
				{},
				this.commandTimeout
			);

			return {
				success: true,
				data: result,
				latencyMs: Date.now() - startTime,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				latencyMs: Date.now() - startTime,
			};
		}
	}

	// ============================================================================
	// HTTP API Methods (Legacy/Fallback)
	// ============================================================================

	async setupAccount(request: AccountSetupRequest): Promise<{ success: boolean; message: string }> {
		return this.httpRequest('/api/account/setup', {
			method: 'POST',
			body: JSON.stringify(request),
		});
	}

	async getSafetyIndicator(): Promise<{ indicator: 'RED' | 'ORANGE' | 'GREEN'; reason: string }> {
		return this.httpRequest('/api/market/safety');
	}

	async syncTrades(accountId: string): Promise<{ success: boolean; tradesCount: number }> {
		// Try WebSocket first
		const agent = this.findAgentByAccountId(accountId);
		if (agent && isAgentConnected(agent.id)) {
			const result = await this.syncTradesWS(agent.id);
			if (result.success) {
				return { success: true, tradesCount: (result.data as { tradesCount?: number })?.tradesCount || 0 };
			}
		}

		// HTTP fallback
		return this.httpRequest(`/api/trades/sync/${accountId}`, {
			method: 'POST',
		});
	}

	// ============================================================================
	// Connection Status Methods
	// ============================================================================

	/**
	 * Check if a specific agent is connected via WebSocket
	 */
	isConnected(agentId: string): boolean {
		return isAgentConnected(agentId);
	}

	/**
	 * Get all agents connected for a user
	 */
	getUserConnectedAgents(userId: string): ConnectedAgent[] {
		return getUserAgents(userId);
	}

	/**
	 * Get all connected agents (admin)
	 */
	getAllConnectedAgents(): ConnectedAgent[] {
		return getAllConnectedAgents();
	}

	/**
	 * Get connection statistics
	 */
	getConnectionStats(): ReturnType<typeof agentManager.getStats> {
		return agentManager.getStats();
	}

	/**
	 * Send targeted command to specific MT5 account on a pool agent
	 * @param mt5AccountNumber - The MT5 account number to target
	 * @param command - Command type (start_ea, stop_ea, etc.)
	 * @param payload - Optional command payload
	 */
	async sendTargetedCommand(
		mt5AccountNumber: string,
		command: 'start_ea' | 'stop_ea' | 'pause_ea' | 'load_ea' | 'update_settings' | 'sync_trades' | 'take_screenshot' | 'get_status',
		payload?: Record<string, unknown>
	): Promise<AgentCommandResult> {
		const startTime = Date.now();

		try {
			// Find the pool agent managing this account
			const assignment = await import('@prisma/client').then(({ PrismaClient }) => {
				const prisma = new PrismaClient();
				return prisma.mT5AccountAssignment.findUnique({
					where: { mt5AccountNumber },
					include: { agent: true }
				});
			});

			if (!assignment) {
				return {
					success: false,
					error: `MT5 account ${mt5AccountNumber} not assigned to any pool agent`
				};
			}

			if (!assignment.isActive || assignment.status === 'offline') {
				return {
					success: false,
					error: `MT5 account ${mt5AccountNumber} is ${assignment.status}`
				};
			}

			// Check if pool agent is connected
			if (!isAgentConnected(assignment.agentId)) {
				return {
					success: false,
					error: `Pool agent ${assignment.agent.vpsName || assignment.agentId} is not connected`
				};
			}

			// Send targeted command via WebSocket
			const result = await sendAgentCommand(assignment.agentId, {
				type: ServerMessageType.TARGETED_COMMAND,
				commandId: `cmd-${Date.now()}-${Math.random().toString(36).substring(7)}`,
				targetAccount: mt5AccountNumber,
				command,
				payload,
				timestamp: Date.now()
			});

			return {
				success: result.success,
				data: result.data,
				error: result.error,
				latencyMs: Date.now() - startTime
			};
		} catch (error: any) {
			console.error('[AgentClient] sendTargetedCommand error:', error);
			return {
				success: false,
				error: error.message || 'Failed to send targeted command',
				latencyMs: Date.now() - startTime
			};
		}
	}

	// ============================================================================
	// Helper Methods
	// ============================================================================

	private findAgentByAccountId(accountId: string): ConnectedAgent | undefined {
		// Search through connected agents for one with matching account
		const allAgents = getAllConnectedAgents();
		return allAgents.find(
			(agent) => agent.accountInfo?.accountNumber === accountId
		);
	}
}

// ============================================================================
// Singleton Export
// ============================================================================

export const agentClient = new CSharpAgentClient();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Send a command to the agent for a specific user
 * Finds the user's agent and sends the command
 */
export async function sendCommandToAgent(
	userId: string,
	command: { type: string; payload: Record<string, unknown> }
): Promise<AgentCommandResult> {
	try {
		// Get user's connected agents
		const userAgents = agentClient.getUserConnectedAgents(userId);

		if (userAgents.length === 0) {
			return {
				success: false,
				error: 'No agents connected for this user'
			};
		}

		// Use the first connected agent (or implement more sophisticated routing)
		const agentId = userAgents[0].id;

		// Send command based on type
		if (command.type === 'update_bot_settings') {
			return await agentClient.updateEASettings(agentId, command.payload);
		}

		// For other command types, use a generic send mechanism
		const result = await sendAgentCommand(agentId, command.type as any, command.payload);

		return {
			success: true,
			data: result
		};
	} catch (error: any) {
		console.error('[sendCommandToAgent] Error:', error);
		return {
			success: false,
			error: error.message || 'Failed to send command to agent'
		};
	}
}
