import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/auth/verify-email
 * Verify user's email address using verification code
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email, code } = await request.json();

		if (!email || !code) {
			return json({ error: 'Email and verification code are required' }, { status: 400 });
		}

		// Find user by email
		const user = await prisma.user.findUnique({
			where: { email: email.toLowerCase() }
		});

		if (!user) {
			return json({ error: 'Account not found' }, { status: 404 });
		}

		if (user.emailVerified) {
			return json({ error: 'Email already verified' }, { status: 400 });
		}

		// Check verification code
		if (user.verificationCode !== code) {
			return json({ error: 'Invalid verification code' }, { status: 400 });
		}

		// Check expiry
		if (user.verificationExpiry && new Date() > user.verificationExpiry) {
			return json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
		}

		// Update email verified status
		await prisma.user.update({
			where: { id: user.id },
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

/**
 * GET /api/auth/verify-email?email=xxx&code=xxx
 * Alternative GET method for email link clicks
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const email = url.searchParams.get('email');
		const code = url.searchParams.get('code');

		if (!email || !code) {
			return json({ error: 'Email and verification code are required' }, { status: 400 });
		}

		// Find user by email
		const user = await prisma.user.findUnique({
			where: { email: email.toLowerCase() }
		});

		if (!user) {
			return json({ error: 'Account not found' }, { status: 404 });
		}

		if (user.emailVerified) {
			return json({ success: true, message: 'Email already verified', alreadyVerified: true });
		}

		// Check verification code
		if (user.verificationCode !== code) {
			return json({ error: 'Invalid verification code' }, { status: 400 });
		}

		// Check expiry
		if (user.verificationExpiry && new Date() > user.verificationExpiry) {
			return json({ error: 'Verification code has expired' }, { status: 400 });
		}

		// Update email verified status
		await prisma.user.update({
			where: { id: user.id },
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
