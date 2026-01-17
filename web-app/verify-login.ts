import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function verifyLogin() {
	console.log('🔍 Checking admin user in database...\n');

	const user = await prisma.user.findUnique({
		where: { email: 'admin@scalperium.com' }
	});

	if (!user) {
		console.log('❌ Admin user NOT found in database!');
		return;
	}

	console.log('✅ Admin user found:');
	console.log('   Email:', user.email);
	console.log('   Role:', user.role);
	console.log('   Active:', user.isActive);
	console.log('   Password hash:', user.passwordHash.substring(0, 20) + '...');

	// Test password verification
	console.log('\n🔐 Testing password verification...');
	const testPassword = 'admin123';
	const isValid = await bcrypt.compare(testPassword, user.passwordHash);

	if (isValid) {
		console.log('✅ Password "admin123" is CORRECT!');
	} else {
		console.log('❌ Password "admin123" is INCORRECT!');
		console.log('   This means the password hash in the database is wrong.');
	}

	await prisma.$disconnect();
}

verifyLogin().catch(console.error);
