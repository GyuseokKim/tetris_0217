/* Simple Tetris (vanilla JS) — GitHub Pages에 바로 배포 가능
   Controls: ← → ↓ (move), ↑/Z (rotate), Space (hard drop), P (pause), R (restart)
*/
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

const COLS = 10;
const ROWS = 20;
const BLOCK = 30; // px

canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;
nextCanvas.width = 4 * BLOCK;
nextCanvas.height = 4 * BLOCK;

const colors = [null, '#22c55e', '#06b6d4', '#f59e0b', '#ef4444', '#7c3aed', '#f97316', '#3b82f6'];

function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

function createPiece(type) {
  switch (type) {
    case 'T': return [
      [0,0,0],
      [1,1,1],
      [0,1,0],
    ];
    case 'O': return [
      [2,2],
      [2,2],
    ];
    case 'L': return [
      [0,3,0],
      [0,3,0],
      [0,3,3],
    ];
    case 'J': return [
      [0,4,0],
      [0,4,0],
      [4,4,0],
    ];
    case 'I': return [
      [0,5,0,0],
      [0,5,0,0],
      [0,5,0,0],
      [0,5,0,0],
    ];
    case 'S': return [
      [0,6,6],
      [6,6,0],
      [0,0,0],
    ];
    case 'Z': return [
      [7,7,0],
      [0,7,7],
      [0,0,0],
    ];
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
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
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
    // level up every 10 lines
    player.level = Math.floor(player.lines / 10);
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
  }
  dropCounter = 0;
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
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) player.pos.x -= dir;
}

function playerReset() {
  player.matrix = player.next || createPiece(pick());
  player.next = createPiece(pick());
  player.pos.y = 0;
  player.pos.x = Math.floor(COLS / 2) - Math.floor(player.matrix[0].length / 2);
  if (collide(arena, player)) {
    // game over -> clear arena
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.lines = 0;
    player.level = 0;
    updateStats();
  }
  drawNext();
}

function pick() {
  const pieces = 'TJLOSZI';
  return pieces[(pieces.length * Math.random()) | 0];
}

function updateStats() {
  document.getElementById('score').textContent = player.score;
  document.getElementById('lines').textContent = player.lines;
  document.getElementById('level').textContent = player.level;
}

function draw() {
  ctx.fillStyle = '#021029';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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

function drawNext() {
  nextCtx.fillStyle = '#021029';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  // center the 4x4 next area
  drawMatrix(player.next, {x:0, y:0}, nextCtx, BLOCK);
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
const player = { pos: {x:0,y:0}, matrix: null, next: null, score: 0, lines: 0, level: 0 };

// input
document.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') playerMove(-1);
  else if (event.key === 'ArrowRight') playerMove(1);
  else if (event.key === 'ArrowDown') playerDrop();
  else if (event.key === ' ') { event.preventDefault(); hardDrop(); }
  else if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'z') playerRotate(1);
  else if (event.key.toLowerCase() === 'p') { paused = !paused; if (!paused) { lastTime = performance.now(); update(); } }
  else if (event.key.toLowerCase() === 'r') resetGame();
});

// UI buttons (for touch)
document.getElementById('btn-left').addEventListener('click', () => playerMove(-1));
document.getElementById('btn-right').addEventListener('click', () => playerMove(1));
document.getElementById('btn-rotate').addEventListener('click', () => playerRotate(1));
document.getElementById('btn-drop').addEventListener('click', () => playerDrop());
document.getElementById('btn-pause').addEventListener('click', () => { paused = !paused; if (!paused) { lastTime = performance.now(); update(); } });
document.getElementById('btn-restart').addEventListener('click', () => resetGame());

function resetGame() {
  arena.forEach(row => row.fill(0));
  player.score = 0; player.lines = 0; player.level = 0;
  player.matrix = null; player.next = null;
  playerReset();
  updateStats();
  paused = false; lastTime = performance.now(); update();
}

// start
playerReset();
updateStats();
update();