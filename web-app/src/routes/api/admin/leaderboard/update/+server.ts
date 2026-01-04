import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateLeaderboardEntry } from '$lib/server/userStorage';

export const POST: RequestHandler = async ({ request, cookies }) => {
	// Check authentication
	const userSession = cookies.get('user_session');
	if (!userSession) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const sessionData = JSON.parse(decodeURIComponent(userSession));
		
		// Check if user is admin
		if (sessionData.role !== 'ADMIN') {
			return json({ error: 'Forbidden - Admin access required' }, { status: 403 });
		}

		const data = await request.json();
		const { userId, period, totalProfit, totalTrades, winRate, winningTrades, losingTrades } = data;

		if (!userId || !period) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Update the leaderboard entry
		await updateLeaderboardEntry(userId, period, {
			totalProfit: parseFloat(totalProfit),
			totalTrades: parseInt(totalTrades, 10),
			winningTrades: parseInt(winningTrades, 10),
			losingTrades: parseInt(losingTrades, 10),
			winRate: parseFloat(winRate)
		});

		return json({ 
			success: true,
			message: 'Leaderboard entry updated successfully'
		});
	} catch (error) {
		console.error('Error updating leaderboard:', error);
		return json({ error: 'Failed to update leaderboard entry' }, { status: 500 });
	}
};
