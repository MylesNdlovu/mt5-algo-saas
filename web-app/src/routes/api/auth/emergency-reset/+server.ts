import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * EMERGENCY PASSWORD RESET ENDPOINT
 * This should be DELETED after first successful login
 *
 * Usage: POST /api/auth/emergency-reset
 * Body: { "secret": "scalperium-emergency-2026", "newPassword": "yourNewPassword" }
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { secret, newPassword } = await request.json();

		// Check secret key
		if (secret !== 'scalperium-emergency-2026') {
			return json({ error: 'Invalid secret' }, { status: 403 });
		}

		if (!newPassword || newPassword.length < 6) {
			return json({ error: 'Password must be at least 6 characters' }, { status: 400 });
		}

		// Hash the new password
		const newHash = await bcrypt.hash(newPassword, 10);

		// Update admin user password
		const updated = await prisma.user.updateMany({
			where: { email: 'admin@scalperium.com' },
			data: { passwordHash: newHash }
		});

		if (updated.count === 0) {
			return json({ error: 'Admin user not found' }, { status: 404 });
		}

		return json({
			success: true,
			message: 'Password updated successfully. DELETE this endpoint now!',
			hashPrefix: newHash.substring(0, 7)
		});

	} catch (error) {
		console.error('Emergency reset error:', error);
		return json({ error: String(error) }, { status: 500 });
	}
};
