import type { TransferProgress } from '../../shared/types';
import {
  renderIdentity,
  renderUploadZone,
  renderModeSelector,
  renderSeedingCard,
  renderReceivePrompt,
  renderDownloadCard,
  renderConnecting,
  renderToast,
} from './components';

type View = 'upload' | 'seeding' | 'receive-prompt' | 'downloading' | 'connecting';

export class Renderer {
  private container: HTMLElement;
  private toastContainer: HTMLElement;
  private currentView: View = 'upload';
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // Create toast container
    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'toast-container';
    document.body.appendChild(this.toastContainer);
  }

  /** Render the full app layout */
  renderApp(fingerprint: string, mode: string): void {
    this.container.innerHTML = `
      <header class="header">
        <div class="logo">
          <img src="/cat.png" alt="peer.cat" width="36" height="36">
          <h1>peer.cat</h1>
        </div>
        <p class="tagline">anonymous encrypted file sharing</p>
        ${renderIdentity(fingerprint)}
      </header>

      <main class="main" id="main-content">
        ${renderModeSelector(mode)}
        ${renderUploadZone()}
      </main>

      <footer class="footer">
        <p>
          peer.cat v2.0 &mdash; end-to-end encrypted, peer-to-peer
          <span class="sep">&middot;</span>
          <a href="https://github.com/posixpascal/peer.cat" target="_blank" rel="noopener">GitHub</a>
        </p>
      </footer>
    `;
    this.currentView = 'upload';
  }

  /** Show the upload zone */
  showUploadZone(mode: string): void {
    const main = this.getMain();
    main.innerHTML = renderModeSelector(mode) + renderUploadZone();
    this.currentView = 'upload';
  }

  /** Show the connecting state */
  showConnecting(): void {
    const main = this.getMain();
    main.innerHTML = renderConnecting();
    this.currentView = 'connecting';
  }

  /** Show the seeding card */
  showSeeding(filename: string, fileSize: number, shareUrl: string, progress?: TransferProgress): void {
    const main = this.getMain();
    main.innerHTML = renderSeedingCard(filename, fileSize, shareUrl, progress);
    this.currentView = 'seeding';
  }

  /** Update seeding stats without full re-render */
  updateSeedingStats(progress: TransferProgress): void {
    const peers = document.getElementById('stat-peers');
    const speed = document.getElementById('stat-speed');
    if (peers) peers.textContent = String(progress.peersConnected);
    if (speed) {
      const { formatSpeed } = await_format();
      speed.textContent = formatSpeed(progress.speed);
    }
  }

  /** Show the receive prompt */
  showReceivePrompt(): void {
    const main = this.getMain();
    main.innerHTML = renderReceivePrompt();
    this.currentView = 'receive-prompt';
  }

  /** Show the download progress card */
  showDownloading(progress: TransferProgress, filename?: string): void {
    const main = this.getMain();
    main.innerHTML = renderDownloadCard(progress, filename);
    this.currentView = 'downloading';
  }

  /** Update download progress without full re-render */
  updateDownloadProgress(progress: TransferProgress, filename?: string): void {
    if (this.currentView !== 'downloading') {
      this.showDownloading(progress, filename);
      return;
    }

    // Update progress bar
    const pct = Math.min(progress.percentage, 100).toFixed(1);
    const bar = document.querySelector('.progress-bar') as HTMLElement | null;
    if (bar) bar.style.width = `${pct}%`;

    const pctEl = document.querySelector('.progress-pct');
    if (pctEl) pctEl.textContent = `${pct}%`;

    const detailEl = document.querySelector('.progress-detail');
    if (detailEl) {
      const { formatBytes } = await_format();
      detailEl.textContent = `${formatBytes(progress.bytesTransferred)} / ${formatBytes(progress.totalBytes)}`;
    }

    const speedEl = document.getElementById('stat-dl-speed');
    if (speedEl) {
      const { formatSpeed } = await_format();
      speedEl.textContent = formatSpeed(progress.speed);
    }

    const etaEl = document.getElementById('stat-eta');
    if (etaEl) {
      const { formatEta } = await_format();
      etaEl.textContent = formatEta(progress.eta);
    }

    // Full re-render on completion
    if (progress.status === 'complete') {
      this.showDownloading(progress, filename);
    }
  }

  /** Show a toast notification */
  toast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);

    this.toastContainer.innerHTML = renderToast(message, type);
    this.toastContainer.classList.add('visible');

    this.toastTimeout = setTimeout(() => {
      this.toastContainer.classList.remove('visible');
    }, 4000);
  }

  private getMain(): HTMLElement {
    return document.getElementById('main-content') || this.container;
  }
}

/** Synchronous import helper — these are already loaded */
function await_format() {
  // These are imported synchronously at the module level in components.ts
  // We re-export them here for convenience
  return {
    formatBytes: (bytes: number) => {
      if (bytes === 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      const k = 1024;
      const i = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(k)), units.length - 1);
      return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
    },
    formatSpeed: (bps: number) => {
      const fb = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const k = 1024;
        const i = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(k)), units.length - 1);
        return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
      };
      return `${fb(bps)}/s`;
    },
    formatEta: (seconds: number) => {
      if (!isFinite(seconds) || seconds <= 0) return '--';
      if (seconds < 60) return `${Math.ceil(seconds)}s`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h}h ${m}m`;
    },
  };
}
