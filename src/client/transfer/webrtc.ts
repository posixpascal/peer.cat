import type { TransferProgress, FileMeta, IceConfig } from '../../shared/types';
import { SignalingClient } from '../signaling/client';
import { encryptChunk, decryptChunk, CHUNK_SIZE } from '../crypto/encrypt';

const DEFAULT_ICE: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

type ProgressCallback = (progress: TransferProgress) => void;
type CompleteCallback = (blob: Blob, filename: string) => void;
type ErrorCallback = (error: Error) => void;

/** Max buffered amount before pausing sends (256KB) */
const BUFFER_THRESHOLD = 256 * 1024;

export class WebRTCSender {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private signaling: SignalingClient;
  private roomId: string;
  private peerId: string;
  private fileKey: Uint8Array;
  private iceConfig: RTCConfiguration;
  private onProgress?: ProgressCallback;
  private onError?: ErrorCallback;
  private connectedPeers = 0;

  constructor(opts: {
    signaling: SignalingClient;
    roomId: string;
    peerId: string;
    fileKey: Uint8Array;
    iceConfig?: IceConfig;
    onProgress?: ProgressCallback;
    onError?: ErrorCallback;
  }) {
    this.signaling = opts.signaling;
    this.roomId = opts.roomId;
    this.peerId = opts.peerId;
    this.fileKey = opts.fileKey;
    this.onProgress = opts.onProgress;
    this.onError = opts.onError;
    this.iceConfig = opts.iceConfig ? this.buildRTCConfig(opts.iceConfig) : DEFAULT_ICE;
  }

  /** Start hosting — create room and wait for peers */
  async host(): Promise<void> {
    this.signaling.on('peer-joined', (msg) => this.handlePeerJoined(msg as unknown as Record<string, unknown>));
    this.signaling.on('signal', (msg) => this.handleSignal(msg as unknown as Record<string, unknown>));

    this.signaling.send({
      type: 'create',
      roomId: this.roomId,
      peerId: this.peerId,
    });
  }

  /** Send a file to the connected peer */
  async sendFile(file: File): Promise<void> {
    const data = new Uint8Array(await file.arrayBuffer());
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);

    // Wait for data channel to be open
    await this.waitForDataChannel();

    // Send metadata
    const meta: FileMeta = {
      type: 'meta',
      name: file.name,
      size: file.size,
      totalChunks,
      mimeType: file.type || 'application/octet-stream',
    };
    this.dc!.send(JSON.stringify(meta));

    // Send encrypted chunks with backpressure handling
    let bytesSent = 0;
    const startTime = Date.now();

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, data.length);
      const chunk = data.slice(start, end);
      const encrypted = encryptChunk(chunk, this.fileKey);

      // Build binary message: [4 bytes index | encrypted data]
      const msg = new ArrayBuffer(4 + encrypted.length);
      new DataView(msg).setUint32(0, i, false);
      new Uint8Array(msg, 4).set(encrypted);

      // Backpressure: wait if buffer is too full
      await this.waitForBuffer();
      this.dc!.send(msg);

      bytesSent += chunk.length;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = elapsed > 0 ? bytesSent / elapsed : 0;
      const remaining = file.size - bytesSent;
      const eta = speed > 0 ? remaining / speed : Infinity;

      this.onProgress?.({
        bytesTransferred: bytesSent,
        totalBytes: file.size,
        speed,
        percentage: (bytesSent / file.size) * 100,
        eta,
        peersConnected: this.connectedPeers,
        mode: 'webrtc',
        status: 'transferring',
      });
    }

    // Signal completion
    this.dc!.send(JSON.stringify({ type: 'done' }));

    this.onProgress?.({
      bytesTransferred: file.size,
      totalBytes: file.size,
      speed: 0,
      percentage: 100,
      eta: 0,
      peersConnected: this.connectedPeers,
      mode: 'webrtc',
      status: 'complete',
    });
  }

  destroy(): void {
    this.dc?.close();
    this.pc?.close();
    this.dc = null;
    this.pc = null;
  }

  private handlePeerJoined(msg: Record<string, unknown>): void {
    if (msg.type !== 'peer-joined') return;
    this.connectedPeers++;
    this.createPeerConnection(msg.peerId as string, true);
  }

  private handleSignal(msg: Record<string, unknown>): void {
    if (msg.type !== 'signal') return;
    const peerId = msg.peerId as string;
    const data = msg.data as Record<string, unknown>;

    if (!this.pc) {
      this.createPeerConnection(peerId, false);
    }

    if (data.sdp) {
      const desc = data as unknown as RTCSessionDescriptionInit;
      this.pc!.setRemoteDescription(desc).then(() => {
        if (desc.type === 'offer') {
          return this.pc!.createAnswer();
        }
        return undefined;
      }).then((answer) => {
        if (answer) {
          this.pc!.setLocalDescription(answer);
          this.signaling.send({
            type: 'signal',
            peerId: this.peerId,
            targetId: peerId,
            data: answer,
          });
        }
      }).catch((err: Error) => this.onError?.(err));
    } else if (data.candidate) {
      this.pc!.addIceCandidate(data as unknown as RTCIceCandidateInit).catch(() => {});
    }
  }

  private createPeerConnection(targetPeerId: string, initiator: boolean): void {
    this.pc = new RTCPeerConnection(this.iceConfig);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send({
          type: 'signal',
          peerId: this.peerId,
          targetId: targetPeerId,
          data: event.candidate.toJSON(),
        });
      }
    };

    if (initiator) {
      this.dc = this.pc.createDataChannel('file', {
        ordered: true,
      });
      this.dc.binaryType = 'arraybuffer';
      this.setupDataChannel();

      this.pc.createOffer().then((offer) => {
        this.pc!.setLocalDescription(offer);
        this.signaling.send({
          type: 'signal',
          peerId: this.peerId,
          targetId: targetPeerId,
          data: offer,
        });
      });
    } else {
      this.pc.ondatachannel = (event) => {
        this.dc = event.channel;
        this.dc.binaryType = 'arraybuffer';
        this.setupDataChannel();
      };
    }
  }

  private setupDataChannel(): void {
    // Data channel is ready — sendFile will use it
  }

  private waitForDataChannel(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.dc?.readyState === 'open') {
        resolve();
        return;
      }

      const timeout = setTimeout(() => reject(new Error('Data channel timeout')), 30000);

      const check = () => {
        if (this.dc?.readyState === 'open') {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  private waitForBuffer(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (!this.dc || this.dc.bufferedAmount < BUFFER_THRESHOLD) {
          resolve();
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }

  private buildRTCConfig(config: IceConfig): RTCConfiguration {
    const iceServers: RTCIceServer[] = [
      ...config.stunServers.map((url: string) => ({ urls: url })),
      ...config.turnServers.map((t: { urls: string; username?: string; credential?: string }) => ({
        urls: t.urls,
        username: t.username,
        credential: t.credential,
      })),
    ];
    return { iceServers };
  }
}

export class WebRTCReceiver {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private signaling: SignalingClient;
  private roomId: string;
  private peerId: string;
  private fileKey: Uint8Array;
  private iceConfig: RTCConfiguration;
  private onProgress?: ProgressCallback;
  private onComplete?: CompleteCallback;
  private onError?: ErrorCallback;

  private fileMeta: FileMeta | null = null;
  private chunks: (Uint8Array | null)[] = [];
  private receivedBytes = 0;
  private startTime = 0;

  constructor(opts: {
    signaling: SignalingClient;
    roomId: string;
    peerId: string;
    fileKey: Uint8Array;
    iceConfig?: IceConfig;
    onProgress?: ProgressCallback;
    onComplete?: CompleteCallback;
    onError?: ErrorCallback;
  }) {
    this.signaling = opts.signaling;
    this.roomId = opts.roomId;
    this.peerId = opts.peerId;
    this.fileKey = opts.fileKey;
    this.onProgress = opts.onProgress;
    this.onComplete = opts.onComplete;
    this.onError = opts.onError;
    this.iceConfig = opts.iceConfig ? this.buildRTCConfig(opts.iceConfig) : DEFAULT_ICE;
  }

  /** Join room and start receiving */
  async join(): Promise<void> {
    this.signaling.on('signal', (msg) => this.handleSignal(msg as unknown as Record<string, unknown>));
    this.signaling.on('joined', () => {
      // Connected to room, waiting for peer connection
    });

    this.signaling.send({
      type: 'join',
      roomId: this.roomId,
      peerId: this.peerId,
    });
  }

  destroy(): void {
    this.dc?.close();
    this.pc?.close();
    this.dc = null;
    this.pc = null;
  }

  private handleSignal(msg: Record<string, unknown>): void {
    if (msg.type !== 'signal') return;
    const peerId = msg.peerId as string;
    const data = msg.data as Record<string, unknown>;

    if (!this.pc) {
      this.createPeerConnection(peerId);
    }

    if (data.sdp) {
      const desc = data as unknown as RTCSessionDescriptionInit;
      this.pc!.setRemoteDescription(desc).then(() => {
        if (desc.type === 'offer') {
          return this.pc!.createAnswer();
        }
        return undefined;
      }).then((answer) => {
        if (answer) {
          this.pc!.setLocalDescription(answer);
          this.signaling.send({
            type: 'signal',
            peerId: this.peerId,
            targetId: peerId,
            data: answer,
          });
        }
      }).catch((err: Error) => this.onError?.(err));
    } else if (data.candidate) {
      this.pc!.addIceCandidate(data as unknown as RTCIceCandidateInit).catch(() => {});
    }
  }

  private createPeerConnection(targetPeerId: string): void {
    this.pc = new RTCPeerConnection(this.iceConfig);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send({
          type: 'signal',
          peerId: this.peerId,
          targetId: targetPeerId,
          data: event.candidate.toJSON(),
        });
      }
    };

    this.pc.ondatachannel = (event) => {
      this.dc = event.channel;
      this.dc.binaryType = 'arraybuffer';
      this.dc.onmessage = (e) => this.handleMessage(e);
    };
  }

  private handleMessage(event: MessageEvent): void {
    // String messages are JSON control messages
    if (typeof event.data === 'string') {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'meta') {
          this.fileMeta = msg as FileMeta;
          this.chunks = new Array(this.fileMeta.totalChunks).fill(null);
          this.receivedBytes = 0;
          this.startTime = Date.now();

          this.onProgress?.({
            bytesTransferred: 0,
            totalBytes: this.fileMeta.size,
            speed: 0,
            percentage: 0,
            eta: Infinity,
            peersConnected: 1,
            mode: 'webrtc',
            status: 'transferring',
          });
        } else if (msg.type === 'done') {
          this.assembleAndComplete();
        }
      } catch {
        // Ignore malformed messages
      }
      return;
    }

    // Binary messages are encrypted chunks: [4 bytes index | encrypted data]
    if (event.data instanceof ArrayBuffer) {
      const view = new DataView(event.data);
      const index = view.getUint32(0, false);
      const encrypted = new Uint8Array(event.data, 4);
      const decrypted = decryptChunk(encrypted, this.fileKey);

      if (!decrypted) {
        this.onError?.(new Error('Decryption failed for chunk ' + index));
        return;
      }

      this.chunks[index] = decrypted;
      this.receivedBytes += decrypted.length;

      const elapsed = (Date.now() - this.startTime) / 1000;
      const speed = elapsed > 0 ? this.receivedBytes / elapsed : 0;
      const remaining = (this.fileMeta?.size ?? 0) - this.receivedBytes;
      const eta = speed > 0 ? remaining / speed : Infinity;

      this.onProgress?.({
        bytesTransferred: this.receivedBytes,
        totalBytes: this.fileMeta?.size ?? 0,
        speed,
        percentage: this.fileMeta ? (this.receivedBytes / this.fileMeta.size) * 100 : 0,
        eta,
        peersConnected: 1,
        mode: 'webrtc',
        status: 'transferring',
      });
    }
  }

  private assembleAndComplete(): void {
    if (!this.fileMeta) return;

    this.onProgress?.({
      bytesTransferred: this.fileMeta.size,
      totalBytes: this.fileMeta.size,
      speed: 0,
      percentage: 100,
      eta: 0,
      peersConnected: 1,
      mode: 'webrtc',
      status: 'complete',
    });

    // Assemble chunks into blob
    const validChunks = this.chunks.filter((c): c is Uint8Array => c !== null);
    const blob = new Blob(validChunks.map((c) => c.buffer as ArrayBuffer), { type: this.fileMeta.mimeType });
    this.onComplete?.(blob, this.fileMeta.name);
  }

  private buildRTCConfig(config: IceConfig): RTCConfiguration {
    const iceServers: RTCIceServer[] = [
      ...config.stunServers.map((url: string) => ({ urls: url })),
      ...config.turnServers.map((t: { urls: string; username?: string; credential?: string }) => ({
        urls: t.urls,
        username: t.username,
        credential: t.credential,
      })),
    ];
    return { iceServers };
  }
}
