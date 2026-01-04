import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || locals.user.role !== 'ADMIN') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { isActive } = await request.json();

		await db.user.update({
			where: { id: params.userId },
			data: { isActive }
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error updating user status:', error);
		return json({ error: 'Failed to update user' }, { status: 500 });
	}
};
