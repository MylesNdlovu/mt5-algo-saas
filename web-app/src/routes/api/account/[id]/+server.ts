import { json } from '@sveltejs/kit';

// Mock trading data
const mockAccountData = {
	account: {
		id: 1,
		number: '50012345',
		broker: 'Exness',
		balance: 15750.50,
		equity: 16234.75,
		margin: 2500.00,
		freeMargin: 13734.75,
		marginLevel: 649.39,
		currency: 'USD',
		leverage: '1:500',
		server: 'ExnessEU-Real3',
		status: 'connected'
	},
	openTrades: [
		{
			id: 1,
			ticket: '987654321',
			symbol: 'XAUUSD',
			type: 'BUY',
			volume: 0.5,
			openPrice: 2045.30,
			currentPrice: 2048.75,
			sl: 2040.00,
			tp: 2055.00,
			profit: 172.50,
			openTime: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
			commission: -8.50,
			swap: -2.30
		},
		{
			id: 2,
			ticket: '987654322',
			symbol: 'XAUUSD',
			type: 'SELL',
			volume: 0.3,
			openPrice: 2050.80,
			currentPrice: 2048.75,
			sl: 2055.00,
			tp: 2045.00,
			profit: 61.50,
			openTime: new Date(Date.now() - 3600000 * 1).toISOString(), // 1 hour ago
			commission: -5.10,
			swap: -1.20
		},
		{
			id: 3,
			ticket: '987654323',
			symbol: 'XAUUSD',
			type: 'BUY',
			volume: 1.0,
			openPrice: 2047.50,
			currentPrice: 2048.75,
			sl: 2042.00,
			tp: 2058.00,
			profit: 125.00,
			openTime: new Date(Date.now() - 3600000 * 0.5).toISOString(), // 30 min ago
			commission: -17.00,
			swap: -0.50
		}
	],
	closedTrades: [
		{
			id: 101,
			ticket: '987654301',
			symbol: 'XAUUSD',
			type: 'BUY',
			volume: 0.5,
			openPrice: 2040.20,
			closePrice: 2048.50,
			profit: 415.00,
			openTime: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
			closeTime: new Date(Date.now() - 86400000 * 1 + 7200000).toISOString(), // closed 2h later
			commission: -8.50,
			swap: -3.20
		},
		{
			id: 102,
			ticket: '987654302',
			symbol: 'XAUUSD',
			type: 'SELL',
			volume: 0.8,
			openPrice: 2052.00,
			closePrice: 2049.30,
			profit: 216.00,
			openTime: new Date(Date.now() - 86400000 * 2).toISOString(),
			closeTime: new Date(Date.now() - 86400000 * 2 + 10800000).toISOString(),
			commission: -13.60,
			swap: -5.40
		},
		{
			id: 103,
			ticket: '987654303',
			symbol: 'XAUUSD',
			type: 'BUY',
			volume: 0.3,
			openPrice: 2043.80,
			closePrice: 2041.50,
			profit: -69.00,
			openTime: new Date(Date.now() - 86400000 * 3).toISOString(),
			closeTime: new Date(Date.now() - 86400000 * 3 + 5400000).toISOString(),
			commission: -5.10,
			swap: -2.10
		},
		{
			id: 104,
			ticket: '987654304',
			symbol: 'XAUUSD',
			type: 'SELL',
			volume: 1.2,
			openPrice: 2055.50,
			closePrice: 2048.20,
			profit: 876.00,
			openTime: new Date(Date.now() - 86400000 * 4).toISOString(),
			closeTime: new Date(Date.now() - 86400000 * 4 + 14400000).toISOString(),
			commission: -20.40,
			swap: -8.60
		},
		{
			id: 105,
			ticket: '987654305',
			symbol: 'XAUUSD',
			type: 'BUY',
			volume: 0.7,
			openPrice: 2038.90,
			closePrice: 2046.70,
			profit: 546.00,
			openTime: new Date(Date.now() - 86400000 * 5).toISOString(),
			closeTime: new Date(Date.now() - 86400000 * 5 + 18000000).toISOString(),
			commission: -11.90,
			swap: -6.30
		}
	],
	stats: {
		totalTrades: 8,
		winningTrades: 6,
		losingTrades: 2,
		winRate: 75.0,
		totalProfit: 2357.20,
		totalLoss: -69.00,
		netProfit: 2288.20,
		avgWin: 392.87,
		avgLoss: -69.00,
		profitFactor: 34.16,
		todayProfit: 359.00,
		weekProfit: 1438.50,
		monthProfit: 2288.20
	},
	botStatus: {
		isActive: true,
		mode: 'auto',
		signalStrength: 'strong',
		lastSignal: new Date(Date.now() - 900000).toISOString(), // 15 min ago
		tradesExecutedToday: 12,
		successRate: 83.3
	}
};

export const GET = async () => {
	try {
		// Simulate API delay
		await new Promise(resolve => setTimeout(resolve, 300));

		return json(mockAccountData);
	} catch (error) {
		console.error('Account data error:', error);
		return json({ error: 'Failed to fetch account data' }, { status: 500 });
	}
};
