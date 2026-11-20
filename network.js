// ============================================================================
// network.js — Resilient PeerJS Multiplayer Manager (STUN, Timeout, Null-Safe)
// ============================================================================
import { generateRoomCode } from './utils.js';

const PEER_CONFIG = {
  debug: 0,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
  },
};

export class NetworkManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.role = null; // 'HOST' | 'GUEST'
    this.status = 'IDLE'; // 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'FAILED'
    this.roomCode = '';
    this.connectTimer = null;

    this.onStatusChange = null;
    this.onData = null;
    this.onConnectedReady = null;
  }

  _setStatus(status, message = '') {
    this.status = status;
    if (typeof this.onStatusChange === 'function') {
      try {
        this.onStatusChange(status, message, this.roomCode);
      } catch {
        // guard UI callback
      }
    }
  }

  cleanup() {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    try {
      if (this.conn) {
        this.conn.close();
      }
    } catch {
      // ignore close errors
    }
    try {
      if (this.peer && !this.peer.destroyed) {
        this.peer.destroy();
      }
    } catch {
      // ignore destroy errors
    }
    this.conn = null;
    this.peer = null;
    this.role = null;
    this.roomCode = '';
    this._setStatus('IDLE', 'Koneksi ditutup.');
  }

  createRoom() {
    this.cleanup();
    if (typeof window.Peer === 'undefined') {
      this._setStatus('FAILED', 'Library PeerJS gagal dimuat. Periksa koneksi internet.');
      return;
    }

    this.role = 'HOST';
    this.roomCode = generateRoomCode(6);
    const peerId = `efutsal26-${this.roomCode}`;
    this._setStatus('CONNECTING', `Membuat room ${this.roomCode}...`);

    try {
      this.peer = new window.Peer(peerId, PEER_CONFIG);
    } catch {
      this._setStatus('FAILED', 'Gagal menginisialisasi PeerJS Host.');
      return;
    }

    this.peer.on('open', () => {
      this._setStatus('CONNECTING', `Room ${this.roomCode} siap! Menunggu lawan bergabung...`);
    });

    this.peer.on('connection', (dataConn) => {
      if (this.conn && this.conn.open) {
        try { dataConn.close(); } catch {}
        return;
      }
      this._attachConnection(dataConn);
    });

    this.peer.on('error', (err) => {
      const msg = err?.type === 'unavailable-id'
        ? 'Kode room bentrok, klik Buat Room lagi.'
        : `Error jaringan Host (${err?.type || 'unknown'}).`;
      this._setStatus('FAILED', msg);
    });
  }

  joinRoom(rawCode) {
    this.cleanup();
    const code = String(rawCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) {
      this._setStatus('FAILED', 'Masukkan kode room minimal 4-6 karakter.');
      return;
    }
    if (typeof window.Peer === 'undefined') {
      this._setStatus('FAILED', 'Library PeerJS gagal dimuat. Periksa koneksi internet.');
      return;
    }

    this.role = 'GUEST';
    this.roomCode = code;
    this._setStatus('CONNECTING', `Menghubungkan ke room ${code}...`);

    try {
      this.peer = new window.Peer(PEER_CONFIG);
    } catch {
      this._setStatus('FAILED', 'Gagal menginisialisasi PeerJS Guest.');
      return;
    }

    // 14-second connection timeout guardrail
    this.connectTimer = setTimeout(() => {
      if (this.status !== 'CONNECTED') {
        this._setStatus('FAILED', 'Timeout: Room tidak ditemukan atau jaringan diblokir NAT.');
      }
    }, 14000);

    this.peer.on('open', () => {
      try {
        const targetId = `efutsal26-${code}`;
        const dataConn = this.peer.connect(targetId, { reliable: true });
        if (!dataConn) {
          this._setStatus('FAILED', 'Gagal membuka jalur data ke Host.');
          return;
        }
        this._attachConnection(dataConn);
      } catch {
        this._setStatus('FAILED', 'Gagal menyambung ke Host.');
      }
    });

    this.peer.on('error', (err) => {
      if (this.connectTimer) clearTimeout(this.connectTimer);
      const msg = err?.type === 'peer-unavailable'
        ? `Room "${code}" tidak ditemukan. Pastikan Host sudah aktif.`
        : `Koneksi gagal (${err?.type || 'network-error'}).`;
      this._setStatus('FAILED', msg);
    });
  }

  _attachConnection(dataConn) {
    this.conn = dataConn;

    dataConn.on('open', () => {
      if (this.connectTimer) {
        clearTimeout(this.connectTimer);
        this.connectTimer = null;
      }
      this._setStatus('CONNECTED', `Terhubung ke Room ${this.roomCode}!`);
      if (typeof this.onConnectedReady === 'function') {
        try {
          this.onConnectedReady(this.role, this.roomCode);
        } catch {
          // safe guard
        }
      }
    });

    dataConn.on('data', (payload) => {
      if (!payload || typeof payload !== 'object') return;
      if (typeof this.onData === 'function') {
        try {
          this.onData(payload);
        } catch {
          // prevent malformed packet crash
        }
      }
    });

    dataConn.on('close', () => {
      this._setStatus('FAILED', 'Koneksi lawan terputus.');
    });

    dataConn.on('error', () => {
      this._setStatus('FAILED', 'Gangguan jalur data P2P.');
    });
  }

  send(payload) {
    if (!this.conn || !this.conn.open) return false;
    try {
      this.conn.send(payload);
      return true;
    } catch {
      return false;
    }
  }
}
