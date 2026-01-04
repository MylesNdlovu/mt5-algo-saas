import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAllAutomations,
	getAutomationById,
	createAutomation,
	updateAutomation,
	deleteAutomation,
	getAutomationStats
} from '$lib/server/automationStorage';

// Helper function to check admin access (mock auth)
function checkAdminAccess(event: any) {
	const sessionCookie = event.cookies.get('user_session');
	if (!sessionCookie) {
		throw new Error('Not authenticated');
	}
	
	try {
		const user = JSON.parse(sessionCookie);
		if (user.role !== 'admin') {
			throw new Error('Not authorized - admin access required');
		}
		return user;
	} catch (e) {
		throw new Error('Invalid session');
	}
}

// GET - List all automations
export const GET: RequestHandler = async (event) => {
	try {
		checkAdminAccess(event);

		const { url } = event;
		const status = url.searchParams.get('status') || '';

		let automations = getAllAutomations();

		// Filter by status if provided
		if (status) {
			automations = automations.filter((a: any) => a.status === status);
		}

		// Get statistics
		const stats = getAutomationStats();

		return json({
			automations,
			stats
		});
	} catch (error) {
		console.error('Error fetching automations:', error);
		return json({ error: 'Failed to fetch automations' }, { status: 500 });
	}
};

// POST - Create new automation
export const POST: RequestHandler = async (event) => {
	try {
		const user = checkAdminAccess(event);

		const data = await event.request.json();

		// Validate required fields
		if (!data.name?.trim()) {
			return json({ error: 'Name is required' }, { status: 400 });
		}
		if (!data.triggerType) {
			return json({ error: 'Trigger type is required' }, { status: 400 });
		}
		if (!data.actionTypes || !Array.isArray(data.actionTypes) || data.actionTypes.length === 0) {
			return json({ error: 'At least one action type is required' }, { status: 400 });
		}
		if (!data.messageBody?.trim()) {
			return json({ error: 'Message body is required' }, { status: 400 });
		}

		// Validate action types are valid
		const validActionTypes = ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH_NOTIFICATION', 'IN_APP_MESSAGE'];
		const invalidTypes = data.actionTypes.filter((t: string) => !validActionTypes.includes(t));
		if (invalidTypes.length > 0) {
			return json({ error: `Invalid action types: ${invalidTypes.join(', ')}` }, { status: 400 });
		}

		// Create automation with sanitized data
		const automation = createAutomation({
			name: data.name.trim(),
			description: data.description?.trim() || '',
			userId: data.userId || undefined,  // Optional user assignment
			triggerType: data.triggerType,
			triggerValue: data.triggerValue ? parseInt(data.triggerValue) : undefined,
			triggerData: data.triggerData || {},
			actionTypes: data.actionTypes,
			actionData: data.actionData || {},
			messageBody: data.messageBody.trim(),
			messageSubject: data.messageSubject?.trim() || '',
			status: data.status || 'ACTIVE',
			priority: data.priority ? parseInt(data.priority) : 5,
			isUserEnabled: true,
			createdBy: user.email
		});

		return json({
			success: true,
			automation
		});
	} catch (error) {
		console.error('Error creating automation:', error);
		return json({ error: 'Failed to create automation' }, { status: 500 });
	}
};

// PATCH - Update automation
export const PATCH: RequestHandler = async (event) => {
	try {
		checkAdminAccess(event);

		const { automationId, updates } = await event.request.json();

		if (!automationId) {
			return json({ error: 'Automation ID required' }, { status: 400 });
		}

		// Sanitize updates
		const sanitizedUpdates: any = {};
		
		if (updates.name !== undefined) {
			if (!updates.name?.trim()) {
				return json({ error: 'Name cannot be empty' }, { status: 400 });
			}
			sanitizedUpdates.name = updates.name.trim();
		}
		
		if (updates.description !== undefined) {
			sanitizedUpdates.description = updates.description?.trim() || '';
		}
		
		if (updates.triggerType !== undefined) {
			sanitizedUpdates.triggerType = updates.triggerType;
		}
		
		if (updates.triggerValue !== undefined) {
			sanitizedUpdates.triggerValue = updates.triggerValue ? parseInt(updates.triggerValue) : undefined;
		}
		
		if (updates.actionTypes !== undefined) {
			if (!Array.isArray(updates.actionTypes) || updates.actionTypes.length === 0) {
				return json({ error: 'At least one action type is required' }, { status: 400 });
			}
			sanitizedUpdates.actionTypes = updates.actionTypes;
		}
		
		if (updates.messageBody !== undefined) {
			if (!updates.messageBody?.trim()) {
				return json({ error: 'Message body cannot be empty' }, { status: 400 });
			}
			sanitizedUpdates.messageBody = updates.messageBody.trim();
		}
		
		if (updates.messageSubject !== undefined) {
			sanitizedUpdates.messageSubject = updates.messageSubject?.trim() || '';
		}
		
		if (updates.status !== undefined) {
			sanitizedUpdates.status = updates.status;
		}
		
		if (updates.priority !== undefined) {
			sanitizedUpdates.priority = parseInt(updates.priority);
		}

		sanitizedUpdates.updatedAt = new Date().toISOString();

		const automation = updateAutomation(automationId, sanitizedUpdates);

		if (!automation) {
			return json({ error: 'Automation not found' }, { status: 404 });
		}

		return json({
			success: true,
			automation
		});
	} catch (error) {
		console.error('Error updating automation:', error);
		return json({ error: 'Failed to update automation' }, { status: 500 });
	}
};

// DELETE - Delete automation
export const DELETE: RequestHandler = async (event) => {
	try {
		checkAdminAccess(event);

		const { url } = event;
		const automationId = url.searchParams.get('id');

		if (!automationId) {
			return json({ error: 'Automation ID required' }, { status: 400 });
		}

		const success = deleteAutomation(automationId);

		if (!success) {
			return json({ error: 'Automation not found' }, { status: 404 });
		}

		return json({
			success: true,
			message: 'Automation deleted successfully'
		});
	} catch (error) {
		console.error('Error deleting automation:', error);
		return json({ error: 'Failed to delete automation' }, { status: 500 });
	}
};
