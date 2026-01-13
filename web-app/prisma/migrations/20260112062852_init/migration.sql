-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'TRADER', 'IB', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'TRIAL', 'BASIC', 'PREMIUM', 'VIP');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EAStatus" AS ENUM ('STOPPED', 'RUNNING', 'PAUSED', 'ERROR');

-- CreateEnum
CREATE TYPE "SafetyIndicator" AS ENUM ('RED', 'ORANGE', 'GREEN');

-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('LEAD_OPTIN', 'MT5_REGISTRATION', 'WINNING_TRADES', 'LOSING_TRADES', 'SUBSCRIPTION_UPGRADE', 'SUBSCRIPTION_EXPIRED', 'HIGH_PROFIT_ACHIEVED', 'CONSECUTIVE_LOSSES', 'ACCOUNT_INACTIVE', 'TRIAL_ENDING');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH_NOTIFICATION', 'IN_APP_MESSAGE');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "phone" TEXT,
    "ibCode" TEXT,
    "ibPartnerId" TEXT,
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "subscriptionStart" TIMESTAMP(3),
    "subscriptionEnd" TIMESTAMP(3),
    "monthlyFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winningTrades" INTEGER NOT NULL DEFAULT 0,
    "losingTrades" INTEGER NOT NULL DEFAULT 0,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MT5Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "broker" TEXT NOT NULL,
    "serverName" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "password" TEXT,
    "vpsIp" TEXT,
    "vpsPort" INTEGER,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "equity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeMargin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "MT5Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EA" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mt5AccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "magicNumber" INTEGER,
    "status" "EAStatus" NOT NULL DEFAULT 'STOPPED',
    "safetyIndicator" "SafetyIndicator" NOT NULL DEFAULT 'RED',
    "maxLotSize" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "riskPercent" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "settings" JSONB,
    "lastStartAt" TIMESTAMP(3),
    "lastStopAt" TIMESTAMP(3),
    "uptime" INTEGER NOT NULL DEFAULT 0,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winningTrades" INTEGER NOT NULL DEFAULT 0,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mt5AccountId" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "openPrice" DOUBLE PRECISION NOT NULL,
    "openTime" TIMESTAMP(3) NOT NULL,
    "closePrice" DOUBLE PRECISION,
    "closeTime" TIMESTAMP(3),
    "profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "swap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "magicNumber" INTEGER,
    "comment" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT,
    "triggerType" "AutomationTriggerType" NOT NULL,
    "triggerValue" INTEGER,
    "triggerData" JSONB,
    "actionTypes" "AutomationActionType"[],
    "actionData" JSONB,
    "messageSubject" TEXT,
    "messageBody" TEXT NOT NULL,
    "status" "AutomationStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "isUserEnabled" BOOLEAN NOT NULL DEFAULT true,
    "totalTriggered" INTEGER NOT NULL DEFAULT 0,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "lastTriggered" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "AutomationActionType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgProfitPerTrade" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgLossPerTrade" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitFactor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDrawdown" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sharpeRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tradingDaysActive" INTEGER NOT NULL DEFAULT 0,
    "avgTradesPerDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preferredTimeframe" TEXT,
    "riskLevel" TEXT,
    "lastTradeDate" TIMESTAMP(3),
    "consecutiveWins" INTEGER NOT NULL DEFAULT 0,
    "consecutiveLosses" INTEGER NOT NULL DEFAULT 0,
    "daysSinceLastTrade" INTEGER NOT NULL DEFAULT 0,
    "lifetimeValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "churnRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "predictedNextAction" TEXT,
    "retentionProbability" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "upsellProbability" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketCondition" (
    "id" TEXT NOT NULL,
    "volatility" DOUBLE PRECISION NOT NULL,
    "spread" DOUBLE PRECISION NOT NULL,
    "trend" TEXT NOT NULL,
    "newsImpact" BOOLEAN NOT NULL DEFAULT false,
    "safetyIndicator" "SafetyIndicator" NOT NULL,
    "reason" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "trades" INTEGER NOT NULL DEFAULT 0,
    "winningTrades" INTEGER NOT NULL DEFAULT 0,
    "losingTrades" INTEGER NOT NULL DEFAULT 0,
    "profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "previousRank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IBPartner" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ibCode" TEXT NOT NULL,
    "domain" TEXT,
    "logo" TEXT,
    "favicon" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#EF4444',
    "brandName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "currentTraders" TEXT,
    "message" TEXT,
    "pricingTier" TEXT NOT NULL DEFAULT 'tier1',
    "monthlyFee" DOUBLE PRECISION NOT NULL DEFAULT 2500,
    "traderLimit" INTEGER NOT NULL DEFAULT 500,
    "spreadRevShare" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "totalTraders" INTEGER NOT NULL DEFAULT 0,
    "activeTraders" INTEGER NOT NULL DEFAULT 0,
    "monthlyRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lifetimeRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,

    CONSTRAINT "IBPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "machineName" TEXT,
    "mt5AccountNumber" TEXT,
    "mt5Broker" TEXT,
    "mt5ServerName" TEXT,
    "mt5Version" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "lastHeartbeat" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "eaLoaded" BOOLEAN NOT NULL DEFAULT false,
    "eaRunning" BOOLEAN NOT NULL DEFAULT false,
    "eaName" TEXT,
    "chartSymbol" TEXT,
    "chartTimeframe" TEXT,
    "tradeCopierActive" BOOLEAN NOT NULL DEFAULT false,
    "isMasterAccount" BOOLEAN NOT NULL DEFAULT false,
    "masterAgentId" TEXT,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "profitableTrades" INTEGER NOT NULL DEFAULT 0,
    "losingTrades" INTEGER NOT NULL DEFAULT 0,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "indicatorSettings" JSONB,
    "aiOptimizationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastOptimizedAt" TIMESTAMP(3),
    "apiKey" TEXT,
    "osVersion" TEXT,
    "agentVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prize" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_subscriptionTier_idx" ON "User"("subscriptionTier");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_totalProfit_idx" ON "User"("totalProfit");

-- CreateIndex
CREATE INDEX "User_winningTrades_idx" ON "User"("winningTrades");

-- CreateIndex
CREATE INDEX "User_ibPartnerId_idx" ON "User"("ibPartnerId");

-- CreateIndex
CREATE UNIQUE INDEX "MT5Account_accountNumber_key" ON "MT5Account"("accountNumber");

-- CreateIndex
CREATE INDEX "MT5Account_userId_idx" ON "MT5Account"("userId");

-- CreateIndex
CREATE INDEX "MT5Account_accountNumber_idx" ON "MT5Account"("accountNumber");

-- CreateIndex
CREATE INDEX "MT5Account_status_idx" ON "MT5Account"("status");

-- CreateIndex
CREATE INDEX "EA_userId_idx" ON "EA"("userId");

-- CreateIndex
CREATE INDEX "EA_mt5AccountId_idx" ON "EA"("mt5AccountId");

-- CreateIndex
CREATE INDEX "EA_status_idx" ON "EA"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_ticket_key" ON "Trade"("ticket");

-- CreateIndex
CREATE INDEX "Trade_userId_idx" ON "Trade"("userId");

-- CreateIndex
CREATE INDEX "Trade_mt5AccountId_idx" ON "Trade"("mt5AccountId");

-- CreateIndex
CREATE INDEX "Trade_ticket_idx" ON "Trade"("ticket");

-- CreateIndex
CREATE INDEX "Trade_openTime_idx" ON "Trade"("openTime");

-- CreateIndex
CREATE INDEX "Trade_isClosed_idx" ON "Trade"("isClosed");

-- CreateIndex
CREATE INDEX "Automation_userId_idx" ON "Automation"("userId");

-- CreateIndex
CREATE INDEX "Automation_triggerType_idx" ON "Automation"("triggerType");

-- CreateIndex
CREATE INDEX "Automation_status_idx" ON "Automation"("status");

-- CreateIndex
CREATE INDEX "Automation_createdAt_idx" ON "Automation"("createdAt");

-- CreateIndex
CREATE INDEX "Automation_isUserEnabled_idx" ON "Automation"("isUserEnabled");

-- CreateIndex
CREATE INDEX "NotificationLog_automationId_idx" ON "NotificationLog"("automationId");

-- CreateIndex
CREATE INDEX "NotificationLog_userId_idx" ON "NotificationLog"("userId");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- CreateIndex
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserInsight_userId_key" ON "UserInsight"("userId");

-- CreateIndex
CREATE INDEX "UserInsight_userId_idx" ON "UserInsight"("userId");

-- CreateIndex
CREATE INDEX "UserInsight_churnRisk_idx" ON "UserInsight"("churnRisk");

-- CreateIndex
CREATE INDEX "UserInsight_engagementScore_idx" ON "UserInsight"("engagementScore");

-- CreateIndex
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");

-- CreateIndex
CREATE INDEX "SystemLog_component_idx" ON "SystemLog"("component");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- CreateIndex
CREATE INDEX "MarketCondition_timestamp_idx" ON "MarketCondition"("timestamp");

-- CreateIndex
CREATE INDEX "MarketCondition_safetyIndicator_idx" ON "MarketCondition"("safetyIndicator");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_userId_period_periodDate_key" ON "LeaderboardEntry"("userId", "period", "periodDate");

-- CreateIndex
CREATE UNIQUE INDEX "IBPartner_email_key" ON "IBPartner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "IBPartner_ibCode_key" ON "IBPartner"("ibCode");

-- CreateIndex
CREATE INDEX "IBPartner_email_idx" ON "IBPartner"("email");

-- CreateIndex
CREATE INDEX "IBPartner_ibCode_idx" ON "IBPartner"("ibCode");

-- CreateIndex
CREATE INDEX "IBPartner_isActive_idx" ON "IBPartner"("isActive");

-- CreateIndex
CREATE INDEX "IBPartner_isApproved_idx" ON "IBPartner"("isApproved");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_machineId_key" ON "Agent"("machineId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_apiKey_key" ON "Agent"("apiKey");

-- CreateIndex
CREATE INDEX "Agent_userId_idx" ON "Agent"("userId");

-- CreateIndex
CREATE INDEX "Agent_machineId_idx" ON "Agent"("machineId");

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "Agent"("status");

-- CreateIndex
CREATE INDEX "Agent_lastHeartbeat_idx" ON "Agent"("lastHeartbeat");

-- CreateIndex
CREATE INDEX "Agent_mt5AccountNumber_idx" ON "Agent"("mt5AccountNumber");

-- CreateIndex
CREATE INDEX "Prize_period_idx" ON "Prize"("period");

-- CreateIndex
CREATE UNIQUE INDEX "Prize_period_rank_key" ON "Prize"("period", "rank");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_ibPartnerId_fkey" FOREIGN KEY ("ibPartnerId") REFERENCES "IBPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MT5Account" ADD CONSTRAINT "MT5Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EA" ADD CONSTRAINT "EA_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EA" ADD CONSTRAINT "EA_mt5AccountId_fkey" FOREIGN KEY ("mt5AccountId") REFERENCES "MT5Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_mt5AccountId_fkey" FOREIGN KEY ("mt5AccountId") REFERENCES "MT5Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInsight" ADD CONSTRAINT "UserInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_masterAgentId_fkey" FOREIGN KEY ("masterAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
