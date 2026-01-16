import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { getMailgunService } from '$lib/server/notifications/mailgun';
import { env } from '$env/dynamic/private';
import { generateVerificationEmail } from '$lib/server/email-templates';

const prisma = new PrismaClient();

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		const {
			email,
			password,
			companyName,
			contactName,
			phone,
			currentTraders,
			message,
			companyDocument,
			idDocument,
			kycDocument
		} = data;

		// Validation
		if (!email || !password || !companyName || !contactName || !phone) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		if (password.length < 8) {
			return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
		}

		// Check if email already exists
		const existing = await prisma.iBPartner.findUnique({
			where: { email: email.toLowerCase() }
		});

		if (existing) {
			return json({ error: 'Email already registered' }, { status: 400 });
		}

		// Generate unique IB code
		const ibCode = `IB${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

		// Generate email verification code
		const verificationCode = crypto.randomBytes(32).toString('hex');
		const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

		// Hash password
		const passwordHash = await bcrypt.hash(password, 10);

		// Create IB partner
		const ibPartner = await prisma.iBPartner.create({
			data: {
				email: email.toLowerCase(),
				passwordHash,
				companyName,
				contactName,
				phone,
				ibCode,
				currentTraders,
				message,
				companyDocument,
				idDocument,
				kycDocument,
				kycStatus: companyDocument || idDocument ? 'pending' : 'pending',
				emailVerified: false,
				verificationCode,
				verificationExpiry,
				isActive: false,
				isApproved: false
			}
		});

		// Send verification email
		const baseUrl = env.PUBLIC_BASE_URL || 'https://scalperium.com';
		const verificationLink = `${baseUrl}/ib-verify?email=${encodeURIComponent(email.toLowerCase())}&code=${verificationCode}`;

		try {
			const mailgun = getMailgunService();
			await mailgun.sendEmail({
				to: email.toLowerCase(),
				subject: 'Verify Your SCALPERIUM IB Partner Account',
				html: generateVerificationEmail({
					recipientName: contactName,
					verificationLink,
					isIBPartner: true
				})
			});
			console.log(`[IB Registration] Verification email sent to ${email}`);
		} catch (emailError) {
			console.error(`[IB Registration] Failed to send verification email:`, emailError);
			// Don't fail registration if email fails - user can request resend
		}

		return json({
			success: true,
			message: 'Application submitted successfully! Please check your email to verify your account. Your application will be reviewed within 48 hours.',
			ibCode: ibPartner.ibCode,
			requiresVerification: true
		});
	} catch (error) {
		console.error('IB registration error:', error);
		return json({ error: 'Registration failed' }, { status: 500 });
	}
};
