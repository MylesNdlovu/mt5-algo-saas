// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { UserRole } from '@prisma/client';

/**
 * SessionUser - The unified session payload for multi-tenant authentication.
 * This interface is used across the entire application for session management.
 */
interface SessionUser {
	userId: string;              // User.id or IBPartner.id
	email: string;
	role: UserRole | 'IB';       // ADMIN, USER, TRADER, IB, SUPER_ADMIN
	ibPartnerId: string | null;  // For users under IB, null for admins/IB partners themselves
	name?: string;               // Display name
}

/**
 * WhiteLabel - IB Partner branding configuration detected from custom domain.
 * Automatically populated in hooks.server.ts when accessing via custom domain.
 */
interface WhiteLabel {
	partnerId: string;           // IBPartner.id
	brandName: string;           // Display name for the brand
	brandColor: string;          // Primary brand color (hex)
	logo: string | null;         // Logo URL/path
	favicon: string | null;      // Favicon URL/path
	ibCode: string;              // IB referral code for automatic attribution
}

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/**
			 * The authenticated user session.
			 * Populated by hooks.server.ts from the 'session' cookie.
			 * Use this instead of manually checking cookies in routes.
			 */
			user?: SessionUser;

			/**
			 * White-label branding configuration.
			 * Automatically detected from custom domain in hooks.server.ts.
			 * Available in all pages via $page.data.whiteLabel
			 */
			whiteLabel?: WhiteLabel;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export { SessionUser, WhiteLabel };
