import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import prisma from '$lib/server/db';
import { agentManager } from '$lib/server/agent-manager';

/**
 * GET /api/agents
 *
 * Returns all agents with real-time WebSocket connection status merged with database info.
 * Optimized to combine in-memory WebSocket state with persisted database data.
 */
export const GET: RequestHandler = async ({ cookies }) => {
	// Check admin authentication
	const session = cookies.get('session');
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Get all agents from database
		const dbAgents = await prisma.agent.findMany({
			include: {
				user: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
					},
				},
				masterAgent: {
					select: {
						id: true,
						machineId: true,
					},
				},
				slaveAgents: {
					select: {
						id: true,
					},
				},
			},
			orderBy: {
				lastHeartbeat: 'desc',
			},
		});

		// Get all connected agents from WebSocket server
		const connectedAgents = agentManager.getAllAgents();
		const connectedAgentIds = new Set(connectedAgents.map((a) => a.id));

		// Merge database info with real-time WebSocket state
		const agents = dbAgents.map((dbAgent) => {
			const wsAgent = connectedAgents.find((a) => a.id === dbAgent.id);
			const isConnected = connectedAgentIds.has(dbAgent.id);

			return {
				id: dbAgent.id,
				machineId: dbAgent.machineId,
				machineName: dbAgent.machineName,

				// Use real-time status from WebSocket if connected
				status: isConnected ? wsAgent?.status || 'online' : dbAgent.status,
				lastHeartbeat: isConnected
					? new Date(wsAgent?.lastHeartbeat || Date.now()).toISOString()
					: dbAgent.lastHeartbeat?.toISOString() || null,

				// MT5 Info
				mt5Account: dbAgent.mt5AccountNumber,
				mt5Broker: dbAgent.mt5Broker,
				mt5ServerName: dbAgent.mt5ServerName,
				mt5Version: dbAgent.mt5Version,

				// User Info
				userId: dbAgent.userId,
				userName: dbAgent.user
					? `${dbAgent.user.firstName} ${dbAgent.user.lastName}`
					: null,
				userEmail: dbAgent.user?.email || null,

				// EA Status - use real-time from WebSocket if available
				eaLoaded: isConnected
					? wsAgent?.eaStatus?.loaded ?? dbAgent.eaLoaded
					: dbAgent.eaLoaded,
				eaRunning: isConnected
					? wsAgent?.eaStatus?.running ?? dbAgent.eaRunning
					: dbAgent.eaRunning,
				eaName: isConnected
					? wsAgent?.eaStatus?.name || dbAgent.eaName
					: dbAgent.eaName,
				chartSymbol: isConnected
					? wsAgent?.eaStatus?.symbol || dbAgent.chartSymbol
					: dbAgent.chartSymbol,
				chartTimeframe: isConnected
					? wsAgent?.eaStatus?.timeframe || dbAgent.chartTimeframe
					: dbAgent.chartTimeframe,

				// Trade Copier
				tradeCopierActive: dbAgent.tradeCopierActive,
				isMasterAccount: dbAgent.isMasterAccount,
				masterAccountId: dbAgent.masterAgentId,
				slavesCount: dbAgent.slaveAgents.length,

				// Performance Stats
				totalTrades: dbAgent.totalTrades,
				profitableTrades: dbAgent.profitableTrades,
				losingTrades: dbAgent.losingTrades,
				totalProfit: dbAgent.totalProfit,
				winRate: dbAgent.winRate,

				// AI Optimization
				indicatorSettings: dbAgent.indicatorSettings,
				aiOptimizationScore: dbAgent.aiOptimizationScore,
				lastOptimized: dbAgent.lastOptimizedAt?.toISOString() || null,

				// Account Info from WebSocket (real-time)
				accountInfo: isConnected ? wsAgent?.accountInfo : null,

				// System Info
				osVersion: dbAgent.osVersion,
				agentVersion: dbAgent.agentVersion,
				connectedAt: isConnected
					? new Date(wsAgent?.connectedAt || 0).toISOString()
					: dbAgent.connectedAt?.toISOString() || null,
			};
		});

		// Also return connection statistics
		const stats = agentManager.getStats();

		return json({
			agents,
			stats: {
				totalAgents: dbAgents.length,
				connectedAgents: stats.totalConnected,
				activeUsers: stats.totalUsers,
				adminConnections: stats.adminConnections,
			},
		});
	} catch (error) {
		console.error('[API] Failed to get agents:', error);
		return json({ error: 'Failed to retrieve agents' }, { status: 500 });
	}
};
