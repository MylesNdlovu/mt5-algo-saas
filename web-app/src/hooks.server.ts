import type { Handle } from '@sveltejs/kit';
import { verifyToken } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('auth_token');

	if (token) {
		const payload = verifyToken(token);
		if (payload) {
			event.locals.user = payload;
		}
	}

	return resolve(event);
};
