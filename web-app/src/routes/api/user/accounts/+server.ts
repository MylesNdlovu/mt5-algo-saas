import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSessionUser } from '$lib/server/auth';

const prisma = new PrismaClient();

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		// Get user from session
		const sessionUser = getSessionUser(cookies);

		if (!sessionUser) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		// Query actual MT5 accounts from database
		const mt5Accounts = await prisma.mT5Account.findMany({
			where: {
				userId: sessionUser.userId,
				status: { in: ['ACTIVE', 'PENDING'] } // Only show active or pending accounts
			},
			select: {
				id: true,
				userId: true,
				accountNumber: true,
				broker: true,
				serverName: true,
				status: true,
				balance: true,
				equity: true,
				isEnabledForTrading: true,
				createdAt: true
			},
			orderBy: { createdAt: 'desc' }
		});

		// Map to expected format
		const accounts = mt5Accounts.map((acc, index) => ({
			id: acc.id,
			userId: acc.userId,
			accountNumber: acc.accountNumber,
			broker: acc.broker,
			serverName: acc.serverName,
			isActive: acc.status === 'ACTIVE',
			isPrimary: index === 0, // First account is primary
			balance: acc.balance,
			equity: acc.equity,
			isEnabledForTrading: acc.isEnabledForTrading
		}));

		return json(accounts);
	} catch (error) {
		console.error('[API] Error fetching user accounts:', error);
		return json({ error: 'Failed to fetch accounts' }, { status: 500 });
	}
};
