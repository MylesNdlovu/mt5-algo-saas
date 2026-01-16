import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ 
    where: { email: 'user@scalperium.com' },
    include: { mt5Accounts: true }
  });
  
  console.log('\n📧 Email:', user?.email || 'NOT FOUND');
  console.log('👤 Role:', user?.role || 'N/A');
  console.log('📊 MT5 Accounts:', user?.mt5Accounts.length || 0);
  
  if (user?.mt5Accounts && user.mt5Accounts.length > 0) {
    console.log('\n✅ Accounts:');
    user.mt5Accounts.forEach((acc, i) => {
      console.log(`  ${i+1}. ${acc.broker} - ${acc.accountNumber} (${acc.status})`);
    });
  } else {
    console.log('\n❌ NO MT5 ACCOUNTS FOUND');
    console.log('');
    console.log('This is why login redirects to a "no page"!');
    console.log('Dashboard checks for accounts and redirects to /connect if none exist.');
    console.log('');
    console.log('💡 The /connect page probably doesn\'t exist, causing the error.');
  }
}

main().then(() => process.exit(0)).catch(console.error);
