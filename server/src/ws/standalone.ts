// server/src/ws/standalone.ts
// Standalone WebSocket server for STT streaming.
//
// Why separate from Vercel?
// Vercel serverless functions don't support long-lived WebSocket connections.
// This runs on Railway, Render, Fly.io, or any VPS.
//
// Usage:
//   npm run ws
//   # or
//   tsx src/ws/standalone.ts

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWebSocketServer } from './handler';

const PORT = parseInt(process.env.WS_PORT || '3001', 10);

const server = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'translate-r-ws' }));
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });
setupWebSocketServer(wss);

server.listen(PORT, () => {
  console.log(`[WS Server] Translate-R WebSocket server running on port ${PORT}`);
  console.log(`[WS Server] Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[WS Server] Shutting down...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});
