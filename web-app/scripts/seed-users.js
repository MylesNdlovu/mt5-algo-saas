import { seedDemoUsers, syncUserStatsToLeaderboard } from '../src/lib/server/userStorage.js';

console.log('🌱 Seeding demo users...');

try {
	seedDemoUsers();
	console.log('✅ Demo users created successfully');
	
	console.log('📊 Syncing leaderboard stats...');
	syncUserStatsToLeaderboard();
	console.log('✅ Leaderboard synced successfully');
	
	console.log('\n🎉 Seed complete!');
	console.log('\nDemo user credentials:');
	console.log('Email: john.trader@example.com | Password: Demo123!');
	console.log('Email: sarah.smith@example.com | Password: Demo123!');
	console.log('Email: mike.pro@example.com | Password: Demo123!');
	console.log('Email: emma.forex@example.com | Password: Demo123!');
	console.log('Email: david.gold@example.com | Password: Demo123!');
	
} catch (error) {
	console.error('❌ Error seeding data:', error);
	process.exit(1);
}
