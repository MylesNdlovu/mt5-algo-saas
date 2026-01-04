import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'ADMIN') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const accounts = await db.mT5Account.findMany({
			orderBy: { createdAt: 'desc' },
			include: {
				user: {
					select: {
						email: true,
						firstName: true,
						lastName: true
					}
				}
			}
		});

		return json(accounts);
	} catch (error) {
		console.error('Error fetching accounts:', error);
		return json({ error: 'Failed to fetch accounts' }, { status: 500 });
	}
};
