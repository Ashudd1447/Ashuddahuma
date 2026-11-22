/* بِنَاءُ الْمَسْجِدِ: the building game. The child puts on his safety gear
   (a helmet, a vest and gloves, each dragged onto the boy, as the seat belt is
   dragged in the driving games), then builds a masjid on a building site,
   seen from the side, one machine after another:
   1. the bulldozer scrapes the mounds of earth off the plot in three passes,
      each a layer lower, and the foundation is laid;
   2. the forklift carries three pallets of stone to the wall, each lifted a
      course higher than the last;
   3. the hand tools fix the door: the hammer drives the nails, the screwdriver
      the screws, the drill makes the holes for the handle;
   4. the crane lifts the minaret's shaft, its top, and last the dome.
   Then the masjid is done: اللَّهُ أَكْبَرُ shows and is said, and the first
   words of the adhan sound. Each stage starts from what the one before it
   built, and the masjid is kept on the device between visits.
   Two buttons on the left drive (or move the crane's trolley), two on the
   right raise and lower. Nothing is ever lost: a load that is too low just
   stops at the wall, and the button that helps breathes.
   The site is drawn on a canvas in its own lengths: x to the right from 0
   to 16, y up from the ground. */
const $ = (id) => document.getElementById(id);

const KEY = 'build';
const DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arabic = (n) => String(n).replace(/\d/g, (d) => DIGITS[d]);
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const within = (promise, ms) => Promise.race([promise, delay(ms)]);
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

const INK = '#2B1F16';
const STONE = '#EFE3C8';
const JOINT = 'rgba(74,52,36,.32)';
const TEAL = '#2A9D8F';
const GOLD = '#F2B84B';
const CLAY = '#B5673F';
const WOOD = '#A8743F';
const DIRT = '#B98A5A';
const STEEL = '#8D949B';
const DARK = '#3A3A3A';
const SKIN = '#E3B78E';
const VEST = '#F2742B';

/* The words shown and said: each machine as it comes, each tool as it is
   picked up, each part of the masjid as it is finished. */
const WORDS = {
  dozer: { text: 'الْجَرَّافَةُ', clip: 'dozer' },
  fork: { text: 'الرَّافِعَةُ الشَّوْكِيَّةُ', clip: 'forklift' },
  crane: { text: 'الرَّافِعَةُ', clip: 'crane' },
  hammer: { text: 'الْمِطْرَقَةُ', clip: 'tool-hammer' },
  screwdriver: { text: 'الْمِفَكُّ', clip: 'tool-screwdriver' },
  drill: { text: 'الْمِثْقَابُ', clip: 'tool-drill' },
  ground: { text: 'الْأَسَاسُ', clip: 'part-foundation' },
  walls: { text: 'الْجُدْرَانُ', clip: 'part-walls' },
  door: { text: 'الْبَابُ', clip: 'part-door' },
  minaret: { text: 'الْمِئْذَنَةُ', clip: 'part-minaret' },
  dome: { text: 'الْقُبَّةُ', clip: 'part-dome' },
};
const STAGES = ['dozer', 'fork', 'tools', 'crane'];

/* The site. */
const W = 16;
const HALL = { x0: 7.2, x1: 12.2, top: 3.16 };
const DOOR = { x: 9.7, half: 0.5, rise: 1.45 };
const MINARET = { x: 13.8, half: 0.6, base: 1.2 };
const SPOT = 4.3; // where a pallet waits; the crane's loads wait a little further on
const JIB = 8.5; // how high the crane's arm is
const PIECES = [
  { kind: 'shaft', w: 0.9, h: 3, x: MINARET.x, y: MINARET.base },
  { kind: 'top', w: 1.4, h: 2.4, x: MINARET.x, y: MINARET.base + 3 },
  { kind: 'dome', w: 2.5, h: 2.3, x: (HALL.x0 + HALL.x1) / 2, y: HALL.top },
];

const root = $('build');
const canvas = $('site');
const ctx = canvas.getContext('2d');
const siteView = $('view-site');

let stars = 0;
let shown = 0;
let saved = 0; // how many stages of this masjid are finished
let view = 'gear';
let running = false;
let last = 0;
let raf = 0;
let clock = 0;
let stage = null;
let bits = [];
let finale = 0; // 0 to 1 once the masjid is done
/* What is built, and how far each part has grown into view (0 to 1). */
const made = { ground: false, rows: 0, door: false, shaft: false, top: false, dome: false };
const grow = { ground: 0, rows: [0, 0, 0], trim: 0, door: 0 };
/* The crane stands on the site from the start: its trolley along the arm, its hook's height. */
const rig = { x: 5.2, y: 6.4, swing: 0, swung: 0, manned: false };

/* The screen: sizes in CSS pixels, set by layout(). */
let width = 0;
let height = 0;
let dpr = 1;
let s = 60; // pixels to one length of the site
let groundY = 0; // where the ground is, down the screen
let wide = W; // lengths of the site across the screen
let camX = 0; // the left edge of the view

function show(next) {
  view = next;
  root.dataset.view = next;
  for (const section of root.querySelectorAll('.drive-view')) section.hidden = section.id !== `view-${next}` && !(next === 'done' && section.id === 'view-done');
  canvas.hidden = next === 'gear';
}

/* Saved on the device: the stars and how far the masjid has come. */
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ stars, stage: saved }));
  } catch {
    // Private browsing: they last for this visit only.
  }
}

function load() {
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (kept && Number.isInteger(kept.stars) && kept.stars >= 0) stars = kept.stars;
    if (kept && Number.isInteger(kept.stage) && kept.stage > 0 && kept.stage < STAGES.length) saved = kept.stage;
  } catch {
    stars = 0;
  }
}

function showCount() {
  $('count').textContent = arabic(shown);
}

function flyStar(x, y) {
  const to = $('score-star').getBoundingClientRect();
  const tx = to.left + to.width / 2;
  const ty = to.top + to.height / 2;
  const size = 54;
  const star = document.createElement('div');
  star.className = 'fly-star';
  star.style.width = `${size}px`;
  star.style.height = `${size}px`;
  star.innerHTML = STAR;
  root.append(star);
  let counted = false;
  const count = () => {
    if (counted) return;
    counted = true;
    star.remove();
    shown = stars;
    showCount();
    $('score').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 280 });
  };
  star.animate(
    [
      { transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(.2)`, opacity: 0 },
      { transform: `translate(${x}px, ${y - size * 0.8}px) translate(-50%, -50%) scale(1.3)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${tx}px, ${ty}px) translate(-50%, -50%) scale(.45)`, opacity: 1 },
    ],
    { duration: 900, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'backwards' },
  ).finished.then(count, count);
  setTimeout(count, 1200); // in case the animation never runs
}

/* Stars for a job done, flying from a place on the site. */
function award(count, x, y) {
  stars += count;
  save();
  flyStar(clamp((x - camX) * s, 30, width - 30), clamp(groundY - y * s, 80, height - 60));
}

/* The sounds this game added. An older saved copy of sound.js may not have
   them yet on the first launch after an update. */
const beep = (name, ...values) => {
  if (typeof sound[name] === 'function') sound[name](...values);
};

/* A word at the top of the site, shown and said. */
let wordTimer = 0;
function word(name, quiet = false) {
  const entry = WORDS[name];
  const pill = $('word');
  pill.textContent = entry.text;
  pill.hidden = false;
  clearTimeout(wordTimer);
  wordTimer = setTimeout(() => { pill.hidden = true; }, 2600);
  if (!quiet) sound.say(entry.clip);
}

/* The buttons and the keys. */
const ctl = { left: false, right: false, up: false, down: false };
const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
for (const button of document.querySelectorAll('[data-ctl]')) {
  const name = button.dataset.ctl;
  const fingers = new Set();
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    fingers.add(event.pointerId);
    ctl[name] = true;
    try {
      button.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone.
    }
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(type, (event) => {
      fingers.delete(event.pointerId);
      ctl[name] = fingers.size > 0;
    });
  }
}
addEventListener('keydown', (event) => {
  if (view !== 'site' || !(event.key in KEYS)) return;
  ctl[KEYS[event.key]] = true;
  event.preventDefault();
});
addEventListener('keyup', (event) => {
  if (event.key in KEYS) ctl[KEYS[event.key]] = false;
});
const letGo = () => {
  ctl.left = ctl.right = ctl.up = ctl.down = false;
};
addEventListener('blur', letGo);
root.addEventListener('contextmenu', (event) => event.preventDefault());

/* The button that helps now breathes: 'left', 'right', 'up', 'down' or none. */
function hint(name) {
  if (root.dataset.hint !== name) root.dataset.hint = name;
}

function layout() {
  width = innerWidth;
  height = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const button = clamp(Math.min(width, height) * 0.15, 72, 112);
  const band = button + 26; // the ground below the site, where the buttons sit
  s = Math.min((height - band) / 10, width / 9);
  groundY = height - band;
  wide = width / s;
  if (wide >= W + 1.6) camX = -(wide - W) / 2;
  if (stage && stage.fit) stage.fit();
}

/* A narrow screen shows part of the site and follows the work. */
function follow(dt) {
  if (wide >= W + 1.6) {
    camX = -(wide - W) / 2;
    return;
  }
  const want = clamp((stage && stage.focus ? stage.focus() : W / 2) - wide / 2, -0.8, W + 0.8 - wide);
  camX += (want - camX) * (dt ? 1 - Math.exp(-dt / 0.4) : 1);
}

/* Dust, chips and sparks: small things thrown up that fall back. */
function spray(x, y, count, color, spread = 1, up = 1.6) {
  for (let i = 0; i < count; i++) {
    bits.push({ x, y, vx: (Math.random() - 0.5) * 2 * spread, vy: (0.3 + Math.random() * 0.7) * up, age: 0, life: 0.45 + Math.random() * 0.4, r: 0.035 + Math.random() * 0.05, color });
  }
}

/* The machines' motor, and the beeps of one backing up. */
let beeped = 0;
function motor(speed, backing) {
  beep('engine', 0.1 + Math.min(1, Math.abs(speed) / 2) * 0.3, 0.1 + Math.min(1, Math.abs(speed) / 2.4) * 0.5);
  if (backing && clock - beeped > 0.7) {
    beeped = clock;
    beep('backup');
  }
}

/* Stage 1, the bulldozer. Three mounds of earth lie on the plot. Each pass to
   the right scrapes a layer off them and pushes it to the heap at the far
   end; back at the start the blade drops for the next layer. */
function dozerStage() {
  const E0 = 6.2;
  const CELL = 0.1;
  const earth = new Float32Array(86);
  for (let i = 0; i < earth.length; i++) {
    const x = E0 + i * CELL;
    const tall = [[8, 1.25, 0.85], [10.6, 1.05, 0.9], [13, 1.3, 0.8]].reduce((sum, [mid, top, half]) => sum + top * Math.exp(-(((x - mid) / half) ** 2)), 0);
    earth[i] = tall < 0.05 ? 0 : tall;
  }
  const LEVELS = [0.8, 0.4, 0];
  const me = { name: 'dozer', x: -2.6, v: 0, y: 0, tilt: 0, pass: 0, back: false, load: 0, heap: 0, mode: 'in', spin: 0, wait: 0, done: false, earth, E0, CELL };
  const groundAt = (x) => {
    const i = Math.round((x - E0) / CELL);
    return i >= 0 && i < earth.length ? earth[i] : 0;
  };
  me.level = () => LEVELS[Math.min(me.pass, 2)];
  me.focus = () => me.x + 1.5;
  me.update = (dt) => {
    let want = 0;
    if (me.mode === 'in') {
      want = 2.2;
      if (me.x >= 2.2) me.mode = 'work';
    } else if (me.mode === 'work') {
      want = ctl.right ? 2.2 : ctl.left ? -2.6 : 0;
    } else if (me.mode === 'laid') {
      me.wait += dt;
      if (me.wait > 1.4) me.mode = 'out';
    } else {
      want = 3;
    }
    me.v += clamp(want - me.v, -7 * dt, 7 * dt);
    const before = me.x + 1.8;
    me.x += me.v * dt;
    if (me.mode === 'work' && (me.x < 2.2 || me.x > 13.1)) {
      me.x = clamp(me.x, 2.2, 13.1);
      me.v = 0;
    }
    me.spin += me.v * dt * 3;
    const blade = me.x + 1.8;
    if (me.mode === 'work' && blade > before) {
      const level = me.level();
      const from = Math.max(0, Math.ceil((before - E0) / CELL));
      const to = Math.min(earth.length - 1, Math.floor((blade + 0.05 - E0) / CELL));
      for (let i = from; i <= to; i++) {
        if (earth[i] <= level) continue;
        me.load += (earth[i] - level) * CELL;
        earth[i] = level;
        if (Math.random() < 0.35) spray(blade + 0.15, level + 0.35, 1, DIRT, 0.6, 1.2);
      }
      // At the far end the load is tipped onto the heap.
      if (blade >= 14.85 && !me.back) {
        me.heap += me.load;
        me.load = 0;
        spray(15.3, 0.6, 10, DIRT, 1.2, 2);
        beep('thud');
        award(1, 15, 1.5);
        if (me.pass >= 2) {
          me.mode = 'laid';
          made.ground = true;
          sound.chime();
          word('ground');
          advance();
        } else {
          me.back = true;
        }
      }
    }
    // Back at the start, the blade drops for the next layer.
    if (me.mode === 'work' && me.back && me.x <= 2.7) {
      me.back = false;
      me.pass += 1;
      beep('click');
    }
    if (me.mode === 'out') {
      me.heap = Math.max(0, me.heap - dt * 4);
      if (me.x - 1.8 > camX + wide) me.done = true;
    }
    // It rides over what is left of the mounds, its long tracks evening them out.
    const front = (groundAt(me.x + 0.5) + groundAt(me.x + 0.9) + groundAt(me.x + 1.3)) / 3;
    const rear = (groundAt(me.x - 0.5) + groundAt(me.x - 0.9) + groundAt(me.x - 1.3)) / 3;
    me.y += ((front + rear) / 2 - me.y) * (1 - Math.exp(-dt / 0.1));
    me.tilt += (clamp(Math.atan2(front - rear, 1.8), -0.2, 0.2) - me.tilt) * (1 - Math.exp(-dt / 0.1));
    motor(me.v, me.v < -0.4 && me.mode === 'work');
    hint(me.mode !== 'work' ? '' : me.back ? 'left' : 'right');
  };
  return me;
}

/* Stage 2, the forklift. A pallet of stone waits at the spot; the forks go
   under it when they are low. At the wall the load must be as high as the
   wall has grown: lower, and it stops at the wall's face. */
function forkStage() {
  const me = { name: 'fork', x: -2.6, v: 0, h: 0.05, carry: false, pallet: 'ready', drop: 1, mode: 'in', spin: 0, wait: 0, done: false, bumped: false };
  me.focus = () => me.x + 2.2;
  me.update = (dt) => {
    let want = 0;
    if (me.mode === 'in') {
      want = 2;
      if (me.x >= 1.7) me.mode = 'work';
    } else if (me.mode === 'work') {
      want = ctl.right ? 2 : ctl.left ? -2.3 : 0;
      me.h = clamp(me.h + (ctl.up ? 1.3 : ctl.down ? -1.3 : 0) * dt, 0.05, 2.75);
    } else if (me.mode === 'built') {
      me.wait += dt;
      me.h = Math.max(0.05, me.h - 1.3 * dt);
      if (me.wait > 1.6) me.mode = 'out';
    } else {
      want = -2.8;
      if (me.x + 1.8 < camX) me.done = true;
    }
    me.v += clamp(want - me.v, -7 * dt, 7 * dt);
    me.x += me.v * dt;
    me.spin += me.v * dt * 3;
    if (me.mode === 'work') {
      // How far it may go: the mast stops at the wall, a load too low stops
      // at the wall's face, and the pallet on the ground stops raised forks.
      let most = HALL.x0 - 0.75;
      const low = me.carry && me.h < made.rows - 0.02;
      if (low) most = Math.min(most, HALL.x0 - 1.73);
      const high = me.pallet === 'ready' && me.h >= 0.2;
      if (me.pallet === 'ready') most = Math.min(most, high ? SPOT - 1.73 : SPOT - 0.7);
      if (me.x > most) {
        me.x = most;
        if (me.v > 0.5 && !me.bumped && (low || high)) {
          me.bumped = true;
          sound.tick();
        }
        me.v = Math.min(me.v, 0);
      } else if (me.x < most - 0.2) {
        me.bumped = false;
      }
      me.x = Math.max(me.x, 1.5);
      const over = me.x + 1.7 > HALL.x0 + 0.03;
      if (me.carry && over) me.h = Math.max(me.h, made.rows);
      // The forks slide under the pallet and take it.
      if (me.pallet === 'ready' && me.h < 0.2 && me.x >= SPOT - 0.78) {
        me.pallet = 'none';
        me.carry = true;
        beep('click');
      }
      // Set down on the wall: the stones spread into a new course.
      if (me.carry && me.x + 1.7 >= HALL.x0 + 0.75 && me.h - made.rows < 0.22) {
        me.carry = false;
        made.rows += 1;
        beep('thud');
        spray(HALL.x0 + 0.5, made.rows - 0.4, 6, '#D9CBB0', 0.8, 1.2);
        award(1, HALL.x0 + 0.5, made.rows);
        if (made.rows === 3) {
          me.mode = 'built';
          sound.chime();
          word('walls');
          advance();
        }
      }
      // Backed away past the spot, the next pallet is set down there.
      if (!me.carry && me.pallet === 'none' && made.rows < 3 && me.x + 1.7 < SPOT - 0.3) {
        me.pallet = 'drop';
        me.drop = 0;
      }
      if (me.mode === 'work') {
        const ready = me.pallet === 'ready';
        hint(ready ? (high ? 'down' : 'right')
          : me.carry ? (low ? 'up' : over && me.h - made.rows >= 0.22 ? 'down' : 'right')
            : made.rows < 3 ? 'left' : '');
      }
    } else {
      hint('');
    }
    if (me.pallet === 'drop') {
      me.drop += dt / 0.4;
      if (me.drop >= 1) {
        me.drop = 1;
        me.pallet = 'ready';
        sound.tick();
      }
    }
    motor(me.v, me.v < -0.4);
  };
  return me;
}

/* Stage 3, the hand tools, seen close: the door lies ready with its nails,
   its screws and two marks for the handle. A tool is dragged from the tray;
   over a place of its own kind it works by itself. */
const BENCH = { w: 100, h: 128 };
const TOOLS = {
  hammer: { rest: [20, 112], tip: [13, 120] },
  screwdriver: { rest: [50, 112], tip: [50, 122] },
  drill: { rest: [80, 111], tip: [66, 104.5] },
};
function toolStage() {
  const spots = [
    { kind: 'hammer', x: 36, y: 56 }, { kind: 'hammer', x: 50, y: 56 }, { kind: 'hammer', x: 64, y: 56 },
    { kind: 'screwdriver', x: 32, y: 30 }, { kind: 'screwdriver', x: 32, y: 78 }, { kind: 'screwdriver', x: 68, y: 72 },
    { kind: 'drill', x: 67, y: 37 }, { kind: 'drill', x: 67, y: 46 },
  ].map((spot) => ({ ...spot, p: 0, shake: 0 }));
  const me = { name: 'tools', spots, held: '', id: null, px: 0, py: 0, k: 1, ox: 0, oy: 0, t: 0, blow: 0, turn: 0, swing: 0, on: null, wrong: null, fade: 0, end: 0, said: {}, done: false };
  me.fit = () => {
    me.k = Math.min((width - 20) / BENCH.w, (height - 84) / BENCH.h);
    me.ox = (width - BENCH.w * me.k) / 2;
    me.oy = 74 + Math.max(0, (height - 84 - BENCH.h * me.k) / 2);
  };
  me.fit();
  const at = (event) => [(event.clientX - me.ox) / me.k, (event.clientY - me.oy) / me.k];
  me.tip = () => (me.held ? [me.px, me.py - 13] : null);
  me.down = (event) => {
    if (me.held || me.end) return;
    const [x, y] = at(event);
    const name = Object.keys(TOOLS).find((tool) => Math.hypot(x - TOOLS[tool].rest[0], y - TOOLS[tool].rest[1]) < 15);
    if (!name) return;
    me.held = name;
    me.id = event.pointerId;
    [me.px, me.py] = [x, y];
    word(name, me.said[name]);
    me.said[name] = true;
    try {
      siteView.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone.
    }
  };
  me.move = (event) => {
    if (event.pointerId === me.id) [me.px, me.py] = at(event);
  };
  me.up = (event) => {
    if (event.pointerId !== me.id) return;
    me.held = '';
    me.id = null;
    me.on = null;
    beep('drill', 0);
  };
  me.update = (dt) => {
    me.t += dt;
    me.fade = Math.min(1, me.fade + dt / 0.5);
    for (const spot of spots) spot.shake = Math.max(0, spot.shake - dt);
    me.swing = Math.max(0, me.swing - dt / 0.3);
    const tip = me.tip();
    const near = (spot, reach) => tip && spot.p < 1 && Math.hypot(tip[0] - spot.x, tip[1] - spot.y) < reach;
    const on = spots.find((spot) => spot.kind === me.held && near(spot, 8)) || null;
    if (on !== me.on) {
      me.on = on;
      me.blow = 0.12;
    }
    if (on) {
      if (me.held === 'hammer') {
        // Three blows drive a nail home.
        me.blow -= dt;
        if (me.blow <= 0) {
          me.blow = 0.34;
          me.swing = 1;
          on.p = Math.min(1, on.p + 0.34);
          beep('knock');
        }
      } else {
        on.p = Math.min(1, on.p + dt / 1.1);
        me.turn += dt;
        if (me.held === 'screwdriver' && me.turn > 0.13) {
          me.turn = 0;
          beep('ratchet');
        }
      }
      if (on.p >= 1) {
        sound.tick();
        me.on = null;
      }
    }
    beep('drill', me.held === 'drill' && on ? 1 : 0);
    // A tool over a place that is not its own: the soft buzzer, once.
    const wrong = spots.find((spot) => me.held && spot.kind !== me.held && near(spot, 5)) || null;
    if (wrong && wrong !== me.wrong) {
      wrong.shake = 0.3;
      sound.wrong();
    }
    me.wrong = wrong;
    // All done: the door goes up in its place.
    if (!me.end && spots.every((spot) => spot.p >= 1)) {
      me.end = 0.001;
      me.held = '';
      me.id = null;
      beep('drill', 0);
    }
    if (me.end) {
      me.end += dt;
      if (me.end > 1.5 && !made.door) {
        made.door = true;
        sound.chime();
        word('door');
        award(2, DOOR.x, 1.5);
        advance();
      }
      if (me.end > 3.4) me.done = true;
    }
    hint('');
  };
  return me;
}

/* Stage 4, the crane. Each part waits on the ground; the hook takes it when
   it comes down onto it. A load is carried over whatever stands in its way,
   never through it, and is set down where its outline shows. */
function craneStage() {
  const me = { name: 'crane', part: 0, carry: false, wait: 'ready', drop: 1, mode: 'work', vx: 0, vy: 0, end: 0, done: false, bumped: false };
  const spotX = SPOT + 0.9;
  while (me.part < PIECES.length && made[PIECES[me.part].kind]) me.part += 1;
  rig.manned = true;
  me.focus = () => rig.x;
  me.spotX = spotX;
  // How high things stand between x0 and x1.
  const topOf = (x0, x1) => {
    let top = 0;
    if (x1 > HALL.x0 && x0 < HALL.x1) top = HALL.top;
    if (made.dome && x1 > PIECES[2].x - 1.25 && x0 < PIECES[2].x + 1.25) top = HALL.top + PIECES[2].h;
    if (x1 > MINARET.x - MINARET.half && x0 < MINARET.x + MINARET.half) top = Math.max(top, MINARET.base + (made.shaft ? 3 : 0) + (made.top ? 2.4 : 0));
    const piece = PIECES[me.part];
    if (!me.carry && me.wait === 'ready' && piece && x1 > spotX - piece.w / 2 && x0 < spotX + piece.w / 2) top = Math.max(top, piece.h);
    return top;
  };
  me.update = (dt) => {
    const piece = PIECES[me.part];
    const half = me.carry ? piece.w / 2 : 0.16;
    const hang = me.carry ? piece.h : 0;
    let wantX = 0;
    let wantY = 0;
    if (me.mode === 'work') {
      wantX = ctl.right ? 2.4 : ctl.left ? -2.4 : 0;
      wantY = ctl.up ? 1.9 : ctl.down ? -1.9 : 0;
    } else {
      wantY = 1.6;
    }
    me.vx += clamp(wantX - me.vx, -9 * dt, 9 * dt);
    me.vy += clamp(wantY - me.vy, -12 * dt, 12 * dt);
    // Across: stopped by anything taller than the load hangs.
    let x = clamp(rig.x + me.vx * dt, 2.6, 15);
    let blocked = false;
    if (topOf(x - half, x + half) > rig.y - hang + 0.03) {
      x = rig.x;
      blocked = true;
      if (Math.abs(me.vx) > 0.5 && !me.bumped) {
        me.bumped = true;
        sound.tick();
      }
      me.vx = 0;
    } else if (me.vx !== 0) {
      me.bumped = false;
    }
    // The load swings a little as the trolley starts and stops.
    rig.swung += ((-(x - rig.x) / Math.max(dt, 0.001)) * 0.22 - rig.swing * 14 - rig.swung * 2.4) * dt;
    rig.swing = clamp(rig.swing + rig.swung * dt, -0.06, 0.06);
    rig.x = x;
    // Down: until the load rests on what is under it.
    const floor = topOf(rig.x - half, rig.x + half) + hang;
    rig.y = clamp(rig.y + me.vy * dt, floor, 7.3);
    const resting = rig.y <= floor + 0.02;
    if (me.mode === 'work' && piece) {
      if (!me.carry && me.wait === 'ready' && resting && Math.abs(rig.x - spotX) < 0.5) {
        // The hook takes the part.
        me.carry = true;
        rig.x = spotX;
        beep('click');
      } else if (me.carry && resting && Math.abs(rig.x - piece.x) < 0.45 && Math.abs(rig.y - hang - piece.y) < 0.08) {
        // Set down in its place.
        me.carry = false;
        rig.x = piece.x;
        made[piece.kind] = true;
        beep('thud');
        spray(piece.x, piece.y + 0.1, 8, '#D9CBB0', 1, 1.2);
        award(2, piece.x, piece.y + piece.h);
        sound.chime();
        if (piece.kind === 'top') word('minaret');
        if (piece.kind === 'dome') word('dome');
        me.part += 1;
        if (me.part >= PIECES.length) {
          me.mode = 'up';
          advance();
        } else {
          me.wait = 'drop';
          me.drop = 0;
        }
      }
    }
    if (me.wait === 'drop') {
      me.drop += dt / 0.4;
      if (me.drop >= 1) {
        me.drop = 1;
        me.wait = 'ready';
        sound.tick();
      }
    }
    if (me.mode === 'up') {
      me.end += dt;
      if (me.end > 1.2) me.done = true;
    }
    beep('engine', Math.abs(me.vx) + Math.abs(me.vy) > 0.3 ? 0.18 : 0.06, 0.25 + Math.abs(me.vy) * 0.15);
    // The button that helps: over the part, down; a load in the way of
    // something, up; otherwise toward where it goes.
    if (me.mode !== 'work' || !piece) hint('');
    else if (!me.carry) hint(me.wait !== 'ready' ? '' : Math.abs(rig.x - spotX) < 0.45 ? 'down' : rig.x < spotX ? 'right' : blocked ? 'up' : 'left');
    else if (Math.abs(rig.x - piece.x) < 0.4) hint('down');
    else hint(blocked || topOf(Math.min(rig.x, piece.x) - half, Math.max(rig.x, piece.x) + half) > rig.y - hang ? 'up' : rig.x < piece.x ? 'right' : 'left');
  };
  return me;
}

/* One stage after another. advance() is called the moment a stage's work is
   done, so it is kept even if the child leaves before the machine drives off. */
function advance() {
  saved = Math.min(STAGES.length, STAGES.indexOf(stage.name) + 1);
  save();
  paintSteps();
}

function paintSteps() {
  [...$('steps').children].forEach((dot, i) => dot.classList.toggle('on', i < saved));
}

function begin(index) {
  if (index >= STAGES.length) {
    finish();
    return;
  }
  const name = STAGES[index];
  stage = { dozer: dozerStage, fork: forkStage, tools: toolStage, crane: craneStage }[name]();
  root.dataset.stage = name;
  hint('');
  letGo();
  if (name === 'tools') beep('engineOff');
  else word(name);
}

/* The masjid is done. */
async function finish() {
  stage = null;
  root.dataset.stage = 'done';
  hint('');
  rig.manned = false;
  beep('ambience', null);
  beep('engineOff');
  saved = 0; // the next visit starts a new one
  stars += 5;
  save();
  $('done-stars').innerHTML = `${STAR}<span>${arabic(5)}</span>`;
  $('done-controls').hidden = true;
  $('word').hidden = true;
  show('done');
  sound.chime();
  flyStar(width / 2, groundY - 4 * s);
  const mine = ++run;
  await delay(900);
  if (mine !== run) return;
  await within(sound.say('allahu-akbar'), 6000);
  if (mine !== run) return;
  await within(sound.play('adhan-1.mp3'), 32000);
  if (mine !== run) return;
  await delay(600);
  if (mine !== run) return;
  $('done-controls').hidden = false;
}
let run = 0;

function update(dt) {
  clock += dt;
  for (const bit of bits) {
    bit.age += dt;
    bit.vy -= 7 * dt;
    bit.x += bit.vx * dt;
    bit.y = Math.max(0, bit.y + bit.vy * dt);
  }
  bits = bits.filter((bit) => bit.age < bit.life);
  // What is built grows into view.
  const toward = (now, goal, time) => now + clamp(goal - now, -dt / time, dt / time);
  grow.ground = toward(grow.ground, made.ground ? 1 : 0, 0.8);
  for (let r = 0; r < 3; r++) grow.rows[r] = toward(grow.rows[r], r < made.rows ? 1 : 0, 0.9);
  grow.trim = toward(grow.trim, made.rows === 3 && grow.rows[2] >= 1 ? 1 : 0, 0.5);
  grow.door = toward(grow.door, made.door ? 1 : 0, 0.6);
  if (view === 'done') finale = Math.min(1, finale + dt / 2.5);
  if (!stage) {
    rig.y = Math.min(7.2, rig.y + dt * 1.4);
    rig.swing *= 1 - Math.min(1, dt * 3);
    follow(dt);
    return;
  }
  stage.update(dt);
  follow(dt);
  if (stage.done) begin(STAGES.indexOf(stage.name) + 1);
}

/* Drawing. Shapes are given in the site's lengths, y up. */
function rounded(x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.arcTo(x + w, y, x + w, y + h, q);
  ctx.arcTo(x + w, y + h, x, y + h, q);
  ctx.arcTo(x, y + h, x, y, q);
  ctx.arcTo(x, y, x + w, y, q);
  ctx.closePath();
}

function paint(fill, line) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (line) ctx.stroke();
}

function box(x, y, w, h, r, fill, line = true) {
  rounded(x, y, w, h, r);
  paint(fill, line);
}

function disc(x, y, r, fill, line = true) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  paint(fill, line);
}

function shape(points, fill, line = true) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  paint(fill, line);
}

function lines(points, color = INK, thick = 0.05) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = thick;
  ctx.beginPath();
  for (const [x0, y0, x1, y1] of points) {
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  }
  ctx.stroke();
  ctx.restore();
}

/* The pen for the site: its lengths, y up, a dark line. */
function onSite() {
  ctx.setTransform(dpr * s, 0, 0, -dpr * s, -camX * s * dpr, groundY * dpr);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.05;
}

function drawSky() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const tint = ctx.createLinearGradient(0, 0, 0, groundY);
  tint.addColorStop(0, '#8CC4EA');
  tint.addColorStop(1, '#E4F1F8');
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, width, height);
  if (finale > 0) {
    const warm = ctx.createLinearGradient(0, 0, 0, groundY);
    warm.addColorStop(0, `rgba(250,190,120,${(0.55 * finale).toFixed(3)})`);
    warm.addColorStop(1, `rgba(255,236,190,${(0.7 * finale).toFixed(3)})`);
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, width, groundY);
  }
  const sunX = width * 0.86;
  const sunY = Math.max(70, groundY - 8.6 * s);
  ctx.fillStyle = 'rgba(255,221,120,.35)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, s * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFD45C';
  ctx.beginPath();
  ctx.arc(sunX, sunY, s * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  for (const [at, y, size, pace] of [[0.1, 7.6, 1, 0.006], [0.52, 9, 0.7, 0.009], [0.8, 6.9, 0.85, 0.005]]) {
    const x = (((at + clock * pace) % 1.2) - 0.1) * width;
    const cy = groundY - y * s;
    for (const [dx, dy, rx, ry] of [[0, 0, 1.2, 0.36], [-0.6, 0.1, 0.7, 0.28], [0.55, 0.12, 0.75, 0.3]]) {
      ctx.beginPath();
      ctx.ellipse(x + dx * s * size, cy + dy * s * size, rx * s * size, ry * s * size, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* Behind the site: a far town, the fence, and the ground. */
function drawBackdrop() {
  const x0 = camX - 1;
  const x1 = camX + wide + 1;
  ctx.fillStyle = '#E9DCC0';
  for (let i = Math.floor(x0 / 1.7); i * 1.7 < x1; i++) {
    const n = Math.abs((i * 37) % 11) / 11;
    ctx.fillRect(i * 1.7, 0, 1.5, 1.5 + n * 1.5);
    ctx.fillRect(i * 1.7 + 0.3, 0, 0.7, 2 + n * 1.9);
  }
  ctx.fillStyle = '#DDCDAB';
  ctx.fillRect(x0, 0, x1 - x0, 1.05);
  // The fence: posts and two rails.
  ctx.fillStyle = '#CDAE7F';
  ctx.fillRect(x0, 0.72, x1 - x0, 0.14);
  ctx.fillRect(x0, 0.3, x1 - x0, 0.14);
  for (let i = Math.floor(x0 / 1.1); i * 1.1 < x1; i++) ctx.fillRect(i * 1.1, 0, 0.14, 1);
  // The ground.
  ctx.fillStyle = '#D9BC8A';
  ctx.fillRect(x0, -(height - groundY) / s - 0.2, x1 - x0, (height - groundY) / s + 0.2);
  ctx.fillStyle = '#C3A06C';
  ctx.fillRect(x0, -0.07, x1 - x0, 0.07);
  ctx.fillStyle = 'rgba(126,96,66,.5)';
  for (let i = Math.floor(x0 / 0.8); i * 0.8 < x1; i++) {
    const n = Math.abs((i * 53) % 17) / 17;
    ctx.beginPath();
    ctx.ellipse(i * 0.8 + n * 0.4, -0.35 - n * 1.1, 0.07 + n * 0.05, 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cones and a stack of planks by the fence.
  for (const x of [0.2, 3.1]) {
    shape([[x - 0.17, 0], [x + 0.17, 0], [x + 0.05, 0.5], [x - 0.05, 0.5]], '#F2742B');
    lines([[x - 0.1, 0.22, x + 0.1, 0.22]], '#FFFDF6', 0.07);
  }
  for (let k = 0; k < 3; k++) box(-1.9 + k * 0.06, k * 0.13, 1.5, 0.12, 0.02, WOOD);
}

/* A gold crescent at x, y, on a stem that rises from `foot`. */
function crescent(x, y, r, foot) {
  lines([[x, foot, x, y - r * 0.9]], INK, 0.06);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * 0.42, y + r * 0.18, r * 0.82, 0, Math.PI * 2);
  ctx.fill('evenodd');
  ctx.restore();
}

/* A pointed arch standing on y, as a path. */
function arch(x, y, half, rise) {
  ctx.beginPath();
  ctx.moveTo(x - half, y);
  ctx.lineTo(x - half, y + rise);
  ctx.arc(x, y + rise, half, Math.PI, 0, true);
  ctx.lineTo(x + half, y);
  ctx.closePath();
}

/* A course of stone from x0, on y: two rows of blocks, their joints staggered. */
function stones(x0, y, w, h, shift) {
  box(x0, y, w, h, 0, STONE);
  const marks = [[x0, y + h / 2, x0 + w, y + h / 2]];
  for (let row = 0; row < 2; row++) {
    for (let x = x0 + ((row + shift) % 2 ? 0.3125 : 0.625); x < x0 + w - 0.05; x += 0.625) marks.push([x, y + (row * h) / 2, x, y + ((row + 1) * h) / 2]);
  }
  lines(marks, JOINT, 0.03);
}

/* The crane's loads, each drawn from its middle and its foot. */
function drawPiece(kind, x, y) {
  if (kind === 'shaft') {
    stones(x - 0.45, y, 0.9, 1, 0);
    stones(x - 0.45, y + 1, 0.9, 1, 1);
    stones(x - 0.45, y + 2, 0.9, 1, 0);
    arch(x, y + 1.25, 0.14, 0.4);
    paint('#24323F', true);
  } else if (kind === 'top') {
    box(x - 0.7, y, 1.4, 0.24, 0.05, CLAY);
    box(x - 0.62, y + 0.24, 1.24, 0.3, 0.03, STONE);
    lines([[x - 0.31, y + 0.24, x - 0.31, y + 0.54], [x, y + 0.24, x, y + 0.54], [x + 0.31, y + 0.24, x + 0.31, y + 0.54]], JOINT, 0.03);
    box(x - 0.3, y + 0.24, 0.6, 1.08, 0, STONE);
    arch(x, y + 0.62, 0.13, 0.32);
    paint('#24323F', true);
    shape([[x - 0.4, y + 1.3], [x + 0.4, y + 1.3], [x, y + 2.02]], TEAL);
    crescent(x, y + 2.26, 0.13, y + 2);
  } else {
    box(x - 1.25, y, 2.5, 0.34, 0.04, STONE);
    lines([[x - 0.62, y, x - 0.62, y + 0.34], [x, y, x, y + 0.34], [x + 0.62, y, x + 0.62, y + 0.34]], JOINT, 0.03);
    ctx.beginPath();
    ctx.ellipse(x, y + 0.34, 1.1, 1.36, 0, 0, Math.PI);
    ctx.closePath();
    paint(TEAL, true);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 0.09;
    ctx.beginPath();
    ctx.ellipse(x, y + 0.34, 0.75, 1.1, 0, Math.PI * 0.62, Math.PI * 0.88);
    ctx.stroke();
    ctx.restore();
    crescent(x, y + 2.14, 0.16, y + 1.68);
  }
}

/* Where a load is to go: its outline, dashed, brighter when the load is over it. */
function drawGhost(kind, x, y, lit) {
  ctx.save();
  ctx.setLineDash([0.16, 0.14]);
  ctx.lineWidth = lit ? 0.09 : 0.06;
  ctx.strokeStyle = lit ? '#35A85A' : `rgba(201,138,69,${(0.65 + 0.3 * Math.sin(clock * 4)).toFixed(2)})`;
  ctx.fillStyle = lit ? 'rgba(53,168,90,.14)' : 'rgba(242,184,75,.12)';
  ctx.beginPath();
  if (kind === 'shaft') ctx.rect(x - 0.45, y, 0.9, 3);
  else if (kind === 'top') {
    ctx.moveTo(x - 0.7, y);
    ctx.lineTo(x - 0.7, y + 0.54);
    ctx.lineTo(x - 0.3, y + 0.54);
    ctx.lineTo(x - 0.3, y + 1.3);
    ctx.lineTo(x, y + 2.02);
    ctx.lineTo(x + 0.3, y + 1.3);
    ctx.lineTo(x + 0.3, y + 0.54);
    ctx.lineTo(x + 0.7, y + 0.54);
    ctx.lineTo(x + 0.7, y);
    ctx.closePath();
  } else if (kind === 'dome') {
    ctx.moveTo(x - 1.25, y);
    ctx.lineTo(x - 1.25, y + 0.34);
    ctx.ellipse(x, y + 0.34, 1.1, 1.36, 0, Math.PI, 0, true);
    ctx.lineTo(x + 1.25, y + 0.34);
    ctx.lineTo(x + 1.25, y);
    ctx.closePath();
  } else {
    ctx.rect(x, y, 1, 0.7); // a pallet
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/* The masjid, as far as it is built. */
function drawMasjid() {
  if (grow.ground > 0) {
    ctx.globalAlpha = grow.ground;
    box(6.85, -0.2, 7.95, 0.2, 0.03, '#BDB6A8');
    ctx.globalAlpha = 1;
  }
  const hallW = HALL.x1 - HALL.x0;
  for (let r = 0; r < 3; r++) {
    const part = grow.rows[r];
    if (part <= 0) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(HALL.x0 - 0.1, r - 0.05, (hallW + 0.2) * part, 1.1);
    ctx.clip();
    stones(HALL.x0, r, hallW, 1, r);
    ctx.restore();
  }
  // The door's opening and the two windows show as far as the wall has risen.
  if (grow.rows[0] > 0) {
    ctx.save();
    ctx.beginPath();
    for (let r = 0; r < 3; r++) ctx.rect(HALL.x0, r, hallW * grow.rows[r], 1);
    ctx.clip();
    arch(DOOR.x, 0, DOOR.half, DOOR.rise);
    paint('#4A3424', true);
    if (grow.door > 0) {
      ctx.globalAlpha = grow.door;
      arch(DOOR.x, 0, DOOR.half - 0.06, DOOR.rise);
      paint(WOOD, true);
      lines([[DOOR.x - 0.22, 0.03, DOOR.x - 0.22, 1.7], [DOOR.x, 0.03, DOOR.x, 1.9], [DOOR.x + 0.22, 0.03, DOOR.x + 0.22, 1.7]], 'rgba(74,52,36,.4)', 0.03);
      box(DOOR.x - 0.42, 0.72, 0.84, 0.16, 0.02, '#8C5A2B');
      box(DOOR.x + 0.24, 1.02, 0.07, 0.24, 0.03, GOLD);
      ctx.globalAlpha = 1;
    }
    for (const x of [HALL.x0 + 0.95, HALL.x1 - 0.95]) {
      arch(x, 1.2, 0.32, 0.62);
      paint('#24323F', false);
      lines([[x, 1.2, x, 2.14], [x - 0.32, 1.72, x + 0.32, 1.72]], TEAL, 0.05);
      ctx.save();
      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 0.09;
      arch(x, 1.2, 0.32, 0.62);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  if (grow.trim > 0) {
    ctx.globalAlpha = grow.trim;
    box(HALL.x0 - 0.16, 3, hallW + 0.32, 0.16, 0.03, CLAY);
    ctx.globalAlpha = 1;
  }
  // The minaret: its foot goes up with the wall's first course.
  if (grow.rows[0] > 0) stones(MINARET.x - MINARET.half, 0, MINARET.half * 2, MINARET.base * grow.rows[0], 0);
  if (made.shaft) drawPiece('shaft', MINARET.x, MINARET.base);
  if (made.top) drawPiece('top', MINARET.x, MINARET.base + 3);
  if (made.dome) drawPiece('dome', PIECES[2].x, HALL.top);
  // Done: small lights twinkle around the dome and the minaret.
  if (finale > 0) {
    for (const [x, y, at] of [[8.3, 5.6, 0], [11.2, 5.4, 1.3], [9.7, 6.4, 2.1], [12.9, 6.3, 0.7], [14.7, 5.2, 2.8], [7.4, 4.1, 3.5]]) {
      const size = 0.16 * finale * (0.6 + 0.4 * Math.sin(clock * 3 + at));
      shape([[x, y + size * 2], [x + size * 0.5, y + size * 0.5], [x + size * 2, y], [x + size * 0.5, y - size * 0.5], [x, y - size * 2], [x - size * 0.5, y - size * 0.5], [x - size * 2, y], [x - size * 0.5, y + size * 0.5]], '#FFE9A8', false);
    }
  }
}

/* A worker at the controls: a helmet, a plain head, a bright vest. */
function drawDriver(x, y, k) {
  box(x - 0.17 * k, y, 0.34 * k, 0.34 * k, 0.08 * k, VEST);
  disc(x, y + 0.47 * k, 0.15 * k, SKIN);
  ctx.beginPath();
  ctx.arc(x, y + 0.5 * k, 0.17 * k, 0, Math.PI);
  ctx.closePath();
  paint(GOLD, true);
  lines([[x - 0.22 * k, y + 0.5 * k, x + 0.22 * k, y + 0.5 * k]], INK, 0.05);
}

function wheel(x, y, r, spin, color = '#2B2622') {
  disc(x, y, r, color);
  disc(x, y, r * 0.45, STEEL);
  const marks = [];
  for (let k = 0; k < 3; k++) {
    const a = -spin / r + (k * Math.PI) / 3;
    marks.push([x - Math.cos(a) * r * 0.4, y - Math.sin(a) * r * 0.4, x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4]);
  }
  lines(marks, INK, 0.03);
}

/* The crane: a tower at the left of the site, its arm over all of it, and the
   trolley, rope and hook. Returns where the hook's tip is. */
function drawCrane(front) {
  const mast = 1.25;
  if (!front) {
    box(0.75, 0, 1, 0.3, 0.04, '#9A9488');
    const cross = [];
    for (let y = 0.3; y < 8.3; y += 0.8) cross.push([mast - 0.22, y, mast + 0.22, y + 0.8], [mast + 0.22, y, mast - 0.22, y + 0.8]);
    lines(cross, '#D99A2B', 0.05);
    lines([[mast - 0.22, 0.3, mast - 0.22, 8.6], [mast + 0.22, 0.3, mast + 0.22, 8.6]], INK, 0.11);
    lines([[mast - 0.22, 0.3, mast - 0.22, 8.6], [mast + 0.22, 0.3, mast + 0.22, 8.6]], GOLD, 0.07);
    // The arm, its back end with the weight, and the ties from the tower's tip.
    const arm = [];
    for (let x = -0.6; x < 15.2; x += 0.7) arm.push([x, JIB, x + 0.35, JIB + 0.36], [x + 0.35, JIB + 0.36, x + 0.7, JIB]);
    lines(arm, '#D99A2B', 0.05);
    lines([[-0.7, JIB, 15.4, JIB], [-0.7, JIB + 0.36, 15.3, JIB + 0.36]], INK, 0.11);
    lines([[-0.7, JIB, 15.4, JIB], [-0.7, JIB + 0.36, 15.3, JIB + 0.36]], GOLD, 0.07);
    lines([[mast, 9.7, 8.4, JIB + 0.36], [mast, 9.7, -0.5, JIB + 0.36], [mast - 0.22, 8.6, mast, 9.7], [mast + 0.22, 8.6, mast, 9.7]], INK, 0.05);
    box(-0.75, JIB - 0.5, 0.9, 0.5, 0.05, '#9A9488');
    // The cab, with its worker when the crane is at work.
    box(mast + 0.24, JIB - 0.86, 0.86, 0.8, 0.08, GOLD);
    box(mast + 0.36, JIB - 0.6, 0.62, 0.44, 0.05, '#BFE0F2');
    if (rig.manned) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(mast + 0.36, JIB - 0.6, 0.62, 0.44);
      ctx.clip();
      drawDriver(mast + 0.66, JIB - 0.72, 0.8);
      ctx.restore();
    }
    return null;
  }
  // The trolley, the rope, the block and the hook.
  const rope = JIB - 0.16 - (rig.y + 0.5);
  const hx = rig.x + Math.sin(rig.swing) * rope;
  const hy = rig.y;
  box(rig.x - 0.3, JIB - 0.18, 0.6, 0.2, 0.04, DARK);
  lines([[rig.x - 0.1, JIB - 0.16, hx - 0.06, hy + 0.5], [rig.x + 0.1, JIB - 0.16, hx + 0.06, hy + 0.5]], INK, 0.035);
  box(hx - 0.17, hy + 0.24, 0.34, 0.28, 0.05, GOLD);
  ctx.save();
  ctx.lineWidth = 0.09;
  ctx.beginPath();
  ctx.moveTo(hx, hy + 0.24);
  ctx.lineTo(hx, hy + 0.14);
  ctx.arc(hx, hy + 0.07, 0.085, Math.PI / 2, Math.PI * 2, true);
  ctx.stroke();
  ctx.restore();
  return [hx, hy];
}

function drawDozer(me) {
  ctx.save();
  ctx.translate(me.x, me.y);
  ctx.rotate(me.tilt);
  // The tracks.
  box(-1.35, 0, 2.7, 0.62, 0.3, DARK);
  for (const x of [-0.98, -0.33, 0.33, 0.98]) wheel(x, 0.31, 0.2, me.spin, '#5A5F66');
  const treads = [];
  for (let k = 0; k < 9; k++) {
    const x = -1.2 + ((k * 0.3 + (((me.spin * 0.33) % 0.3) + 0.3)) % 2.7) - 0.15;
    if (x > -1.05 && x < 1.05) treads.push([x, 0.01, x, 0.07], [x, 0.55, x, 0.61]);
  }
  lines(treads, '#8D949B', 0.05);
  // The body, the hood with its pipe, the cab and its worker.
  box(-1.2, 0.56, 2.3, 0.62, 0.08, GOLD);
  box(0.02, 1.1, 1.08, 0.42, 0.08, GOLD);
  box(0.62, 1.5, 0.13, 0.5, 0.03, DARK);
  lines([[0.2, 1.22, 0.2, 1.42], [0.36, 1.22, 0.36, 1.42], [0.52, 1.22, 0.52, 1.42]], 'rgba(74,52,36,.5)', 0.04);
  box(-1.12, 1.14, 1.1, 0.98, 0.1, GOLD);
  box(-1, 1.38, 0.84, 0.6, 0.06, '#BFE0F2');
  ctx.save();
  ctx.beginPath();
  ctx.rect(-1, 1.38, 0.84, 0.6);
  ctx.clip();
  drawDriver(-0.56, 1.3, 1);
  ctx.restore();
  box(-1.2, 2.08, 1.26, 0.1, 0.04, DARK);
  ctx.restore();
  // The arm reaches from the body to the blade, which keeps the level of this
  // pass however the body rides.
  const low = me.level();
  const x = me.x;
  const ax = x + 0.5 * Math.cos(me.tilt) - 0.66 * Math.sin(me.tilt);
  const ay = me.y + 0.5 * Math.sin(me.tilt) + 0.66 * Math.cos(me.tilt);
  shape([[ax, ay - 0.14], [x + 1.62, low + 0.28], [x + 1.62, low + 0.5], [ax, ay + 0.14]], '#D99A2B');
  ctx.beginPath();
  ctx.moveTo(x + 1.6, low);
  ctx.quadraticCurveTo(x + 1.98, low + 0.5, x + 1.74, low + 1.02);
  ctx.lineTo(x + 1.6, low + 1.02);
  ctx.quadraticCurveTo(x + 1.82, low + 0.5, x + 1.5, low);
  ctx.closePath();
  paint(STEEL, true);
  // The earth it pushes.
  if (me.load > 0.02) {
    const size = Math.min(1.1, 0.75 * Math.sqrt(me.load));
    ctx.beginPath();
    ctx.moveTo(x + 1.72, low);
    ctx.quadraticCurveTo(x + 1.86, low + size * 1.25, x + 1.95 + size * 0.5, low + size * 0.6);
    ctx.quadraticCurveTo(x + 2 + size * 1.1, low + size * 0.2, x + 2.1 + size * 1.5, low);
    ctx.closePath();
    paint(DIRT, true);
  }
}

/* The earth on the plot, and the heap at the far end. */
function drawEarth(me) {
  const { earth, E0, CELL } = me;
  ctx.beginPath();
  ctx.moveTo(E0, 0);
  for (let i = 0; i < earth.length; i++) ctx.lineTo(E0 + i * CELL, earth[i]);
  ctx.lineTo(E0 + earth.length * CELL, 0);
  ctx.closePath();
  paint(DIRT, true);
  if (me.heap > 0.02) {
    const tall = Math.min(1.9, 0.8 * Math.sqrt(me.heap));
    ctx.beginPath();
    ctx.moveTo(14.75, 0);
    ctx.quadraticCurveTo(15.3, tall * 1.5, 15.9, tall * 0.9);
    ctx.quadraticCurveTo(16.5, tall * 0.4, 16.9, 0);
    ctx.closePath();
    paint(DIRT, true);
  }
}

function drawPallet(x, y) {
  box(x, y, 1, 0.1, 0.01, WOOD);
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 3; i++) box(x + 0.04 + i * 0.31, y + 0.1 + j * 0.29, 0.3, 0.28, 0.02, STONE);
  }
}

function drawForklift(me) {
  ctx.save();
  ctx.translate(me.x, 0);
  // The mast: an inner rail that rises with the forks, inside the outer one.
  box(0.63, 0.12 + Math.max(0, me.h - 1.1), 0.08, 1.9, 0.02, STEEL);
  box(0.58, 0.1, 0.16, 2, 0.03, DARK);
  // The body, its weight at the back, the guard over the seat.
  box(-1.18, 0.28, 0.5, 0.74, 0.12, '#C9631F');
  box(-1.05, 0.3, 1.62, 0.76, 0.14, '#EE8A3A');
  lines([[-0.8, 1.04, -0.9, 2], [0.36, 1.04, 0.46, 2]], INK, 0.12);
  lines([[-0.8, 1.04, -0.9, 2], [0.36, 1.04, 0.46, 2]], DARK, 0.07);
  box(-1, 1.96, 1.56, 0.11, 0.04, DARK);
  box(-0.66, 1.02, 0.14, 0.52, 0.05, DARK);
  drawDriver(-0.3, 1.06, 1.05);
  lines([[0.08, 1.06, 0.02, 1.4]], INK, 0.06);
  disc(0, 1.42, 0.09, DARK);
  wheel(-0.72, 0.3, 0.3, me.spin);
  wheel(0.28, 0.34, 0.34, me.spin);
  // The carriage and the forks: the load sits on them at h.
  box(0.74, me.h - 0.09, 0.1, 0.9, 0.02, DARK);
  box(0.74, me.h - 0.09, 0.98, 0.09, 0.02, '#5A5F66');
  ctx.restore();
  if (me.carry) drawPallet(me.x + 0.78, me.h);
}

/* The hand tools, drawn from their working tip, in the bench's own lengths (y down). */
function drawHammer(x, y, swing) {
  ctx.save();
  ctx.translate(x + 15, y - 22);
  ctx.rotate(swing * 0.6);
  ctx.translate(-15, 22);
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(1, -6);
  ctx.lineTo(16, -24);
  ctx.lineWidth = 4.6;
  ctx.stroke();
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = INK;
  ctx.save();
  ctx.translate(0, -5);
  ctx.rotate(-0.7);
  rounded(-4, -5.5, 8, 10.5, 1.2);
  paint(STEEL, true);
  rounded(-4.8, 3.6, 9.6, 2.6, 0.8);
  paint('#6E747B', true);
  ctx.restore();
  ctx.restore();
}

function drawScrewdriver(x, y, turn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = INK;
  rounded(-1, -13, 2, 13, 0.5);
  paint(STEEL, true);
  rounded(-4, -29, 8, 17, 3);
  paint('#D4533A', true);
  ctx.strokeStyle = 'rgba(74,52,36,.5)';
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const at = -4 + ((k * 2.7 + turn * 14) % 8);
    ctx.moveTo(at, -26.5);
    ctx.lineTo(at, -14.5);
  }
  ctx.stroke();
  ctx.restore();
}

function drawDrill(x, y, shake) {
  ctx.save();
  ctx.translate(x + shake, y);
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = INK;
  rounded(0, -0.8, 8, 1.6, 0.5);
  paint(STEEL, true);
  rounded(7.5, -2.8, 5, 5.6, 1);
  paint(DARK, true);
  rounded(20, 2, 7.5, 15, 2);
  paint('#23867A', true);
  rounded(12, -5.5, 17, 11, 3);
  paint(TEAL, true);
  rounded(18.5, 16, 11, 5.5, 1.5);
  paint(DARK, true);
  rounded(17.6, 5.4, 2.6, 4, 1);
  paint('#D4533A', true);
  ctx.restore();
}

/* The door, close up, with the tray of tools under it. */
function drawBench(me) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const seen = me.end > 1.5 ? clamp(1 - (me.end - 1.5) / 0.6, 0, 1) : me.fade;
  if (seen <= 0) return;
  ctx.globalAlpha = seen;
  ctx.fillStyle = 'rgba(254,249,239,.9)';
  ctx.fillRect(0, 0, width, height);
  ctx.setTransform(dpr * me.k, 0, 0, dpr * me.k, dpr * me.ox, dpr * me.oy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  // The door: planks under an arch, a batten across, two hinges and a lock plate.
  ctx.beginPath();
  ctx.moveTo(22, 92);
  ctx.lineTo(22, 34);
  ctx.arc(50, 34, 28, Math.PI, 0);
  ctx.lineTo(78, 92);
  ctx.closePath();
  paint('#B9824A', true);
  ctx.save();
  ctx.strokeStyle = 'rgba(74,52,36,.35)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (const [x, top] of [[36, 9.8], [50, 6], [64, 9.8]]) {
    ctx.moveTo(x, top);
    ctx.lineTo(x, 92);
  }
  ctx.stroke();
  ctx.restore();
  rounded(23, 51, 54, 10, 1);
  paint('#9A6A3C', true);
  for (const [x, y, w, h] of [[22, 26, 18, 8], [22, 74, 18, 8], [61, 66, 14, 12]]) {
    rounded(x, y, w, h, 1.5);
    paint('#6E747B', true);
  }
  const drilled = me.spots.filter((spot) => spot.kind === 'drill').every((spot) => spot.p >= 1);
  // Each place: a nail, a screw, or a mark to drill.
  for (const spot of me.spots) {
    const x = spot.x + (spot.shake > 0 ? Math.sin(spot.shake * 60) * 0.8 : 0);
    const out = 1 - spot.p; // how far it still stands out
    const calling = spot.p < 1 && (!me.held || me.held === spot.kind);
    if (calling) {
      ctx.save();
      ctx.strokeStyle = `rgba(242,184,75,${(0.55 + 0.35 * Math.sin(me.t * 5)).toFixed(2)})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(x, spot.y, 5.4 + Math.sin(me.t * 5) * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (spot.kind === 'drill') {
      if (spot.p <= 0) {
        ctx.save();
        ctx.strokeStyle = '#4A3424';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(x - 1.6, spot.y - 1.6);
        ctx.lineTo(x + 1.6, spot.y + 1.6);
        ctx.moveTo(x + 1.6, spot.y - 1.6);
        ctx.lineTo(x - 1.6, spot.y + 1.6);
        ctx.stroke();
        ctx.restore();
      } else if (!drilled) {
        ctx.fillStyle = '#2B1F16';
        ctx.beginPath();
        ctx.arc(x, spot.y, 0.6 + 1.4 * spot.p, 0, Math.PI * 2);
        ctx.fill();
      }
      continue;
    }
    ctx.fillStyle = 'rgba(43,31,22,.3)';
    ctx.beginPath();
    ctx.arc(x + out * 1.4, spot.y + out * 1.4, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, spot.y, 2.2 + out * 0.5, 0, Math.PI * 2);
    paint(spot.p >= 1 ? '#8D949B' : '#C8CDD2', true);
    if (spot.kind === 'screwdriver') {
      const a = spot.p * Math.PI * 4;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * 1.5, spot.y - Math.sin(a) * 1.5);
      ctx.lineTo(x + Math.cos(a) * 1.5, spot.y + Math.sin(a) * 1.5);
      ctx.stroke();
    }
  }
  // Both holes made: the handle is bolted on.
  if (drilled) {
    rounded(64.6, 34, 4.8, 15, 2.2);
    paint(GOLD, true);
    for (const y of [37, 46]) {
      ctx.beginPath();
      ctx.arc(67, y, 1.1, 0, Math.PI * 2);
      paint('#C98A45', true);
    }
  }
  // The tray, and each tool: at rest in it, or in the hand.
  rounded(5, 97, 90, 29.5, 5);
  paint('#D9C7A6', true);
  const tip = me.tip();
  for (const name of Object.keys(TOOLS)) {
    const held = me.held === name;
    const [x, y] = held ? tip : TOOLS[name].tip;
    const busy = held && me.on;
    if (name === 'hammer') drawHammer(x, y, held ? (busy ? 1 - me.swing : 0.5) : 0);
    else if (name === 'screwdriver') drawScrewdriver(x, y, busy ? me.t : 0);
    else drawDrill(x, y, busy ? Math.sin(me.t * 70) * 0.35 : 0);
    if (busy && name === 'drill' && Math.random() < 0.5) {
      ctx.fillStyle = '#C9A77A';
      ctx.beginPath();
      ctx.arc(x - 1 - Math.random() * 3, y + (Math.random() - 0.5) * 4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function draw() {
  drawSky();
  onSite();
  drawBackdrop();
  drawCrane(false);
  drawMasjid();
  const name = stage ? stage.name : '';
  if (name === 'dozer') {
    drawEarth(stage);
    drawDozer(stage);
  } else if (name === 'fork') {
    if (stage.pallet !== 'none') {
      ctx.save();
      ctx.globalAlpha = stage.drop;
      drawPallet(SPOT, (1 - stage.drop) * 1.2);
      ctx.restore();
    }
    if (stage.carry) drawGhost('pallet', HALL.x0 + 0.02, made.rows, stage.x + 1.7 >= HALL.x0 + 0.03 && stage.h - made.rows < 0.4);
    drawForklift(stage);
  }
  // The crane's load: waiting on the ground, or hanging from the hook.
  const hook = drawCrane(true);
  if (name === 'crane') {
    const piece = PIECES[stage.part];
    if (piece && stage.mode === 'work') {
      if (stage.carry) {
        drawGhost(piece.kind, piece.x, piece.y, Math.abs(rig.x - piece.x) < 0.4);
        ctx.save();
        ctx.translate(hook[0], hook[1]);
        ctx.rotate(-rig.swing * 0.6);
        drawPiece(piece.kind, 0, -piece.h);
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = stage.drop;
        drawPiece(piece.kind, stage.spotX, (1 - stage.drop) * 1.2);
        ctx.restore();
      }
    }
  }
  for (const bit of bits) {
    ctx.globalAlpha = 1 - bit.age / bit.life;
    disc(bit.x, bit.y, bit.r, bit.color, false);
  }
  ctx.globalAlpha = 1;
  if (name === 'tools') drawBench(stage);
}

function frame(now) {
  if (!running) return;
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  update(dt);
  draw();
  if (running) raf = requestAnimationFrame(frame);
}

function go() {
  running = true;
  last = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
}

/* The hand tools are dragged over the whole view. */
siteView.addEventListener('pointerdown', (event) => {
  if (stage && stage.down && !event.target.closest('[data-ctl]')) stage.down(event);
});
siteView.addEventListener('pointermove', (event) => {
  if (stage && stage.move) stage.move(event);
});
for (const type of ['pointerup', 'pointercancel']) {
  siteView.addEventListener(type, (event) => {
    if (stage && stage.up) stage.up(event);
  });
}

/* The site opens on what is already built. */
function startSite() {
  run += 1;
  made.ground = saved >= 1;
  made.rows = saved >= 2 ? 3 : 0;
  made.door = saved >= 3;
  made.shaft = made.top = made.dome = false;
  grow.ground = made.ground ? 1 : 0;
  grow.rows = [0, 1, 2].map((r) => (r < made.rows ? 1 : 0));
  grow.trim = made.rows === 3 ? 1 : 0;
  grow.door = made.door ? 1 : 0;
  Object.assign(rig, { x: 5.2, y: 6.4, swing: 0, swung: 0, manned: false });
  bits = [];
  finale = 0;
  clock = 0;
  layout();
  show('site');
  paintSteps();
  begin(saved);
  follow(0);
  beep('ambience', 'site');
  go();
}

/* The safety gear. Each piece is dragged from its peg onto the boy; let go
   near where it is worn and it goes on. Anywhere else it slides back. */
const GEAR = {
  helmet: { home: [75, 84], worn: [250, 84], ring: [250, 92] },
  vest: { home: [75, 186], worn: [250, 214], ring: [250, 214] },
  gloves: { home: [75, 288], worn: [250, 248], ring: [250, 248] },
};
const gear = { on: new Set(), timers: {}, said: false };

function placeGear(name, x, y) {
  document.querySelector(`[data-gear="${name}"]`).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
}

function spreadGloves(apart) {
  $('glove-a').setAttribute('transform', `translate(${-apart} 0)`);
  $('glove-b').setAttribute('transform', `translate(${apart} 0)`);
}

function wear(name) {
  if (gear.on.has(name)) return;
  gear.on.add(name);
  clearInterval(gear.timers[name]);
  placeGear(name, ...GEAR[name].worn);
  if (name === 'gloves') spreadGloves(58);
  document.querySelector(`[data-gear="${name}"]`).classList.add('worn');
  $('gear-glow').hidden = true;
  beep('click');
  if (gear.on.size === 3) {
    const mine = run;
    setTimeout(() => {
      if (mine === run && view === 'gear') startSite();
    }, 900);
  }
}

function gearPoint(event) {
  const boxed = $('gear').getBoundingClientRect();
  return [((event.clientX - boxed.left) / boxed.width) * 400, ((event.clientY - boxed.top) / boxed.height) * 400];
}

for (const item of document.querySelectorAll('.gear-item')) {
  const name = item.dataset.gear;
  const spec = GEAR[name];
  let id = null;
  let at = spec.home;
  let near = false;
  item.addEventListener('pointerdown', (event) => {
    if (gear.on.has(name) || id !== null) return;
    clearInterval(gear.timers[name]);
    id = event.pointerId;
    item.parentNode.append(item); // on top while it is carried
    try {
      item.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone.
    }
    event.preventDefault();
  });
  item.addEventListener('pointermove', (event) => {
    if (event.pointerId !== id) return;
    const [x, y] = gearPoint(event);
    at = [clamp(x, 30, 370), clamp(y, 30, 370)];
    placeGear(name, ...at);
    near = Math.hypot(at[0] - spec.worn[0], at[1] - spec.worn[1]) < 64;
    const glow = $('gear-glow');
    glow.hidden = !near;
    glow.setAttribute('cx', spec.ring[0]);
    glow.setAttribute('cy', spec.ring[1]);
  });
  for (const type of ['pointerup', 'pointercancel']) {
    item.addEventListener(type, (event) => {
      if (event.pointerId !== id) return;
      id = null;
      if (near && type === 'pointerup') {
        wear(name);
        return;
      }
      $('gear-glow').hidden = true;
      // Back to its peg.
      const from = at;
      let step = 0;
      gear.timers[name] = setInterval(() => {
        step += 1;
        const part = 1 - (1 - step / 12) ** 2;
        at = [from[0] + (spec.home[0] - from[0]) * part, from[1] + (spec.home[1] - from[1]) * part];
        placeGear(name, ...at);
        if (step >= 12) clearInterval(gear.timers[name]);
      }, 16);
    });
  }
}
$('gear').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  const next = Object.keys(GEAR).find((name) => !gear.on.has(name));
  if (next) wear(next);
});

function showGear() {
  run += 1;
  running = false;
  cancelAnimationFrame(raf);
  sound.stop();
  beep('ambience', null);
  beep('engineOff');
  beep('drill', 0);
  stage = null;
  gear.on.clear();
  for (const name of Object.keys(GEAR)) {
    clearInterval(gear.timers[name]);
    placeGear(name, ...GEAR[name].home);
    document.querySelector(`[data-gear="${name}"]`).classList.remove('worn');
  }
  spreadGloves(20);
  $('gear-glow').hidden = true;
  $('word').hidden = true;
  show('gear');
  // A page may not speak before its first touch: then the prompt is said at that touch.
  gear.said = Boolean(navigator.userActivation && navigator.userActivation.hasBeenActive);
  sound.say('gear');
}
$('gear').addEventListener('pointerdown', () => {
  if (gear.said) return;
  gear.said = true;
  sound.say('gear');
}, true);

$('again').addEventListener('click', showGear);

/* A new masjid, from the ☰ menu: the one being built is cleared away. */
const menu = document.querySelector('.menu');
if (menu) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'menu-item';
  button.textContent = 'مَسْجِدٌ جَدِيدٌ';
  button.addEventListener('click', () => {
    saved = 0;
    save();
    menu.hidden = true;
    showGear();
  });
  const rule = document.createElement('hr');
  rule.className = 'menu-rule';
  menu.append(rule, button);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    running = false;
    letGo();
  } else if (view === 'site' || view === 'done') {
    go();
    if (view === 'site') beep('ambience', 'site');
  }
});
addEventListener('resize', () => {
  layout();
  if (view !== 'gear') {
    follow(0);
    draw();
  }
});

/* Start */
load();
shown = stars;
showCount();
layout();
showGear();
sound.preloadPrompts(['gear', ...Object.values(WORDS).map((entry) => entry.clip)]);
sound.preload(['allahu-akbar', 'adhan-1.mp3']);
if (LOCAL) {
  window.buildGame = {
    get stage() { return stage; },
    get saved() { return saved; },
    set saved(value) { saved = value; },
    made, grow, rig, ctl, update, draw, startSite, wear, begin,
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
