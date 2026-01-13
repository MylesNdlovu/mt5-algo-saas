import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSessionUser, isIBPartner } from '$lib/server/auth';

const prisma = new PrismaClient();

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		const sessionUser = getSessionUser(cookies);

		if (!sessionUser || !isIBPartner(sessionUser)) {
			return json({ error: 'IB Partner access required' }, { status: 403 });
		}

		// Get IB partner data
		const ibPartner = await prisma.iBPartner.findUnique({
			where: { id: sessionUser.userId }
		});

		if (!ibPartner || !ibPartner.isActive) {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		
		// Get referred users
		const users = await prisma.user.findMany({
			where: { ibPartnerId: ibPartner.id },
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				subscriptionTier: true,
				totalProfit: true,
				totalTrades: true,
				createdAt: true
			},
			orderBy: { createdAt: 'desc' }
		});
		
		// Calculate stats
		const stats = {
			totalUsers: users.length,
			activeUsers: users.filter(u => u.subscriptionTier !== 'FREE').length,
			monthlyRevenue: users.reduce((sum, u) => {
				// Assuming $3.50 spread per trade, 15 trades/day avg, 22 trading days
				const avgTrades = 15 * 22;
				return sum + (avgTrades * 3.50);
			}, 0),
			totalRevenue: users.reduce((sum, u) => sum + Math.max(0, u.totalProfit), 0)
		};
		
		return json({
			success: true,
			ibPartner,
			users,
			stats
		});
		
	} catch (error) {
		console.error('IB dashboard error:', error);
		return json({ error: 'Failed to load dashboard' }, { status: 500 });
	}
};
