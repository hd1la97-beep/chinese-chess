/**
 * 棋盤繪製與互動 (Canvas)
 * 座標：0~8 列 (x), 0~9 行 (y)，紅方在下 (y=9)
 */
class BoardUI {
  constructor(canvas, onSelect) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSelect = onSelect; // (fromSq, toSq) or (sq)
    this.selected = null;     // {x, y} or null
    this.legalTargets = [];   // [{x,y}, ...]
    this.lastMove = null;     // {from:{x,y}, to:{x,y}}
    this.board = null;        // 9x10 陣列，字串或 null
    this.flip = false;        // 是否翻轉（黑方視角）
    this.pieceRadius = 0;

    this._bindEvents();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cell = Math.min(w / 9, h / 10);
    this.offsetX = (w - this.cell * 8) / 2; // 9 點 = 8 格
    this.offsetY = (h - this.cell * 9) / 2;
    this.pieceRadius = this.cell * 0.38;
    this.draw();
  }

  setBoard(boardData, lastMove = null) {
    // boardData: 9x10 array, 每格 null 或 'rK' 'bP' 等
    this.board = boardData;
    this.lastMove = lastMove;
    this.draw();
  }

  setSelected(sq, legal = []) {
    this.selected = sq;
    this.legalTargets = legal;
    this.draw();
  }

  setFlip(flip) {
    this.flip = flip;
    this.draw();
  }

  // 邏輯座標 -> 畫面座標
  toScreen(x, y) {
    if (this.flip) {
      x = 8 - x;
      y = 9 - y;
    }
    return {
      sx: this.offsetX + x * this.cell,
      sy: this.offsetY + y * this.cell
    };
  }

  // 畫面點擊 -> 邏輯座標
  fromScreen(px, py) {
    let x = Math.round((px - this.offsetX) / this.cell);
    let y = Math.round((py - this.offsetY) / this.cell);
    if (x < 0 || x > 8 || y < 0 || y > 9) return null;
    if (this.flip) {
      x = 8 - x;
      y = 9 - y;
    }
    return { x, y };
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);

    // 背景
    ctx.fillStyle = '#f0d9b5';
    ctx.fillRect(0, 0, w, h);

    // 棋盤線
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1.5;

    // 橫線 10 條
    for (let y = 0; y < 10; y++) {
      const { sx, sy } = this.toScreen(0, y);
      const { sx: ex } = this.toScreen(8, y);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, sy);
      ctx.stroke();
    }
    // 豎線：上下各 9 條，中間河界分開
    for (let x = 0; x < 9; x++) {
      // 上半 (黑方 0-4)
      let p1 = this.toScreen(x, 0);
      let p2 = this.toScreen(x, 4);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
      // 下半 (紅方 5-9)
      p1 = this.toScreen(x, 5);
      p2 = this.toScreen(x, 9);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }

    // 河界文字
    ctx.fillStyle = 'rgba(58,42,26,0.35)';
    ctx.font = `bold ${this.cell * 0.45}px "KaiTi", "STKaiti", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const riverY = (this.toScreen(0, 4).sy + this.toScreen(0, 5).sy) / 2;
    if (!this.flip) {
      ctx.fillText('楚 河', this.toScreen(2, 0).sx, riverY);
      ctx.fillText('漢 界', this.toScreen(6, 0).sx, riverY);
    } else {
      ctx.fillText('漢 界', this.toScreen(2, 0).sx, riverY);
      ctx.fillText('楚 河', this.toScreen(6, 0).sx, riverY);
    }

    // 九宮斜線
    this._drawPalace(0, 3);  // 黑方
    this._drawPalace(7, 3);  // 紅方

    // 上一步高亮
    if (this.lastMove) {
      this._highlight(this.lastMove.from, 'rgba(255,200,50,0.35)');
      this._highlight(this.lastMove.to, 'rgba(255,200,50,0.45)');
    }

    // 可走位置
    for (const t of this.legalTargets) {
      const { sx, sy } = this.toScreen(t.x, t.y);
      ctx.beginPath();
      ctx.arc(sx, sy, this.pieceRadius * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,140,60,0.55)';
      ctx.fill();
    }

    // 選中
    if (this.selected) {
      this._highlight(this.selected, 'rgba(30,120,255,0.4)');
    }

    // 棋子
    if (this.board) {
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 9; x++) {
          const p = this.board[y][x];
          if (p) this._drawPiece(x, y, p);
        }
      }
    }
  }

  _drawPalace(startY, startX) {
    const ctx = this.ctx;
    ctx.beginPath();
    let a = this.toScreen(startX, startY);
    let b = this.toScreen(startX + 2, startY + 2);
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    a = this.toScreen(startX + 2, startY);
    b = this.toScreen(startX, startY + 2);
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  }

  _highlight(sq, color) {
    const { sx, sy } = this.toScreen(sq.x, sq.y);
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(sx, sy, this.pieceRadius + 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  _drawPiece(x, y, code) {
    const { sx, sy } = this.toScreen(x, y);
    const ctx = this.ctx;
    const isRed = code[0] === 'r';
    const type = code[1];

    // 外圓
    ctx.beginPath();
    ctx.arc(sx, sy, this.pieceRadius, 0, Math.PI * 2);
    ctx.fillStyle = isRed ? '#f8e8d0' : '#2a2a2a';
    ctx.fill();
    ctx.strokeStyle = isRed ? '#c41e3a' : '#111';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 內圓
    ctx.beginPath();
    ctx.arc(sx, sy, this.pieceRadius * 0.78, 0, Math.PI * 2);
    ctx.strokeStyle = isRed ? '#c41e3a' : '#444';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 文字
    const names = {
      K: isRed ? '帥' : '將',
      A: isRed ? '仕' : '士',
      B: isRed ? '相' : '象',
      N: isRed ? '馬' : '馬',
      R: isRed ? '車' : '車',
      C: isRed ? '炮' : '炮',
      P: isRed ? '兵' : '卒'
    };
    ctx.fillStyle = isRed ? '#c41e3a' : '#eee';
    ctx.font = `bold ${this.pieceRadius * 1.15}px "KaiTi", "STKaiti", "SimKai", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(names[type] || type, sx, sy + 1);
  }

  _bindEvents() {
    const handler = (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      let clientX, clientY;
      if (e.touches && e.touches.length) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const sq = this.fromScreen(px, py);
      if (sq && this.onSelect) this.onSelect(sq);
    };
    this.canvas.addEventListener('click', handler);
    this.canvas.addEventListener('touchend', handler, { passive: false });
  }
}

// 將 xiangqi.js 的 FEN / 位置轉成 9x10 陣列
function fenToBoard(fen) {
  const board = Array.from({ length: 10 }, () => Array(9).fill(null));
  const rows = fen.split(' ')[0].split('/');
  // FEN 第一行是黑方底線 (y=0)
  for (let y = 0; y < 10; y++) {
    let x = 0;
    for (const ch of rows[y]) {
      if (/\d/.test(ch)) {
        x += parseInt(ch, 10);
      } else {
        const color = ch === ch.toUpperCase() ? 'r' : 'b';
        const type = ch.toUpperCase();
        board[y][x] = color + type;
        x++;
      }
    }
  }
  return board;
}

// ICCS 座標轉 {x,y}  (a0 = 左下紅方角)
function iccsToXY(sq) {
  // a0 ~ i9
  const file = sq.charCodeAt(0) - 97; // a=0
  const rank = parseInt(sq[1], 10);
  // 我們的 y=0 是黑方，y=9 是紅方 → rank 0 = y=9
  return { x: file, y: 9 - rank };
}

function xyToIccs(x, y) {
  return String.fromCharCode(97 + x) + (9 - y);
}
