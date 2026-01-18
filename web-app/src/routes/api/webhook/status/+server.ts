import { json, type RequestHandler } from '@sveltejs/kit';
import prisma from '$lib/server/db';

interface StatusPayload {
	apiKey: string;
	accountId?: string;
	// Agent status
	status?: 'online' | 'offline' | 'error';
	// EA status
	eaStatus?: 'running' | 'stopped' | 'paused' | 'error';
	eaName?: string;
	eaLoaded?: boolean;
	eaRunning?: boolean;
	// Account info
	balance?: number;
	equity?: number;
	margin?: number;
	freeMargin?: number;
	profit?: number;
	// Chart info
	chartSymbol?: string;
	chartTimeframe?: string;
	// Safety indicator
	safetyIndicator?: 'GREEN' | 'YELLOW' | 'RED';
	indicatorScore?: number;
	// System info
	cpuUsage?: number;
	memoryUsage?: number;
	mt5Connected?: boolean;
	timestamp: string;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const payload: StatusPayload = await request.json();
		const { apiKey, accountId, timestamp, ...statusData } = payload;

		if (!apiKey) {
			return json({ error: 'API key required' }, { status: 400 });
		}

		// Validate API key
		const agent = await prisma.agent.findUnique({
			where: { apiKey },
			select: { id: true, userId: true }
		});

		if (!agent) {
			return json({ error: 'Invalid API key' }, { status: 401 });
		}

		// Update agent status
		const agentUpdate: Record<string, unknown> = {
			lastHeartbeat: new Date(),
			status: statusData.status || 'online'
		};

		if (statusData.cpuUsage !== undefined) agentUpdate.cpuUsage = statusData.cpuUsage;
		if (statusData.memoryUsage !== undefined) agentUpdate.memoryUsage = statusData.memoryUsage;
		if (statusData.eaLoaded !== undefined) agentUpdate.eaLoaded = statusData.eaLoaded;
		if (statusData.eaRunning !== undefined) agentUpdate.eaRunning = statusData.eaRunning;
		if (statusData.eaName) agentUpdate.eaName = statusData.eaName;
		if (statusData.chartSymbol) agentUpdate.chartSymbol = statusData.chartSymbol;
		if (statusData.chartTimeframe) agentUpdate.chartTimeframe = statusData.chartTimeframe;

		await prisma.agent.update({
			where: { id: agent.id },
			data: agentUpdate
		});

		// If account-specific status, update the MT5 account assignment
		if (accountId) {
			const assignment = await prisma.mT5AccountAssignment.findUnique({
				where: { mt5AccountNumber: accountId }
			});

			if (assignment) {
				const assignmentUpdate: Record<string, unknown> = {
					lastHeartbeat: new Date(),
					status: statusData.status || 'online'
				};

				if (statusData.eaStatus) assignmentUpdate.eaStatus = statusData.eaStatus;
				if (statusData.balance !== undefined) assignmentUpdate.balance = statusData.balance;
				if (statusData.equity !== undefined) assignmentUpdate.equity = statusData.equity;
				if (statusData.margin !== undefined) assignmentUpdate.margin = statusData.margin;
				if (statusData.freeMargin !== undefined) assignmentUpdate.freeMargin = statusData.freeMargin;
				if (statusData.profit !== undefined) assignmentUpdate.profit = statusData.profit;
				if (statusData.eaLoaded !== undefined) assignmentUpdate.eaLoaded = statusData.eaLoaded;
				if (statusData.eaRunning !== undefined) assignmentUpdate.eaRunning = statusData.eaRunning;
				if (statusData.eaName) assignmentUpdate.eaName = statusData.eaName;
				if (statusData.chartSymbol) assignmentUpdate.chartSymbol = statusData.chartSymbol;
				if (statusData.chartTimeframe) assignmentUpdate.chartTimeframe = statusData.chartTimeframe;
				if (statusData.safetyIndicator) assignmentUpdate.safetyIndicator = statusData.safetyIndicator;
				if (statusData.indicatorScore !== undefined) assignmentUpdate.indicatorScore = statusData.indicatorScore;

				await prisma.mT5AccountAssignment.update({
					where: { mt5AccountNumber: accountId },
					data: assignmentUpdate
				});
			}

			// Also update the MT5Account itself for balance/equity
			if (statusData.balance !== undefined || statusData.equity !== undefined) {
				const mt5Account = await prisma.mT5Account.findUnique({
					where: { accountNumber: accountId }
				});

				if (mt5Account) {
					await prisma.mT5Account.update({
						where: { accountNumber: accountId },
						data: {
							balance: statusData.balance ?? mt5Account.balance,
							equity: statusData.equity ?? mt5Account.equity
						}
					});
				}
			}
		}

		console.log(`[Webhook] Status updated for agent ${agent.id}${accountId ? ` (account: ${accountId})` : ''}`);

		return json({
			success: true,
			agentId: agent.id,
			receivedAt: new Date().toISOString()
		});
	} catch (error) {
		console.error('[Webhook] Error processing status:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
