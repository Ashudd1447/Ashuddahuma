/* بِنَاءُ الْمَسْجِدِ: the building game. After بِسْمِ اللَّهِ the child puts
   on his safety gear (gear.js: a helmet, a vest and two gloves, the right one
   first, each dragged onto the boy), then builds a masjid on a building site,
   seen from the side, one machine after another:
   1. the bulldozer digs the foundation's pit in three passes, each a layer
      deeper, and pushes the earth out onto a heap;
   2. the foundation is laid as it really is: two workers lay the steel mesh
      in the pit; a concrete pump parks at the pit's end and unfolds its arm
      over it; the mixer backs up to the pump's hopper and empties into it;
      the child moves the hose along the pit and pours, and the concrete
      stands in heaps; a long board is drawn over the top to strike it level,
      a float smooths it, and it sets; then the earth is pushed back in
      front of it, and the ground is whole again;
   3. a truck brings three pallets of stone and its arm sets them down one
      at a time; the forklift carries them to the wall, each lifted a course
      higher than the last;
   4. the hand tools fix the door, which lies on two sawhorses: the hammer
      drives the nails, the screwdriver the screws, the drill makes the holes
      for the handle;
   5. the truck brings the minaret's shaft, its top, and last the dome, one
      at a time, and the crane lifts each from its bed to its place.
   Then the masjid is done: اللَّهُ أَكْبَرُ shows and is said, and the first
   words of the adhan sound. Each stage starts from what the one before it
   built, and the masjid is kept on the device between visits.
   Two buttons on the left drive (or move the crane's trolley, the pump's
   hose, the board), two on the right raise and lower (the one button of the
   foundation pours). Nothing is ever lost: a load that is too low just stops
   at the wall, a part of the pit that has its concrete takes no more, and
   the button that helps breathes.
   The site is drawn on a canvas in its own lengths: x to the right from 0
   to 16, y up from the ground. The pit is seen in section, below the ground
   line, through a cut in the ground that is closed once the foundation has
   set. */
const $ = (id) => document.getElementById(id);

const KEY = 'build';
const SAVE = 2; // how the stages are counted in what is kept: with the mixer among them
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
  mixer: { text: 'خَلَّاطَةُ الْخَرَسَانَةِ', clip: 'mixer' },
  pump: { text: 'مِضَخَّةُ الْخَرَسَانَةِ', clip: 'pump' },
  truck: { text: 'الشَّاحِنَةُ', clip: 'truck' },
  fork: { text: 'الرَّافِعَةُ الشَّوْكِيَّةُ', clip: 'forklift' },
  crane: { text: 'الرَّافِعَةُ', clip: 'crane' },
  hammer: { text: 'الْمِطْرَقَةُ', clip: 'tool-hammer' },
  screwdriver: { text: 'الْمِفَكُّ', clip: 'tool-screwdriver' },
  drill: { text: 'الْمِثْقَابُ', clip: 'tool-drill' },
  steel: { text: 'حَدِيدُ التَّسْلِيحِ', clip: 'part-steel' },
  ground: { text: 'الْأَسَاسُ', clip: 'part-foundation' },
  walls: { text: 'الْجُدْرَانُ', clip: 'part-walls' },
  door: { text: 'الْبَابُ', clip: 'part-door' },
  minaret: { text: 'الْمِئْذَنَةُ', clip: 'part-minaret' },
  dome: { text: 'الْقُبَّةُ', clip: 'part-dome' },
};
const STAGES = ['dozer', 'mixer', 'fork', 'tools', 'crane'];

/* The site. */
const W = 16;
const HALL = { x0: 7.2, x1: 12.2, top: 3.16 };
const DOOR = { x: 9.7, half: 0.5, rise: 1.45 };
/* The minaret stands against the hall's end wall: the near face of its shaft
   is that wall's face, and its foot, as tall as one course of the wall, wraps
   the corner, so the joints run on from the wall into it. */
const MINARET = { x: HALL.x1 + 0.45, half: 0.6, base: 1 };
const SPOT = 4.3; // where the truck's arm sets a pallet down for the forklift
const JIB = 8.5; // how high the crane's arm is
const PIECES = [
  { kind: 'shaft', w: 0.9, h: 3, x: MINARET.x, y: MINARET.base },
  { kind: 'top', w: 1.4, h: 2.4, x: MINARET.x, y: MINARET.base + 3 },
  { kind: 'dome', w: 2.5, h: 2.3, x: (HALL.x0 + HALL.x1) / 2, y: HALL.top },
];

/* The foundation's pit, seen in section, under the hall and the minaret. The
   bulldozer digs it a layer at a time, with a ramp at each end; steel and
   concrete fill it. `in` and `out` are how long each ramp is for each length
   of its depth: the way in is gentle, so the bulldozer rides down it nose
   first with its blade just below its tracks; on the short way out the blade
   lifts the earth up ahead of it. */
const PIT = { x0: 6.9, x1: 13.6, deep: 0.6, in: 3, out: 1.5, cell: 0.1 };
const CELLS = Math.round((PIT.x1 - PIT.x0) / PIT.cell) + 1;
const pitAt = (x, deep) => Math.max(0, Math.min(deep, (x - PIT.x0) / PIT.in, (PIT.x1 - x) / PIT.out));
const FLOOR = PIT.x1 - PIT.x0 - PIT.deep * (PIT.in + PIT.out); // the pit's floor, between the ramps
const SIDES = (PIT.in + PIT.out) / 2;
const FULL = (FLOOR + PIT.deep * SIDES) * PIT.deep; // how much earth came out of the pit
const HEAP = PIT.x1 + 0.25; // where the foot of the spoil heap is
const REACH = 1.75; // from the bulldozer's middle to its blade's cutting edge
/* The cut in the ground that shows the pit is open to the left of site.cut:
   all of it until the foundation has set, none of it once the earth is back. */
const OPEN = W + 9;
const SHUT = PIT.x0 - 1;
/* The steel mesh: two panels end to end on the pit's floor, and where their
   stack waits by the fence. */
const MESH = { from: PIT.x0 + 0.15, long: (PIT.x1 - PIT.x0 - 0.4) / 2, stack: 3.6 };
/* The concrete pump: where it parks (its middle), the foot of its boom and
   its hopper (from its middle), the boom's three sections and the turn of
   each on the one before while it lies folded, how far along the pit its
   hose goes, and how fast the concrete comes. */
const PUMP = { at: 4.8, foot: [0.55, 2], hopper: -2.15, arm: [3, 2.9, 2.5], fold: [Math.PI - 0.02, 0.09 - Math.PI, Math.PI - 0.1], from: PIT.x0 + 0.6, to: PIT.x1 - 0.6, rate: 0.3 };
/* The mixer truck: where it stops, its chute over the pump's hopper; how far
   it comes by itself; its rear wheel and the chute's hinge (from its middle). */
const MIX = { stop: PUMP.at + PUMP.hopper - 2.95, in: -3.4, wheel: 1.58, hinge: [2.16, 1.46] };
/* Fresh concrete lies in heaps, one to each part of the pit: how high a
   heap's top stands over the ground line, and how low the dips between two
   heaps lie under it. The board then strikes the tops off into the dips. */
const HEAPS = { high: 0.16, low: -0.1 };
/* The delivery truck: where it parks (the foot of its loading arm), how high
   its wheels stand (0: on the ground line, as the forklift's do; drawn before
   the forklift, it stands behind it), and the arm's two sections. */
const TRUCK = { at: 5.4, lane: 0, arm: [1.8, 1.7] };

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
/* How the ground stands: how deep the pit is dug along its length, the earth
   on the spoil heap and how much of it shows yet, how many panels of steel
   lie in the pit, how thick the concrete lies along it, how far along the
   pit it has been smoothed, how far it has set, and how far the cut that
   shows all this is still open. */
const site = { dug: new Float32Array(CELLS), spoil: 0, heap: 0, mesh: 0, mud: new Float32Array(CELLS), flat: PIT.x0, set: 0, cut: OPEN };
const dugAt = (x) => {
  const at = (x - PIT.x0) / PIT.cell;
  if (at <= 0 || at >= CELLS - 1) return 0;
  const i = Math.floor(at);
  return site.dug[i] + (site.dug[i + 1] - site.dug[i]) * (at - i);
};
/* The concrete's top at a place along the pit, from the ground line; and how
   much of a heap that place can hold: none at the pit's two lips. */
const topAt = (i) => site.mud[i] - site.dug[i];
const lip = (i) => clamp(Math.min(i, CELLS - 1 - i) / 3, 0, 1);
/* Workers on foot who have done their part: each walks on until he is out of sight. */
let crew = [];
/* The two workers who lay the steel and strike the concrete level. They
   stand by their steel from the start, and leave when the board has passed.
   What waits by the fence for them: the panels of mesh and the long board. */
let gang = [];
const yard = { mesh: 0, board: false };
/* The bulldozer when it comes back to push the earth in front of the foundation. */
let tidy = null;
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
    localStorage.setItem(KEY, JSON.stringify({ v: SAVE, stars, stage: saved }));
  } catch {
    // Private browsing: they last for this visit only.
  }
}

function load() {
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (kept && Number.isInteger(kept.stars) && kept.stars >= 0) stars = kept.stars;
    // What is kept without a version counts its stages without the mixer:
    // every stage after the bulldozer's is one further on.
    const at = kept && Number.isInteger(kept.stage) ? kept.stage + (kept.v === SAVE || kept.stage < 1 ? 0 : 1) : 0;
    if (at > 0 && at < STAGES.length) saved = at;
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

/* A text that a recording says: the Fusha, or the Egyptian text when the
   Egyptian recording is the one said (sound.caption; the father's rule,
   2026-11-26). An older saved copy of sound.js may lack it: then the text
   simply shows. */
const caption = (el, text, clip, how) => (typeof sound.caption === 'function'
  ? sound.caption(el, text, clip, how)
  : Promise.resolve((el.textContent = text, false)));

/* A word at the top of the site, shown and said. */
let wordTimer = 0;
function word(name, quiet = false) {
  const entry = WORDS[name];
  const pill = $('word');
  caption(pill, entry.text, entry.clip);
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
  const under = PIT.deep + 0.1; // the pit's depth shows above the buttons
  s = Math.min((height - band) / (10 + under), width / 9);
  groundY = height - band - under * s;
  wide = width / s;
  if (wide >= W + 1.6) camX = -(wide - W) / 2;
  if (stage && stage.fit) stage.fit();
}

/* A narrow screen shows part of the site and follows the work; a wide one
   shows all of it. A stage whose trucks stand in a line before the site asks
   for room to its left, and the view moves over to take them in. */
function follow(dt) {
  const lo = -0.8 - (stage && stage.room ? stage.room() : 0);
  const hi = W + 0.8 - wide;
  const want = hi <= lo ? (lo + hi) / 2 : clamp((stage && stage.focus ? stage.focus() : W / 2) - wide / 2, lo, hi);
  camX += (want - camX) * (dt ? 1 - Math.exp(-dt / 0.4) : 1);
}

/* Dust, chips and sparks: small things thrown up that fall back. */
function spray(x, y, count, color, spread = 1, up = 1.6) {
  for (let i = 0; i < count; i++) {
    bits.push({ x, y, floor: Math.min(0, y - 0.4), vx: (Math.random() - 0.5) * 2 * spread, vy: (0.3 + Math.random() * 0.7) * up, age: 0, life: 0.45 + Math.random() * 0.4, r: 0.035 + Math.random() * 0.05, color });
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

/* Stage 1, the bulldozer digs the foundation's pit in three passes, its blade
   a layer deeper each time. On a pass the blade is down: it cuts the earth,
   which gathers in front of it and is pushed up the far ramp and out onto
   the spoil heap. Backing up for the next pass, and coming and going, the
   blade is carried up, clear of the ground. */
function dozerStage() {
  const START = 2.2;
  const END = HEAP - REACH;
  const me = { name: 'dozer', x: -2.8, v: 0, y: 0, tilt: 0, pass: 0, back: false, load: 0, lift: 1, cut: Infinity, mode: 'in', spin: 0, wait: 0, done: false };
  me.deep = () => ((Math.min(me.pass, 2) + 1) * PIT.deep) / 3;
  me.focus = () => me.x + 1.5;
  /* The blade's cutting edge: at this pass's depth when it is down, carried
     ahead of the tracks when it is up, and between the two on the way. */
  me.edge = () => {
    const x = me.x + REACH * Math.cos(me.tilt);
    const up = me.y + REACH * Math.sin(me.tilt) + 0.45 * Math.cos(me.tilt);
    const down = -pitAt(x, me.deep());
    return [x, down + (up - down) * me.lift * me.lift * (3 - 2 * me.lift)];
  };
  me.update = (dt) => {
    let want = 0;
    if (me.mode === 'in') {
      want = 2.2;
      if (me.x >= START) me.mode = 'work';
    } else if (me.mode === 'work') {
      want = ctl.right ? 2.2 : ctl.left ? -2.6 : 0;
    } else if (me.mode === 'dug') {
      me.wait += dt;
      if (me.wait > 0.8) me.mode = 'out';
    } else {
      // It leaves the way it came, backing through the pit.
      want = -2.8;
      if (me.x + 2.6 < camX) me.done = true;
    }
    me.v += clamp(want - me.v, -7 * dt, 7 * dt);
    // Where the blade's edge was: as it stood when it last cut, so that no
    // strip of earth is skipped when the machine tips over a ramp's edge.
    const before = Math.min(me.edge()[0], me.cut);
    me.x += me.v * dt;
    if (me.mode === 'work' && (me.x < START || me.x > END)) {
      me.x = clamp(me.x, START, END);
      me.v = 0;
    }
    me.spin += me.v * dt * 3;
    const pushing = me.mode === 'work' && !me.back;
    me.lift = clamp(me.lift + (pushing ? -dt : dt) / 0.45, 0, 1);
    const edge = me.edge()[0];
    me.cut = edge;
    if (pushing && edge > before) {
      // The blade cuts down to this pass's layer, and the earth gathers before it.
      const deep = me.deep();
      const from = Math.max(0, Math.ceil((before - PIT.x0) / PIT.cell));
      const to = Math.min(CELLS - 1, Math.floor((edge - PIT.x0) / PIT.cell));
      for (let i = from; i <= to; i++) {
        const goal = pitAt(PIT.x0 + i * PIT.cell, deep);
        if (site.dug[i] >= goal) continue;
        me.load += (goal - site.dug[i]) * PIT.cell;
        site.dug[i] = goal;
        if (Math.random() < 0.3) spray(edge + 0.2, 0.3 - goal, 1, DIRT, 0.6, 1.2);
      }
      // Coming up out of the pit, the earth spills onto the heap.
      if (before > HEAP - 1 && me.load > 0) {
        const tipped = Math.min(me.load, (me.load * (edge - before)) / Math.max(0.02, HEAP - before));
        me.load -= tipped;
        site.spoil += tipped;
      }
    }
    // At the heap the pass is done.
    if (pushing && me.x >= END - 0.005) {
      site.spoil += me.load;
      me.load = 0;
      spray(HEAP + 0.5, 0.5, 10, DIRT, 1.2, 2);
      beep('thud');
      award(1, HEAP + 0.3, 1.5);
      if (me.pass >= 2) {
        me.mode = 'dug';
        site.spoil = FULL;
        sound.chime();
        advance();
      } else {
        me.back = true;
      }
    }
    // Back at the start, the blade comes down for the next layer.
    if (me.mode === 'work' && me.back && me.x <= START + 0.5) {
      me.back = false;
      me.pass += 1;
      beep('click');
    }
    // It rides on the ground as it is dug, down into the pit and up out of it.
    const front = (dugAt(me.x + 0.5) + dugAt(me.x + 0.9) + dugAt(me.x + 1.3)) / 3;
    const rear = (dugAt(me.x - 0.5) + dugAt(me.x - 0.9) + dugAt(me.x - 1.3)) / 3;
    me.y += (-(front + rear) / 2 - me.y) * (1 - Math.exp(-dt / 0.1));
    me.tilt += (clamp(Math.atan2(rear - front, 1.8), -0.36, 0.36) - me.tilt) * (1 - Math.exp(-dt / 0.1));
    motor(me.v, me.v < -0.4 && me.mode !== 'in');
    hint(me.mode !== 'work' ? '' : me.back ? 'left' : 'right');
  };
  return me;
}

/* The crew of two by their steel, with the board against the fence: how a
   visit that has not laid the foundation yet finds them. */
function muster(there) {
  yard.mesh = there ? 2 : 0;
  yard.board = there;
  gang = there ? [MESH.stack + MESH.long + 0.2, MESH.stack - 0.2].map((x) => ({ x, y: 0, face: 1, step: 0, hold: '', v: 0 })) : [];
}

/* A worker on foot goes toward a place; true once he is there. */
function walk(man, to, speed, dt) {
  const d = clamp(to - man.x, -speed * dt, speed * dt);
  man.x += d;
  man.step += Math.abs(d) * 5;
  if (d) man.face = Math.sign(d);
  return Math.abs(to - man.x) < 0.002;
}

/* The pit is poured in parts, one heap to each: the cells of a part, its
   middle, and the part under a place. */
const PARTS = 5;
const SPAN = Math.floor((CELLS - 2) / PARTS);
const cellsOf = (k) => [1 + k * SPAN, k === PARTS - 1 ? CELLS - 2 : (k + 1) * SPAN];
const middleOf = (k) => PIT.x0 + ((cellsOf(k)[0] + cellsOf(k)[1]) / 2) * PIT.cell;
const partAt = (x) => clamp(Math.floor(((x - PIT.x0) / PIT.cell - 0.5) / SPAN), 0, PARTS - 1);

/* How high a part's heap stands at a place when the part has all its
   concrete: a mound, highest over the part's middle. */
function heapAt(i) {
  const [first, last] = cellsOf(Math.min(PARTS - 1, Math.floor((i - 1) / SPAN)));
  return lip(i) * (HEAPS.low + (HEAPS.high - HEAPS.low) * Math.sin((Math.PI * (i - first + 0.5)) / (last - first + 1)));
}

/* Whether a part has its concrete: its heap stands whole, a little above
   the ground line. */
function heaped(k) {
  const [first, last] = cellsOf(k);
  let room = 0;
  for (let i = first; i <= last; i++) room += Math.max(0, heapAt(i) - topAt(i));
  return room * PIT.cell < 0.012;
}

/* Concrete from the hose lands around x, in the part of the pit the hose is
   over, and heaps up there as high as a heap may stand; what a full place
   cannot take goes to the places beside it. */
function place(x, amount) {
  const at = (x - PIT.x0) / PIT.cell;
  const [first, last] = cellsOf(partAt(x));
  let left = amount / PIT.cell;
  for (let pass = 0; pass < 3 && left > 1e-6; pass++) {
    const shares = [];
    let sum = 0;
    for (let i = first; i <= last; i++) {
      if (topAt(i) >= heapAt(i)) continue;
      const share = Math.exp(-(((i - at) / 3) ** 2));
      shares.push([i, share]);
      sum += share;
    }
    const given = left;
    for (const [i, share] of shares) {
      const more = Math.min(heapAt(i) - topAt(i), (given * share) / sum);
      site.mud[i] += more;
      left -= more;
    }
    if (!shares.length) break;
  }
}

/* Fresh concrete is thick: it stands in a heap, and only what is steeper
   than a heap can hold slides down its side. */
function slump() {
  const most = 0.7 * PIT.cell;
  const settle = (i, j) => {
    const fall = topAt(i) - topAt(j);
    if (fall <= most) return;
    const moved = Math.min(site.mud[i], (fall - most) / 4);
    site.mud[i] -= moved;
    site.mud[j] += moved;
  };
  for (let i = 1; i < CELLS - 2; i++) {
    settle(i, i + 1);
    settle(i + 1, i);
  }
  for (let i = CELLS - 3; i >= 1; i--) {
    settle(i, i + 1);
    settle(i + 1, i);
  }
}

/* The pump's boom: its foot, its two joints and its tip. Folded, the three
   sections lie on one another over the truck. Out, the last one comes down
   to hold the hose over x, steeply near the truck and flatter far from it,
   and the first two bend to carry it there. `pump.arm` goes from 0, folded,
   to 1, out, and the sections open one after another. */
function boomAt(pump, x) {
  const [a, b, c] = PUMP.arm;
  const px = PUMP.at + PUMP.foot[0];
  const py = PUMP.foot[1];
  const dip = -1.4 + 1.05 * clamp((x - PUMP.from) / (PUMP.to - PUMP.from), 0, 1);
  const wx = x - 0.05 - c * Math.cos(dip);
  const wy = 1.65 - c * Math.sin(dip);
  const far = clamp(Math.hypot(wx - px, wy - py), Math.abs(a - b) + 0.05, a + b - 0.02);
  const first = Math.atan2(wy - py, wx - px) + Math.acos((a * a + far * far - b * b) / (2 * a * far));
  const second = Math.atan2(wy - py - a * Math.sin(first), wx - px - a * Math.cos(first));
  const points = [[pump.x + PUMP.foot[0], py]];
  let turn = 0;
  [first, second - first, dip - second].forEach((angle, i) => {
    const u = clamp((pump.arm - i * 0.25) / 0.5, 0, 1);
    turn += PUMP.fold[i] + (angle - PUMP.fold[i]) * u * u * (3 - 2 * u);
    const [x0, y0] = points[i];
    points.push([x0 + PUMP.arm[i] * Math.cos(turn), y0 + PUMP.arm[i] * Math.sin(turn)]);
  });
  return points;
}

/* Stage 2, the foundation, laid the way it really is, one job after another:
   - the two workers carry the steel mesh into the pit, a panel at a time, and
     lay it on its blocks; then one takes the long board and they wait;
   - the concrete pump drives up to the pit's end, puts its feet down and
     unfolds its boom over the pit;
   - the mixer backs up to the pump's hopper, a worker walking ahead of it:
     the child drives it, it stops there by itself, and its chute swings out
     over the hopper;
   - the pour: while the down button is held (and for a moment after) the
     concrete runs from the drum into the hopper and out of the hose, and
     heaps up under it; the two drive buttons move the hose along the pit.
     A part that has enough takes no more, so the hose has to go on;
   - the two trucks pack up and leave, and the two workers draw the board
     along the top while the right button is held: it strikes the heaps off
     level and pushes a roll of concrete before it. The third worker follows
     with the float;
   - it sets, and only then is the foundation laid. The bulldozer comes back
     and pushes the earth in front of it (tidyUp). */
function mixerStage() {
  muster(true);
  site.mud.fill(0);
  Object.assign(site, { mesh: 0, flat: PIT.x0, set: 0, cut: OPEN });
  const [lead, mate] = gang;
  const HOME = MESH.stack + MESH.long / 2; // the middle of the stack of mesh
  const POST = PUMP.at + PUMP.hopper + 1.25; // where the worker with the float stands, by the hopper
  const END = PIT.x1 - 0.1; // where the board's pass ends
  const pump = { x: Math.min(-3.2, camX - 2.6), v: 0, spin: 0, mode: 'away', feet: 0, arm: 0, fill: 0 };
  const me = {
    name: 'mixer', intro: 'steel', mode: 'steel', crew: 'take', trip: 0, t: -0.6, panel: null,
    x: -9, v: 0, spin: 0, drum: 0, chute: 0, truck: 'away', man: null, pump,
    hose: PUMP.from, hv: 0, sway: 0, flow: 0, run: 0, open: false, aim: '', parts: new Array(PARTS).fill(false),
    board: PIT.x0 + 0.1, bv: 0, roll: 0, wait: 0, done: false,
  };
  /* A screen that holds the two trucks and the pit at once shows them all;
     a narrower one follows the work. */
  const whole = () => wide >= 16.5;
  me.room = () => (pump.mode !== 'away' && ['steel', 'drive', 'chute', 'pour'].includes(me.mode) ? 2.2 : 0);
  me.focus = () => {
    if (me.mode === 'steel' && pump.mode === 'away') return me.panel ? me.panel.c : lead.x - 1.5;
    if (me.mode === 'steel' && !whole()) return me.truck === 'away' ? pump.x + 1 : me.x + 2.2;
    if (me.mode === 'drive' || me.mode === 'chute') return whole() ? PUMP.at : me.x + 2.2;
    if (me.mode === 'steel' || me.mode === 'pour') return whole() ? PUMP.at : me.hose;
    if (me.mode === 'strike') return me.board + 0.4;
    if (me.mode === 'float' && me.man) return me.man.x;
    return tidy ? tidy.at - REACH : 10.2;
  };
  /* The chute: its angle and its length as it swings out, and where its end
     is, measured from the truck's middle. */
  me.reach = () => {
    const out = me.chute * me.chute * (3 - 2 * me.chute);
    const turn = -1.4 + 0.9 * out;
    const long = 0.8 + 0.1 * out;
    return { turn, long, x: MIX.hinge[0] + long * Math.cos(turn), y: MIX.hinge[1] + long * Math.sin(turn) };
  };

  /* The steel. The two walk to the ends of the stack, lift a panel, carry it
     down into the pit and lay it: the far one first, then the near one. Then
     they come up to the pit's end, where one takes the board, and wait. */
  const steel = (dt) => {
    me.t += dt;
    if (me.crew === 'take') {
      const there = [walk(lead, HOME + MESH.long / 2, 3.4, dt), walk(mate, HOME - MESH.long / 2, 3.4, dt)];
      if (!there[0] || !there[1]) me.t = Math.min(me.t, 0);
      else if (me.t > 0.25) {
        yard.mesh -= 1;
        lead.hold = mate.hold = 'panel';
        lead.face = mate.face = 1;
        me.panel = { c: HOME, lower: 0 };
        me.crew = 'carry';
        // The pump sets out as the last panel leaves the stack it will park in front of.
        if (me.trip === 1) {
          pump.mode = 'in';
          word('pump');
        }
      }
    } else if (me.crew === 'carry') {
      const goal = MESH.from + MESH.long * (1.5 - me.trip);
      me.panel.c = Math.min(goal, me.panel.c + 3.2 * dt);
      walk(lead, me.panel.c + MESH.long / 2, 9, dt);
      walk(mate, me.panel.c - MESH.long / 2, 9, dt);
      if (me.panel.c >= goal) {
        me.crew = 'lay';
        me.t = 0;
      }
    } else if (me.crew === 'lay') {
      me.panel.lower = Math.min(1, me.t / 0.35);
      if (me.t >= 0.35) {
        site.mesh += 1;
        me.panel = null;
        lead.hold = mate.hold = '';
        sound.tick();
        me.trip += 1;
        me.crew = me.trip < 2 ? 'take' : 'post';
        me.t = 0;
      }
    } else if (me.crew === 'post') {
      const there = [walk(lead, PIT.x0 + 0.75, 3, dt), walk(mate, PIT.x0 + 0.25, 3, dt)];
      if (there[0] && there[1]) {
        yard.board = false;
        mate.hold = 'board';
        lead.face = mate.face = 1;
        me.crew = 'wait';
      }
    }
    // In the pit they stand on its floor; at their post, on the bank behind it.
    const deep = me.crew === 'post' || me.crew === 'wait' ? 0 : 1;
    for (const man of gang) man.y += (-dugAt(man.x) * deep - man.y) * (1 - Math.exp(-dt / 0.08));
  };

  /* The board strikes off what stands above the ground line, and fills what
     lies below it from the roll of concrete it pushes along. */
  const level = (from, to) => {
    const first = Math.floor((from - PIT.x0) / PIT.cell + 1e-6) + 1;
    const last = Math.floor((to - PIT.x0) / PIT.cell + 1e-6);
    for (let i = Math.max(1, first); i <= Math.min(CELLS - 2, last); i++) {
      me.roll = Math.max(0, me.roll + topAt(i) * PIT.cell);
      site.mud[i] = site.dug[i];
    }
  };

  /* Striking it level. The two step into the fresh concrete ahead of the
     board, one at each end of it, and draw it toward them, walking backward,
     while the right button is held. At the far end they carry it away. */
  const strike = (dt) => {
    if (me.crew === 'wait') me.crew = 'step';
    if (me.crew === 'step') {
      const there = [walk(mate, me.board + 0.55, 2, dt), walk(lead, me.board + 1, 2, dt)];
      if (there[0] && there[1]) {
        mate.hold = lead.hold = 'pull';
        mate.face = lead.face = -1;
        level(PIT.x0, me.board);
        me.crew = 'strike';
        sound.tick();
      }
    } else if (me.crew === 'strike') {
      me.bv += clamp((ctl.right ? 1.1 : 0) - me.bv, -5 * dt, 5 * dt);
      const before = me.board;
      me.board = Math.min(END, me.board + me.bv * dt);
      level(before, me.board);
      mate.x = me.board + 0.55;
      lead.x = me.board + 1;
      mate.step += (me.board - before) * 5;
      lead.step += (me.board - before) * 5;
      if (me.board >= END) {
        Object.assign(mate, { hold: 'board', v: 2.4, face: 1 });
        Object.assign(lead, { hold: '', v: 2.4, face: 1 });
        crew.push(lead, mate);
        gang = [];
        me.crew = 'gone';
        me.mode = 'float';
        sound.tick();
        letGo();
        return;
      }
    }
    // The one at the far end of the board stands a little further back in the picture.
    mate.y += (0 - mate.y) * (1 - Math.exp(-dt / 0.08));
    lead.y += (0.15 - lead.y) * (1 - Math.exp(-dt / 0.08));
    mate.grip = [me.board, 0.26];
    lead.grip = [me.board + 0.45, 0.41];
  };

  /* The worker with the float walks ahead of the backing mixer to his post
     by the hopper. When the board is on its way he goes to the pit and
     follows it, walking backward and drawing the float after him. */
  const float = (dt) => {
    const man = me.man;
    if (!man) return;
    if (man.hold === 'up') {
      if (site.flat >= PIT.x1) return;
      const striking = me.mode === 'strike' || me.mode === 'float';
      if (!walk(man, striking ? PIT.x0 + 0.6 : POST, 2.3, dt)) return;
      man.face = -1;
      if (striking) man.hold = 'down';
    } else {
      const d = clamp(Math.min(PIT.x1 + 0.6, gang.length ? me.board - 0.6 : Infinity) - man.x, 0, 2 * dt);
      man.x += d;
      man.step += d * 5;
      site.flat = clamp(man.x - 0.6, PIT.x0, PIT.x1);
      if (man.x >= PIT.x1 + 0.6) {
        man.hold = 'up';
        if (me.mode === 'float') me.mode = 'set';
      }
    }
  };

  /* The two trucks. The pump comes by itself, parks, puts its feet down and
     unfolds; the mixer comes when the pump is parked. When the pour is over
     both pack up: the mixer drives off forward, the pump backs out after it. */
  const trucks = (dt) => {
    let want = 0;
    if (pump.mode === 'in') {
      want = Math.min(2.6, 0.4 + (PUMP.at - pump.x) * 2.5);
    } else if (pump.mode === 'feet') {
      pump.feet = Math.min(1, pump.feet + dt / 0.7);
      if (pump.feet >= 1) {
        pump.mode = 'unfold';
        beep('thud');
      }
    } else if (pump.mode === 'unfold') {
      pump.arm = Math.min(1, pump.arm + dt / 2.2);
      if (pump.arm >= 1) pump.mode = 'ready';
    } else if (pump.mode === 'fold') {
      pump.arm = Math.max(0, pump.arm - dt / 2);
      if (pump.arm <= 0) pump.mode = 'lift';
    } else if (pump.mode === 'lift') {
      pump.feet = Math.max(0, pump.feet - dt / 0.6);
      if (pump.feet <= 0) pump.mode = 'out';
    } else if (pump.mode === 'out') {
      want = -2.2;
      if (pump.x + 3 < camX) pump.mode = 'gone';
    }
    pump.v += clamp(want - pump.v, -6 * dt, 6 * dt);
    pump.x += pump.v * dt;
    pump.spin += pump.v * dt * 3;
    if (pump.mode === 'in' && pump.x >= PUMP.at - 0.01) {
      pump.x = PUMP.at;
      pump.v = 0;
      pump.mode = 'feet';
      me.truck = 'in';
      me.x = Math.min(MIX.in - 2.8, camX - 3.2);
      me.man = { x: me.x + 2.9, y: 0, face: 1, step: 0, hold: 'up', v: 0 };
      word('mixer');
    }
    want = 0;
    if (me.truck === 'in') {
      want = 1.8;
      if (me.x >= MIX.in) {
        me.truck = 'here';
        me.mode = 'drive';
      }
    } else if (me.mode === 'drive') {
      // It slows as it nears the hopper, and stops there by itself.
      want = ctl.right ? Math.min(1.8, 0.35 + (MIX.stop - me.x) * 2.5) : ctl.left ? -2 : 0;
    } else if (me.truck === 'stow') {
      me.chute = Math.max(0, me.chute - dt / 0.8);
      if (me.chute <= 0) me.truck = 'out';
    } else if (me.truck === 'out') {
      want = -2.6;
      if (me.x + 2.8 < camX) me.truck = 'gone';
    }
    me.v += clamp(want - me.v, -6 * dt, 6 * dt);
    me.x += me.v * dt;
    if (me.mode === 'drive') {
      if (me.x >= MIX.stop - 0.01) {
        me.x = MIX.stop;
        me.v = 0;
        me.mode = 'chute';
        sound.tick();
        letGo();
      } else if (me.x < MIX.in) {
        me.x = MIX.in;
        me.v = Math.max(0, me.v);
      }
    }
    me.spin += me.v * dt * 3;
    // The drum turns all the time, and the other way to empty.
    me.drum += dt * (me.flow > 0.05 ? -1.5 : 0.7);
  };

  /* The pour. The concrete runs while the down button is held and for a
     moment after, so one finger is enough: pour, let go, move the hose, pour.
     It runs only into a part of the pit that has not enough yet; over one
     that has, the button toward the nearest part that still needs some
     breathes, until the hose is over the middle of that part. */
  const pour = (dt) => {
    me.hv += clamp(((ctl.right ? 1.3 : 0) - (ctl.left ? 1.3 : 0)) - me.hv, -5 * dt, 5 * dt);
    me.hose = clamp(me.hose + me.hv * dt, PUMP.from, PUMP.to);
    if (me.hose <= PUMP.from || me.hose >= PUMP.to) me.hv = 0;
    me.sway += (-me.hv * 0.14 - me.sway) * (1 - Math.exp(-dt / 0.25));
    const here = partAt(me.hose);
    if (!me.parts[here] && heaped(here)) {
      me.parts[here] = true;
      sound.tick();
    }
    me.run = ctl.down ? 0.6 : Math.max(0, me.run - dt);
    const open = !me.parts[here] && me.run > 0;
    if (open !== me.open) {
      me.open = open;
      beep('pour', open ? 1 : 0);
    }
    me.flow = clamp(me.flow + (open ? dt : -dt) / 0.25, 0, 1);
    if (me.flow > 0) place(me.hose, PUMP.rate * me.flow * dt);
    slump();
    // Where the hose should go: the nearest part that still needs concrete.
    let next = -1;
    me.parts.forEach((has, k) => {
      if (!has && (next < 0 || Math.abs(middleOf(k) - me.hose) < Math.abs(middleOf(next) - me.hose))) next = k;
    });
    if (next >= 0) {
      const off = middleOf(next) - me.hose;
      me.aim = Math.abs(off) < 0.3 || (next === here && me.flow > 0) ? 'down' : off > 0 ? 'right' : 'left';
      return;
    }
    // Enough everywhere: the trucks pack up, and the board comes.
    me.mode = 'strike';
    me.open = false;
    me.run = 0;
    beep('pour', 0);
    delete root.dataset.pour;
    letGo();
    me.truck = 'stow';
    pump.mode = 'fold';
  };

  me.update = (dt) => {
    if (me.mode === 'strike') strike(dt);
    else if (me.crew !== 'gone') steel(dt);
    trucks(dt);
    float(dt);
    if (me.mode === 'chute') {
      me.chute = Math.min(1, me.chute + dt / 0.9);
      if (me.chute >= 1 && pump.mode === 'ready' && me.crew === 'wait') {
        me.mode = 'pour';
        root.dataset.pour = 'on';
        beep('click');
      }
    } else if (me.mode === 'pour') {
      pour(dt);
    } else if (me.mode === 'set') {
      // It sets, and the trucks are gone: the foundation is laid.
      site.set = Math.min(1, site.set + dt / 1.4);
      if (site.set >= 1 && pump.mode === 'gone' && me.truck === 'gone') {
        me.mode = 'laid';
        made.ground = true;
        sound.chime();
        word('ground');
        award(2, 10.2, 0.8);
        advance();
        crew.push(Object.assign(me.man, { v: 2.3, face: 1 }));
        me.man = null;
        tidy = tidyUp();
      }
    } else if (me.mode === 'laid') {
      me.wait += dt;
      if (me.wait > 1.4 && site.cut <= SHUT) me.done = true;
    }
    if (me.mode !== 'pour') {
      me.flow = Math.max(0, me.flow - dt / 0.25);
      me.sway *= 1 - Math.min(1, dt * 4);
    }
    pump.fill += ((me.flow > 0.05 ? 1 : 0) - pump.fill) * (1 - Math.exp(-dt / 0.4));
    if (me.mode === 'pour') beep('engine', 0.12 + 0.2 * me.flow, 0.3 + 0.2 * me.flow);
    else if (!tidy) {
      // A truck's motor while one is on the site, and none while the workers are alone.
      const here = !['away', 'gone'].includes(me.truck) || !['away', 'gone'].includes(pump.mode);
      if (here) motor(Math.abs(me.v) > Math.abs(pump.v) ? me.v : pump.v, me.v > 0.4 || pump.v < -0.4);
      else beep('engine', 0);
    }
    hint(me.mode === 'drive' ? 'right' : me.mode === 'pour' ? me.aim : me.crew === 'strike' ? 'right' : '');
  };
  return me;
}

/* The earth goes back. The bulldozer comes in from the far end, along the
   front of the foundation, gathers the spoil heap on its blade and pushes it
   along: behind the blade the ground is whole again, so the cut that showed
   the pit closes as it passes. It is drawn facing left, and carries on off
   the site while the next stage begins. */
function tidyUp() {
  const me = { at: camX + wide + 2.8, x: 0, v: 0, y: -0.25, tilt: 0, spin: 0, load: 0, lift: 1 };
  me.x = -me.at;
  me.edge = () => [me.x + REACH, me.y + 0.03 + 0.45 * me.lift * me.lift * (3 - 2 * me.lift)];
  me.floor = () => me.y + 0.03;
  return me;
}

function tidyStep(dt) {
  const me = tidy;
  const end = HEAP + 2.6; // the far foot of the spoil heap
  const blade = me.at - REACH;
  const pushing = site.cut > SHUT && blade < end + 0.8;
  me.lift = clamp(me.lift + (pushing ? -dt : dt) / 0.45, 0, 1);
  me.v += clamp((pushing ? 2.4 : 3.2) - me.v, -6 * dt, 6 * dt);
  me.at -= me.v * dt;
  me.x = -me.at;
  me.spin += me.v * dt * 3;
  if (pushing) {
    // What of the heap the blade has reached is on the blade.
    const left = FULL * clamp((blade - HEAP) / (end - HEAP), 0, 1);
    if (site.spoil > left) {
      me.load += site.spoil - left;
      site.spoil = left;
    }
    // Along the foundation the earth falls in before it, and the load shrinks.
    if (blade < PIT.x1 + 0.2 && blade < site.cut) {
      site.cut = blade;
      me.load = FULL * clamp((blade - PIT.x0) / (PIT.x1 - PIT.x0), 0, 1);
      if (Math.random() < 0.4) spray(blade - 0.15, -0.1, 1, DIRT, 0.5, 1);
    }
    if (blade <= PIT.x0 - 0.3) {
      site.cut = SHUT;
      me.load = 0;
    }
  }
  if (stage && stage.name === 'mixer') motor(me.v, false);
  if (me.at + 2.8 < camX) tidy = null;
}

/* Stage 3, the forklift. The stone comes on a truck: a flat bed with three
   pallets on it and a loading arm behind the cab. It drives in along the
   lane behind the forklift's and parks; its arm lifts a pallet off the bed,
   swings it out and sets it down at the spot, and does the same again each
   time the forklift has taken one away and is back out of the way. When the
   bed is empty the arm is laid down and the truck backs out. The forks go
   under a pallet when they are low. At the wall the load must be as high as
   the wall has grown: lower, and it stops at the wall's face. */
function forkStage() {
  const truck = { x: Math.min(-2.2, camX - 2), v: 0, spin: 0, mode: 'in', bed: [true, true, true], tip: [0, 0], path: [], load: false, hold: false, wait: 0 };
  const me = { name: 'fork', intro: 'truck', x: Math.min(-2.6, camX - 2), v: 0, h: 0.05, carry: false, pallet: 'none', mode: 'wait', spin: 0, wait: 0, done: false, bumped: false, truck };
  me.focus = () => (me.mode === 'wait' ? truck.x - 1.2 : me.x + 2.2);
  /* The arm's tip: laid down over the bed when it has nothing to do. A pallet
     hangs from it by a hook and slings, its foot 1.18 under the tip. */
  const rest = () => [truck.x - 3.2, TRUCK.lane + 1.85];
  truck.tip = rest();
  /* The arm goes for the next pallet on the bed, the nearest first: over
     it, down onto it, and up with it, where it holds until the spot is free. */
  const fetch = () => {
    const k = truck.bed.lastIndexOf(true);
    if (k < 0) {
      // Nothing left on the bed: the arm is laid down over it.
      truck.path = [rest()];
      return;
    }
    const x = TRUCK.at - 3 + 1.05 * k;
    const y = TRUCK.lane + 0.76 + 1.18;
    truck.path = [[x, y + 0.7], [x, y, 'take', k], [x, y + 0.95, 'hold']];
  };
  const haul = (dt) => {
    let want = 0;
    if (truck.mode === 'in') {
      want = Math.min(3, 0.4 + (TRUCK.at - truck.x) * 2.5);
    } else if (truck.mode === 'out') {
      want = -2.4;
      if (clock - beeped > 0.7) {
        beeped = clock;
        beep('backup');
      }
      if (truck.x + 1.8 < camX) truck.mode = 'gone';
    }
    truck.v += clamp(want - truck.v, -6 * dt, 6 * dt);
    truck.x += truck.v * dt;
    truck.spin += truck.v * dt * 3;
    if (truck.mode === 'in' && truck.x >= TRUCK.at - 0.01) {
      // Parked: the arm goes to work, and the forklift comes.
      truck.x = TRUCK.at;
      truck.v = 0;
      truck.mode = 'park';
      truck.tip = rest();
      fetch();
      me.mode = 'in';
      word('fork');
    }
    if (truck.mode !== 'park') {
      truck.tip = rest();
      return;
    }
    const goal = truck.path[0];
    if (!goal) {
      // The bed empty and the arm laid down: the truck backs out the way it came.
      if (!truck.load && !truck.bed.includes(true)) {
        truck.wait += dt;
        if (truck.wait > 0.5) truck.mode = 'out';
      }
      return;
    }
    const [x, y, act, k] = goal;
    const far = Math.hypot(x - truck.tip[0], y - truck.tip[1]);
    const step = 2.4 * dt;
    if (far > step) {
      truck.tip = [truck.tip[0] + ((x - truck.tip[0]) * step) / far, truck.tip[1] + ((y - truck.tip[1]) * step) / far];
      return;
    }
    truck.tip = [x, y];
    if (act === 'hold') {
      // The spot free: out over it, and down onto the ground.
      truck.hold = me.pallet !== 'drop';
      if (!truck.hold) truck.path = [[SPOT + 0.5, y], [SPOT + 0.5, 1.18, 'drop']];
      return;
    }
    truck.path.shift();
    if (act === 'take') {
      truck.bed[k] = false;
      truck.load = true;
      beep('click');
    } else if (act === 'drop') {
      truck.load = false;
      me.pallet = 'ready';
      beep('thud');
      spray(SPOT + 0.5, 0.05, 6, '#C9B58F', 0.9, 0.9);
      truck.path = [[SPOT + 0.5, 2.3], rest()];
    }
  };
  me.update = (dt) => {
    haul(dt);
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
    } else if (me.mode === 'out') {
      want = -2.8;
      if (me.x + 1.8 < camX && truck.mode === 'gone') me.done = true;
    }
    me.v += clamp(want - me.v, -7 * dt, 7 * dt);
    me.x += me.v * dt;
    me.spin += me.v * dt * 3;
    // The forklift back out of the way and the spot free, the arm sets down the pallet it holds.
    if (truck.hold && me.pallet === 'none' && !me.carry && me.x + 1.7 < SPOT - 0.3) me.pallet = 'drop';
    if (me.mode === 'work') {
      // How far it may go: the mast stops at the wall, a load too low stops
      // at the wall's face, the pallet on the ground stops raised forks, and
      // it keeps clear of a pallet on its way down.
      let most = HALL.x0 - 0.75;
      const low = me.carry && me.h < made.rows - 0.02;
      if (low) most = Math.min(most, HALL.x0 - 1.73);
      const high = me.pallet === 'ready' && me.h >= 0.2;
      if (me.pallet === 'ready') most = Math.min(most, high ? SPOT - 1.73 : SPOT - 0.7);
      if (me.pallet === 'drop') most = Math.min(most, SPOT - 2);
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
      // The forks slide under the pallet and take it; the arm goes for the next.
      if (me.pallet === 'ready' && me.h < 0.2 && me.x >= SPOT - 0.78) {
        me.pallet = 'none';
        me.carry = true;
        beep('click');
        truck.path = [];
        fetch();
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
      if (me.mode === 'work') {
        // Back for the next pallet: away from the spot, then wait for the arm.
        const clear = me.x + 1.7 < SPOT - 0.3;
        hint(me.pallet === 'ready' ? (high ? 'down' : 'right')
          : me.carry ? (low ? 'up' : over && me.h - made.rows >= 0.22 ? 'down' : 'right')
            : made.rows < 3 && me.pallet === 'none' && !clear ? 'left' : '');
      }
    } else {
      hint('');
    }
    if (me.mode === 'wait') motor(truck.v, false);
    else motor(me.v, me.v < -0.4);
  };
  return me;
}

/* Stage 4, the hand tools, seen close: the door lies flat on two sawhorses,
   seen from the front and a little from above, so its nails and screws stand
   up out of it and are driven down into it. A tool is dragged from the tray;
   on a place of its own kind it works by itself, the way that tool works.
   Lengths here are the bench's own, y down. */
const BENCH = { w: 140, h: 126 };
const TALL = 13; // how far a nail or a screw stands out of the wood before it is driven
/* A place on the door's face: `a` along its length, `f` from its far edge (0) to its near one (1). */
const onDoor = (a, f) => [66 + (a - 66) * (0.88 + 0.12 * f), 42 + 28 * f];
/* Each tool in the tray: where its working tip rests, and its middle, to pick it up by. */
const TOOLS = {
  hammer: { rest: [17, 118], middle: [30, 110] },
  screwdriver: { rest: [57, 108], middle: [75, 108] },
  drill: { rest: [97, 100], middle: [113, 108] },
};
function toolStage() {
  const spots = [
    ['hammer', 30, 0.3], ['hammer', 66, 0.68], ['hammer', 100, 0.3],
    ['screwdriver', 40, 0.2], ['screwdriver', 84, 0.2], ['screwdriver', 50, 0.8],
    ['drill', 78, 0.8], ['drill', 90, 0.8],
  ].map(([kind, a, f]) => {
    const [x, y] = onDoor(a, f);
    return { kind, x, y, p: 0, goal: 0, shake: 0 };
  });
  const man = { x: 5.45, y: 0, face: 1, step: 0, hold: 'door', v: 0 };
  const me = { name: 'tools', spots, held: '', id: null, px: 0, py: 0, k: 1, ox: 0, oy: 0, t: 0, cycle: 0, turn: 0, bite: 0, stand: 0, on: null, wrong: null, fade: 0, end: 0, hung: 0, cx: 6.2, man, said: {}, done: false };
  me.focus = () => 7.6;
  me.fit = () => {
    me.k = Math.min((width - 20) / BENCH.w, (height - 84) / BENCH.h);
    me.ox = (width - BENCH.w * me.k) / 2;
    me.oy = 74 + Math.max(0, (height - 84 - BENCH.h * me.k) / 2);
  };
  me.fit();
  const at = (event) => [(event.clientX - me.ox) / me.k, (event.clientY - me.oy) / me.k];
  me.tip = () => (me.held ? [me.px, me.py - 13] : null);
  /* The top of a nail or a screw as far as it is driven; for a mark, the mark itself. */
  me.head = (spot) => [spot.x, spot.y - (spot.kind === 'drill' ? 0 : 1 + TALL * (1 - spot.p))];
  /* How far the tool's tip is from a place: from the nearest part of where its
     nail or screw stood at first, so a hand held still stays on it as it sinks. */
  me.far = (spot) => {
    const tip = me.tip();
    if (!tip) return Infinity;
    return Math.hypot(tip[0] - spot.x, tip[1] - clamp(tip[1], spot.y - (spot.kind === 'drill' ? 0 : 1 + TALL), spot.y));
  };
  /* How far the hammer is swung back: carried a little raised, and on a nail,
     up and then down onto its head. */
  me.raise = () => {
    if (!me.on) return 0.3;
    if (me.cycle < 0.55) return 0.7 * Math.sin((me.cycle / 0.55) * Math.PI * 0.5);
    return me.cycle < 0.72 ? 0.7 * (1 - ((me.cycle - 0.55) / 0.17) ** 2) : 0;
  };
  me.down = (event) => {
    if (me.held || me.end) return;
    const [x, y] = at(event);
    const name = Object.keys(TOOLS)
      .map((tool) => [Math.hypot(x - TOOLS[tool].middle[0], y - TOOLS[tool].middle[1]), tool])
      .sort((a, b) => a[0] - b[0])
      .filter(([far]) => far < 21)
      .map(([, tool]) => tool)[0];
    if (!name) return;
    me.held = name;
    me.id = event.pointerId;
    me.stand = 0;
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
    me.stand = Math.min(1, me.stand + dt / 0.16);
    for (const spot of spots) {
      spot.shake = Math.max(0, spot.shake - dt);
      spot.p = Math.min(spot.goal, spot.p + dt / 0.18); // a nail sinks quickly under each blow
    }
    const on = spots.find((spot) => spot.kind === me.held && spot.goal < 1 && me.far(spot) < 8) || null;
    if (on !== me.on) {
      me.on = on;
      me.cycle = 0.25;
      me.bite = 0;
    }
    let whirr = 0;
    let load = 0;
    if (on) {
      if (me.held === 'hammer') {
        // Three blows drive a nail home: each lands as the swing comes down.
        const before = me.cycle;
        me.cycle += dt / 0.46;
        if (before < 0.72 && me.cycle >= 0.72) {
          on.goal = Math.min(1, on.goal + 0.34);
          beep('knock');
        }
        if (me.cycle >= 1) me.cycle -= 1;
      } else if (me.held === 'screwdriver') {
        on.p = on.goal = Math.min(1, on.p + dt / 1.3);
        me.turn += dt;
        if (me.turn > 0.13) {
          me.turn = 0;
          beep('ratchet');
        }
      } else {
        // The drill runs free for a moment on its mark, then bites.
        me.bite += dt;
        whirr = 1;
        if (me.bite > 0.3) {
          load = 1;
          on.p = on.goal = Math.min(1, on.p + dt / 1.2);
        }
      }
      if (on.goal >= 1) {
        sound.tick();
        me.on = null;
      }
    }
    beep('drill', whirr, load);
    // A tool over a place that is not its own: the soft buzzer, once.
    const wrong = spots.find((spot) => me.held && spot.kind !== me.held && spot.goal < 1 && me.far(spot) < 5) || null;
    if (wrong && wrong !== me.wrong) {
      wrong.shake = 0.3;
      sound.wrong();
    }
    me.wrong = wrong;
    if (!me.end && spots.every((spot) => spot.p >= 1)) {
      me.end = 0.001;
      me.held = '';
      me.id = null;
      beep('drill', 0);
    }
    if (me.end) {
      // All driven: the handle is set on its holes and its two bolts are
      // turned home; then the bench clears, and a worker carries the door to
      // its place in the wall.
      const before = me.end;
      me.end += dt;
      for (const then of [0.6, 0.85]) {
        if (before < then && me.end >= then) beep('ratchet');
      }
      if (before < 1.05 && me.end >= 1.05) sound.tick();
      if (me.end > 1.9 && !made.door) {
        me.cx = Math.min(DOOR.x, me.cx + 2.6 * dt);
        man.x = me.cx - 0.75;
        man.step += 2.6 * dt * 5;
        if (me.cx >= DOOR.x) {
          made.door = true;
          grow.door = 1;
          me.hung = me.end;
          beep('thud');
          sound.chime();
          word('door');
          award(2, DOOR.x, 1.5);
          advance();
        }
      }
      if (made.door && me.man && me.end > me.hung + 0.7) {
        crew.push(Object.assign(man, { v: -2.4, face: -1, hold: '' }));
        me.man = null;
      }
      if (made.door && me.end > me.hung + 1.9) me.done = true;
    }
    hint('');
  };
  return me;
}

/* Stage 5, the crane. The parts come on the truck that brought the stone, one
   at a time, each standing on its bed: the truck parks where it parked
   before, its arm folded upright behind the cab; the hook takes the part off
   the bed when it comes down onto it; and when the part has been carried
   clear, the truck backs out and comes again with the next one. A load is
   carried over whatever stands in its way, never through it, and is set down
   where its outline shows. */
function craneStage() {
  const BED = TRUCK.lane + 0.76; // the top of the truck's bed
  const spotX = TRUCK.at - 1.94; // the middle of the bed once the truck is parked
  const truck = { x: 0, v: 0, spin: 0, mode: 'gone', bed: [false, false, false], tip: [0, 0], load: false, cargo: null };
  const me = { name: 'crane', part: 0, carry: false, mode: 'work', vx: 0, vy: 0, end: 0, done: false, bumped: false, truck, bed: BED };
  while (me.part < PIECES.length && made[PIECES[me.part].kind]) me.part += 1;
  rig.manned = true;
  me.focus = () => rig.x;
  me.spotX = spotX;
  /* The tip of the truck's arm while it is folded: just over its own foot. */
  const folded = () => [truck.x + 0.33, TRUCK.lane + 1.74];
  /* The truck sets out with the next part: the one after the part on the hook. */
  const send = () => {
    const next = PIECES[me.part + (me.carry ? 1 : 0)];
    if (!next) return;
    Object.assign(truck, { x: Math.min(-2.2, camX - 2), v: 0, mode: 'in', cargo: next });
    truck.tip = folded();
  };
  send();
  const haul = (dt) => {
    let want = 0;
    if (truck.mode === 'in') {
      want = Math.min(3, 0.4 + (TRUCK.at - truck.x) * 2.5);
    } else if (truck.mode === 'park') {
      // Its part is off the bed and carried clear of the cab, or set in its place: it goes.
      if (!truck.cargo && (!me.carry || rig.x - PIECES[me.part].w / 2 > truck.x + 1.7)) truck.mode = 'out';
    } else if (truck.mode === 'out') {
      want = -2.4;
      if (clock - beeped > 0.7) {
        beeped = clock;
        beep('backup');
      }
      if (truck.x + 1.8 < camX) {
        truck.mode = 'gone';
        send();
      }
    }
    truck.v += clamp(want - truck.v, -6 * dt, 6 * dt);
    truck.x += truck.v * dt;
    truck.spin += truck.v * dt * 3;
    if (truck.mode === 'in' && truck.x >= TRUCK.at - 0.01) {
      truck.x = TRUCK.at;
      truck.v = 0;
      truck.mode = 'park';
      sound.tick();
    }
    truck.tip = folded();
  };
  // How high things stand between x0 and x1.
  const topOf = (x0, x1) => {
    let top = 0;
    if (x1 > HALL.x0 && x0 < HALL.x1) top = HALL.top;
    if (made.dome && x1 > PIECES[2].x - 1.25 && x0 < PIECES[2].x + 1.25) top = HALL.top + PIECES[2].h;
    if (x1 > MINARET.x - MINARET.half && x0 < MINARET.x + MINARET.half) top = Math.max(top, MINARET.base + (made.shaft ? 3 : 0) + (made.top ? 2.4 : 0));
    if (truck.mode === 'park') {
      // The truck: its bed, the part on it, and its cab with the arm folded behind it.
      const part = truck.cargo;
      if (x1 > truck.x - 3.62 && x0 < truck.x - 0.26) top = Math.max(top, BED);
      if (part && x1 > spotX - part.w / 2 && x0 < spotX + part.w / 2) top = Math.max(top, BED + part.h);
      if (x1 > truck.x - 0.26 && x0 < truck.x + 1.63) top = Math.max(top, TRUCK.lane + 3.5);
    } else if (truck.mode !== 'gone' && x1 > TRUCK.at - 3.62 && x0 < TRUCK.at + 1.63) {
      // While the truck comes and goes, the hook keeps above the place it parks in.
      top = Math.max(top, 4.3);
    }
    return top;
  };
  me.update = (dt) => {
    haul(dt);
    const piece = PIECES[me.part];
    const ready = !me.carry && truck.mode === 'park' && truck.cargo === piece;
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
    // Over its place, a load is drawn the last little way onto it: the
    // minaret's shaft goes down close along the hall's end wall.
    const near = me.carry && Math.abs(rig.x - piece.x) < 0.45;
    if (near && !ctl.left && !ctl.right) rig.x += clamp(piece.x - rig.x, -1.5 * dt, 1.5 * dt);
    const over = near ? piece.x : rig.x;
    // Down: until the load rests on what is under it.
    const floor = topOf(over - half, over + half) + hang;
    rig.y = clamp(rig.y + me.vy * dt, floor, 7.3);
    const resting = rig.y <= floor + 0.02;
    if (me.mode === 'work' && piece) {
      if (ready && resting && Math.abs(rig.x - spotX) < 0.5) {
        // The hook takes the part off the truck's bed.
        me.carry = true;
        truck.cargo = null;
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
        }
      }
    }
    if (me.mode === 'up') {
      // The hook goes up, and the truck is off the site: the masjid is done.
      me.end += dt;
      if (me.end > 1.2 && truck.mode === 'gone') me.done = true;
    }
    beep('engine', Math.abs(me.vx) + Math.abs(me.vy) > 0.3 ? 0.18 : 0.06, 0.25 + Math.abs(me.vy) * 0.15);
    // The button that helps: over the part, down; the hook or a load lower
    // than what stands in its way, up; otherwise toward where it goes. While
    // the truck is on its way the hook is led back over the place it parks
    // in, and waits there.
    if (me.mode !== 'work' || !piece) hint('');
    else if (!me.carry) {
      const side = rig.x < spotX ? -1 : 1;
      const edge = spotX + side * (piece.w / 2 + 0.01); // the near side of the part on the bed
      const way = Math.max(BED + piece.h, topOf(Math.min(rig.x - half, edge), Math.max(rig.x + half, edge)));
      if (Math.abs(rig.x - spotX) < 0.45) hint(ready ? 'down' : '');
      else hint(blocked || way > rig.y - 0.03 ? 'up' : side < 0 ? 'right' : 'left');
    } else if (Math.abs(rig.x - piece.x) < 0.4) hint('down');
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
  stage = { dozer: dozerStage, mixer: mixerStage, fork: forkStage, tools: toolStage, crane: craneStage }[name]();
  root.dataset.stage = name;
  delete root.dataset.pour;
  hint('');
  letGo();
  // The word that comes first: the machine's, or what a stage opens with.
  if (name === 'tools') beep('engineOff');
  else word(stage.intro || name);
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
    bit.y = Math.max(bit.floor, bit.y + bit.vy * dt);
  }
  bits = bits.filter((bit) => bit.age < bit.life);
  // What is built grows into view.
  const toward = (now, goal, time) => now + clamp(goal - now, -dt / time, dt / time);
  grow.ground = toward(grow.ground, made.ground ? 1 : 0, 0.8);
  for (let r = 0; r < 3; r++) grow.rows[r] = toward(grow.rows[r], r < made.rows ? 1 : 0, 0.9);
  grow.trim = toward(grow.trim, made.rows === 3 && grow.rows[2] >= 1 ? 1 : 0, 0.5);
  grow.door = toward(grow.door, made.door ? 1 : 0, 0.6);
  site.heap = toward(site.heap, site.spoil, tidy ? 0.25 : 0.6);
  if (tidy) tidyStep(dt);
  for (const man of crew) {
    man.x += man.v * dt;
    man.step += Math.abs(man.v) * dt * 5;
  }
  crew = crew.filter((man) => man.x > camX - 1 && man.x < camX + wide + 1);
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

/* The masjid, as far as it is built. The minaret's foot is drawn over the
   hall's corner, and its shaft against the hall's end wall. */
function drawMasjid() {
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
      drawDoor(DOOR.x);
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
    for (const [x, y, at] of [[8.3, 5.6, 0], [11.2, 5.4, 1.3], [9.7, 6.4, 2.1], [MINARET.x - 0.9, 6.3, 0.7], [MINARET.x + 0.9, 5.2, 2.8], [7.4, 4.1, 3.5]]) {
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

/* The bulldozer, facing right. Its blade is a curved plate whose hollow face
   looks forward, toward the earth: the cutting edge is at the bottom front
   and the top edge curls forward over the load. Two push arms carry it from
   the track frame, and a ram from the hood lifts it. */
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
  // The blade hangs on its arm from a pin on the track frame, so it leans
  // back a little as it is lifted. Places on the body, and places on the blade
  // measured from its cutting edge:
  const cos = Math.cos(me.tilt);
  const sin = Math.sin(me.tilt);
  const body = (x, y) => [me.x + x * cos - y * sin, me.y + x * sin + y * cos];
  const [ex, ey] = me.edge();
  const pin = body(0.1, 0.33);
  const lean = Math.atan2(ey + 0.3 - pin[1], ex - 0.24 - pin[0]) - Math.atan2(-0.03, REACH - 0.34);
  const blade = (x, y) => [ex + x * Math.cos(lean) - y * Math.sin(lean), ey + x * Math.sin(lean) + y * Math.cos(lean)];
  const arm = blade(-0.24, 0.3);
  const eye = blade(-0.3, 0.72);
  const ram = body(0.9, 1.4);
  // The push arm.
  lines([[...pin, ...arm]], INK, 0.21);
  lines([[...pin, ...arm]], '#D99A2B', 0.13);
  disc(pin[0], pin[1], 0.07, DARK);
  // The ram: a barrel on the hood, its bright rod reaching down to the blade.
  const long = Math.hypot(eye[0] - ram[0], eye[1] - ram[1]);
  const barrel = [ram[0] + ((eye[0] - ram[0]) * 0.42) / long, ram[1] + ((eye[1] - ram[1]) * 0.42) / long];
  lines([[...ram, ...eye]], INK, 0.1);
  lines([[...ram, ...eye]], '#D5DADF', 0.05);
  lines([[...ram, ...barrel]], INK, 0.19);
  lines([[...ram, ...barrel]], '#5A5F66', 0.12);
  disc(ram[0], ram[1], 0.06, DARK);
  // The blade.
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(lean);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-0.36, 0.52, 0.08, 1.02);
  ctx.lineTo(-0.03, 1.06);
  ctx.quadraticCurveTo(-0.56, 0.54, -0.16, 0);
  ctx.closePath();
  paint('#D99A2B', true);
  shape([[0, 0], [-0.16, 0], [-0.254, 0.15], [-0.087, 0.15]], '#6E747B');
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(-0.11, 0.26);
  ctx.quadraticCurveTo(-0.27, 0.54, -0.04, 0.9);
  ctx.stroke();
  ctx.restore();
  disc(arm[0], arm[1], 0.06, DARK);
  disc(eye[0], eye[1], 0.05, DARK);
  // The earth it pushes lies against the hollow of the blade, on the ground
  // before it: the pit as it is dug, or the level ground of its own lane.
  if (me.load > 0.02) {
    const ground = me.floor || ((x) => -dugAt(x));
    const size = Math.min(0.9, 0.62 * Math.sqrt(me.load));
    const foot = ex + 0.3 + size * 1.5;
    ctx.beginPath();
    ctx.moveTo(ex - 0.02, ey);
    ctx.quadraticCurveTo(ex - 0.2, ey + size * 0.5, ex - 0.05, ey + size);
    ctx.quadraticCurveTo(ex + size * 0.75, ey + size * 0.95, foot, ground(foot));
    ctx.lineTo(ex + 0.06, ground(ex + 0.1));
    ctx.closePath();
    paint(DIRT, true);
  }
}

/* The pit, seen in section: its back wall in shade and its floor in the light. */
function drawPit() {
  const { dug } = site;
  if (!dug.some((deep) => deep > 0.004)) return;
  const edge = () => {
    ctx.beginPath();
    ctx.moveTo(PIT.x0, 0);
    for (let i = 0; i < CELLS; i++) ctx.lineTo(PIT.x0 + i * PIT.cell, -dug[i]);
    ctx.lineTo(PIT.x1, 0);
  };
  ctx.save();
  edge();
  ctx.closePath();
  const shade = ctx.createLinearGradient(0, 0, 0, -PIT.deep);
  shade.addColorStop(0, '#86664A');
  shade.addColorStop(1, '#AD875D');
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.clip();
  lines([[PIT.x0, -0.21, PIT.x1, -0.21], [PIT.x0, -0.41, PIT.x1, -0.41]], 'rgba(60,40,26,.2)', 0.025);
  ctx.strokeStyle = '#D6B382';
  ctx.lineWidth = 0.16;
  edge();
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.lineWidth = 0.04;
  edge();
  ctx.stroke();
  ctx.restore();
}

/* A panel of steel mesh from x0, seen a little from above: two bars along
   it and the cross bars between them. `rise` gives its height along the way;
   laid in the pit it sits on little blocks that keep it off the floor. */
function meshPanel(x0, rise, blocks) {
  if (blocks) {
    for (let k = 0; k < 5; k++) {
      const x = x0 + 0.3 + (k * (MESH.long - 0.6)) / 4;
      box(x - 0.05, rise(x) - 0.1, 0.1, 0.09, 0.01, '#D8D4C8', false);
    }
  }
  const bars = [];
  const count = 16;
  for (let j = 0; j <= count; j++) {
    const x = x0 + (MESH.long * j) / count;
    const y = rise(x);
    bars.push([x, y, x + 0.05, y + 0.09]);
    if (j === count) break;
    const next = x0 + (MESH.long * (j + 1)) / count;
    bars.push([x, y, next, rise(next)], [x + 0.05, y + 0.09, next + 0.05, rise(next) + 0.09]);
  }
  lines(bars, '#3F464D', 0.04);
}

/* By the fence until they are used: the steel mesh, stacked on two timbers,
   and the long board the concrete is struck level with. The timbers stay. */
function drawYard() {
  for (const x of [MESH.stack + 0.5, MESH.stack + MESH.long - 0.64]) box(x, 0, 0.14, 0.1, 0.02, WOOD);
  for (let k = 0; k < yard.mesh; k++) meshPanel(MESH.stack, () => 0.12 + 0.1 * k, false);
  if (yard.board) shape([[PIT.x0 + 0.3, 0], [PIT.x0 + 0.39, 0], [PIT.x0 + 0.6, 2.08], [PIT.x0 + 0.51, 2.1]], '#D2A76A');
}

/* The steel in the pit: the panels that are laid, the far one first. */
function drawMesh() {
  for (let k = 0; k < site.mesh; k++) meshPanel(MESH.from + (1 - k) * MESH.long, (x) => 0.1 - dugAt(x), true);
}

/* The panel on its way, between the two workers' hands; laid, it comes down
   from them onto its blocks. */
function drawCarried(panel) {
  const [lead, mate] = gang;
  const held = (x) => mate.y + 0.58 + ((lead.y - mate.y) * (x - mate.x)) / (lead.x - mate.x);
  meshPanel(panel.c - MESH.long / 2, (x) => held(x) + (0.1 - dugAt(x) - held(x)) * panel.lower, false);
}

/* The concrete in the pit, as thick as it lies along it: in heaps where the
   hose has been, level where the board has passed, with a sheen where the
   float has, and lighter as it sets. */
function drawConcrete() {
  const { mud, dug } = site;
  let first = -1;
  let last = -1;
  for (let i = 0; i < CELLS; i++) {
    if (mud[i] <= 0.003) continue;
    if (first < 0) first = i;
    last = i;
  }
  if (first < 0) return;
  const wet = 1 - site.set;
  const at = (i) => PIT.x0 + i * PIT.cell;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(at(first - 1), -dug[first - 1]);
  for (let i = first; i <= last; i++) {
    // Rough until the float has been over it.
    const rough = mud[i] > 0.02 && at(i) > site.flat ? wet * (0.014 * Math.sin(at(i) * 11) + 0.009 * Math.sin(at(i) * 23 + 1)) : 0;
    ctx.lineTo(at(i), mud[i] - dug[i] + rough);
  }
  for (let i = last + 1; i >= first - 1; i--) ctx.lineTo(at(i), -dug[i]);
  ctx.closePath();
  const mix = (a, b) => Math.round(a + (b - a) * site.set);
  ctx.lineWidth = 0.04;
  paint(`rgb(${mix(134, 201)},${mix(136, 198)},${mix(134, 188)})`, true);
  ctx.clip();
  // The stones in the mix, and the sheen where the float has passed.
  ctx.fillStyle = 'rgba(50,50,50,.22)';
  for (let i = 0; i < 70; i++) {
    ctx.beginPath();
    ctx.arc(PIT.x0 + ((i * 0.618) % 1) * (PIT.x1 - PIT.x0), 0.1 - ((i * 0.371) % 1) * (PIT.deep + 0.1), 0.022, 0, Math.PI * 2);
    ctx.fill();
  }
  if (site.flat > PIT.x0 + 0.3) lines([[PIT.x0 + 0.2, -0.04, site.flat - 0.1, -0.04]], 'rgba(255,255,255,.45)', 0.035);
  ctx.restore();
}

/* The long board on the concrete, seen from its near end: it stands on edge
   across the pit, and the roll of concrete it strikes off lies before it.
   What is left of the roll at the end of the pass stays at the pit's lip. */
function drawBoard(me, held) {
  const x = me.board;
  if (me.roll > 0.004) {
    const tall = Math.min(0.2, 0.45 * Math.sqrt(me.roll));
    ctx.beginPath();
    ctx.ellipse(x + 0.1 + tall, 0, tall * 1.4, tall, 0, 0, Math.PI);
    ctx.closePath();
    paint('#868886', true);
  }
  if (!held) return;
  shape([[x - 0.05, 0], [x + 0.05, 0], [x + 0.5, 0.15], [x + 0.5, 0.41], [x + 0.4, 0.41], [x - 0.05, 0.26]], '#D2A76A');
  lines([[x + 0.05, 0, x + 0.05, 0.26], [x + 0.05, 0.26, x + 0.5, 0.41]], INK, 0.03);
}

/* What the cut in the ground shows, as far as the cut is open: the pit, the
   steel, the two workers at their work in it, the concrete and the board. */
function drawCut(me) {
  if (site.cut <= PIT.x0) return;
  ctx.save();
  if (site.cut < PIT.x1 + 0.3) {
    ctx.beginPath();
    ctx.rect(PIT.x0 - 0.3, -1, site.cut - PIT.x0 + 0.3, 1.6);
    ctx.clip();
  }
  drawPit();
  drawMesh();
  for (const man of gang) drawWorker(man);
  if (me && me.panel) drawCarried(me.panel);
  drawConcrete();
  if (me && (me.crew === 'strike' || me.roll > 0)) drawBoard(me, me.crew === 'strike');
  ctx.restore();
}

/* Once the earth is back, the foundation shows only as the edge of the
   floor: a thin line on the ground under the walls. */
function drawSill() {
  const from = Math.max(site.cut, HALL.x0 - 0.2);
  const to = MINARET.x + MINARET.half + 0.15;
  if (made.ground && from < to) lines([[from, -0.03, to, -0.03]], '#CFCBC0', 0.06);
}

/* The foundation's outline, marked with stakes and string until it is laid. */
function drawStakes() {
  if (grow.ground >= 1) return;
  ctx.globalAlpha = 1 - grow.ground;
  const a = PIT.x0 - 0.07;
  const b = PIT.x1 + 0.07;
  ctx.save();
  ctx.strokeStyle = '#D9463A';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(a, 0.44);
  ctx.quadraticCurveTo((a + b) / 2, 0.32, b, 0.44);
  ctx.stroke();
  ctx.restore();
  for (let x = a + 1.3; x < b - 0.6; x += 1.3) {
    const y = 0.44 - 0.06 * (1 - ((2 * (x - a)) / (b - a) - 1) ** 2);
    shape([[x, y], [x + 0.07, y], [x + 0.035, y - 0.12]], '#D9463A', false);
  }
  for (const x of [a, b]) shape([[x - 0.045, 0], [x + 0.045, 0], [x + 0.045, 0.5], [x, 0.58], [x - 0.045, 0.5]], WOOD);
  ctx.globalAlpha = 1;
}

/* The spoil heap beyond the pit: the earth that came out of it. */
function drawHeap() {
  if (site.heap <= 0.01) return;
  const tall = 1.55 * Math.sqrt(Math.min(1, site.heap / FULL));
  const peak = HEAP + 0.25 + tall * 0.55;
  const end = peak + 0.3 + tall * 0.75;
  ctx.beginPath();
  ctx.moveTo(HEAP - 0.1, 0);
  ctx.bezierCurveTo(HEAP + tall * 0.25, tall * 0.85, peak - tall * 0.3, tall, peak, tall);
  ctx.bezierCurveTo(peak + tall * 0.35, tall, end - tall * 0.35, tall * 0.2, end, 0);
  ctx.closePath();
  paint(DIRT, true);
  ctx.fillStyle = 'rgba(74,52,36,.28)';
  for (const [dx, dy] of [[0.3, 0.2], [0.62, 0.52], [1.1, 0.3], [0.9, 0.76], [1.5, 0.14], [0.55, 0.1]]) {
    ctx.beginPath();
    ctx.ellipse(HEAP + dx * tall, dy * tall, 0.07, 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* A worker on foot: boots, a vest, a plain head under a helmet. `face` is the
   way he looks (1 to the right), `step` swings his legs as he walks. He
   carries a float by its pole, its blade low ('up'), draws it over the concrete on the side he
   faces ('down'), or holds his hands out to the door he carries ('door'). One
   of the two who lay the steel holds his end of a panel at his side
   ('panel'), stands the long board on its end beside him ('board'), or
   reaches down to his end of it as he draws it along (`grip`, with 'pull'). */
function drawWorker(man) {
  const { x, y, face, hold } = man;
  const swing = Math.sin(man.step) * 0.15;
  const legs = [[x - 0.05, y + 0.5, x - swing, y + 0.07], [x + 0.05, y + 0.5, x + swing, y + 0.07]];
  lines(legs, INK, 0.17);
  lines(legs, '#4B5560', 0.1);
  for (const foot of [x - swing, x + swing]) box(foot - 0.09 + face * 0.03, y, 0.19, 0.1, 0.03, DARK);
  const hand = hold === 'up' ? [x + face * 0.26, y + 0.66]
    : hold === 'down' ? [x + face * 0.24, y + 0.6]
      : hold === 'door' ? [x + face * 0.3, y + 0.74]
        : hold === 'board' ? [x + face * 0.25, y + 0.7]
          : hold === 'pull' ? man.grip
            : hold === 'panel' ? [x, y + 0.58]
              : [x + face * 0.06, y + 0.5];
  if (hold === 'board') box(hand[0] - 0.045, y + 0.05, 0.09, 2.1, 0.02, '#D2A76A');
  if (hold === 'up') {
    lines([[hand[0], y + 0.14, hand[0], y + 1.22]], INK, 0.07);
    box(hand[0] - 0.3, y + 0.06, 0.6, 0.08, 0.02, '#C8CDD2');
  } else if (hold === 'down') {
    lines([[hand[0], hand[1], x + face * 0.85, y + 0.07]], INK, 0.07);
    box(x + face * 0.85 - 0.3, y, 0.6, 0.08, 0.02, '#C8CDD2');
  }
  box(x - 0.17, y + 0.46, 0.34, 0.44, 0.08, VEST);
  lines([[x - 0.16, y + 0.62, x + 0.16, y + 0.62]], '#FFE9A8', 0.05);
  lines([[x, y + 0.8, hand[0], hand[1]]], INK, 0.12);
  lines([[x, y + 0.8, hand[0], hand[1]]], VEST, 0.07);
  disc(hand[0], hand[1], 0.05, SKIN);
  disc(x, y + 1.04, 0.15, SKIN);
  ctx.beginPath();
  ctx.arc(x, y + 1.07, 0.17, 0, Math.PI);
  ctx.closePath();
  paint(GOLD, true);
  lines([[x - 0.22, y + 1.07, x + 0.22, y + 1.07]], INK, 0.05);
}

/* Where the mixer is to stop: the outline of its rear wheel, dashed. */
function drawMixerMark(there) {
  ctx.save();
  ctx.setLineDash([0.14, 0.12]);
  ctx.lineWidth = there ? 0.09 : 0.06;
  ctx.strokeStyle = there ? '#35A85A' : `rgba(201,138,69,${(0.65 + 0.3 * Math.sin(clock * 4)).toFixed(2)})`;
  ctx.fillStyle = there ? 'rgba(53,168,90,.14)' : 'rgba(242,184,75,.16)';
  ctx.beginPath();
  ctx.arc(MIX.stop + MIX.wheel, 0.36, 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/* The concrete mixer, its cab to the left: it empties from its rear, on the
   right. The drum lies sloping up to its mouth, a spiral stripe showing that
   it turns; under the mouth hangs the chute, which swings up and out over
   the pump's hopper. */
function drawMixer(me) {
  const wetMix = '#868886';
  ctx.save();
  ctx.translate(me.x, 0);
  // The frame, the cab with its worker, and the two stands of the drum.
  box(-2.2, 0.44, 4.45, 0.2, 0.04, DARK);
  box(-2.32, 0.5, 1.2, 1.42, 0.14, '#D4533A');
  box(-2.2, 1.22, 0.66, 0.52, 0.06, '#BFE0F2');
  ctx.save();
  ctx.beginPath();
  ctx.rect(-2.2, 1.22, 0.66, 0.52);
  ctx.clip();
  drawDriver(-1.86, 1.12, 0.9);
  ctx.restore();
  box(-2.4, 0.46, 0.18, 0.26, 0.04, STEEL);
  disc(-2.25, 0.92, 0.07, '#FFE9A8');
  box(-0.72, 0.3, 0.9, 0.3, 0.1, STEEL);
  shape([[-1.02, 0.64], [-0.6, 0.64], [-0.7, 1.22], [-0.94, 1.22]], '#5A5F66');
  shape([[1.5, 0.64], [2.02, 0.64], [2.14, 1.8], [1.9, 1.8]], '#5A5F66');
  // The drum.
  ctx.save();
  ctx.translate(-0.95, 1.3);
  ctx.rotate(0.31);
  const drum = () => {
    ctx.beginPath();
    ctx.moveTo(-0.06, 0);
    ctx.quadraticCurveTo(-0.06, 0.62, 0.6, 0.76);
    ctx.quadraticCurveTo(1.4, 0.9, 2.9, 0.36);
    ctx.lineTo(2.9, -0.36);
    ctx.quadraticCurveTo(1.4, -0.9, 0.6, -0.76);
    ctx.quadraticCurveTo(-0.06, -0.62, -0.06, 0);
    ctx.closePath();
  };
  drum();
  paint('#F4EFE3', false);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#D4533A';
  ctx.lineWidth = 0.17;
  const gap = 0.75;
  for (let u = -1.2 + (((me.drum % gap) + gap) % gap); u < 3.4; u += gap) {
    ctx.beginPath();
    ctx.moveTo(u, -0.95);
    ctx.bezierCurveTo(u + 0.1, -0.5, u + 0.95, 0.5, u + 1.05, 0.95);
    ctx.stroke();
  }
  ctx.restore();
  drum();
  ctx.stroke();
  lines([[2.9, -0.36, 2.9, 0.36]], INK, 0.09);
  ctx.restore();
  // The hopper over the drum's mouth, and the spout under it.
  shape([[1.6, 3.02], [2.32, 3.02], [2.12, 2.5], [1.78, 2.5]], '#5A5F66');
  shape([[1.84, 1.98], [2.26, 2.04], [2.32, 1.5], [2.02, 1.4]], '#5A5F66');
  // The chute, a trough from its hinge; concrete runs down it and falls from
  // its end into the pump's hopper.
  const { turn, long, x, y } = me.reach();
  const [hx, hy] = MIX.hinge;
  if (me.flow > 0.02) {
    const land = 0.7;
    ctx.save();
    ctx.globalAlpha = Math.min(1, me.flow * 1.5);
    ctx.strokeStyle = wetMix;
    ctx.lineWidth = 0.17;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(x - 0.03, y + 0.02);
    ctx.quadraticCurveTo(x + 0.14, y - 0.05, x + 0.15, land + (y - land) * (1 - me.flow));
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(turn);
  box(-0.08, -0.11, long + 0.08, 0.2, 0.05, STEEL);
  if (me.flow > 0.02) {
    ctx.globalAlpha = Math.min(1, me.flow * 1.5);
    box(0, 0.01, long, 0.09, 0.03, wetMix, false);
    ctx.globalAlpha = 1;
  }
  lines([[0, -0.11, long, -0.11]], INK, 0.07);
  ctx.restore();
  disc(hx, hy, 0.08, DARK);
  wheel(-1.55, 0.36, 0.36, me.spin);
  wheel(0.78, 0.36, 0.36, me.spin);
  wheel(MIX.wheel, 0.36, 0.36, me.spin);
  ctx.restore();
}

/* The concrete pump, its cab to the right, toward the pit. At its back the
   hopper the mixer empties into; a leg at each end that comes down onto a
   pad and takes the truck's weight; behind the cab the foot of the boom,
   three sections with a pipe along them and a rubber hose at the tip. The
   concrete comes out of the hose over the place the child has moved it to. */
function drawPump(pump, me) {
  const GREEN = '#3F9A62';
  const wetMix = '#868886';
  ctx.save();
  ctx.translate(pump.x, 0);
  box(-1.95, 0.44, 3.9, 0.2, 0.04, DARK);
  // The hopper, with the concrete heaped in it while it comes.
  if (pump.fill > 0.03) {
    ctx.beginPath();
    ctx.ellipse(-2.15, 0.98, 0.3, 0.16 * pump.fill, 0, 0, Math.PI);
    ctx.closePath();
    paint(wetMix, true);
  }
  shape([[-2.5, 1], [-1.8, 1], [-1.92, 0.46], [-2.38, 0.46]], '#6E747B');
  lines([[-2.36, 0.82, -1.94, 0.82], [-2.33, 0.66, -1.97, 0.66]], 'rgba(43,31,22,.4)', 0.03);
  // The body with the pump in it, the post the folded boom rests on, the boom's foot.
  box(-1.8, 0.62, 2.6, 0.54, 0.06, '#E9EEF2');
  lines([[-1.62, 0.9, 0.62, 0.9]], GREEN, 0.1);
  box(-1.62, 1.14, 0.12, 0.84, 0.02, DARK);
  box(0.3, 1.14, 0.5, 0.86, 0.06, GREEN);
  // The cab and its worker.
  box(0.85, 0.5, 1.15, 1.42, 0.14, GREEN);
  box(1.28, 1.22, 0.62, 0.52, 0.06, '#BFE0F2');
  ctx.save();
  ctx.beginPath();
  ctx.rect(1.28, 1.22, 0.62, 0.52);
  ctx.clip();
  drawDriver(1.58, 1.12, 0.9);
  ctx.restore();
  box(1.92, 0.46, 0.16, 0.26, 0.04, STEEL);
  disc(1.95, 0.92, 0.07, '#FFE9A8');
  wheel(-1.3, 0.36, 0.36, pump.spin);
  wheel(-0.55, 0.36, 0.36, pump.spin);
  wheel(1.4, 0.36, 0.36, pump.spin);
  const leg = 0.08 + 0.36 * pump.feet;
  for (const x of [-1.78, 0.42]) {
    box(x - 0.07, 0.5 - leg, 0.14, leg + 0.1, 0.02, STEEL);
    box(x - 0.22, 0.43 - leg, 0.44, 0.08, 0.02, DARK);
  }
  ctx.restore();
  // The boom, from its foot to its tip, and the ram that raises it.
  const joints = boomAt(pump, me.hose);
  const [fx, fy] = joints[0];
  const [ex, ey] = joints[1];
  lines([[fx + 0.2, fy - 0.5, fx + (ex - fx) * 0.3, fy + (ey - fy) * 0.3]], INK, 0.11);
  lines([[fx + 0.2, fy - 0.5, fx + (ex - fx) * 0.3, fy + (ey - fy) * 0.3]], '#D5DADF', 0.06);
  [0.2, 0.16, 0.13].forEach((thick, i) => {
    const part = [[...joints[i], ...joints[i + 1]]];
    lines(part, INK, thick + 0.07);
    lines(part, GREEN, thick);
    lines(part, '#D5DADF', 0.04);
  });
  for (const [x, y] of joints.slice(0, 3)) disc(x, y, 0.09, DARK);
  // The hose: strapped back along the last section while the boom is folded,
  // hanging free once it is out, and swinging a little as it is moved.
  const [bx, by] = joints[2];
  const [tx, ty] = joints[3];
  const out = clamp((pump.arm - 0.15) / 0.5, 0, 1);
  const back = Math.hypot(bx - tx, by - ty);
  const dx = ((bx - tx) / back) * (1 - out) + me.sway * out;
  const dy = ((by - ty) / back) * (1 - out) - out;
  const long = 1.15 / Math.max(0.2, Math.hypot(dx, dy));
  const end = [tx + dx * long, ty + dy * long];
  ctx.save();
  if (me.flow > 0.02) {
    const land = topAt(clamp(Math.round((end[0] - PIT.x0) / PIT.cell), 0, CELLS - 1));
    ctx.globalAlpha = Math.min(1, me.flow * 1.5);
    ctx.strokeStyle = wetMix;
    ctx.lineWidth = 0.15;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(end[0], end[1] + 0.05);
    ctx.lineTo(end[0], land + (end[1] - land) * (1 - me.flow));
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineCap = 'round';
  }
  for (const [color, thick] of [[INK, 0.2], ['#4A4F55', 0.13]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + dx * long * 0.2, ty + dy * long * 0.6, end[0], end[1]);
    ctx.stroke();
  }
  ctx.restore();
  disc(tx, ty, 0.08, DARK);
}

/* The delivery truck, its cab to the right: a flat bed with the pallets of
   stone on it, and behind the cab a loading arm of two sections with a hook
   on a short rope. The arm bends upward to bring its tip where it is wanted;
   a pallet hangs under the tip in two slings. */
function drawTruck(truck) {
  const RED = '#D4533A';
  ctx.save();
  ctx.translate(truck.x, TRUCK.lane);
  box(-3.6, 0.44, 5.3, 0.18, 0.04, DARK);
  box(-3.62, 0.62, 3.36, 0.14, 0.02, '#8C5A2B');
  truck.bed.forEach((there, k) => {
    if (there) drawPallet(-3.5 + 1.05 * k, 0.76);
  });
  box(0.35, 0.5, 1.2, 1.4, 0.14, '#3B7DC4');
  box(0.8, 1.2, 0.62, 0.5, 0.06, '#BFE0F2');
  ctx.save();
  ctx.beginPath();
  ctx.rect(0.8, 1.2, 0.62, 0.5);
  ctx.clip();
  drawDriver(1.1, 1.1, 0.9);
  ctx.restore();
  box(1.47, 0.46, 0.16, 0.26, 0.04, STEEL);
  disc(1.5, 0.92, 0.07, '#FFE9A8');
  box(-0.17, 0.62, 0.34, 1, 0.04, RED);
  wheel(-3, 0.36, 0.36, truck.spin);
  wheel(-2.2, 0.36, 0.36, truck.spin);
  wheel(0.95, 0.36, 0.36, truck.spin);
  ctx.restore();
  const foot = [truck.x, TRUCK.lane + 1.62];
  const [a, b] = TRUCK.arm;
  const [tx, ty] = truck.tip;
  const far = clamp(Math.hypot(tx - foot[0], ty - foot[1]), Math.abs(a - b) + 0.05, a + b - 0.02);
  const toward = Math.atan2(ty - foot[1], tx - foot[0]);
  const bend = Math.acos((a * a + far * far - b * b) / (2 * a * far));
  const turn = Math.sin(toward + bend) > Math.sin(toward - bend) ? toward + bend : toward - bend;
  const elbow = [foot[0] + a * Math.cos(turn), foot[1] + a * Math.sin(turn)];
  for (const [part, thick] of [[[...foot, ...elbow], 0.15], [[...elbow, tx, ty], 0.11]]) {
    lines([part], INK, thick + 0.07);
    lines([part], RED, thick);
  }
  disc(foot[0], foot[1], 0.1, DARK);
  disc(elbow[0], elbow[1], 0.08, DARK);
  // The rope, and the pallet in its slings or the bare hook.
  lines([[tx, ty, tx, ty - 0.3]], INK, 0.035);
  if (truck.load) {
    lines([[tx, ty - 0.3, tx - 0.47, ty - 0.5], [tx, ty - 0.3, tx + 0.47, ty - 0.5]], INK, 0.03);
    drawPallet(tx - 0.5, ty - 1.18);
    lines([[tx - 0.47, ty - 0.5, tx - 0.47, ty - 1.14], [tx + 0.47, ty - 0.5, tx + 0.47, ty - 1.14]], INK, 0.03);
  } else {
    ctx.save();
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.arc(tx, ty - 0.37, 0.07, Math.PI / 2, Math.PI * 2, true);
    ctx.stroke();
    ctx.restore();
  }
  disc(tx, ty, 0.06, DARK);
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

/* The hand tools, in the bench's own lengths (y down). Each is drawn from its
   working tip, at 0, 0, the way it is held on its work: the hammer's face
   down with its handle out to the side, the screwdriver and the drill
   standing on their tips. */
function drawHammer(raise) {
  // It swings about the hand's end of the handle.
  ctx.translate(30, -7);
  ctx.rotate(raise);
  ctx.translate(-30, 7);
  for (const [color, thick] of [[INK, 5], [WOOD, 3.4]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(1, -8);
    ctx.lineTo(31, -7);
    ctx.stroke();
  }
  ctx.strokeStyle = '#D4533A';
  ctx.beginPath();
  ctx.moveTo(20, -7.4);
  ctx.lineTo(31, -7);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  // The head: the claw above, the cheek round the handle, the neck, the face.
  ctx.beginPath();
  ctx.moveTo(-3, -12);
  ctx.quadraticCurveTo(-3.4, -19, 5.5, -21.5);
  ctx.lineTo(6.2, -19.6);
  ctx.quadraticCurveTo(1.6, -18, 2.8, -12);
  ctx.closePath();
  paint('#6E747B', true);
  rounded(-3.4, -13, 6.8, 9, 1);
  paint(STEEL, true);
  rounded(-2.4, -4.6, 4.8, 2.6, 0.4);
  paint(STEEL, true);
  rounded(-3.9, -2.6, 7.8, 2.6, 0.7);
  paint('#6E747B', true);
}

/* `turn` is how far round it has turned: the flutes of the handle show it. */
function drawScrewdriver(turn) {
  rounded(-1.1, -17.5, 2.2, 15.5, 0.4);
  paint(STEEL, true);
  ctx.beginPath();
  ctx.moveTo(-1.1, -2.6);
  ctx.lineTo(1.1, -2.6);
  ctx.lineTo(0.7, 0);
  ctx.lineTo(-0.7, 0);
  ctx.closePath();
  paint('#6E747B', true);
  rounded(-2.2, -20, 4.4, 3, 0.6);
  paint(DARK, true);
  rounded(-4.6, -37.5, 9.2, 18, 3.4);
  paint('#D4533A', true);
  ctx.save();
  ctx.strokeStyle = 'rgba(43,31,22,.5)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = turn + (k * Math.PI) / 3;
    if (Math.cos(a) < 0.15) continue;
    ctx.moveTo(Math.sin(a) * 4.1, -34.5);
    ctx.lineTo(Math.sin(a) * 4.1, -22.5);
  }
  ctx.stroke();
  ctx.restore();
}

/* The power drill: the bit down, the motor over it, the grip and its battery
   out to the side. `spin` is how far the bit has turned. */
function drawDrill(spin) {
  // The bit, with its twisting flutes.
  rounded(-0.95, -11.5, 1.9, 10, 0.3);
  paint('#C8CDD2', true);
  ctx.beginPath();
  ctx.moveTo(-0.95, -1.7);
  ctx.lineTo(0.95, -1.7);
  ctx.lineTo(0, 0);
  ctx.closePath();
  paint('#C8CDD2', true);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-0.95, -11.5, 1.9, 9.8);
  ctx.clip();
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  for (let at = -14 + ((spin % 2.4) + 2.4) % 2.4; at < 1; at += 2.4) {
    ctx.moveTo(-1.2, at);
    ctx.lineTo(1.2, at + 1.6);
  }
  ctx.stroke();
  ctx.restore();
  // The chuck.
  ctx.beginPath();
  ctx.moveTo(-1.7, -11);
  ctx.lineTo(1.7, -11);
  ctx.lineTo(3, -16.5);
  ctx.lineTo(-3, -16.5);
  ctx.closePath();
  paint(DARK, true);
  // The grip with its trigger and battery, then the motor's housing.
  rounded(4, -33.5, 15, 7.8, 2.4);
  paint('#23867A', true);
  rounded(17.5, -36, 5, 12.8, 1.4);
  paint(DARK, true);
  rounded(6.6, -26.4, 3.6, 3, 0.9);
  paint('#D4533A', true);
  rounded(-5.6, -36, 11.2, 20, 2.6);
  paint(TEAL, true);
  ctx.save();
  ctx.strokeStyle = 'rgba(43,31,22,.45)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (const y of [-32, -29.5, -27]) {
    ctx.moveTo(-3, y);
    ctx.lineTo(1.4, y);
  }
  ctx.stroke();
  ctx.restore();
}

/* A nail standing `out` of the wood at x, y: a smooth steel shank under a flat round head. */
function drawNail(x, y, out) {
  if (out > 0.2) {
    rounded(x - 0.95, y - out - 0.6, 1.9, out + 0.6, 0.2);
    paint('#AEB5BC', true);
    lines([[x - 0.3, y - out, x - 0.3, y - 0.8]], 'rgba(255,255,255,.6)', 0.5);
  }
  for (const [dy, color] of [[0, '#7C838A'], [-0.8, out > 0.2 ? '#D5DADF' : '#9AA1A8']]) {
    ctx.beginPath();
    ctx.ellipse(x, y - out - 0.6 + dy, 3.4, 1.4, 0, 0, Math.PI * 2);
    paint(color, true);
  }
}

/* A brass screw standing `out` of the wood: a thread wound round its shank,
   and a head with a cross slot, turned by `angle`. A thread that turns as it
   goes down stays where it is to the eye, so its lines keep their places
   over the wood while the head comes down onto them. */
function drawScrew(x, y, out, angle) {
  if (out > 0.2) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 4.5, y - out - 3, 9, out + 3);
    ctx.clip();
    rounded(x - 1.25, y - out, 2.5, out + 2, 0.2);
    paint('#C9A03F', true);
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    for (let at = y - 0.4; at > y - out + 0.6; at -= 2.3) {
      ctx.moveTo(x - 2.3, at);
      ctx.lineTo(x + 2.3, at - 1.5);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 3.9, y - out - 1);
    ctx.lineTo(x + 3.9, y - out - 1);
    ctx.lineTo(x + 1.25, y - out + 1.6);
    ctx.lineTo(x - 1.25, y - out + 1.6);
    ctx.closePath();
    paint('#B88D30', true);
    ctx.restore();
  }
  const top = y - out - 1.2;
  ctx.beginPath();
  ctx.ellipse(x, top, 4, 1.75, 0, 0, Math.PI * 2);
  paint(out > 0.2 ? '#E8C35A' : '#C9A03F', true);
  ctx.beginPath();
  for (const a of [angle, angle + Math.PI / 2]) {
    ctx.moveTo(x - Math.cos(a) * 2.9, top - Math.sin(a) * 1.25);
    ctx.lineTo(x + Math.cos(a) * 2.9, top + Math.sin(a) * 1.25);
  }
  ctx.stroke();
}

/* A place to drill: a pencilled cross on the wood, then the hole as deep as
   it is bored, with the chips the bit has curled out of it. */
function drawHole(x, y, p) {
  if (p <= 0) {
    lines([[x - 3, y - 1.4, x + 3, y + 1.4], [x + 3, y - 1.4, x - 3, y + 1.4]], '#4A3424', 0.8);
    return;
  }
  ctx.save();
  ctx.strokeStyle = '#EBCB94';
  ctx.lineWidth = 0.75;
  [[-4.4, -0.7, 0.4], [4.2, 0.9, 2], [-2.8, 2, 3.4], [3, -1.8, 5], [-5.6, 1.3, 1.2], [5.6, -0.5, 4.1]].forEach(([dx, dy, turn], i) => {
    if (p < (i + 1) / 7) return;
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 0.95, turn, turn + 4.4);
    ctx.stroke();
  });
  ctx.restore();
  ctx.fillStyle = '#2B1F16';
  ctx.beginPath();
  ctx.ellipse(x, y, 0.9 + 1.2 * p, 0.42 + 0.55 * p, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* The door on its sawhorses, close up, with the tray of tools under it. */
function drawBench(me) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const seen = me.end > 1.3 ? clamp(1 - (me.end - 1.3) / 0.6, 0, 1) : me.fade;
  if (seen <= 0) return;
  ctx.globalAlpha = seen;
  ctx.fillStyle = 'rgba(254,249,239,.9)';
  ctx.fillRect(0, 0, width, height);
  ctx.setTransform(dpr * me.k, 0, 0, dpr * me.k, dpr * me.ox, dpr * me.oy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  const strip = (a0, a1, f0, f1) => {
    ctx.beginPath();
    [[a0, f0], [a1, f0], [a1, f1], [a0, f1]].forEach(([a, f], i) => (i ? ctx.lineTo(...onDoor(a, f)) : ctx.moveTo(...onDoor(a, f))));
    ctx.closePath();
  };
  // The two sawhorses: their far legs, the beam's end under the door, the near legs.
  ctx.fillStyle = 'rgba(43,31,22,.12)';
  ctx.beginPath();
  ctx.ellipse(68, 91.5, 58, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  const horses = [onDoor(34, 1)[0], onDoor(98, 1)[0]];
  for (const x of horses) lines([[x - 2, 75, x - 6, 88], [x + 2, 75, x + 6, 88]], '#7E5A32', 2);
  // The door: its near edge, its face of planks under an arch at the right.
  const face = (drop) => {
    ctx.beginPath();
    ctx.moveTo(14, 70 + drop);
    ctx.lineTo(20.2, 42 + drop);
    ctx.lineTo(104, 42 + drop);
    ctx.quadraticCurveTo(124, 43 + drop, 127, 56 + drop);
    ctx.quadraticCurveTo(128, 69.5 + drop, 108, 70 + drop);
    ctx.closePath();
  };
  face(4);
  paint('#8C5A2B', true);
  face(0);
  paint('#C08B52', true);
  ctx.save();
  ctx.clip();
  for (const f of [0.25, 0.5, 0.75]) lines([[...onDoor(14, f), 128, 42 + 28 * f]], 'rgba(74,52,36,.35)', 0.6);
  ctx.restore();
  // Three ledges across the planks, two strap hinges on the far edge, and the lock's plate.
  for (const a of [30, 66, 100]) {
    strip(a - 4.2, a + 4.2, 0.03, 0.97);
    paint('#A67440', true);
  }
  for (const a of [40, 84]) {
    strip(a - 4.4, a + 4.4, 0, 0.46);
    paint('#7C838A', true);
    rounded(onDoor(a, 0)[0] - 3.6, 39.6, 7.2, 3, 1.2);
    paint('#5A5F66', true);
  }
  strip(45, 60, 0.64, 0.95);
  paint('#7C838A', true);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(...onDoor(56.5, 0.8), 1.1, 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Nails and screws already in, like the ones to drive once they are home.
  for (const [a, f] of [[30, 0.78], [66, 0.24], [100, 0.78]]) drawNail(...onDoor(a, f), 0);
  for (const [a, f] of [[40, 0.38], [84, 0.38]]) drawScrew(...onDoor(a, f), 0, 0.6);
  for (const x of horses) {
    rounded(x - 3.2, 74, 6.4, 3.6, 0.6);
    paint('#B9824A', true);
    for (const [color, thick] of [[INK, 3.4], [WOOD, 2.2]]) lines([[x - 2.2, 77.4, x - 9, 91.5], [x + 2.2, 77.4, x + 9, 91.5], [x - 5.4, 85, x + 5.4, 85]], color, thick);
  }
  // Each place: a nail, a screw, or a mark to drill, the far ones first. One
  // glows only while the tool for it is in the hand and coming near, more
  // the nearer it comes.
  for (const spot of [...me.spots].sort((a, b) => a.y - b.y)) {
    const x = spot.x + (spot.shake > 0 ? Math.sin(spot.shake * 60) * 0.8 : 0);
    const out = TALL * (1 - spot.p);
    const far = spot.kind === me.held && spot.goal < 1 ? me.far(spot) : Infinity;
    const glow = clamp((36 - far) / 26, 0, 1) * (0.86 + 0.14 * Math.sin(me.t * 9));
    if (glow > 0) {
      const top = me.head(spot)[1];
      const size = 8 + (spot.y - top) / 2;
      const halo = ctx.createRadialGradient(x, (spot.y + top) / 2, 1, x, (spot.y + top) / 2, size);
      halo.addColorStop(0, `rgba(255,222,90,${(0.9 * glow).toFixed(3)})`);
      halo.addColorStop(0.6, `rgba(255,214,80,${(0.5 * glow).toFixed(3)})`);
      halo.addColorStop(1, 'rgba(255,214,80,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, (spot.y + top) / 2, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.strokeStyle = `rgba(242,160,40,${glow.toFixed(3)})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(x, spot.y, 6, 2.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (spot.kind === 'drill') drawHole(x, spot.y, spot.p);
    else if (spot.kind === 'hammer') drawNail(x, spot.y, out);
    else drawScrew(x, spot.y, out, spot.p * Math.PI * 4);
  }
  // Both holes made and all else driven: the handle comes down onto its
  // holes, and a bolt is turned into each.
  if (me.end > 0.15) {
    const drop = (1 - clamp((me.end - 0.15) / 0.35, 0, 1)) ** 2 * 14;
    const [x0, y0] = onDoor(78, 0.8);
    const [x1] = onDoor(90, 0.8);
    ctx.save();
    ctx.globalAlpha = seen * clamp((me.end - 0.15) / 0.15, 0, 1);
    for (const x of [x0, x1]) {
      rounded(x - 1.5, y0 - 4.6 - drop, 3, 4.8, 0.6);
      paint('#D9A441', true);
    }
    rounded(x0 - 3, y0 - 6.6 - drop, x1 - x0 + 6, 3, 1.5);
    paint(GOLD, true);
    for (const [x, then] of [[x0, 0.6], [x1, 0.85]]) {
      if (me.end < then) continue;
      ctx.beginPath();
      ctx.ellipse(x, y0 - 5.1, 1.3, 0.8, 0, 0, Math.PI * 2);
      paint('#8D949B', true);
    }
    ctx.restore();
  }
  // The tray, and each tool: lying in it, or in the hand; the one in the hand last.
  rounded(6, 93, 128, 31, 5);
  paint('#D9C7A6', true);
  const tip = me.tip();
  for (const name of Object.keys(TOOLS).sort((a, b) => (a === me.held) - (b === me.held))) {
    const held = me.held === name;
    const busy = held && me.on;
    // On its work a tool sits on the head of what it drives, and goes down with it.
    let [x, y] = busy ? me.head(me.on) : held ? tip : TOOLS[name].rest;
    const lying = held ? ((1 - me.stand) * Math.PI) / 2 : Math.PI / 2;
    ctx.save();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = INK;
    if (name === 'hammer') {
      ctx.translate(x, y);
      drawHammer(held ? me.raise() * me.stand : 0);
    } else if (name === 'screwdriver') {
      ctx.translate(x, y);
      ctx.rotate(lying);
      drawScrewdriver(busy ? me.t * 9 : 0);
    } else {
      const boring = busy && me.bite > 0.3;
      if (busy) {
        // The bit goes down into the wood: what is in the hole is out of sight.
        ctx.beginPath();
        ctx.rect(0, 0, BENCH.w, y + 0.5);
        ctx.clip();
        y += me.on.p * 5.5;
        x += boring ? Math.sin(me.t * 70) * 0.25 : 0;
      }
      ctx.translate(x, y);
      ctx.rotate(lying);
      drawDrill(busy ? me.t * 60 : 0);
      if (boring && Math.random() < 0.6) {
        ctx.fillStyle = '#E3C08A';
        ctx.beginPath();
        ctx.arc((Math.random() - 0.5) * 9, -y + me.on.y - Math.random() * 3.5, 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/* The door as it stands: planks under an arch, a batten across, the handle. */
function drawDoor(x) {
  arch(x, 0, DOOR.half - 0.06, DOOR.rise);
  paint(WOOD, true);
  lines([[x - 0.22, 0.03, x - 0.22, 1.7], [x, 0.03, x, 1.9], [x + 0.22, 0.03, x + 0.22, 1.7]], 'rgba(74,52,36,.4)', 0.03);
  box(x - 0.42, 0.72, 0.84, 0.16, 0.02, '#8C5A2B');
  box(x + 0.24, 1.02, 0.07, 0.24, 0.03, GOLD);
}

function draw() {
  const name = stage ? stage.name : '';
  drawSky();
  onSite();
  drawBackdrop();
  drawCrane(false);
  drawYard();
  drawCut(name === 'mixer' ? stage : null);
  drawSill();
  drawStakes();
  drawMasjid();
  drawHeap();
  if (name === 'dozer') {
    drawDozer(stage);
  } else if (name === 'mixer') {
    // The mixer, then the pump whose hopper its chute reaches into, then the
    // worker who walks on the near side of both.
    if (stage.truck === 'in' || stage.mode === 'drive' || stage.mode === 'chute') drawMixerMark(stage.mode === 'chute');
    if (stage.truck !== 'away' && stage.truck !== 'gone') drawMixer(stage);
    if (stage.pump.mode !== 'away' && stage.pump.mode !== 'gone') drawPump(stage.pump, stage);
    if (stage.man) drawWorker(stage.man);
  } else if (name === 'fork') {
    // The truck stands in the lane behind: the forklift passes in front of it.
    if (stage.truck.mode !== 'gone') drawTruck(stage.truck);
    if (stage.pallet === 'ready') drawPallet(SPOT, 0);
    if (stage.carry) drawGhost('pallet', HALL.x0 + 0.02, made.rows, stage.x + 1.7 >= HALL.x0 + 0.03 && stage.h - made.rows < 0.4);
    drawForklift(stage);
  } else if (name === 'tools' && stage.end > 1.3) {
    // The door on its way from the bench to the wall, a worker carrying it.
    if (stage.man) drawWorker(stage.man);
    if (!made.door) drawDoor(stage.cx);
  } else if (name === 'crane' && stage.truck.mode !== 'gone') {
    // The truck in the lane behind, with the next part standing on its bed.
    const { truck } = stage;
    drawTruck(truck);
    if (truck.cargo) drawPiece(truck.cargo.kind, truck.x + stage.spotX - TRUCK.at, stage.bed);
  }
  // The crane's load hangs from the hook.
  const hook = drawCrane(true);
  if (name === 'crane') {
    const piece = PIECES[stage.part];
    if (piece && stage.mode === 'work' && stage.carry) {
      drawGhost(piece.kind, piece.x, piece.y, Math.abs(rig.x - piece.x) < 0.4);
      ctx.save();
      ctx.translate(hook[0], hook[1]);
      ctx.rotate(-rig.swing * 0.6);
      drawPiece(piece.kind, 0, -piece.h);
      ctx.restore();
    }
  }
  for (const man of crew) drawWorker(man);
  // The bulldozer that pushes the earth back works on the near side of
  // everything, and faces left.
  if (tidy) {
    ctx.save();
    ctx.scale(-1, 1);
    drawDozer(tidy);
    ctx.restore();
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
  made.ground = saved >= 2;
  made.rows = saved >= 3 ? 3 : 0;
  made.door = saved >= 4;
  made.shaft = made.top = made.dome = false;
  grow.ground = made.ground ? 1 : 0;
  grow.rows = [0, 1, 2].map((r) => (r < made.rows ? 1 : 0));
  grow.trim = made.rows === 3 ? 1 : 0;
  grow.door = made.door ? 1 : 0;
  Object.assign(rig, { x: 5.2, y: 6.4, swing: 0, swung: 0, manned: false });
  // The ground: the pit and its heap once the bulldozer is done; once the
  // foundation is laid, the earth is back and the ground is whole. Until
  // then the two workers wait by their steel.
  for (let i = 0; i < CELLS; i++) site.dug[i] = pitAt(PIT.x0 + i * PIT.cell, saved >= 1 ? PIT.deep : 0);
  site.spoil = site.heap = saved === 1 ? FULL : 0;
  site.mud.fill(0);
  Object.assign(site, { mesh: 0, flat: PIT.x0, set: made.ground ? 1 : 0, cut: made.ground ? SHUT : OPEN });
  muster(!made.ground);
  tidy = null;
  crew = [];
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

/* The safety gear comes first, every time (gear.js): it starts the site when all of it is on. */
function showGear() {
  run += 1;
  running = false;
  cancelAnimationFrame(raf);
  sound.stop();
  beep('ambience', null);
  beep('engineOff');
  beep('drill', 0);
  beep('pour', 0);
  delete root.dataset.pour;
  stage = null;
  tidy = null;
  $('word').hidden = true;
  show('gear');
  gear.start(startSite);
}

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
    beep('drill', 0);
    beep('pour', 0);
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
sound.preloadPrompts(['bismillah', 'gear', 'start-right', ...Object.values(WORDS).map((entry) => entry.clip)]);
sound.preload(['allahu-akbar', 'adhan-1.mp3']);
if (LOCAL) {
  window.buildGame = {
    get stage() { return stage; },
    get saved() { return saved; },
    set saved(value) { saved = value; },
    get crew() { return crew; },
    get gang() { return gang; },
    get tidy() { return tidy; },
    get view() { return { camX, wide, s, groundY }; },
    made, grow, rig, ctl, site, yard, update, draw, layout, startSite, begin,
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
