import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, cookies }) => {
	const { agentId } = params;
	
	// Check authentication
	const session = cookies.get('session');
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// TODO: Replace with actual Prisma query
	// const trades = await prisma.agentTrade.findMany({
	//   where: { agentId },
	//   orderBy: { closeTime: 'desc' },
	//   take: 100
	// });

	// Mock trade history data
	const trades = [
		{
			id: 'trade-1',
			agentId,
			ticket: 123456789,
			symbol: 'XAUUSD',
			type: 'BUY',
			volume: 0.5,
			openPrice: 2035.45,
			closePrice: 2040.20,
			openTime: new Date(Date.now() - 7200000).toISOString(),
			closeTime: new Date(Date.now() - 3600000).toISOString(),
			profit: 237.50,
			indicatorSignal: 'GREEN',
			atrValue: 12.5,
			successful: true
		},
		{
			id: 'trade-2',
			agentId,
			ticket: 123456790,
			symbol: 'XAUUSD',
			type: 'SELL',
			volume: 0.3,
			openPrice: 2038.80,
			closePrice: 2035.10,
			openTime: new Date(Date.now() - 10800000).toISOString(),
			closeTime: new Date(Date.now() - 7200000).toISOString(),
			profit: 111.00,
			indicatorSignal: 'GREEN',
			atrValue: 11.8,
			successful: true
		},
		{
			id: 'trade-3',
			agentId,
			ticket: 123456791,
			symbol: 'XAUUSD',
			type: 'BUY',
			volume: 0.2,
			openPrice: 2036.20,
			closePrice: 2034.50,
			openTime: new Date(Date.now() - 14400000).toISOString(),
			closeTime: new Date(Date.now() - 10800000).toISOString(),
			profit: -34.00,
			indicatorSignal: 'ORANGE',
			atrValue: 15.2,
			successful: false
		},
		{
			id: 'trade-4',
			agentId,
			ticket: 123456792,
			symbol: 'XAUUSD',
			type: 'SELL',
			volume: 0.4,
			openPrice: 2039.90,
			closePrice: 2036.40,
			openTime: new Date(Date.now() - 18000000).toISOString(),
			closeTime: new Date(Date.now() - 14400000).toISOString(),
			profit: 140.00,
			indicatorSignal: 'GREEN',
			atrValue: 10.9,
			successful: true
		},
		{
			id: 'trade-5',
			agentId,
			ticket: 123456793,
			symbol: 'XAUUSD',
			type: 'BUY',
			volume: 0.1,
			openPrice: 2032.15,
			closePrice: 2030.80,
			openTime: new Date(Date.now() - 21600000).toISOString(),
			closeTime: new Date(Date.now() - 18000000).toISOString(),
			profit: -13.50,
			indicatorSignal: 'RED',
			atrValue: 18.5,
			successful: false
		}
	];

	return json({ trades });
};
