import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'ADMIN') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const [totalUsers, activeAccounts, totalIBs, runningEAs, trades] = await Promise.all([
			db.user.count(),
			db.mT5Account.count({ where: { status: 'ACTIVE' } }),
			db.iB.count({ where: { isActive: true } }),
			db.mT5Account.count({ where: { eaStatus: 'RUNNING' } }),
			db.trade.findMany({ where: { isClosed: true } })
		]);

		const totalPL = trades.reduce((sum, trade) => sum + trade.profit + trade.commission + trade.swap, 0);

		return json({
			totalUsers,
			activeAccounts,
			totalIBs,
			runningEAs,
			totalPL
		});
	} catch (error) {
		console.error('Error fetching admin stats:', error);
		return json({ error: 'Failed to fetch stats' }, { status: 500 });
	}
};
