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

		// Demo account credentials (PrimeXBT Pro Demo)
		const demoAccount = {
			accountNumber: '1156599',
			broker: 'PrimeXBT',
			serverName: 'PXBTTrading-1',
			login: '1156599',
			password: '6VK73cWK&$'
		};

		// Find or create a demo user
		let user = await prisma.user.findFirst({
			where: { email: 'demo@scalperium.com' }
		});

		if (!user) {
			user = await prisma.user.create({
				data: {
					email: 'demo@scalperium.com',
					passwordHash: 'demo-hashed-password-not-for-login',
					firstName: 'Demo',
					lastName: 'Trader',
					role: 'TRADER',
					emailVerified: true
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
				equity: 10000
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

		// Try to create assignment (may fail if schema not synced)
		let assignmentId = null;
		try {
			const assignment = await prisma.mT5AccountAssignment.upsert({
				where: { mt5AccountNumber: demoAccount.accountNumber },
				create: {
					mt5AccountNumber: demoAccount.accountNumber,
					mt5Broker: demoAccount.broker,
					mt5ServerName: demoAccount.serverName,
					agentId: agent.id,
					userId: user.id,
					isActive: true
				},
				update: {
					agentId: agent.id,
					isActive: true
				}
			});
			assignmentId = assignment.id;
			console.log('[Seed] Created/updated assignment:', assignment.id);
		} catch (assignErr) {
			console.log('[Seed] Assignment creation failed (schema may need sync):', assignErr);
		}

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
				assignmentId: assignmentId || 'skipped - run prisma db push'
			}
		});
	} catch (error: unknown) {
		console.error('[Seed] Error:', error);
		let details = 'Unknown error';
		if (error instanceof Error) {
			details = error.message;
			// Check for Prisma-specific error properties
			if ('code' in error) {
				details += ` (code: ${(error as { code: string }).code})`;
			}
		}
		return json({ error: 'Failed to seed demo account', details, version: '2' }, { status: 500 });
	}
};
