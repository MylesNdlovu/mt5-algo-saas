-- ============================================================================
-- Migration: Add Pool Agent (Mother Agent) Support
-- Description: Enables one C# agent to manage 40-50 MT5 terminals on a single VPS
-- ============================================================================

-- AlterTable: Make userId nullable for pool agents (they don't belong to a single user)
ALTER TABLE "Agent" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable: Add pool agent fields to Agent table
ALTER TABLE "Agent" ADD COLUMN     "isPoolAgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "managedAccounts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "maxCapacity" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "currentLoad" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vpsName" TEXT,
ADD COLUMN     "vpsRegion" TEXT,
ADD COLUMN     "vpsIp" TEXT,
ADD COLUMN     "cpuUsage" DOUBLE PRECISION,
ADD COLUMN     "memoryUsage" DOUBLE PRECISION,
ADD COLUMN     "diskUsage" DOUBLE PRECISION,
ADD COLUMN     "mt5InstanceCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: MT5AccountAssignment for tracking account-to-pool-agent mapping
CREATE TABLE "MT5AccountAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "mt5AccountNumber" TEXT NOT NULL,
    "mt5Broker" TEXT,
    "mt5ServerName" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "eaStatus" TEXT NOT NULL DEFAULT 'stopped',
    "lastHeartbeat" TIMESTAMP(3),
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "equity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeMargin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "eaLoaded" BOOLEAN NOT NULL DEFAULT false,
    "eaRunning" BOOLEAN NOT NULL DEFAULT false,
    "eaName" TEXT,
    "chartSymbol" TEXT,
    "chartTimeframe" TEXT,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "profitableTrades" INTEGER NOT NULL DEFAULT 0,
    "losingTrades" INTEGER NOT NULL DEFAULT 0,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MT5AccountAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint on MT5 account number
CREATE UNIQUE INDEX "MT5AccountAssignment_mt5AccountNumber_key" ON "MT5AccountAssignment"("mt5AccountNumber");

-- CreateIndex: Index for agent lookups
CREATE INDEX "MT5AccountAssignment_agentId_idx" ON "MT5AccountAssignment"("agentId");

-- CreateIndex: Index for user lookups
CREATE INDEX "MT5AccountAssignment_userId_idx" ON "MT5AccountAssignment"("userId");

-- CreateIndex: Index for account number lookups
CREATE INDEX "MT5AccountAssignment_mt5AccountNumber_idx" ON "MT5AccountAssignment"("mt5AccountNumber");

-- CreateIndex: Index for status filtering
CREATE INDEX "MT5AccountAssignment_status_idx" ON "MT5AccountAssignment"("status");

-- CreateIndex: Index for active assignments
CREATE INDEX "MT5AccountAssignment_isActive_idx" ON "MT5AccountAssignment"("isActive");

-- CreateIndex: Index for pool agent lookups
CREATE INDEX "Agent_isPoolAgent_idx" ON "Agent"("isPoolAgent");

-- CreateIndex: Index for VPS name lookups
CREATE INDEX "Agent_vpsName_idx" ON "Agent"("vpsName");

-- AddForeignKey: Link assignment to user
ALTER TABLE "MT5AccountAssignment" ADD CONSTRAINT "MT5AccountAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Link assignment to pool agent
ALTER TABLE "MT5AccountAssignment" ADD CONSTRAINT "MT5AccountAssignment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey: Make Agent.userId foreign key optional (set null on delete)
ALTER TABLE "Agent" DROP CONSTRAINT "Agent_userId_fkey";
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
