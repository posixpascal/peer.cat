import type { ShareData } from '../../shared/types';

const SEPARATOR = '.';

/** Build a share URL from share data */
export function buildShareUrl(data: ShareData): string {
  const origin = window.location.origin;
  let hash = `${data.roomId}${SEPARATOR}${data.key}`;
  if (data.torrentHash) {
    hash += `${SEPARATOR}${data.torrentHash}`;
  }
  return `${origin}/#${hash}`;
}

/** Parse a share URL hash fragment into share data */
export function parseShareUrl(hash: string): ShareData | null {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!fragment) return null;

  const parts = fragment.split(SEPARATOR);
  if (parts.length < 2) return null;

  return {
    roomId: parts[0],
    key: parts[1],
    torrentHash: parts[2] || undefined,
  };
}
