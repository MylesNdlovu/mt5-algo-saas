import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';

/**
 * POST /api/admin/agents/[agentId]/command
 * Send a command to an agent (Admin only)
 *
 * Commands are queued in the database and the agent polls for them.
 * This is secure - no need to expose VPS ports.
 */
export const POST: RequestHandler = async ({ request, params, locals }) => {
    try {
        // Verify admin authentication
        if (!locals.user || (locals.user.role !== 'ADMIN' && locals.user.role !== 'SUPER_ADMIN')) {
            return json({ error: 'Admin access required' }, { status: 403 });
        }

        const { agentId } = params;
        const body = await request.json();
        const { command, mt5AccountNumber, payload, priority, expiresInSeconds } = body;

        // Validate command
        const validCommands = [
            'start_ea',
            'stop_ea',
            'restart_terminal',
            'update_settings',
            'sync_trades',
            'provision_account',
            'remove_account',
            'get_status',
            'update_indicator_settings'
        ];

        if (!command || !validCommands.includes(command)) {
            return json({
                error: 'Invalid command',
                validCommands
            }, { status: 400 });
        }

        // Verify agent exists
        const agent = await db.agent.findUnique({
            where: { id: agentId },
            select: { id: true, vpsName: true, status: true }
        });

        if (!agent) {
            return json({ error: 'Agent not found' }, { status: 404 });
        }

        // Calculate expiry time (default 5 minutes)
        const expiresAt = expiresInSeconds
            ? new Date(Date.now() + expiresInSeconds * 1000)
            : new Date(Date.now() + 5 * 60 * 1000);

        // Create the command
        const agentCommand = await db.agentCommand.create({
            data: {
                agentId,
                command,
                mt5AccountNumber: mt5AccountNumber || null,
                payload: payload || null,
                priority: priority || 0,
                status: 'pending',
                expiresAt,
                createdBy: locals.user.userId,
                ipAddress: request.headers.get('x-forwarded-for') ||
                           request.headers.get('x-real-ip') ||
                           'unknown'
            }
        });

        return json({
            success: true,
            commandId: agentCommand.id,
            message: `Command '${command}' queued for agent ${agent.vpsName || agentId}`,
            expiresAt: agentCommand.expiresAt
        });

    } catch (error) {
        console.error('Error creating agent command:', error);
        return json({ error: 'Failed to create command' }, { status: 500 });
    }
};

/**
 * GET /api/admin/agents/[agentId]/command
 * Get command history for an agent (Admin only)
 */
export const GET: RequestHandler = async ({ params, locals, url }) => {
    try {
        if (!locals.user || (locals.user.role !== 'ADMIN' && locals.user.role !== 'SUPER_ADMIN')) {
            return json({ error: 'Admin access required' }, { status: 403 });
        }

        const { agentId } = params;
        const status = url.searchParams.get('status'); // pending, completed, failed
        const limit = parseInt(url.searchParams.get('limit') || '50');

        const commands = await db.agentCommand.findMany({
            where: {
                agentId,
                ...(status ? { status } : {})
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        return json({ commands });

    } catch (error) {
        console.error('Error fetching agent commands:', error);
        return json({ error: 'Failed to fetch commands' }, { status: 500 });
    }
};
