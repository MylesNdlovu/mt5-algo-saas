import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate comprehensive user insights including trading performance,
 * behavior metrics, engagement scoring, and churn risk prediction
 */
export async function calculateUserInsights(userId: string) {
	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				trades: {
					orderBy: { closeTime: 'desc' }
				},
				mt5Accounts: true,
				eas: true
			}
		});

		if (!user) {
			throw new Error('User not found');
		}

		// Trading Performance Metrics
		const closedTrades = user.trades.filter((t: any) => t.isClosed);
		const winningTrades = closedTrades.filter((t: any) => (t.profit || 0) > 0);
		const losingTrades = closedTrades.filter((t: any) => (t.profit || 0) < 0);
		
		const winRate = closedTrades.length > 0 
			? winningTrades.length / closedTrades.length 
			: 0;

		const totalProfit = closedTrades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
		const avgProfitPerTrade = closedTrades.length > 0 
			? totalProfit / closedTrades.length 
			: 0;

		const grossProfit = winningTrades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
		const grossLoss = Math.abs(losingTrades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0));
		const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 10 : 0;

		// Calculate max drawdown
		let peak = 0;
		let maxDrawdown = 0;
		let runningBalance = 0;
		
		closedTrades.forEach((trade: any) => {
			runningBalance += trade.profit || 0;
			if (runningBalance > peak) {
				peak = runningBalance;
			}
			const drawdown = peak - runningBalance;
			if (drawdown > maxDrawdown) {
				maxDrawdown = drawdown;
			}
		});

		// Sharpe Ratio (simplified - assumes risk-free rate of 2%)
		const returns = closedTrades.map((t: any) => (t.profit || 0));
		const avgReturn = returns.length > 0 
			? returns.reduce((sum: number, r: number) => sum + r, 0) / returns.length 
			: 0;
		const stdDev = Math.sqrt(
			returns.reduce((sum: number, r: number) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
		);
		const sharpeRatio = stdDev > 0 ? (avgReturn - 0.02) / stdDev : 0;

		// Behavior Metrics
		const tradingDays = new Set(
			closedTrades.map((t: any) => t.closeTime?.toISOString().split('T')[0])
		).size;

		const avgTradesPerDay = tradingDays > 0 ? closedTrades.length / tradingDays : 0;

		// Calculate consecutive wins/losses
		let consecutiveWins = 0;
		let consecutiveLosses = 0;
		let currentWinStreak = 0;
		let currentLossStreak = 0;

		closedTrades.forEach((trade: any) => {
			if ((trade.profit || 0) > 0) {
				currentWinStreak++;
				currentLossStreak = 0;
				consecutiveWins = Math.max(consecutiveWins, currentWinStreak);
			} else {
				currentLossStreak++;
				currentWinStreak = 0;
				consecutiveLosses = Math.max(consecutiveLosses, currentLossStreak);
			}
		});

		// Days since last trade
		const lastTrade = closedTrades[0];
		const daysSinceLastTrade = lastTrade 
			? Math.floor((Date.now() - (lastTrade.closeTime?.getTime() || 0)) / (1000 * 60 * 60 * 24))
			: 999;

		// Risk Level Assessment
		let riskLevel = 'LOW';
		if (maxDrawdown > 5000 || consecutiveLosses > 5) {
			riskLevel = 'HIGH';
		} else if (maxDrawdown > 2000 || consecutiveLosses > 3) {
			riskLevel = 'MEDIUM';
		}

		// Business Metrics
		const accountAge = Math.floor(
			(Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
		);

		const lifetimeValue = (user.monthlyFee || 0) * Math.min(accountAge / 30, 12);
		const totalRevenue = (user.monthlyFee || 0) * (accountAge / 30);

		// Churn Risk Prediction (0-1 scale)
		let churnRisk = 0;
		
		// Factors that increase churn risk:
		if (daysSinceLastTrade > 30) churnRisk += 0.3;
		else if (daysSinceLastTrade > 14) churnRisk += 0.15;
		
		if (consecutiveLosses > 5) churnRisk += 0.25;
		else if (consecutiveLosses > 3) churnRisk += 0.1;
		
		if (profitFactor < 1) churnRisk += 0.2;
		
		const lastLoginDays = user.lastLoginAt 
			? Math.floor((Date.now() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
			: 999;
		if (lastLoginDays > 14) churnRisk += 0.25;

		churnRisk = Math.min(churnRisk, 1.0);

		// Engagement Score (0-1 scale)
		let engagementScore = 0;
		
		if (lastLoginDays < 1) engagementScore += 0.25;
		else if (lastLoginDays < 7) engagementScore += 0.15;
		
		if (daysSinceLastTrade < 7) engagementScore += 0.3;
		else if (daysSinceLastTrade < 14) engagementScore += 0.15;
		
		if (avgTradesPerDay > 5) engagementScore += 0.25;
		else if (avgTradesPerDay > 2) engagementScore += 0.15;
		
		if (user.mt5Accounts.length > 0) engagementScore += 0.1;
		if (user.eas.length > 0) engagementScore += 0.1;

		engagementScore = Math.min(engagementScore, 1.0);

		// Retention Probability (inverse of churn risk with engagement boost)
		const retentionProbability = Math.min(
			(1 - churnRisk) * (0.7 + engagementScore * 0.3),
			1.0
		);

		// Upsell Probability
		let upsellProbability = 0;
		
		if (profitFactor > 2) upsellProbability += 0.3;
		else if (profitFactor > 1.5) upsellProbability += 0.15;
		
		if (totalProfit > 10000) upsellProbability += 0.25;
		else if (totalProfit > 5000) upsellProbability += 0.15;
		
		if (engagementScore > 0.7) upsellProbability += 0.25;
		
		if (user.subscriptionTier === 'FREE' || user.subscriptionTier === 'TRIAL') {
			upsellProbability += 0.2;
		}

		upsellProbability = Math.min(upsellProbability, 1.0);

		// Predicted Next Action
		let predictedNextAction = 'CONTINUE_TRADING';
		if (churnRisk > 0.7) {
			predictedNextAction = 'LIKELY_TO_CHURN';
		} else if (upsellProbability > 0.6) {
			predictedNextAction = 'READY_FOR_UPGRADE';
		} else if (daysSinceLastTrade > 7) {
			predictedNextAction = 'NEEDS_ENGAGEMENT';
		}

		// Create or update UserInsight
		const insight = await prisma.userInsight.upsert({
			where: { userId },
			create: {
				userId,
				winRate,
				avgProfitPerTrade,
				profitFactor,
				maxDrawdown,
				sharpeRatio,
				tradingDaysActive: tradingDays,
				avgTradesPerDay,
				consecutiveWins,
				consecutiveLosses,
				daysSinceLastTrade,
				riskLevel,
				lifetimeValue,
				totalRevenue,
				churnRisk,
				engagementScore,
				retentionProbability,
				upsellProbability,
				predictedNextAction
			},
			update: {
				winRate,
				avgProfitPerTrade,
				profitFactor,
				maxDrawdown,
				sharpeRatio,
				tradingDaysActive: tradingDays,
				avgTradesPerDay,
				consecutiveWins,
				consecutiveLosses,
				daysSinceLastTrade,
				riskLevel,
				lifetimeValue,
				totalRevenue,
				churnRisk,
				engagementScore,
				retentionProbability,
				upsellProbability,
				predictedNextAction,
				updatedAt: new Date()
			}
		});

		return insight;
	} catch (error) {
		console.error(`Error calculating insights for user ${userId}:`, error);
		throw error;
	}
}

/**
 * Calculate insights for all users
 */
export async function calculateAllUserInsights() {
	const users = await prisma.user.findMany({
		select: { id: true }
	});

	const results = {
		success: 0,
		failed: 0,
		errors: [] as string[]
	};

	for (const user of users) {
		try {
			await calculateUserInsights(user.id);
			results.success++;
		} catch (error) {
			results.failed++;
			results.errors.push(`User ${user.id}: ${error}`);
		}
	}

	return results;
}

/**
 * Get users at high churn risk
 */
export async function getHighChurnRiskUsers(threshold = 0.7) {
	return prisma.userInsight.findMany({
		where: {
			churnRisk: {
				gte: threshold
			}
		},
		include: {
			user: {
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					subscriptionTier: true,
					monthlyFee: true
				}
			}
		},
		orderBy: {
			churnRisk: 'desc'
		}
	});
}

/**
 * Get users ready for upsell
 */
export async function getUpsellReadyUsers(threshold = 0.6) {
	return prisma.userInsight.findMany({
		where: {
			upsellProbability: {
				gte: threshold
			}
		},
		include: {
			user: {
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					subscriptionTier: true,
					totalProfit: true,
					totalTrades: true
				}
			}
		},
		orderBy: {
			upsellProbability: 'desc'
		}
	});
}
