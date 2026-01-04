import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';
import { agentClient } from '$lib/server/agent-client';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { accountId, action } = await request.json();

		// Verify account belongs to user
		const account = await db.mT5Account.findFirst({
			where: {
				id: accountId,
				userId: locals.user.userId
			}
		});

		if (!account) {
			return json({ error: 'Account not found' }, { status: 404 });
		}

		// Check safety indicator for start action
		if (action === 'start') {
			if (account.safetyIndicator === 'RED') {
				return json(
					{ error: 'Cannot start EA: Market conditions are unsafe (RED indicator)' },
					{ status: 400 }
				);
			}
		}

		// Send control command to C# agent
		const response = await agentClient.controlEA({ accountId, action });

		// Update database
		await db.mT5Account.update({
			where: { id: accountId },
			data: {
				eaStatus: response.status,
				safetyIndicator: response.safetyIndicator,
				...(action === 'start' && { lastEAStart: new Date() }),
				...(action === 'stop' && { lastEAStop: new Date() })
			}
		});

		// Log action
		await db.systemLog.create({
			data: {
				level: 'INFO',
				component: 'WEB',
				message: `EA ${action} for account ${account.accountNumber}`,
				metadata: {
					userId: locals.user.userId,
					accountId,
					action
				}
			}
		});

		return json({
			success: true,
			status: response.status,
			safetyIndicator: response.safetyIndicator,
			message: response.message
		});
	} catch (error) {
		console.error('EA control error:', error);
		return json({ error: 'Failed to control EA' }, { status: 500 });
	}
};
