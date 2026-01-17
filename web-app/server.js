// Scalperium Web Server - Production Entry Point
// Runs the SvelteKit app with WebSocket server

import { handler } from './build/handler.js';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Create Express app
const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SvelteKit handler
app.use(handler);

// Create HTTP server
const server = createServer(app);

// WebSocket server for agent communication
const wss = new WebSocketServer({ port: WS_PORT });

console.log(`Starting Scalperium Web Server...`);
console.log(`  HTTP: http://${HOST}:${PORT}`);
console.log(`  WebSocket: ws://${HOST}:${WS_PORT}`);

// Import and initialize WebSocket handlers
import('./src/lib/server/websocket-server.js').then(({ initializeWebSocket }) => {
  initializeWebSocket(wss);
  console.log(`  WebSocket server initialized`);
}).catch(err => {
  console.error('Failed to initialize WebSocket:', err);
});

// Start HTTP server
server.listen(PORT, HOST, () => {
  console.log(`Scalperium Web Server running on http://${HOST}:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  wss.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  wss.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
