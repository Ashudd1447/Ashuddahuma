/* الْمَتَاهَاتُ, the mazes: the family's printed mazes, as printed
   (mazes/mazes.json, read out of the worksheet and the son's two activity
   books by tools/make-mazes.py). The list shows them in three sections: the
   mazes without a picture, the ones with a picture at each end (a car to
   take to its house), and the ones whose way through draws a hidden picture.
   The child draws a line with his finger from the green door to the red one.
   The line is his own, uneven as it is, and it cannot cross a wall. Every
   corridor is open to him: a wrong turn can be taken, and undone by going
   back the way he came. At the end of a dead end the line is lost with a soft
   buzz and he starts over; at the exit a chime plays. In the mazes whose way
   through draws a hidden picture, the walls then fade and his line straightens
   into the picture, and its name shows and is said. Which mazes are finished
   is kept on the device and shown in the list. */
const $ = (id) => document.getElementById(id);

const KEY = 'mazes';
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

/* What the child sees and hears. The parents approve every line. The titles,
   the pictures' names and the instructions that name a maze's two pictures
   come with the mazes. */
const TEXT = {
  plain: 'مَتَاهَاتٌ',
  help: 'سَاعِدْ',
  picture: 'مَتَاهَاتٌ فِيهَا رَسْمٌ مَخْفِيٌّ',
  start: 'اِبْدَأْ هُنَا',
  end: 'النِّهَايَةُ',
  draw: { text: 'اِرْسُمْ خَطًّا مِنَ الْبِدَايَةِ إِلَى النِّهَايَةِ', clip: 'maze-draw' },
  find: { text: 'اِتَّبِعِ الطَّرِيقَ وَاكْتَشِفِ الرَّسْمَ الْمَخْفِيَّ', clip: 'maze-find' },
  what: { text: 'مَاذَا رَسَمْتَ؟', clip: 'maze-what' },
  praise: { text: 'أحسنت', clip: 'well-done' },
};

/* The printed page's colors, then the child's line and the finished picture. */
const WALL = '#1A1A1A';
const GREEN = '#1B7F3B';
const RED = '#C62828';
const DISC = 0.13;
const LINE = [47, 134, 222];
const PICTURE = [24, 84, 176];
const rgb = ([r, g, b], alpha = 1) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`;

/* Lengths, in cells. */
const THICK = 0.3; // the child's line
const BOLD = 0.26; // the finished picture's line
const WALL_W = 0.1;
const KEEP = 0.25; // how far a point stays from a wall beside it: the line's edge keeps a gap that shows
const POST = 0.35; // and from the end of a wall at a corner of its cell
const REACH = 1.3; // a touch this near the head of the line takes it up
const MIDDLE = 0.2; // how near its center counts as the middle of a cell: a finger that strays a little into a side opening loses nothing
const FAR = 4; // the longest way round, in cells, that the line walks by itself
const GRAIN = 1 / 800; // the morph's points are no farther apart than this share of the picture

/* Seconds. */
const LOST = 0.6; // a lost line fading
const OUT = 0.3; // the line carried out through the door
const FADE = 0.7; // the walls fading
const ASK = 1.4; // the question, before the line starts to move
const MORPH = 1.8;
const REST = 0.9; // the name or the praise, before the buttons
const PATIENCE = 6; // the longest wait for a recording to end

const EDGE = 8; // pixels of paper around the maze where no door is
const FINE = 13; // a maze with this many cells across or down keeps the room outside its doors small, for its cells
const SECTIONS = ['plain', 'help', 'picture']; // the list's sections, in order
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
const STEPS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const KEYS = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' };
const TURNS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const root = $('mazes');
const board = $('board');
const paper = $('paper');
const canvas = $('canvas');
const ring = $('ring');
const ctx = canvas.getContext('2d');
const page = document.createElement('canvas'); // the printed page as a picture, drawn once for each size

let mazes = []; // in the order of the list
let done = new Set();
let maze = null; // the open maze, or none while the list shows
let walls = null; // its walls, as one path in cells
let trail = []; // the cells the line passes, from the first to the one its head is in
let stroke = []; // the child's points, in cells: { x, y, i }, i being the cell of the trail it was drawn in
let tail = 0; // where in the stroke the part carried out through the door begins
let phase = 'list'; // draw, lost, out, then praise or fade, ask, morph, name, and done
let time = 0; // seconds into the phase
let sheet = 1; // how strongly the printed page shows: walls, discs, arrows and words
let morph = null; // the line's points as drawn (from) and on the picture (to)
let finger = null; // the pointer that is drawing
let joined = false; // whether that finger has come to the line since it touched down
let under = null; // the cell that finger was in a moment ago
let lift = null; // a pointer that lost its line and must lift before another begins
let said = true; // whether the recording that was started has ended
let turn = 0;
let fit = null; // the maze on the canvas: cell size, corner, paper size, door margin, pixel ratio
let dirty = false;
let raf = 0;
let last = 0;

/* The sounds made in code. An older saved copy of sound.js may lack one. */
const beep = (name, ...values) => {
  if (typeof sound[name] === 'function') sound[name](...values);
};

/* A text that a recording says, by the father's rule (2026-11-25): it shows
   only while its Fusha recording is the one that plays (sound.caption). With
   { mark: true } a speaker mark stands in its place, and a tap on it says the
   line again. An older saved copy of sound.js may lack it: then the text
   simply shows. */
const caption = (el, text, clip, how) => (typeof sound.caption === 'function'
  ? sound.caption(el, text, clip, how)
  : Promise.resolve((el.textContent = text, false)));

/* A recorded line, in the family's dialect; silent while it is not recorded. */
function speak(clip) {
  const mine = ++turn;
  said = false;
  sound.say(clip).then(() => {
    if (mine === turn) said = true;
  });
}

/* A short vibration where the device has one (iPhone and iPad have none). */
function shake() {
  try {
    if (typeof navigator.vibrate === 'function') navigator.vibrate([60, 40, 60]);
  } catch {
    // A browser may refuse it; the buzz is enough.
  }
}

/* The maze's shape. Cell (c, r) counts from the left and from the top, as
   printed. */
function wallAt(c, r, dc, dr) {
  if (dr < 0) return maze.h[r][c] === '1';
  if (dr > 0) return maze.h[r + 1][c] === '1';
  if (dc < 0) return maze.v[r][c] === '1';
  return maze.v[r][c + 1] === '1';
}

const inside = (c, r) => c >= 0 && r >= 0 && c < maze.cols && r < maze.rows;
const ways = (c, r) => STEPS.filter(([dc, dr]) => !wallAt(c, r, dc, dr) && inside(c + dc, r + dr));
const head = () => trail[trail.length - 1];
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
/* The end of a dead end: a cell with one opening that is neither the first nor the last. */
const blind = (cell) => ways(cell[0], cell[1]).length === 1 && !same(cell, maze.start) && !same(cell, maze.end);

/* Whether a wall ends at this corner of the grid. */
function post(x, y) {
  const { h, v, cols, rows } = maze;
  return (x > 0 && h[y][x - 1] === '1') || (x < cols && h[y][x] === '1')
    || (y > 0 && v[y - 1][x] === '1') || (y < rows && v[y][x] === '1');
}

/* Walls as runs: [x1, y1, x2, y2] in cells, neighbors in a line joined. */
function wallRuns(m) {
  const runs = [];
  for (let r = 0; r <= m.rows; r++) {
    for (let c = 0; c < m.cols; c++) {
      if (m.h[r][c] !== '1') continue;
      let end = c;
      while (end + 1 < m.cols && m.h[r][end + 1] === '1') end++;
      runs.push([c, r, end + 1, r]);
      c = end;
    }
  }
  for (let c = 0; c <= m.cols; c++) {
    for (let r = 0; r < m.rows; r++) {
      if (m.v[r][c] !== '1') continue;
      let end = r;
      while (end + 1 < m.rows && m.v[end + 1][c] === '1') end++;
      runs.push([c, r, c, end + 1]);
      r = end;
    }
  }
  return runs;
}

const wallPath = (m) => wallRuns(m).map(([x1, y1, x2, y2]) => `M${x1} ${y1}L${x2} ${y2}`).join('');

/* The cell under a point. A point outside a door, in the door's column,
   belongs to the door's cell. */
function cellAt(x, y) {
  const c = Math.floor(x);
  const r = Math.floor(y);
  if (inside(c, r)) return [c, r];
  for (const [cell, side] of [[maze.start, maze.enter], [maze.end, maze.leave]]) {
    if (c === cell[0] && (side === 'top' ? y < 0 : y >= maze.rows)) return cell;
  }
  return null;
}

/* A point held inside its cell, off the walls beside it and off the wall
   ends at its corners, so that the line never touches a wall. */
function hold(c, r, x, y) {
  let px = clamp(x, c + (wallAt(c, r, -1, 0) ? KEEP : 0), c + 1 - (wallAt(c, r, 1, 0) ? KEEP : 0));
  let py = clamp(y, r + (wallAt(c, r, 0, -1) ? KEEP : 0), r + 1 - (wallAt(c, r, 0, 1) ? KEEP : 0));
  for (const [vx, vy] of [[c, r], [c + 1, r], [c, r + 1], [c + 1, r + 1]]) {
    if (!post(vx, vy)) continue;
    const dx = px - vx;
    const dy = py - vy;
    const d = Math.hypot(dx, dy);
    if (d >= POST) continue;
    if (d < 1e-6) {
      px = vx + (c + 0.5 - vx) * POST * 1.5;
      py = vy + (r + 0.5 - vy) * POST * 1.5;
    } else {
      px = vx + (dx / d) * POST;
      py = vy + (dy / d) * POST;
    }
  }
  return [px, py];
}

/* Where the line passes from one cell into the next: on the opening between
   them, where the finger crossed it, clear of the wall ends on both sides. */
function crossing(from, to, hc, hr, c, r) {
  if (c !== hc) {
    const x = Math.max(c, hc);
    const t = to[0] === from.x ? 0.5 : clamp((x - from.x) / (to[0] - from.x));
    return [x, clamp(mix(from.y, to[1], t), hr + POST, hr + 1 - POST)];
  }
  const y = Math.max(r, hr);
  const t = to[1] === from.y ? 0.5 : clamp((y - from.y) / (to[1] - from.y));
  return [clamp(mix(from.x, to[0], t), hc + POST, hc + 1 - POST), y];
}

/* The line */
function put(x, y) {
  const i = trail.length - 1;
  const before = stroke[stroke.length - 1];
  if (before && before.i === i && Math.hypot(before.x - x, before.y - y) < 0.03) return;
  stroke.push({ x, y, i });
}

/* The way from the head of the line to a cell through open passages, as the
   cells to step into: empty when the head is there, none when the cell is
   farther than the line walks by itself (the finger crossed a wall or jumped). */
function wayTo(cell) {
  const [hc, hr] = head();
  if (same(cell, [hc, hr])) return [];
  if (Math.abs(cell[0] - hc) + Math.abs(cell[1] - hr) > FAR) return null;
  const seen = new Set([`${hc},${hr}`]);
  let edge = [[hc, hr, null]];
  for (let depth = 1; depth <= FAR; depth++) {
    const next = [];
    for (const node of edge) {
      for (const [dc, dr] of ways(node[0], node[1])) {
        const hit = [node[0] + dc, node[1] + dr, node];
        const name = `${hit[0]},${hit[1]}`;
        if (seen.has(name)) continue;
        seen.add(name);
        if (same(hit, cell)) {
          const way = [];
          for (let n = hit; n[2]; n = n[2]) way.unshift([n[0], n[1]]);
          return way;
        }
        next.push(hit);
      }
    }
    edge = next;
  }
  return null;
}

/* One step of the line into a cell beside its head. Into the cell it came
   from, the line rewinds: the head steps back and the points of the cell it
   left are gone. Into any other, it goes on through the opening, to the
   finger's point when there is one and to the middle of the cell otherwise. */
function walk([c, r], at) {
  const before = trail[trail.length - 2];
  if (before && same(before, [c, r])) {
    const left = trail.length - 1;
    trail.pop();
    while (stroke.length && stroke[stroke.length - 1].i === left) stroke.pop();
  } else {
    const [hc, hr] = head();
    if (!stroke.length) put(hc + 0.5, hr + 0.5);
    const from = stroke[stroke.length - 1];
    const to = at ? hold(c, r, at[0], at[1]) : [c + 0.5, r + 0.5];
    trail.push([c, r]);
    put(...crossing(from, to, hc, hr, c, r));
    if (!at) put(c + 0.5, r + 0.5);
  }
  if (at) put(...hold(c, r, at[0], at[1]));
}

/* The finger at a point, in cells. The line walks a short way round by itself
   to a finger that slipped over a wall, with two exceptions, so that nothing
   happens that the child did not do: a touch that lands across a wall from
   the head moves nothing until the finger comes round to the line, and the
   end of a dead end is entered only by the finger itself, through its
   opening, from the cell the head is in. */
function follow(x, y) {
  if (phase !== 'draw') return;
  const cell = cellAt(x, y);
  const from = under;
  under = cell;
  if (!cell) return;
  const way = wayTo(cell);
  if (!way) return; // the line waits at its head until the finger comes back
  if (!joined && way.length > 2) return;
  if (way.length && blind(cell) && !(way.length === 1 && from && same(from, head()))) return;
  joined = true;
  way.forEach((step, n) => walk(step, n === way.length - 1 ? [x, y] : null));
  if (!way.length) put(...hold(cell[0], cell[1], x, y));
  check(!inside(Math.floor(x), Math.floor(y)));
  refresh();
}

/* The end of a dead end loses the line; the middle of the last cell, or the
   door beyond it, finishes the maze. Anywhere else nothing happens. */
function check(out) {
  const [c, r] = head();
  const at = stroke[stroke.length - 1];
  if (!at || trail.length < 2) return;
  const exit = same([c, r], maze.end);
  if (exit && out) {
    finish();
    return;
  }
  if (!exit && ways(c, r).length !== 1) return;
  const [bc, br] = trail[trail.length - 2];
  const dx = at.x - (c + 0.5);
  const dy = at.y - (r + 0.5);
  const past = dx * (c - bc) + dy * (r - br) >= 0;
  if (!past && Math.hypot(dx, dy) > MIDDLE) return;
  if (exit) finish();
  else lose();
}

/* A dead end: a soft buzz, a short vibration, and the line turns red and
   fades. The finger that drew it must lift before a line begins again. */
function lose() {
  if (finger !== null) lift = finger;
  finger = null;
  beep('buzz');
  shake();
  enter('lost');
}

function restart() {
  trail = [maze.start.slice()];
  stroke = [];
  tail = 0;
  enter('draw');
}

/* The exit: the line is carried on through the door to the red arrow. */
function finish() {
  const [c, r] = maze.end;
  const y = maze.leave === 'bottom' ? r + 1 : r;
  const i = trail.length - 1;
  tail = stroke.length;
  stroke.push({ x: c + 0.5, y, i }, { x: c + 0.5, y, i, out: true });
  finger = null;
  done.add(maze.number);
  save();
  beep('chime');
  enter('out');
}

/* A point of the stroke on the page, in cells. The last one stands outside
   the door, where the red arrow begins. */
function place(point) {
  if (!point.out) return [point.x, point.y];
  const reach = fit ? Math.min(0.45, (fit.m * 0.3) / fit.s) : 0.3;
  return [point.x, point.y + (maze.leave === 'bottom' ? reach : -reach)];
}

function headPoint() {
  const at = stroke[stroke.length - 1];
  if (at) return [at.x, at.y];
  const [c, r] = head();
  return [c + 0.5, r + 0.5];
}

/* Whether a touch is on the green arrow outside the first door, or on the
   picture beside it, which takes up a line that has not left the first cell. */
function onStartArrow(x, y) {
  if (trail.length !== 1 || !fit) return false;
  const deep = fit.m / fit.s + 0.2;
  const beyond = maze.enter === 'top' ? -y : y - maze.rows;
  if (Math.abs(x - (maze.start[0] + 0.5)) <= 1 && beyond >= 0 && beyond <= deep) return true;
  if (!fit.from) return false;
  const [left, top, wide, high] = fit.from;
  const px = fit.ox + x * fit.s;
  const py = fit.oy + y * fit.s;
  return px >= left - 8 && px <= left + wide + 8 && py >= top - 8 && py <= top + high + 8;
}

/* The finger down, moving and up, in cells: the pointer handlers and the test
   hook both come through here. A touch takes up the line only near its head;
   a second finger is ignored. */
function press(x, y, id) {
  if (phase !== 'draw' || finger !== null || lift !== null) return false;
  const [hx, hy] = headPoint();
  const near = Math.max(REACH, fit ? 34 / fit.s : 0);
  if (Math.hypot(x - hx, y - hy) > near && !onStartArrow(x, y)) return false;
  finger = id;
  joined = false;
  under = null;
  placeRing();
  follow(x, y);
  return true;
}

function drag(x, y, id) {
  if (id === finger) follow(x, y);
}

function release(id) {
  if (id === lift) lift = null;
  if (id !== finger) return;
  finger = null;
  placeRing();
}

/* The arrow keys move the line one cell at a time, for a computer. */
function key(name) {
  if (phase !== 'draw' || finger !== null || !(name in TURNS)) return;
  const [dc, dr] = TURNS[name];
  const [c, r] = head();
  if (wallAt(c, r, dc, dr)) return;
  if (inside(c + dc, r + dr)) {
    walk([c + dc, r + dr], null);
    check(false);
  } else if (same([c, r], maze.end)) {
    if (!stroke.length) put(c + 0.5, r + 0.5);
    check(true);
  }
  refresh();
}

/* After the exit */
function enter(name) {
  phase = name;
  time = 0;
  placeRing();
  refresh();
}

function showName(text, clip) {
  const name = $('name');
  caption(name, text, clip);
  name.hidden = false;
}

function praise() {
  showName(TEXT.praise.text, TEXT.praise.clip);
  speak(TEXT.praise.clip);
  enter('praise');
}

/* The printed page is gone and the child's line is alone: the question. */
function ask() {
  sheet = 0;
  caption($('line'), TEXT.what.text, TEXT.what.clip, { mark: true });
  speak(TEXT.what.clip);
  enter('ask');
}

/* How far along the picture's line a place on the way through lies. The
   place is the cell's number in the trail plus how far through the cell it
   is; each cell's own part of the picture (its anchor) belongs to its middle,
   and the two ends of the way are the two ends of the picture's line. */
function share(anchors, place) {
  const n = anchors.length;
  const q = place - 0.5;
  if (q <= 0) return anchors[0] * clamp(place * 2);
  if (q >= n - 1) return mix(anchors[n - 1], 1, clamp((q - (n - 1)) * 2));
  const k = Math.floor(q);
  return mix(anchors[k], anchors[k + 1], q - k);
}

/* A line of points measured, to find the point at a share of its length. */
function measure(points) {
  const sums = [0];
  for (let i = 1; i < points.length; i++) {
    sums.push(sums[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const total = sums[sums.length - 1];
  return (t) => {
    const want = clamp(t) * total;
    let lo = 0;
    let hi = sums.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (sums[mid] <= want) lo = mid;
      else hi = mid;
    }
    const span = sums[hi] - sums[lo];
    const u = span > 0 ? (want - sums[lo]) / span : 0;
    return [mix(points[lo][0], points[hi][0], u), mix(points[lo][1], points[hi][1], u)];
  };
}

/* The morph: every point of the child's line gets its own place on the
   picture and will move to it in a straight line. Where two of his points
   lie far apart on the picture, points are added on his line between them, so
   that the line can bend into the picture's curves. */
function startMorph() {
  const { anchors, outline } = maze.picture;
  const points = stroke.map((point) => ({ xy: place(point), i: Math.min(point.i, anchors.length - 1) }));
  const counts = new Array(anchors.length).fill(0);
  for (const point of points) counts[point.i]++;
  const seen = new Array(anchors.length).fill(0);
  let far = 0;
  const along = points.map((point, k) => {
    const through = counts[point.i] > 1 ? seen[point.i]++ / (counts[point.i] - 1) : 0.5;
    if (k === points.length - 1) far = 1;
    else if (k > 0) far = Math.max(far, share(anchors, point.i + through));
    return far;
  });
  const at = measure(outline);
  const from = [];
  const to = [];
  points.forEach((point, k) => {
    if (k > 0) {
      const gap = along[k] - along[k - 1];
      const extra = Math.ceil(gap / GRAIN) - 1;
      for (let j = 1; j <= extra; j++) {
        const u = j / (extra + 1);
        from.push([mix(points[k - 1].xy[0], point.xy[0], u), mix(points[k - 1].xy[1], point.xy[1], u)]);
        to.push(at(along[k - 1] + gap * u));
      }
    }
    from.push(point.xy);
    to.push(at(along[k]));
  });
  morph = { from, to };
  enter('morph');
}

function showButtons() {
  $('buttons').hidden = false;
  enter('done');
}

const BUSY = ['lost', 'out', 'fade', 'ask', 'morph', 'name', 'praise'];

/* Time passing: every fade, wait and move after a dead end or the exit. */
function update(dt) {
  if (!maze || !BUSY.includes(phase)) return;
  time += dt;
  dirty = true;
  const waited = (least) => time >= least && (said || time >= PATIENCE);
  if (phase === 'lost') {
    if (time >= LOST) restart();
  } else if (phase === 'out') {
    if (time < OUT) return;
    if (maze.picture) enter('fade');
    else praise();
  } else if (phase === 'fade') {
    sheet = 1 - clamp(time / FADE);
    if (time >= FADE) ask();
  } else if (phase === 'ask') {
    if (waited(ASK)) startMorph();
  } else if (phase === 'morph') {
    if (time < MORPH) return;
    showName(maze.picture.name, maze.picture.clip);
    speak(maze.picture.clip);
    enter('name');
  } else if (waited(REST)) {
    showButtons();
  }
}

function loop(now) {
  raf = 0;
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  update(dt);
  if (dirty) draw();
  if (BUSY.includes(phase) && !raf) raf = requestAnimationFrame(loop);
}

/* Asks for one drawing; while something moves, the loop keeps itself going. */
function refresh() {
  dirty = true;
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

/* Drawing */
function layout() {
  if (!maze) return;
  const wide = board.clientWidth;
  const high = board.clientHeight;
  if (!wide || !high) return;
  // The room outside a door: for its arrow and its word, or its picture; small when the maze is fine.
  const room = Math.min(wide, high);
  const fine = Math.max(maze.cols, maze.rows) >= FINE;
  const m = maze.help ? clamp(room * 0.11, 54, 84) : clamp(room * 0.085, 42, fine ? 46 : 66);
  const doors = [maze.enter, maze.leave];
  const top = doors.includes('top') ? m : EDGE;
  const bottom = doors.includes('bottom') ? m : EDGE;
  const s = Math.max(4, Math.min((wide - 2 * EDGE) / maze.cols, (high - top - bottom) / maze.rows));
  const w = maze.cols * s + 2 * EDGE;
  const h = maze.rows * s + top + bottom;
  const ratio = Math.min(devicePixelRatio || 1, 3);
  paper.style.width = `${w}px`;
  paper.style.height = `${h}px`;
  paper.style.left = `${(wide - w) / 2}px`;
  paper.style.top = `${(high - h) / 2}px`;
  paper.style.setProperty('--ring', `${clamp(s * 1.3, 60, 112)}px`);
  canvas.width = Math.round(w * ratio);
  canvas.height = Math.round(h * ratio);
  fit = { s, ox: EDGE, oy: top, w, h, m, ratio };
  drawSheet();
  placeRing();
  draw();
}

/* The pulsing ring marks the head of the line whenever no finger is down, so
   the child knows where to put his finger. */
function placeRing() {
  const show = Boolean(maze && fit) && phase === 'draw' && finger === null;
  ring.hidden = !show;
  if (!show) return;
  const [x, y] = headPoint();
  ring.style.left = `${fit.ox + x * fit.s}px`;
  ring.style.top = `${fit.oy + y * fit.s}px`;
}

/* The pictures at the two ends of some mazes, each loaded once. The page is
   drawn again when one arrives. */
const pictures = new Map();

function pictureOf(name) {
  let image = pictures.get(name);
  if (!image) {
    image = new Image();
    image.addEventListener('load', () => {
      if (!maze || !fit || !maze.help || ![maze.help.from.image, maze.help.to.image].includes(name)) return;
      drawSheet();
      draw();
    });
    image.src = `images/mazes/${name}.png`;
    pictures.set(name, image);
  }
  return image;
}

/* A door's arrow outside the wall, with its word beside it, or its picture
   in place of the word, on the side with room: away from the other door when
   both are on one side of the maze. Returns the picture's place on the paper. */
function drawDoor(pen, cell, side, into, color, mark, other, otherSide) {
  const { s, ox, oy, m } = fit;
  const outward = side === 'top' ? -1 : 1;
  const x = ox + (cell[0] + 0.5) * s;
  const wallY = oy + (side === 'top' ? 0 : maze.rows) * s;
  const near = wallY + outward * ((s * WALL_W) / 2 + 5);
  const far = wallY + outward * (m - 5);
  const [from, to] = into ? [far, near] : [near, far];
  const way = Math.sign(to - from);
  const shaft = m * 0.12;
  const tip = m * 0.36;
  const half = m * 0.2;
  pen.fillStyle = color;
  pen.strokeStyle = color;
  pen.lineWidth = shaft;
  pen.lineCap = 'round';
  pen.beginPath();
  pen.moveTo(x, from + (way * shaft) / 2);
  pen.lineTo(x, to - way * tip * 0.8);
  pen.stroke();
  pen.beginPath();
  pen.moveTo(x, to);
  pen.lineTo(x - half, to - way * tip);
  pen.lineTo(x + half, to - way * tip);
  pen.closePath();
  pen.fill();
  const size = clamp(m * 0.42, 15, 28);
  const beside = side === otherSide ? Math.sign(cell[0] - other[0]) || 1 : cell[0] + 0.5 > maze.cols / 2 ? -1 : 1;
  if (typeof mark === 'string') {
    pen.font = `700 ${size}px "Noto Naskh Arabic", "Geeza Pro", serif`;
    pen.direction = 'rtl';
    pen.textBaseline = 'middle';
    pen.textAlign = beside > 0 ? 'left' : 'right';
    pen.fillText(mark, x + beside * (half + size * 0.4), (near + far) / 2);
    return null;
  }
  // A picture: as tall as the room allows, and no wider than the paper has room for on that side.
  const gap = half + 8;
  const most = (beside > 0 ? fit.w - x : x) - gap - 6;
  const scale = Math.min((m - 10) / mark.h, most / mark.w);
  const wide = mark.w * scale;
  const high = mark.h * scale;
  const left = beside > 0 ? x + gap : x - gap - wide;
  const top = (near + far) / 2 - high / 2;
  const image = pictureOf(mark.image);
  if (image.complete && image.naturalWidth) pen.drawImage(image, left, top, wide, high);
  return [left, top, wide, high];
}

/* The printed page: the two discs, the walls, the arrows and their words or
   pictures. It is drawn once for each size on a bitmap of its own, so that a
   move of the finger costs one picture and one line however many walls the
   maze has. */
function drawSheet() {
  const { s, ox, oy, ratio } = fit;
  page.width = canvas.width;
  page.height = canvas.height;
  const pen = page.getContext('2d');
  pen.setTransform(ratio, 0, 0, ratio, 0, 0);
  for (const [cell, color] of [[maze.start, GREEN], [maze.end, RED]]) {
    pen.globalAlpha = DISC;
    pen.fillStyle = color;
    pen.beginPath();
    pen.arc(ox + (cell[0] + 0.5) * s, oy + (cell[1] + 0.5) * s, s * 0.36, 0, Math.PI * 2);
    pen.fill();
  }
  pen.globalAlpha = 1;
  pen.save();
  pen.translate(ox, oy);
  pen.scale(s, s);
  pen.strokeStyle = WALL;
  pen.lineWidth = WALL_W;
  pen.lineCap = 'round';
  pen.stroke(walls);
  pen.restore();
  const { help } = maze;
  fit.from = drawDoor(pen, maze.start, maze.enter, true, GREEN, help ? help.from : TEXT.start, maze.end, maze.leave);
  drawDoor(pen, maze.end, maze.leave, false, RED, help ? help.to : TEXT.end, maze.start, maze.enter);
}

/* The line as it is to be drawn at this moment: its points in cells, its
   color and thickness, and whether it closes into a picture. */
function shape() {
  const points = stroke.map(place);
  if (phase === 'lost') {
    return { points, color: `rgba(198,40,40,${1 - clamp((time - 0.12) / (LOST - 0.12))})`, width: THICK };
  }
  if (phase === 'out') {
    // The part beyond the finger's last point grows out through the door.
    const t = clamp(time / OUT) * (points.length - tail);
    const grown = points.slice(0, tail);
    for (let k = tail; k < points.length && k - tail < t; k++) {
      const before = points[k - 1] || points[k];
      const u = clamp(t - (k - tail));
      grown.push([mix(before[0], points[k][0], u), mix(before[1], points[k][1], u)]);
    }
    return { points: grown, color: rgb(LINE), width: THICK };
  }
  if (phase === 'morph' && morph) {
    const t = ease(clamp(time / MORPH));
    return {
      points: morph.from.map((from, k) => [mix(from[0], morph.to[k][0], t), mix(from[1], morph.to[k][1], t)]),
      color: rgb(LINE.map((value, k) => mix(value, PICTURE[k], t))),
      width: mix(THICK, BOLD, t),
    };
  }
  if (maze.picture && (phase === 'name' || phase === 'done')) {
    return { points: maze.picture.outline, color: rgb(PICTURE), width: BOLD, closed: true };
  }
  return { points, color: rgb(LINE), width: THICK };
}

function drawLine() {
  const { points, color, width, closed } = shape();
  if (!points.length) return;
  const { s, ox, oy } = fit;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (points.length === 1) {
    ctx.arc(points[0][0], points[0][1], width / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(points[0][0], points[0][1]);
    for (let k = 1; k < points.length; k++) ctx.lineTo(points[k][0], points[k][1]);
    if (closed) ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function draw() {
  dirty = false;
  if (!maze || !fit) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (sheet > 0) {
    ctx.globalAlpha = sheet;
    ctx.drawImage(page, 0, 0);
    ctx.globalAlpha = 1;
  }
  ctx.setTransform(fit.ratio, 0, 0, fit.ratio, 0, 0);
  drawLine();
}

/* The list: a small drawing of each maze with its title, in three sections.
   A maze with a picture at each end shows them outside its two doors. A
   finished maze shows it: its way through and a star, or its hidden picture,
   bold over faint walls, with its name. */
const kindOf = (m) => (m.picture ? 'picture' : m.help ? 'help' : 'plain');

/* A door's picture in a card's drawing, outside the door and inside the drawing's sides. */
function doorArt(m, cell, side, { image, w, h }, pad, room) {
  const high = Math.min(room - 0.3, ((m.cols + 2 * pad) * 0.6 * h) / w);
  const wide = (high * w) / h;
  const x = clamp(cell[0] + 0.5 - wide / 2, -pad, m.cols + pad - wide);
  const y = side === 'top' ? -0.25 - high : m.rows + 0.25;
  return `<image href="images/mazes/${image}.png" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${wide.toFixed(2)}" height="${high.toFixed(2)}"/>`;
}

function art(m, finished) {
  const pad = 0.7;
  const room = m.help ? Math.max(1.9, m.rows * 0.22) : 0; // outside a door with a picture
  const above = [m.enter, m.leave].includes('top') ? room : 0;
  const below = [m.enter, m.leave].includes('bottom') ? room : 0;
  const line = (points, more) => `<path d="M${points.map(([x, y]) => `${x} ${y}`).join('L')}${more}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const disc = ([c, r], color) => `<circle cx="${c + 0.5}" cy="${r + 0.5}" r=".4" fill="${color}" opacity=".3"/>`;
  const ends = m.help ? doorArt(m, m.start, m.enter, m.help.from, pad, room) + doorArt(m, m.end, m.leave, m.help.to, pad, room) : '';
  let over = '';
  if (finished && m.picture) {
    over = `${line(m.picture.outline, 'Z')} stroke="${rgb(PICTURE)}" stroke-width=".42"/>`;
  } else if (finished) {
    const [c, r] = m.end;
    const way = m.path.map(([x, y]) => [x + 0.5, y + 0.5]);
    way.push([c + 0.5, m.leave === 'bottom' ? r + 1.35 : r - 0.35]);
    over = `${line(way, '')} stroke="${rgb(LINE)}" stroke-width=".34"/>`;
  }
  return `<svg viewBox="${-pad} ${-pad - above} ${m.cols + 2 * pad} ${m.rows + 2 * pad + above + below}" aria-hidden="true">`
    + `<g${finished && m.picture ? ' opacity=".16"' : ''}>${disc(m.start, GREEN)}${disc(m.end, RED)}`
    + `<path d="${wallPath(m)}" fill="none" stroke="${WALL}" stroke-width=".13" stroke-linecap="round"/></g>${ends}${over}</svg>`;
}

function card(m) {
  const finished = done.has(m.number);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'maze-card';
  button.dataset.number = m.number;
  const mark = finished ? (m.picture ? m.picture.name : STAR) : '';
  button.innerHTML = `${art(m, finished)}<span class="maze-card-title">${m.title}</span><span class="maze-card-mark">${mark}</span>`;
  button.addEventListener('click', () => openMaze(m.number));
  return button;
}

/* The list. Coming back from a maze, it shows that maze's card. */
function showList() {
  const from = maze ? maze.number : null;
  maze = null;
  phase = 'list';
  finger = null;
  lift = null;
  turn++;
  sound.stop();
  root.dataset.view = 'list';
  $('view-maze').hidden = true;
  $('view-list').hidden = false;
  $('cards').replaceChildren(...SECTIONS.map((kind) => {
    const section = document.createElement('section');
    section.className = 'maze-section';
    const heading = document.createElement('h2');
    heading.className = 'maze-heading';
    heading.textContent = TEXT[kind];
    const cards = document.createElement('div');
    cards.className = 'maze-cards';
    cards.append(...mazes.filter((m) => kindOf(m) === kind).map(card));
    section.append(heading, cards);
    return section;
  }).filter((section) => section.lastChild.childElementCount));
  const back = from === null ? null : $('cards').querySelector(`[data-number="${from}"]`);
  // At once: the page's smooth scrolling would slide the whole long list past.
  if (back) back.scrollIntoView({ block: 'center', behavior: 'instant' });
  else scrollTo({ top: 0, behavior: 'instant' });
}

function openMaze(number) {
  const next = mazes.find((m) => m.number === number);
  if (!next) return;
  maze = next;
  walls = new Path2D(wallPath(maze));
  trail = [maze.start.slice()];
  stroke = [];
  tail = 0;
  morph = null;
  sheet = 1;
  finger = null;
  lift = null;
  const words = maze.help || (maze.picture ? TEXT.find : TEXT.draw);
  $('title').textContent = maze.title;
  caption($('line'), words.text, words.clip, { mark: true });
  $('name').hidden = true;
  $('buttons').hidden = true;
  const isLast = maze === mazes[mazes.length - 1];
  $('next').hidden = isLast;
  $('to-list').hidden = !isLast;
  root.dataset.view = 'maze';
  $('view-list').hidden = true;
  $('view-maze').hidden = false;
  phase = 'draw';
  time = 0;
  layout();
  speak(words.clip);
  if (maze.picture) sound.preloadPrompts([maze.picture.clip]);
}

/* Saved on the device: which mazes have been finished. */
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, done: [...done].sort((a, b) => a - b) }));
  } catch {
    // Private browsing: the marks last for this visit only.
  }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.v === 1 && Array.isArray(saved.done)) done = new Set(saved.done.filter(Number.isInteger));
  } catch {
    done = new Set();
  }
}

/* A pointer's place in cells. */
function spot(event) {
  const box = canvas.getBoundingClientRect();
  const scale = box.width ? fit.w / box.width : 1;
  return [((event.clientX - box.left) * scale - fit.ox) / fit.s, ((event.clientY - box.top) * scale - fit.oy) / fit.s];
}

paper.addEventListener('pointerdown', (event) => {
  if (event.button > 0 || !maze || !fit) return;
  event.preventDefault();
  if (event.isPrimary) {
    // The first pointer to come down means none was down: one whose lifting was missed holds nothing back.
    finger = null;
    lift = null;
  }
  if (!press(...spot(event), event.pointerId)) return;
  try {
    paper.setPointerCapture(event.pointerId);
  } catch {
    // A pointer that is already gone cannot be held; the line still follows it.
  }
});
paper.addEventListener('pointermove', (event) => {
  if (event.pointerId !== finger || !fit) return;
  // A fast finger gives several places between two frames: the line takes them all.
  const parts = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
  for (const part of parts.length ? parts : [event]) drag(...spot(part), event.pointerId);
});
const lifted = (event) => release(event.pointerId);
addEventListener('pointerup', lifted);
addEventListener('pointercancel', lifted);
root.addEventListener('contextmenu', (event) => event.preventDefault());

addEventListener('keydown', (event) => {
  if (!maze || !(event.key in KEYS)) return;
  event.preventDefault();
  key(KEYS[event.key]);
});

$('next').addEventListener('click', () => {
  const next = mazes[mazes.indexOf(maze) + 1];
  if (next) openMaze(next.number);
});
$('to-list').addEventListener('click', showList);
$('again').addEventListener('click', () => openMaze(maze.number));

/* Inside a maze the ✕ leads back to the list; from the list it leaves the page. */
document.addEventListener('click', (event) => {
  if (!maze || !event.target.closest('#exit')) return;
  event.preventDefault();
  showList();
}, true);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  finger = null;
  lift = null;
  placeRing();
});
addEventListener('resize', layout);
if (typeof ResizeObserver === 'function') new ResizeObserver(layout).observe(board);

/* For trying the game by hand on the family's computer: open a maze, feed a
   finger in cells, pass time and draw. */
if (LOCAL) {
  window.mazeGame = {
    open: openMaze,
    list: showList,
    key,
    draw,
    layout,
    update,
    wallRuns,
    point(x, y, kind = 'move') {
      if (kind === 'down') return press(x, y, 1);
      if (kind === 'up') return release(1);
      return drag(x, y, 1);
    },
    /* Walks the whole way through with a wavy line, as a finger would. */
    solve() {
      const { path } = maze;
      press(path[0][0] + 0.5, path[0][1] + 0.4, 1);
      let n = 0;
      for (let k = 1; k < path.length && phase === 'draw'; k++) {
        const [ac, ar] = path[k - 1];
        const [bc, br] = path[k];
        for (let j = 1; j <= 5 && phase === 'draw'; j++) {
          const wave = Math.sin(++n * 0.9) * 0.3;
          drag(ac + 0.5 + ((bc - ac) * j) / 5 + (bc === ac ? wave : 0), ar + 0.5 + ((br - ar) * j) / 5 + (br === ar ? wave : 0), 1);
        }
      }
      release(1);
    },
    get state() {
      return {
        number: maze && maze.number,
        phase,
        time,
        trail,
        stroke,
        head: maze ? headPoint() : null,
        finished: maze ? !['draw', 'lost'].includes(phase) : false,
        finger,
        lift,
        sheet,
        morph,
        fit,
        shape: maze && fit ? shape() : null,
        done: [...done],
        order: mazes.map((m) => m.number),
        mazes,
      };
    },
  };
}

/* Start */
load();
sound.preloadPrompts([TEXT.draw.clip, TEXT.find.clip, TEXT.what.clip, TEXT.praise.clip]);
fetch('mazes/mazes.json')
  .then((response) => response.json())
  .then((data) => {
    // The order of the list: section by section, each in the order of the file.
    mazes = SECTIONS.flatMap((kind) => data.mazes.filter((m) => kindOf(m) === kind));
    // Every line the mazes can say, announced at once, for the page's dialect switch.
    if (typeof sound.uses === 'function') sound.uses(mazes.flatMap((m) => [m.help && m.help.clip, m.picture && m.picture.clip]).filter(Boolean));
    showList();
  })
  .catch(() => {
    // Without the mazes there is nothing to show; the list stays empty.
  });
if (document.fonts && typeof document.fonts.load === 'function') {
  // The arrows' words are drawn on the canvas, which does not wait for the font.
  document.fonts.load('700 20px "Noto Naskh Arabic"', TEXT.start).then(() => {
    if (!maze || !fit) return;
    drawSheet();
    draw();
  }, () => {});
}
