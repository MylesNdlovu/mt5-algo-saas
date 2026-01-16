import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSessionUser, isAdmin } from '$lib/server/auth';

const prisma = new PrismaClient();

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		const sessionUser = getSessionUser(cookies);

		if (!sessionUser || !isAdmin(sessionUser)) {
			return json({ success: false, error: 'Admin access required' }, { status: 403 });
		}

		// Get all IB partners
		const ibPartners = await prisma.iBPartner.findMany({
			orderBy: { createdAt: 'desc' }
		});

		// Calculate performance metrics for each IB partner from commission data
		const partnersWithStats = await Promise.all(
			ibPartners.map(async (partner) => {
				// Get anonymous accounts for this IB
				const anonymousAccounts = await prisma.anonymousAccount.findMany({
					where: { ibPartnerId: partner.id }
				});

				const totalTraders = anonymousAccounts.length;
				const activeTraders = anonymousAccounts.filter((a) => a.isActive).length;

				// Get commission data
				const commissions = await prisma.iBCommission.findMany({
					where: { ibPartnerId: partner.id }
				});

				// Calculate totals from commissions
				const totalVolume = commissions.reduce((sum, c) => sum + c.tradingVolume, 0);
				const totalTrades = commissions.reduce((sum, c) => sum + c.numberOfTrades, 0);
				const lifetimeCommission = commissions.reduce((sum, c) => sum + c.netCommission, 0);

				// Get current month commission
				const now = new Date();
				const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
				const currentMonthCommissions = commissions.filter(
					(c) => c.period >= currentMonthStart
				);
				const monthlyRevenue = currentMonthCommissions.reduce(
					(sum, c) => sum + c.netCommission,
					0
				);

				// Calculate conversion rate (active vs total)
				const conversionRate =
					totalTraders > 0 ? (activeTraders / totalTraders) * 100 : 0;

				return {
					id: partner.id,
					companyName: partner.companyName,
					contactName: partner.contactName,
					email: partner.email,
					phone: partner.phone,
					ibCode: partner.ibCode,
					isActive: partner.isActive,
					isApproved: partner.isApproved,
					domain: partner.domain,
					logo: partner.logo,
					brandName: partner.brandName,
					brandColor: partner.brandColor,
					createdAt: partner.createdAt,
					approvedAt: partner.approvedAt,
					stats: {
						totalTraders,
						activeTraders,
						totalVolume: parseFloat(totalVolume.toFixed(2)),
						totalTrades,
						lifetimeCommission: parseFloat(lifetimeCommission.toFixed(2)),
						monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
						conversionRate: parseFloat(conversionRate.toFixed(1))
					}
				};
			})
		);

		// Calculate overall IB statistics
		const overallStats = {
			totalIBPartners: ibPartners.length,
			activeIBPartners: ibPartners.filter((p) => p.isActive).length,
			pendingIBPartners: ibPartners.filter((p) => !p.isApproved).length,
			totalTradersReferred: partnersWithStats.reduce(
				(sum, p) => sum + p.stats.totalTraders,
				0
			),
			totalActiveTradersReferred: partnersWithStats.reduce(
				(sum, p) => sum + p.stats.activeTraders,
				0
			),
			totalCommissionsPaid: parseFloat(
				partnersWithStats
					.reduce((sum, p) => sum + p.stats.lifetimeCommission, 0)
					.toFixed(2)
			),
			totalVolumeGenerated: parseFloat(
				partnersWithStats.reduce((sum, p) => sum + p.stats.totalVolume, 0).toFixed(2)
			),
			totalMonthlyRevenue: parseFloat(
				partnersWithStats.reduce((sum, p) => sum + p.stats.monthlyRevenue, 0).toFixed(2)
			)
		};

		return json({
			success: true,
			partners: partnersWithStats,
			overallStats
		});
	} catch (error) {
		console.error('Admin IB partners error:', error);
		return json({ success: false, error: 'Failed to load IB partners data' }, { status: 500 });
	}
};
