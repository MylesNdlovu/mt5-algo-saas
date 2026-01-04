import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient, UserRole } from '@prisma/client';
import { requireAdmin } from '$lib/server/auth';

const prisma = new PrismaClient();

// GET - List all users with insights and advanced filtering
export const GET: RequestHandler = async (event) => {
	try {
		// Verify admin access
		await requireAdmin(event);

		const { url } = event;
		
		// Get query parameters for filtering and pagination
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const search = url.searchParams.get('search') || '';
		const tier = url.searchParams.get('tier') || '';
		const status = url.searchParams.get('status') || '';
		const sortBy = url.searchParams.get('sortBy') || 'createdAt';
		const sortOrder = url.searchParams.get('sortOrder') || 'desc';

		// Build where clause for filtering
		const where: any = {};
		const andConditions: any[] = [];

		if (search) {
			andConditions.push({
				OR: [
					{ email: { contains: search, mode: 'insensitive' } },
					{ firstName: { contains: search, mode: 'insensitive' } },
					{ lastName: { contains: search, mode: 'insensitive' } }
				]
			});
		}

		if (tier) {
			andConditions.push({ subscriptionTier: tier });
		}

		if (status) {
			andConditions.push({ status });
		}

		if (andConditions.length > 0) {
			where.AND = andConditions;
		}

		// Fetch users with complete insights
		const [users, total] = await Promise.all([
			prisma.user.findMany({
				where,
				include: {
					insights: true,
					mt5Accounts: {
						select: {
							id: true,
							accountNumber: true,
							broker: true,
							status: true,
							balance: true,
							equity: true,
							leverage: true
						}
					},
					eas: {
						select: {
							id: true,
							name: true,
							status: true,
							safetyIndicator: true,
							totalTrades: true,
							totalProfit: true,
							winRate: true
						}
					},
					_count: {
						select: {
							trades: true,
							notifications: true
						}
					}
				},
				orderBy: {
					[sortBy]: sortOrder
				},
				skip: (page - 1) * limit,
				take: limit
			}),
			prisma.user.count({ where })
		]);

		// Calculate platform-wide statistics
		const stats = await prisma.user.aggregate({
			_count: { id: true },
			_avg: {
				totalProfit: true,
				totalTrades: true,
				monthlyFee: true
			},
			_sum: {
				totalProfit: true,
				totalTrades: true,
				monthlyFee: true
			}
		});

		// Get subscription tier distribution
		const tierDistribution = await prisma.user.groupBy({
			by: ['subscriptionTier'],
			_count: true
		});

		// Get recent signups (last 30 days)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		
		const recentSignups = await prisma.user.count({
			where: {
				createdAt: {
					gte: thirtyDaysAgo
				}
			}
		});

		// Get high churn risk users
		const highChurnRiskUsers = await prisma.userInsight.count({
			where: {
				churnRisk: {
					gte: 0.7
				}
			}
		});

		return json({
			users: users.map(user => ({
				...user,
				passwordHash: undefined, // Never expose password hash
				insights: user.insights || {
					winRate: 0,
					profitFactor: 0,
					churnRisk: 0,
					engagementScore: 0,
					retentionProbability: 0,
					upsellProbability: 0
				}
			})),
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			},
			stats: {
				totalUsers: stats._count.id,
				avgProfit: stats._avg.totalProfit || 0,
				avgTrades: stats._avg.totalTrades || 0,
				avgMonthlyFee: stats._avg.monthlyFee || 0,
				totalRevenue: stats._sum.monthlyFee || 0,
				totalProfit: stats._sum.totalProfit || 0,
				totalTrades: stats._sum.totalTrades || 0,
				highChurnRiskUsers
			},
			tierDistribution,
			recentSignups
		});
	} catch (error) {
		console.error('Error fetching users:', error);
		return json({ error: 'Failed to fetch users' }, { status: 500 });
	}
};

// PATCH - Update user (subscription, role, status)
export const PATCH: RequestHandler = async (event) => {
	try {
		await requireAdmin(event);

		const { userId, updates } = await event.request.json();

		if (!userId) {
			return json({ error: 'User ID required' }, { status: 400 });
		}

		// Validate allowed updates
		const allowedUpdates = [
			'role',
			'subscriptionTier',
			'subscriptionStart',
			'subscriptionEnd',
			'monthlyFee',
			'status',
			'isActive'
		];

		const filteredUpdates: any = {};
		for (const key of allowedUpdates) {
			if (key in updates) {
				filteredUpdates[key] = updates[key];
			}
		}

		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: {
				...filteredUpdates,
				updatedAt: new Date()
			},
			include: {
				insights: true,
				mt5Accounts: true,
				eas: true
			}
		});

		return json({
			success: true,
			user: {
				...updatedUser,
				passwordHash: undefined
			}
		});
	} catch (error) {
		console.error('Error updating user:', error);
		return json({ error: 'Failed to update user' }, { status: 500 });
	}
};
