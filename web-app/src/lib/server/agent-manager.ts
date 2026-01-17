/**
 * Agent Manager - High-Performance In-Memory Agent Connection Tracking
 *
 * Manages connected C# agents with optimized data structures for:
 * - O(1) agent lookup by ID
 * - O(1) agent lookup by socket
 * - O(1) agent lookup by user ID
 * - Minimal memory footprint
 * - Thread-safe operations (single-threaded Node.js)
 */

import type { WebSocket } from 'ws';
import type {
	ConnectedAgent,
	ConnectedPoolAgent,
	AgentStatus,
	EAStatusInfo,
	AccountInfo,
	AgentConnectionEvent,
	MT5InstanceStatus,
} from '$lib/types/websocket';
import prisma from './db';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AgentManagerConfig {
	heartbeatInterval: number; // Expected heartbeat interval in ms
	timeoutMultiplier: number; // Multiplier for timeout (e.g., 3 = 3x heartbeat interval)
	cleanupInterval: number; // How often to run cleanup check
	maxAgentsPerUser: number; // Maximum concurrent agents per user
}

export interface CommandPendingResult {
	agentId: string;
	commandId: string;
	resolve: (result: unknown) => void;
	reject: (error: Error) => void;
	timeout: NodeJS.Timeout;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: AgentManagerConfig = {
	heartbeatInterval: 5000, // 5 seconds
	timeoutMultiplier: 3, // Timeout after 15 seconds (3 * 5s)
	cleanupInterval: 10000, // Check every 10 seconds
	maxAgentsPerUser: 10, // Max 10 concurrent agents per user
};

// ============================================================================
// Agent Manager Singleton
// ============================================================================

class AgentManager {
	private agents: Map<string, ConnectedAgent> = new Map();
	private socketToAgentId: Map<WebSocket, string> = new Map();
	private userAgents: Map<string, Set<string>> = new Map();
	private pendingCommands: Map<string, CommandPendingResult> = new Map();
	private adminSockets: Set<WebSocket> = new Set();
	private config: AgentManagerConfig;
	private cleanupTimer: NodeJS.Timeout | null = null;
	private isShuttingDown = false;

	// Pool agent specific tracking
	private poolAgents: Map<string, ConnectedPoolAgent> = new Map();
	private accountToPoolAgent: Map<string, string> = new Map(); // MT5 account -> pool agent ID

	constructor(config: Partial<AgentManagerConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.startCleanupTimer();
	}

	// ============================================================================
	// Agent Registration
	// ============================================================================

	/**
	 * Register a newly authenticated agent
	 */
	async registerAgent(
		agentId: string,
		machineId: string,
		userId: string,
		socket: WebSocket,
		remoteAddress?: string
	): Promise<boolean> {
		// Check max agents per user
		const userAgentSet = this.userAgents.get(userId);
		if (userAgentSet && userAgentSet.size >= this.config.maxAgentsPerUser) {
			console.warn(`[AgentManager] User ${userId} exceeded max agents limit`);
			return false;
		}

		const now = Date.now();

		// Create connected agent entry
		const agent: ConnectedAgent = {
			id: agentId,
			machineId,
			userId,
			socket,
			connectedAt: now,
			lastHeartbeat: now,
			status: 'online',
			remoteAddress,
		};

		// Store in all maps
		this.agents.set(agentId, agent);
		this.socketToAgentId.set(socket, agentId);

		// Track user's agents
		if (!this.userAgents.has(userId)) {
			this.userAgents.set(userId, new Set());
		}
		this.userAgents.get(userId)!.add(agentId);

		// Update database
		await this.updateAgentInDatabase(agentId, {
			status: 'online',
			connectedAt: new Date(now),
			lastHeartbeat: new Date(now),
		});

		// Log to system log
		await this.logSystemEvent('INFO', 'WEBSOCKET', `Agent ${agentId} connected`, {
			agentId,
			userId,
			machineId,
			remoteAddress,
		});

		// Broadcast to admin dashboard
		this.broadcastToAdmins({
			event: 'agent_connected',
			agentId,
			userId,
			timestamp: now,
			data: {
				machineId,
				status: 'online',
				connectedAt: now,
				remoteAddress,
			},
		});

		console.log(`[AgentManager] Agent ${agentId} registered for user ${userId}`);
		return true;
	}

	// ============================================================================
	// Pool Agent Registration (Mother Agent Architecture)
	// ============================================================================

	/**
	 * Register a pool agent that manages multiple MT5 instances
	 */
	async registerPoolAgent(
		agentId: string,
		machineId: string,
		vpsName: string,
		socket: WebSocket,
		accountNumbers: string[],
		maxCapacity: number,
		remoteAddress?: string
	): Promise<boolean> {
		const now = Date.now();

		// Create pool agent entry
		const poolAgent: ConnectedPoolAgent = {
			id: agentId,
			machineId,
			userId: '', // Pool agents don't belong to a specific user
			socket,
			connectedAt: now,
			lastHeartbeat: now,
			status: 'online',
			remoteAddress,
			isPoolAgent: true,
			vpsName,
			maxCapacity,
			currentLoad: accountNumbers.length,
			managedAccounts: accountNumbers,
			instances: new Map(),
		};

		// Initialize instance tracking for each account
		for (const accountNumber of accountNumbers) {
			poolAgent.instances.set(accountNumber, {
				accountNumber,
				status: 'starting',
				eaStatus: 'stopped',
				balance: 0,
				equity: 0,
				margin: 0,
				freeMargin: 0,
				profit: 0,
				eaLoaded: false,
				eaRunning: false,
				safetyIndicator: 'RED',
				indicatorScore: 0,
				lastActivity: now,
			});
			this.accountToPoolAgent.set(accountNumber, agentId);
		}

		// Store in maps
		this.agents.set(agentId, poolAgent);
		this.poolAgents.set(agentId, poolAgent);
		this.socketToAgentId.set(socket, agentId);

		// Update database
		await this.updateAgentInDatabase(agentId, {
			status: 'online',
			connectedAt: new Date(now),
			lastHeartbeat: new Date(now),
		});

		// Log to system log
		await this.logSystemEvent('INFO', 'WEBSOCKET', `Pool agent ${agentId} (${vpsName}) connected with ${accountNumbers.length} accounts`, {
			agentId,
			vpsName,
			machineId,
			accountCount: accountNumbers.length,
			accounts: accountNumbers,
			remoteAddress,
		});

		// Broadcast to admin dashboard
		this.broadcastToAdmins({
			event: 'agent_connected',
			agentId,
			userId: '',
			timestamp: now,
			data: {
				machineId,
				status: 'online',
				connectedAt: now,
				remoteAddress,
				isPoolAgent: true,
				vpsName,
				currentLoad: accountNumbers.length,
			},
		});

		console.log(`[AgentManager] Pool agent ${agentId} (${vpsName}) registered with ${accountNumbers.length} MT5 accounts`);
		return true;
	}

	/**
	 * Update pool agent heartbeat with summary stats
	 */
	updatePoolAgentHeartbeat(
		agentId: string,
		status: AgentStatus,
		stats: {
			totalAccounts: number;
			onlineAccounts: number;
			errorAccounts: number;
			cpuUsage: number;
			memoryUsage: number;
		}
	): void {
		const poolAgent = this.poolAgents.get(agentId);
		if (!poolAgent) return;

		const now = Date.now();
		poolAgent.lastHeartbeat = now;
		poolAgent.status = status;
		poolAgent.currentLoad = stats.totalAccounts;
		poolAgent.systemInfo = {
			cpuUsage: stats.cpuUsage,
			memoryUsage: stats.memoryUsage,
			diskUsage: 0,
			mt5InstanceCount: stats.totalAccounts,
		};

		// Debounced database update
		this.debouncedDatabaseUpdate(agentId, {
			status,
			lastHeartbeat: new Date(now),
			cpuUsage: stats.cpuUsage,
			memoryUsage: stats.memoryUsage,
			currentLoad: stats.totalAccounts,
		});
	}

	/**
	 * Update pool agent system resource info
	 */
	updatePoolAgentSystemInfo(
		agentId: string,
		systemInfo: {
			cpuUsage: number;
			memoryUsage: number;
			diskUsage: number;
			mt5InstanceCount: number;
		}
	): void {
		const poolAgent = this.poolAgents.get(agentId);
		if (!poolAgent) return;

		poolAgent.systemInfo = systemInfo;
	}

	/**
	 * Update pool agent MT5 instance statuses
	 */
	updatePoolAgentInstances(agentId: string, instances: MT5InstanceStatus[]): void {
		const poolAgent = this.poolAgents.get(agentId);
		if (!poolAgent) return;

		const now = Date.now();
		for (const instance of instances) {
			poolAgent.instances.set(instance.accountNumber, {
				...instance,
				lastActivity: now,
			});
		}
	}

	// ============================================================================
	// Pool Agent Lookups
	// ============================================================================

	/**
	 * Get pool agent managing a specific MT5 account
	 */
	getPoolAgentForAccount(accountNumber: string): ConnectedPoolAgent | undefined {
		const agentId = this.accountToPoolAgent.get(accountNumber);
		return agentId ? this.poolAgents.get(agentId) : undefined;
	}

	/**
	 * Get all connected pool agents
	 */
	getAllPoolAgents(): ConnectedPoolAgent[] {
		return Array.from(this.poolAgents.values());
	}

	/**
	 * Get instance status from pool agent
	 */
	getInstanceStatus(accountNumber: string): MT5InstanceStatus | undefined {
		const poolAgent = this.getPoolAgentForAccount(accountNumber);
		return poolAgent?.instances.get(accountNumber);
	}

	/**
	 * Check if an account is managed by a pool agent
	 */
	isAccountManagedByPoolAgent(accountNumber: string): boolean {
		return this.accountToPoolAgent.has(accountNumber);
	}

	// ============================================================================
	// Pool Agent Command Routing
	// ============================================================================

	/**
	 * Send command to specific MT5 instance via pool agent
	 */
	async sendCommandToAccount(
		accountNumber: string,
		command: string,
		payload?: Record<string, unknown>,
		timeoutMs: number = 30000
	): Promise<unknown> {
		const poolAgent = this.getPoolAgentForAccount(accountNumber);
		if (!poolAgent) {
			throw new Error(`No pool agent managing account ${accountNumber}`);
		}

		const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const message = {
			type: 'targeted_command',
			commandId,
			targetAccount: accountNumber,
			command,
			payload,
			timestamp: Date.now(),
		};

		return this.sendCommand(poolAgent.id, message, timeoutMs);
	}

	/**
	 * Unregister an agent (disconnection)
	 */
	async unregisterAgent(agentId: string, reason?: string): Promise<void> {
		const agent = this.agents.get(agentId);
		if (!agent) return;

		const now = Date.now();

		// Check if this is a pool agent
		const isPoolAgent = agent.isPoolAgent;
		const poolAgent = this.poolAgents.get(agentId);

		// Clean up pool agent specific data
		if (isPoolAgent && poolAgent) {
			// Remove account-to-pool-agent mappings
			for (const accountNumber of poolAgent.managedAccounts || []) {
				this.accountToPoolAgent.delete(accountNumber);
			}
			this.poolAgents.delete(agentId);

			// Update all account assignments to offline
			try {
				await prisma.mT5AccountAssignment.updateMany({
					where: { agentId },
					data: {
						status: 'offline',
						eaStatus: 'stopped',
					},
				});
			} catch (error) {
				console.error('[AgentManager] Failed to update account assignments:', error);
			}
		}

		// Clean up all maps
		this.agents.delete(agentId);
		this.socketToAgentId.delete(agent.socket as WebSocket);

		const userAgentSet = this.userAgents.get(agent.userId);
		if (userAgentSet) {
			userAgentSet.delete(agentId);
			if (userAgentSet.size === 0) {
				this.userAgents.delete(agent.userId);
			}
		}

		// Cancel pending commands for this agent
		for (const [commandId, pending] of this.pendingCommands) {
			if (pending.agentId === agentId) {
				clearTimeout(pending.timeout);
				pending.reject(new Error('Agent disconnected'));
				this.pendingCommands.delete(commandId);
			}
		}

		// Update database
		await this.updateAgentInDatabase(agentId, {
			status: 'offline',
			disconnectedAt: new Date(now),
		});

		// Log to system log
		const logMessage = isPoolAgent
			? `Pool agent ${agentId} (${poolAgent?.vpsName}) disconnected with ${poolAgent?.managedAccounts?.length || 0} accounts`
			: `Agent ${agentId} disconnected`;

		await this.logSystemEvent('INFO', 'WEBSOCKET', logMessage, {
			agentId,
			userId: agent.userId,
			reason: reason || 'unknown',
			sessionDuration: now - agent.connectedAt,
			isPoolAgent,
			vpsName: poolAgent?.vpsName,
			accountCount: poolAgent?.managedAccounts?.length,
		});

		// Broadcast to admin dashboard
		this.broadcastToAdmins({
			event: 'agent_disconnected',
			agentId,
			userId: agent.userId,
			timestamp: now,
			data: isPoolAgent ? {
				isPoolAgent: true,
				vpsName: poolAgent?.vpsName,
				currentLoad: poolAgent?.managedAccounts?.length,
			} : undefined,
		});

		console.log(`[AgentManager] ${isPoolAgent ? 'Pool agent' : 'Agent'} ${agentId} unregistered (${reason || 'unknown'})`);
	}

	/**
	 * Unregister agent by socket reference (for disconnect handlers)
	 */
	async unregisterBySocket(socket: WebSocket, reason?: string): Promise<void> {
		const agentId = this.socketToAgentId.get(socket);
		if (agentId) {
			await this.unregisterAgent(agentId, reason);
		}
	}

	// ============================================================================
	// Heartbeat Handling
	// ============================================================================

	/**
	 * Update agent heartbeat - optimized for high frequency
	 */
	updateHeartbeat(
		agentId: string,
		status: AgentStatus,
		eaStatus?: EAStatusInfo,
		accountInfo?: AccountInfo
	): void {
		const agent = this.agents.get(agentId);
		if (!agent) return;

		const now = Date.now();
		agent.lastHeartbeat = now;
		agent.status = status;

		if (eaStatus) {
			agent.eaStatus = eaStatus;
		}
		if (accountInfo) {
			agent.accountInfo = accountInfo;
		}

		// Database update is debounced - only update every 30 seconds
		// to reduce database load while maintaining in-memory freshness
		this.debouncedDatabaseUpdate(agentId, {
			status,
			lastHeartbeat: new Date(now),
		});
	}

	private databaseUpdateTimers: Map<string, NodeJS.Timeout> = new Map();

	private debouncedDatabaseUpdate(
		agentId: string,
		data: Record<string, unknown>,
		delay: number = 30000
	): void {
		// Clear existing timer
		const existingTimer = this.databaseUpdateTimers.get(agentId);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// Set new timer
		const timer = setTimeout(async () => {
			this.databaseUpdateTimers.delete(agentId);
			await this.updateAgentInDatabase(agentId, data);
		}, delay);

		this.databaseUpdateTimers.set(agentId, timer);
	}

	// ============================================================================
	// Agent Lookup Methods (O(1) Performance)
	// ============================================================================

	getAgent(agentId: string): ConnectedAgent | undefined {
		return this.agents.get(agentId);
	}

	getAgentBySocket(socket: WebSocket): ConnectedAgent | undefined {
		const agentId = this.socketToAgentId.get(socket);
		return agentId ? this.agents.get(agentId) : undefined;
	}

	getAgentsByUser(userId: string): ConnectedAgent[] {
		const agentIds = this.userAgents.get(userId);
		if (!agentIds) return [];

		const agents: ConnectedAgent[] = [];
		for (const id of agentIds) {
			const agent = this.agents.get(id);
			if (agent) agents.push(agent);
		}
		return agents;
	}

	getAllAgents(): ConnectedAgent[] {
		return Array.from(this.agents.values());
	}

	getConnectedAgentIds(): string[] {
		return Array.from(this.agents.keys());
	}

	isAgentConnected(agentId: string): boolean {
		return this.agents.has(agentId);
	}

	getAgentCount(): number {
		return this.agents.size;
	}

	// ============================================================================
	// Command Routing
	// ============================================================================

	/**
	 * Send command to agent and wait for result
	 */
	async sendCommand(
		agentId: string,
		message: Record<string, unknown>,
		timeoutMs: number = 30000
	): Promise<unknown> {
		const agent = this.agents.get(agentId);
		if (!agent) {
			throw new Error(`Agent ${agentId} not connected`);
		}

		const commandId = message.commandId as string;
		if (!commandId) {
			throw new Error('Message must have a commandId');
		}

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingCommands.delete(commandId);
				reject(new Error(`Command ${commandId} timed out`));
			}, timeoutMs);

			this.pendingCommands.set(commandId, {
				agentId,
				commandId,
				resolve,
				reject,
				timeout,
			});

			// Send message directly to socket
			const socket = agent.socket as WebSocket;
			socket.send(JSON.stringify(message));
		});
	}

	/**
	 * Send command without waiting for response (fire and forget)
	 */
	sendCommandAsync(agentId: string, message: Record<string, unknown>): boolean {
		const agent = this.agents.get(agentId);
		if (!agent) return false;

		const socket = agent.socket as WebSocket;
		socket.send(JSON.stringify(message));
		return true;
	}

	/**
	 * Handle command result from agent
	 */
	handleCommandResult(commandId: string, success: boolean, result?: unknown, error?: string): void {
		const pending = this.pendingCommands.get(commandId);
		if (!pending) return;

		clearTimeout(pending.timeout);
		this.pendingCommands.delete(commandId);

		if (success) {
			pending.resolve(result);
		} else {
			pending.reject(new Error(error || 'Command failed'));
		}
	}

	// ============================================================================
	// Admin Dashboard Connections
	// ============================================================================

	registerAdminSocket(socket: WebSocket): void {
		this.adminSockets.add(socket);
		console.log(`[AgentManager] Admin dashboard connected (${this.adminSockets.size} total)`);
	}

	unregisterAdminSocket(socket: WebSocket): void {
		this.adminSockets.delete(socket);
		console.log(`[AgentManager] Admin dashboard disconnected (${this.adminSockets.size} total)`);
	}

	private broadcastToAdmins(event: AgentConnectionEvent): void {
		const message = JSON.stringify(event);
		for (const socket of this.adminSockets) {
			try {
				socket.send(message);
			} catch {
				// Socket might be closing, ignore
			}
		}
	}

	// ============================================================================
	// Cleanup and Health Checks
	// ============================================================================

	private startCleanupTimer(): void {
		this.cleanupTimer = setInterval(() => {
			this.checkStaleAgents();
		}, this.config.cleanupInterval);
	}

	private async checkStaleAgents(): Promise<void> {
		if (this.isShuttingDown) return;

		const now = Date.now();
		const timeout = this.config.heartbeatInterval * this.config.timeoutMultiplier;

		for (const [agentId, agent] of this.agents) {
			const timeSinceHeartbeat = now - agent.lastHeartbeat;

			if (timeSinceHeartbeat > timeout) {
				console.warn(
					`[AgentManager] Agent ${agentId} timed out (${timeSinceHeartbeat}ms since last heartbeat)`
				);

				// Close socket to trigger unregister
				const socket = agent.socket as WebSocket;
				socket.close(1000, 'Heartbeat timeout');
			}
		}
	}

	// ============================================================================
	// Database Operations
	// ============================================================================

	private async updateAgentInDatabase(
		agentId: string,
		data: Record<string, unknown>
	): Promise<void> {
		try {
			await prisma.agent.update({
				where: { id: agentId },
				data: data as Parameters<typeof prisma.agent.update>[0]['data'],
			});
		} catch (error) {
			console.error(`[AgentManager] Failed to update agent ${agentId} in database:`, error);
		}
	}

	private async logSystemEvent(
		level: string,
		component: string,
		message: string,
		metadata?: Record<string, unknown>
	): Promise<void> {
		try {
			await prisma.systemLog.create({
				data: {
					level,
					component,
					message,
					metadata: metadata as Parameters<typeof prisma.systemLog.create>[0]['data']['metadata'],
				},
			});
		} catch (error) {
			console.error('[AgentManager] Failed to log system event:', error);
		}
	}

	// ============================================================================
	// Shutdown
	// ============================================================================

	async shutdown(): Promise<void> {
		console.log('[AgentManager] Shutting down...');
		this.isShuttingDown = true;

		// Stop cleanup timer
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}

		// Clear all debounced database timers
		for (const timer of this.databaseUpdateTimers.values()) {
			clearTimeout(timer);
		}
		this.databaseUpdateTimers.clear();

		// Cancel all pending commands
		for (const pending of this.pendingCommands.values()) {
			clearTimeout(pending.timeout);
			pending.reject(new Error('Server shutting down'));
		}
		this.pendingCommands.clear();

		// Close all agent connections
		for (const agent of this.agents.values()) {
			const socket = agent.socket as WebSocket;
			socket.close(1001, 'Server shutting down');
		}

		// Update all agents to offline in database
		const agentIds = Array.from(this.agents.keys());
		if (agentIds.length > 0) {
			await prisma.agent.updateMany({
				where: { id: { in: agentIds } },
				data: {
					status: 'offline',
					disconnectedAt: new Date(),
				},
			});
		}

		this.agents.clear();
		this.socketToAgentId.clear();
		this.userAgents.clear();
		this.adminSockets.clear();

		console.log('[AgentManager] Shutdown complete');
	}

	// ============================================================================
	// Stats
	// ============================================================================

	getStats(): {
		totalConnected: number;
		totalUsers: number;
		pendingCommands: number;
		adminConnections: number;
		poolAgents: number;
		totalManagedAccounts: number;
	} {
		// Count total managed accounts across all pool agents
		let totalManagedAccounts = 0;
		for (const poolAgent of this.poolAgents.values()) {
			totalManagedAccounts += poolAgent.managedAccounts?.length || 0;
		}

		return {
			totalConnected: this.agents.size,
			totalUsers: this.userAgents.size,
			pendingCommands: this.pendingCommands.size,
			adminConnections: this.adminSockets.size,
			poolAgents: this.poolAgents.size,
			totalManagedAccounts,
		};
	}

	/**
	 * Get detailed pool agent stats
	 */
	getPoolAgentStats(): {
		poolAgentId: string;
		vpsName: string;
		status: AgentStatus;
		accountCount: number;
		onlineAccounts: number;
		errorAccounts: number;
		cpuUsage: number;
		memoryUsage: number;
	}[] {
		const stats: {
			poolAgentId: string;
			vpsName: string;
			status: AgentStatus;
			accountCount: number;
			onlineAccounts: number;
			errorAccounts: number;
			cpuUsage: number;
			memoryUsage: number;
		}[] = [];

		for (const poolAgent of this.poolAgents.values()) {
			let onlineAccounts = 0;
			let errorAccounts = 0;

			for (const instance of poolAgent.instances.values()) {
				if (instance.status === 'online') onlineAccounts++;
				else if (instance.status === 'error') errorAccounts++;
			}

			stats.push({
				poolAgentId: poolAgent.id,
				vpsName: poolAgent.vpsName || 'Unknown',
				status: poolAgent.status,
				accountCount: poolAgent.managedAccounts?.length || 0,
				onlineAccounts,
				errorAccounts,
				cpuUsage: poolAgent.systemInfo?.cpuUsage || 0,
				memoryUsage: poolAgent.systemInfo?.memoryUsage || 0,
			});
		}

		return stats;
	}
}

// ============================================================================
// Singleton Export
// ============================================================================

export const agentManager = new AgentManager();
export default agentManager;
