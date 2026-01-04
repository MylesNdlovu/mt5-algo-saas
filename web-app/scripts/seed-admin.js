const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
	console.log('Creating admin user...');

	// Check if admin already exists
	const existingAdmin = await prisma.user.findUnique({
		where: { email: 'admin@mt5algo.com' }
	});

	if (existingAdmin) {
		console.log('Admin user already exists!');
		return;
	}

	// Create admin user
	const passwordHash = await bcrypt.hash('Admin@123456', 10);

	const admin = await prisma.user.create({
		data: {
			email: 'admin@mt5algo.com',
			passwordHash,
			firstName: 'Admin',
			lastName: 'User',
			role: 'ADMIN',
			userType: 'DIRECT',
			isActive: true
		}
	});

	console.log('✓ Admin user created successfully!');
	console.log('Email: admin@mt5algo.com');
	console.log('Password: Admin@123456');
	console.log('\n⚠️  IMPORTANT: Change this password immediately after first login!');

	// Create demo trader users
	console.log('\n--- Creating demo trader accounts ---');
	
	const demoUsers = [
		{
			email: 'trader1@gdl.com',
			password: 'Trader123!',
			firstName: 'John',
			lastName: 'Smith',
			role: 'USER'
		},
		{
			email: 'trader2@gdl.com',
			password: 'Trader123!',
			firstName: 'Sarah',
			lastName: 'Johnson',
			role: 'USER'
		},
		{
			email: 'demo@gdl.com',
			password: 'Demo123!',
			firstName: 'Demo',
			lastName: 'Trader',
			role: 'USER'
		}
	];

	for (const userData of demoUsers) {
		const existing = await prisma.user.findUnique({
			where: { email: userData.email }
		});

		if (!existing) {
			const hash = await bcrypt.hash(userData.password, 10);
			await prisma.user.create({
				data: {
					email: userData.email,
					passwordHash: hash,
					firstName: userData.firstName,
					lastName: userData.lastName,
					role: userData.role,
					userType: 'DIRECT',
					isActive: true
				}
			});
			console.log(`✓ Created: ${userData.email} / ${userData.password}`);
		}
	}

	// Create a sample IB
	const ib = await prisma.iB.create({
		data: {
			name: 'Sample IB',
			code: 'SAMPLE123',
			contactEmail: 'ib@example.com',
			contactPerson: 'IB Manager',
			commission: 5.0,
			isActive: true
		}
	});

	console.log('\n✓ Sample IB created:');
	console.log('Code: SAMPLE123');
	console.log('Name: Sample IB');

	// Print summary
	console.log('\n========================================');
	console.log('🔐 GOLD DEAL LOCKS - LOGIN CREDENTIALS');
	console.log('========================================\n');
	console.log('ADMIN ACCOUNT:');
	console.log('Email:    admin@mt5algo.com');
	console.log('Password: Admin@123456');
	console.log('\nTRADER ACCOUNTS:');
	console.log('Email:    trader1@gdl.com');
	console.log('Password: Trader123!');
	console.log('');
	console.log('Email:    trader2@gdl.com');
	console.log('Password: Trader123!');
	console.log('');
	console.log('Email:    demo@gdl.com');
	console.log('Password: Demo123!');
	console.log('\n========================================');
	console.log('Login at: http://localhost:5173/login');
	console.log('========================================\n');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
