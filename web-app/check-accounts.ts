import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ 
    where: { email: 'trader@scalperium.com' },
    include: { mt5Accounts: true }
  });
  
  console.log('\n✅ Demo Trader:', user?.email || 'NOT FOUND');
  console.log('📊 Total MT5 Accounts:', user?.mt5Accounts.length || 0);
  console.log('');
  
  if (user?.mt5Accounts) {
    user.mt5Accounts.forEach((acc, i) => {
      const enabled = acc.isEnabledForTrading ? '✅ ENABLED' : '⭕ DISABLED';
      console.log(`${i+1}. ${acc.broker} - ${acc.accountNumber}`);
      console.log(`   Status: ${acc.status} | ${enabled}`);
      console.log(`   Balance: $${acc.balance.toLocaleString()}`);
      console.log('');
    });
  }
}

main().then(() => process.exit(0)).catch(console.error);
