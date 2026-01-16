import { prisma } from '$lib/server/db';
import type { UserRole } from '@prisma/client';

export interface ValidationResult {
	canTrade: boolean;
	userMessage?: string; // Clean, actionable message for traders/IBs
	adminReason?: string; // Technical details for admins only
	requiresDeposit?: boolean;
}

/**
 * Validates if an account can be used for trading
 * Returns different messages for end users vs admins to protect product image
 */
export async function validateAccountForTrading(
	accountId: string,
	userRole?: UserRole
): Promise<ValidationResult> {
	const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

	try {
		// Get account details
		const account = await prisma.mT5Account.findUnique({
			where: { id: accountId },
			include: {
				user: {
					select: {
						id: true,
						email: true
					}
				}
			}
		});

		if (!account) {
			return {
				canTrade: false,
				userMessage: 'Account not found',
				adminReason: `Account ${accountId} does not exist in database`
			};
		}

		// 1. FUNDING VALIDATION (balance > 0)
		if (account.balance <= 0) {
			return {
				canTrade: false,
				requiresDeposit: true,
				userMessage: 'Deposit required to start trading',
				adminReason: `Account ${account.accountNumber} is unfunded: balance = ${account.balance}`
			};
		}

		// 2. CONFLICT DETECTION - Check for duplicate agent assignments
		const conflict = await detectAgentConflict(account.accountNumber);
		if (conflict) {
			return {
				canTrade: false,
				// Users see generic message - don't expose technical issues
				userMessage: 'Service temporarily unavailable. Please contact support.',
				// Admins see full technical details
				adminReason: `CONFLICT: Account ${account.accountNumber} is assigned to multiple agents: ${conflict.agents.join(', ')}`
			};
		}

		// 3. ACCOUNT STATUS CHECK
		if (account.status !== 'ACTIVE') {
			return {
				canTrade: false,
				userMessage: 'Account is not active. Please verify your account.',
				adminReason: `Account ${account.accountNumber} status: ${account.status}`
			};
		}

		// All validations passed
		return {
			canTrade: true
		};
	} catch (error) {
		// Log system error for admins, show generic message to users
		console.error('[Account Validator] Error:', error);
		return {
			canTrade: false,
			userMessage: 'Unable to verify account. Please try again later.',
			adminReason: `System error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`
		};
	}
}

/**
 * Detects if an account is assigned to multiple agents (conflict)
 * This should never happen, but we check to prevent race conditions
 */
async function detectAgentConflict(
	accountNumber: string
): Promise<{ hasConflict: boolean; agents: string[] } | null> {
	const assignments = await prisma.mT5AccountAssignment.findMany({
		where: {
			accountNumber,
			// Only check active assignments
			assignedAt: {
				// Assignments from last 2 minutes are considered active
				gte: new Date(Date.now() - 2 * 60 * 1000)
			}
		},
		select: {
			agentId: true,
			assignedAt: true
		},
		orderBy: {
			assignedAt: 'desc'
		}
	});

	if (assignments.length > 1) {
		// Multiple agents trying to control the same account - CONFLICT!
		return {
			hasConflict: true,
			agents: assignments.map((a) => a.agentId)
		};
	}

	return null;
}

/**
 * Validates if user can add more MT5 accounts (5 account limit)
 */
export async function validateAccountLimit(userId: string): Promise<{
	canAdd: boolean;
	current: number;
	limit: number;
	message?: string;
}> {
	const ACCOUNT_LIMIT = 5;

	const currentAccounts = await prisma.mT5Account.count({
		where: {
			userId,
			status: {
				in: ['ACTIVE', 'PENDING']
			}
		}
	});

	if (currentAccounts >= ACCOUNT_LIMIT) {
		return {
			canAdd: false,
			current: currentAccounts,
			limit: ACCOUNT_LIMIT,
			message: `Account limit reached. You can add up to ${ACCOUNT_LIMIT} accounts.`
		};
	}

	return {
		canAdd: true,
		current: currentAccounts,
		limit: ACCOUNT_LIMIT
	};
}

/**
 * Gets all accounts with conflicts - ADMIN ONLY
 * Used for technical monitoring and debugging
 */
export async function getAllConflicts(): Promise<
	Array<{
		accountNumber: string;
		agents: Array<{ agentId: string; assignedAt: Date }>;
		accountDetails?: {
			id: string;
			userId: string;
			balance: number;
			status: string;
		};
	}>
> {
	// Get all assignments from last 2 minutes
	const recentAssignments = await prisma.mT5AccountAssignment.findMany({
		where: {
			assignedAt: {
				gte: new Date(Date.now() - 2 * 60 * 1000)
			}
		},
		select: {
			accountNumber: true,
			agentId: true,
			assignedAt: true
		},
		orderBy: {
			assignedAt: 'desc'
		}
	});

	// Group by account number
	const grouped = new Map<string, Array<{ agentId: string; assignedAt: Date }>>();
	for (const assignment of recentAssignments) {
		if (!grouped.has(assignment.accountNumber)) {
			grouped.set(assignment.accountNumber, []);
		}
		grouped.get(assignment.accountNumber)!.push({
			agentId: assignment.agentId,
			assignedAt: assignment.assignedAt
		});
	}

	// Find conflicts (accounts with multiple agents)
	const conflicts: Array<{
		accountNumber: string;
		agents: Array<{ agentId: string; assignedAt: Date }>;
		accountDetails?: any;
	}> = [];

	for (const [accountNumber, agents] of grouped.entries()) {
		if (agents.length > 1) {
			// Get account details
			const account = await prisma.mT5Account.findUnique({
				where: { accountNumber },
				select: {
					id: true,
					userId: true,
					balance: true,
					status: true
				}
			});

			conflicts.push({
				accountNumber,
				agents,
				accountDetails: account || undefined
			});
		}
	}

	return conflicts;
}

/**
 * Dual-layer logging system
 * Users see business-friendly events, admins see technical details
 */
export async function logValidationEvent(
	accountId: string,
	eventType: 'validation_passed' | 'validation_failed' | 'conflict_detected' | 'limit_reached',
	userMessage: string,
	adminDetails?: string
) {
	// Log user-friendly event (could be stored in a separate UserEvent table)
	console.log(`[User Event] ${eventType}: ${userMessage}`);

	// Log technical details for admin monitoring
	if (adminDetails) {
		console.error(`[Admin Log] ${eventType} - Account ${accountId}: ${adminDetails}`);
	}
}
