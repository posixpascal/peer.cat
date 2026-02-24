import { createServer } from 'http';
import { SignalingServer } from './signaling.js';

const PORT = parseInt(process.env.SIGNAL_PORT || '8080', 10);

const httpServer = createServer((_req, res) => {
  // Health check endpoint
  if (_req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', ...signaling.stats }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const signaling = new SignalingServer();
signaling.attach(httpServer, '/ws');

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Signaling server running on port ${PORT}`);
  console.log(`[server] Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[server] Shutting down...');
  signaling.close();
  httpServer.close();
  process.exit(0);
});
