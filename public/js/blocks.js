/* الْمُكَعَّبَاتُ, the block puzzle. A 6×6 board and three pieces at a time:
   drag a piece onto the board, and every full row or column clears with a
   celebration. There is no losing: when no piece fits, a button deals new
   ones. The board is kept on the device, so leaving and coming back carries
   on where the child stopped. */
const $ = (id) => document.getElementById(id);

const SIZE = 6;
const TILES = 6; // tile colors, set in style.css by [data-tile]
const KEY = 'blocks';

/* What the child sees and hears. The parents approve every line. */
const CHEERS = {
  line: { text: 'أحسنت', clip: 'well-done' },
  lines: { text: 'مَا شَاءَ اللَّهُ', clip: 'mashaallah' },
};
const NEW_BOARD = 'لَوْحَةٌ جَدِيدَةٌ';

const DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arabic = (n) => String(n).replace(/\d/g, (d) => DIGITS[d]);

/* Each shape is its cells as [row, column] and how often it is dealt. Small
   and straight pieces come most; none is longer than four. */
const SHAPES = [
  { weight: 2, cells: [[0, 0]] },
  { weight: 3, cells: [[0, 0], [0, 1]] },
  { weight: 3, cells: [[0, 0], [1, 0]] },
  { weight: 3, cells: [[0, 0], [0, 1], [0, 2]] },
  { weight: 3, cells: [[0, 0], [1, 0], [2, 0]] },
  { weight: 3, cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { weight: 2, cells: [[0, 0], [1, 0], [1, 1]] },
  { weight: 2, cells: [[0, 1], [1, 0], [1, 1]] },
  { weight: 2, cells: [[0, 0], [0, 1], [1, 0]] },
  { weight: 2, cells: [[0, 0], [0, 1], [1, 1]] },
  { weight: 1, cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { weight: 1, cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { weight: 1, cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { weight: 1, cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },
  { weight: 1, cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { weight: 1, cells: [[0, 1], [1, 1], [2, 1], [2, 0]] },
];

const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
const MOTION = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let board = [];
let tray = [null, null, null];
let lines = 0;
let shown = 0; // the count on screen, which catches up as the stars land
let era = 0; // bumps on a new board, so stars still flying are ignored
let drag = null;

const root = $('blocks');
const boardEl = $('board');
const trayEl = $('tray');
const slots = [...trayEl.querySelectorAll('.slot')];
const cells = [];
for (let i = 0; i < SIZE * SIZE; i++) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  boardEl.append(cell);
  cells.push(cell);
}

const at = (r, c) => r * SIZE + c;

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* Rules */
function fits(shape, r, c, grid = board) {
  return SHAPES[shape].cells.every(([dr, dc]) => {
    const row = r + dr;
    const col = c + dc;
    return row >= 0 && row < SIZE && col >= 0 && col < SIZE && grid[at(row, col)] < 0;
  });
}

function spots(shape) {
  const out = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (fits(shape, r, c)) out.push([r, c]);
  return out;
}

const fitsSomewhere = (shape) => spots(shape).length > 0;

function withPiece(shape, r, c, tile) {
  const grid = board.slice();
  for (const [dr, dc] of SHAPES[shape].cells) grid[at(r + dr, c + dc)] = tile;
  return grid;
}

function fullLines(grid) {
  const rows = [];
  const cols = [];
  for (let i = 0; i < SIZE; i++) {
    let row = true;
    let col = true;
    for (let j = 0; j < SIZE; j++) {
      if (grid[at(i, j)] < 0) row = false;
      if (grid[at(j, i)] < 0) col = false;
    }
    if (row) rows.push(i);
    if (col) cols.push(i);
  }
  return { rows, cols };
}

function weighted(list) {
  const total = list.reduce((sum, i) => sum + SHAPES[i].weight, 0);
  let roll = Math.random() * total;
  for (const i of list) {
    roll -= SHAPES[i].weight;
    if (roll < 0) return i;
  }
  return list[list.length - 1];
}

/* Three new pieces, each of which fits the board as it is. One of them is
   often a piece that would finish a line, so the board keeps clearing. A
   single block always fits: a full board would have cleared. */
function deal() {
  const fitting = SHAPES.map((_, i) => i).filter(fitsSomewhere);
  const helpful = fitting.filter((i) => spots(i).some(([r, c]) => {
    const { rows, cols } = fullLines(withPiece(i, r, c, 0));
    return rows.length + cols.length > 0;
  }));
  const colors = shuffle([...Array(TILES).keys()]);
  const pieces = [0, 1, 2].map((n) => ({
    shape: weighted(n === 0 && helpful.length && Math.random() < 0.6 ? helpful : fitting),
    tile: colors[n],
  }));
  tray = shuffle(pieces);
}

/* Drawing */
function pieceElement({ shape, tile }) {
  const piece = document.createElement('div');
  piece.className = 'piece';
  piece.dataset.tile = tile;
  const rows = Math.max(...SHAPES[shape].cells.map(([r]) => r)) + 1;
  const cols = Math.max(...SHAPES[shape].cells.map(([, c]) => c)) + 1;
  piece.style.setProperty('--cols', cols);
  piece.style.setProperty('--len', Math.max(rows, cols));
  for (const [r, c] of SHAPES[shape].cells) {
    const block = document.createElement('i');
    block.className = 'block';
    block.style.gridArea = `${r + 1} / ${c + 1}`;
    piece.append(block);
  }
  return piece;
}

function paint(i, placed = false) {
  const cell = cells[i];
  const old = cell.querySelector('.block:not(.going)');
  if (board[i] < 0) {
    if (old) old.remove();
    return;
  }
  if (old && Number(old.dataset.tile) === board[i]) return;
  if (old) old.remove();
  const block = document.createElement('i');
  block.className = placed ? 'block placed' : 'block';
  block.dataset.tile = board[i];
  cell.append(block);
}

function renderTray(dealt = false) {
  slots.forEach((slot, n) => {
    slot.replaceChildren();
    if (!tray[n]) return;
    const piece = pieceElement(tray[n]);
    if (dealt) {
      piece.classList.add('dealt');
      piece.style.animationDelay = `${n * 90}ms`;
      // Dropped once done, or the hint ending would replay the deal.
      setTimeout(() => {
        piece.classList.remove('dealt');
        piece.style.animationDelay = '';
      }, n * 90 + 450);
    }
    slot.append(piece);
  });
  updateFit();
}

/* A piece with no room is dimmed, and when none has room the button for new
   pieces shows. */
function updateFit() {
  let left = false;
  let room = false;
  slots.forEach((slot, n) => {
    const piece = tray[n];
    const ok = Boolean(piece) && fitsSomewhere(piece.shape);
    if (piece) left = true;
    if (ok) room = true;
    slot.classList.toggle('nofit', Boolean(piece) && !ok);
  });
  const stuck = left && !room;
  trayEl.classList.toggle('stuck', stuck);
  $('new-pieces').hidden = !stuck;
}

function showCount() {
  $('count').textContent = arabic(shown);
}

/* Dragging. The piece grows to board size as it lifts, and on a touch screen
   it rides above the finger so the finger does not hide it. It drops on the
   nearest spot where it fits, if one is close. */
function startDrag(event, n) {
  if (drag || !tray[n] || event.button > 0) return;
  event.preventDefault();
  stopHint();
  const slot = slots[n];
  const mini = slot.querySelector('.piece');
  if (mini.style.visibility === 'hidden') return; // still flying back from the last drag
  const from = mini.getBoundingClientRect();
  const lift = document.createElement('div');
  lift.className = 'lift';
  const piece = pieceElement(tray[n]);
  lift.append(piece);
  root.append(lift);
  const size = piece.getBoundingClientRect();
  const first = cells[0].getBoundingClientRect();
  const pitch = cells[1].getBoundingClientRect().left - first.left;
  const touch = event.pointerType !== 'mouse';
  drag = {
    n,
    slot,
    mini,
    lift,
    piece,
    first,
    pitch,
    grabX: size.width / 2,
    grabY: touch ? size.height + first.height * 0.9 : size.height / 2,
    spot: null,
  };
  mini.style.visibility = 'hidden';
  moveDrag(event.clientX, event.clientY);
  const x0 = from.left - (event.clientX - drag.grabX);
  const y0 = from.top - (event.clientY - drag.grabY);
  piece.animate(
    [{ transform: `translate(${x0}px, ${y0}px) scale(${from.width / size.width})` }, { transform: 'none' }],
    { duration: 160, easing: 'cubic-bezier(.2,.8,.2,1)' },
  );
  slot.setPointerCapture(event.pointerId);
}

function findSpot(shape, left, top) {
  const fx = (left - drag.first.left) / drag.pitch;
  const fy = (top - drag.first.top) / drag.pitch;
  let best = null;
  for (let r = Math.floor(fy) - 1; r <= Math.ceil(fy) + 1; r++) {
    for (let c = Math.floor(fx) - 1; c <= Math.ceil(fx) + 1; c++) {
      const distance = Math.hypot(r - fy, c - fx);
      if (distance > 0.8 || !fits(shape, r, c)) continue;
      if (!best || distance < best.distance) best = { r, c, distance };
    }
  }
  return best;
}

function moveDrag(x, y) {
  const left = x - drag.grabX;
  const top = y - drag.grabY;
  drag.lift.style.transform = `translate(${left}px, ${top}px)`;
  const { shape, tile } = tray[drag.n];
  const spot = findSpot(shape, left, top);
  if (spot && drag.spot && spot.r === drag.spot.r && spot.c === drag.spot.c) return;
  if (!spot && !drag.spot) return;
  drag.spot = spot;
  clearPreview();
  if (!spot) return;
  for (const [dr, dc] of SHAPES[shape].cells) {
    const cell = cells[at(spot.r + dr, spot.c + dc)];
    cell.classList.add('preview');
    cell.dataset.tile = tile;
  }
  const { rows, cols } = fullLines(withPiece(shape, spot.r, spot.c, tile));
  for (const r of rows) for (let c = 0; c < SIZE; c++) cells[at(r, c)].classList.add('hot');
  for (const c of cols) for (let r = 0; r < SIZE; r++) cells[at(r, c)].classList.add('hot');
}

function clearPreview() {
  for (const cell of cells) {
    cell.classList.remove('preview', 'hot');
    delete cell.dataset.tile;
  }
}

async function endDrag(event) {
  if (!drag) return;
  const current = drag;
  drag = null;
  clearPreview();
  if (event.type === 'pointerup' && current.spot) {
    current.lift.remove();
    place(current.n, current.spot.r, current.spot.c);
    return;
  }
  const from = current.piece.getBoundingClientRect();
  const to = current.mini.getBoundingClientRect();
  const back = current.lift.animate(
    [
      { transform: current.lift.style.transform },
      { transform: `translate(${to.left}px, ${to.top}px) scale(${to.width / from.width})` },
    ],
    { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' },
  );
  await Promise.race([back.finished.catch(() => {}), delay(280)]);
  current.lift.remove();
  current.mini.style.visibility = '';
}

slots.forEach((slot, n) => {
  slot.addEventListener('pointerdown', (event) => startDrag(event, n));
  slot.addEventListener('pointermove', (event) => {
    if (drag && drag.n === n) moveDrag(event.clientX, event.clientY);
  });
  slot.addEventListener('pointerup', endDrag);
  slot.addEventListener('pointercancel', endDrag);
  slot.addEventListener('lostpointercapture', endDrag);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && drag) endDrag(new Event('cancel'));
});

/* Placing and clearing */
function place(n, r, c) {
  const { shape, tile } = tray[n];
  tray[n] = null;
  slots[n].replaceChildren();
  const placed = SHAPES[shape].cells.map(([dr, dc]) => at(r + dr, c + dc));
  for (const i of placed) {
    board[i] = tile;
    paint(i, true);
  }
  sound.tick();
  const { rows, cols } = fullLines(board);
  if (rows.length + cols.length) clear(rows, cols, placed);
  if (tray.every((piece) => !piece)) {
    deal();
    renderTray(true);
  } else {
    updateFit();
  }
  save();
}

/* The blocks of every full line burst in a wave from where the piece landed,
   one star per line flies to the counter, and the praise shows and is said. */
function clear(rows, cols, placed) {
  const gone = new Set();
  for (const r of rows) for (let c = 0; c < SIZE; c++) gone.add(at(r, c));
  for (const c of cols) for (let r = 0; r < SIZE; r++) gone.add(at(r, c));
  const midR = placed.reduce((sum, i) => sum + Math.floor(i / SIZE), 0) / placed.length;
  const midC = placed.reduce((sum, i) => sum + (i % SIZE), 0) / placed.length;
  for (const i of gone) {
    board[i] = -1;
    const block = cells[i].querySelector('.block:not(.going)');
    if (!block) continue;
    const wait = Math.round(Math.hypot(Math.floor(i / SIZE) - midR, (i % SIZE) - midC) * 45);
    block.classList.remove('placed');
    block.classList.add('going');
    block.style.animationDelay = `${wait}ms`;
    setTimeout(() => block.remove(), wait + 700);
    if (MOTION) setTimeout(() => burst(cells[i], block.dataset.tile, 3), wait + 90);
  }

  const count = rows.length + cols.length;
  lines += count;
  const empty = board.every((tile) => tile < 0);
  const middles = [
    ...rows.map((r) => [cells[at(r, 0)], cells[at(r, SIZE - 1)]]),
    ...cols.map((c) => [cells[at(0, c)], cells[at(SIZE - 1, c)]]),
  ];
  const mine = era;
  middles.forEach(([a, b], k) => {
    const one = a.getBoundingClientRect();
    const two = b.getBoundingClientRect();
    const x = (one.left + one.right + two.left + two.right) / 4;
    const y = (one.top + one.bottom + two.top + two.bottom) / 4;
    if (MOTION) flyStar(x, y, 120 + k * 160, mine);
  });
  if (!MOTION) {
    shown = lines;
    showCount();
  }
  cheer(count > 1 || empty ? CHEERS.lines : CHEERS.line, count, empty);
}

function burst(cell, tile, count) {
  const rect = cell.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const size = rect.width * 0.24;
  for (let k = 0; k < count; k++) {
    const spark = document.createElement('i');
    spark.className = 'spark';
    spark.dataset.tile = tile;
    spark.style.width = `${size}px`;
    spark.style.height = `${size}px`;
    root.append(spark);
    const angle = Math.random() * Math.PI * 2;
    const reach = rect.width * (0.7 + Math.random() * 1.1);
    const dx = Math.cos(angle) * reach;
    const dy = Math.sin(angle) * reach - rect.width * 0.3;
    const turn = 90 + Math.random() * 180;
    spark.animate(
      [
        { transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(45deg) scale(1)`, opacity: 1 },
        { transform: `translate(${x + dx}px, ${y + dy}px) translate(-50%, -50%) rotate(${45 + turn}deg) scale(.3)`, opacity: 0 },
      ],
      { duration: 550 + Math.random() * 300, easing: 'cubic-bezier(.1,.7,.3,1)' },
    ).finished.then(() => spark.remove(), () => spark.remove());
  }
}

function flyStar(x, y, wait, mine) {
  const target = $('score-star').getBoundingClientRect();
  const tx = target.left + target.width / 2;
  const ty = target.top + target.height / 2;
  const size = cells[0].getBoundingClientRect().width;
  const star = document.createElement('div');
  star.className = 'fly-star';
  star.style.width = `${size}px`;
  star.style.height = `${size}px`;
  star.innerHTML = STAR;
  root.append(star);
  star.animate(
    [
      { transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(.2)`, opacity: 0 },
      { transform: `translate(${x}px, ${y - size * 0.6}px) translate(-50%, -50%) scale(1.4)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${tx}px, ${ty}px) translate(-50%, -50%) scale(.45)`, opacity: 1 },
    ],
    { duration: 850, delay: wait, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'backwards' },
  ).finished.then(() => {
    star.remove();
    if (mine !== era) return;
    shown = Math.min(shown + 1, lines);
    showCount();
    $('score').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 280 });
  }, () => star.remove());
}

function cheer(phrase, count, empty) {
  const el = $('cheer');
  el.textContent = phrase.text;
  el.hidden = false;
  for (const animation of el.getAnimations()) animation.cancel();
  el.animate(
    [
      { transform: 'scale(.5)', opacity: 0 },
      { transform: 'scale(1.08)', opacity: 1, offset: 0.18 },
      { transform: 'scale(1)', opacity: 1, offset: 0.28 },
      { transform: 'scale(1)', opacity: 1, offset: 0.8 },
      { transform: 'translateY(-30%) scale(.95)', opacity: 0 },
    ],
    { duration: empty ? 2200 : 1500, easing: 'ease-out' },
  ).finished.then(() => { el.hidden = true; }, () => {});
  const chimes = empty ? 3 : Math.min(count, 2);
  for (let k = 0; k < chimes; k++) setTimeout(sound.chime, k * 260);
  setTimeout(() => sound.play(phrase.clip), 350);
  if (empty && MOTION) {
    for (const cell of cells) setTimeout(() => burst(cell, Math.floor(Math.random() * TILES), 2), 300 + Math.random() * 500);
  }
}

/* Until the child first picks up a piece, the pieces in the tray bob now and
   then to show where to start. */
let hintTimer = null;
let hinted = false;

function scheduleHint() {
  clearTimeout(hintTimer);
  if (hinted) return;
  hintTimer = setTimeout(() => {
    trayEl.classList.add('hint');
    setTimeout(() => trayEl.classList.remove('hint'), 2400);
    scheduleHint();
  }, 6000);
}

function stopHint() {
  hinted = true;
  clearTimeout(hintTimer);
  trayEl.classList.remove('hint');
}

/* Keeping the board */
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ board, tray, lines }));
  } catch {
    // Private browsing: the board lasts for this visit only.
  }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    const tileOk = (t) => Number.isInteger(t) && t >= -1 && t < TILES;
    const pieceOk = (p) => p === null
      || (p && Number.isInteger(p.shape) && Boolean(SHAPES[p.shape]) && Number.isInteger(p.tile) && p.tile >= 0 && p.tile < TILES);
    if (
      saved
      && Array.isArray(saved.board) && saved.board.length === SIZE * SIZE && saved.board.every(tileOk)
      && Array.isArray(saved.tray) && saved.tray.length === 3 && saved.tray.every(pieceOk)
      && Number.isInteger(saved.lines) && saved.lines >= 0
    ) {
      ({ board, tray, lines } = saved);
      return true;
    }
  } catch {
    // Nothing saved, or storage is blocked.
  }
  return false;
}

function newBoard() {
  era += 1;
  board = Array(SIZE * SIZE).fill(-1);
  lines = 0;
  shown = 0;
  showCount();
  for (let i = 0; i < cells.length; i++) paint(i);
  deal();
  renderTray(true);
  save();
}

$('new-pieces').addEventListener('click', () => {
  deal();
  renderTray(true);
  save();
});

/* "New board" sits in the ☰ menu, where a parent finds it and a child is
   unlikely to tap it by chance. */
const menu = document.querySelector('.menu');
if (menu) {
  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'menu-item';
  again.textContent = NEW_BOARD;
  again.addEventListener('click', () => {
    menu.hidden = true;
    const button = document.querySelector('.menu-button');
    if (button) button.setAttribute('aria-expanded', 'false');
    newBoard();
  });
  const rule = document.createElement('hr');
  rule.className = 'menu-rule';
  menu.append(rule, again);
}

/* Start */
if (!load()) {
  board = Array(SIZE * SIZE).fill(-1);
  tray = [null, null, null];
  lines = 0;
}
if (tray.every((piece) => !piece)) deal();
shown = lines;
showCount();
for (let i = 0; i < cells.length; i++) paint(i);
renderTray(true);
save();
scheduleHint();
sound.preload(Object.values(CHEERS).map((phrase) => phrase.clip));
