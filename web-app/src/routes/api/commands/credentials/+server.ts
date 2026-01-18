import { json, type RequestHandler } from '@sveltejs/kit';
import prisma from '$lib/server/db';

/**
 * Secure Credentials Endpoint
 *
 * Agent polls this to get MT5 credentials for accounts it needs to manage.
 * Credentials are only returned once, then marked as delivered.
 *
 * Security:
 * - Agent authenticated via API key
 * - Credentials encrypted in DB (TODO: implement encryption)
 * - Credentials only returned for accounts assigned to this agent
 * - One-time delivery - marked as delivered after retrieval
 */

interface CredentialDelivery {
	accountNumber: string;
	broker: string;
	serverName: string;
	login: string;
	password: string; // Will be encrypted in production
}

// GET: Agent retrieves pending credentials
export const GET: RequestHandler = async ({ url }) => {
	const apiKey = url.searchParams.get('apiKey');

	if (!apiKey) {
		return json({ error: 'API key required' }, { status: 400 });
	}

	// Validate agent
	const agent = await prisma.agent.findUnique({
		where: { apiKey },
		select: { id: true }
	});

	if (!agent) {
		return json({ error: 'Invalid API key' }, { status: 401 });
	}

	// Get accounts assigned to this agent that have pending credentials
	const assignments = await prisma.mT5AccountAssignment.findMany({
		where: {
			agentId: agent.id,
			credentialsDelivered: false,
			isActive: true
		},
		select: {
			mt5AccountNumber: true,
			mt5Broker: true,
			mt5ServerName: true
		}
	});

	if (assignments.length === 0) {
		return json({ credentials: [], message: 'No pending credentials' });
	}

	// Get full account details with credentials
	const credentials: CredentialDelivery[] = [];

	for (const assignment of assignments) {
		const account = await prisma.mT5Account.findUnique({
			where: { accountNumber: assignment.mt5AccountNumber },
			select: {
				accountNumber: true,
				broker: true,
				serverName: true,
				login: true,
				password: true
			}
		});

		if (account && account.password) {
			// TODO: Decrypt password here before sending
			// For now, assuming it's stored securely
			credentials.push({
				accountNumber: account.accountNumber,
				broker: account.broker,
				serverName: account.serverName,
				login: account.login,
				password: account.password // Should be decrypted in production
			});
		}
	}

	// Mark credentials as delivered
	if (credentials.length > 0) {
		await prisma.mT5AccountAssignment.updateMany({
			where: {
				agentId: agent.id,
				mt5AccountNumber: { in: credentials.map(c => c.accountNumber) }
			},
			data: {
				credentialsDelivered: true,
				credentialsDeliveredAt: new Date()
			}
		});

		console.log(`[Credentials] Delivered ${credentials.length} credentials to agent ${agent.id}`);
	}

	return json({
		credentials,
		deliveredAt: new Date().toISOString()
	});
};

// POST: Web app queues credentials for delivery when user registers MT5 account
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const session = locals.session;
		if (!session?.userId) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { accountNumber, broker, serverName, password } = await request.json();

		if (!accountNumber || !broker || !serverName || !password) {
			return json({ error: 'All fields required: accountNumber, broker, serverName, password' }, { status: 400 });
		}

		// TODO: Encrypt password before storing
		// For production, use a proper encryption library with key management

		// Update or create MT5 account with credentials
		await prisma.mT5Account.upsert({
			where: { accountNumber },
			create: {
				accountNumber,
				broker,
				serverName,
				login: accountNumber,
				password, // TODO: encrypt before storing
				userId: session.userId,
				status: 'PENDING'
			},
			update: {
				broker,
				serverName,
				password // TODO: encrypt before storing
			}
		});

		// If there's an assignment, mark credentials as not delivered (to trigger re-delivery)
		await prisma.mT5AccountAssignment.updateMany({
			where: { mt5AccountNumber: accountNumber },
			data: { credentialsDelivered: false }
		});

		console.log(`[Credentials] Queued credentials for account ${accountNumber}`);

		return json({
			success: true,
			message: 'Credentials queued for delivery to agent'
		});
	} catch (error) {
		console.error('[Credentials] Error:', error);
		return json({ error: 'Failed to queue credentials' }, { status: 500 });
	}
};
