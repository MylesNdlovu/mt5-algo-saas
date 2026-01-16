/**
 * IB Commission Tracking Types
 *
 * This module defines types for the IB Partner dashboard and commission tracking system.
 * Key features:
 * - Anonymous account tracking (IBs never see real MT5 account numbers or trader names)
 * - Commission calculation based on trading volume and spreads
 * - Admin controls for commission rates and minimum deposit requirements
 */

export interface AnonymousAccountView {
	anonymousId: string; // e.g., "ACC-8F3D2A1B" - shown to IB
	registeredAt: Date;
	isActive: boolean;

	// Trading stats (aggregated, no personal info)
	totalVolume: number; // Total trading volume in lots
	totalTrades: number; // Number of trades
	averageSpread: number; // Average spread in points
	lastTradeDate?: Date;
}

export interface IBCommissionSummary {
	period: Date; // Period start date
	periodEnd: Date;

	// Account metrics
	totalAccounts: number;
	activeAccounts: number;

	// Trading metrics
	totalVolume: number; // In lots
	totalTrades: number;
	averageSpread: number;

	// Commission breakdown
	grossCommission: number; // Before platform fees
	platformFee: number; // Platform fee
	netCommission: number; // What IB actually earns
	commissionRate: number; // Current rate percentage

	// Payment status
	isPaid: boolean;
	paidAt?: Date;
	paymentReference?: string;
}

export interface IBCommissionDetail {
	id: string;
	anonymousAccount: AnonymousAccountView;
	period: Date;
	periodEnd: Date;

	// Trading metrics for this account
	tradingVolume: number;
	numberOfTrades: number;
	averageSpread: number;

	// Commission calculation
	commissionRate: number;
	grossCommission: number;
	platformFee: number;
	netCommission: number;
}

export interface IBDashboardStats {
	// Current period stats
	currentPeriod: IBCommissionSummary;

	// Historical comparison
	previousPeriod?: IBCommissionSummary;
	growthPercentage?: number;

	// Account overview
	totalAccounts: number;
	activeAccounts: number;
	inactiveAccounts: number;

	// Revenue overview
	totalEarned: number; // All time
	pendingPayment: number; // Unpaid commissions
	lastPaymentDate?: Date;
	lastPaymentAmount?: number;
}

export interface CommissionRateConfig {
	id: string;
	commissionRate: number; // Percentage (e.g., 0.5%)
	minVolume: number; // Minimum volume for this rate
	maxVolume?: number; // Maximum volume (null = unlimited)
	effectiveFrom: Date;
	effectiveTo?: Date;
	isActive: boolean;
}

export interface GlobalSettings {
	id: string;
	settingKey: string;
	settingValue: string;
	description?: string;
	updatedBy?: string;
	updatedAt: Date;
}

// Admin-only view with full account details
export interface AdminAccountView {
	anonymousId: string;
	mt5AccountNumber: string; // Real MT5 account (Admin only!)
	userId: string;
	userName: string; // Admin can see trader names
	userEmail: string;
	ibPartnerName: string;
	ibPartnerEmail: string;
	registeredAt: Date;
	isActive: boolean;

	// Trading stats
	totalVolume: number;
	totalTrades: number;
	averageSpread: number;
	balance: number; // Current account balance
	equity: number;
}

// Conflict detection for admin monitoring
export interface AccountConflict {
	accountNumber: string;
	conflictingSince: Date;
	agentCount: number;
	agents: Array<{
		agentId: string;
		assignedAt: Date;
	}>;
	accountDetails?: {
		id: string;
		userId: string;
		balance: number;
		status: string;
	};
}

// Admin IB management view
export interface AdminIBPartnerView {
	id: string;
	email: string;
	companyName: string;
	contactName: string;
	phone: string;
	ibCode: string;

	// Status
	isActive: boolean;
	isApproved: boolean;

	// White Label Settings
	logo: string | null;
	favicon: string | null;
	brandColor: string;
	brandName: string | null;
	domain: string | null;

	// Statistics
	totalTraders: number;
	activeTraders: number;
	monthlyRevenue: number;
	lifetimeRevenue: number;

	// Commission settings
	spreadRevShare: number; // % of spread revenue
	commissionRates: CommissionRateConfig[];

	// Timestamps
	createdAt: Date;
	approvedAt?: Date;
}
