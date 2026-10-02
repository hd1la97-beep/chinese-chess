/**
 * 主程式：選單、遊戲流程、本地 / AI / 線上
 */
(function () {
  const game = new Xiangqi();
  let boardUI = null;
  let mode = null;          // 'local' | 'ai' | 'online'
  let myColor = 'r';        // 線上時自己的顏色
  let ai = null;
  let mp = null;
  let selected = null;
  let history = [];
  let gameOver = false;

  // DOM
  const $ = (s) => document.querySelector(s);
  const menu = $('#menu');
  const gameScreen = $('#game');
  const statusText = $('#statusText');
  const roomInfo = $('#roomInfo');
  const roomCodeDisplay = $('#roomCodeDisplay');
  const resultModal = $('#resultModal');
  const connecting = $('#connecting');

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
  }

  function showModal(el, show = true) {
    el.classList.toggle('show', show);
  }

  // ===== 初始化棋盤 =====
  function initBoard() {
    const canvas = $('#board');
    boardUI = new BoardUI(canvas, onSquareClick);
    refreshBoard();
  }

  function refreshBoard(lastMove = null) {
    const board = fenToBoard(game.fen());
    boardUI.setBoard(board, lastMove);
    updateStatus();
  }

  function updateStatus() {
    if (gameOver) return;
    const turn = game.turn() === 'r' ? '紅方' : '黑方';
    let extra = '';
    if (mode === 'ai') {
      extra = game.turn() === myColor ? '（你的回合）' : '（電腦思考中…）';
    } else if (mode === 'online') {
      extra = game.turn() === myColor ? '（你的回合）' : '（等待對手）';
    }
    statusText.textContent = `${turn}回合 ${extra}`;
    if (game.in_check()) {
      statusText.textContent += ' ⚠️ 將軍！';
    }
  }

  // ===== 點擊處理 =====
  function onSquareClick(sq) {
    if (gameOver) return;
    if (mode === 'ai' && game.turn() !== myColor) return;
    if (mode === 'online' && game.turn() !== myColor) return;

    const iccsFrom = selected ? xyToIccs(selected.x, selected.y) : null;
    const iccsTo = xyToIccs(sq.x, sq.y);

    if (!selected) {
      // 選棋
      const piece = boardUI.board[sq.y][sq.x];
      if (!piece) return;
      const isRed = piece[0] === 'r';
      if ((game.turn() === 'r') !== isRed) return;
      selected = sq;
      const legal = getLegalTargets(sq);
      boardUI.setSelected(sq, legal);
    } else {
      // 嘗試移動
      if (selected.x === sq.x && selected.y === sq.y) {
        selected = null;
        boardUI.setSelected(null);
        return;
      }
      const move = tryMove(selected, sq);
      if (move) {
        selected = null;
        boardUI.setSelected(null);
        afterMove(move);
      } else {
        // 改選其他己方棋
        const piece = boardUI.board[sq.y][sq.x];
        if (piece && ((piece[0] === 'r') === (game.turn() === 'r'))) {
          selected = sq;
          boardUI.setSelected(sq, getLegalTargets(sq));
        } else {
          selected = null;
          boardUI.setSelected(null);
        }
      }
    }
  }

  function getLegalTargets(fromSq) {
    const from = xyToIccs(fromSq.x, fromSq.y);
    const moves = game.moves({ verbose: true, square: from });
    return moves.map(m => iccsToXY(m.to));
  }

  function tryMove(fromSq, toSq) {
    const from = xyToIccs(fromSq.x, fromSq.y);
    const to = xyToIccs(toSq.x, toSq.y);
    const result = game.move({ from, to });
    return result || null;
  }

  function afterMove(move) {
    history.push(move);
    const last = {
      from: iccsToXY(move.from),
      to: iccsToXY(move.to)
    };
    refreshBoard(last);
    checkGameOver();

    if (mode === 'online' && mp) {
      mp.send({ type: 'move', move: { from: move.from, to: move.to } });
    }
    if (mode === 'ai' && !gameOver && game.turn() !== myColor) {
      setTimeout(aiMove, 300);
    }
  }

  function aiMove() {
    if (gameOver) return;
    statusText.textContent = '電腦思考中…';
    setTimeout(() => {
      const m = ai.bestMove(game);
      if (m) {
        game.move(m);
        history.push(m);
        refreshBoard({
          from: iccsToXY(m.from),
          to: iccsToXY(m.to)
        });
        checkGameOver();
      }
    }, 50);
  }

  function checkGameOver() {
    if (game.game_over()) {
      gameOver = true;
      let msg = '';
      if (game.in_checkmate()) {
        msg = game.turn() === 'r' ? '黑方勝（紅方被將死）' : '紅方勝（黑方被將死）';
      } else if (game.in_stalemate()) {
        msg = '和棋（困斃）';
      } else {
        msg = '遊戲結束';
      }
      $('#resultTitle').textContent = '對局結束';
      $('#resultMsg').textContent = msg;
      showModal(resultModal, true);
    }
  }

  // ===== 模式啟動 =====
  function startLocal() {
    mode = 'local';
    myColor = 'r';
    resetGame();
    boardUI.setFlip(false);
    $('#redSide').textContent = '本地';
    $('#blackSide').textContent = '本地';
    roomInfo.style.display = 'none';
    showScreen('#game');
  }

  function startAI() {
    mode = 'ai';
    myColor = 'r'; // 玩家永遠紅方
    ai = new SimpleAI(2);
    resetGame();
    boardUI.setFlip(false);
    $('#redSide').textContent = '你';
    $('#blackSide').textContent = '電腦';
    roomInfo.style.display = 'none';
    showScreen('#game');
  }

  async function startCreate() {
    mode = 'online';
    showModal(connecting, true);
    try {
      mp = new Multiplayer();
      mp.onConnected = () => {
        showModal(connecting, false);
        // Host 紅方
        myColor = 'r';
        resetGame();
        boardUI.setFlip(false);
        $('#redSide').textContent = '你（主機）';
        $('#blackSide').textContent = '對手';
        roomInfo.style.display = 'flex';
        roomCodeDisplay.textContent = mp.roomCode;
        showScreen('#game');
      };
      mp.onMessage = handleRemote;
      mp.onDisconnected = () => {
        alert('對手已斷線');
      };
      mp.onError = (e) => {
        showModal(connecting, false);
        alert('連線錯誤：' + (e.message || e.type || e));
      };
      await mp.createRoom();
      // 等待對手連線（onConnected 會觸發）
      roomCodeDisplay.textContent = mp.roomCode;
      // 先顯示房間碼，即使還沒人來
      roomInfo.style.display = 'flex';
      showModal(connecting, false);
      showScreen('#game');
      statusText.textContent = '等待對手加入… 房間：' + mp.roomCode;
      $('#redSide').textContent = '你（主機）';
      $('#blackSide').textContent = '等待中';
      resetGame();
      boardUI.setFlip(false);
    } catch (e) {
      showModal(connecting, false);
      alert('建立房間失敗：' + e.message);
    }
  }

  async function startJoin(code) {
    mode = 'online';
    showModal(connecting, true);
    try {
      mp = new Multiplayer();
      mp.onConnected = () => {
        showModal(connecting, false);
        myColor = 'b'; // 加入者黑方
        resetGame();
        boardUI.setFlip(true); // 黑方視角翻轉
        $('#redSide').textContent = '對手';
        $('#blackSide').textContent = '你';
        roomInfo.style.display = 'flex';
        roomCodeDisplay.textContent = code;
        showScreen('#game');
      };
      mp.onMessage = handleRemote;
      mp.onDisconnected = () => alert('對手已斷線');
      mp.onError = (e) => {
        showModal(connecting, false);
        alert('連線錯誤：' + (e.message || e.type || e));
      };
      await mp.joinRoom(code);
    } catch (e) {
      showModal(connecting, false);
      alert('加入失敗：' + e.message);
    }
  }

  function handleRemote(data) {
    if (data.type === 'move') {
      const m = game.move({ from: data.move.from, to: data.move.to });
      if (m) {
        history.push(m);
        refreshBoard({
          from: iccsToXY(m.from),
          to: iccsToXY(m.to)
        });
        checkGameOver();
      }
    } else if (data.type === 'resign') {
      gameOver = true;
      $('#resultTitle').textContent = '對手認輸';
      $('#resultMsg').textContent = '你贏了！';
      showModal(resultModal, true);
    } else if (data.type === 'restart') {
      resetGame();
    }
  }

  function resetGame() {
    game.reset();
    history = [];
    gameOver = false;
    selected = null;
    if (boardUI) {
      boardUI.setSelected(null);
      refreshBoard();
    }
  }

  // ===== 事件綁定 =====
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = btn.dataset.mode;
      if (m === 'local') startLocal();
      else if (m === 'ai') startAI();
      else if (m === 'create') startCreate();
      else if (m === 'join') {
        $('#joinBox').style.display = 'flex';
        $('#roomCodeInput').focus();
      }
    });
  });

  $('#joinConfirmBtn').addEventListener('click', () => {
    const code = $('#roomCodeInput').value.trim();
    if (code.length < 4) {
      alert('請輸入有效房間代碼');
      return;
    }
    startJoin(code);
  });

  $('#roomCodeInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#joinConfirmBtn').click();
  });

  $('#backBtn').addEventListener('click', () => {
    if (mp) {
      mp.destroy();
      mp = null;
    }
    showScreen('#menu');
    $('#joinBox').style.display = 'none';
  });

  $('#undoBtn').addEventListener('click', () => {
    if (mode === 'online') {
      alert('線上對戰暫不支援悔棋');
      return;
    }
    if (history.length === 0) return;
    game.undo();
    history.pop();
    if (mode === 'ai' && history.length > 0) {
      // 再悔一步（電腦那步）
      game.undo();
      history.pop();
    }
    selected = null;
    boardUI.setSelected(null);
    refreshBoard();
    gameOver = false;
  });

  $('#resignBtn').addEventListener('click', () => {
    if (!confirm('確定認輸？')) return;
    gameOver = true;
    if (mode === 'online' && mp) {
      mp.send({ type: 'resign' });
    }
    const winner = myColor === 'r' ? '黑方' : '紅方';
    $('#resultTitle').textContent = '你認輸了';
    $('#resultMsg').textContent = winner + '獲勝';
    showModal(resultModal, true);
  });

  $('#restartBtn').addEventListener('click', () => {
    if (mode === 'online') {
      if (mp) mp.send({ type: 'restart' });
    }
    resetGame();
  });

  $('#resultOk').addEventListener('click', () => {
    showModal(resultModal, false);
  });

  $('#copyCodeBtn').addEventListener('click', () => {
    const code = roomCodeDisplay.textContent;
    navigator.clipboard.writeText(code).then(() => {
      $('#copyCodeBtn').textContent = '已複製';
      setTimeout(() => $('#copyCodeBtn').textContent = '複製', 1500);
    }).catch(() => {
      prompt('請手動複製房間代碼：', code);
    });
  });

  // 啟動
  initBoard();
  showScreen('#menu');

  // 修正：切換到遊戲畫面時重新計算棋盤大小
  const originalShowScreen = showScreen;
  showScreen = function(id) {
    originalShowScreen(id);
    if (id === '#game' && boardUI) {
      setTimeout(() => boardUI.resize(), 50);
    }
  };
})();
