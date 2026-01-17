/**
 * High-Performance WebSocket Server for MT5 Algo SaaS Platform
 *
 * Optimized for low-latency trading communication between SvelteKit web app
 * and C# agents running on VPS servers.
 *
 * Performance Optimizations:
 * - Minimal message validation (trust authenticated agents)
 * - Direct socket-to-socket routing
 * - No middleware overhead
 * - Binary message support ready
 * - Connection pooling via agent manager
 */

import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { IncomingMessage } from 'http';
import { agentManager } from './agent-manager';
import prisma from './db';
import {
	AgentMessageType,
	ServerMessageType,
	type BaseMessage,
	type AuthMessage,
	type HeartbeatMessage,
	type StatusUpdateMessage,
	type TradeUpdateMessage,
	type CommandResultMessage,
	type ErrorMessage,
	type AuthResponseMessage,
	type MultiAuthMessage,
	type MultiAuthResponseMessage,
	type MultiStatusUpdateMessage,
	type MultiHeartbeatMessage,
	isAuthMessage,
	isHeartbeatMessage,
	isStatusUpdateMessage,
	isTradeUpdateMessage,
	isCommandResultMessage,
	isErrorMessage,
	isMultiAuthMessage,
	isMultiStatusUpdateMessage,
	isMultiHeartbeatMessage,
} from '$lib/types/websocket';

// ============================================================================
// Configuration
// ============================================================================

export interface WebSocketServerConfig {
	port: number;
	heartbeatInterval: number;
	timeout: number;
	maxPayload: number;
	perMessageDeflate: boolean;
	path: string;
}

const DEFAULT_CONFIG: WebSocketServerConfig = {
	port: parseInt(process.env.WEBSOCKET_PORT || '3001'),
	heartbeatInterval: parseInt(process.env.WEBSOCKET_HEARTBEAT_INTERVAL || '5000'),
	timeout: parseInt(process.env.WEBSOCKET_TIMEOUT || '30000'),
	maxPayload: 1024 * 1024, // 1MB max message size
	perMessageDeflate: false, // Disabled for lower latency
	path: '/ws',
};

// ============================================================================
// WebSocket Server Class
// ============================================================================

class MT5WebSocketServer {
	private wss: WebSocketServer | null = null;
	private config: WebSocketServerConfig;
	private isRunning = false;
	private pendingAuth: Map<WebSocket, NodeJS.Timeout> = new Map();

	constructor(config: Partial<WebSocketServerConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	// ============================================================================
	// Server Lifecycle
	// ============================================================================

	/**
	 * Start the WebSocket server
	 */
	start(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.isRunning) {
				console.warn('[WebSocket] Server already running');
				resolve();
				return;
			}

			try {
				this.wss = new WebSocketServer({
					port: this.config.port,
					path: this.config.path,
					maxPayload: this.config.maxPayload,
					perMessageDeflate: this.config.perMessageDeflate,
					// Skip client tracking - we do our own via agentManager
					clientTracking: false,
				});

				this.wss.on('listening', () => {
					this.isRunning = true;
					console.log(
						`[WebSocket] Server started on port ${this.config.port} (path: ${this.config.path})`
					);
					console.log('[WebSocket] Optimizations enabled:');
					console.log('  - perMessageDeflate: disabled for lower latency');
					console.log(`  - maxPayload: ${this.config.maxPayload} bytes`);
					console.log(`  - heartbeatInterval: ${this.config.heartbeatInterval}ms`);
					console.log(`  - timeout: ${this.config.timeout}ms`);
					resolve();
				});

				this.wss.on('connection', (socket, request) => {
					this.handleConnection(socket, request);
				});

				this.wss.on('error', (error) => {
					console.error('[WebSocket] Server error:', error);
					if (!this.isRunning) {
						reject(error);
					}
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Stop the WebSocket server gracefully
	 */
	async stop(): Promise<void> {
		if (!this.isRunning || !this.wss) {
			return;
		}

		console.log('[WebSocket] Stopping server...');

		// Clear pending auth timeouts
		for (const timeout of this.pendingAuth.values()) {
			clearTimeout(timeout);
		}
		this.pendingAuth.clear();

		// Shutdown agent manager first
		await agentManager.shutdown();

		// Close WebSocket server
		return new Promise((resolve) => {
			this.wss!.close(() => {
				this.isRunning = false;
				console.log('[WebSocket] Server stopped');
				resolve();
			});
		});
	}

	// ============================================================================
	// Connection Handling
	// ============================================================================

	private handleConnection(socket: WebSocket, request: IncomingMessage): void {
		const remoteAddress = request.socket.remoteAddress;
		console.log(`[WebSocket] New connection from ${remoteAddress}`);

		// Set binary type for potential binary messages
		socket.binaryType = 'arraybuffer';

		// Set auth timeout - must authenticate within 10 seconds
		const authTimeout = setTimeout(() => {
			console.warn(`[WebSocket] Auth timeout for ${remoteAddress}`);
			socket.close(4001, 'Authentication timeout');
		}, 10000);
		this.pendingAuth.set(socket, authTimeout);

		// Message handler
		socket.on('message', (data, isBinary) => {
			this.handleMessage(socket, data, isBinary, remoteAddress);
		});

		// Error handler
		socket.on('error', (error) => {
			console.error(`[WebSocket] Socket error from ${remoteAddress}:`, error.message);
		});

		// Close handler
		socket.on('close', (code, reason) => {
			this.handleDisconnect(socket, code, reason.toString(), remoteAddress);
		});

		// Ping/pong for connection health
		socket.on('pong', () => {
			// Connection is alive - can be used for latency measurement
		});
	}

	private async handleDisconnect(
		socket: WebSocket,
		code: number,
		reason: string,
		remoteAddress?: string
	): Promise<void> {
		// Clear auth timeout if still pending
		const authTimeout = this.pendingAuth.get(socket);
		if (authTimeout) {
			clearTimeout(authTimeout);
			this.pendingAuth.delete(socket);
		}

		// Unregister from agent manager
		await agentManager.unregisterBySocket(socket, `code=${code}, reason=${reason}`);
		console.log(`[WebSocket] Connection closed from ${remoteAddress} (${code}: ${reason})`);
	}

	// ============================================================================
	// Message Processing (Optimized for Speed)
	// ============================================================================

	private async handleMessage(
		socket: WebSocket,
		data: RawData,
		isBinary: boolean,
		remoteAddress?: string
	): Promise<void> {
		let message: BaseMessage;

		try {
			// Fast path: parse JSON directly
			// Binary support can be added here for even lower latency
			if (isBinary) {
				// Future: handle binary protocol (e.g., MessagePack, Protobuf)
				const text = Buffer.from(data as ArrayBuffer).toString('utf8');
				message = JSON.parse(text);
			} else {
				message = JSON.parse(data.toString());
			}
		} catch {
			console.error('[WebSocket] Invalid message format');
			this.sendError(socket, 'INVALID_FORMAT', 'Invalid message format');
			return;
		}

		// Add receive timestamp for latency tracking
		const receiveTime = Date.now();

		// Route message by type - minimal validation for speed
		try {
			if (isAuthMessage(message)) {
				await this.handleAuth(socket, message, remoteAddress);
			} else if (isMultiAuthMessage(message)) {
				await this.handleMultiAuth(socket, message, remoteAddress);
			} else if (isHeartbeatMessage(message)) {
				this.handleHeartbeat(socket, message);
			} else if (isMultiHeartbeatMessage(message)) {
				this.handleMultiHeartbeat(socket, message);
			} else if (isStatusUpdateMessage(message)) {
				await this.handleStatusUpdate(socket, message);
			} else if (isMultiStatusUpdateMessage(message)) {
				await this.handleMultiStatusUpdate(socket, message);
			} else if (isTradeUpdateMessage(message)) {
				await this.handleTradeUpdate(socket, message);
			} else if (isCommandResultMessage(message)) {
				this.handleCommandResult(socket, message);
			} else if (isErrorMessage(message)) {
				this.handleError(socket, message);
			} else {
				console.warn('[WebSocket] Unknown message type:', message.type);
			}
		} catch (error) {
			console.error('[WebSocket] Message handling error:', error);
		}

		// Log latency for performance monitoring (sample only in dev)
		if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
			const latency = Date.now() - message.timestamp;
			console.log(`[WebSocket] Message latency: ${latency}ms (processing: ${Date.now() - receiveTime}ms)`);
		}
	}

	// ============================================================================
	// Auth Message Handler
	// ============================================================================

	private async handleAuth(
		socket: WebSocket,
		message: AuthMessage,
		remoteAddress?: string
	): Promise<void> {
		const { apiKey, machineId, agentVersion, osVersion } = message;

		// Clear auth timeout
		const authTimeout = this.pendingAuth.get(socket);
		if (authTimeout) {
			clearTimeout(authTimeout);
			this.pendingAuth.delete(socket);
		}

		// Validate API key - O(1) lookup in database by unique index
		const agent = await prisma.agent.findUnique({
			where: { apiKey },
			select: {
				id: true,
				userId: true,
				machineId: true,
			},
		});

		if (!agent) {
			console.warn(`[WebSocket] Invalid API key from ${remoteAddress}`);
			this.sendAuthResponse(socket, false, undefined, 'Invalid API key');
			socket.close(4002, 'Invalid API key');
			return;
		}

		// Validate machine ID matches
		if (agent.machineId !== machineId) {
			console.warn(`[WebSocket] Machine ID mismatch for agent ${agent.id}`);
			this.sendAuthResponse(socket, false, undefined, 'Machine ID mismatch');
			socket.close(4003, 'Machine ID mismatch');
			return;
		}

		// Update agent version info
		if (agentVersion || osVersion) {
			await prisma.agent.update({
				where: { id: agent.id },
				data: {
					agentVersion: agentVersion || undefined,
					osVersion: osVersion || undefined,
				},
			});
		}

		// Register with agent manager
		const registered = await agentManager.registerAgent(
			agent.id,
			machineId,
			agent.userId || '', // Pool agents may have null userId
			socket,
			remoteAddress
		);

		if (!registered) {
			this.sendAuthResponse(socket, false, undefined, 'Registration failed');
			socket.close(4004, 'Registration failed');
			return;
		}

		// Send success response
		this.sendAuthResponse(socket, true, agent.id);
		console.log(`[WebSocket] Agent ${agent.id} authenticated successfully`);
	}

	private sendAuthResponse(
		socket: WebSocket,
		success: boolean,
		agentId?: string,
		error?: string
	): void {
		const response: AuthResponseMessage = {
			type: ServerMessageType.AUTH_RESPONSE,
			timestamp: Date.now(),
			success,
			agentId,
			error,
		};
		socket.send(JSON.stringify(response));
	}

	// ============================================================================
	// Multi-Account Pool Agent Auth Handler
	// ============================================================================

	private async handleMultiAuth(
		socket: WebSocket,
		message: MultiAuthMessage,
		remoteAddress?: string
	): Promise<void> {
		const { apiKey, machineId, agentVersion, osVersion, vpsName, vpsRegion, maxCapacity, accountNumbers } = message;

		// Clear auth timeout
		const authTimeout = this.pendingAuth.get(socket);
		if (authTimeout) {
			clearTimeout(authTimeout);
			this.pendingAuth.delete(socket);
		}

		// Validate API key - must be a pool agent
		const agent = await prisma.agent.findUnique({
			where: { apiKey },
			select: {
				id: true,
				userId: true,
				machineId: true,
				isPoolAgent: true,
				vpsName: true,
				maxCapacity: true,
			},
		});

		if (!agent) {
			console.warn(`[WebSocket] Invalid API key for pool agent from ${remoteAddress}`);
			this.sendMultiAuthResponse(socket, false, undefined, undefined, 'Invalid API key', [], []);
			socket.close(4002, 'Invalid API key');
			return;
		}

		// Validate machine ID matches
		if (agent.machineId !== machineId) {
			console.warn(`[WebSocket] Machine ID mismatch for pool agent ${agent.id}`);
			this.sendMultiAuthResponse(socket, false, undefined, undefined, 'Machine ID mismatch', [], []);
			socket.close(4003, 'Machine ID mismatch');
			return;
		}

		// Verify this is actually a pool agent
		if (!agent.isPoolAgent) {
			console.warn(`[WebSocket] Agent ${agent.id} is not configured as a pool agent`);
			this.sendMultiAuthResponse(socket, false, undefined, undefined, 'Agent not configured as pool agent', [], []);
			socket.close(4005, 'Not a pool agent');
			return;
		}

		// Check capacity
		if (accountNumbers.length > (agent.maxCapacity || maxCapacity)) {
			console.warn(`[WebSocket] Pool agent ${agent.id} exceeded capacity: ${accountNumbers.length} > ${agent.maxCapacity}`);
		}

		// Update agent info in database
		await prisma.agent.update({
			where: { id: agent.id },
			data: {
				agentVersion: agentVersion || undefined,
				osVersion: osVersion || undefined,
				vpsName: vpsName || agent.vpsName,
				vpsRegion: vpsRegion || undefined,
				maxCapacity: maxCapacity || agent.maxCapacity,
				currentLoad: accountNumbers.length,
				managedAccounts: accountNumbers,
				mt5InstanceCount: accountNumbers.length,
				status: 'online',
				connectedAt: new Date(),
				lastHeartbeat: new Date(),
			},
		});

		// Register account assignments
		const registeredAccounts: string[] = [];
		const failedAccounts: { accountNumber: string; reason: string }[] = [];

		for (const accountNumber of accountNumbers) {
			try {
				// Find the user who owns this MT5 account
				const mt5Account = await prisma.mT5Account.findUnique({
					where: { accountNumber },
					select: { userId: true, broker: true, serverName: true },
				});

				if (!mt5Account) {
					failedAccounts.push({ accountNumber, reason: 'MT5 account not found in system' });
					continue;
				}

				// Create or update the account assignment
				await prisma.mT5AccountAssignment.upsert({
					where: { mt5AccountNumber: accountNumber },
					create: {
						userId: mt5Account.userId,
						agentId: agent.id,
						mt5AccountNumber: accountNumber,
						mt5Broker: mt5Account.broker,
						mt5ServerName: mt5Account.serverName,
						status: 'online',
						isActive: true,
					},
					update: {
						agentId: agent.id,
						status: 'online',
						isActive: true,
						lastHeartbeat: new Date(),
					},
				});

				registeredAccounts.push(accountNumber);
			} catch (error) {
				console.error(`[WebSocket] Failed to register account ${accountNumber}:`, error);
				failedAccounts.push({ accountNumber, reason: 'Registration error' });
			}
		}

		// Register with agent manager as pool agent
		const registered = await agentManager.registerPoolAgent(
			agent.id,
			machineId,
			vpsName,
			socket,
			accountNumbers,
			maxCapacity,
			remoteAddress
		);

		if (!registered) {
			this.sendMultiAuthResponse(socket, false, undefined, undefined, 'Registration failed', [], []);
			socket.close(4004, 'Registration failed');
			return;
		}

		// Send success response
		this.sendMultiAuthResponse(socket, true, agent.id, vpsName, undefined, registeredAccounts, failedAccounts);
		console.log(`[WebSocket] Pool agent ${agent.id} (${vpsName}) authenticated with ${registeredAccounts.length} accounts`);
	}

	private sendMultiAuthResponse(
		socket: WebSocket,
		success: boolean,
		agentId?: string,
		vpsName?: string,
		error?: string,
		registeredAccounts: string[] = [],
		failedAccounts: { accountNumber: string; reason: string }[] = []
	): void {
		const response: MultiAuthResponseMessage = {
			type: ServerMessageType.MULTI_AUTH_RESPONSE,
			timestamp: Date.now(),
			success,
			agentId,
			vpsName,
			error,
			registeredAccounts,
			failedAccounts,
		};
		socket.send(JSON.stringify(response));
	}

	// ============================================================================
	// Multi-Account Heartbeat Handler
	// ============================================================================

	private handleMultiHeartbeat(socket: WebSocket, message: MultiHeartbeatMessage): void {
		const { agentId, vpsName, status, totalAccounts, onlineAccounts, errorAccounts, cpuUsage, memoryUsage } = message;

		// Validate agent is registered as pool agent
		const agent = agentManager.getAgentBySocket(socket);
		if (!agent || agent.id !== agentId || !agent.isPoolAgent) {
			console.warn('[WebSocket] Multi-heartbeat from unregistered/non-pool agent');
			return;
		}

		// Update in-memory state
		agentManager.updatePoolAgentHeartbeat(agentId, status, {
			totalAccounts,
			onlineAccounts,
			errorAccounts,
			cpuUsage,
			memoryUsage,
		});
	}

	// ============================================================================
	// Multi-Account Status Update Handler
	// ============================================================================

	private async handleMultiStatusUpdate(
		socket: WebSocket,
		message: MultiStatusUpdateMessage
	): Promise<void> {
		const { agentId, vpsName, systemInfo, accounts } = message;

		// Validate agent
		const agent = agentManager.getAgentBySocket(socket);
		if (!agent || agent.id !== agentId || !agent.isPoolAgent) {
			console.warn('[WebSocket] Multi-status update from unregistered/non-pool agent');
			return;
		}

		// Update pool agent system info
		agentManager.updatePoolAgentSystemInfo(agentId, systemInfo);

		// Update database in batch for better performance
		try {
			// Update agent resource usage
			await prisma.agent.update({
				where: { id: agentId },
				data: {
					cpuUsage: systemInfo.cpuUsage,
					memoryUsage: systemInfo.memoryUsage,
					diskUsage: systemInfo.diskUsage,
					mt5InstanceCount: systemInfo.mt5InstanceCount,
					currentLoad: accounts.length,
					lastHeartbeat: new Date(),
				},
			});

			// Batch update account assignments
			for (const account of accounts) {
				await prisma.mT5AccountAssignment.updateMany({
					where: {
						mt5AccountNumber: account.accountNumber,
						agentId: agentId,
					},
					data: {
						status: account.status,
						eaStatus: account.eaStatus,
						lastHeartbeat: new Date(),
						balance: account.balance,
						equity: account.equity,
						margin: account.margin,
						freeMargin: account.freeMargin,
						profit: account.profit,
						eaLoaded: account.eaLoaded,
						eaRunning: account.eaRunning,
						eaName: account.eaName,
						chartSymbol: account.chartSymbol,
						chartTimeframe: account.chartTimeframe,
					},
				});
			}
		} catch (error) {
			console.error('[WebSocket] Failed to update multi-status:', error);
		}

		// Update in-memory instance statuses
		agentManager.updatePoolAgentInstances(agentId, accounts);
	}

	// ============================================================================
	// Heartbeat Handler (Hot Path - Optimized)
	// ============================================================================

	private handleHeartbeat(socket: WebSocket, message: HeartbeatMessage): void {
		const { agentId, status, eaStatus, accountInfo } = message;

		// Validate agent is registered (O(1) lookup)
		const agent = agentManager.getAgentBySocket(socket);
		if (!agent || agent.id !== agentId) {
			console.warn('[WebSocket] Heartbeat from unregistered agent');
			return;
		}

		// Update in-memory state (no await - async database update is debounced)
		agentManager.updateHeartbeat(agentId, status, eaStatus, accountInfo);
	}

	// ============================================================================
	// Status Update Handler
	// ============================================================================

	private async handleStatusUpdate(
		socket: WebSocket,
		message: StatusUpdateMessage
	): Promise<void> {
		const { agentId, eaStatus, accountInfo, safetyIndicator } = message;

		// Validate agent
		const agent = agentManager.getAgentBySocket(socket);
		if (!agent || agent.id !== agentId) {
			return;
		}

		// Update database with full status
		try {
			await prisma.agent.update({
				where: { id: agentId },
				data: {
					eaLoaded: eaStatus.loaded,
					eaRunning: eaStatus.running,
					eaName: eaStatus.name,
					chartSymbol: eaStatus.symbol,
					chartTimeframe: eaStatus.timeframe,
					mt5AccountNumber: accountInfo.accountNumber,
					mt5Broker: accountInfo.broker,
					mt5ServerName: accountInfo.serverName,
				},
			});

			// Update EA safety indicator if applicable
			if (eaStatus.name) {
				await prisma.eA.updateMany({
					where: {
						userId: agent.userId,
						name: eaStatus.name,
					},
					data: {
						safetyIndicator,
						status: eaStatus.running ? 'RUNNING' : eaStatus.loaded ? 'PAUSED' : 'STOPPED',
					},
				});
			}
		} catch (error) {
			console.error('[WebSocket] Failed to update status:', error);
		}
	}

	// ============================================================================
	// Trade Update Handler
	// ============================================================================

	private async handleTradeUpdate(socket: WebSocket, message: TradeUpdateMessage): Promise<void> {
		const { agentId, trade, action } = message;

		// Validate agent
		const agent = agentManager.getAgentBySocket(socket);
		if (!agent || agent.id !== agentId) {
			return;
		}

		try {
			// Get agent's associated MT5 account
			const dbAgent = await prisma.agent.findUnique({
				where: { id: agentId },
				select: {
					userId: true,
					mt5AccountNumber: true,
				},
			});

			if (!dbAgent || !dbAgent.mt5AccountNumber) {
				console.warn('[WebSocket] No MT5 account linked to agent');
				return;
			}

			const mt5Account = await prisma.mT5Account.findUnique({
				where: { accountNumber: dbAgent.mt5AccountNumber },
				select: { id: true },
			});

			if (!mt5Account) {
				return;
			}

			if (action === 'opened') {
				// Create new trade
				await prisma.trade.upsert({
					where: { ticket: trade.ticket },
					create: {
						ticket: trade.ticket,
						userId: agent.userId,
						mt5AccountId: mt5Account.id,
						symbol: trade.symbol,
						type: trade.type,
						volume: trade.volume,
						openPrice: trade.openPrice,
						openTime: new Date(trade.openTime),
						profit: trade.profit,
						commission: trade.commission,
						swap: trade.swap,
						magicNumber: trade.magicNumber,
						comment: trade.comment,
						isClosed: false,
					},
					update: {
						profit: trade.profit,
						commission: trade.commission,
						swap: trade.swap,
					},
				});
			} else if (action === 'closed') {
				// Update trade as closed
				await prisma.trade.update({
					where: { ticket: trade.ticket },
					data: {
						closePrice: trade.closePrice,
						closeTime: trade.closeTime ? new Date(trade.closeTime) : new Date(),
						profit: trade.profit,
						commission: trade.commission,
						swap: trade.swap,
						isClosed: true,
					},
				});

				// Update user stats
				const isWin = trade.profit > 0;
				await prisma.user.update({
					where: { id: agent.userId },
					data: {
						totalTrades: { increment: 1 },
						winningTrades: isWin ? { increment: 1 } : undefined,
						losingTrades: !isWin ? { increment: 1 } : undefined,
						totalProfit: { increment: trade.profit },
						totalVolume: { increment: trade.volume },
					},
				});
			} else if (action === 'modified') {
				// Update existing trade
				await prisma.trade.update({
					where: { ticket: trade.ticket },
					data: {
						profit: trade.profit,
						commission: trade.commission,
						swap: trade.swap,
					},
				});
			}
		} catch (error) {
			console.error('[WebSocket] Failed to process trade update:', error);
		}
	}

	// ============================================================================
	// Command Result Handler
	// ============================================================================

	private handleCommandResult(socket: WebSocket, message: CommandResultMessage): void {
		const { commandId, success, result, error } = message;
		agentManager.handleCommandResult(commandId, success, result, error);
	}

	// ============================================================================
	// Error Handler
	// ============================================================================

	private handleError(socket: WebSocket, message: ErrorMessage): void {
		const { agentId, code, message: errorMessage, details } = message;
		console.error(`[WebSocket] Agent error (${agentId}): [${code}] ${errorMessage}`, details);

		// Log to database
		prisma.systemLog
			.create({
				data: {
					level: 'ERROR',
					component: 'CSHARP_AGENT',
					message: `Agent ${agentId}: ${errorMessage}`,
					metadata: { code, details } as object,
				},
			})
			.catch(console.error);
	}

	// ============================================================================
	// Utility Methods
	// ============================================================================

	private sendError(socket: WebSocket, code: string, message: string): void {
		const errorMsg = {
			type: 'error',
			timestamp: Date.now(),
			code,
			message,
		};
		socket.send(JSON.stringify(errorMsg));
	}

	/**
	 * Send a command to a specific agent
	 */
	async sendToAgent(agentId: string, message: Record<string, unknown>): Promise<unknown> {
		return agentManager.sendCommand(agentId, message);
	}

	/**
	 * Send a command to agent without waiting
	 */
	sendToAgentAsync(agentId: string, message: Record<string, unknown>): boolean {
		return agentManager.sendCommandAsync(agentId, message);
	}

	/**
	 * Broadcast to all connected agents
	 */
	broadcast(message: Record<string, unknown>): void {
		const messageStr = JSON.stringify(message);
		for (const agent of agentManager.getAllAgents()) {
			try {
				(agent.socket as WebSocket).send(messageStr);
			} catch {
				// Ignore send errors
			}
		}
	}

	/**
	 * Get server status
	 */
	getStatus(): { running: boolean; port: number; agents: ReturnType<typeof agentManager.getStats> } {
		return {
			running: this.isRunning,
			port: this.config.port,
			agents: agentManager.getStats(),
		};
	}

	/**
	 * Check if server is running
	 */
	isServerRunning(): boolean {
		return this.isRunning;
	}
}

// ============================================================================
// Singleton Export
// ============================================================================

export const wsServer = new MT5WebSocketServer();
export default wsServer;

// ============================================================================
// Helper Functions for API Routes
// ============================================================================

/**
 * Send command to agent from API route
 */
export async function sendAgentCommand(
	agentId: string,
	command: string,
	data?: Record<string, unknown>,
	timeoutMs?: number
): Promise<unknown> {
	const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	const message = {
		type: command,
		commandId,
		timestamp: Date.now(),
		...data,
	};
	return agentManager.sendCommand(agentId, message, timeoutMs);
}

/**
 * Check if agent is connected
 */
export function isAgentConnected(agentId: string): boolean {
	return agentManager.isAgentConnected(agentId);
}

/**
 * Get connected agents for a user
 */
export function getUserAgents(userId: string) {
	return agentManager.getAgentsByUser(userId);
}

/**
 * Get all connected agents (admin only)
 */
export function getAllConnectedAgents() {
	return agentManager.getAllAgents();
}
