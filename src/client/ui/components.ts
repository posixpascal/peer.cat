import type { TransferProgress } from '../../shared/types';
import { formatBytes, formatSpeed, formatEta } from '../utils/format';

/** Render the identity badge */
export function renderIdentity(fingerprint: string): string {
  return `
    <div class="identity-badge" title="Your anonymous identity — regenerate anytime">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      <span class="fingerprint">${fingerprint}</span>
      <button class="regen-btn" id="regen-identity" title="Generate new identity">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
      </button>
    </div>`;
}

/** Render the upload dropzone */
export function renderUploadZone(): string {
  return `
    <div class="upload-zone" id="upload-zone">
      <div class="upload-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <p class="upload-text">Drop files here or <label for="file-input" class="upload-link">browse</label></p>
      <p class="upload-hint">End-to-end encrypted. No file size limits. Peer-to-peer.</p>
      <input type="file" id="file-input" multiple hidden>
    </div>`;
}

/** Render mode selector */
export function renderModeSelector(currentMode: string): string {
  return `
    <div class="mode-selector">
      <button class="mode-btn ${currentMode === 'auto' ? 'active' : ''}" data-mode="auto">Auto</button>
      <button class="mode-btn ${currentMode === 'webrtc' ? 'active' : ''}" data-mode="webrtc">WebRTC</button>
      <button class="mode-btn ${currentMode === 'webtorrent' ? 'active' : ''}" data-mode="webtorrent">WebTorrent</button>
    </div>`;
}

/** Render the seeding card (sender view) */
export function renderSeedingCard(filename: string, fileSize: number, shareUrl: string, progress?: TransferProgress): string {
  const peers = progress?.peersConnected ?? 0;
  const speed = progress?.speed ?? 0;
  const mode = progress?.mode ?? 'webrtc';

  return `
    <div class="transfer-card seeding">
      <div class="card-header">
        <div class="card-status">
          <span class="status-dot active"></span>
          <span>Sharing</span>
        </div>
        <button class="card-close" id="stop-sharing" title="Stop sharing">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="card-file">
        <svg class="file-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
          <polyline points="13 2 13 9 20 9"/>
        </svg>
        <div class="file-info">
          <span class="file-name">${escapeHtml(filename)}</span>
          <span class="file-size">${formatBytes(fileSize)}</span>
        </div>
      </div>

      <div class="card-stats">
        <div class="stat">
          <span class="stat-label">Peers</span>
          <span class="stat-value" id="stat-peers">${peers}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Upload</span>
          <span class="stat-value" id="stat-speed">${formatSpeed(speed)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Mode</span>
          <span class="stat-value mode-badge">${mode}</span>
        </div>
      </div>

      <div class="share-url-section">
        <label class="share-label">Share this link</label>
        <div class="share-url-row">
          <code class="share-url" id="share-url">${escapeHtml(shareUrl)}</code>
          <button class="copy-btn" id="copy-url" title="Copy to clipboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
        </div>
        <p class="share-warning">Do not share this link publicly — anyone with this link can download the file.</p>
      </div>
    </div>`;
}

/** Render the receiving prompt (before download starts) */
export function renderReceivePrompt(): string {
  return `
    <div class="receive-prompt">
      <div class="receive-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </div>
      <h2>Someone is sharing a file with you</h2>
      <p>The file is end-to-end encrypted and transferred directly between peers.</p>
      <button class="btn btn-primary btn-large" id="start-download">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download
      </button>
    </div>`;
}

/** Render the download progress card */
export function renderDownloadCard(progress: TransferProgress, filename?: string): string {
  const pct = Math.min(progress.percentage, 100).toFixed(1);
  const statusText = getStatusText(progress.status);

  return `
    <div class="transfer-card downloading">
      <div class="card-header">
        <div class="card-status">
          <span class="status-dot ${progress.status === 'complete' ? 'complete' : 'active'}"></span>
          <span>${statusText}</span>
        </div>
      </div>

      ${filename ? `
      <div class="card-file">
        <svg class="file-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
          <polyline points="13 2 13 9 20 9"/>
        </svg>
        <div class="file-info">
          <span class="file-name">${escapeHtml(filename)}</span>
          <span class="file-size">${formatBytes(progress.totalBytes)}</span>
        </div>
      </div>` : ''}

      <div class="progress-section">
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${pct}%">
            <div class="progress-glow"></div>
          </div>
        </div>
        <div class="progress-info">
          <span class="progress-pct">${pct}%</span>
          <span class="progress-detail">${formatBytes(progress.bytesTransferred)} / ${formatBytes(progress.totalBytes)}</span>
        </div>
      </div>

      <div class="card-stats">
        <div class="stat">
          <span class="stat-label">Speed</span>
          <span class="stat-value" id="stat-dl-speed">${formatSpeed(progress.speed)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">ETA</span>
          <span class="stat-value" id="stat-eta">${formatEta(progress.eta)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Peers</span>
          <span class="stat-value">${progress.peersConnected}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Mode</span>
          <span class="stat-value mode-badge">${progress.mode}</span>
        </div>
      </div>

      ${progress.status === 'complete' ? `
      <button class="btn btn-primary" id="save-file">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Save File
      </button>` : ''}
    </div>`;
}

/** Render a toast notification */
export function renderToast(message: string, type: 'success' | 'error' | 'info' = 'info'): string {
  return `
    <div class="toast toast-${type}" role="alert">
      <span class="toast-message">${escapeHtml(message)}</span>
    </div>`;
}

/** Render connecting spinner */
export function renderConnecting(): string {
  return `
    <div class="connecting">
      <div class="spinner"></div>
      <p>Connecting to peer...</p>
    </div>`;
}

function getStatusText(status: TransferProgress['status']): string {
  switch (status) {
    case 'connecting':
      return 'Connecting...';
    case 'transferring':
      return 'Downloading';
    case 'encrypting':
      return 'Encrypting...';
    case 'decrypting':
      return 'Decrypting...';
    case 'complete':
      return 'Complete';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
