import { json, type RequestHandler } from '@sveltejs/kit';
import prisma from '$lib/server/db';

interface TradeData {
	ticket: string;
	symbol: string;
	type: string;
	volume: number;
	openPrice: number;
	openTime: string;
	closePrice?: number;
	closeTime?: string;
	profit: number;
	commission: number;
	swap: number;
	magicNumber?: number;
	comment?: string;
	isClosed: boolean;
}

interface WebhookPayload {
	accountId: string;
	apiKey: string;
	trades: TradeData[];
	timestamp: string;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const payload: WebhookPayload = await request.json();
		const { accountId, apiKey, trades, timestamp } = payload;

		if (!accountId || !apiKey || !trades) {
			return json({ error: 'Missing required fields: accountId, apiKey, trades' }, { status: 400 });
		}

		// Validate API key belongs to a registered agent
		const agent = await prisma.agent.findUnique({
			where: { apiKey },
			select: { id: true, userId: true, status: true }
		});

		if (!agent) {
			return json({ error: 'Invalid API key' }, { status: 401 });
		}

		// Find the MT5 account
		const mt5Account = await prisma.mT5Account.findUnique({
			where: { accountNumber: accountId },
			select: { id: true, userId: true }
		});

		if (!mt5Account) {
			return json({ error: 'MT5 account not found' }, { status: 404 });
		}

		// Process trades
		let created = 0;
		let updated = 0;
		let closed = 0;

		for (const trade of trades) {
			const existingTrade = await prisma.trade.findUnique({
				where: { ticket: trade.ticket }
			});

			if (existingTrade) {
				// Update existing trade
				await prisma.trade.update({
					where: { ticket: trade.ticket },
					data: {
						profit: trade.profit,
						commission: trade.commission,
						swap: trade.swap,
						closePrice: trade.closePrice,
						closeTime: trade.closeTime ? new Date(trade.closeTime) : undefined,
						isClosed: trade.isClosed
					}
				});
				updated++;
				if (trade.isClosed && !existingTrade.isClosed) {
					closed++;
				}
			} else {
				// Create new trade
				await prisma.trade.create({
					data: {
						userId: mt5Account.userId,
						mt5AccountId: mt5Account.id,
						ticket: trade.ticket,
						symbol: trade.symbol,
						type: trade.type,
						volume: trade.volume,
						openPrice: trade.openPrice,
						openTime: new Date(trade.openTime),
						closePrice: trade.closePrice,
						closeTime: trade.closeTime ? new Date(trade.closeTime) : undefined,
						profit: trade.profit,
						commission: trade.commission,
						swap: trade.swap,
						magicNumber: trade.magicNumber,
						comment: trade.comment,
						isClosed: trade.isClosed
					}
				});
				created++;
			}
		}

		// Update user stats if trades were closed
		if (closed > 0) {
			const closedTrades = trades.filter(t => t.isClosed);
			const totalProfit = closedTrades.reduce((sum, t) => sum + t.profit, 0);
			const wins = closedTrades.filter(t => t.profit > 0).length;
			const losses = closedTrades.filter(t => t.profit <= 0).length;
			const totalVolume = closedTrades.reduce((sum, t) => sum + t.volume, 0);

			await prisma.user.update({
				where: { id: mt5Account.userId },
				data: {
					totalTrades: { increment: closed },
					winningTrades: { increment: wins },
					losingTrades: { increment: losses },
					totalProfit: { increment: totalProfit },
					totalVolume: { increment: totalVolume }
				}
			});
		}

		// Update agent last activity
		await prisma.agent.update({
			where: { id: agent.id },
			data: { lastHeartbeat: new Date() }
		});

		console.log(`[Webhook] Trades synced for ${accountId}: ${created} created, ${updated} updated, ${closed} closed`);

		return json({
			success: true,
			created,
			updated,
			closed,
			receivedAt: new Date().toISOString()
		});
	} catch (error) {
		console.error('[Webhook] Error processing trades:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

// GET endpoint to fetch trades for an account (for the web app)
export const GET: RequestHandler = async ({ url }) => {
	try {
		const accountId = url.searchParams.get('accountId');
		const status = url.searchParams.get('status'); // 'open' | 'closed' | 'all'
		const limit = parseInt(url.searchParams.get('limit') || '100');

		if (!accountId) {
			return json({ error: 'accountId required' }, { status: 400 });
		}

		const mt5Account = await prisma.mT5Account.findUnique({
			where: { accountNumber: accountId },
			select: { id: true }
		});

		if (!mt5Account) {
			return json({ error: 'Account not found' }, { status: 404 });
		}

		const where: { mt5AccountId: string; isClosed?: boolean } = {
			mt5AccountId: mt5Account.id
		};

		if (status === 'open') where.isClosed = false;
		if (status === 'closed') where.isClosed = true;

		const trades = await prisma.trade.findMany({
			where,
			orderBy: { openTime: 'desc' },
			take: limit
		});

		return json({
			trades,
			count: trades.length,
			accountId
		});
	} catch (error) {
		console.error('[Webhook] Error fetching trades:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
