import type { TransferProgress, IceConfig } from '../../shared/types';
import { SignalingClient } from '../signaling/client';
import { WebRTCSender, WebRTCReceiver } from './webrtc';
import { WebTorrentSender, WebTorrentReceiver } from './webtorrent';
import { generateFileKey, encodeKey, decodeKey } from '../crypto/encrypt';
import { generateRoomId, generatePeerId } from '../utils/format';
import { buildShareUrl, parseShareUrl } from '../utils/url';

export type TransferMode = 'webrtc' | 'webtorrent' | 'auto';

type ProgressCallback = (progress: TransferProgress) => void;
type ShareUrlCallback = (url: string) => void;
type CompleteCallback = (blob: Blob, filename: string) => void;
type ErrorCallback = (error: Error) => void;

export class TransferManager {
  private signaling: SignalingClient;
  private iceConfig?: IceConfig;
  private mode: TransferMode = 'auto';

  private rtcSender: WebRTCSender | null = null;
  private rtcReceiver: WebRTCReceiver | null = null;
  private torrentSender: WebTorrentSender | null = null;
  private torrentReceiver: WebTorrentReceiver | null = null;

  private onProgress?: ProgressCallback;
  private onShareUrl?: ShareUrlCallback;
  private onComplete?: CompleteCallback;
  private onError?: ErrorCallback;

  constructor(opts?: { signalingUrl?: string; iceConfig?: IceConfig }) {
    this.signaling = new SignalingClient(opts?.signalingUrl);
    this.iceConfig = opts?.iceConfig;
  }

  /** Set event handlers */
  on(event: 'progress', cb: ProgressCallback): this;
  on(event: 'share-url', cb: ShareUrlCallback): this;
  on(event: 'complete', cb: CompleteCallback): this;
  on(event: 'error', cb: ErrorCallback): this;
  on(event: string, cb: ((...args: never[]) => void)): this {
    switch (event) {
      case 'progress':
        this.onProgress = cb as ProgressCallback;
        break;
      case 'share-url':
        this.onShareUrl = cb as ShareUrlCallback;
        break;
      case 'complete':
        this.onComplete = cb as CompleteCallback;
        break;
      case 'error':
        this.onError = cb as ErrorCallback;
        break;
    }
    return this;
  }

  /** Set the transfer mode */
  setMode(mode: TransferMode): void {
    this.mode = mode;
  }

  /** Share a file — creates a room and starts serving */
  async share(file: File): Promise<string> {
    const fileKey = generateFileKey();
    const roomId = generateRoomId();
    const peerId = generatePeerId();
    const keyEncoded = encodeKey(fileKey);

    const useWebRTC = this.mode === 'webrtc' || this.mode === 'auto';
    const useWebTorrent = this.mode === 'webtorrent' || this.mode === 'auto';

    let torrentHash: string | undefined;

    // Start WebTorrent seeding in parallel if enabled
    if (useWebTorrent) {
      this.torrentSender = new WebTorrentSender({
        fileKey,
        onProgress: this.onProgress,
        onError: (err) => {
          // WebTorrent errors are non-fatal in auto mode
          if (this.mode === 'webtorrent') this.onError?.(err);
        },
      });

      try {
        torrentHash = await this.torrentSender.seed(file);
      } catch {
        // WebTorrent seeding failed, continue with WebRTC only
        this.torrentSender = null;
      }
    }

    // Build share URL
    const shareUrl = buildShareUrl({ roomId, key: keyEncoded, torrentHash });
    this.onShareUrl?.(shareUrl);

    // Start WebRTC hosting
    if (useWebRTC) {
      await this.signaling.connect();

      this.rtcSender = new WebRTCSender({
        signaling: this.signaling,
        roomId,
        peerId,
        fileKey,
        iceConfig: this.iceConfig,
        onProgress: this.onProgress,
        onError: this.onError,
      });

      await this.rtcSender.host();

      // When a peer connects, send the file
      this.signaling.on('peer-joined', async () => {
        try {
          await this.rtcSender!.sendFile(file);
        } catch (err) {
          this.onError?.(err as Error);
        }
      });
    }

    return shareUrl;
  }

  /** Receive a file — joins a room and downloads */
  async receive(hash: string): Promise<void> {
    const shareData = parseShareUrl(hash);
    if (!shareData) {
      this.onError?.(new Error('Invalid share link'));
      return;
    }

    const fileKey = decodeKey(shareData.key);
    const peerId = generatePeerId();

    this.onProgress?.({
      bytesTransferred: 0,
      totalBytes: 0,
      speed: 0,
      percentage: 0,
      eta: Infinity,
      peersConnected: 0,
      mode: 'webrtc',
      status: 'connecting',
    });

    const useWebRTC = this.mode === 'webrtc' || this.mode === 'auto';

    if (useWebRTC) {
      try {
        await this.signaling.connect();

        this.rtcReceiver = new WebRTCReceiver({
          signaling: this.signaling,
          roomId: shareData.roomId,
          peerId,
          fileKey,
          iceConfig: this.iceConfig,
          onProgress: this.onProgress,
          onComplete: this.onComplete,
          onError: (err) => {
            // If WebRTC fails and we have a torrent hash, try WebTorrent
            if (shareData.torrentHash && this.mode === 'auto') {
              this.fallbackToWebTorrent(shareData.torrentHash, fileKey);
            } else {
              this.onError?.(err);
            }
          },
        });

        await this.rtcReceiver.join();

        // Timeout: if no data after 15s, try WebTorrent fallback
        if (shareData.torrentHash && this.mode === 'auto') {
          setTimeout(() => {
            if (this.rtcReceiver && !this.torrentReceiver) {
              this.fallbackToWebTorrent(shareData.torrentHash!, fileKey);
            }
          }, 15000);
        }
      } catch {
        // WebRTC failed, try WebTorrent
        if (shareData.torrentHash) {
          this.fallbackToWebTorrent(shareData.torrentHash, fileKey);
        } else {
          this.onError?.(new Error('Connection failed — sender may be offline'));
        }
      }
    } else if (shareData.torrentHash) {
      this.fallbackToWebTorrent(shareData.torrentHash, fileKey);
    } else {
      this.onError?.(new Error('No WebTorrent hash available'));
    }
  }

  /** Clean up all connections */
  destroy(): void {
    this.rtcSender?.destroy();
    this.rtcReceiver?.destroy();
    this.torrentSender?.destroy();
    this.torrentReceiver?.destroy();
    this.signaling.disconnect();
  }

  private fallbackToWebTorrent(infoHash: string, fileKey: Uint8Array): void {
    this.onProgress?.({
      bytesTransferred: 0,
      totalBytes: 0,
      speed: 0,
      percentage: 0,
      eta: Infinity,
      peersConnected: 0,
      mode: 'webtorrent',
      status: 'connecting',
    });

    this.torrentReceiver = new WebTorrentReceiver({
      fileKey,
      onProgress: this.onProgress,
      onComplete: this.onComplete,
      onError: this.onError,
    });

    this.torrentReceiver.download(infoHash);
  }
}
