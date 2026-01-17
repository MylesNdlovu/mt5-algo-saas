import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';
import bcrypt from 'bcrypt';

// TEMPORARY - DELETE THIS FILE AFTER USE
export const GET: RequestHandler = async () => {
    try {
        const newPassword = 'Admin123!';
        const hash = await bcrypt.hash(newPassword, 10);

        await db.user.update({
            where: { email: 'admin@scalperium.com' },
            data: { passwordHash: hash }
        });

        return json({
            success: true,
            message: 'Password reset! Now DELETE this file.',
            email: 'admin@scalperium.com',
            password: 'Admin123!'
        });
    } catch (error) {
        return json({ error: String(error) }, { status: 500 });
    }
};
