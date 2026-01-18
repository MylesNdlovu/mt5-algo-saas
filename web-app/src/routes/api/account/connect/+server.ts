import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSessionUser } from '$lib/server/auth';
import { validateAccountLimit } from '$lib/server/account-validator';

const prisma = new PrismaClient();

/**
 * Find a pool agent with capacity to handle a new MT5 account
 */
async function findAvailablePoolAgent() {
	const poolAgents = await prisma.agent.findMany({
		where: {
			isPoolAgent: true,
			status: 'online'
		},
		orderBy: {
			lastHeartbeat: 'desc'
		}
	});

	// Find agent with capacity (less than maxCapacity accounts)
	for (const agent of poolAgents) {
		const assignmentCount = await prisma.mT5AccountAssignment.count({
			where: { agentId: agent.id, isActive: true }
		});
		const maxCapacity = agent.maxCapacity || 50;
		if (assignmentCount < maxCapacity) {
			return agent;
		}
	}

	// If no online pool agent, return first pool agent (will provision when online)
	const anyPoolAgent = await prisma.agent.findFirst({
		where: { isPoolAgent: true }
	});

	return anyPoolAgent;
}

/**
 * POST /api/account/connect
 * Connects and saves a new MT5 account with 5 account limit enforcement
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const sessionUser = getSessionUser(cookies);

	if (!sessionUser) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { broker, server, accountNumber, password } = await request.json();

		// Validate input
		if (!broker || !server || !accountNumber) {
			return json(
				{ success: false, error: 'Broker, server, and account number are required' },
				{ status: 400 }
			);
		}

		// Password is required for auto-provisioning
		if (!password) {
			return json(
				{ success: false, error: 'MT5 password is required for automatic setup' },
				{ status: 400 }
			);
		}

		// GUARD: Check 5 account limit
		const limitCheck = await validateAccountLimit(sessionUser.userId);
		if (!limitCheck.canAdd) {
			return json(
				{
					success: false,
					error: limitCheck.message,
					current: limitCheck.current,
					limit: limitCheck.limit
				},
				{ status: 403 }
			);
		}

		// Check if account already exists
		const existingAccount = await prisma.mT5Account.findUnique({
			where: { accountNumber }
		});

		if (existingAccount) {
			// Account already registered - check if it belongs to this user
			if (existingAccount.userId === sessionUser.userId) {
				return json(
					{
						success: false,
						error: 'This MT5 account is already connected to your account'
					},
					{ status: 409 }
				);
			} else {
				return json(
					{
						success: false,
						error: 'This MT5 account is already registered to another user'
					},
					{ status: 409 }
				);
			}
		}

		// Save MT5 account to database (with password for auto-provisioning)
		// TODO: Encrypt password before storing in production
		const newAccount = await prisma.mT5Account.create({
			data: {
				userId: sessionUser.userId,
				accountNumber,
				login: accountNumber, // In MT5, login is typically the account number
				password, // Stored for agent auto-provisioning
				broker,
				serverName: server,
				status: 'PROVISIONING', // Will be activated when agent provisions MT5
				balance: 0,
				equity: 0,
				isEnabledForTrading: false
			}
		});

		console.log('[Account Connect] New MT5 account added:', {
			userId: sessionUser.userId,
			accountNumber: newAccount.accountNumber,
			broker: newAccount.broker,
			accountsUsed: limitCheck.current + 1,
			accountsLimit: limitCheck.limit
		});

		// Find available pool agent for auto-provisioning
		const poolAgent = await findAvailablePoolAgent();
		let provisioningStatus = 'queued';
		let assignmentId = null;
		let commandId = null;

		if (poolAgent) {
			try {
				// Create assignment linking this account to the pool agent
				const assignment = await prisma.mT5AccountAssignment.create({
					data: {
						mt5AccountNumber: accountNumber,
						mt5Broker: broker,
						mt5ServerName: server,
						agentId: poolAgent.id,
						userId: sessionUser.userId,
						isActive: true,
						credentialsDelivered: false
					}
				});
				assignmentId = assignment.id;

				// Queue provision_mt5 command for the agent
				const command = await prisma.agentCommand.create({
					data: {
						agentId: poolAgent.id,
						command: 'provision_mt5',
						mt5AccountNumber: accountNumber,
						payload: {
							broker,
							serverName: server,
							login: accountNumber,
							password,
							accountNumber
						},
						priority: 10,
						status: 'pending',
						expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 min expiry
					}
				});
				commandId = command.id;

				// Update agent's managed accounts
				const currentAccounts = poolAgent.managedAccounts || [];
				if (!currentAccounts.includes(accountNumber)) {
					await prisma.agent.update({
						where: { id: poolAgent.id },
						data: {
							managedAccounts: [...currentAccounts, accountNumber]
						}
					});
				}

				console.log('[Account Connect] Provisioning queued:', {
					accountNumber,
					agentId: poolAgent.id,
					commandId: command.id
				});

				provisioningStatus = 'provisioning';
			} catch (provisionError) {
				console.error('[Account Connect] Failed to queue provisioning:', provisionError);
				provisioningStatus = 'pending_agent';
			}
		} else {
			console.warn('[Account Connect] No pool agent available for:', accountNumber);
			provisioningStatus = 'no_agent';
		}

		return json({
			success: true,
			message: poolAgent
				? 'MT5 account connected! Auto-provisioning in progress...'
				: 'MT5 account connected! Waiting for agent assignment.',
			account: {
				id: newAccount.id,
				accountNumber: newAccount.accountNumber,
				broker: newAccount.broker,
				serverName: newAccount.serverName,
				status: newAccount.status
			},
			provisioning: {
				status: provisioningStatus,
				agentId: poolAgent?.id || null,
				commandId,
				assignmentId,
				message: poolAgent
					? 'Agent will download and configure MT5 within 30 seconds'
					: 'No pool agent available. Account will be provisioned when an agent comes online.'
			},
			accountsUsed: limitCheck.current + 1,
			accountsLimit: limitCheck.limit
		});
	} catch (error) {
		console.error('[Account Connect] Error:', error);
		return json(
			{
				success: false,
				error: 'Failed to connect MT5 account'
			},
			{ status: 500 }
		);
	}
};
