import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This endpoint handles bot settings configuration
// GET: Retrieve current settings from C# agent
// POST: Send new settings to C# agent

const CSHARP_AGENT_URL = process.env.CSHARP_AGENT_URL || 'http://localhost:5000';
const CSHARP_AGENT_API_KEY = process.env.CSHARP_AGENT_API_KEY || 'your-csharp-agent-api-key';

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		// Verify admin authentication
		const session = cookies.get('user_session');
		if (!session) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const user = JSON.parse(session);
		if (user.role !== 'admin') {
			return json({ error: 'Admin access required' }, { status: 403 });
		}

		// Fetch current settings from C# agent
		try {
			const response = await fetch(`${CSHARP_AGENT_URL}/api/ea/settings`, {
				headers: {
					'X-API-Key': CSHARP_AGENT_API_KEY
				}
			});

			if (response.ok) {
				const settings = await response.json();
				return json({ success: true, settings });
			} else {
				// Return default settings if agent is not available
				return json({
					success: true,
					settings: {
						enabled: true,
						lotSize: 0.01,
						maxLotSize: 1.0,
						stopLoss: 50,
						takeProfit: 100,
						maxTotalLoss: 5, // Maximum total loss in $ - emergency close
						maxLossPerTrade: 5, // Maximum loss per individual trade
						maxDailyProfit: 1000,
						tradingHours: { start: '00:00', end: '23:59' },
						allowedSymbols: ['XAUUSD'],
						riskLevel: 'MEDIUM',
						maxOpenTrades: 5,
						trailingStop: false,
						trailingStopDistance: 30,
						breakEven: true,
						breakEvenPips: 20
					}
				});
			}
		} catch (agentError) {
			console.error('C# Agent connection error:', agentError);
			// Return default settings if agent is unreachable
			return json({
				success: true,
				settings: {
					enabled: true,
					lotSize: 0.01,
					maxLotSize: 1.0,
					stopLoss: 50,
					takeProfit: 100,
					maxTotalLoss: 5, // Maximum total loss in $ - emergency close
					maxLossPerTrade: 5, // Maximum loss per individual trade
					maxDailyProfit: 1000,
					tradingHours: { start: '00:00', end: '23:59' },
					allowedSymbols: ['XAUUSD'],
					riskLevel: 'MEDIUM',
					maxOpenTrades: 5,
					trailingStop: false,
					trailingStopDistance: 30,
					breakEven: true,
					breakEvenPips: 20
				},
				warning: 'C# Agent offline - showing default settings'
			});
		}
	} catch (error) {
		console.error('Error fetching bot settings:', error);
		return json({ error: 'Failed to fetch settings' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		// Verify admin authentication
		const session = cookies.get('user_session');
		if (!session) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const user = JSON.parse(session);
		if (user.role !== 'admin') {
			return json({ error: 'Admin access required' }, { status: 403 });
		}

		const settings = await request.json();

		// Validate settings
		if (typeof settings.lotSize !== 'number' || settings.lotSize < 0.01 || settings.lotSize > 100) {
			return json({ error: 'Invalid lot size' }, { status: 400 });
		}

		if (typeof settings.stopLoss !== 'number' || settings.stopLoss < 5 || settings.stopLoss > 1000) {
			return json({ error: 'Invalid stop loss' }, { status: 400 });
		}

		// Validate maxTotalLoss (emergency close threshold)
		if (typeof settings.maxTotalLoss !== 'number' || settings.maxTotalLoss < 1 || settings.maxTotalLoss > 10000) {
			return json({ error: 'Invalid maximum total loss' }, { status: 400 });
		}

		// Validate maxLossPerTrade
		if (typeof settings.maxLossPerTrade !== 'number' || settings.maxLossPerTrade < 1 || settings.maxLossPerTrade > 10000) {
			return json({ error: 'Invalid maximum loss per trade' }, { status: 400 });
		}

		// Send settings to C# agent
		try {
			const response = await fetch(`${CSHARP_AGENT_URL}/api/ea/configure`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': CSHARP_AGENT_API_KEY
				},
				body: JSON.stringify({
					...settings,
					timestamp: new Date().toISOString(),
					updatedBy: user.email
				})
			});

			if (response.ok) {
				const result = await response.json();
				console.log('✅ Bot settings sent to C# agent successfully');
				return json({
					success: true,
					message: 'Settings applied to C# agent',
					settings: result
				});
			} else {
				const error = await response.text();
				console.error('❌ C# Agent rejected settings:', error);
				return json(
					{
						error: 'C# Agent rejected settings',
						details: error
					},
					{ status: response.status }
				);
			}
		} catch (agentError) {
			console.error('❌ Failed to connect to C# Agent:', agentError);
			return json(
				{
					error: 'C# Agent is offline or unreachable',
					details: 'Settings saved but could not be sent to agent. Please ensure C# Agent is running.'
				},
				{ status: 503 }
			);
		}
	} catch (error) {
		console.error('Error saving bot settings:', error);
		return json({ error: 'Failed to save settings' }, { status: 500 });
	}
};
