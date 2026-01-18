import { json, type RequestHandler } from '@sveltejs/kit';
import prisma from '$lib/server/db';

/**
 * Command Queue API - Uses existing AgentCommand model
 *
 * POST /api/commands - Create a new command (from web app)
 * GET /api/commands?apiKey=xxx - Poll for pending commands (from agent)
 * PATCH /api/commands - Mark command as completed (from agent)
 *
 * LATENCY: Agent polls every 2 seconds → average command latency = 1-2 seconds
 */

// GET: Agent polls for pending commands
export const GET: RequestHandler = async ({ url }) => {
	const apiKey = url.searchParams.get('apiKey');

	if (!apiKey) {
		return json({ error: 'API key required' }, { status: 400 });
	}

	// Validate agent
	const agent = await prisma.agent.findUnique({
		where: { apiKey },
		select: { id: true, managedAccounts: true }
	});

	if (!agent) {
		return json({ error: 'Invalid API key' }, { status: 401 });
	}

	// Get pending commands for this agent, ordered by priority and creation time
	const commands = await prisma.agentCommand.findMany({
		where: {
			agentId: agent.id,
			status: 'pending',
			OR: [
				{ expiresAt: null },
				{ expiresAt: { gt: new Date() } }
			]
		},
		orderBy: [
			{ priority: 'desc' },
			{ createdAt: 'asc' }
		],
		take: 10
	});

	// Mark as processing
	if (commands.length > 0) {
		await prisma.agentCommand.updateMany({
			where: {
				id: { in: commands.map(c => c.id) }
			},
			data: {
				status: 'processing',
				processedAt: new Date()
			}
		});
	}

	// Update agent heartbeat
	await prisma.agent.update({
		where: { id: agent.id },
		data: { lastHeartbeat: new Date() }
	});

	return json({
		commands: commands.map(c => ({
			id: c.id,
			command: c.command,
			accountId: c.mt5AccountNumber,
			payload: c.payload,
			priority: c.priority,
			createdAt: c.createdAt.toISOString()
		})),
		polledAt: new Date().toISOString()
	});
};

// POST: Web app creates a command
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Check authentication (user must be logged in)
		const session = locals.session;
		if (!session?.userId) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { command, accountId, payload, priority = 0 } = body;

		if (!command || !accountId) {
			return json({ error: 'command and accountId required' }, { status: 400 });
		}

		// Validate command type
		const validCommands = ['start_ea', 'stop_ea', 'pause_ea', 'restart_terminal', 'update_settings', 'sync_trades'];
		if (!validCommands.includes(command.toLowerCase())) {
			return json({ error: `Invalid command. Valid: ${validCommands.join(', ')}` }, { status: 400 });
		}

		// Verify user owns this account
		const mt5Account = await prisma.mT5Account.findFirst({
			where: {
				accountNumber: accountId,
				userId: session.userId
			}
		});

		if (!mt5Account) {
			return json({ error: 'Account not found or not owned by user' }, { status: 404 });
		}

		// Find the agent managing this account
		const assignment = await prisma.mT5AccountAssignment.findUnique({
			where: { mt5AccountNumber: accountId },
			select: { agentId: true }
		});

		if (!assignment) {
			return json({ error: 'No agent assigned to this account' }, { status: 404 });
		}

		// Create command with 5-minute expiry
		const agentCommand = await prisma.agentCommand.create({
			data: {
				agentId: assignment.agentId,
				mt5AccountNumber: accountId,
				command: command.toLowerCase(),
				payload: payload || {},
				priority,
				status: 'pending',
				expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
				createdBy: session.userId
			}
		});

		return json({
			success: true,
			commandId: agentCommand.id,
			message: 'Command queued',
			estimatedLatency: '1-3 seconds'
		});
	} catch (error) {
		console.error('[Commands] Error creating command:', error);
		return json({ error: 'Failed to create command' }, { status: 500 });
	}
};

// PATCH: Agent reports command result
export const PATCH: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { apiKey, commandId, success, result, error } = body;

		if (!apiKey || !commandId) {
			return json({ error: 'apiKey and commandId required' }, { status: 400 });
		}

		// Validate agent
		const agent = await prisma.agent.findUnique({
			where: { apiKey },
			select: { id: true }
		});

		if (!agent) {
			return json({ error: 'Invalid API key' }, { status: 401 });
		}

		// Get current command to calculate latency
		const currentCommand = await prisma.agentCommand.findUnique({
			where: { id: commandId },
			select: { createdAt: true, command: true }
		});

		if (!currentCommand) {
			return json({ error: 'Command not found' }, { status: 404 });
		}

		// Update command
		const updatedCommand = await prisma.agentCommand.update({
			where: { id: commandId },
			data: {
				status: success ? 'completed' : 'failed',
				result: result || null,
				errorMessage: error || null,
				completedAt: new Date()
			}
		});

		// Calculate latency
		const latencyMs = updatedCommand.completedAt!.getTime() - currentCommand.createdAt.getTime();

		console.log(`[Commands] ${currentCommand.command} ${success ? 'completed' : 'failed'} in ${latencyMs}ms`);

		return json({
			success: true,
			latencyMs
		});
	} catch (error) {
		console.error('[Commands] Error updating command:', error);
		return json({ error: 'Failed to update command' }, { status: 500 });
	}
};
