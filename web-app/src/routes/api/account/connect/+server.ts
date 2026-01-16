import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSessionUser } from '$lib/server/auth';
import { validateAccountLimit } from '$lib/server/account-validator';

const prisma = new PrismaClient();

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
		const { broker, server, accountNumber } = await request.json();

		// Validate input
		if (!broker || !server || !accountNumber) {
			return json(
				{ success: false, error: 'Broker, server, and account number are required' },
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

		// Save MT5 account to database
		const newAccount = await prisma.mT5Account.create({
			data: {
				userId: sessionUser.userId,
				accountNumber,
				login: accountNumber, // In MT5, login is typically the account number
				broker,
				serverName: server,
				status: 'PENDING', // Will be activated when agent connects
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

		return json({
			success: true,
			message: 'MT5 account connected successfully',
			account: {
				id: newAccount.id,
				accountNumber: newAccount.accountNumber,
				broker: newAccount.broker,
				serverName: newAccount.serverName,
				status: newAccount.status
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
