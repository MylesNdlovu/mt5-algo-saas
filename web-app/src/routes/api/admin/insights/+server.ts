import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth';
import { 
	calculateUserInsights, 
	calculateAllUserInsights,
	getHighChurnRiskUsers,
	getUpsellReadyUsers
} from '$lib/server/insights';

// POST - Calculate insights for a specific user or all users
export const POST: RequestHandler = async (event) => {
	try {
		await requireAdmin(event);

		const { userId, action } = await event.request.json();

		if (action === 'calculate_all') {
			const results = await calculateAllUserInsights();
			return json({
				success: true,
				message: 'Calculated insights for all users',
				results
			});
		}

		if (!userId) {
			return json({ error: 'User ID required' }, { status: 400 });
		}

		const insights = await calculateUserInsights(userId);
		return json({
			success: true,
			insights
		});
	} catch (error) {
		console.error('Error calculating insights:', error);
		return json({ error: 'Failed to calculate insights' }, { status: 500 });
	}
};

// GET - Get special user segments
export const GET: RequestHandler = async (event) => {
	try {
		await requireAdmin(event);

		const { url } = event;
		const segment = url.searchParams.get('segment');

		if (segment === 'high_churn_risk') {
			const threshold = parseFloat(url.searchParams.get('threshold') || '0.7');
			const users = await getHighChurnRiskUsers(threshold);
			return json({ users });
		}

		if (segment === 'upsell_ready') {
			const threshold = parseFloat(url.searchParams.get('threshold') || '0.6');
			const users = await getUpsellReadyUsers(threshold);
			return json({ users });
		}

		return json({ error: 'Invalid segment' }, { status: 400 });
	} catch (error) {
		console.error('Error fetching user segment:', error);
		return json({ error: 'Failed to fetch user segment' }, { status: 500 });
	}
};
