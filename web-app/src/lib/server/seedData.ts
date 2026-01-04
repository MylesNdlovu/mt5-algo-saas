import { loadUsers, saveUsers, loadLeaderboard, saveLeaderboard } from './userStorage';
import { v4 as uuidv4 } from 'uuid';

// Initialize demo data function (can be called from API)
export async function initializeDemoData() {
	const users = loadUsers();
	
	// Only seed if we have just the admin
	if (users.length > 1) {
		return { success: true, message: 'Demo data already exists' };
	}
	
	const demoUsers = [
		{
			email: 'john.trader@example.com',
			firstName: 'John',
			lastName: 'Trader',
			totalTrades: 150,
			winningTrades: 95,
			losingTrades: 55,
			totalProfit: 15420.50,
			totalVolume: 45.5
		},
		{
			email: 'sarah.smith@example.com',
			firstName: 'Sarah',
			lastName: 'Smith',
			totalTrades: 120,
			winningTrades: 85,
			losingTrades: 35,
			totalProfit: 12890.75,
			totalVolume: 38.2
		},
		{
			email: 'mike.pro@example.com',
			firstName: 'Mike',
			lastName: 'Pro',
			totalTrades: 200,
			winningTrades: 130,
			losingTrades: 70,
			totalProfit: 18500.00,
			totalVolume: 62.8
		},
		{
			email: 'emma.forex@example.com',
			firstName: 'Emma',
			lastName: 'Forex',
			totalTrades: 90,
			winningTrades: 65,
			losingTrades: 25,
			totalProfit: 9850.25,
			totalVolume: 28.4
		},
		{
			email: 'david.gold@example.com',
			firstName: 'David',
			lastName: 'Gold',
			totalTrades: 180,
			winningTrades: 110,
			losingTrades: 70,
			totalProfit: 14200.00,
			totalVolume: 52.1
		}
	];
	
	const newUsers = demoUsers.map(demo => ({
		id: uuidv4(),
		email: demo.email,
		passwordHash: 'Demo123!',
		firstName: demo.firstName,
		lastName: demo.lastName,
		role: 'USER' as const,
		subscriptionTier: 'PREMIUM' as const,
		monthlyFee: 99,
		totalTrades: demo.totalTrades,
		winningTrades: demo.winningTrades,
		losingTrades: demo.losingTrades,
		totalProfit: demo.totalProfit,
		totalVolume: demo.totalVolume,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		isActive: true,
		status: 'ACTIVE' as const
	}));
	
	users.push(...newUsers);
	saveUsers(users);
	
	// Create leaderboard entries
	const leaderboard = loadLeaderboard();
	const now = new Date();
	const periodDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
	
	['daily', 'weekly', 'monthly'].forEach(period => {
		newUsers.forEach(user => {
			leaderboard.push({
				id: uuidv4(),
				userId: user.id,
				userName: `${user.firstName} ${user.lastName}`,
				period: period as any,
				periodDate,
				trades: user.totalTrades,
				winningTrades: user.winningTrades,
				losingTrades: user.losingTrades,
				profit: user.totalProfit,
				volume: user.totalVolume,
				winRate: user.totalTrades > 0 ? (user.winningTrades / user.totalTrades) * 100 : 0,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		});
	});
	
	// Calculate rankings
	['daily', 'weekly', 'monthly'].forEach(period => {
		const periodEntries = leaderboard
			.filter(e => e.period === period && e.periodDate === periodDate)
			.sort((a, b) => b.profit - a.profit);
		
		periodEntries.forEach((entry, index) => {
			entry.rank = index + 1;
		});
	});
	
	saveLeaderboard(leaderboard);
	
	return {
		success: true,
		message: 'Demo data initialized successfully',
		usersCreated: newUsers.length
	};
}
