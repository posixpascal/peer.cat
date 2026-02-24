import type { TransferProgress } from '../../shared/types';
import { encryptFile, decryptFile, generateFileKey, encodeKey } from '../crypto/encrypt';

type ProgressCallback = (progress: TransferProgress) => void;
type CompleteCallback = (blob: Blob, filename: string) => void;
type ErrorCallback = (error: Error) => void;

/** Lazy-load WebTorrent to keep initial bundle small */
async function loadWebTorrent(): Promise<typeof import('webtorrent')> {
  return import('webtorrent');
}

export class WebTorrentSender {
  private client: InstanceType<(typeof import('webtorrent'))['default']> | null = null;
  private fileKey: Uint8Array;
  private trackerUrl: string;
  private onProgress?: ProgressCallback;
  private onError?: ErrorCallback;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private _infoHash: string | null = null;

  constructor(opts: {
    fileKey: Uint8Array;
    trackerUrl?: string;
    onProgress?: ProgressCallback;
    onError?: ErrorCallback;
  }) {
    this.fileKey = opts.fileKey;
    this.trackerUrl = opts.trackerUrl || `wss://${window.location.host}/tracker`;
    this.onProgress = opts.onProgress;
    this.onError = opts.onError;
  }

  get infoHash(): string | null {
    return this._infoHash;
  }

  /** Seed an encrypted version of the file */
  async seed(file: File): Promise<string> {
    try {
      const WebTorrent = (await loadWebTorrent()).default;
      this.client = new WebTorrent();

      // Read and encrypt the file
      this.onProgress?.({
        bytesTransferred: 0,
        totalBytes: file.size,
        speed: 0,
        percentage: 0,
        eta: Infinity,
        peersConnected: 0,
        mode: 'webtorrent',
        status: 'encrypting',
      });

      const data = new Uint8Array(await file.arrayBuffer());
      const encrypted = encryptFile(data, this.fileKey);
      const encryptedBlob = new Blob([encrypted.buffer as ArrayBuffer], { type: 'application/octet-stream' });

      // Create a File object from the encrypted blob
      const encryptedFile = new File([encryptedBlob], file.name + '.enc', {
        type: 'application/octet-stream',
      });

      return new Promise((resolve, reject) => {
        this.client!.seed(encryptedFile as unknown as File, {
          announce: [this.trackerUrl],
        }, (torrent) => {
          this._infoHash = torrent.infoHash;

          this.updateInterval = setInterval(() => {
            this.onProgress?.({
              bytesTransferred: torrent.uploaded,
              totalBytes: file.size,
              speed: torrent.uploadSpeed,
              percentage: 100,
              eta: 0,
              peersConnected: torrent.numPeers,
              mode: 'webtorrent',
              status: 'complete',
            });
          }, 1000);

          resolve(torrent.infoHash);
        });

        this.client!.on('error', (err: Error) => {
          this.onError?.(err);
          reject(err);
        });
      });
    } catch (err) {
      this.onError?.(err as Error);
      throw err;
    }
  }

  destroy(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);
    this.client?.destroy();
    this.client = null;
  }
}

export class WebTorrentReceiver {
  private client: InstanceType<(typeof import('webtorrent'))['default']> | null = null;
  private fileKey: Uint8Array;
  private trackerUrl: string;
  private onProgress?: ProgressCallback;
  private onComplete?: CompleteCallback;
  private onError?: ErrorCallback;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  constructor(opts: {
    fileKey: Uint8Array;
    trackerUrl?: string;
    onProgress?: ProgressCallback;
    onComplete?: CompleteCallback;
    onError?: ErrorCallback;
  }) {
    this.fileKey = opts.fileKey;
    this.trackerUrl = opts.trackerUrl || `wss://${window.location.host}/tracker`;
    this.onProgress = opts.onProgress;
    this.onComplete = opts.onComplete;
    this.onError = opts.onError;
  }

  /** Download and decrypt a torrent by info hash */
  async download(infoHash: string): Promise<void> {
    try {
      const WebTorrent = (await loadWebTorrent()).default;
      this.client = new WebTorrent();

      const magnetUri = `magnet:?xt=urn:btih:${infoHash}&tr=${encodeURIComponent(this.trackerUrl)}`;

      this.client.add(magnetUri, (torrent) => {
        this.updateInterval = setInterval(() => {
          this.onProgress?.({
            bytesTransferred: torrent.downloaded,
            totalBytes: torrent.length,
            speed: torrent.downloadSpeed,
            percentage: torrent.progress * 100,
            eta: torrent.timeRemaining / 1000,
            peersConnected: torrent.numPeers,
            mode: 'webtorrent',
            status: 'transferring',
          });
        }, 500);

        torrent.on('done', () => {
          if (this.updateInterval) clearInterval(this.updateInterval);

          this.onProgress?.({
            bytesTransferred: torrent.length,
            totalBytes: torrent.length,
            speed: 0,
            percentage: 100,
            eta: 0,
            peersConnected: torrent.numPeers,
            mode: 'webtorrent',
            status: 'decrypting',
          });

          // Get the encrypted file and decrypt it
          const file = torrent.files[0];
          file.arrayBuffer().then((buffer: ArrayBuffer) => {
            const encrypted = new Uint8Array(buffer);
            const decrypted = decryptFile(encrypted, this.fileKey);

            if (!decrypted) {
              this.onError?.(new Error('Decryption failed — invalid key'));
              return;
            }

            // Strip .enc extension from filename
            const originalName = file.name.endsWith('.enc')
              ? file.name.slice(0, -4)
              : file.name;

            const blob = new Blob([decrypted.buffer as ArrayBuffer]);
            this.onComplete?.(blob, originalName);

            this.onProgress?.({
              bytesTransferred: torrent.length,
              totalBytes: torrent.length,
              speed: 0,
              percentage: 100,
              eta: 0,
              peersConnected: torrent.numPeers,
              mode: 'webtorrent',
              status: 'complete',
            });
          });
        });

        torrent.on('error', (err: Error) => {
          this.onError?.(err);
        });
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.client && this.client.torrents.length > 0) {
          const torrent = this.client.torrents[0];
          if (torrent.progress < 0.01) {
            this.onError?.(new Error('No peers found — file may no longer be available'));
          }
        }
      }, 30000);

    } catch (err) {
      this.onError?.(err as Error);
    }
  }

  destroy(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);
    this.client?.destroy();
    this.client = null;
  }
}
