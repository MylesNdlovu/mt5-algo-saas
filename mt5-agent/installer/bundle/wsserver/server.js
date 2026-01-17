/**
 * Scalperium Standalone WebSocket Server
 * Handles C# Agent communication for trade sync, heartbeats, and commands
 *
 * Run: node server.js
 */

import { WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.WS_PORT || '3001');
const prisma = new PrismaClient();

// Connected agents map
const agents = new Map();
const pendingCommands = new Map();

console.log('========================================');
console.log('  Scalperium WebSocket Server');
console.log('========================================');
console.log(`Starting on port ${PORT}...`);

// Create WebSocket server
const wss = new WebSocketServer({
  port: PORT,
  path: '/ws',
  clientTracking: false
});

wss.on('listening', () => {
  console.log(`WebSocket server running on ws://0.0.0.0:${PORT}/ws`);
});

wss.on('connection', (socket, request) => {
  const remoteAddress = request.socket.remoteAddress;
  console.log(`[WS] New connection from ${remoteAddress}`);

  // Auth timeout
  const authTimeout = setTimeout(() => {
    console.warn(`[WS] Auth timeout for ${remoteAddress}`);
    socket.close(4001, 'Authentication timeout');
  }, 10000);

  socket.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      await handleMessage(socket, message, authTimeout, remoteAddress);
    } catch (error) {
      console.error('[WS] Message parse error:', error.message);
    }
  });

  socket.on('close', async (code, reason) => {
    clearTimeout(authTimeout);
    await handleDisconnect(socket, code, reason.toString());
  });

  socket.on('error', (error) => {
    console.error(`[WS] Socket error:`, error.message);
  });
});

// Message handler
async function handleMessage(socket, message, authTimeout, remoteAddress) {
  switch (message.type) {
    case 'multi_auth':
      clearTimeout(authTimeout);
      await handleMultiAuth(socket, message, remoteAddress);
      break;

    case 'auth':
      clearTimeout(authTimeout);
      await handleAuth(socket, message, remoteAddress);
      break;

    case 'multi_heartbeat':
      handleMultiHeartbeat(socket, message);
      break;

    case 'heartbeat':
      handleHeartbeat(socket, message);
      break;

    case 'multi_status_update':
      await handleMultiStatusUpdate(socket, message);
      break;

    case 'status_update':
      await handleStatusUpdate(socket, message);
      break;

    case 'trade_update':
      await handleTradeUpdate(socket, message);
      break;

    case 'command_result':
      handleCommandResult(message);
      break;

    case 'indicator_update':
      await handleIndicatorUpdate(socket, message);
      break;

    default:
      console.warn('[WS] Unknown message type:', message.type);
  }
}

// Pool Agent Authentication
async function handleMultiAuth(socket, message, remoteAddress) {
  const { apiKey, machineId, vpsName, vpsRegion, maxCapacity, accountNumbers } = message;

  try {
    const agent = await prisma.agent.findUnique({
      where: { apiKey },
      select: { id: true, machineId: true, isPoolAgent: true, vpsName: true, maxCapacity: true }
    });

    if (!agent || !agent.isPoolAgent) {
      sendMessage(socket, { type: 'multi_auth_response', success: false, error: 'Invalid pool agent' });
      socket.close(4002, 'Invalid API key');
      return;
    }

    if (agent.machineId && agent.machineId !== machineId) {
      sendMessage(socket, { type: 'multi_auth_response', success: false, error: 'Machine ID mismatch' });
      socket.close(4003, 'Machine ID mismatch');
      return;
    }

    // Update agent in database
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        machineId,
        vpsName: vpsName || agent.vpsName,
        vpsRegion,
        maxCapacity: maxCapacity || agent.maxCapacity,
        currentLoad: accountNumbers?.length || 0,
        managedAccounts: accountNumbers || [],
        status: 'online',
        connectedAt: new Date(),
        lastHeartbeat: new Date()
      }
    });

    // Register in memory
    agents.set(agent.id, {
      id: agent.id,
      socket,
      vpsName,
      isPoolAgent: true,
      accounts: accountNumbers || [],
      lastHeartbeat: Date.now()
    });

    console.log(`[WS] Pool agent ${agent.id} (${vpsName}) authenticated with ${accountNumbers?.length || 0} accounts`);

    sendMessage(socket, {
      type: 'multi_auth_response',
      success: true,
      agentId: agent.id,
      vpsName,
      registeredAccounts: accountNumbers || [],
      failedAccounts: []
    });

  } catch (error) {
    console.error('[WS] Multi-auth error:', error);
    sendMessage(socket, { type: 'multi_auth_response', success: false, error: 'Server error' });
  }
}

// Single Agent Authentication
async function handleAuth(socket, message, remoteAddress) {
  const { apiKey, machineId } = message;

  try {
    const agent = await prisma.agent.findUnique({
      where: { apiKey },
      select: { id: true, machineId: true, userId: true }
    });

    if (!agent) {
      sendMessage(socket, { type: 'auth_response', success: false, error: 'Invalid API key' });
      socket.close(4002, 'Invalid API key');
      return;
    }

    if (agent.machineId && agent.machineId !== machineId) {
      sendMessage(socket, { type: 'auth_response', success: false, error: 'Machine ID mismatch' });
      socket.close(4003, 'Machine ID mismatch');
      return;
    }

    // Update agent
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        machineId,
        status: 'online',
        connectedAt: new Date(),
        lastHeartbeat: new Date()
      }
    });

    agents.set(agent.id, {
      id: agent.id,
      socket,
      userId: agent.userId,
      isPoolAgent: false,
      lastHeartbeat: Date.now()
    });

    console.log(`[WS] Agent ${agent.id} authenticated`);
    sendMessage(socket, { type: 'auth_response', success: true, agentId: agent.id });

  } catch (error) {
    console.error('[WS] Auth error:', error);
    sendMessage(socket, { type: 'auth_response', success: false, error: 'Server error' });
  }
}

// Heartbeat handlers
function handleMultiHeartbeat(socket, message) {
  const agent = getAgentBySocket(socket);
  if (!agent) return;

  agent.lastHeartbeat = Date.now();

  // Update database (debounced - every 10 seconds)
  if (!agent.lastDbUpdate || Date.now() - agent.lastDbUpdate > 10000) {
    agent.lastDbUpdate = Date.now();
    prisma.agent.update({
      where: { id: agent.id },
      data: {
        status: message.status,
        lastHeartbeat: new Date(),
        cpuUsage: message.cpuUsage,
        memoryUsage: message.memoryUsage
      }
    }).catch(console.error);
  }
}

function handleHeartbeat(socket, message) {
  const agent = getAgentBySocket(socket);
  if (!agent) return;
  agent.lastHeartbeat = Date.now();
}

// Status update handlers
async function handleMultiStatusUpdate(socket, message) {
  const agent = getAgentBySocket(socket);
  if (!agent) return;

  const { systemInfo, accounts } = message;

  try {
    // Update agent metrics
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        cpuUsage: systemInfo?.cpuUsage,
        memoryUsage: systemInfo?.memoryUsage,
        diskUsage: systemInfo?.diskUsage,
        mt5InstanceCount: accounts?.length || 0,
        currentLoad: accounts?.length || 0,
        lastHeartbeat: new Date()
      }
    });

    // Update account assignments
    for (const account of accounts || []) {
      await prisma.mT5AccountAssignment.updateMany({
        where: { mt5AccountNumber: account.accountNumber, agentId: agent.id },
        data: {
          status: account.status,
          eaStatus: account.eaStatus,
          balance: account.balance,
          equity: account.equity,
          profit: account.profit,
          eaLoaded: account.eaLoaded,
          eaRunning: account.eaRunning,
          lastHeartbeat: new Date()
        }
      });
    }
  } catch (error) {
    console.error('[WS] Multi-status update error:', error);
  }
}

async function handleStatusUpdate(socket, message) {
  const agent = getAgentBySocket(socket);
  if (!agent) return;

  try {
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        eaLoaded: message.eaStatus?.loaded,
        eaRunning: message.eaStatus?.running,
        eaName: message.eaStatus?.name,
        chartSymbol: message.eaStatus?.symbol,
        lastHeartbeat: new Date()
      }
    });
  } catch (error) {
    console.error('[WS] Status update error:', error);
  }
}

// Trade update handler
async function handleTradeUpdate(socket, message) {
  const agent = getAgentBySocket(socket);
  if (!agent) return;

  const { trade, action, accountNumber } = message;

  try {
    // Find the MT5 account
    const mt5Account = await prisma.mT5Account.findUnique({
      where: { accountNumber: accountNumber || trade.accountNumber },
      select: { id: true, userId: true }
    });

    if (!mt5Account) {
      console.warn('[WS] MT5 account not found for trade update');
      return;
    }

    if (action === 'opened') {
      await prisma.trade.upsert({
        where: { ticket: trade.ticket },
        create: {
          ticket: trade.ticket,
          userId: mt5Account.userId,
          mt5AccountId: mt5Account.id,
          symbol: trade.symbol,
          type: trade.type,
          volume: trade.volume,
          openPrice: trade.openPrice,
          openTime: new Date(trade.openTime),
          profit: trade.profit || 0,
          commission: trade.commission || 0,
          swap: trade.swap || 0,
          magicNumber: trade.magicNumber,
          comment: trade.comment,
          isClosed: false
        },
        update: {
          profit: trade.profit || 0,
          commission: trade.commission || 0,
          swap: trade.swap || 0
        }
      });
      console.log(`[WS] Trade opened: ${trade.ticket} ${trade.symbol} ${trade.type}`);

    } else if (action === 'closed') {
      await prisma.trade.update({
        where: { ticket: trade.ticket },
        data: {
          closePrice: trade.closePrice,
          closeTime: new Date(trade.closeTime || Date.now()),
          profit: trade.profit || 0,
          isClosed: true
        }
      });
      console.log(`[WS] Trade closed: ${trade.ticket} P/L: ${trade.profit}`);

      // Update user stats
      const isWin = (trade.profit || 0) > 0;
      await prisma.user.update({
        where: { id: mt5Account.userId },
        data: {
          totalTrades: { increment: 1 },
          winningTrades: isWin ? { increment: 1 } : undefined,
          losingTrades: !isWin ? { increment: 1 } : undefined,
          totalProfit: { increment: trade.profit || 0 }
        }
      });
    }
  } catch (error) {
    console.error('[WS] Trade update error:', error);
  }
}

// Indicator update handler (Traffic Light)
async function handleIndicatorUpdate(socket, message) {
  const agent = getAgentBySocket(socket);
  if (!agent) return;

  const { signal, score, accountNumber } = message;

  console.log(`[WS] Indicator update: ${signal} (${score}%) for ${accountNumber || 'master'}`);

  try {
    // Update agent's indicator status
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        indicatorSignal: signal,
        indicatorScore: score
      }
    });

    // If this is the master account, update global indicator for all users on this agent
    if (agent.isPoolAgent) {
      // Could broadcast to dashboard clients here
    }
  } catch (error) {
    console.error('[WS] Indicator update error:', error);
  }
}

// Command result handler
async function handleCommandResult(message) {
  const { commandId, success, result, error } = message;

  // Handle in-memory pending commands (for direct WebSocket calls)
  const pending = pendingCommands.get(commandId);
  if (pending) {
    if (success) {
      pending.resolve(result);
    } else {
      pending.reject(new Error(error || 'Command failed'));
    }
    pendingCommands.delete(commandId);
  }

  // Also update database command queue (for web app commands)
  try {
    await prisma.agentCommand.update({
      where: { id: commandId },
      data: {
        status: success ? 'completed' : 'failed',
        result: result || null,
        errorMessage: error || null,
        completedAt: new Date()
      }
    });
    console.log(`[CMD] Command ${commandId} ${success ? 'completed' : 'failed'}`);
  } catch (err) {
    // Command might not exist in DB (if it was a direct WebSocket command)
    // This is expected, so only log at debug level
  }
}

// Disconnect handler
async function handleDisconnect(socket, code, reason) {
  const agent = getAgentBySocket(socket);
  if (!agent) return;

  agents.delete(agent.id);

  try {
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        status: 'offline',
        disconnectedAt: new Date()
      }
    });
  } catch (error) {
    console.error('[WS] Disconnect update error:', error);
  }

  console.log(`[WS] Agent ${agent.id} disconnected (${code}: ${reason})`);
}

// Utility functions
function sendMessage(socket, message) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({ ...message, timestamp: Date.now() }));
  }
}

function getAgentBySocket(socket) {
  for (const agent of agents.values()) {
    if (agent.socket === socket) return agent;
  }
  return null;
}

// Send command to agent
export function sendCommand(agentId, command, data = {}, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const agent = agents.get(agentId);
    if (!agent) {
      reject(new Error('Agent not connected'));
      return;
    }

    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    pendingCommands.set(commandId, { resolve, reject });

    setTimeout(() => {
      if (pendingCommands.has(commandId)) {
        pendingCommands.delete(commandId);
        reject(new Error('Command timeout'));
      }
    }, timeoutMs);

    sendMessage(agent.socket, {
      type: command,
      commandId,
      ...data
    });
  });
}

// Get connected agents
export function getConnectedAgents() {
  return Array.from(agents.values()).map(a => ({
    id: a.id,
    vpsName: a.vpsName,
    isPoolAgent: a.isPoolAgent,
    accounts: a.accounts?.length || 0,
    lastHeartbeat: a.lastHeartbeat
  }));
}

// Health check every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [agentId, agent] of agents) {
    if (now - agent.lastHeartbeat > 60000) {
      console.warn(`[WS] Agent ${agentId} heartbeat timeout, disconnecting`);
      agent.socket.close(4010, 'Heartbeat timeout');
      agents.delete(agentId);
    }
  }
}, 30000);

// ==========================================================================
// SECURE COMMAND QUEUE - Poll database for pending commands from web app
// ==========================================================================

async function pollPendingCommands() {
  try {
    // Get all connected agent IDs
    const connectedAgentIds = Array.from(agents.keys());
    if (connectedAgentIds.length === 0) return;

    // Fetch pending commands for connected agents
    const pendingCommands = await prisma.agentCommand.findMany({
      where: {
        agentId: { in: connectedAgentIds },
        status: 'pending',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: 10 // Process up to 10 commands per poll
    });

    for (const cmd of pendingCommands) {
      const agent = agents.get(cmd.agentId);
      if (!agent) continue;

      // Mark as processing
      await prisma.agentCommand.update({
        where: { id: cmd.id },
        data: {
          status: 'processing',
          processedAt: new Date()
        }
      });

      console.log(`[CMD] Sending command '${cmd.command}' to agent ${cmd.agentId}`);

      // Send command to agent via WebSocket
      sendMessage(agent.socket, {
        type: 'command',
        commandId: cmd.id,
        command: cmd.command,
        mt5AccountNumber: cmd.mt5AccountNumber,
        payload: cmd.payload
      });

      // Set up timeout for command completion
      setTimeout(async () => {
        const currentCmd = await prisma.agentCommand.findUnique({
          where: { id: cmd.id },
          select: { status: true }
        });

        // If still processing after 60 seconds, mark as failed
        if (currentCmd?.status === 'processing') {
          await prisma.agentCommand.update({
            where: { id: cmd.id },
            data: {
              status: 'failed',
              errorMessage: 'Command timeout - no response from agent',
              completedAt: new Date()
            }
          });
          console.warn(`[CMD] Command ${cmd.id} timed out`);
        }
      }, 60000);
    }

    // Expire old pending commands
    await prisma.agentCommand.updateMany({
      where: {
        status: 'pending',
        expiresAt: { lt: new Date() }
      },
      data: {
        status: 'failed',
        errorMessage: 'Command expired before processing',
        completedAt: new Date()
      }
    });

  } catch (error) {
    console.error('[CMD] Error polling commands:', error);
  }
}

// Poll for commands every 2 seconds
setInterval(pollPendingCommands, 2000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[WS] Shutting down...');
  wss.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[WS] Shutting down...');
  wss.close();
  await prisma.$disconnect();
  process.exit(0);
});

wss.on('error', (error) => {
  console.error('[WS] Server error:', error);
});

console.log('WebSocket server initialized');
