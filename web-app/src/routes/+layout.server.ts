import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Pass user session to all pages
	return {
		user: locals.user || null
	};
};
