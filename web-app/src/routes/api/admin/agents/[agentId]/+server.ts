import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';

/**
 * GET /api/admin/agents/[agentId]
 * Get details about a specific agent
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user || (locals.user.role !== 'ADMIN' && locals.user.role !== 'SUPER_ADMIN')) {
			return json({ error: 'Admin access required' }, { status: 403 });
		}

		const { agentId } = params;

		const agent = await db.agent.findUnique({
			where: { id: agentId },
			include: {
				accountAssignments: {
					include: {
						user: {
							select: {
								id: true,
								email: true,
								firstName: true,
								lastName: true
							}
						}
					}
				}
			}
		});

		if (!agent) {
			return json({ error: 'Agent not found' }, { status: 404 });
		}

		return json({ agent });

	} catch (error) {
		console.error('Error fetching agent:', error);
		return json({ error: 'Failed to fetch agent' }, { status: 500 });
	}
};

/**
 * DELETE /api/admin/agents/[agentId]
 * Delete an agent (Admin only)
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user || (locals.user.role !== 'ADMIN' && locals.user.role !== 'SUPER_ADMIN')) {
			return json({ error: 'Admin access required' }, { status: 403 });
		}

		const { agentId } = params;

		// Check if agent exists
		const agent = await db.agent.findUnique({
			where: { id: agentId },
			include: {
				accountAssignments: true
			}
		});

		if (!agent) {
			return json({ error: 'Agent not found' }, { status: 404 });
		}

		// Check if agent has active assignments
		if (agent.accountAssignments.length > 0) {
			return json({
				error: 'Cannot delete agent with active account assignments. Remove assignments first.',
				assignmentCount: agent.accountAssignments.length
			}, { status: 400 });
		}

		// Delete agent commands first
		await db.agentCommand.deleteMany({
			where: { agentId }
		});

		// Delete the agent
		await db.agent.delete({
			where: { id: agentId }
		});

		return json({
			success: true,
			message: `Agent ${agent.vpsName} deleted successfully`
		});

	} catch (error) {
		console.error('Error deleting agent:', error);
		return json({ error: 'Failed to delete agent' }, { status: 500 });
	}
};

/**
 * PATCH /api/admin/agents/[agentId]
 * Update agent settings
 */
export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	try {
		if (!locals.user || (locals.user.role !== 'ADMIN' && locals.user.role !== 'SUPER_ADMIN')) {
			return json({ error: 'Admin access required' }, { status: 403 });
		}

		const { agentId } = params;
		const body = await request.json();
		const { vpsName, vpsRegion, maxCapacity, isActive } = body;

		const agent = await db.agent.findUnique({
			where: { id: agentId }
		});

		if (!agent) {
			return json({ error: 'Agent not found' }, { status: 404 });
		}

		const updated = await db.agent.update({
			where: { id: agentId },
			data: {
				...(vpsName && { vpsName }),
				...(vpsRegion && { vpsRegion }),
				...(maxCapacity && { maxCapacity }),
				...(typeof isActive === 'boolean' && { isActive })
			}
		});

		return json({
			success: true,
			agent: updated
		});

	} catch (error) {
		console.error('Error updating agent:', error);
		return json({ error: 'Failed to update agent' }, { status: 500 });
	}
};
