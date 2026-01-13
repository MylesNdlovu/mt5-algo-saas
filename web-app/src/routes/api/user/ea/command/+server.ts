import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSessionUser } from '$lib/server/auth';
import { sendAgentCommand } from '$lib/server/websocket-server';
import { ServerMessageType } from '$lib/types/websocket';

const prisma = new PrismaClient();

/**
 * POST /api/user/ea/command
 *
 * Send EA commands (start/stop/pause) to all enabled MT5 accounts
 * This endpoint handles multi-account trading execution
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const sessionUser = getSessionUser(cookies);

	if (!sessionUser) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { command } = await request.json();

		// Validate command
		const validCommands = ['start_ea', 'stop_ea', 'pause_ea'];
		if (!validCommands.includes(command)) {
			return json({ error: 'Invalid command' }, { status: 400 });
		}

		// Get all enabled MT5 accounts for this user
		const enabledAccounts = await prisma.mT5Account.findMany({
			where: {
				userId: sessionUser.userId,
				isEnabledForTrading: true,
				status: 'ACTIVE' // Only send commands to active accounts
			},
			select: {
				id: true,
				accountNumber: true,
				broker: true,
				serverName: true
			}
		});

		if (enabledAccounts.length === 0) {
			return json(
				{
					success: false,
					error: 'No enabled accounts found',
					message: 'Please enable at least one MT5 account for trading in Settings'
				},
				{ status: 400 }
			);
		}

		console.log(`[EA Command] ${command} for ${enabledAccounts.length} accounts`, {
			userId: sessionUser.userId,
			accounts: enabledAccounts.map(a => a.accountNumber)
		});

		// Send commands to all enabled accounts
		const results = await Promise.allSettled(
			enabledAccounts.map(async (account) => {
				// Find the agent managing this MT5 account
				// First, try to find a pool agent assignment
				const assignment = await prisma.mT5AccountAssignment.findFirst({
					where: {
						mt5AccountNumber: account.accountNumber,
						isActive: true
					},
					include: {
						agent: {
							select: {
								id: true,
								status: true,
								isPoolAgent: true
							}
						}
					}
				});

				if (assignment?.agent && assignment.agent.status === 'online') {
					// Send command to pool agent with account-specific params
					return await sendAgentCommand(
						assignment.agent.id,
						command,
						{
							mt5AccountNumber: account.accountNumber,
							broker: account.broker,
							serverName: account.serverName
						},
						30000 // 30 second timeout
					);
				}

				// Fallback: Try to find a dedicated agent for this user
				const userAgent = await prisma.agent.findFirst({
					where: {
						userId: sessionUser.userId,
						status: 'online',
						mt5AccountNumber: account.accountNumber
					}
				});

				if (userAgent) {
					return await sendAgentCommand(
						userAgent.id,
						command,
						{
							mt5AccountNumber: account.accountNumber
						},
						30000 // 30 second timeout
					);
				}

				throw new Error(`No online agent found for account ${account.accountNumber}`);
			})
		);

		// Analyze results
		const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
		const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

		// Log to system
		await prisma.systemLog.create({
			data: {
				level: failed.length > 0 ? 'WARNING' : 'INFO',
				component: 'WEB',
				message: `Multi-account EA ${command} executed`,
				metadata: {
					userId: sessionUser.userId,
					command,
					totalAccounts: enabledAccounts.length,
					successful: successful.length,
					failed: failed.length
				} as object
			}
		});

		return json({
			success: failed.length === 0,
			message: failed.length === 0
				? `${command} executed successfully on all ${successful.length} accounts`
				: `${command} executed on ${successful.length}/${enabledAccounts.length} accounts`,
			totalAccounts: enabledAccounts.length,
			successfulAccounts: successful.length,
			failedAccounts: failed.length,
			accounts: enabledAccounts.map((acc, idx) => ({
				accountNumber: acc.accountNumber,
				broker: acc.broker,
				status: results[idx].status === 'fulfilled' ? 'success' : 'failed',
				error: results[idx].status === 'rejected' ? (results[idx].reason as Error).message : undefined
			}))
		});
	} catch (error) {
		console.error('[EA Command] Error:', error);
		return json({ error: 'Failed to execute EA command' }, { status: 500 });
	}
};
