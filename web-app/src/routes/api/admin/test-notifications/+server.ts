import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getNotificationService } from '$lib/server/notifications';

// Test notification endpoints
export const POST: RequestHandler = async (event) => {
	try {
		// Check admin access (same as other admin endpoints)
		const sessionCookie = event.cookies.get('user_session');
		if (!sessionCookie) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		const user = JSON.parse(sessionCookie);
		if (user.role !== 'admin') {
			return json({ error: 'Not authorized' }, { status: 403 });
		}

		const { testEmail, testPhone } = await event.request.json();

		if (!testEmail && !testPhone) {
			return json({ error: 'Provide testEmail or testPhone' }, { status: 400 });
		}

		const notificationService = getNotificationService();
		const results = await notificationService.testChannels(testEmail, testPhone);

		return json({
			success: true,
			results,
			message: 'Test notifications sent'
		});
	} catch (error: any) {
		console.error('Test notification error:', error);
		return json({ 
			success: false,
			error: error.message || 'Failed to test notifications' 
		}, { status: 500 });
	}
};
