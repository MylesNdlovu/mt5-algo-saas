import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { setSession, createIBSession } from '$lib/server/auth';

const prisma = new PrismaClient();

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password } = await request.json();

		console.log('[IB Auth] Login attempt:', { email });

		if (!email || !password) {
			return json({ error: 'Email and password required' }, { status: 400 });
		}

		// Find IB partner
		const ibPartner = await prisma.iBPartner.findUnique({
			where: { email: email.toLowerCase() }
		});

		if (!ibPartner) {
			console.log('[IB Auth] IB Partner not found:', email);
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		// Check if approved and active
		if (!ibPartner.isApproved) {
			console.log('[IB Auth] Account pending approval:', email);
			return json({ error: 'Your account is pending approval' }, { status: 403 });
		}

		if (!ibPartner.isActive) {
			console.log('[IB Auth] Account deactivated:', email);
			return json({ error: 'Your account has been deactivated' }, { status: 403 });
		}

		// Verify password
		const validPassword = await bcrypt.compare(password, ibPartner.passwordHash);

		if (!validPassword) {
			console.log('[IB Auth] Invalid password for:', email);
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		// Create unified session for IB Partner
		// Note: ibPartnerId is null because they ARE the IB, not under one
		const sessionData = createIBSession({
			id: ibPartner.id,
			email: ibPartner.email,
			companyName: ibPartner.companyName
		});

		// Set the unified session cookie (clears old ib_session automatically)
		setSession(cookies, sessionData);

		console.log('[IB Auth] Login successful:', {
			ibPartnerId: ibPartner.id,
			companyName: ibPartner.companyName
		});

		return json({
			success: true,
			ibPartner: {
				id: ibPartner.id,
				email: ibPartner.email,
				companyName: ibPartner.companyName,
				ibCode: ibPartner.ibCode
			}
		});

	} catch (error) {
		console.error('[IB Auth] Login error:', error);
		return json({ error: 'Login failed' }, { status: 500 });
	}
};
