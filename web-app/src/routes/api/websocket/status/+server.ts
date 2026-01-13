import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { wsServer } from '$lib/server/websocket-server';
import { agentManager } from '$lib/server/agent-manager';

/**
 * GET /api/websocket/status
 *
 * Returns the current WebSocket server status and connection statistics.
 * Useful for monitoring and admin dashboard.
 */
export const GET: RequestHandler = async ({ cookies }) => {
	// Check authentication
	const session = cookies.get('session');
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const serverStatus = wsServer.getStatus();
	const stats = agentManager.getStats();

	return json({
		server: {
			running: serverStatus.running,
			port: serverStatus.port,
		},
		connections: {
			totalAgents: stats.totalConnected,
			totalUsers: stats.totalUsers,
			pendingCommands: stats.pendingCommands,
			adminDashboards: stats.adminConnections,
		},
		timestamp: Date.now(),
	});
};
