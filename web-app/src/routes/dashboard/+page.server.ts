import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/login');
	}

	// Role-based dashboard routing hierarchy
	// SUPER_ADMIN & ADMIN -> Admin dashboard (all IB partners, system stats)
	// IB -> IB dashboard (their referred users only)
	// USER/TRADER -> User dashboard (their own trading data)

	if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
		throw redirect(302, '/admin');
	}

	if (user.role === 'IB') {
		throw redirect(302, '/ib-dashboard');
	}

	// USER and TRADER stay on /dashboard - their personal trading view
	return {
		user
	};
};
