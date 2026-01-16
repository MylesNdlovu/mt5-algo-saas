import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSessionUser } from '$lib/server/auth';
import type { IBDashboardStats } from '$lib/types/ib-types';

const prisma = new PrismaClient();

/**
 * GET /api/ib/dashboard
 * IB Dashboard - Shows ANONYMOUS account stats and commission summary
 * CRITICAL: IBs can ONLY see anonymized account IDs, never real MT5 numbers or trader names
 */
export const GET: RequestHandler = async ({ cookies, url }) => {
	const sessionUser = getSessionUser(cookies);

	if (!sessionUser || sessionUser.role !== 'IB') {
		return json({ error: 'Unauthorized - IB access only' }, { status: 403 });
	}

	try {
		// Get current period (default: current month)
		const periodParam = url.searchParams.get('period') || new Date().toISOString();
		const currentPeriodStart = new Date(periodParam);
		currentPeriodStart.setDate(1);
		currentPeriodStart.setHours(0, 0, 0, 0);

		const currentPeriodEnd = new Date(currentPeriodStart);
		currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

		// Get previous period for comparison
		const previousPeriodStart = new Date(currentPeriodStart);
		previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
		const previousPeriodEnd = new Date(currentPeriodStart);

		// Get ANONYMOUS accounts for this IB (NO personal info!)
		const anonymousAccounts = await prisma.anonymousAccount.findMany({
			where: {
				ibPartnerId: sessionUser.userId,
				isActive: true
			}
		});

		// Get current period commissions
		const currentCommissions = await prisma.iBCommission.findMany({
			where: {
				ibPartnerId: sessionUser.userId,
				period: {
					gte: currentPeriodStart,
					lt: currentPeriodEnd
				}
			}
		});

		// Get previous period commissions for growth comparison
		const previousCommissions = await prisma.iBCommission.findMany({
			where: {
				ibPartnerId: sessionUser.userId,
				period: {
					gte: previousPeriodStart,
					lt: previousPeriodEnd
				}
			}
		});

		// Calculate current period summary
		const currentSummary = {
			period: currentPeriodStart,
			periodEnd: currentPeriodEnd,
			totalAccounts: anonymousAccounts.length,
			activeAccounts: anonymousAccounts.filter((a) => a.isActive).length,
			totalVolume: currentCommissions.reduce((sum, c) => sum + c.tradingVolume, 0),
			totalTrades: currentCommissions.reduce((sum, c) => sum + c.numberOfTrades, 0),
			averageSpread:
				currentCommissions.length > 0
					? currentCommissions.reduce((sum, c) => sum + c.averageSpread, 0) /
					  currentCommissions.length
					: 0,
			grossCommission: currentCommissions.reduce((sum, c) => sum + c.grossCommission, 0),
			platformFee: currentCommissions.reduce((sum, c) => sum + c.platformFee, 0),
			netCommission: currentCommissions.reduce((sum, c) => sum + c.netCommission, 0),
			commissionRate: currentCommissions.length > 0 ? currentCommissions[0].commissionRate : 0,
			isPaid: currentCommissions.every((c) => c.isPaid),
			paidAt: currentCommissions.find((c) => c.paidAt)?.paidAt,
			paymentReference: currentCommissions.find((c) => c.paymentReference)?.paymentReference
		};

		// Calculate previous period summary
		const previousSummary = previousCommissions.length
			? {
					period: previousPeriodStart,
					periodEnd: previousPeriodEnd,
					totalAccounts: 0,
					activeAccounts: 0,
					totalVolume: previousCommissions.reduce((sum, c) => sum + c.tradingVolume, 0),
					totalTrades: previousCommissions.reduce((sum, c) => sum + c.numberOfTrades, 0),
					averageSpread:
						previousCommissions.reduce((sum, c) => sum + c.averageSpread, 0) /
						previousCommissions.length,
					grossCommission: previousCommissions.reduce((sum, c) => sum + c.grossCommission, 0),
					platformFee: previousCommissions.reduce((sum, c) => sum + c.platformFee, 0),
					netCommission: previousCommissions.reduce((sum, c) => sum + c.netCommission, 0),
					commissionRate: previousCommissions[0].commissionRate,
					isPaid: previousCommissions.every((c) => c.isPaid)
			  }
			: undefined;

		// Calculate growth percentage
		const growthPercentage =
			previousSummary && previousSummary.netCommission > 0
				? ((currentSummary.netCommission - previousSummary.netCommission) /
						previousSummary.netCommission) *
				  100
				: 0;

		// Get all-time stats
		const allTimeCommissions = await prisma.iBCommission.findMany({
			where: {
				ibPartnerId: sessionUser.userId
			}
		});

		const totalEarned = allTimeCommissions.reduce((sum, c) => sum + c.netCommission, 0);
		const pendingCommissions = allTimeCommissions.filter((c) => !c.isPaid);
		const pendingPayment = pendingCommissions.reduce((sum, c) => sum + c.netCommission, 0);

		const paidCommissions = allTimeCommissions
			.filter((c) => c.isPaid && c.paidAt)
			.sort((a, b) => (b.paidAt!.getTime() || 0) - (a.paidAt!.getTime() || 0));

		const lastPayment = paidCommissions[0];

		const dashboardStats: IBDashboardStats = {
			currentPeriod: currentSummary,
			previousPeriod: previousSummary,
			growthPercentage,
			totalAccounts: anonymousAccounts.length,
			activeAccounts: anonymousAccounts.filter((a) => a.isActive).length,
			inactiveAccounts: anonymousAccounts.filter((a) => !a.isActive).length,
			totalEarned,
			pendingPayment,
			lastPaymentDate: lastPayment?.paidAt,
			lastPaymentAmount: lastPayment?.netCommission
		};

		return json({
			success: true,
			data: dashboardStats
		});
	} catch (error) {
		console.error('[IB Dashboard API] Error:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch dashboard data'
			},
			{ status: 500 }
		);
	}
};
