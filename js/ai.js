/**
 * 簡易人機 AI（極小化極大 + Alpha-Beta，深度可調）
 * 使用 xiangqi.js 的 moves / evaluate
 */
class SimpleAI {
  constructor(depth = 2) {
    this.depth = depth;
  }

  // 簡易局面評估
  evaluate(game) {
    const pieceValue = {
      p: 10, c: 45, r: 90, n: 40, b: 20, a: 20, k: 10000
    };
    let score = 0;
    const board = game.board(); // 回傳 ASCII 或用 fen
    // 用 fen 解析
    const fen = game.fen().split(' ')[0];
    const rows = fen.split('/');
    for (let y = 0; y < 10; y++) {
      let x = 0;
      for (const ch of rows[y]) {
        if (/\d/.test(ch)) {
          x += +ch;
          continue;
        }
        const isRed = ch === ch.toUpperCase();
        const type = ch.toLowerCase();
        const val = pieceValue[type] || 0;
        // 位置加成（簡單）
        let posBonus = 0;
        if (type === 'p') {
          // 兵過河加分
          if (isRed && y < 5) posBonus = 8;
          if (!isRed && y > 4) posBonus = 8;
        }
        score += isRed ? (val + posBonus) : -(val + posBonus);
        x++;
      }
    }
    // 輪到誰：若是黑方回合，分數取反（因為我們站在紅方視角？）
    // 實際上 minimax 會處理
    return score;
  }

  bestMove(game) {
    const isRed = game.turn() === 'r';
    let best = null;
    let bestScore = isRed ? -Infinity : Infinity;

    const moves = game.moves({ verbose: true });
    // 簡單排序：吃子優先
    moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));

    for (const m of moves) {
      game.move(m);
      const score = this._minimax(game, this.depth - 1, -Infinity, Infinity, !isRed);
      game.undo();
      if (isRed) {
        if (score > bestScore) {
          bestScore = score;
          best = m;
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          best = m;
        }
      }
    }
    return best;
  }

  _minimax(game, depth, alpha, beta, maximizing) {
    if (depth === 0 || game.game_over()) {
      return this.evaluate(game);
    }
    const moves = game.moves({ verbose: true });
    if (maximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        game.move(m);
        const ev = this._minimax(game, depth - 1, alpha, beta, false);
        game.undo();
        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        game.move(m);
        const ev = this._minimax(game, depth - 1, alpha, beta, true);
        game.undo();
        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}
