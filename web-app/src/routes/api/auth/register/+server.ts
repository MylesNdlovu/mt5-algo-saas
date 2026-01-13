import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword, setSession, createUserSession } from '$lib/server/auth';

const prisma = new PrismaClient();

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password, firstName, lastName, phone, ibCode } = await request.json();

		console.log('[Register] Registration attempt:', { email, ibCode });

		// Validation
		if (!email || !password || !firstName || !lastName) {
			return json({ error: 'Email, password, first name, and last name are required' }, { status: 400 });
		}

		if (password.length < 8) {
			return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return json({ error: 'Invalid email format' }, { status: 400 });
		}

		// Check if email already exists
		const existingUser = await prisma.user.findUnique({
			where: { email: email.toLowerCase() }
		});

		if (existingUser) {
			console.log('[Register] Email already exists:', email);
			return json({ error: 'Email already registered' }, { status: 400 });
		}

		// Validate and link IB code if provided
		let ibPartnerId: string | null = null;
		let ibPartnerName: string | null = null;

		if (ibCode && ibCode.trim()) {
			const ibPartner = await prisma.iBPartner.findUnique({
				where: { ibCode: ibCode.trim() }
			});

			if (!ibPartner) {
				console.log('[Register] Invalid IB code:', ibCode);
				return json({ error: 'Invalid referral code' }, { status: 400 });
			}

			if (!ibPartner.isActive) {
				console.log('[Register] Inactive IB partner:', ibCode);
				return json({ error: 'This referral code is no longer active' }, { status: 400 });
			}

			if (!ibPartner.isApproved) {
				console.log('[Register] Unapproved IB partner:', ibCode);
				return json({ error: 'This referral code is pending approval' }, { status: 400 });
			}

			// Check trader limit for IB partner
			const currentUserCount = await prisma.user.count({
				where: { ibPartnerId: ibPartner.id }
			});

			if (ibPartner.traderLimit && currentUserCount >= ibPartner.traderLimit) {
				console.log('[Register] IB trader limit reached:', { ibCode, limit: ibPartner.traderLimit });
				return json({ error: 'This referral program has reached its user limit' }, { status: 400 });
			}

			ibPartnerId = ibPartner.id;
			ibPartnerName = ibPartner.companyName;
			console.log('[Register] IB code validated:', { ibCode, ibPartnerId, ibPartnerName });
		}

		// Hash password
		const passwordHash = await hashPassword(password);

		// Create new user in database
		const newUser = await prisma.user.create({
			data: {
				email: email.toLowerCase(),
				passwordHash,
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				phone: phone?.trim() || null,
				role: UserRole.TRADER, // Default role for new registrations
				ibCode: ibCode?.trim() || null,
				ibPartnerId, // Link to IB Partner if code was valid
				isActive: true,
				lastLoginAt: new Date(), // Set initial login time
				subscriptionTier: 'FREE', // Default tier
				spreadRevShare: ibPartnerId ? 15.0 : 0, // Default 15% if referred by IB
			}
		});

		console.log('[Register] User created successfully:', {
			userId: newUser.id,
			email: newUser.email,
			ibPartnerId: newUser.ibPartnerId,
			ibPartnerName
		});

		// Create unified session
		const sessionData = createUserSession({
			id: newUser.id,
			email: newUser.email,
			firstName: newUser.firstName,
			lastName: newUser.lastName,
			role: newUser.role,
			ibPartnerId: newUser.ibPartnerId
		});

		// Set the unified session cookie
		setSession(cookies, sessionData);

		// If user was referred by IB, log it for analytics/notifications
		if (ibPartnerId) {
			// TODO: Send notification to IB partner about new referral
			// TODO: Send welcome email to user mentioning their IB partner
			console.log('[Register] New IB referral:', {
				userId: newUser.id,
				ibPartnerId,
				ibPartnerName
			});
		}

		return json({
			success: true,
			user: {
				id: newUser.id,
				email: newUser.email,
				name: `${newUser.firstName} ${newUser.lastName}`,
				role: newUser.role,
				ibPartnerId: newUser.ibPartnerId,
				referredBy: ibPartnerName
			}
		});

	} catch (error) {
		console.error('[Register] Registration error:', error);
		return json({ error: 'Registration failed. Please try again.' }, { status: 500 });
	}
};
