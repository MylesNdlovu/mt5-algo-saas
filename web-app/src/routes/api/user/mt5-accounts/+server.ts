import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSessionUser } from '$lib/server/auth';

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
