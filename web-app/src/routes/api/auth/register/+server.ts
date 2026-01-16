import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword, setSession, createUserSession } from '$lib/server/auth';
import crypto from 'crypto';
import { getMailgunService } from '$lib/server/notifications/mailgun';
import { env } from '$env/dynamic/private';
import { generateVerificationEmail, type EmailBranding } from '$lib/server/email-templates';

const prisma = new PrismaClient();

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	try {
		const { email, password, firstName, lastName, phone, ibCode } = await request.json();
		const hostname = url.hostname;

		console.log('[Register] Registration attempt:', { email, ibCode, hostname });

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

		// Validate and link IB code if provided, or detect IB from custom domain
		let ibPartnerId: string | null = null;
		let ibPartnerName: string | null = null;
		let ibBranding: EmailBranding | null = null;
		let ibDomain: string | null = null;

		// First, check if user is registering from an IB's custom domain
		const isStandardDomain = hostname === 'localhost' ||
			hostname.includes('.vercel.app') ||
			hostname.includes('scalperium.com');

		if (!isStandardDomain) {
			// Look up IB partner by custom domain
			const ibPartnerByDomain = await prisma.iBPartner.findFirst({
				where: {
					domain: hostname,
					isActive: true,
					isApproved: true
				}
			});

			if (ibPartnerByDomain) {
				ibPartnerId = ibPartnerByDomain.id;
				ibPartnerName = ibPartnerByDomain.companyName;
				ibDomain = hostname;
				ibBranding = {
					brandName: ibPartnerByDomain.brandName || ibPartnerByDomain.companyName,
					brandColor: ibPartnerByDomain.brandColor || '#EF4444',
					logo: ibPartnerByDomain.logo,
					domain: hostname
				};
				console.log('[Register] IB detected from domain:', { hostname, ibPartnerId, ibPartnerName });
			}
		}

		// If IB code provided, validate and potentially override domain-detected IB
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
			// Use IB's domain if they have one, otherwise fall back to scalperium.com
			ibDomain = ibPartner.domain || null;
			ibBranding = {
				brandName: ibPartner.brandName || ibPartner.companyName,
				brandColor: ibPartner.brandColor || '#EF4444',
				logo: ibPartner.logo,
				domain: ibPartner.domain
			};
			console.log('[Register] IB code validated:', { ibCode, ibPartnerId, ibPartnerName });
		}

		// Hash password
		const passwordHash = await hashPassword(password);

		// Generate email verification code
		const verificationCode = crypto.randomBytes(32).toString('hex');
		const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

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
				emailVerified: false,
				verificationCode,
				verificationExpiry
			}
		});

		// Send verification email
		// Use IB's domain for verification link if available, otherwise use default
		const defaultBaseUrl = env.PUBLIC_BASE_URL || 'https://scalperium.com';
		const baseUrl = ibDomain ? `https://${ibDomain}` : defaultBaseUrl;
		const verificationLink = `${baseUrl}/verify-email?email=${encodeURIComponent(email.toLowerCase())}&code=${verificationCode}`;

		// Determine email branding
		const brandName = ibBranding?.brandName || 'SCALPERIUM';

		try {
			const mailgun = getMailgunService();
			await mailgun.sendEmail({
				to: email.toLowerCase(),
				subject: `Verify Your ${brandName} Account`,
				html: generateVerificationEmail({
					recipientName: firstName,
					verificationLink,
					branding: ibBranding || undefined,
					isIBPartner: false
				}),
				// Use IB's brand name in the "From" field for professional appearance
				fromName: ibBranding?.brandName || undefined
			});
			console.log(`[Register] Verification email sent to ${email} with branding: ${brandName}`);
		} catch (emailError) {
			console.error(`[Register] Failed to send verification email:`, emailError);
			// Don't fail registration if email fails - user can request resend
		}

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
