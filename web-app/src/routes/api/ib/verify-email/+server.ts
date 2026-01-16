import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/ib/verify-email
 * Verify IB partner's email address using verification code
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email, code } = await request.json();

		if (!email || !code) {
			return json({ error: 'Email and verification code are required' }, { status: 400 });
		}

		// Find IB partner by email
		const ibPartner = await prisma.iBPartner.findUnique({
			where: { email: email.toLowerCase() }
		});

		if (!ibPartner) {
			return json({ error: 'Account not found' }, { status: 404 });
		}

		if (ibPartner.emailVerified) {
			return json({ error: 'Email already verified' }, { status: 400 });
		}

		// Check verification code
		if (ibPartner.verificationCode !== code) {
			return json({ error: 'Invalid verification code' }, { status: 400 });
		}

		// Check expiry
		if (ibPartner.verificationExpiry && new Date() > ibPartner.verificationExpiry) {
			return json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
		}

		// Update email verified status
		await prisma.iBPartner.update({
			where: { id: ibPartner.id },
			data: {
				emailVerified: true,
				verificationCode: null,
				verificationExpiry: null
			}
		});

		return json({
			success: true,
			message: 'Email verified successfully! Your application is now pending admin approval.'
		});
	} catch (error) {
		console.error('Email verification error:', error);
		return json({ error: 'Verification failed' }, { status: 500 });
	}
};

/**
 * GET /api/ib/verify-email?email=xxx&code=xxx
 * Alternative GET method for email link clicks
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const email = url.searchParams.get('email');
		const code = url.searchParams.get('code');

		if (!email || !code) {
			return json({ error: 'Email and verification code are required' }, { status: 400 });
		}

		// Find IB partner by email
		const ibPartner = await prisma.iBPartner.findUnique({
			where: { email: email.toLowerCase() }
		});

		if (!ibPartner) {
			return json({ error: 'Account not found' }, { status: 404 });
		}

		if (ibPartner.emailVerified) {
			return json({ success: true, message: 'Email already verified', alreadyVerified: true });
		}

		// Check verification code
		if (ibPartner.verificationCode !== code) {
			return json({ error: 'Invalid verification code' }, { status: 400 });
		}

		// Check expiry
		if (ibPartner.verificationExpiry && new Date() > ibPartner.verificationExpiry) {
			return json({ error: 'Verification code has expired' }, { status: 400 });
		}

		// Update email verified status
		await prisma.iBPartner.update({
			where: { id: ibPartner.id },
			data: {
				emailVerified: true,
				verificationCode: null,
				verificationExpiry: null
			}
		});

		return json({
			success: true,
			message: 'Email verified successfully!'
		});
	} catch (error) {
		console.error('Email verification error:', error);
		return json({ error: 'Verification failed' }, { status: 500 });
	}
};
