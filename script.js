/* Simple Tetris (vanilla JS) — Mobile + Hold + Sound + Highscore
   Controls: ← → ↓ (move), ↑/Z (rotate), Space (hard drop), P (pause), R (restart), C (hold)
   Touch: swipe left/right = move, tap = rotate, swipe down = hard drop
*/
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold');
const holdCtx = holdCanvas && holdCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const bestEl = document.getElementById('best');
const soundBtn = document.getElementById('btn-sound');

const COLS = 10;
const ROWS = 20;
const BLOCK = 30; // logical block size

let deviceScale = window.devicePixelRatio || 1;
function resizeCanvas() {
  deviceScale = window.devicePixelRatio || 1;
  canvas.width = COLS * BLOCK * deviceScale;
  canvas.height = ROWS * BLOCK * deviceScale;
  ctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);

  nextCanvas.width = 4 * BLOCK * deviceScale;
  nextCanvas.height = 4 * BLOCK * deviceScale;
  nextCtx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);

  if (holdCanvas) {
    holdCanvas.width = 4 * BLOCK * deviceScale;
    holdCanvas.height = 4 * BLOCK * deviceScale;
    holdCtx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  }
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let audioCtx = null;
let audioEnabled = (localStorage.getItem('tetrisSoundOn') || '1') === '1';
let bestScore = parseInt(localStorage.getItem('tetrisHighScore') || '0', 10) || 0;
if (bestEl) bestEl.textContent = bestScore;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playSound(name) {
  if (!audioEnabled) return;
  if (!audioCtx) initAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  switch (name) {
    case 'move': o.frequency.value = 900; g.gain.value = 0.02; o.type = 'sine'; break;
    case 'rotate': o.frequency.value = 1200; g.gain.value = 0.025; o.type = 'triangle'; break;
    case 'drop': o.frequency.value = 180; g.gain.value = 0.03; o.type = 'sawtooth'; break;
    case 'harddrop': o.frequency.value = 120; g.gain.value = 0.04; o.type = 'sine'; break;
    case 'line': o.frequency.value = 1000; g.gain.value = 0.05; o.type = 'square'; break;
    case 'level': o.frequency.value = 1500; g.gain.value = 0.06; o.type = 'sine'; break;
    case 'gameover': o.frequency.value = 80; g.gain.value = 0.08; o.type = 'sine'; break;
    default: o.frequency.value = 600; g.gain.value = 0.02; o.type = 'sine';
  }
  o.start(now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  o.stop(now + 0.12);
}

const colors = [null, '#22c55e', '#06b6d4', '#f59e0b', '#ef4444', '#7c3aed', '#f97316', '#3b82f6'];

function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

function createPiece(type) {
  switch (type) {
    case 'T': return [ [0,0,0], [1,1,1], [0,1,0] ];
    case 'O': return [ [2,2], [2,2] ];
    case 'L': return [ [0,3,0], [0,3,0], [0,3,3] ];
    case 'J': return [ [0,4,0], [0,4,0], [4,4,0] ];
    case 'I': return [ [0,5,0,0], [0,5,0,0], [0,5,0,0], [0,5,0,0] ];
    case 'S': return [ [0,6,6], [6,6,0], [0,0,0] ];
    case 'Z': return [ [7,7,0], [0,7,7], [0,0,0] ];
  }
}

function drawMatrix(matrix, offset, context, blockSize = BLOCK) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        context.fillStyle = colors[value];
        context.fillRect((x + offset.x) * blockSize, (y + offset.y) * blockSize, blockSize - 1, blockSize - 1);
      }
    });
  });
}

function drawNext() {
  nextCtx.fillStyle = '#021029';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!player.next) return;
  const off = { x: Math.floor((4 - player.next[0].length) / 2), y: Math.floor((4 - player.next.length) / 2) };
  drawMatrix(player.next, off, nextCtx, BLOCK);
}
function drawHold() {
  if (!holdCtx) return;
  holdCtx.fillStyle = '#021029';
  holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (!player.hold) return;
  const off = { x: Math.floor((4 - player.hold[0].length) / 2), y: Math.floor((4 - player.hold.length) / 2) };
  drawMatrix(player.hold, off, holdCtx, BLOCK);
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) arena[y + player.pos.y][x + player.pos.x] = value;
    });
  });
}

function collide(arena, player) {
  const m = player.matrix;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arena[y + player.pos.y] && arena[y + player.pos.y][x + player.pos.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) matrix.forEach(row => row.reverse());
  else matrix.reverse();
}

function playerRotate(dir) {
  rotate(player.matrix, dir);
  let offset = 1;
  const pos = player.pos.x;
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
  playSound('rotate');
}

function arenaSweep() {
  let rowCount = 0;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) continue outer;
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++rowCount;
    ++y;
  }
  if (rowCount > 0) {
    const points = [0, 40, 100, 300, 1200];
    player.score += points[rowCount] * (player.level + 1);
    player.lines += rowCount;
    const oldLevel = player.level;
    player.level = Math.floor(player.lines / 10);
    if (player.level > oldLevel) playSound('level');
    playSound('line');
    updateStats();
  }
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    player.canHold = true; // allow hold after piece locks
  }
  dropCounter = 0;
  playSound('drop');
}

function hardDrop() {
  while (!collide(arena, player)) {
    player.pos.y++;
  }
  player.pos.y--;
  merge(arena, player);
  playerReset();
  arenaSweep();
  dropCounter = 0;
  playSound('harddrop');
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) player.pos.x -= dir;
  else playSound('move');
}

function playerHold() {
  if (!player.canHold) return;
  if (!player.hold) {
    player.hold = player.matrix;
    player.matrix = player.next || createPiece(pick());
    player.next = createPiece(pick());
  } else {
    const tmp = player.matrix;
    player.matrix = player.hold;
    player.hold = tmp;
  }
  player.pos.y = 0;
  player.pos.x = Math.floor(COLS / 2) - Math.floor(player.matrix[0].length / 2);
  player.canHold = false;
  drawHold();
  drawNext();
  playSound('move');
}

function playerReset() {
  player.matrix = player.next || createPiece(pick());
  player.next = createPiece(pick());
  player.pos.y = 0;
  player.pos.x = Math.floor(COLS / 2) - Math.floor(player.matrix[0].length / 2);
  player.canHold = true; // reset hold allowance for the new piece
  if (collide(arena, player)) {
    // game over -> clear arena & reset state
    playSound('gameover');
    if (player.score > bestScore) {
      bestScore = player.score;
      localStorage.setItem('tetrisHighScore', bestScore);
    }
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.lines = 0;
    player.level = 0;
    player.hold = null;
    updateStats();
  }
  drawNext();
  drawHold();
}

function pick() {
  const pieces = 'TJLOSZI';
  return pieces[(pieces.length * Math.random()) | 0];
}

function updateStats() {
  scoreEl.textContent = player.score;
  linesEl.textContent = player.lines;
  levelEl.textContent = player.level;
  if (player.score > bestScore) {
    bestScore = player.score;
    localStorage.setItem('tetrisHighScore', bestScore);
  }
  if (bestEl) bestEl.textContent = bestScore;
}

function draw() {
  ctx.fillStyle = '#021029';
  ctx.fillRect(0, 0, canvas.width / deviceScale, canvas.height / deviceScale);

  // draw arena
  arena.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        ctx.fillStyle = colors[value];
        ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK - 1, BLOCK - 1);
      }
    });
  });

  // draw current piece
  drawMatrix(player.matrix, player.pos, ctx);
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let paused = false;

function update(time = 0) {
  if (paused) return;
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  dropInterval = Math.max(100, 1000 - player.level * 80);
  if (dropCounter > dropInterval) playerDrop();
  draw();
  requestAnimationFrame(update);
}

// game state
const arena = createMatrix(COLS, ROWS);
const player = { pos: {x:0,y:0}, matrix: null, next: null, hold: null, canHold: true, score: 0, lines: 0, level: 0 };

// input
document.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') playerMove(-1);
  else if (event.key === 'ArrowRight') playerMove(1);
  else if (event.key === 'ArrowDown') playerDrop();
  else if (event.key === ' ') { event.preventDefault(); hardDrop(); }
  else if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'z') playerRotate(1);
  else if (event.key.toLowerCase() === 'p') { paused = !paused; if (!paused) { lastTime = performance.now(); update(); } }
  else if (event.key.toLowerCase() === 'r') resetGame();
  else if (event.key.toLowerCase() === 'c') playerHold();
});

// UI buttons (for touch)
document.getElementById('btn-left').addEventListener('click', () => playerMove(-1));
document.getElementById('btn-right').addEventListener('click', () => playerMove(1));
document.getElementById('btn-rotate').addEventListener('click', () => playerRotate(1));
document.getElementById('btn-drop').addEventListener('click', () => playerDrop());
document.getElementById('btn-pause').addEventListener('click', () => { paused = !paused; if (!paused) { lastTime = performance.now(); update(); } });
document.getElementById('btn-restart').addEventListener('click', () => resetGame());
document.getElementById('btn-hold').addEventListener('click', () => playerHold());
document.getElementById('btn-sound').addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  localStorage.setItem('tetrisSoundOn', audioEnabled ? '1' : '0');
  document.getElementById('btn-sound').textContent = audioEnabled ? '🔊' : '🔇';
});

// simple touch gestures for mobile canvas
let touchStart = null;
canvas.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; touchStart = { x: t.clientX, y: t.clientY, time: Date.now() }; }, {passive:false});
canvas.addEventListener('touchend', e => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  const adx = Math.abs(dx), ady = Math.abs(dy);
  // horizontal swipe
  if (adx > 30 && adx > ady) {
    if (dx > 0) playerMove(1); else playerMove(-1);
  } else if (ady > 30 && ady > adx) {
    // vertical swipe -> hard drop
    if (dy > 0) hardDrop(); else playerRotate(1);
  } else {
    // tap -> rotate
    playerRotate(1);
  }
  touchStart = null;
});

// ensure audio starts after user gesture (required on some mobile browsers)
document.addEventListener('pointerdown', () => { if (!audioCtx) initAudio(); }, { once: true });

function resetGame() {
  arena.forEach(row => row.fill(0));
  player.score = 0; player.lines = 0; player.level = 0;
  player.matrix = null; player.next = null; player.hold = null; player.canHold = true;
  playerReset();
  updateStats();
  paused = false; lastTime = performance.now(); update();
}

// start
playerReset();
updateStats();
// sync sound button UI
if (soundBtn) soundBtn.textContent = audioEnabled ? '🔊' : '🔇';
update();