import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This will be connected to Prisma database
// For now, mock data structure

export const GET: RequestHandler = async ({ cookies }) => {
	// Check admin authentication
	const session = cookies.get('session');
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// TODO: Replace with actual Prisma query
	// const agents = await prisma.agent.findMany({
	//   include: {
	//     user: true,
	//     eaDeployment: true,
	//     masterAccount: true,
	//     slaveAccounts: true
	//   }
	// });

	// Mock data for now
	const agents = [
		{
			id: 'agent-1',
			machineId: 'WIN-DESKTOP-001',
			status: 'online',
			lastHeartbeat: new Date().toISOString(),
			mt5Account: '12345678',
			mt5Broker: 'Exness',
			mt5Version: '5.0.3815',
			userId: 'user-1',
			userName: 'John Smith',
			userEmail: 'john@example.com',
			
			eaLoaded: true,
			eaRunning: true,
			eaName: 'Gold Scalper Pro',
			chartSymbol: 'XAUUSD',
			chartTimeframe: 'M5',
			
			tradeCopierActive: false,
			isMasterAccount: true,
			masterAccountId: null,
			slavesCount: 3,
			
			totalTrades: 245,
			profitableTrades: 178,
			losingTrades: 67,
			totalProfit: 8450.50,
			winRate: 72.7,
			
			indicatorSettings: {
				atrPeriod: 14,
				atrMultiplier: 2.0,
				greenThreshold: 0.8,
				orangeThreshold: 0.5,
				redThreshold: 0.3
			},
			
			aiOptimizationScore: 0.85,
			lastOptimized: new Date(Date.now() - 86400000 * 3).toISOString()
		},
		{
			id: 'agent-2',
			machineId: 'WIN-VPS-002',
			status: 'online',
			lastHeartbeat: new Date().toISOString(),
			mt5Account: '87654321',
			mt5Broker: 'FTMO',
			mt5Version: '5.0.3815',
			userId: 'user-2',
			userName: 'Sarah Johnson',
			userEmail: 'sarah@example.com',
			
			eaLoaded: true,
			eaRunning: false,
			eaName: 'Gold Scalper Pro',
			chartSymbol: 'XAUUSD',
			chartTimeframe: 'M5',
			
			tradeCopierActive: true,
			isMasterAccount: false,
			masterAccountId: 'agent-1',
			slavesCount: 0,
			
			totalTrades: 189,
			profitableTrades: 134,
			losingTrades: 55,
			totalProfit: 5230.75,
			winRate: 70.9,
			
			indicatorSettings: null,
			aiOptimizationScore: 0,
			lastOptimized: null
		},
		{
			id: 'agent-3',
			machineId: 'WIN-LAPTOP-003',
			status: 'offline',
			lastHeartbeat: new Date(Date.now() - 3600000).toISOString(),
			mt5Account: '11223344',
			mt5Broker: 'IC Markets',
			mt5Version: '5.0.3700',
			userId: null,
			userName: null,
			userEmail: null,
			
			eaLoaded: false,
			eaRunning: false,
			eaName: null,
			chartSymbol: null,
			chartTimeframe: null,
			
			tradeCopierActive: false,
			isMasterAccount: false,
			masterAccountId: null,
			slavesCount: 0,
			
			totalTrades: 0,
			profitableTrades: 0,
			losingTrades: 0,
			totalProfit: 0,
			winRate: 0,
			
			indicatorSettings: null,
			aiOptimizationScore: 0,
			lastOptimized: null
		}
	];

	return json({ agents });
};
