import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { initializeDemoData } from '$lib/server/seedData';

// POST /api/admin/seed - Initialize demo data (admin only)
export const POST: RequestHandler = async ({ cookies }) => {
	try {
		const sessionCookie = cookies.get('user_session');
		if (!sessionCookie) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const session = JSON.parse(sessionCookie);
		const isAdmin = session.role === 'ADMIN';

		if (!isAdmin) {
			return json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
		}

		const result = await initializeDemoData();

		return json(result);

	} catch (error) {
		console.error('Seed data error:', error);
		return json({ 
			error: 'Failed to seed data',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
