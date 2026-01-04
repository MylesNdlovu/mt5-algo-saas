import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Mock registration endpoint (no database required)
export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password, name, phone, ibCode } = await request.json();

		// Basic validation
		if (!email || !password || !name) {
			return json({ error: 'All fields are required' }, { status: 400 });
		}

		if (password.length < 8) {
			return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
		}

		// Mock: Check if email already exists (simplified)
		const existingEmails = ['admin@scalperium.com', 'trader@scalperium.com', 'vip@scalperium.com'];
		if (existingEmails.includes(email.toLowerCase())) {
			return json({ error: 'Email already registered' }, { status: 400 });
		}

		// Mock: Validate IB code if provided
		let ibPartnerId = null;
		if (ibCode) {
			// In production, verify IB code exists and is active
			// const ibPartner = await prisma.iBPartner.findUnique({ where: { ibCode } });
			// if (ibPartner && ibPartner.isActive) {
			//   ibPartnerId = ibPartner.id;
			// }
			console.log('IB Code provided:', ibCode);
		}

		// Mock: Create new user with generated ID
		const newUser = {
			id: Math.floor(Math.random() * 10000),
			email: email.toLowerCase(),
			name,
			phone,
			ibCode: ibCode || null,
			ibPartnerId,
			role: 'trader'
		};

		// Set session cookie
		cookies.set('session', JSON.stringify(newUser), {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		return json({
			success: true,
			user: newUser
		});
	} catch (error) {
		console.error('Registration error:', error);
		return json({ error: 'Registration failed' }, { status: 500 });
	}
};
