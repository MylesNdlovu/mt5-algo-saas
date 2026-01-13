import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		// Get user from session
		const sessionUser = getSessionUser(cookies);

		if (!sessionUser) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		// Return mock account list (TODO: Replace with real Prisma query)
		return json([
			{
				id: sessionUser.userId,
				userId: sessionUser.userId,
				accountNumber: sessionUser.userId === '1' ? '50012345' : '50067890',
				broker: 'Exness',
				isActive: true,
				isPrimary: true
			}
		]);
	} catch (error) {
		console.error('Error fetching accounts:', error);
		return json({ error: 'Failed to fetch accounts' }, { status: 500 });
	}
};
