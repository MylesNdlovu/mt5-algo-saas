import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdminUser() {
	try {
		console.log('🔐 Creating admin user...');

		// Hash the password
		const passwordHash = await bcrypt.hash('AdminPassword123!', 10);

		// Create or update admin user
		const admin = await prisma.user.upsert({
			where: { 
				email: 'admin@scalperium.com' 
			},
			create: {
				email: 'admin@scalperium.com',
				passwordHash,
				firstName: 'Admin',
				lastName: 'User',
				role: 'ADMIN',
				subscriptionTier: 'VIP',
				isActive: true,
				status: 'ACTIVE',
				createdAt: new Date(),
				updatedAt: new Date()
			},
			update: {
				role: 'ADMIN',
				subscriptionTier: 'VIP',
				isActive: true,
				status: 'ACTIVE'
			}
		});

		console.log('✅ Admin user created successfully!');
		console.log('\n📧 Email:', admin.email);
		console.log('🔑 Password: AdminPassword123!');
		console.log('👤 Role:', admin.role);
		console.log('💎 Tier:', admin.subscriptionTier);
		console.log('\n🚀 Login at: http://localhost:5173/login');

		// Also create a test regular user
		const testUserPassword = await bcrypt.hash('TestUser123!', 10);
		
		const testUser = await prisma.user.upsert({
			where: { 
				email: 'user@test.com' 
			},
			create: {
				email: 'user@test.com',
				passwordHash: testUserPassword,
				firstName: 'Test',
				lastName: 'User',
				role: 'USER',
				subscriptionTier: 'TRIAL',
				isActive: true,
				status: 'ACTIVE',
				monthlyFee: 99.99,
				totalTrades: 45,
				winningTrades: 28,
				losingTrades: 17,
				totalProfit: 2450.50,
				createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
				updatedAt: new Date()
			},
			update: {
				role: 'USER',
				subscriptionTier: 'TRIAL'
			}
		});

		console.log('\n📧 Test User Email:', testUser.email);
		console.log('🔑 Test User Password: TestUser123!');
		console.log('👤 Role:', testUser.role);

	} catch (error) {
		console.error('❌ Error creating admin user:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

// Run the function
createAdminUser()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
