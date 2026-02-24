import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server as HttpServer } from 'http';

interface Peer {
  id: string;
  ws: WebSocket;
  roomId: string | null;
}

interface Room {
  id: string;
  peers: Map<string, Peer>;
  createdAt: number;
}

export class SignalingServer {
  private wss: WebSocketServer | null = null;
  private rooms = new Map<string, Room>();
  private peers = new Map<WebSocket, Peer>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  /** Attach to an existing HTTP server at a specific path */
  attach(server: HttpServer, path: string = '/ws'): void {
    this.wss = new WebSocketServer({ server, path });
    this.setupHandlers();
    this.startCleanup();
    console.log(`[signaling] WebSocket server attached at ${path}`);
  }

  /** Start a standalone WebSocket server */
  listen(port: number): void {
    this.wss = new WebSocketServer({ port });
    this.setupHandlers();
    this.startCleanup();
    console.log(`[signaling] WebSocket server listening on port ${port}`);
  }

  close(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.wss?.close();
  }

  private setupHandlers(): void {
    this.wss!.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const peer: Peer = { id: '', ws, roomId: null };
      this.peers.set(ws, peer);

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          this.handleMessage(peer, msg);
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(peer);
        this.peers.delete(ws);
      });

      ws.on('error', () => {
        this.handleDisconnect(peer);
        this.peers.delete(ws);
      });
    });
  }

  private handleMessage(peer: Peer, msg: Record<string, unknown>): void {
    switch (msg.type) {
      case 'create':
        this.handleCreate(peer, msg as { type: string; roomId: string; peerId: string });
        break;
      case 'join':
        this.handleJoin(peer, msg as { type: string; roomId: string; peerId: string });
        break;
      case 'signal':
        this.handleSignal(peer, msg as { type: string; targetId: string; data: unknown });
        break;
    }
  }

  private handleCreate(peer: Peer, msg: { roomId: string; peerId: string }): void {
    peer.id = msg.peerId;

    // Create room
    const room: Room = {
      id: msg.roomId,
      peers: new Map(),
      createdAt: Date.now(),
    };
    room.peers.set(peer.id, peer);
    peer.roomId = msg.roomId;
    this.rooms.set(msg.roomId, room);

    this.send(peer.ws, { type: 'created', roomId: msg.roomId });
  }

  private handleJoin(peer: Peer, msg: { roomId: string; peerId: string }): void {
    peer.id = msg.peerId;

    const room = this.rooms.get(msg.roomId);
    if (!room) {
      this.send(peer.ws, { type: 'error', message: 'Room not found' });
      return;
    }

    peer.roomId = msg.roomId;
    room.peers.set(peer.id, peer);

    // Tell the new peer about existing peers
    const existingPeerIds = Array.from(room.peers.keys()).filter((id) => id !== peer.id);
    this.send(peer.ws, { type: 'joined', roomId: msg.roomId, peers: existingPeerIds });

    // Notify existing peers about the new peer
    for (const [id, existingPeer] of room.peers) {
      if (id !== peer.id) {
        this.send(existingPeer.ws, { type: 'peer-joined', peerId: peer.id });
      }
    }
  }

  private handleSignal(peer: Peer, msg: { targetId: string; data: unknown }): void {
    if (!peer.roomId) return;

    const room = this.rooms.get(peer.roomId);
    if (!room) return;

    const target = room.peers.get(msg.targetId);
    if (!target) return;

    this.send(target.ws, {
      type: 'signal',
      peerId: peer.id,
      data: msg.data,
    });
  }

  private handleDisconnect(peer: Peer): void {
    if (!peer.roomId) return;

    const room = this.rooms.get(peer.roomId);
    if (!room) return;

    room.peers.delete(peer.id);

    // Notify remaining peers
    for (const [, remainingPeer] of room.peers) {
      this.send(remainingPeer.ws, { type: 'peer-left', peerId: peer.id });
    }

    // Remove empty rooms
    if (room.peers.size === 0) {
      this.rooms.delete(peer.roomId);
    }
  }

  private send(ws: WebSocket, data: Record<string, unknown>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /** Remove rooms older than 24 hours */
  private startCleanup(): void {
    const MAX_AGE = 24 * 60 * 60 * 1000;
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, room] of this.rooms) {
        if (now - room.createdAt > MAX_AGE) {
          // Close all peer connections in the room
          for (const [, peer] of room.peers) {
            this.send(peer.ws, { type: 'error', message: 'Room expired' });
          }
          this.rooms.delete(id);
        }
      }
    }, 60000);
  }

  get stats(): { rooms: number; peers: number } {
    let totalPeers = 0;
    for (const room of this.rooms.values()) {
      totalPeers += room.peers.size;
    }
    return { rooms: this.rooms.size, peers: totalPeers };
  }
}
