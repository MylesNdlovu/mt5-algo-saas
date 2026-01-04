import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const data = await request.json();
		
		const { email, password, companyName, contactName, phone, currentTraders, message } = data;
		
		// Validation
		if (!email || !password || !companyName || !contactName || !phone) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}
		
		if (password.length < 8) {
			return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
		}
		
		// Check if email already exists
		const existing = await prisma.iBPartner.findUnique({
			where: { email }
		});
		
		if (existing) {
			return json({ error: 'Email already registered' }, { status: 400 });
		}
		
		// Generate unique IB code
		const ibCode = `IB${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
		
		// Hash password
		const passwordHash = await bcrypt.hash(password, 10);
		
		// Create IB partner
		const ibPartner = await prisma.iBPartner.create({
			data: {
				email,
				passwordHash,
				companyName,
				contactName,
				phone,
				ibCode,
				currentTraders,
				message,
				isActive: false,
				isApproved: false
			}
		});
		
		return json({
			success: true,
			message: 'Application submitted successfully. Awaiting approval.',
			ibCode: ibPartner.ibCode
		});
		
	} catch (error) {
		console.error('IB registration error:', error);
		return json({ error: 'Registration failed' }, { status: 500 });
	}
};
