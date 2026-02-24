import type { TransferProgress } from '../shared/types';
import type { TransferMode } from './transfer/manager';
import { TransferManager } from './transfer/manager';
import { loadOrCreateIdentity, regenerateIdentity } from './crypto/identity';
import { Renderer } from './ui/renderer';

export class PeerCatApp {
  private renderer: Renderer;
  private manager: TransferManager;
  private identity = loadOrCreateIdentity();
  private mode: TransferMode = 'auto';
  private currentFile: File | null = null;
  private downloadBlob: Blob | null = null;
  private downloadFilename: string | null = null;

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.manager = new TransferManager();
    this.setupManager();
  }

  /** Initialize the app */
  run(): void {
    console.log(`peer.cat v2.0 — identity: ${this.identity.fingerprint}`);

    // Render initial UI
    this.renderer.renderApp(this.identity.fingerprint, this.mode);

    // Check if we're receiving a file
    if (window.location.hash && window.location.hash.length > 1) {
      this.renderer.showReceivePrompt();
      this.bindReceiveEvents();
    } else {
      this.bindUploadEvents();
    }

    this.bindGlobalEvents();
  }

  private setupManager(): void {
    this.manager
      .on('progress', (progress: TransferProgress) => {
        this.renderer.updateDownloadProgress(progress, this.downloadFilename ?? undefined);
      })
      .on('share-url', (url: string) => {
        if (this.currentFile) {
          this.renderer.showSeeding(this.currentFile.name, this.currentFile.size, url);
          this.bindSeedingEvents(url);
        }
      })
      .on('complete', (blob: Blob, filename: string) => {
        this.downloadBlob = blob;
        this.downloadFilename = filename;
        this.renderer.updateDownloadProgress(
          {
            bytesTransferred: blob.size,
            totalBytes: blob.size,
            speed: 0,
            percentage: 100,
            eta: 0,
            peersConnected: 1,
            mode: 'webrtc',
            status: 'complete',
          },
          filename,
        );
        this.renderer.toast('Download complete!', 'success');
        this.bindSaveEvent();
      })
      .on('error', (error: Error) => {
        this.renderer.toast(error.message, 'error');
      });
  }

  private bindUploadEvents(): void {
    // File input
    const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files?.length) {
          this.handleFiles(fileInput.files);
        }
      });
    }

    // Drag and drop
    const zone = document.getElementById('upload-zone');
    if (zone) {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer?.files?.length) {
          this.handleFiles(e.dataTransfer.files);
        }
      });
    }

    // Mode selector
    this.bindModeSelector();
  }

  private bindModeSelector(): void {
    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const newMode = (btn as HTMLElement).dataset.mode as TransferMode;
        if (newMode) {
          this.mode = newMode;
          this.manager.setMode(newMode);
          document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });
  }

  private bindReceiveEvents(): void {
    const downloadBtn = document.getElementById('start-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        this.renderer.showConnecting();
        this.manager.receive(window.location.hash);
      });
    }
  }

  private bindSeedingEvents(shareUrl: string): void {
    // Copy button
    const copyBtn = document.getElementById('copy-url');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
          this.renderer.toast('Link copied to clipboard', 'success');
        }).catch(() => {
          // Fallback: select the text
          const urlEl = document.getElementById('share-url');
          if (urlEl) {
            const range = document.createRange();
            range.selectNodeContents(urlEl);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
          }
        });
      });
    }

    // Stop sharing button
    const stopBtn = document.getElementById('stop-sharing');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.manager.destroy();
        this.manager = new TransferManager();
        this.setupManager();
        this.currentFile = null;
        this.renderer.showUploadZone(this.mode);
        this.bindUploadEvents();
        this.renderer.toast('Sharing stopped', 'info');
      });
    }
  }

  private bindSaveEvent(): void {
    const saveBtn = document.getElementById('save-file');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (this.downloadBlob && this.downloadFilename) {
          PeerCatApp.triggerDownload(this.downloadBlob, this.downloadFilename);
        }
      });
    }
  }

  private bindGlobalEvents(): void {
    // Regenerate identity
    document.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('#regen-identity')) {
        this.identity = regenerateIdentity();
        const fpEl = document.querySelector('.fingerprint');
        if (fpEl) fpEl.textContent = this.identity.fingerprint;
        this.renderer.toast('New identity generated', 'success');
      }
    });

    // Prevent default drag behavior on the whole page
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());
  }

  private async handleFiles(files: FileList): Promise<void> {
    // Take only the first file for now
    const file = files[0];
    if (!file) return;

    this.currentFile = file;
    this.renderer.showConnecting();

    try {
      await this.manager.share(file);
    } catch (err) {
      this.renderer.toast((err as Error).message, 'error');
      this.renderer.showUploadZone(this.mode);
      this.bindUploadEvents();
    }
  }

  /** Trigger a browser file download */
  static triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
