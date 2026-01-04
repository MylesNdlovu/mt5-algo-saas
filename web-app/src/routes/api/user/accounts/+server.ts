import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		// Get user from session
		const userSession = cookies.get('user_session');
		
		if (!userSession) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		const user = JSON.parse(userSession);

		// Return mock account list
		return json([
			{
				id: user.id,
				userId: user.id,
				accountNumber: user.id === 1 ? '50012345' : '50067890',
				broker: user.broker,
				isActive: true,
				isPrimary: true
			}
		]);
	} catch (error) {
		console.error('Error fetching accounts:', error);
		return json({ error: 'Failed to fetch accounts' }, { status: 500 });
	}
};
