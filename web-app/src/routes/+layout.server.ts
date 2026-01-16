import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Pass user session and white-label branding to all pages
	return {
		user: locals.user || null,
		whiteLabel: locals.whiteLabel || null
	};
};
