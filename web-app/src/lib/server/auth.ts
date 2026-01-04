import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { JWT_SECRET } from '$env/static/private';
import { PrismaClient, UserRole } from '@prisma/client';
import type { RequestEvent, Cookies } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

const prisma = new PrismaClient();

export interface TokenPayload {
	userId: string;
	email: string;
	role: string;
}

export interface AuthUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: UserRole;
}

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

export function generateToken(payload: TokenPayload): string {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
	try {
		return jwt.verify(token, JWT_SECRET) as TokenPayload;
	} catch {
		return null;
	}
}

// NEW: Session-based authentication with Prisma
export async function requireAuth(event: RequestEvent): Promise<AuthUser | null> {
	const session = event.cookies.get('session');
	if (!session) {
		return null;
	}

	try {
		const payload = verifyToken(session);
		if (!payload) {
			return null;
		}

		// Fetch user from database and update lastActiveAt
		const user = await prisma.user.update({
			where: { id: payload.userId },
			data: { lastActiveAt: new Date() },
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				role: true
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

// NEW: Set session cookie
export function setSession(cookies: Cookies, user: { id: string; email: string; role: string }): void {
	const token = generateToken({
		userId: user.id,
		email: user.email,
		role: user.role
	});

	cookies.set('session', token, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});
}

// NEW: Clear session cookie (logout)
export function clearSession(cookies: Cookies): void {
	cookies.delete('session', { path: '/' });
}
