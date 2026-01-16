import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSessionUser } from '$lib/server/auth';
import type { AnonymousAccountView } from '$lib/types/ib-types';

const prisma = new PrismaClient();

/**
 * GET /api/ib/accounts
 * Returns anonymous account list for IB partner
 * CRITICAL: NO personal information - only anonymous IDs and trading stats
 */
export const GET: RequestHandler = async ({ cookies, url }) => {
	const sessionUser = getSessionUser(cookies);

	if (!sessionUser || sessionUser.role !== 'IB') {
		return json({ error: 'Unauthorized - IB access only' }, { status: 403 });
	}

	try {
		const status = url.searchParams.get('status') || 'all'; // all, active, inactive

		// Get anonymous accounts for this IB
		const anonymousAccounts = await prisma.anonymousAccount.findMany({
			where: {
				ibPartnerId: sessionUser.userId,
				...(status === 'active' ? { isActive: true } : status === 'inactive' ? { isActive: false } : {})
			},
			orderBy: {
				registeredAt: 'desc'
			}
		});

		// For each anonymous account, calculate trading stats from commissions
		const accountViews: AnonymousAccountView[] = await Promise.all(
			anonymousAccounts.map(async (account) => {
				// Get all-time trading stats from commission records
				const commissions = await prisma.iBCommission.findMany({
					where: {
						anonymousAccountId: account.id
					}
				});

				const totalVolume = commissions.reduce((sum, c) => sum + c.tradingVolume, 0);
				const totalTrades = commissions.reduce((sum, c) => sum + c.numberOfTrades, 0);
				const averageSpread =
					commissions.length > 0
						? commissions.reduce((sum, c) => sum + c.averageSpread, 0) / commissions.length
						: 0;

				// Get last trade date from most recent commission period
				const lastCommission = commissions
					.filter((c) => c.numberOfTrades > 0)
					.sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime())[0];

				return {
					anonymousId: account.anonymousId,
					registeredAt: account.registeredAt,
					isActive: account.isActive,
					totalVolume,
					totalTrades,
					averageSpread,
					lastTradeDate: lastCommission?.periodEnd
				};
			})
		);

		return json({
			success: true,
			accounts: accountViews,
			total: accountViews.length,
			active: accountViews.filter((a) => a.isActive).length,
			inactive: accountViews.filter((a) => !a.isActive).length
		});
	} catch (error) {
		console.error('[IB Accounts API] Error:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch accounts'
			},
			{ status: 500 }
		);
	}
};
