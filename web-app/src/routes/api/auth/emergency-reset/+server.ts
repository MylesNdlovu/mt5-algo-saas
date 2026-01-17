import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { secret, newPassword } = await request.json();

		if (secret !== 'scalperium-emergency-2026') {
			return json({ error: 'Invalid secret' }, { status: 403 });
		}

		if (!newPassword || newPassword.length < 6) {
			return json({ error: 'Password must be at least 6 characters' }, { status: 400 });
		}

		const newHash = await bcrypt.hash(newPassword, 10);

		const updated = await prisma.user.updateMany({
			where: { email: 'admin@scalperium.com' },
			data: { passwordHash: newHash }
		});

		if (updated.count === 0) {
			return json({ error: 'Admin user not found' }, { status: 404 });
		}

		return json({
			success: true,
			message: 'Password updated. DELETE this endpoint!',
			hashPrefix: newHash.substring(0, 7)
		});

	} catch (error) {
		return json({ error: String(error) }, { status: 500 });
	}
};
