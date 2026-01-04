import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password } = await request.json();
		
		if (!email || !password) {
			return json({ error: 'Email and password required' }, { status: 400 });
		}
		
		// Find IB partner
		const ibPartner = await prisma.iBPartner.findUnique({
			where: { email }
		});
		
		if (!ibPartner) {
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}
		
		// Check if approved and active
		if (!ibPartner.isApproved) {
			return json({ error: 'Your account is pending approval' }, { status: 403 });
		}
		
		if (!ibPartner.isActive) {
			return json({ error: 'Your account has been deactivated' }, { status: 403 });
		}
		
		// Verify password
		const validPassword = await bcrypt.compare(password, ibPartner.passwordHash);
		
		if (!validPassword) {
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}
		
		// Create session
		const session = {
			userId: ibPartner.id,
			email: ibPartner.email,
			role: 'IB',
			companyName: ibPartner.companyName,
			ibCode: ibPartner.ibCode
		};
		
		cookies.set('ib_session', JSON.stringify(session), {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 30 // 30 days
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
		console.error('IB login error:', error);
		return json({ error: 'Login failed' }, { status: 500 });
	}
};
