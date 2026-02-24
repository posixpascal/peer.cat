/** Signaling protocol messages */

export interface SignalCreate {
  type: 'create';
  roomId: string;
  peerId: string;
}

export interface SignalJoin {
  type: 'join';
  roomId: string;
  peerId: string;
}

export interface SignalCreated {
  type: 'created';
  roomId: string;
}

export interface SignalJoined {
  type: 'joined';
  roomId: string;
  peers: string[];
}

export interface SignalSignal {
  type: 'signal';
  peerId: string;
  targetId: string;
  data: unknown;
}

export interface SignalPeerJoined {
  type: 'peer-joined';
  peerId: string;
}

export interface SignalPeerLeft {
  type: 'peer-left';
  peerId: string;
}

export interface SignalError {
  type: 'error';
  message: string;
}

export type SignalMessage =
  | SignalCreate
  | SignalJoin
  | SignalCreated
  | SignalJoined
  | SignalSignal
  | SignalPeerJoined
  | SignalPeerLeft
  | SignalError;

/** File transfer protocol */

export interface FileMeta {
  type: 'meta';
  name: string;
  size: number;
  totalChunks: number;
  mimeType: string;
}

export interface FileChunkHeader {
  type: 'chunk';
  index: number;
}

export interface FileComplete {
  type: 'done';
}

export type TransferControlMessage = FileMeta | FileComplete;

/** Transfer progress */

export interface TransferProgress {
  bytesTransferred: number;
  totalBytes: number;
  speed: number;
  percentage: number;
  eta: number;
  peersConnected: number;
  mode: 'webrtc' | 'webtorrent';
  status: 'connecting' | 'transferring' | 'encrypting' | 'decrypting' | 'complete' | 'error';
}

/** Share URL data */

export interface ShareData {
  roomId: string;
  key: string;
  torrentHash?: string;
}

/** ICE server configuration */

export interface IceConfig {
  stunServers: string[];
  turnServers: {
    urls: string;
    username?: string;
    credential?: string;
  }[];
}
