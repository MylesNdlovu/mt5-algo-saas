import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSessionUser, isAdmin } from '$lib/server/auth';

const prisma = new PrismaClient();

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		const sessionUser = getSessionUser(cookies);

		if (!sessionUser || !isAdmin(sessionUser)) {
			return json({ error: 'Admin access required' }, { status: 403 });
		}

		// Get all IB partners with their referred users
		const ibPartners = await prisma.iBPartner.findMany({
			include: {
				users: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
						subscriptionTier: true,
						totalProfit: true,
						totalTrades: true,
						totalVolume: true,
						createdAt: true
					}
				}
			},
			orderBy: { createdAt: 'desc' }
		});

		// Calculate performance metrics for each IB partner
		const partnersWithStats = ibPartners.map(partner => {
			const users = partner.users;

			// Calculate stats
			const totalTraders = users.length;
			const activeTraders = users.filter(u => u.subscriptionTier !== 'FREE').length;
			const totalVolume = users.reduce((sum, u) => sum + u.totalVolume, 0);
			const totalTrades = users.reduce((sum, u) => sum + u.totalTrades, 0);
			const totalProfit = users.reduce((sum, u) => sum + Math.max(0, u.totalProfit), 0);

			// Commission calculation (example: 10% of profit or $0.50 per trade)
			const commissionFromProfit = totalProfit * 0.10;
			const commissionFromTrades = totalTrades * 0.50;
			const totalCommission = commissionFromProfit + commissionFromTrades;

			// Revenue estimation (monthly subscription * active traders)
			const estimatedMonthlyRevenue = activeTraders * 50; // Assuming $50/month avg

			// Calculate conversion rate (active vs total)
			const conversionRate = totalTraders > 0 ? (activeTraders / totalTraders) * 100 : 0;

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
				stats: {
					totalTraders,
					activeTraders,
					totalVolume: parseFloat(totalVolume.toFixed(2)),
					totalTrades,
					totalProfit: parseFloat(totalProfit.toFixed(2)),
					totalCommission: parseFloat(totalCommission.toFixed(2)),
					estimatedMonthlyRevenue,
					conversionRate: parseFloat(conversionRate.toFixed(1))
				}
			};
		});

		// Calculate overall IB statistics
		const overallStats = {
			totalIBPartners: ibPartners.length,
			activeIBPartners: ibPartners.filter(p => p.isActive).length,
			pendingIBPartners: ibPartners.filter(p => !p.isApproved).length,
			totalTradersReferred: partnersWithStats.reduce((sum, p) => sum + p.stats.totalTraders, 0),
			totalActiveTradersReferred: partnersWithStats.reduce((sum, p) => sum + p.stats.activeTraders, 0),
			totalCommissionsPaid: parseFloat(
				partnersWithStats.reduce((sum, p) => sum + p.stats.totalCommission, 0).toFixed(2)
			),
			totalVolumeGenerated: parseFloat(
				partnersWithStats.reduce((sum, p) => sum + p.stats.totalVolume, 0).toFixed(2)
			),
			estimatedMonthlyRevenue: partnersWithStats.reduce((sum, p) => sum + p.stats.estimatedMonthlyRevenue, 0)
		};

		return json({
			success: true,
			partners: partnersWithStats,
			overallStats
		});
	} catch (error) {
		console.error('Admin IB partners error:', error);
		return json({ error: 'Failed to load IB partners data' }, { status: 500 });
	}
};
