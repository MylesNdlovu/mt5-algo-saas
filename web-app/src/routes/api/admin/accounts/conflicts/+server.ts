import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { getAllConflicts } from '$lib/server/account-validator';

/**
 * ADMIN ONLY: Get all account conflicts for technical monitoring
 * Shows full technical details about which agents are trying to control same accounts
 */
export const GET: RequestHandler = async ({ cookies }) => {
	const sessionUser = getSessionUser(cookies);

	if (!sessionUser) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// GUARD: Admin and Super Admin only
	if (sessionUser.role !== 'ADMIN' && sessionUser.role !== 'SUPER_ADMIN') {
		return json(
			{
				error: 'Access denied. This endpoint is only available to administrators.'
			},
			{ status: 403 }
		);
	}

	try {
		const conflicts = await getAllConflicts();

		return json({
			success: true,
			conflicts: conflicts.map((conflict) => ({
				accountNumber: conflict.accountNumber,
				conflictingSince: conflict.agents[0]?.assignedAt,
				agentCount: conflict.agents.length,
				agents: conflict.agents.map((a) => ({
					agentId: a.agentId,
					assignedAt: a.assignedAt
				})),
				accountDetails: conflict.accountDetails
					? {
							id: conflict.accountDetails.id,
							userId: conflict.accountDetails.userId,
							balance: conflict.accountDetails.balance,
							status: conflict.accountDetails.status
					  }
					: null
			})),
			totalConflicts: conflicts.length,
			checkedAt: new Date().toISOString()
		});
	} catch (error) {
		console.error('[Admin Conflicts API] Error fetching conflicts:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch account conflicts'
			},
			{ status: 500 }
		);
	}
};
