import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
const LEADERBOARD_FILE = path.join(process.cwd(), 'data', 'leaderboard.json');

export interface User {
	id: string;
	email: string;
	passwordHash: string;
	firstName: string;
	lastName: string;
	role: 'ADMIN' | 'USER';
	phone?: string;
	
	// Subscription
	subscriptionTier: 'FREE' | 'TRIAL' | 'BASIC' | 'PREMIUM' | 'VIP';
	subscriptionStart?: string;
	subscriptionEnd?: string;
	monthlyFee: number;
	
	// Trading Stats
	totalTrades: number;
	winningTrades: number;
	losingTrades: number;
	totalProfit: number;
	totalVolume: number;
	
	// System
	createdAt: string;
	updatedAt: string;
	lastLoginAt?: string;
	lastActiveAt?: string;
	isActive: boolean;
	status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
}

export interface LeaderboardEntry {
	id: string;
	userId: string;
	userName: string;
	period: 'daily' | 'weekly' | 'monthly';
	periodDate: string;
	trades: number;
	winningTrades: number;
	losingTrades: number;
	profit: number;
	volume: number;
	winRate: number;
	rank?: number;
	previousRank?: number;
	createdAt: string;
	updatedAt: string;
}

// Ensure data directory exists
function ensureDataDir() {
	const dataDir = path.join(process.cwd(), 'data');
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}
}

// Load users from file
export function loadUsers(): User[] {
	ensureDataDir();
	
	if (!fs.existsSync(USERS_FILE)) {
		// Create with admin user
		const adminUser: User = {
			id: uuidv4(),
			email: 'admin@scalperium.com',
			passwordHash: 'Admin123!', // In production, this should be hashed
			firstName: 'Admin',
			lastName: 'User',
			role: 'ADMIN',
			subscriptionTier: 'VIP',
			monthlyFee: 0,
			totalTrades: 0,
			winningTrades: 0,
			losingTrades: 0,
			totalProfit: 0,
			totalVolume: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			isActive: true,
			status: 'ACTIVE'
		};
		saveUsers([adminUser]);
		return [adminUser];
	}
	
	try {
		const data = fs.readFileSync(USERS_FILE, 'utf-8');
		return JSON.parse(data);
	} catch (error) {
		console.error('Error loading users:', error);
		return [];
	}
}

// Save users to file
export function saveUsers(users: User[]): void {
	ensureDataDir();
	try {
		fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
	} catch (error) {
		console.error('Error saving users:', error);
		throw error;
	}
}

// Get user by email
export function getUserByEmail(email: string): User | undefined {
	const users = loadUsers();
	return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

// Get user by ID
export function getUserById(userId: string): User | undefined {
	const users = loadUsers();
	return users.find(u => u.id === userId);
}

// Create new user
export function createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
	const users = loadUsers();
	
	// Check if email exists
	if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
		throw new Error('Email already exists');
	}
	
	const newUser: User = {
		...userData,
		id: uuidv4(),
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};
	
	users.push(newUser);
	saveUsers(users);
	return newUser;
}

// Update user
export function updateUser(userId: string, updates: Partial<User>): User {
	const users = loadUsers();
	const index = users.findIndex(u => u.id === userId);
	
	if (index === -1) {
		throw new Error('User not found');
	}
	
	users[index] = {
		...users[index],
		...updates,
		updatedAt: new Date().toISOString()
	};
	
	saveUsers(users);
	return users[index];
}

// Update user trading stats
export function updateUserTradingStats(
	userId: string,
	trades: number,
	winningTrades: number,
	losingTrades: number,
	profit: number,
	volume: number
): User {
	const users = loadUsers();
	const index = users.findIndex(u => u.id === userId);
	
	if (index === -1) {
		throw new Error('User not found');
	}
	
	users[index].totalTrades += trades;
	users[index].winningTrades += winningTrades;
	users[index].losingTrades += losingTrades;
	users[index].totalProfit += profit;
	users[index].totalVolume += volume;
	users[index].updatedAt = new Date().toISOString();
	
	saveUsers(users);
	return users[index];
}

// Get all active traders (excluding admins)
export function getActiveTraders(): User[] {
	const users = loadUsers();
	return users.filter(u => u.role === 'USER' && u.isActive && u.status === 'ACTIVE');
}

// LEADERBOARD FUNCTIONS

// Load leaderboard entries
export function loadLeaderboard(): LeaderboardEntry[] {
	ensureDataDir();
	
	if (!fs.existsSync(LEADERBOARD_FILE)) {
		return [];
	}
	
	try {
		const data = fs.readFileSync(LEADERBOARD_FILE, 'utf-8');
		return JSON.parse(data);
	} catch (error) {
		console.error('Error loading leaderboard:', error);
		return [];
	}
}

// Save leaderboard entries
export function saveLeaderboard(entries: LeaderboardEntry[]): void {
	ensureDataDir();
	try {
		fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(entries, null, 2), 'utf-8');
	} catch (error) {
		console.error('Error saving leaderboard:', error);
		throw error;
	}
}

// Get period start date
function getPeriodStartDate(period: 'daily' | 'weekly' | 'monthly', date: Date = new Date()): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	
	if (period === 'daily') {
		return d;
	} else if (period === 'weekly') {
		const day = d.getDay();
		const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
		return new Date(d.setDate(diff));
	} else {
		// monthly
		return new Date(d.getFullYear(), d.getMonth(), 1);
	}
}

// Update leaderboard entry
export function updateLeaderboardEntry(
	userId: string,
	userName: string,
	period: 'daily' | 'weekly' | 'monthly',
	trades: number,
	winningTrades: number,
	losingTrades: number,
	profit: number,
	volume: number
): LeaderboardEntry {
	const entries = loadLeaderboard();
	const periodDate = getPeriodStartDate(period).toISOString();
	
	const existingIndex = entries.findIndex(
		e => e.userId === userId && e.period === period && e.periodDate === periodDate
	);
	
	const winRate = trades > 0 ? (winningTrades / trades) * 100 : 0;
	
	if (existingIndex >= 0) {
		// Update existing
		entries[existingIndex].trades += trades;
		entries[existingIndex].winningTrades += winningTrades;
		entries[existingIndex].losingTrades += losingTrades;
		entries[existingIndex].profit += profit;
		entries[existingIndex].volume += volume;
		entries[existingIndex].winRate = entries[existingIndex].trades > 0 
			? (entries[existingIndex].winningTrades / entries[existingIndex].trades) * 100 
			: 0;
		entries[existingIndex].updatedAt = new Date().toISOString();
		
		saveLeaderboard(entries);
		return entries[existingIndex];
	} else {
		// Create new entry
		const newEntry: LeaderboardEntry = {
			id: uuidv4(),
			userId,
			userName,
			period,
			periodDate,
			trades,
			winningTrades,
			losingTrades,
			profit,
			volume,
			winRate,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		
		entries.push(newEntry);
		saveLeaderboard(entries);
		return newEntry;
	}
}

// Calculate and update rankings
export function calculateRankings(period: 'daily' | 'weekly' | 'monthly'): LeaderboardEntry[] {
	const entries = loadLeaderboard();
	const periodDate = getPeriodStartDate(period).toISOString();
	
	// Filter entries for this period
	const periodEntries = entries.filter(e => e.period === period && e.periodDate === periodDate);
	
	// Sort by profit descending
	periodEntries.sort((a, b) => b.profit - a.profit);
	
	// Update rankings
	periodEntries.forEach((entry, index) => {
		const entryIndex = entries.findIndex(e => e.id === entry.id);
		if (entryIndex >= 0) {
			entries[entryIndex].previousRank = entries[entryIndex].rank;
			entries[entryIndex].rank = index + 1;
			entries[entryIndex].updatedAt = new Date().toISOString();
		}
	});
	
	saveLeaderboard(entries);
	return periodEntries;
}

// Get leaderboard for period
export function getLeaderboard(
	period: 'daily' | 'weekly' | 'monthly',
	limit: number = 100
): LeaderboardEntry[] {
	const periodDate = getPeriodStartDate(period).toISOString();
	const entries = loadLeaderboard();
	
	return entries
		.filter(e => e.period === period && e.periodDate === periodDate)
		.sort((a, b) => b.profit - a.profit)
		.slice(0, limit);
}

// Get user's leaderboard position
export function getUserLeaderboardPosition(
	userId: string,
	period: 'daily' | 'weekly' | 'monthly'
): LeaderboardEntry | null {
	const periodDate = getPeriodStartDate(period).toISOString();
	const entries = loadLeaderboard();
	
	return entries.find(
		e => e.userId === userId && e.period === period && e.periodDate === periodDate
	) || null;
}

// Sync user stats to leaderboard (should be called periodically)
export function syncUserStatsToLeaderboard(): void {
	const users = getActiveTraders();
	
	users.forEach(user => {
		const userName = `${user.firstName} ${user.lastName}`;
		
		// Update all periods with current stats
		// In a real system, you'd track incremental changes
		['daily', 'weekly', 'monthly'].forEach(period => {
			updateLeaderboardEntry(
				user.id,
				userName,
				period as 'daily' | 'weekly' | 'monthly',
				user.totalTrades,
				user.winningTrades,
				user.losingTrades,
				user.totalProfit,
				user.totalVolume
			);
		});
	});
	
	// Calculate rankings for all periods
	calculateRankings('daily');
	calculateRankings('weekly');
	calculateRankings('monthly');
}

// Seed demo users with trading data
export function seedDemoUsers(): void {
	const users = loadUsers();
	
	// Only seed if we don't have demo users
	if (users.length > 1) return;
	
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
	
	demoUsers.forEach(demo => {
		createUser({
			email: demo.email,
			passwordHash: 'Demo123!',
			firstName: demo.firstName,
			lastName: demo.lastName,
			role: 'USER',
			subscriptionTier: 'PREMIUM',
			monthlyFee: 99,
			totalTrades: demo.totalTrades,
			winningTrades: demo.winningTrades,
			losingTrades: demo.losingTrades,
			totalProfit: demo.totalProfit,
			totalVolume: demo.totalVolume,
			isActive: true,
			status: 'ACTIVE'
		});
	});
	
	// Sync to leaderboard
	syncUserStatsToLeaderboard();
}
