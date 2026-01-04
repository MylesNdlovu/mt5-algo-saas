import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getUserAutomations,
	toggleUserAutomation,
	canUserAccessAutomation
} from '$lib/server/automationStorage';

// GET /api/user/automations - Get user's automations
export const GET: RequestHandler = async ({ cookies }) => {
	try {
		const sessionCookie = cookies.get('user_session');
		if (!sessionCookie) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const session = JSON.parse(sessionCookie);
		const userId = session.id;

		// Get user's automations (global + user-specific)
		const automations = getUserAutomations(userId);

		return json({
			success: true,
			data: automations
		});

	} catch (error) {
		console.error('Get user automations error:', error);
		return json({
			error: 'Failed to fetch automations',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};

// PATCH /api/user/automations/[id]/toggle - Toggle automation on/off
export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
	try {
		const sessionCookie = cookies.get('user_session');
		if (!sessionCookie) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const session = JSON.parse(sessionCookie);
		const userId = session.id;
		const automationId = (params as any).id;

		if (!automationId) {
			return json({ error: 'Automation ID required' }, { status: 400 });
		}

		// Verify user can access this automation
		if (!canUserAccessAutomation(automationId, userId, false)) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		const { isEnabled } = await request.json();

		if (typeof isEnabled !== 'boolean') {
			return json({ error: 'isEnabled must be a boolean' }, { status: 400 });
		}

		// Toggle automation
		const updated = toggleUserAutomation(automationId, userId, isEnabled);

		if (!updated) {
			return json({ error: 'Failed to update automation' }, { status: 500 });
		}

		return json({
			success: true,
			message: `✅ Automation ${isEnabled ? 'enabled' : 'disabled'}`,
			data: updated
		});

	} catch (error) {
		console.error('Toggle automation error:', error);
		return json({
			error: 'Failed to toggle automation',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
