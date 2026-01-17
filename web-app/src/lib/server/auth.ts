import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '$env/static/private';
import { PrismaClient, UserRole } from '@prisma/client';
import type { RequestEvent, Cookies } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

const prisma = new PrismaClient();

// ============================================================================
// Session Types - Unified session structure for multi-tenant support
// ============================================================================

/**
 * SessionUser - The unified session payload stored in JWT token.
 * This is the core data structure for authentication across all user types.
 */
export interface SessionUser {
	userId: string;           // User.id or IBPartner.id
	email: string;
	role: UserRole | 'IB';    // ADMIN, USER, TRADER, IB, SUPER_ADMIN
	ibPartnerId: string | null;  // For users under IB, or null if direct/IB themselves/admin
	name?: string;            // Display name (firstName lastName or companyName)
}

/**
 * TokenPayload - Alias for SessionUser for backward compatibility
 * @deprecated Use SessionUser instead
 */
export interface TokenPayload extends SessionUser {}

/**
 * AuthUser - Extended user info from database (for requireAuth)
 */
export interface AuthUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: UserRole;
	ibPartnerId?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

// ============================================================================
// Token Generation & Verification
// ============================================================================

/**
 * Generate a JWT token with the unified session payload
 */
export function generateToken(payload: SessionUser): string {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify and decode a JWT token
 * @returns SessionUser payload or null if invalid/expired
 */
export function verifyToken(token: string): SessionUser | null {
	try {
		return jwt.verify(token, JWT_SECRET) as SessionUser;
	} catch {
		return null;
	}
}

// ============================================================================
// Session Helpers - Unified session management
// ============================================================================

/**
 * Get session user from cookies - THE UNIFIED WAY to check authentication.
 * Use this in all routes instead of manually checking cookies.
 *
 * Supports backward compatibility by checking multiple cookie names,
 * but always writes to 'session' cookie.
 *
 * @returns SessionUser or null if not authenticated
 */
export function getSessionUser(cookies: Cookies): SessionUser | null {
	// Primary: Check 'session' cookie (JWT-based, new format)
	const sessionToken = cookies.get('session');
	if (sessionToken) {
		const payload = verifyToken(sessionToken);
		if (payload) {
			return payload;
		}
	}

	// Backward compatibility: Check 'user_session' cookie (JSON-based, old format)
	const userSession = cookies.get('user_session');
	if (userSession) {
		try {
			const parsed = JSON.parse(userSession);
			// Convert old format to SessionUser
			const session: SessionUser = {
				userId: String(parsed.id || parsed.userId),
				email: parsed.email,
				role: mapOldRoleToUserRole(parsed.role),
				ibPartnerId: parsed.ibPartnerId || null,
				name: parsed.name
			};
			return session;
		} catch {
			// Invalid JSON, ignore
		}
	}

	// Backward compatibility: Check 'ib_session' cookie (JSON-based, IB format)
	const ibSession = cookies.get('ib_session');
	if (ibSession) {
		try {
			const parsed = JSON.parse(ibSession);
			const session: SessionUser = {
				userId: parsed.userId,
				email: parsed.email,
				role: 'IB',
				ibPartnerId: null, // IB partners don't belong to an IB
				name: parsed.companyName
			};
			return session;
		} catch {
			// Invalid JSON, ignore
		}
	}

	// Backward compatibility: Check 'auth_token' cookie (JWT-based, old hooks format)
	const authToken = cookies.get('auth_token');
	if (authToken) {
		const payload = verifyToken(authToken);
		if (payload) {
			return payload;
		}
	}

	return null;
}

/**
 * Map old role strings to UserRole enum
 */
function mapOldRoleToUserRole(role: string): UserRole | 'IB' {
	const roleMap: Record<string, UserRole | 'IB'> = {
		'admin': UserRole.ADMIN,
		'ADMIN': UserRole.ADMIN,
		'user': UserRole.TRADER, // Legacy USER role maps to TRADER
		'USER': UserRole.TRADER,
		'trader': UserRole.TRADER,
		'TRADER': UserRole.TRADER,
		'vip': UserRole.TRADER, // VIP maps to TRADER
		'VIP': UserRole.TRADER,
		'ib': 'IB',
		'IB': 'IB',
		'super_admin': UserRole.SUPER_ADMIN,
		'SUPER_ADMIN': UserRole.SUPER_ADMIN
	};
	return roleMap[role] || UserRole.TRADER; // Default to TRADER for unknown roles
}

/**
 * Check if user has admin privileges (ADMIN or SUPER_ADMIN)
 */
export function isAdmin(session: SessionUser | null): boolean {
	if (!session) return false;
	return session.role === UserRole.ADMIN || session.role === UserRole.SUPER_ADMIN;
}

/**
 * Check if user is an IB Partner
 */
export function isIBPartner(session: SessionUser | null): boolean {
	if (!session) return false;
	return session.role === 'IB';
}

// ============================================================================
// Session-based Authentication with Prisma
// ============================================================================

/**
 * Require authentication - returns AuthUser from database or null
 * Also updates lastActiveAt timestamp
 */
export async function requireAuth(event: RequestEvent): Promise<AuthUser | null> {
	const sessionUser = getSessionUser(event.cookies);
	if (!sessionUser) {
		return null;
	}

	try {
		// For IB Partners, don't try to fetch from User table
		if (sessionUser.role === 'IB') {
			// Return a minimal AuthUser-compatible object for IB
			return {
				id: sessionUser.userId,
				email: sessionUser.email,
				firstName: sessionUser.name || 'IB',
				lastName: 'Partner',
				role: UserRole.TRADER, // IB role doesn't exist in UserRole enum for AuthUser
				ibPartnerId: null
			};
		}

		// Fetch user from database and update lastActiveAt
		const user = await prisma.user.update({
			where: { id: sessionUser.userId },
			data: { lastActiveAt: new Date() },
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				role: true,
				ibPartnerId: true
			}
		});

		return user;
	} catch (error) {
		console.error('Auth error:', error);
		return null;
	}
}

// NEW: Admin-only middleware
export async function requireAdmin(event: RequestEvent): Promise<AuthUser> {
	const user = await requireAuth(event);
	
	if (!user) {
		throw redirect(303, '/login');
	}

	if (user.role !== UserRole.ADMIN) {
		throw redirect(303, '/dashboard');
	}

	return user;
}

// ============================================================================
// Session Cookie Management
// ============================================================================

/**
 * Set the unified session cookie
 * Use this for all login operations (user, IB, admin)
 */
export function setSession(cookies: Cookies, sessionData: SessionUser): void {
	const token = generateToken(sessionData);

	cookies.set('session', token, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});

	// Clear old cookies for clean migration
	clearLegacyCookies(cookies);
}

/**
 * Clear the session cookie (logout)
 * Also clears legacy cookies for complete logout
 */
export function clearSession(cookies: Cookies): void {
	cookies.delete('session', { path: '/' });
	clearLegacyCookies(cookies);
}

/**
 * Clear legacy cookies (for migration and clean logout)
 */
function clearLegacyCookies(cookies: Cookies): void {
	// Clear old cookie formats
	try {
		cookies.delete('user_session', { path: '/' });
	} catch { /* ignore */ }
	try {
		cookies.delete('ib_session', { path: '/' });
	} catch { /* ignore */ }
	try {
		cookies.delete('auth_token', { path: '/' });
	} catch { /* ignore */ }
}

/**
 * Create session data for a regular user
 */
export function createUserSession(user: {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: UserRole;
	ibPartnerId?: string | null;
}): SessionUser {
	return {
		userId: user.id,
		email: user.email,
		role: user.role,
		ibPartnerId: user.ibPartnerId || null,
		name: `${user.firstName} ${user.lastName}`
	};
}

/**
 * Create session data for an IB Partner
 */
export function createIBSession(ibPartner: {
	id: string;
	email: string;
	companyName: string;
}): SessionUser {
	return {
		userId: ibPartner.id,
		email: ibPartner.email,
		role: 'IB',
		ibPartnerId: null, // IB partners don't belong to an IB, they ARE the IB
		name: ibPartner.companyName
	};
}
