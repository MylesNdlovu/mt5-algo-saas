import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import prisma from '$lib/server/db';
import { agentManager } from '$lib/server/agent-manager';
import { sendAgentCommand, isAgentConnected } from '$lib/server/websocket-server';
import { ServerMessageType } from '$lib/types/websocket';

/**
 * POST /api/agents/[agentId]/command
 *
 * Send a command to a specific agent via WebSocket for low-latency execution.
 * Returns the command result or an error if the agent is not connected.
 */
export const POST: RequestHandler = async ({ params, request, cookies, locals }) => {
	const { agentId } = params;

	// Check authentication
	const session = cookies.get('session');
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Parse request body
	let body: { command: string; params?: Record<string, unknown> };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { command, params: commandParams } = body;

	// Validate command
	const validCommands = ['start_ea', 'stop_ea', 'pause_ea', 'load_ea', 'update_settings', 'sync_trades'];
	if (!validCommands.includes(command)) {
		return json({ error: `Invalid command: ${command}` }, { status: 400 });
	}

	// Check if agent exists
	const agent = await prisma.agent.findUnique({
		where: { id: agentId },
		select: { id: true, userId: true, status: true },
	});

	if (!agent) {
		return json({ error: 'Agent not found' }, { status: 404 });
	}

	// Check if agent is connected via WebSocket
	if (!isAgentConnected(agentId)) {
		return json(
			{
				success: false,
				error: 'Agent not connected',
				message: 'The agent is currently offline. Please wait for it to reconnect.',
			},
			{ status: 503 }
		);
	}

	// Map command string to ServerMessageType
	const commandTypeMap: Record<string, ServerMessageType> = {
		start_ea: ServerMessageType.START_EA,
		stop_ea: ServerMessageType.STOP_EA,
		pause_ea: ServerMessageType.PAUSE_EA,
		load_ea: ServerMessageType.LOAD_EA,
		update_settings: ServerMessageType.UPDATE_SETTINGS,
		sync_trades: ServerMessageType.SYNC_TRADES,
	};

	const startTime = Date.now();

	try {
		// Send command via WebSocket and wait for response
		const result = await sendAgentCommand(
			agentId,
			commandTypeMap[command],
			commandParams,
			30000 // 30 second timeout
		);

		const latencyMs = Date.now() - startTime;

		// Log command to system log
		await prisma.systemLog.create({
			data: {
				level: 'INFO',
				component: 'WEBSOCKET',
				message: `Command ${command} executed successfully`,
				metadata: {
					agentId,
					command,
					params: commandParams,
					latencyMs,
					triggeredBy: locals.user?.userId || 'unknown',
				} as object,
			},
		});

		console.log(`[API] Command ${command} sent to agent ${agentId} (${latencyMs}ms)`);

		return json({
			success: true,
			message: `Command ${command} executed successfully`,
			result,
			latencyMs,
		});
	} catch (error) {
		const latencyMs = Date.now() - startTime;
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		// Log error to system log
		await prisma.systemLog.create({
			data: {
				level: 'ERROR',
				component: 'WEBSOCKET',
				message: `Command ${command} failed`,
				metadata: {
					agentId,
					command,
					params: commandParams,
					error: errorMessage,
					latencyMs,
					triggeredBy: locals.user?.userId || 'unknown',
				} as object,
			},
		});

		console.error(`[API] Command ${command} failed for agent ${agentId}:`, errorMessage);

		return json(
			{
				success: false,
				error: errorMessage,
				latencyMs,
			},
			{ status: 500 }
		);
	}
};
