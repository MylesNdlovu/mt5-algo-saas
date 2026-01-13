import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getSessionUser, isAdmin } from '$lib/server/auth';
import { UserRole } from '@prisma/client';

export const load: LayoutServerLoad = async (event) => {
	// Get unified session
	const sessionUser = getSessionUser(event.cookies);

	if (!sessionUser) {
		throw redirect(303, '/login');
	}

	// Check if user has admin role (ADMIN or SUPER_ADMIN)
	if (!isAdmin(sessionUser)) {
		throw redirect(303, '/dashboard');
	}

	return {
		user: sessionUser
	};
};
