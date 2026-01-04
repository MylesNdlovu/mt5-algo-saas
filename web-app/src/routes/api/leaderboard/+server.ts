import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
	getLeaderboard, 
	getUserLeaderboardPosition, 
	calculateRankings,
	syncUserStatsToLeaderboard,
	getActiveTraders
} from '$lib/server/userStorage';

// GET /api/leaderboard?period=daily&limit=100
export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		// Get session
		const sessionCookie = cookies.get('user_session');
		if (!sessionCookie) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const session = JSON.parse(sessionCookie);
		const userId = session.id;
		const isAdmin = session.role === 'ADMIN';

		// Get query params
		const period = (url.searchParams.get('period') || 'daily') as 'daily' | 'weekly' | 'monthly';
		const limit = parseInt(url.searchParams.get('limit') || '100');
		const sync = url.searchParams.get('sync') === 'true';

		// Validate period
		if (!['daily', 'weekly', 'monthly'].includes(period)) {
			return json({ error: 'Invalid period. Must be daily, weekly, or monthly' }, { status: 400 });
		}

		// Sync stats if requested (admin only)
		if (sync && isAdmin) {
			syncUserStatsToLeaderboard();
			calculateRankings(period);
		}

		// Get leaderboard
		const leaderboard = getLeaderboard(period, limit);

		// Get user's position if user is authenticated
		const userPosition = userId ? getUserLeaderboardPosition(userId, period) : null;

		return json({
			success: true,
			data: {
				period,
				entries: leaderboard,
				userPosition,
				totalEntries: leaderboard.length,
				lastUpdated: new Date().toISOString()
			}
		});

	} catch (error) {
		console.error('Leaderboard fetch error:', error);
		return json({ 
			error: 'Failed to fetch leaderboard',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};

// POST /api/leaderboard/sync - Force sync (admin only)
export const POST: RequestHandler = async ({ cookies }) => {
	try {
		// Get session
		const sessionCookie = cookies.get('user_session');
		if (!sessionCookie) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const session = JSON.parse(sessionCookie);
		const isAdmin = session.role === 'ADMIN';

		// Admin check
		if (!isAdmin) {
			return json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
		}

		// Sync all stats
		syncUserStatsToLeaderboard();
		
		// Calculate rankings for all periods
		const dailyLeaderboard = calculateRankings('daily');
		const weeklyLeaderboard = calculateRankings('weekly');
		const monthlyLeaderboard = calculateRankings('monthly');

		return json({
			success: true,
			message: '✅ Leaderboard synced successfully',
			data: {
				daily: dailyLeaderboard.length,
				weekly: weeklyLeaderboard.length,
				monthly: monthlyLeaderboard.length,
				totalUsers: getActiveTraders().length,
				syncedAt: new Date().toISOString()
			}
		});

	} catch (error) {
		console.error('Leaderboard sync error:', error);
		return json({ 
			error: 'Failed to sync leaderboard',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
