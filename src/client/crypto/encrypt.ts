import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/** Chunk size for file splitting (64 KB) */
export const CHUNK_SIZE = 64 * 1024;

/** Generate a random symmetric key for file encryption */
export function generateFileKey(): Uint8Array {
  return nacl.randomBytes(nacl.secretbox.keyLength);
}

/** Encode a file key to URL-safe base64 */
export function encodeKey(key: Uint8Array): string {
  return encodeBase64(key).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode a URL-safe base64 key */
export function decodeKey(encoded: string): Uint8Array {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return decodeBase64(padded);
}

/** Encrypt a single chunk using NaCl secretbox (XSalsa20-Poly1305) */
export function encryptChunk(chunk: Uint8Array, key: Uint8Array): Uint8Array {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const encrypted = nacl.secretbox(chunk, nonce, key);
  // Prepend nonce to ciphertext: [nonce (24 bytes) | ciphertext]
  const result = new Uint8Array(nonce.length + encrypted.length);
  result.set(nonce);
  result.set(encrypted, nonce.length);
  return result;
}

/** Decrypt a single chunk (nonce is prepended to the data) */
export function decryptChunk(data: Uint8Array, key: Uint8Array): Uint8Array | null {
  if (data.length < nacl.secretbox.nonceLength) return null;
  const nonce = data.slice(0, nacl.secretbox.nonceLength);
  const ciphertext = data.slice(nacl.secretbox.nonceLength);
  return nacl.secretbox.open(ciphertext, nonce, key);
}

/** Encrypt an entire file (for WebTorrent mode) */
export function encryptFile(data: Uint8Array, key: Uint8Array): Uint8Array {
  return encryptChunk(data, key);
}

/** Decrypt an entire file (for WebTorrent mode) */
export function decryptFile(data: Uint8Array, key: Uint8Array): Uint8Array | null {
  return decryptChunk(data, key);
}

/** Split a file into chunks */
export function chunkFile(data: Uint8Array, chunkSize: number = CHUNK_SIZE): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < data.length; offset += chunkSize) {
    chunks.push(data.slice(offset, offset + chunkSize));
  }
  return chunks;
}

/** Assemble chunks back into a file */
export function assembleChunks(chunks: (Uint8Array | null)[], totalSize: number): Uint8Array {
  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    if (!chunk) throw new Error('Missing chunk during assembly');
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
