import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';
import { randomUUID } from 'crypto';

/**
 * POST /api/admin/agents/register
 * Register a new pool agent (VPS) and generate API key
 * Must be called BEFORE deploying to VPS
 *
 * This creates the Agent record in the database with an API key.
 * The VPS installer uses this API key to authenticate.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        // Verify admin authentication
        if (!locals.user || (locals.user.role !== 'ADMIN' && locals.user.role !== 'SUPER_ADMIN')) {
            return json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const {
            vpsName,
            vpsRegion,
            maxCapacity = 50,
            vpsIp
        } = body;

        // Validate required fields
        if (!vpsName) {
            return json({ error: 'VPS name is required' }, { status: 400 });
        }

        // Check if VPS name already exists
        const existingAgent = await db.agent.findFirst({
            where: { vpsName }
        });

        if (existingAgent) {
            return json({
                error: `Agent with name '${vpsName}' already exists`,
                existingAgentId: existingAgent.id
            }, { status: 409 });
        }

        // Generate unique API key and machine ID placeholder
        const apiKey = `sk_agent_${randomUUID().replace(/-/g, '')}`;
        const machineId = `pending_${randomUUID().substring(0, 8)}`; // Will be replaced on first connection

        // Create the agent record
        const agent = await db.agent.create({
            data: {
                machineId,
                machineName: vpsName,
                isPoolAgent: true,
                vpsName,
                vpsRegion: vpsRegion || null,
                vpsIp: vpsIp || null,
                maxCapacity,
                currentLoad: 0,
                status: 'offline', // Will become 'online' when agent connects
                apiKey,
                agentVersion: '1.0.0'
            }
        });

        return json({
            success: true,
            agent: {
                id: agent.id,
                vpsName: agent.vpsName,
                vpsRegion: agent.vpsRegion,
                maxCapacity: agent.maxCapacity,
                apiKey: agent.apiKey, // Show this ONCE - user must copy it
                status: agent.status
            },
            instructions: {
                step1: 'Copy the API key above - it will only be shown once',
                step2: 'Transfer scalperium-bundle.zip to VPS',
                step3: 'Run the installer and paste the API key when prompted',
                step4: 'Agent will appear as "online" once connected'
            }
        });

    } catch (error) {
        console.error('Error registering agent:', error);
        return json({ error: 'Failed to register agent' }, { status: 500 });
    }
};

/**
 * GET /api/admin/agents/register
 * List all registered agents with status
 */
export const GET: RequestHandler = async ({ locals }) => {
    try {
        if (!locals.user || (locals.user.role !== 'ADMIN' && locals.user.role !== 'SUPER_ADMIN')) {
            return json({ error: 'Admin access required' }, { status: 403 });
        }

        const agents = await db.agent.findMany({
            where: { isPoolAgent: true },
            select: {
                id: true,
                vpsName: true,
                vpsRegion: true,
                vpsIp: true,
                maxCapacity: true,
                currentLoad: true,
                status: true,
                lastHeartbeat: true,
                connectedAt: true,
                agentVersion: true,
                cpuUsage: true,
                memoryUsage: true,
                mt5InstanceCount: true,
                managedAccounts: true,
                createdAt: true
                // Note: apiKey is NOT returned for security
            },
            orderBy: { createdAt: 'desc' }
        });

        return json({
            agents,
            summary: {
                total: agents.length,
                online: agents.filter(a => a.status === 'online').length,
                offline: agents.filter(a => a.status === 'offline').length,
                totalCapacity: agents.reduce((sum, a) => sum + a.maxCapacity, 0),
                totalLoad: agents.reduce((sum, a) => sum + a.currentLoad, 0)
            }
        });

    } catch (error) {
        console.error('Error listing agents:', error);
        return json({ error: 'Failed to list agents' }, { status: 500 });
    }
};
