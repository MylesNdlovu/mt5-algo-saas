import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { setSession, createUserSession } from '$lib/server/auth';

const prisma = new PrismaClient();

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password } = await request.json();

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
				mt5Accounts: {
					select: {
						id: true,
						broker: true,
						serverName: true
					},
					take: 1
				}
			}
		});

		if (user) {
			if (!user.isActive) {
				return json({ success: false, error: 'Account is inactive' }, { status: 401 });
			}

			// Verify password
			const isValidPassword = await bcrypt.compare(password, user.passwordHash);
			if (!isValidPassword) {
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

			return json({
				success: true,
				user: {
					id: user.id,
					email: user.email,
					name: `${user.firstName} ${user.lastName}`,
					role: user.role,
					ibPartnerId: user.ibPartnerId,
					hasMt5Connected: user.mt5Accounts && user.mt5Accounts.length > 0
				}
			});
		}

		// Try to find in IBPartner table
		const ibPartner = await prisma.iBPartner.findUnique({
			where: { email: email.toLowerCase() }
		});

		if (ibPartner) {
			if (!ibPartner.isApproved) {
				return json({ success: false, error: 'Your account is pending approval' }, { status: 403 });
			}

			if (!ibPartner.isActive) {
				return json({ success: false, error: 'Your account has been deactivated' }, { status: 403 });
			}

			// Verify password
			const isValidIBPassword = await bcrypt.compare(password, ibPartner.passwordHash);
			if (!isValidIBPassword) {
				return json({ success: false, error: 'Invalid credentials' }, { status: 401 });
			}

			// Create IB session with role 'IB'
			const sessionData = {
				userId: ibPartner.id,
				email: ibPartner.email,
				role: 'IB' as const,
				ibPartnerId: ibPartner.id,
				name: ibPartner.companyName
			};

			// Set the unified session cookie
			setSession(cookies, sessionData);

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
		return json({ success: false, error: 'Invalid credentials' }, { status: 401 });

	} catch (error) {
		console.error('[Auth] Login error:', error);
		return json({ success: false, error: 'Login failed' }, { status: 500 });
	}
};
