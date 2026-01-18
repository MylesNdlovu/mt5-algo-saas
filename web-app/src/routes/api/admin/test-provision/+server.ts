import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';

/**
 * POST /api/admin/test-provision
 * Test endpoint to trigger MT5 provisioning on an agent
 *
 * This queues a provision_mt5 command with the provided credentials.
 * The agent will download, install, and configure MT5 terminal.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        // Verify admin authentication
        if (!locals.user || (locals.user.role !== 'ADMIN' && locals.user.role !== 'SUPER_ADMIN')) {
            return json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { apiKey, broker, serverName, login, password, accountNumber } = body;

        if (!apiKey) {
            return json({ error: 'apiKey is required' }, { status: 400 });
        }

        // Find agent by API key
        const agent = await db.agent.findUnique({
            where: { apiKey },
            select: { id: true, vpsName: true, status: true }
        });

        if (!agent) {
            return json({ error: 'Agent not found with this API key' }, { status: 404 });
        }

        // Create provision_mt5 command
        const command = await db.agentCommand.create({
            data: {
                agentId: agent.id,
                command: 'provision_mt5',
                mt5AccountNumber: accountNumber || null,
                payload: {
                    broker: broker || 'PrimeXBT',
                    serverName: serverName || 'PrimeXBT-Demo',
                    login: login || accountNumber || '1156599',
                    password: password || '',  // User must provide password
                    accountNumber: accountNumber || '1156599'
                },
                priority: 10,  // High priority
                status: 'pending',
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),  // 10 min expiry
                createdBy: locals.user.userId,
            }
        });

        return json({
            success: true,
            message: `provision_mt5 command queued for agent ${agent.vpsName || agent.id}`,
            commandId: command.id,
            agentId: agent.id,
            note: 'Agent will poll for this command within 2 seconds'
        });

    } catch (error) {
        console.error('Error creating provision command:', error);
        return json({ error: 'Failed to create provision command' }, { status: 500 });
    }
};

/**
 * GET /api/admin/test-provision
 * Get agent info by API key for testing
 */
export const GET: RequestHandler = async ({ url, locals }) => {
    try {
        // Verify admin authentication
        if (!locals.user || (locals.user.role !== 'ADMIN' && locals.user.role !== 'SUPER_ADMIN')) {
            return json({ error: 'Admin access required' }, { status: 403 });
        }

        const apiKey = url.searchParams.get('apiKey');

        if (!apiKey) {
            // Return all agents with their IDs
            const agents = await db.agent.findMany({
                select: {
                    id: true,
                    apiKey: true,
                    vpsName: true,
                    status: true,
                    lastHeartbeat: true,
                    isPoolAgent: true
                },
                orderBy: { lastHeartbeat: 'desc' }
            });
            return json({ agents });
        }

        const agent = await db.agent.findUnique({
            where: { apiKey },
            select: {
                id: true,
                vpsName: true,
                status: true,
                lastHeartbeat: true,
                isPoolAgent: true,
                managedAccounts: true
            }
        });

        if (!agent) {
            return json({ error: 'Agent not found' }, { status: 404 });
        }

        // Get recent commands for this agent
        const recentCommands = await db.agentCommand.findMany({
            where: { agentId: agent.id },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        return json({ agent, recentCommands });

    } catch (error) {
        console.error('Error fetching agent:', error);
        return json({ error: 'Failed to fetch agent' }, { status: 500 });
    }
};
