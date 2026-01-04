import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	// Check for user session cookie (mock auth)
	const sessionCookie = event.cookies.get('user_session');
	
	if (!sessionCookie) {
		throw redirect(303, '/login');
	}

	try {
		const user = JSON.parse(sessionCookie);
		
		// Check if user has admin role
		if (user.role !== 'admin') {
			throw redirect(303, '/dashboard');
		}
		
		return {
			user
		};
	} catch (error) {
		throw redirect(303, '/login');
	}
};
