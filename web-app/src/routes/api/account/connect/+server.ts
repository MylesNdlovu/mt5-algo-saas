import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { broker, server, accountNumber, password } = await request.json();

		// Validate input
		if (!broker || !server || !accountNumber || !password) {
			return json({ success: false, error: 'All fields are required' }, { status: 400 });
		}

		// TODO: Get user from session
		// const userId = locals.user?.id;
		// if (!userId) {
		// 	return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		// }

		// Send connection request to C# agent
		const agentResponse = await fetch('http://localhost:5000/api/account/connect', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				// 'X-API-Key': process.env.AGENT_API_KEY || ''
			},
			body: JSON.stringify({
				broker,
				server,
				accountNumber,
				password
				// userId
			})
		});

		const agentResult = await agentResponse.json();

		if (!agentResponse.ok) {
			return json(
				{
					success: false,
					error: agentResult.error || 'Failed to connect to MT5'
				},
				{ status: agentResponse.status }
			);
		}

		// TODO: Save connection details to database
		// await db.account.create({
		// 	data: {
		// 		userId,
		// 		broker,
		// 		server,
		// 		accountNumber,
		// 		status: 'connected'
		// 	}
		// });

		return json({
			success: true,
			message: 'Successfully connected to MT5',
			data: agentResult
		});
	} catch (error) {
		console.error('MT5 connection error:', error);
		return json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
