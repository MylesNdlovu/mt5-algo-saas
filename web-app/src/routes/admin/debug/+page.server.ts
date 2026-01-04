import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionCookie = cookies.get('user_session');
	
	return {
		hasCookie: !!sessionCookie,
		cookieValue: sessionCookie || 'No cookie found',
		parsedUser: sessionCookie ? JSON.parse(sessionCookie) : null
	};
};
