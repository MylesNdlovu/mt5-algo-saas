import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSessionUser } from '$lib/server/auth';
import { validateAccountLimit } from '$lib/server/account-validator';

const prisma = new PrismaClient();

// GET: Fetch all MT5 accounts for the current user
export const GET: RequestHandler = async ({ cookies }) => {
	const sessionUser = getSessionUser(cookies);

	if (!sessionUser) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const accounts = await prisma.mT5Account.findMany({
			where: { userId: sessionUser.userId },
			select: {
				id: true,
				accountNumber: true,
				broker: true,
				serverName: true,
				status: true,
				balance: true,
				equity: true,
				isEnabledForTrading: true,
				createdAt: true,
				lastSyncAt: true
			},
			orderBy: { createdAt: 'desc' }
		});

		// Enforce max 5 accounts limit
		const accountsWithLimit = accounts.slice(0, 5);
		const enabledCount = accountsWithLimit.filter(acc => acc.isEnabledForTrading).length;

		return json({
			success: true,
			accounts: accountsWithLimit,
			totalAccounts: accountsWithLimit.length,
			enabledAccounts: enabledCount,
			maxAccounts: 5
		});
	} catch (error) {
		console.error('[MT5Accounts API] Error fetching accounts:', error);
		return json({ error: 'Failed to fetch MT5 accounts' }, { status: 500 });
	}
};

// POST: Add a new MT5 account (with 5 account limit enforcement)
export const POST: RequestHandler = async ({ request, cookies }) => {
	const sessionUser = getSessionUser(cookies);

	if (!sessionUser) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { accountNumber, broker, serverName, password } = body;

		// Validate required fields
		if (!accountNumber || !broker || !serverName) {
			return json(
				{
					success: false,
					error: 'Missing required fields: accountNumber, broker, serverName'
				},
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
			return json(
				{
					success: false,
					error: 'This MT5 account is already registered'
				},
				{ status: 409 }
			);
		}

		// Create new account
		const newAccount = await prisma.mT5Account.create({
			data: {
				accountNumber,
				broker,
				serverName,
				userId: sessionUser.userId,
				status: 'PENDING',
				balance: 0,
				equity: 0,
				isEnabledForTrading: false
			}
		});

		return json({
			success: true,
			message: 'MT5 account added successfully',
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
		console.error('[MT5Accounts API] Error adding account:', error);
		return json(
			{
				success: false,
				error: 'Failed to add MT5 account'
			},
			{ status: 500 }
		);
	}
};
