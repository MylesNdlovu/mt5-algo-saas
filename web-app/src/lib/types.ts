// Shared types for the application
export type SafetyIndicator = 'RED' | 'ORANGE' | 'GREEN';
export type EAStatus = 'STOPPED' | 'RUNNING' | 'PAUSED' | 'ERROR';
export type UserRole = 'ADMIN' | 'USER';
export type UserType = 'DIRECT' | 'IB_CLIENT';
export type Broker = 'Exness' | 'PrimeXBT';

export interface User {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: UserRole;
	userType: UserType;
	isActive: boolean;
}

export interface MT5Account {
	id: string;
	userId: string;
	accountNumber: string;
	broker: Broker;
	serverName: string;
	balance: number;
	equity: number;
	eaStatus: EAStatus;
	safetyIndicator: SafetyIndicator;
	vpsIp?: string;
}

export interface Trade {
	id: string;
	ticket: string;
	symbol: string;
	type: 'BUY' | 'SELL';
	volume: number;
	openPrice: number;
	openTime: Date;
	closePrice?: number;
	closeTime?: Date;
	profit: number;
	commission: number;
	swap: number;
	isClosed: boolean;
}

export interface PnL {
	total: number;
	profit: number;
	commission: number;
	swap: number;
}
