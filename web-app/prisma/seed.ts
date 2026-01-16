import { PrismaClient, UserRole, SubscriptionTier } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Starting database seed...');

	// Clean existing data (optional - comment out if you want to keep existing data)
	console.log('🗑️  Cleaning existing data...');
	await prisma.trade.deleteMany();
	await prisma.eA.deleteMany();
	await prisma.agent.deleteMany();
	await prisma.mT5Account.deleteMany();
	await prisma.automation.deleteMany();
	await prisma.notificationLog.deleteMany();
	await prisma.userInsight.deleteMany();
	await prisma.leaderboardEntry.deleteMany();
	await prisma.prize.deleteMany();
	await prisma.systemLog.deleteMany();
	await prisma.marketCondition.deleteMany();
	await prisma.user.deleteMany();
	await prisma.iBPartner.deleteMany();

	// ============================================================================
	// 1. Create IB Partners
	// ============================================================================
	console.log('👔 Creating IB Partners...');

	const ibPartner1 = await prisma.iBPartner.create({
		data: {
			email: 'contact@alphatrade.com',
			passwordHash: await bcrypt.hash('password123', 10),
			companyName: 'Alpha Trade Partners',
			contactName: 'John Anderson',
			ibCode: 'ALPHA2024',
			phone: '+1-555-0101',
			isActive: true,
			isApproved: true,
			pricingTier: 'tier2',
			monthlyFee: 4500.0,
			traderLimit: 1000,
			spreadRevShare: 50.0,
			logo: '/ib-logos/alpha-trade.png',
			brandColor: '#3B82F6',
			brandName: 'AlphaTrade'
		}
	});

	const ibPartner2 = await prisma.iBPartner.create({
		data: {
			email: 'info@goldking.io',
			passwordHash: await bcrypt.hash('password123', 10),
			companyName: 'Gold King Trading',
			contactName: 'Sarah Chen',
			ibCode: 'GOLDKING',
			phone: '+44-20-7123-4567',
			isActive: true,
			isApproved: true,
			pricingTier: 'tier3',
			monthlyFee: 8500.0,
			traderLimit: 2500,
			spreadRevShare: 50.0,
			logo: '/ib-logos/gold-king.png',
			brandColor: '#F59E0B',
			brandName: 'GoldKing'
		}
	});

	const ibPartner3 = await prisma.iBPartner.create({
		data: {
			email: 'admin@betafx.com',
			passwordHash: await bcrypt.hash('password123', 10),
			companyName: 'Beta FX Group',
			contactName: 'Michael Rodriguez',
			ibCode: 'BETAFX',
			phone: '+1-212-555-7890',
			isActive: false,
			isApproved: false, // Pending approval
			pricingTier: 'tier1',
			monthlyFee: 2500.0,
			traderLimit: 500,
			spreadRevShare: 50.0
		}
	});

	console.log(`✅ Created ${3} IB Partners`);

	// ============================================================================
	// 2. Create Admin Users
	// ============================================================================
	console.log('👑 Creating Admin Users...');

	const admin = await prisma.user.create({
		data: {
			email: 'admin@scalperium.com',
			passwordHash: await bcrypt.hash('admin123', 10),
			firstName: 'Super',
			lastName: 'Admin',
			role: UserRole.SUPER_ADMIN,
			phone: '+1-555-0001',
			isActive: true,
			subscriptionTier: SubscriptionTier.VIP,
			lastLoginAt: new Date()
		}
	});

	console.log('✅ Created Admin user');

	// ============================================================================
	// 2b. Create Simple Demo Users for Testing Role Permissions
	// ============================================================================
	console.log('🧪 Creating Demo Test Users...');

	// Simple TRADER role for testing (consolidated from USER)
	const demoUser = await prisma.user.create({
		data: {
			email: 'user@scalperium.com',
			passwordHash: await bcrypt.hash('user123', 10),
			firstName: 'Demo',
			lastName: 'User',
			role: UserRole.TRADER,
			phone: '+1-555-0002',
			isActive: true,
			subscriptionTier: SubscriptionTier.FREE,
			lastLoginAt: new Date()
		}
	});

	// Another TRADER for testing
	const demoTrader = await prisma.user.create({
		data: {
			email: 'trader@scalperium.com',
			passwordHash: await bcrypt.hash('trader123', 10),
			firstName: 'Demo',
			lastName: 'Trader',
			role: UserRole.TRADER,
			phone: '+1-555-0003',
			isActive: true,
			subscriptionTier: SubscriptionTier.PREMIUM,
			totalProfit: 5000.0,
			totalTrades: 50,
			winningTrades: 32,
			losingTrades: 18,
			lastLoginAt: new Date()
		}
	});

	// Simple IB Partner for testing
	const demoIB = await prisma.iBPartner.create({
		data: {
			email: 'ib@scalperium.com',
			passwordHash: await bcrypt.hash('ib123', 10),
			companyName: 'Demo IB Partners',
			contactName: 'Demo IB',
			ibCode: 'DEMOIB',
			phone: '+1-555-0004',
			isActive: true,
			isApproved: true,
			pricingTier: 'tier1',
			monthlyFee: 2500.0,
			traderLimit: 500,
			spreadRevShare: 50.0
		}
	});

	console.log('✅ Created Demo Test Users');

	// ============================================================================
	// 3. Create Regular Users (some under IB, some direct)
	// ============================================================================
	console.log('👥 Creating Regular Users...');

	// Users under Alpha Trade IB
	const user1 = await prisma.user.create({
		data: {
			email: 'james.wilson@email.com',
			passwordHash: await bcrypt.hash('password123', 10),
			firstName: 'James',
			lastName: 'Wilson',
			role: UserRole.TRADER,
			phone: '+1-555-1001',
			ibCode: 'ALPHA2024',
			ibPartner: {
				connect: { id: ibPartner1.id }
			},
			isActive: true,
			subscriptionTier: SubscriptionTier.PREMIUM,
			totalProfit: 12450.75,
			totalTrades: 156,
			winningTrades: 107, // ~68.5% win rate
			losingTrades: 49,
			lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
		}
	});

	const user2 = await prisma.user.create({
		data: {
			email: 'emily.davis@email.com',
			passwordHash: await bcrypt.hash('password123', 10),
			firstName: 'Emily',
			lastName: 'Davis',
			role: UserRole.TRADER,
			phone: '+1-555-1002',
			ibCode: 'ALPHA2024',
			ibPartner: {
				connect: { id: ibPartner1.id }
			},
			isActive: true,
			subscriptionTier: SubscriptionTier.PREMIUM,
			totalProfit: 8920.40,
			totalTrades: 89,
			winningTrades: 54, // ~61% win rate
			losingTrades: 35,
			lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
		}
	});

	// Users under Gold King IB
	const user3 = await prisma.user.create({
		data: {
			email: 'david.kim@email.com',
			passwordHash: await bcrypt.hash('password123', 10),
			firstName: 'David',
			lastName: 'Kim',
			role: UserRole.TRADER,
			phone: '+82-10-1234-5678',
			ibCode: 'GOLDKING',
			ibPartner: {
				connect: { id: ibPartner2.id }
			},
			isActive: true,
			subscriptionTier: SubscriptionTier.VIP,
			totalProfit: 45280.90,
			totalTrades: 342,
			winningTrades: 249, // ~72.8% win rate
			losingTrades: 93,
			lastLoginAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
		}
	});

	const user4 = await prisma.user.create({
		data: {
			email: 'sofia.martinez@email.com',
			passwordHash: await bcrypt.hash('password123', 10),
			firstName: 'Sofia',
			lastName: 'Martinez',
			role: UserRole.TRADER,
			phone: '+34-600-123-456',
			ibCode: 'GOLDKING',
			ibPartner: {
				connect: { id: ibPartner2.id }
			},
			isActive: true,
			subscriptionTier: SubscriptionTier.PREMIUM,
			totalProfit: 21340.60,
			totalTrades: 198,
			winningTrades: 130, // ~65.7% win rate
			losingTrades: 68,
			lastLoginAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago (inactive!)
		}
	});

	// Direct users (no IB)
	const user5 = await prisma.user.create({
		data: {
			email: 'alex.thompson@email.com',
			passwordHash: await bcrypt.hash('password123', 10),
			firstName: 'Alex',
			lastName: 'Thompson',
			role: UserRole.TRADER,
			phone: '+1-555-1005',
			isActive: true,
			subscriptionTier: SubscriptionTier.FREE,
			totalProfit: 1250.30,
			totalTrades: 23,
			winningTrades: 13, // ~58% win rate
			losingTrades: 10,
			lastLoginAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // 45 days ago (very inactive!)
		}
	});

	const user6 = await prisma.user.create({
		data: {
			email: 'maria.garcia@email.com',
			passwordHash: await bcrypt.hash('password123', 10),
			firstName: 'Maria',
			lastName: 'Garcia',
			role: UserRole.TRADER,
			phone: '+1-555-1006',
			isActive: true,
			subscriptionTier: SubscriptionTier.PREMIUM,
			totalProfit: 18750.20,
			totalTrades: 167,
			winningTrades: 112, // ~67% win rate
			losingTrades: 55,
			lastLoginAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
		}
	});

	console.log(`✅ Created ${6} Regular Users`);

	// ============================================================================
	// 4. Create MT5 Accounts
	// ============================================================================
	console.log('🏦 Creating MT5 Accounts...');

	const mt5Account1 = await prisma.mT5Account.create({
		data: {
			userId: user1.id,
			accountNumber: '50012345',
			serverName: 'Exness-MT5Real',
			broker: 'Exness',
			login: '50012345',
			status: 'ACTIVE',
			balance: 5000.0,
			equity: 5245.75,
			freeMargin: 4890.50,
			margin: 355.25
		}
	});

	const mt5Account2 = await prisma.mT5Account.create({
		data: {
			userId: user2.id,
			accountNumber: '50067890',
			serverName: 'Exness-MT5Real',
			broker: 'Exness',
			login: '50067890',
			status: 'ACTIVE',
			balance: 3000.0,
			equity: 3128.40,
			freeMargin: 2890.25,
			margin: 238.15
		}
	});

	const mt5Account3 = await prisma.mT5Account.create({
		data: {
			userId: user3.id,
			accountNumber: '50098765',
			serverName: 'Exness-MT5Real',
			broker: 'Exness',
			login: '50098765',
			status: 'ACTIVE',
			balance: 15000.0,
			equity: 18280.90,
			freeMargin: 16750.30,
			margin: 1530.60
		}
	});

	const mt5Account4 = await prisma.mT5Account.create({
		data: {
			userId: user4.id,
			accountNumber: '50045678',
			serverName: 'Exness-MT5Real',
			broker: 'Exness',
			login: '50045678',
			status: 'ACTIVE',
			balance: 8000.0,
			equity: 9340.60,
			freeMargin: 8590.80,
			margin: 749.80
		}
	});

	const mt5Account5 = await prisma.mT5Account.create({
		data: {
			userId: user5.id,
			accountNumber: '50023456',
			serverName: 'PrimeXBT-MT5',
			broker: 'PrimeXBT',
			login: '50023456',
			status: 'ACTIVE',
			balance: 1000.0,
			equity: 1150.30,
			freeMargin: 1090.50,
			margin: 59.80
		}
	});

	const mt5Account6 = await prisma.mT5Account.create({
		data: {
			userId: user6.id,
			accountNumber: '50087654',
			serverName: 'Exness-MT5Real',
			broker: 'Exness',
			login: '50087654',
			status: 'ACTIVE',
			balance: 10000.0,
			equity: 11750.20,
			freeMargin: 10640.75,
			margin: 1109.45
		}
	});

	// Demo User MT5 Account (1 account)
	const demoUserMT5 = await prisma.mT5Account.create({
		data: {
			userId: demoUser.id,
			accountNumber: '50099001',
			serverName: 'Exness-MT5Real',
			broker: 'Exness',
			login: '50099001',
			status: 'ACTIVE',
			balance: 2000.0,
			equity: 2050.0,
			freeMargin: 1950.0,
			margin: 100.0,
			isEnabledForTrading: true // Default enabled for demo
		}
	});

	// Demo Trader MT5 Accounts (4 accounts for multi-account testing)
	const demoTraderMT5_1 = await prisma.mT5Account.create({
		data: {
			userId: demoTrader.id,
			accountNumber: '50099101',
			serverName: 'Exness-MT5Real',
			broker: 'Exness',
			login: '50099101',
			status: 'ACTIVE',
			balance: 5000.0,
			equity: 5234.50,
			freeMargin: 4890.0,
			margin: 344.50,
			isEnabledForTrading: true // Enabled for demo
		}
	});

	const demoTraderMT5_2 = await prisma.mT5Account.create({
		data: {
			userId: demoTrader.id,
			accountNumber: '50099102',
			serverName: 'Exness-MT5Real',
			broker: 'Exness',
			login: '50099102',
			status: 'ACTIVE',
			balance: 3000.0,
			equity: 3145.75,
			freeMargin: 2890.0,
			margin: 255.75,
			isEnabledForTrading: true // Enabled for demo
		}
	});

	const demoTraderMT5_3 = await prisma.mT5Account.create({
		data: {
			userId: demoTrader.id,
			accountNumber: '50099103',
			serverName: 'PrimeXBT-MT5',
			broker: 'PrimeXBT',
			login: '50099103',
			status: 'ACTIVE',
			balance: 4500.0,
			equity: 4678.20,
			freeMargin: 4320.0,
			margin: 358.20,
			isEnabledForTrading: false // Disabled - user can enable to test
		}
	});

	const demoTraderMT5_4 = await prisma.mT5Account.create({
		data: {
			userId: demoTrader.id,
			accountNumber: '50099104',
			serverName: 'Exness-MT5Real',
			broker: 'Exness',
			login: '50099104',
			status: 'PENDING', // One pending account to test status filtering
			balance: 1000.0,
			equity: 1000.0,
			freeMargin: 1000.0,
			margin: 0.0,
			isEnabledForTrading: false
		}
	});

	console.log(`✅ Created ${11} MT5 Accounts (including demo users)`);

	// ============================================================================
	// 5. Create Agents (C# automation agents)
	// ============================================================================
	console.log('🤖 Creating Agents...');

	const agent1 = await prisma.agent.create({
		data: {
			userId: user1.id,
			machineId: 'VPS-US-EAST-01_trader',
			apiKey: 'agent-key-' + Math.random().toString(36).substring(7),
			mt5AccountNumber: '50012345',
			mt5Broker: 'Exness',
			mt5ServerName: 'Exness-MT5Real',
			status: 'online',
			eaLoaded: true,
			eaRunning: true,
			eaName: 'Gold Scalper Pro v2.1',
			lastHeartbeat: new Date(),
			connectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
			isMasterAccount: false,
			tradeCopierActive: false
		}
	});

	const agent2 = await prisma.agent.create({
		data: {
			userId: user2.id,
			machineId: 'VPS-US-EAST-02_trader',
			apiKey: 'agent-key-' + Math.random().toString(36).substring(7),
			mt5AccountNumber: '50067890',
			mt5Broker: 'Exness',
			mt5ServerName: 'Exness-MT5Real',
			status: 'online',
			eaLoaded: true,
			eaRunning: true,
			eaName: 'Gold Scalper Pro v2.1',
			lastHeartbeat: new Date(),
			connectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
			isMasterAccount: false,
			tradeCopierActive: false
		}
	});

	const agent3 = await prisma.agent.create({
		data: {
			userId: user3.id,
			machineId: 'VPS-ASIA-01_trader',
			apiKey: 'agent-key-' + Math.random().toString(36).substring(7),
			mt5AccountNumber: '50098765',
			mt5Broker: 'Exness',
			mt5ServerName: 'Exness-MT5Real',
			status: 'online',
			eaLoaded: true,
			eaRunning: true,
			eaName: 'Gold Scalper Pro v2.1',
			lastHeartbeat: new Date(),
			connectedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
			isMasterAccount: true, // This is the master account for trade copying
			tradeCopierActive: true
		}
	});

	const agent4 = await prisma.agent.create({
		data: {
			userId: user4.id,
			machineId: 'VPS-EU-01_trader',
			apiKey: 'agent-key-' + Math.random().toString(36).substring(7),
			mt5AccountNumber: '50045678',
			mt5Broker: 'Exness',
			mt5ServerName: 'Exness-MT5Real',
			status: 'offline',
			eaLoaded: false,
			eaRunning: false,
			eaName: 'Gold Scalper Pro v2.1',
			lastHeartbeat: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
			connectedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
			isMasterAccount: false,
			tradeCopierActive: false
		}
	});

	const agent5 = await prisma.agent.create({
		data: {
			userId: user5.id,
			machineId: 'VPS-US-WEST-01_trader',
			apiKey: 'agent-key-' + Math.random().toString(36).substring(7),
			mt5AccountNumber: '50023456',
			mt5Broker: 'PrimeXBT',
			mt5ServerName: 'PrimeXBT-MT5',
			status: 'error',
			eaLoaded: false,
			eaRunning: false,
			eaName: 'Gold Scalper Pro v2.1',
			lastHeartbeat: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
			isMasterAccount: false,
			tradeCopierActive: false
		}
	});

	const agent6 = await prisma.agent.create({
		data: {
			userId: user6.id,
			machineId: 'VPS-US-EAST-03_trader',
			apiKey: 'agent-key-' + Math.random().toString(36).substring(7),
			mt5AccountNumber: '50087654',
			mt5Broker: 'Exness',
			mt5ServerName: 'Exness-MT5Real',
			status: 'online',
			eaLoaded: true,
			eaRunning: true,
			eaName: 'Gold Scalper Pro v2.1',
			lastHeartbeat: new Date(),
			connectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
			isMasterAccount: false,
			tradeCopierActive: false
		}
	});

	console.log(`✅ Created ${6} Agents`);

	// ============================================================================
	// 6. Create Sample Trades
	// ============================================================================
	console.log('📊 Creating Sample Trades...');

	// Recent winning trade
	await prisma.trade.create({
		data: {
			userId: user1.id,
			mt5AccountId: mt5Account1.id,
			ticket: '123456789',
			symbol: 'XAUUSD',
			type: 'BUY',
			volume: 0.01,
			openPrice: 2045.50,
			closePrice: 2048.75,
			profit: 32.50,
			commission: -0.70,
			swap: 0.0,
			openTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
			closeTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
			isClosed: true,
			comment: 'Gold Scalper Pro - London Session'
		}
	});

	// Recent losing trade
	await prisma.trade.create({
		data: {
			userId: user2.id,
			mt5AccountId: mt5Account2.id,
			ticket: '123456790',
			symbol: 'XAUUSD',
			type: 'SELL',
			volume: 0.01,
			openPrice: 2046.80,
			closePrice: 2048.30,
			profit: -15.00,
			commission: -0.70,
			swap: 0.0,
			openTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
			closeTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
			isClosed: true,
			comment: 'Gold Scalper Pro - Asian Session'
		}
	});

	// Open trade
	await prisma.trade.create({
		data: {
			userId: user3.id,
			mt5AccountId: mt5Account3.id,
			ticket: '123456791',
			symbol: 'XAUUSD',
			type: 'BUY',
			volume: 0.05,
			openPrice: 2047.25,
			profit: 125.50, // Current floating profit
			commission: -3.50,
			swap: -0.25,
			openTime: new Date(Date.now() - 30 * 60 * 1000),
			isClosed: false,
			comment: 'Gold Scalper Pro - Master Account'
		}
	});

	console.log('✅ Created Sample Trades');

	// ============================================================================
	// 7. Create Sample Leaderboard Entries
	// ============================================================================
	console.log('🏆 Creating Leaderboard Entries...');

	await prisma.leaderboardEntry.create({
		data: {
			userId: user3.id,
			period: 'monthly',
			periodDate: new Date('2026-01-01'),
			rank: 1,
			profit: 18280.90,
			trades: 342,
			winningTrades: 249,
			losingTrades: 93,
			winRate: 72.8,
			volume: 85.5
		}
	});

	await prisma.leaderboardEntry.create({
		data: {
			userId: user6.id,
			period: 'monthly',
			periodDate: new Date('2026-01-01'),
			rank: 2,
			profit: 11750.20,
			trades: 167,
			winningTrades: 112,
			losingTrades: 55,
			winRate: 67.1,
			volume: 41.75
		}
	});

	await prisma.leaderboardEntry.create({
		data: {
			userId: user1.id,
			period: 'monthly',
			periodDate: new Date('2026-01-01'),
			rank: 3,
			profit: 9250.25,
			trades: 156,
			winningTrades: 107,
			losingTrades: 49,
			winRate: 68.5,
			volume: 39.0
		}
	});

	console.log('✅ Created Leaderboard Entries');

	// ============================================================================
	// 8. Create Sample Automations
	// ============================================================================
	console.log('🔔 Creating Automations...');

	await prisma.automation.create({
		data: {
			userId: user1.id,
			name: 'High Profit Achievement Alert',
			triggerType: 'HIGH_PROFIT_ACHIEVED',
			triggerValue: 500,
			actionTypes: ['EMAIL', 'SMS'],
			messageBody: 'Congratulations! You\'ve achieved high profits today. Time to celebrate! 🎉',
			messageSubject: 'Profit Target Reached!',
			status: 'ACTIVE',
			priority: 8,
			isUserEnabled: true
		}
	});

	await prisma.automation.create({
		data: {
			userId: user4.id,
			name: 'Consecutive Losses Warning',
			triggerType: 'CONSECUTIVE_LOSSES',
			triggerValue: 5,
			actionTypes: ['EMAIL', 'SMS', 'WHATSAPP'],
			messageBody: '⚠️ WARNING: You have 5 consecutive losing trades. Please review your trading strategy.',
			messageSubject: 'Loss Alert - Immediate Action Required',
			status: 'ACTIVE',
			priority: 10,
			isUserEnabled: true
		}
	});

	// FOMO re-engagement automation (for inactive users)
	await prisma.automation.create({
		data: {
			name: 'Inactive User FOMO Re-engagement',
			triggerType: 'ACCOUNT_INACTIVE',
			triggerValue: 7, // 7 days inactive
			actionTypes: ['EMAIL', 'SMS'],
			messageBody: '🚀 Gold is moving! Your fellow traders made $12,450 this week. Don\'t miss out - your EA is ready to trade! Login now: https://scalperium.com/login',
			messageSubject: '💰 Your Gold Scalper is Missing Out on Profits!',
			status: 'ACTIVE',
			priority: 5,
			isUserEnabled: true
		}
	});

	console.log('✅ Created Automations');

	// ============================================================================
	// 9. Create Prizes
	// ============================================================================
	console.log('🎁 Creating Prizes...');

	await prisma.prize.create({
		data: {
			period: 'monthly',
			rank: 1,
			amount: 5000.0,
			isActive: true
		}
	});

	await prisma.prize.create({
		data: {
			period: 'monthly',
			rank: 2,
			amount: 2500.0,
			isActive: true
		}
	});

	await prisma.prize.create({
		data: {
			period: 'monthly',
			rank: 3,
			amount: 1000.0,
			isActive: true
		}
	});

	await prisma.prize.create({
		data: {
			period: 'weekly',
			rank: 1,
			amount: 500.0,
			isActive: true
		}
	});

	console.log('✅ Created Prizes');

	// ============================================================================
	// 10. Create Anonymous Accounts (IB Privacy Layer)
	// ============================================================================
	console.log('🔐 Creating Anonymous Accounts...');

	const anonAccount1 = await prisma.anonymousAccount.create({
		data: {
			anonymousId: 'ACC-8F3D2A1B',
			userId: user1.id,
			mt5AccountNumber: mt5Account1.accountNumber,
			ibPartnerId: ibPartner1.id,
			isActive: true,
			registeredAt: user1.createdAt
		}
	});

	const anonAccount2 = await prisma.anonymousAccount.create({
		data: {
			anonymousId: 'ACC-7E2C9B4F',
			userId: user2.id,
			mt5AccountNumber: mt5Account2.accountNumber,
			ibPartnerId: ibPartner1.id,
			isActive: true,
			registeredAt: user2.createdAt
		}
	});

	const anonAccount3 = await prisma.anonymousAccount.create({
		data: {
			anonymousId: 'ACC-9A1F5C8D',
			userId: user3.id,
			mt5AccountNumber: mt5Account3.accountNumber,
			ibPartnerId: ibPartner2.id,
			isActive: true,
			registeredAt: user3.createdAt
		}
	});

	const anonAccount4 = await prisma.anonymousAccount.create({
		data: {
			anonymousId: 'ACC-4B6E3D9A',
			userId: user4.id,
			mt5AccountNumber: mt5Account4.accountNumber,
			ibPartnerId: ibPartner2.id,
			isActive: false, // Inactive account
			registeredAt: user4.createdAt
		}
	});

	console.log('✅ Created 4 Anonymous Accounts');

	// ============================================================================
	// 11. Create IB Commission Records
	// ============================================================================
	console.log('💰 Creating IB Commission Records...');

	// Alpha Trade IB - Current Month
	const currentMonth = new Date();
	currentMonth.setDate(1);
	currentMonth.setHours(0, 0, 0, 0);
	const nextMonth = new Date(currentMonth);
	nextMonth.setMonth(nextMonth.getMonth() + 1);

	await prisma.iBCommission.create({
		data: {
			ibPartnerId: ibPartner1.id,
			anonymousAccountId: anonAccount1.id,
			period: currentMonth,
			periodEnd: nextMonth,
			tradingVolume: 125.5, // lots
			numberOfTrades: 156,
			averageSpread: 1.8,
			commissionRate: 0.5, // 0.5%
			grossCommission: 2260.00,
			platformFee: 226.00, // 10% platform fee
			netCommission: 2034.00,
			isPaid: false
		}
	});

	await prisma.iBCommission.create({
		data: {
			ibPartnerId: ibPartner1.id,
			anonymousAccountId: anonAccount2.id,
			period: currentMonth,
			periodEnd: nextMonth,
			tradingVolume: 89.3,
			numberOfTrades: 89,
			averageSpread: 1.9,
			commissionRate: 0.5,
			grossCommission: 1694.70,
			platformFee: 169.47,
			netCommission: 1525.23,
			isPaid: false
		}
	});

	// Gold King IB - Current Month
	await prisma.iBCommission.create({
		data: {
			ibPartnerId: ibPartner2.id,
			anonymousAccountId: anonAccount3.id,
			period: currentMonth,
			periodEnd: nextMonth,
			tradingVolume: 342.8,
			numberOfTrades: 342,
			averageSpread: 1.7,
			commissionRate: 0.5,
			grossCommission: 5827.60,
			platformFee: 582.76,
			netCommission: 5244.84,
			isPaid: false
		}
	});

	await prisma.iBCommission.create({
		data: {
			ibPartnerId: ibPartner2.id,
			anonymousAccountId: anonAccount4.id,
			period: currentMonth,
			periodEnd: nextMonth,
			tradingVolume: 198.6,
			numberOfTrades: 198,
			averageSpread: 1.8,
			commissionRate: 0.5,
			grossCommission: 3574.80,
			platformFee: 357.48,
			netCommission: 3217.32,
			isPaid: false
		}
	});

	// Previous Month Commissions (for growth comparison)
	const previousMonth = new Date(currentMonth);
	previousMonth.setMonth(previousMonth.getMonth() - 1);

	await prisma.iBCommission.create({
		data: {
			ibPartnerId: ibPartner1.id,
			anonymousAccountId: anonAccount1.id,
			period: previousMonth,
			periodEnd: currentMonth,
			tradingVolume: 98.2,
			numberOfTrades: 134,
			averageSpread: 1.9,
			commissionRate: 0.5,
			grossCommission: 1865.80,
			platformFee: 186.58,
			netCommission: 1679.22,
			isPaid: true,
			paidAt: new Date(currentMonth.getTime() + 5 * 24 * 60 * 60 * 1000), // Paid 5 days into current month
			paymentReference: 'PAY-2025-12-ALPHA'
		}
	});

	await prisma.iBCommission.create({
		data: {
			ibPartnerId: ibPartner1.id,
			anonymousAccountId: anonAccount2.id,
			period: previousMonth,
			periodEnd: currentMonth,
			tradingVolume: 76.4,
			numberOfTrades: 92,
			averageSpread: 2.0,
			commissionRate: 0.5,
			grossCommission: 1528.00,
			platformFee: 152.80,
			netCommission: 1375.20,
			isPaid: true,
			paidAt: new Date(currentMonth.getTime() + 5 * 24 * 60 * 60 * 1000),
			paymentReference: 'PAY-2025-12-ALPHA'
		}
	});

	await prisma.iBCommission.create({
		data: {
			ibPartnerId: ibPartner2.id,
			anonymousAccountId: anonAccount3.id,
			period: previousMonth,
			periodEnd: currentMonth,
			tradingVolume: 289.5,
			numberOfTrades: 298,
			averageSpread: 1.8,
			commissionRate: 0.5,
			grossCommission: 5211.00,
			platformFee: 521.10,
			netCommission: 4689.90,
			isPaid: true,
			paidAt: new Date(currentMonth.getTime() + 5 * 24 * 60 * 60 * 1000),
			paymentReference: 'PAY-2025-12-GOLD'
		}
	});

	console.log('✅ Created 7 IB Commission Records');

	// ============================================================================
	// Summary
	// ============================================================================
	console.log('\n✅ Database seeded successfully!\n');
	console.log('📊 Summary:');
	console.log(`   - ${4} IB Partners (3 active, 1 pending)`);
	console.log(`   - ${1} Admin User`);
	console.log(`   - ${3} Demo Test Users (for role testing)`);
	console.log(`   - ${6} Regular Users (4 under IB, 2 direct)`);
	console.log(`   - ${11} MT5 Accounts`);
	console.log(`   - ${6} C# Agents (3 online, 1 offline, 1 error)`);
	console.log(`   - ${3} Sample Trades`);
	console.log(`   - ${3} Leaderboard Entries`);
	console.log(`   - ${3} Automations`);
	console.log(`   - ${4} Prizes`);
	console.log(`   - ${4} Anonymous Accounts (IB privacy layer)`);
	console.log(`   - ${7} IB Commission Records (current + previous months)\n`);

	console.log('🔑 Simple Demo Login Credentials (for testing role permissions):');
	console.log('   SUPER_ADMIN: admin@scalperium.com / admin123');
	console.log('   USER:        user@scalperium.com / user123');
	console.log('   TRADER:      trader@scalperium.com / trader123');
	console.log('   IB:          ib@scalperium.com / ib123\n');

	console.log('🔑 Full Demo Data Login Credentials:');
	console.log('   IB Partner:  contact@alphatrade.com / password123');
	console.log('   IB Partner:  info@goldking.io / password123');
	console.log('   Trader 1:    james.wilson@email.com / password123');
	console.log('   Trader 2:    david.kim@email.com / password123');
	console.log('   Trader 3:    sofia.martinez@email.com / password123 (inactive!)');
	console.log('   Trader 4:    alex.thompson@email.com / password123 (very inactive!)');
}

main()
	.catch((e) => {
		console.error('❌ Seed failed:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
