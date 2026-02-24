import Server from 'bittorrent-tracker';

const port = parseInt(process.env.TRACKER_PORT || '41337', 10);

const server = new Server({
  udp: true,
  http: true,
  ws: true,
  stats: true,
  filter: (
    _infoHash: string,
    _params: unknown,
    cb: (err: Error | null) => void,
  ) => {
    // Allow all torrents — peer.cat is an open relay
    cb(null);
  },
});

server.on('error', (err: Error) => {
  console.error('[tracker] Fatal error:', err.message);
});

server.on('warning', (err: Error) => {
  console.warn('[tracker] Warning:', err.message);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[tracker] HTTP listening on port ${port}`);
  console.log(`[tracker] UDP listening on port ${port}`);
  console.log(`[tracker] WebSocket listening on port ${port}`);
});

server.on('start', (addr: string) => {
  console.log(`[tracker] Peer started: ${addr}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[tracker] Shutting down...');
  server.close();
  process.exit(0);
});
