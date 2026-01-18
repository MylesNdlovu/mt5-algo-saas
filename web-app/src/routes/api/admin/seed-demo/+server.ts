import { json, type RequestHandler } from '@sveltejs/kit';
import prisma from '$lib/server/db';

/**
 * Admin endpoint to seed demo MT5 account for testing
 * DELETE THIS AFTER TESTING
 */

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { secretKey } = await request.json();

		// Simple protection - delete this endpoint after use
		if (secretKey !== 'scalperium-seed-2026') {
			return json({ error: 'Invalid secret' }, { status: 401 });
		}

		// Demo account credentials
		const demoAccount = {
			accountNumber: '1156599',
			broker: 'PrimeXBT',
			serverName: 'PXBTTrading-1',
			login: '1156599',
			password: '6VK73cWK&$',
			accountType: 'Pro'
		};

		// Find or create a demo user
		let user = await prisma.user.findFirst({
			where: { email: 'demo@scalperium.com' }
		});

		if (!user) {
			user = await prisma.user.create({
				data: {
					email: 'demo@scalperium.com',
					password: 'demo-hashed-password', // Not used for login
					firstName: 'Demo',
					lastName: 'Trader',
					role: 'TRADER',
					isEmailVerified: true
				}
			});
			console.log('[Seed] Created demo user:', user.id);
		}

		// Create or update MT5 account
		const mt5Account = await prisma.mT5Account.upsert({
			where: { accountNumber: demoAccount.accountNumber },
			create: {
				accountNumber: demoAccount.accountNumber,
				broker: demoAccount.broker,
				serverName: demoAccount.serverName,
				login: demoAccount.login,
				password: demoAccount.password,
				userId: user.id,
				status: 'ACTIVE',
				balance: 10000,
				equity: 10000,
				accountType: demoAccount.accountType
			},
			update: {
				broker: demoAccount.broker,
				serverName: demoAccount.serverName,
				password: demoAccount.password,
				status: 'ACTIVE'
			}
		});
		console.log('[Seed] Created/updated MT5 account:', mt5Account.accountNumber);

		// Find the agent
		const agent = await prisma.agent.findFirst({
			where: { apiKey: 'sk_agent_ba26227eae844e64b548b75dd283ee13' }
		});

		if (!agent) {
			return json({ error: 'Agent not found' }, { status: 404 });
		}

		// Create or update assignment
		const assignment = await prisma.mT5AccountAssignment.upsert({
			where: { mt5AccountNumber: demoAccount.accountNumber },
			create: {
				mt5AccountNumber: demoAccount.accountNumber,
				mt5Broker: demoAccount.broker,
				mt5ServerName: demoAccount.serverName,
				agentId: agent.id,
				isActive: true,
				credentialsDelivered: false
			},
			update: {
				agentId: agent.id,
				isActive: true,
				credentialsDelivered: false
			}
		});
		console.log('[Seed] Created/updated assignment:', assignment.id);

		// Update agent's managed accounts
		await prisma.agent.update({
			where: { id: agent.id },
			data: {
				managedAccounts: [demoAccount.accountNumber]
			}
		});

		return json({
			success: true,
			message: 'Demo account seeded successfully',
			data: {
				userId: user.id,
				accountNumber: mt5Account.accountNumber,
				agentId: agent.id,
				assignmentId: assignment.id
			}
		});
	} catch (error) {
		console.error('[Seed] Error:', error);
		return json({ error: 'Failed to seed demo account' }, { status: 500 });
	}
};
