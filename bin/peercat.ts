#!/usr/bin/env npx tsx

import { createWriteStream, existsSync } from 'fs';
import { resolve, basename } from 'path';
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

const CHUNK_SIZE = 64 * 1024;
const SEPARATOR = '.';

// ---- Utilities ----

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(k)), units.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function generateKey(): Uint8Array {
  return nacl.randomBytes(nacl.secretbox.keyLength);
}

function encodeKey(key: Uint8Array): string {
  return encodeBase64(key).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateRoomId(): string {
  const bytes = nacl.randomBytes(9);
  return Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, '0').slice(-2))
    .join('')
    .slice(0, 12);
}

// ---- Colors (minimal ANSI) ----

const c = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

// ---- Main ----

const filename = process.argv[2];

if (!filename) {
  console.log(`
${c.bold}${c.cyan}peer.cat${c.reset} ${c.dim}v2.0 — anonymous encrypted file sharing${c.reset}

${c.bold}Usage:${c.reset}
  peercat <file>              Share a file
  peercat <share-url>         Download a shared file

${c.bold}Examples:${c.reset}
  peercat document.pdf
  peercat https://peer.cat/#abc123.key456

${c.bold}Features:${c.reset}
  ${c.green}*${c.reset} Ed25519 identity keypairs
  ${c.green}*${c.reset} NaCl secretbox encryption (XSalsa20-Poly1305)
  ${c.green}*${c.reset} WebTorrent P2P transfer
  ${c.green}*${c.reset} No file size limits

${c.dim}All transfers are end-to-end encrypted.${c.reset}
`);
  process.exit(0);
}

// Check if downloading or seeding
if (!existsSync(filename) && (filename.includes('peer.cat') || filename.includes(SEPARATOR))) {
  downloadFile(filename);
} else if (existsSync(filename)) {
  seedFile(filename);
} else {
  console.error(`${c.red}Error:${c.reset} File not found: ${filename}`);
  process.exit(1);
}

async function seedFile(filepath: string): Promise<void> {
  const resolvedPath = resolve(filepath);
  const name = basename(resolvedPath);

  console.log(`\n${c.cyan}${c.bold}peer.cat${c.reset} ${c.dim}v2.0${c.reset}\n`);
  console.log(`${c.dim}Encrypting and seeding:${c.reset} ${c.bold}${name}${c.reset}`);

  const fileKey = generateKey();
  const roomId = generateRoomId();
  const keyEncoded = encodeKey(fileKey);

  // Dynamic import webtorrent
  const WebTorrent = (await import('webtorrent')).default;
  const client = new WebTorrent();

  // Read file, encrypt it
  const fs = await import('fs');
  const data = new Uint8Array(fs.readFileSync(resolvedPath));

  console.log(`${c.dim}Size:${c.reset} ${formatBytes(data.length)}`);
  console.log(`${c.dim}Encrypting...${c.reset}`);

  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const encrypted = nacl.secretbox(data, nonce, fileKey);
  const encryptedBlob = Buffer.concat([Buffer.from(nonce), Buffer.from(encrypted)]);

  // Create temp file for encrypted data
  const os = await import('os');
  const path = await import('path');
  const tmpPath = path.join(os.tmpdir(), `peercat-${roomId}.enc`);
  fs.writeFileSync(tmpPath, encryptedBlob);

  client.seed(tmpPath, { name: name + '.enc' }, (torrent) => {
    const shareUrl = `https://peer.cat/#${roomId}${SEPARATOR}${keyEncoded}${SEPARATOR}${torrent.infoHash}`;

    console.log(`\n${c.green}${c.bold}Sharing active${c.reset}\n`);
    console.log(`${c.dim}Share URL:${c.reset}`);
    console.log(`${c.cyan}${shareUrl}${c.reset}\n`);
    console.log(`${c.yellow}Do not share this link publicly.${c.reset}`);
    console.log(`${c.dim}Press Ctrl+C to stop sharing.${c.reset}\n`);

    setInterval(() => {
      process.stdout.write(
        `\r${c.dim}UP:${c.reset} ${c.cyan}${formatBytes(torrent.uploadSpeed)}/s${c.reset}  ` +
        `${c.dim}PEERS:${c.reset} ${c.cyan}${torrent.numPeers}${c.reset}  ` +
        `${c.dim}SENT:${c.reset} ${c.cyan}${formatBytes(torrent.uploaded)}${c.reset}  `,
      );
    }, 500);

    process.on('SIGINT', () => {
      console.log(`\n\n${c.dim}Cleaning up...${c.reset}`);
      client.destroy();
      try { fs.unlinkSync(tmpPath); } catch {}
      process.exit(0);
    });
  });
}

async function downloadFile(input: string): Promise<void> {
  console.log(`\n${c.cyan}${c.bold}peer.cat${c.reset} ${c.dim}v2.0${c.reset}\n`);

  let infoHash: string;
  let keyEncoded: string;

  // Parse share URL
  try {
    let fragment = input;
    if (input.includes('#')) {
      fragment = input.split('#')[1];
    }
    const parts = fragment.split(SEPARATOR);
    if (parts.length < 3) {
      console.error(`${c.red}Error:${c.reset} Invalid share URL — missing torrent hash for CLI download`);
      process.exit(1);
    }
    keyEncoded = parts[1];
    infoHash = parts[2];
  } catch {
    console.error(`${c.red}Error:${c.reset} Could not parse share URL`);
    process.exit(1);
    return;
  }

  // Decode key
  const { decodeBase64 } = await import('tweetnacl-util');
  const base64 = keyEncoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const fileKey = decodeBase64(padded);

  console.log(`${c.dim}Fetching:${c.reset} ${infoHash}`);

  const WebTorrent = (await import('webtorrent')).default;
  const client = new WebTorrent();

  const timeout = setTimeout(() => {
    console.error(`\n${c.red}Error:${c.reset} No peers found — file may no longer be available.`);
    client.destroy();
    process.exit(1);
  }, 30000);

  client.add(infoHash, (torrent) => {
    clearTimeout(timeout);
    console.log(`${c.dim}File:${c.reset} ${c.bold}${torrent.name}${c.reset}`);
    console.log(`${c.dim}Size:${c.reset} ${formatBytes(torrent.length)}`);
    console.log('');

    const progressInterval = setInterval(() => {
      const pct = (torrent.progress * 100).toFixed(1);
      process.stdout.write(
        `\r${c.dim}DOWN:${c.reset} ${c.cyan}${formatBytes(torrent.downloadSpeed)}/s${c.reset}  ` +
        `${c.dim}PROGRESS:${c.reset} ${c.cyan}${pct}%${c.reset}  ` +
        `${c.dim}PEERS:${c.reset} ${c.cyan}${torrent.numPeers}${c.reset}  `,
      );
    }, 500);

    torrent.on('done', () => {
      clearInterval(progressInterval);
      console.log(`\n\n${c.dim}Decrypting...${c.reset}`);

      const file = torrent.files[0];
      file.arrayBuffer().then((buffer: ArrayBuffer) => {
        const encryptedData = new Uint8Array(buffer);

        // Decrypt: [nonce (24 bytes) | ciphertext]
        const nonce = encryptedData.slice(0, nacl.secretbox.nonceLength);
        const ciphertext = encryptedData.slice(nacl.secretbox.nonceLength);
        const decrypted = nacl.secretbox.open(ciphertext, nonce, fileKey);

        if (!decrypted) {
          console.error(`${c.red}Error:${c.reset} Decryption failed — invalid key.`);
          client.destroy();
          process.exit(1);
        }

        // Strip .enc extension
        let outputName = file.name;
        if (outputName.endsWith('.enc')) {
          outputName = outputName.slice(0, -4);
        }

        const outputPath = resolve(outputName);
        const fs = require('fs');
        fs.writeFileSync(outputPath, Buffer.from(decrypted));

        console.log(`${c.green}${c.bold}Download complete${c.reset}`);
        console.log(`${c.dim}Saved:${c.reset} ${outputPath}\n`);

        client.destroy();
        process.exit(0);
      });
    });
  });
}
