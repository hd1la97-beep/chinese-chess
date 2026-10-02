/**
 * PeerJS 線上對戰
 * 房間代碼 = 自訂 Peer ID（4~6 位大寫字母數字）
 */
class Multiplayer {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.roomCode = null;
    this.onMessage = null;   // (data) => {}
    this.onConnected = null;
    this.onDisconnected = null;
    this.onError = null;
  }

  // 產生短房間碼
  static generateCode(len = 5) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < len; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  // 建立房間（當 Host）
  async createRoom() {
    this.isHost = true;
    this.roomCode = Multiplayer.generateCode();
    return this._initPeer(this.roomCode);
  }

  // 加入房間
  async joinRoom(code) {
    this.isHost = false;
    this.roomCode = code.toUpperCase().trim();
    await this._initPeer(); // 隨機 ID
    return this._connectToHost(this.roomCode);
  }

  _initPeer(id) {
    return new Promise((resolve, reject) => {
      const opts = {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      };
      this.peer = id ? new Peer(id, opts) : new Peer(opts);

      this.peer.on('open', (myId) => {
        if (this.isHost) this.roomCode = myId;
        resolve(myId);
      });

      this.peer.on('error', (err) => {
        console.error('Peer error', err);
        if (err.type === 'unavailable-id') {
          // ID 被佔用，重新產生
          this.peer.destroy();
          this.roomCode = Multiplayer.generateCode();
          this._initPeer(this.roomCode).then(resolve).catch(reject);
        } else {
          if (this.onError) this.onError(err);
          reject(err);
        }
      });

      this.peer.on('connection', (conn) => {
        if (this.conn && this.conn.open) {
          conn.close(); // 只允許一個對手
          return;
        }
        this._setupConn(conn);
      });

      this.peer.on('disconnected', () => {
        if (this.onDisconnected) this.onDisconnected();
      });
    });
  }

  _connectToHost(hostId) {
    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(hostId, { reliable: true });
      const timer = setTimeout(() => {
        reject(new Error('連線逾時，請確認房間代碼正確'));
      }, 12000);

      conn.on('open', () => {
        clearTimeout(timer);
        this._setupConn(conn);
        resolve();
      });
      conn.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  _setupConn(conn) {
    this.conn = conn;
    conn.on('data', (data) => {
      if (this.onMessage) this.onMessage(data);
    });
    conn.on('close', () => {
      this.conn = null;
      if (this.onDisconnected) this.onDisconnected();
    });
    conn.on('error', (err) => {
      console.error('Conn error', err);
      if (this.onError) this.onError(err);
    });
    if (this.onConnected) this.onConnected();
  }

  send(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    }
  }

  destroy() {
    if (this.conn) this.conn.close();
    if (this.peer) this.peer.destroy();
    this.conn = null;
    this.peer = null;
  }
}
