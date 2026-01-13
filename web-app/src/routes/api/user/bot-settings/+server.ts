import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { sendCommandToAgent } from '$lib/server/agent-client';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const sessionUser = getSessionUser(cookies);

	if (!sessionUser) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { maxLotSize, maxLoss, safetyMode } = await request.json();

		// Validate inputs
		if (maxLotSize < 0.01 || maxLotSize > 0.05) {
			return json({ error: 'Lot size must be between 0.01 and 0.05' }, { status: 400 });
		}

		if (maxLoss < 5 || maxLoss > 10) {
			return json({ error: 'Max loss must be between $5 and $10' }, { status: 400 });
		}

		// Send command to C# agent via WebSocket
		await sendCommandToAgent(sessionUser.userId, {
			type: 'update_bot_settings',
			payload: {
				maxLotSize,
				maxLoss,
				safetyMode,
				userId: sessionUser.userId
			}
		});

		// TODO: Also save to database for persistence
		// await prisma.userSettings.upsert({
		//   where: { userId: sessionUser.userId },
		//   update: { maxLotSize, maxLoss },
		//   create: { userId: sessionUser.userId, maxLotSize, maxLoss }
		// });

		return json({
			success: true,
			message: 'Bot settings updated and synced with agent',
			settings: {
				maxLotSize,
				maxLoss,
				safetyMode
			}
		});
	} catch (error) {
		console.error('Error updating bot settings:', error);
		return json({ error: 'Failed to update bot settings' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ cookies }) => {
	const sessionUser = getSessionUser(cookies);

	if (!sessionUser) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// TODO: Load settings from database
		// const settings = await prisma.userSettings.findUnique({
		//   where: { userId: sessionUser.userId }
		// });

		// Return default settings for now
		return json({
			success: true,
			settings: {
				maxLotSize: 0.01,
				maxLoss: 5,
				safetyMode: 'green'
			}
		});
	} catch (error) {
		console.error('Error loading bot settings:', error);
		return json({ error: 'Failed to load bot settings' }, { status: 500 });
	}
};
