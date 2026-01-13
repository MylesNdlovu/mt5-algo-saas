/**
 * WebSocket Message Types for MT5 Algo SaaS Platform
 *
 * High-performance message definitions for real-time trading communication
 * between SvelteKit web app and C# agents running on VPS servers.
 */

// ============================================================================
// Message Type Enums (compact for performance)
// ============================================================================

/** Messages FROM C# Agent TO Web App */
export enum AgentMessageType {
	HEARTBEAT = 'heartbeat',
	STATUS_UPDATE = 'status_update',
	TRADE_UPDATE = 'trade_update',
	COMMAND_RESULT = 'command_result',
	ERROR = 'error',
	AUTH = 'auth',
	// Multi-account pool agent messages
	MULTI_AUTH = 'multi_auth',
	MULTI_STATUS_UPDATE = 'multi_status_update',
	MULTI_HEARTBEAT = 'multi_heartbeat',
}

/** Messages FROM Web App TO C# Agent */
export enum ServerMessageType {
	AUTH_RESPONSE = 'auth_response',
	START_EA = 'start_ea',
	STOP_EA = 'stop_ea',
	PAUSE_EA = 'pause_ea',
	LOAD_EA = 'load_ea',
	UPDATE_SETTINGS = 'update_settings',
	SYNC_TRADES = 'sync_trades',
	PING = 'ping',
	// Multi-account pool agent messages
	MULTI_AUTH_RESPONSE = 'multi_auth_response',
	TARGETED_COMMAND = 'targeted_command', // Command for specific MT5 instance
}

// ============================================================================
// Base Message Structure
// ============================================================================

export interface BaseMessage {
	type: string;
	timestamp: number; // Unix timestamp in milliseconds for latency tracking
	id?: string; // Optional message ID for request-response correlation
}

// ============================================================================
// Agent -> Server Messages
// ============================================================================

export interface AuthMessage extends BaseMessage {
	type: AgentMessageType.AUTH;
	apiKey: string;
	machineId: string;
	agentVersion?: string;
	osVersion?: string;
}

// ============================================================================
// Multi-Account Pool Agent Messages (Mother Agent Architecture)
// ============================================================================

/** Authentication message for pool agents managing multiple MT5 instances */
export interface MultiAuthMessage extends BaseMessage {
	type: AgentMessageType.MULTI_AUTH;
	apiKey: string;
	machineId: string;
	agentVersion?: string;
	osVersion?: string;
	// Pool agent specific fields
	isPoolAgent: true;
	vpsName: string;
	vpsRegion?: string;
	maxCapacity: number;
	accountNumbers: string[]; // All MT5 accounts currently managed by this agent
}

/** Status info for a single MT5 instance managed by a pool agent */
export interface MT5InstanceStatus {
	accountNumber: string;
	status: 'online' | 'offline' | 'error' | 'starting';
	eaStatus: 'running' | 'stopped' | 'paused' | 'error';
	windowTitle?: string;
	processId?: number;
	// Account info
	balance: number;
	equity: number;
	margin: number;
	freeMargin: number;
	profit: number;
	broker?: string;
	serverName?: string;
	// EA info
	eaLoaded: boolean;
	eaRunning: boolean;
	eaName?: string;
	chartSymbol?: string;
	chartTimeframe?: string;
	// Timestamps
	lastActivity: number;
}

/** Batched status update from pool agent for all managed MT5 instances */
export interface MultiStatusUpdateMessage extends BaseMessage {
	type: AgentMessageType.MULTI_STATUS_UPDATE;
	agentId: string;
	vpsName: string;
	// VPS resource info
	systemInfo: {
		cpuUsage: number;
		memoryUsage: number;
		diskUsage: number;
		mt5InstanceCount: number;
	};
	// Status for each managed MT5 instance
	accounts: MT5InstanceStatus[];
}

/** Heartbeat from pool agent with summary info */
export interface MultiHeartbeatMessage extends BaseMessage {
	type: AgentMessageType.MULTI_HEARTBEAT;
	agentId: string;
	vpsName: string;
	status: AgentStatus;
	// Summary stats
	totalAccounts: number;
	onlineAccounts: number;
	errorAccounts: number;
	// Resource usage
	cpuUsage: number;
	memoryUsage: number;
}

export interface HeartbeatMessage extends BaseMessage {
	type: AgentMessageType.HEARTBEAT;
	agentId: string;
	status: AgentStatus;
	mt5Connected: boolean;
	eaStatus?: EAStatusInfo;
	accountInfo?: AccountInfo;
	systemInfo?: SystemInfo;
}

export interface StatusUpdateMessage extends BaseMessage {
	type: AgentMessageType.STATUS_UPDATE;
	agentId: string;
	eaStatus: EAStatusInfo;
	accountInfo: AccountInfo;
	safetyIndicator: 'RED' | 'ORANGE' | 'GREEN';
}

export interface TradeUpdateMessage extends BaseMessage {
	type: AgentMessageType.TRADE_UPDATE;
	agentId: string;
	trade: TradeInfo;
	action: 'opened' | 'closed' | 'modified';
}

export interface CommandResultMessage extends BaseMessage {
	type: AgentMessageType.COMMAND_RESULT;
	agentId: string;
	commandId: string;
	success: boolean;
	result?: unknown;
	error?: string;
}

export interface ErrorMessage extends BaseMessage {
	type: AgentMessageType.ERROR;
	agentId?: string;
	code: string;
	message: string;
	details?: unknown;
}

// ============================================================================
// Server -> Agent Messages
// ============================================================================

export interface AuthResponseMessage extends BaseMessage {
	type: ServerMessageType.AUTH_RESPONSE;
	success: boolean;
	agentId?: string;
	error?: string;
}

export interface StartEAMessage extends BaseMessage {
	type: ServerMessageType.START_EA;
	commandId: string;
	eaName?: string;
	symbol?: string;
	timeframe?: string;
}

export interface StopEAMessage extends BaseMessage {
	type: ServerMessageType.STOP_EA;
	commandId: string;
}

export interface PauseEAMessage extends BaseMessage {
	type: ServerMessageType.PAUSE_EA;
	commandId: string;
}

export interface LoadEAMessage extends BaseMessage {
	type: ServerMessageType.LOAD_EA;
	commandId: string;
	eaName: string;
	symbol: string;
	timeframe: string;
	settings?: Record<string, unknown>;
}

export interface UpdateSettingsMessage extends BaseMessage {
	type: ServerMessageType.UPDATE_SETTINGS;
	commandId: string;
	settings: Record<string, unknown>;
}

export interface SyncTradesMessage extends BaseMessage {
	type: ServerMessageType.SYNC_TRADES;
	commandId: string;
}

export interface PingMessage extends BaseMessage {
	type: ServerMessageType.PING;
}

// ============================================================================
// Server -> Pool Agent Messages
// ============================================================================

/** Authentication response for pool agents */
export interface MultiAuthResponseMessage extends BaseMessage {
	type: ServerMessageType.MULTI_AUTH_RESPONSE;
	success: boolean;
	agentId?: string;
	vpsName?: string;
	error?: string;
	// List of accounts that were successfully registered
	registeredAccounts?: string[];
	// List of accounts that failed registration (e.g., already assigned elsewhere)
	failedAccounts?: { accountNumber: string; reason: string }[];
}

/** Command targeting a specific MT5 instance on a pool agent */
export interface TargetedCommandMessage extends BaseMessage {
	type: ServerMessageType.TARGETED_COMMAND;
	commandId: string;
	targetAccount: string; // MT5 account number to execute command on
	command: 'start_ea' | 'stop_ea' | 'pause_ea' | 'load_ea' | 'update_settings' | 'sync_trades' | 'take_screenshot' | 'get_status';
	payload?: Record<string, unknown>;
}

// ============================================================================
// Supporting Types
// ============================================================================

export type AgentStatus = 'online' | 'offline' | 'error' | 'connecting';

export interface EAStatusInfo {
	loaded: boolean;
	running: boolean;
	paused: boolean;
	name?: string;
	symbol?: string;
	timeframe?: string;
	magicNumber?: number;
}

export interface AccountInfo {
	balance: number;
	equity: number;
	margin: number;
	freeMargin: number;
	profit: number;
	accountNumber?: string;
	broker?: string;
	serverName?: string;
	leverage?: number;
	currency?: string;
}

export interface SystemInfo {
	cpuUsage?: number;
	memoryUsage?: number;
	diskSpace?: number;
	networkLatency?: number;
}

export interface TradeInfo {
	ticket: string;
	symbol: string;
	type: 'BUY' | 'SELL';
	volume: number;
	openPrice: number;
	openTime: number; // Unix timestamp
	closePrice?: number;
	closeTime?: number;
	stopLoss?: number;
	takeProfit?: number;
	profit: number;
	commission: number;
	swap: number;
	magicNumber?: number;
	comment?: string;
}

// ============================================================================
// Union Types for Type Guards
// ============================================================================

export type AgentToServerMessage =
	| AuthMessage
	| HeartbeatMessage
	| StatusUpdateMessage
	| TradeUpdateMessage
	| CommandResultMessage
	| ErrorMessage
	// Multi-account pool agent messages
	| MultiAuthMessage
	| MultiStatusUpdateMessage
	| MultiHeartbeatMessage;

export type ServerToAgentMessage =
	| AuthResponseMessage
	| StartEAMessage
	| StopEAMessage
	| PauseEAMessage
	| LoadEAMessage
	| UpdateSettingsMessage
	| SyncTradesMessage
	| PingMessage
	// Multi-account pool agent messages
	| MultiAuthResponseMessage
	| TargetedCommandMessage;

// ============================================================================
// Type Guards for High-Performance Message Parsing
// ============================================================================

export function isAuthMessage(msg: BaseMessage): msg is AuthMessage {
	return msg.type === AgentMessageType.AUTH;
}

export function isHeartbeatMessage(msg: BaseMessage): msg is HeartbeatMessage {
	return msg.type === AgentMessageType.HEARTBEAT;
}

export function isStatusUpdateMessage(msg: BaseMessage): msg is StatusUpdateMessage {
	return msg.type === AgentMessageType.STATUS_UPDATE;
}

export function isTradeUpdateMessage(msg: BaseMessage): msg is TradeUpdateMessage {
	return msg.type === AgentMessageType.TRADE_UPDATE;
}

export function isCommandResultMessage(msg: BaseMessage): msg is CommandResultMessage {
	return msg.type === AgentMessageType.COMMAND_RESULT;
}

export function isErrorMessage(msg: BaseMessage): msg is ErrorMessage {
	return msg.type === AgentMessageType.ERROR;
}

// Multi-account pool agent type guards
export function isMultiAuthMessage(msg: BaseMessage): msg is MultiAuthMessage {
	return msg.type === AgentMessageType.MULTI_AUTH;
}

export function isMultiStatusUpdateMessage(msg: BaseMessage): msg is MultiStatusUpdateMessage {
	return msg.type === AgentMessageType.MULTI_STATUS_UPDATE;
}

export function isMultiHeartbeatMessage(msg: BaseMessage): msg is MultiHeartbeatMessage {
	return msg.type === AgentMessageType.MULTI_HEARTBEAT;
}

// ============================================================================
// Connected Agent State (In-Memory Tracking)
// ============================================================================

export interface ConnectedAgent {
	id: string;
	machineId: string;
	userId: string;
	socket: unknown; // WebSocket reference (typed as unknown to avoid ws import here)
	connectedAt: number;
	lastHeartbeat: number;
	status: AgentStatus;
	eaStatus?: EAStatusInfo;
	accountInfo?: AccountInfo;
	remoteAddress?: string;
	// Pool agent specific fields
	isPoolAgent?: boolean;
	vpsName?: string;
	vpsRegion?: string;
	maxCapacity?: number;
	currentLoad?: number;
	managedAccounts?: string[];
}

/** Pool agent with full instance tracking */
export interface ConnectedPoolAgent extends ConnectedAgent {
	isPoolAgent: true;
	vpsName: string;
	maxCapacity: number;
	currentLoad: number;
	managedAccounts: string[];
	// Real-time status of all managed MT5 instances
	instances: Map<string, MT5InstanceStatus>;
	// Resource monitoring
	systemInfo?: {
		cpuUsage: number;
		memoryUsage: number;
		diskUsage: number;
		mt5InstanceCount: number;
	};
}

// ============================================================================
// Admin Dashboard Broadcast Types
// ============================================================================

export interface AgentConnectionEvent {
	event: 'agent_connected' | 'agent_disconnected' | 'agent_status_changed';
	agentId: string;
	userId: string;
	timestamp: number;
	data?: Partial<ConnectedAgent>;
}
