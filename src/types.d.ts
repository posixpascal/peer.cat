declare module 'webtorrent' {
  interface TorrentFile {
    name: string;
    length: number;
    path: string;
    arrayBuffer(): Promise<ArrayBuffer>;
    getBlobURL(cb: (err: Error | null, url?: string) => void): void;
    createReadStream(opts?: Record<string, unknown>): NodeJS.ReadableStream;
  }

  interface Torrent {
    infoHash: string;
    magnetURI: string;
    name: string;
    length: number;
    files: TorrentFile[];
    progress: number;
    downloaded: number;
    uploaded: number;
    downloadSpeed: number;
    uploadSpeed: number;
    numPeers: number;
    timeRemaining: number;
    on(event: 'done', cb: () => void): void;
    on(event: 'download' | 'upload', cb: (bytes: number) => void): void;
    on(event: 'error', cb: (err: Error) => void): void;
    on(event: 'warning', cb: (err: Error) => void): void;
    on(event: string, cb: (...args: unknown[]) => void): void;
    destroy(opts?: Record<string, unknown>, cb?: () => void): void;
  }

  interface SeedOptions {
    announce?: string[];
    name?: string;
  }

  class WebTorrent {
    constructor(opts?: Record<string, unknown>);
    seed(input: string | File | Buffer, opts?: SeedOptions, cb?: (torrent: Torrent) => void): Torrent;
    seed(input: string | File | Buffer, cb?: (torrent: Torrent) => void): Torrent;
    add(magnetUri: string, opts?: Record<string, unknown>, cb?: (torrent: Torrent) => void): Torrent;
    add(magnetUri: string, cb?: (torrent: Torrent) => void): Torrent;
    torrents: Torrent[];
    on(event: 'error', cb: (err: Error) => void): void;
    on(event: string, cb: (...args: unknown[]) => void): void;
    destroy(cb?: () => void): void;
  }

  export default WebTorrent;
}

declare module 'bittorrent-tracker' {
  interface TrackerServerOptions {
    udp?: boolean;
    http?: boolean;
    ws?: boolean;
    stats?: boolean;
    filter?: (infoHash: string, params: unknown, cb: (err: Error | null) => void) => void;
  }

  class Server {
    constructor(opts?: TrackerServerOptions);
    listen(port: number, hostname?: string, cb?: () => void): void;
    close(): void;
    on(event: 'error' | 'warning', cb: (err: Error) => void): void;
    on(event: 'start' | 'complete' | 'update' | 'stop', cb: (addr: string) => void): void;
    http: { address(): { port: number } };
    udp: { address(): { port: number } };
  }

  export default Server;
}
