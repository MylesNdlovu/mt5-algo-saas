import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSessionUser, isAdmin } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionUser = getSessionUser(cookies);

	// Redirect if not logged in or not an admin
	if (!sessionUser) {
		throw redirect(302, '/login');
	}

	if (!isAdmin(sessionUser)) {
		throw redirect(302, '/dashboard');
	}

	// Return user info - actual data will be fetched client-side from API
	return {
		user: sessionUser
	};
};
