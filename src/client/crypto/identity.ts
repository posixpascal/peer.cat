import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

const STORAGE_KEY = 'peercat_identity';

export interface Identity {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  fingerprint: string;
}

/** Generate a new ed25519 keypair identity */
export function generateIdentity(): Identity {
  const keypair = nacl.sign.keyPair();
  return {
    publicKey: keypair.publicKey,
    secretKey: keypair.secretKey,
    fingerprint: deriveFingerprint(keypair.publicKey),
  };
}

/** Derive a short human-readable fingerprint from a public key */
function deriveFingerprint(publicKey: Uint8Array): string {
  const hash = nacl.hash(publicKey);
  const hex = Array.from(hash.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.match(/.{1,4}/g)!.join(':');
}

/** Load identity from localStorage or create a new one */
export function loadOrCreateIdentity(): Identity {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const { publicKey, secretKey } = JSON.parse(stored);
      const pk = decodeBase64(publicKey);
      const sk = decodeBase64(secretKey);
      return {
        publicKey: pk,
        secretKey: sk,
        fingerprint: deriveFingerprint(pk),
      };
    }
  } catch {
    // Corrupted data, regenerate
  }

  const identity = generateIdentity();
  saveIdentity(identity);
  return identity;
}

/** Persist identity to localStorage */
function saveIdentity(identity: Identity): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      publicKey: encodeBase64(identity.publicKey),
      secretKey: encodeBase64(identity.secretKey),
    }),
  );
}

/** Regenerate identity (wipes the old one) */
export function regenerateIdentity(): Identity {
  localStorage.removeItem(STORAGE_KEY);
  const identity = generateIdentity();
  saveIdentity(identity);
  return identity;
}
