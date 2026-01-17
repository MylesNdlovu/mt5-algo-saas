import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { verifyPassword, setSession, createUserSession } from '$lib/server/auth';

const prisma = new PrismaClient();

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password } = await request.json();

		console.log('[Auth] Login attempt:', { email });

		// Validate input
		if (!email || !password) {
			return json({ success: false, error: 'Email and password are required' }, { status: 400 });
		}

		// Try to find user in User table first
		const user = await prisma.user.findUnique({
			where: { email: email.toLowerCase() },
			include: {
				ibPartner: {
					select: {
						id: true,
						companyName: true
					}
				},
				mt5Account: {
					select: {
						id: true,
						broker: true,
						serverName: true
					}
				}
			}
		});

		if (user) {
			// User found in User table
			if (!user.isActive) {
				console.log('[Auth] User account inactive:', email);
				return json({ success: false, error: 'Account is inactive' }, { status: 401 });
			}

			// Verify password
			const isValidPassword = await verifyPassword(password, user.passwordHash);
			if (!isValidPassword) {
				console.log('[Auth] Invalid password for:', email);
				return json({ success: false, error: 'Invalid credentials' }, { status: 401 });
			}

			// Create unified session
			const sessionData = createUserSession({
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role,
				ibPartnerId: user.ibPartnerId
			});

			// Set the unified session cookie
			setSession(cookies, sessionData);

			// Update last login timestamp
			await prisma.user.update({
				where: { id: user.id },
				data: { lastLoginAt: new Date() }
			});

			console.log('[Auth] User login successful:', {
				userId: user.id,
				role: user.role,
				ibPartnerId: user.ibPartnerId
			});

			return json({
				success: true,
				user: {
					id: user.id,
					email: user.email,
					name: `${user.firstName} ${user.lastName}`,
					role: user.role,
					ibPartnerId: user.ibPartnerId,
					hasMt5Connected: !!user.mt5Account
				}
			});
		}

		// Try to find in IBPartner table
		const ibPartner = await prisma.iBPartner.findUnique({
			where: { email: email.toLowerCase() }
		});

		if (ibPartner) {
			// IB Partner found
			if (!ibPartner.isApproved) {
				console.log('[Auth] IB account pending approval:', email);
				return json({ success: false, error: 'Your account is pending approval' }, { status: 403 });
			}

			if (!ibPartner.isActive) {
				console.log('[Auth] IB account deactivated:', email);
				return json({ success: false, error: 'Your account has been deactivated' }, { status: 403 });
			}

			// Verify password
			const isValidPassword = await verifyPassword(password, ibPartner.passwordHash);
			if (!isValidPassword) {
				console.log('[Auth] Invalid password for IB:', email);
				return json({ success: false, error: 'Invalid credentials' }, { status: 401 });
			}

			// Create IB session with role 'IB'
			const sessionData = {
				userId: ibPartner.id,
				email: ibPartner.email,
				role: 'IB' as const,
				ibPartnerId: ibPartner.id, // IB partner IS the IB
				name: ibPartner.companyName
			};

			// Set the unified session cookie
			setSession(cookies, sessionData);

			console.log('[Auth] IB Partner login successful:', {
				ibPartnerId: ibPartner.id,
				companyName: ibPartner.companyName
			});

			return json({
				success: true,
				user: {
					id: ibPartner.id,
					email: ibPartner.email,
					name: ibPartner.companyName,
					role: 'IB',
					ibPartnerId: ibPartner.id
				}
			});
		}

		// Neither found
		console.log('[Auth] Account not found:', email);
		return json({ success: false, error: 'Invalid credentials' }, { status: 401 });

	} catch (error) {
		console.error('[Auth] Login error:', error);
		return json({ success: false, error: 'Login failed' }, { status: 500 });
	}
};
// Force redeploy Sat Jan 17 14:32:00 SAST 2026 - Prisma client regeneration
