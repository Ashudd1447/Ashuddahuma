/* مَصْنَعُ السَّيَّارَاتِ: the car factory. After بِسْمِ اللَّهِ the child puts
   on his safety gear (gear.js), then builds a blue sport SUV on the factory
   floor, one job after another:
    1. the bare chassis rides in along the line to the station;
    2. the hoist carries the engine from its dolly to its mounts;
    3. seen from above, the seats are carried from their cart to their places;
    4. in the paint booth the bare body is sprayed blue;
    5. the hoist lowers the painted body onto the chassis;
    6. the doors of this side go from their rack to their openings;
    7. the wheels of this side are rolled onto their hubs, and each one's five
       bolts are tightened with the wheel wrench, seen close;
    8. and 9. the table turns the car, and the other side gets its doors and
       its wheels;
   10. the car turns to face us and the headlights are pushed in.
   Then the finished car turns through its views, its engine revs three
   times, and الْحَمْدُ لِلَّهِ shows and is said.
   Nothing appears by itself: every part comes on the line, a hoist, a cart
   or a rack and is put on by the child. Nothing is ever lost either: a part
   let go in the wrong place slides back to where it waited.
   The floor is drawn on a canvas in the car's own lengths (meters, more or
   less): x to the right, y up from the floor. The car is 4.9 long and stands
   at the station with its back bumper at x = 0. */
const $ = (id) => document.getElementById(id);

const KEY = 'factory';
const DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arabic = (n) => String(n).replace(/\d/g, (d) => DIGITS[d]);
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const within = (promise, ms) => Promise.race([promise, delay(ms)]);
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const TAU = Math.PI * 2;

const INK = '#2B1F16';
const BLUE = '#2F6FD0';
const BARE = '#C5CAD0';
const GLASS = 'rgba(191,224,242,.8)';
const CABIN = '#39424E';
const MASK = '#D9C7A6';
const GOLD = '#F2B84B';
const STEEL = '#8D949B';
const IRON = '#4A4F57';
const DARK = '#3A3A3A';
const TYRE = '#2B2622';
const RIM = '#C8CDD2';
const SEAT = '#C9A77A';
const RED = '#D4533A';
const ORANGE = '#EE8A3A';

/* The words shown and said: each part as its job begins, the wrench as it is
   picked up. */
const WORDS = {
  chassis: { text: 'الْهَيْكَلُ', clip: 'car-chassis' },
  engine: { text: 'الْمُحَرِّكُ', clip: 'car-engine' },
  seats: { text: 'الْمَقَاعِدُ', clip: 'car-seats' },
  paint: { text: 'الطِّلَاءُ', clip: 'car-paint' },
  body: { text: 'جِسْمُ السَّيَّارَةِ', clip: 'car-body' },
  doors: { text: 'الْأَبْوَابُ', clip: 'car-doors' },
  wheels: { text: 'الْعَجَلَاتُ', clip: 'car-wheels' },
  wrench: { text: 'مِفْتَاحُ الْعَجَلَاتِ', clip: 'tool-wrench' },
  lights: { text: 'الْمَصَابِيحُ', clip: 'car-lights' },
};
const STAGES = ['chassis', 'engine', 'seats', 'paint', 'body', 'doors-a', 'wheels-a', 'doors-b', 'wheels-b', 'lights'];
/* Which way the car faces after each job, in quarter turns of the table:
   0 its right side toward us and its nose to the right, 1 its back toward
   us, 2 its left side, 3 its nose toward us. */
const FACING = { 'doors-b': 2, 'wheels-b': 2, lights: 3 };

/* The car, in its own lengths. */
const LONG = 4.9;
const MID = LONG / 2;
const AXLE = [3.88, 0.98]; // the front one, the back one
const HUB = 0.39; // how high the axles are, and how big a wheel is
const RING = 0.125; // how far from the hub's middle the five bolts are
const RAIL = 3.6; // the hoist's rail overhead
const MOUNT = [3.46, 0.45]; // where the engine's lower back corner sits
const ENGINE = { w: 0.95, h: 0.5 };
const HALL = [-2.5, -0.7, 5.7, 4.05]; // the part of the hall in view: x0, y0, x1, y1
const SHOW = [-1.3, -0.7, 6.2, 3.4]; // the same for the ending
const WORDS_ABOVE = [-1.3, -0.7, 6.2, 5.3]; // and with room for the closing words above the car

/* The body's outlines, side on with the nose to the right. */
const SHELL_D = 'M0.16 0.36 Q0.04 0.38 0.03 0.56 L0.02 0.86 Q0.02 1 0.1 1.06 L0.46 1.45 Q0.62 1.6 0.95 1.64 Q1.9 1.74 2.55 1.7 Q2.85 1.68 3.02 1.58 L3.6 1.2 Q4.2 1.14 4.6 1.04 Q4.85 0.97 4.89 0.74 L4.89 0.52 Q4.88 0.38 4.74 0.36 L4.34 0.36 A0.46 0.46 0 0 1 3.42 0.36 L1.44 0.36 A0.46 0.46 0 0 1 0.52 0.36 Z';
const DOOR_D = [
  'M2.28 0.42 L2.28 1.665 Q2.66 1.66 2.95 1.55 L3.47 1.17 Q3.4 0.8 3.33 0.42 Z',
  'M2.24 0.42 L2.24 1.665 Q1.75 1.67 1.38 1.6 L1.26 1.17 L1.3 0.92 Q1.36 0.62 1.52 0.42 Z',
];
const QUARTER_D = 'M1.22 1.17 L1.32 1.54 Q1.05 1.5 0.9 1.42 L0.68 1.17 Z';
const SHELL = new Path2D(SHELL_D);
const SHELL_CUT = new Path2D(`${SHELL_D} ${DOOR_D[0]} ${DOOR_D[1]} ${QUARTER_D}`);
const DOORS = DOOR_D.map((d) => new Path2D(d));
const DOOR_GLASS = [
  new Path2D('M2.36 1.17 L2.36 1.6 Q2.66 1.6 2.92 1.5 L3.36 1.17 Z'),
  new Path2D('M2.16 1.17 L2.16 1.605 Q1.75 1.61 1.44 1.55 L1.34 1.17 Z'),
];
const DOOR_MID = [[2.86, 1.04], [1.76, 1.04]];
const QUARTER = new Path2D(QUARTER_D);
const TAIL = new Path2D('M0.045 0.97 Q0.05 1.03 0.11 1.05 L0.36 1.05 L0.33 0.99 Z');
const NOSE_LAMP = new Path2D('M4.48 1.0 L4.62 0.995 Q4.77 0.95 4.84 0.83 L4.62 0.87 Q4.5 0.91 4.48 1.0 Z');
/* The body seen from the front or the back, x from its middle. */
const END = new Path2D('M-0.93 0.36 Q-0.99 0.4 -0.99 0.55 L-0.98 0.95 Q-0.97 1.08 -0.86 1.14 L-0.68 1.6 Q-0.63 1.7 -0.46 1.71 L0.46 1.71 Q0.63 1.7 0.68 1.6 L0.86 1.14 Q0.97 1.08 0.98 0.95 L0.99 0.55 Q0.99 0.4 0.93 0.36 Z');
const WINDSHIELD = new Path2D('M-0.76 1.17 L-0.61 1.58 Q-0.59 1.63 -0.5 1.63 L0.5 1.63 Q0.59 1.63 0.61 1.58 L0.76 1.17 Q0 1.22 -0.76 1.17 Z');
const BACK_GLASS = new Path2D('M-0.7 1.2 L-0.57 1.56 Q-0.55 1.6 -0.47 1.6 L0.47 1.6 Q0.55 1.6 0.57 1.56 L0.7 1.2 Q0 1.24 -0.7 1.2 Z');
const LIGHT_BAR = new Path2D('M-0.95 0.96 L0.95 0.96 L0.93 1.07 Q0.6 1.02 0 1.02 Q-0.6 1.02 -0.93 1.07 Z');
const GRILLE = new Path2D('M-0.52 0.72 L0.52 0.72 Q0.5 0.5 0.4 0.44 L-0.4 0.44 Q-0.5 0.5 -0.52 0.72 Z');
const DIFFUSER = new Path2D('M-0.7 0.36 L-0.62 0.54 L0.62 0.54 L0.7 0.36 Z');
/* A headlight, face on: the one on the right of the picture, its low point
   toward the middle of the car. The other is its mirror image. */
const LAMP = new Path2D('M-0.22 -0.08 Q-0.25 0 -0.14 0.03 L0.1 0.11 Q0.24 0.13 0.25 0 Q0.25 -0.1 0.12 -0.1 L-0.16 -0.1 Q-0.21 -0.1 -0.22 -0.08 Z');
const LAMP_AT = [0.66, 0.9];

const root = $('factory');
const canvas = $('floor');
const screenPen = canvas.getContext('2d');
let ctx = screenPen; // where the drawing goes: the screen, or for a moment one of the turning car's two cards
const floorView = $('view-floor');

let stars = 0;
let shown = 0;
let saved = 0; // how many jobs of this car are done
let view = 'gear';
let running = false;
let last = 0;
let raf = 0;
let clock = 0;
let stage = null;
let bits = [];
let line = 0; // how far the line has run
let veil = 0; // a pale cover that lifts when the picture changes
let run = 0;

/* The car: what is on it, and which way it faces. */
const car = {
  x: 0, engine: false, seats: false, body: false,
  doors: [[false, false], [false, false]], // its right side, its left side: the front door, the back door
  wheels: [[false, false], [false, false]],
  bolts: [[null, null], [null, null]], // how far each wheel's five bolts are in; null when all are tight
  rot: [[0, 0], [0, 0]],
  lights: [false, false], // the one on the left of the picture, the one on the right
  turn: 0, shake: 0, braking: false,
};

/* The screen: sizes in CSS pixels. A length of the floor is cam.s pixels, and
   the floor's (0, 0) is at (cam.ox, cam.oy) on the screen. */
let width = 0;
let height = 0;
let dpr = 1;
let ink = 0.03; // a line's thickness, in the floor's lengths
const cam = { s: 100, ox: 0, oy: 0 };

function show(next) {
  view = next;
  root.dataset.view = next;
  for (const section of root.querySelectorAll('.drive-view')) section.hidden = section.id !== `view-${next}`;
  canvas.hidden = next === 'gear';
}

/* Saved on the device: the stars and how far the car has come. A car with
   all ten jobs done whose ending was not seen through opens on its ending. */
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
    if (kept && Number.isInteger(kept.stage) && kept.stage > 0 && kept.stage <= STAGES.length) saved = kept.stage;
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

/* Stars for a job done, flying from a place on the floor. */
function award(count, x, y) {
  stars += count;
  save();
  flyStar(clamp(cam.ox + x * cam.s, 30, width - 30), clamp(cam.oy - y * cam.s, 80, height - 60));
}

/* The sounds made in code. An older saved copy of sound.js may not have all
   of them yet on the first launch after an update. */
const beep = (name, ...values) => (typeof sound[name] === 'function' ? sound[name](...values) : undefined);

/* A text that a recording says, by the father's rule (2026-11-25): it shows
   only while its Fusha recording is the one that plays (sound.caption). An
   older saved copy of sound.js may lack it: then the text simply shows. */
const caption = (el, text, clip, how) => (typeof sound.caption === 'function'
  ? sound.caption(el, text, clip, how)
  : Promise.resolve((el.textContent = text, false)));

/* A word at the top of the floor, shown and said. */
let wordTimer = 0;
function word(name, quiet = false) {
  const entry = WORDS[name];
  const pill = $('word');
  // Hidden, keeping its room, when the Egyptian recording is the one said.
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
  if (view !== 'floor' || !(event.key in KEYS)) return;
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

/* Where the picture should sit so the job's part of the floor fills the
   screen: below the logo, above the buttons when the job has them. */
function aim() {
  const [x0, y0, x1, y1] = stage ? stage.box : SHOW;
  const button = clamp(Math.min(width, height) * 0.15, 72, 112);
  const top = 76;
  const bottom = stage && stage.ctl ? button + 30 : 16;
  const s = Math.min((width - 16) / (x1 - x0), (height - top - bottom) / (y1 - y0));
  const spare = height - top - bottom - (y1 - y0) * s;
  return { s, ox: width / 2 - ((x0 + x1) / 2) * s, oy: top + spare * 0.6 + y1 * s };
}

/* The picture glides to its place, or jumps there when the scene changes. */
function follow(dt) {
  const goal = aim();
  const part = dt ? 1 - Math.exp(-dt / 0.3) : 1;
  for (const name of ['s', 'ox', 'oy']) cam[name] += (goal[name] - cam[name]) * part;
  ink = clamp(cam.s * 0.028, 1.7, 3.6) / cam.s;
}

function layout() {
  width = innerWidth;
  height = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
}

/* Where a finger is, in the floor's lengths. */
const at = (event) => [(event.clientX - cam.ox) / cam.s, (cam.oy - event.clientY) / cam.s];
const far = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const breath = () => 1 + 0.035 * Math.sin(clock * 4);

function hold(event) {
  try {
    floorView.setPointerCapture(event.pointerId);
  } catch {
    // The pointer is already gone.
  }
}

/* Mist, sparks and smoke: small things that drift and fade. */
function puff(x, y, count, color, o = {}) {
  for (let i = 0; i < count; i++) {
    bits.push({
      x, y, color,
      vx: (o.vx || 0) + (Math.random() - 0.5) * 2 * (o.spread ?? 1),
      vy: (0.3 + Math.random() * 0.7) * (o.up ?? 1.2),
      g: o.g ?? 5,
      age: 0,
      life: (o.life ?? 0.5) * (0.7 + Math.random() * 0.6),
      r: (o.r ?? 0.03) * (0.6 + Math.random() * 0.8),
      grow: o.grow || 0,
    });
  }
}

/* The table at the station turns the car toward a way of facing, as a heavy
   plate turns: it starts gently, runs, and comes gently to rest, a half turn
   in about four seconds, its motor humming. True once the car is there. */
const spin = { from: 0, to: 0, t: 0, long: 0 };
function turnTo(goal, dt) {
  if (car.turn >= goal) return true;
  if (!spin.long || spin.to !== goal) Object.assign(spin, { from: car.turn, to: goal, t: 0, long: 1.2 + 1.4 * (goal - car.turn) });
  spin.t += dt;
  const part = Math.min(1, spin.t / spin.long);
  if (part < 1) {
    car.turn = spin.from + (goal - spin.from) * (0.5 - 0.5 * Math.cos(Math.PI * part));
    beep('engine', 0.06 + 0.08 * Math.sin(Math.PI * part), 0.18 + 0.06 * Math.sin(Math.PI * part));
    return false;
  }
  car.turn = goal;
  spin.long = 0;
  beep('engineOff');
  return true;
}

/* Where bolt k of a wheel is from the hub's middle, in the car's own picture
   of that side (nose to the right): rot is how far the wheel had rolled when
   it went on. The wheel's drawing takes its bolts from here. */
function boltOff(rot, k) {
  const a = rot + Math.PI / 2 + (k * TAU) / 5;
  return [Math.cos(a) * RING, Math.sin(a) * RING];
}

/* The same bolt on the floor, with that side of the car toward us. The
   second side is seen with the nose to the left, so its picture, and every
   bolt in it, is the mirror image. The glow, the wrench's socket and the test
   of "near" all ask here. */
function boltAt(side, hub, k) {
  const [dx, dy] = boltOff(car.rot[side][hub], k);
  return [car.x + (side ? LONG - AXLE[hub] - dx : AXLE[hub] + dx), HUB + dy];
}

/* Parts carried by a finger, one at a time: seats, doors, headlights. Each
   waits at its home; let go near a free place of its own kind it goes on,
   anywhere else it slides back home (with the soft buzzer when that was a
   place of another kind). me.target is the place the carried part is near:
   only then does that place glow, and letting go then puts the part on. */
function carry(me, items, slots, opt) {
  me.items = items;
  me.slots = slots;
  me.held = null;
  me.id = null;
  me.target = null;
  const reach = (item, r, same) => {
    let best = null;
    let least = r;
    for (const slot of slots) {
      if (!slot.free || (slot.kind === item.kind) !== same) continue;
      const d = far(item.at, [slot.x, slot.y]);
      if (d < least) {
        least = d;
        best = slot;
      }
    }
    return best;
  };
  me.down = (event) => {
    if (me.held || me.mode !== 'work') return;
    const [x, y] = at(event);
    let best = null;
    let least = 1;
    for (const item of items) {
      if (item.placed) continue;
      const d = Math.max(Math.abs(x - item.at[0]) / (item.half[0] + 0.12), Math.abs(y - item.at[1]) / (item.half[1] + 0.12));
      if (d < least) {
        least = d;
        best = item;
      }
    }
    if (!best) return;
    me.held = best;
    me.id = event.pointerId;
    best.back = false;
    best.grip = [best.at[0] - x, best.at[1] - y + opt.lift];
    best.at = [x + best.grip[0], y + best.grip[1]];
    hold(event);
  };
  me.move = (event) => {
    if (event.pointerId !== me.id) return;
    const [x, y] = at(event);
    me.held.at = [x + me.held.grip[0], y + me.held.grip[1]];
  };
  me.up = (event) => {
    if (event.pointerId !== me.id) return;
    const item = me.held;
    me.held = null;
    me.id = null;
    me.target = null;
    const slot = reach(item, opt.near, true);
    if (slot && event.type === 'pointerup') {
      item.placed = true;
      item.at = [slot.x, slot.y];
      slot.free = false;
      opt.placed(item, slot);
      return;
    }
    if (reach(item, opt.near * 0.7, false)) beep('wrong');
    item.back = true;
  };
  me.slide = (dt) => {
    for (const item of items) {
      if (!item.back) continue;
      const part = 1 - Math.exp(-dt / 0.12);
      item.at = [item.at[0] + (item.home[0] - item.at[0]) * part, item.at[1] + (item.home[1] - item.at[1]) * part];
      if (far(item.at, item.home) < 0.02) {
        item.at = [...item.home];
        item.back = false;
      }
    }
    me.target = me.held ? reach(me.held, opt.near, true) : null;
  };
}

/* Job 1, the chassis. It rides in on the line while the button is held, and
   the line stops it at the station. */
function chassisStage() {
  const me = { name: 'chassis', kind: 'hall', box: HALL, ctl: 'right', mode: 'work', v: 0, wait: 0, done: false };
  car.x = -5.4;
  me.update = (dt) => {
    if (me.mode === 'work') {
      me.v += clamp((ctl.right ? 1.7 : 0) - me.v, -5 * dt, 5 * dt);
      car.x += me.v * dt;
      line += me.v * dt;
      beep('engine', me.v > 0.1 ? 0.16 : 0.05, 0.2 + me.v * 0.1);
      hint('right');
      if (car.x >= 0) {
        car.x = 0;
        me.mode = 'set';
        beep('engineOff');
        beep('thud');
        beep('chime');
        award(1, MID, 0.8);
        advance();
      }
    } else {
      hint('');
      me.wait += dt;
      if (me.wait > 1.3) me.done = true;
    }
  };
  me.draw = () => {
    drawHall();
    drawCar();
  };
  return me;
}

/* Job 2, the engine. It comes on a dolly. The hook takes it when it comes
   down onto it; the engine is carried over the chassis, never through it,
   and set down on its mounts, where its outline shows. */
const hoist = { x: 1.2, y: 2.6 };
function engineStage() {
  const DOLLY = -1.25;
  const goalX = MOUNT[0] + ENGINE.w / 2;
  const me = { name: 'engine', kind: 'hall', box: HALL, ctl: 'all', mode: 'in', cart: -6, carry: false, taken: false, vx: 0, vy: 0, wait: 0, done: false, bumped: false, lit: false };
  Object.assign(hoist, { x: 1.2, y: 2.6 });
  // How high things stand between x0 and x1.
  const topOf = (x0, x1) => {
    let top = 0;
    if (x1 > me.cart - 0.6 && x0 < me.cart + 0.6) top = me.taken ? 0.36 : 0.36 + ENGINE.h;
    if (x1 > 0.25 && x0 < 4.6) top = Math.max(top, MOUNT[1]);
    if (car.engine && x1 > MOUNT[0] && x0 < MOUNT[0] + ENGINE.w) top = Math.max(top, MOUNT[1] + ENGINE.h);
    return top;
  };
  me.update = (dt) => {
    if (me.mode === 'in') {
      me.cart = Math.min(DOLLY, me.cart + 3.2 * dt);
      if (me.cart >= DOLLY) {
        me.mode = 'work';
        beep('tick');
      }
    }
    const half = me.carry ? ENGINE.w / 2 : 0.1;
    const hang = me.carry ? ENGINE.h : 0;
    let wantX = 0;
    let wantY = 0;
    if (me.mode === 'work') {
      wantX = ctl.right ? 1.9 : ctl.left ? -1.9 : 0;
      wantY = ctl.up ? 1.5 : ctl.down ? -1.5 : 0;
    } else if (me.mode === 'up') {
      wantY = 1.5;
    }
    me.vx += clamp(wantX - me.vx, -9 * dt, 9 * dt);
    me.vy += clamp(wantY - me.vy, -12 * dt, 12 * dt);
    // Across: stopped by anything taller than the load hangs.
    let x = clamp(hoist.x + me.vx * dt, -1.9, 5.1);
    let blocked = false;
    if (topOf(x - half, x + half) > hoist.y - hang + 0.03) {
      x = hoist.x;
      blocked = true;
      if (Math.abs(me.vx) > 0.5 && !me.bumped) {
        me.bumped = true;
        beep('tick');
      }
      me.vx = 0;
    } else if (me.vx !== 0) {
      me.bumped = false;
    }
    hoist.x = x;
    // Down: until the load rests on what is under it.
    const floor = topOf(hoist.x - half, hoist.x + half) + hang;
    hoist.y = clamp(hoist.y + me.vy * dt, floor, 2.9);
    const resting = hoist.y <= floor + 0.02;
    me.lit = me.carry && Math.abs(hoist.x - goalX) < 0.3;
    if (me.mode === 'work') {
      if (!me.taken && resting && Math.abs(hoist.x - me.cart) < 0.3) {
        // The hook takes the engine.
        me.carry = me.taken = true;
        hoist.x = me.cart;
        beep('click');
      } else if (me.carry && resting && me.lit) {
        // Set down on its mounts.
        me.carry = false;
        hoist.x = goalX;
        car.engine = true;
        me.mode = 'up';
        beep('thud');
        beep('chime');
        award(2, goalX, 1.1);
        advance();
      }
    } else if (me.mode === 'up') {
      me.cart -= 3 * dt;
      me.wait += dt;
      if (me.wait > 1.5) me.done = true;
    }
    beep('engine', Math.abs(me.vx) + Math.abs(me.vy) > 0.3 ? 0.18 : 0.06, 0.25 + Math.abs(me.vy) * 0.15);
    // The button that helps: over the engine, down; something in the way,
    // up; otherwise toward where the hook must go.
    const over = (x0, x1) => topOf(Math.min(x0, x1) - half, Math.max(x0, x1) + half) > hoist.y - hang + 0.03;
    if (me.mode !== 'work') hint('');
    else if (!me.taken) hint(Math.abs(hoist.x - me.cart) < 0.25 ? 'down' : blocked || over(hoist.x, me.cart + (hoist.x < me.cart ? -0.4 : 0.4)) ? 'up' : hoist.x < me.cart ? 'right' : 'left');
    else if (Math.abs(hoist.x - goalX) < 0.25) hint('down');
    else hint(blocked || over(hoist.x, goalX) ? 'up' : hoist.x < goalX ? 'right' : 'left');
  };
  me.draw = () => {
    drawHall();
    drawDolly(me.cart);
    if (!me.taken) drawEngine(me.cart - ENGINE.w / 2, 0.36);
    drawCar();
    if (me.carry) {
      ghost(() => rounded(MOUNT[0], MOUNT[1], ENGINE.w, ENGINE.h, 0.06), me.lit);
      drawEngine(hoist.x - ENGINE.w / 2, hoist.y - ENGINE.h);
      // It hangs over the middle of the chassis, so this side's springs and
      // hubs stay in front of it, as they are once it sits on its mounts.
      for (const x of AXLE) drawHub(x);
    }
    drawHoist(hoist.x, hoist.y);
  };
  return me;
}

/* Job 3, the seats, seen from above. They come on a cart: two for the front,
   the bench for the back. */
function seatsStage() {
  const me = { name: 'seats', kind: 'top', box: [-0.3, -3.1, 5.2, 1.3], ctl: '', mode: 'in', cart: -7, wait: 0, done: false };
  const items = [
    { kind: 'front', home: [1.6, -2.05], half: [0.3, 0.28] },
    { kind: 'front', home: [2.5, -2.05], half: [0.3, 0.28] },
    { kind: 'bench', home: [3.5, -2.05], half: [0.3, 0.72] },
  ].map((item) => ({ ...item, at: [...item.home], placed: false, back: false }));
  const slots = [
    { kind: 'front', x: 2.58, y: -0.42 }, { kind: 'front', x: 2.58, y: 0.42 }, { kind: 'bench', x: 1.62, y: 0 },
  ].map((slot) => ({ ...slot, free: true }));
  carry(me, items, slots, {
    near: 0.6, lift: 0.25,
    placed(item) {
      beep('click');
      award(1, item.at[0], item.at[1]);
      if (!items.every((each) => each.placed)) return;
      car.seats = true;
      me.mode = 'out';
      beep('chime');
      advance();
    },
  });
  me.update = (dt) => {
    hint('');
    if (me.mode === 'in') {
      me.cart = Math.min(0, me.cart + 6 * dt);
      if (me.cart >= 0) me.mode = 'work';
    } else if (me.mode === 'out') {
      me.cart -= 5 * dt;
      me.wait += dt;
      if (me.wait > 1.4) me.done = true;
    }
    me.slide(dt);
  };
  me.draw = () => {
    drawFloorAbove();
    drawCartAbove(me.cart);
    drawChassisAbove();
    for (const slot of slots) {
      if (slot.free) ghost(() => seatAbove(slot.kind, slot.x, slot.y, true), slot === me.target);
    }
    for (const item of items) {
      if (item === me.held) continue;
      const waits = !item.placed && !item.back && me.mode === 'work' && !me.held;
      ctx.save();
      ctx.translate(item.at[0] + (item.placed ? 0 : me.cart), item.at[1]);
      if (waits) ctx.scale(breath(), breath());
      seatAbove(item.kind, 0, 0);
      ctx.restore();
    }
    if (me.held) seatAbove(me.held.kind, me.held.at[0], me.held.at[1]);
  };
  return me;
}

/* Job 4, the paint. The bare body hangs in the booth; paint lands where the
   finger is while it is down, and the gun's hiss sounds. When nearly all of
   the body is blue the rest is finished off, and the body is carried out. */
const LIFT = 0.75; // how high the body hangs in the booth
function paintStage() {
  const CELL = 0.12;
  const DOTS = 90; // dots of the paint layer to one length
  const REST = [4.92, 0.86];
  const me = { name: 'paint', kind: 'booth', box: [-0.6, -0.7, 5.6, 4.05], ctl: '', mode: 'work', id: null, aim: null, gone: 0, covered: 0, fill: 0, wait: 0, used: false, done: false };
  const layer = document.createElement('canvas');
  layer.width = Math.round(LONG * DOTS);
  layer.height = Math.round(1.5 * DOTS);
  const pen = layer.getContext('2d');
  // The places on the body that want paint.
  const cells = [];
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let x = CELL / 2; x < LONG; x += CELL) {
    for (let y = 0.3 + CELL / 2; y < 1.8; y += CELL) {
      if (ctx.isPointInPath(SHELL_CUT, x, y, 'evenodd')) cells.push({ x, y, done: false });
    }
  }
  ctx.restore();
  me.layer = layer;
  me.down = (event) => {
    if (me.mode !== 'work' || me.id !== null) return;
    me.id = event.pointerId;
    me.aim = at(event);
    me.used = true;
    hold(event);
  };
  me.move = (event) => {
    if (event.pointerId === me.id) me.aim = at(event);
  };
  me.up = (event) => {
    if (event.pointerId !== me.id) return;
    me.id = null;
    me.aim = null;
  };
  me.update = (dt) => {
    hint('');
    const spraying = me.mode === 'work' && me.aim;
    beep('spray', spraying ? 1 : 0);
    if (spraying) {
      const [x, y] = [me.aim[0], me.aim[1] - LIFT];
      const blob = pen.createRadialGradient(x * DOTS, (y - 0.3) * DOTS, 0, x * DOTS, (y - 0.3) * DOTS, 0.38 * DOTS);
      blob.addColorStop(0, 'rgba(47,111,208,1)');
      blob.addColorStop(0.72, 'rgba(47,111,208,.95)');
      blob.addColorStop(1, 'rgba(47,111,208,0)');
      pen.fillStyle = blob;
      pen.fillRect((x - 0.38) * DOTS, (y - 0.68) * DOTS, 0.76 * DOTS, 0.76 * DOTS);
      for (const cell of cells) {
        if (!cell.done && Math.hypot(cell.x - x, cell.y - y) < 0.26) cell.done = true;
      }
      me.covered = cells.filter((cell) => cell.done).length / cells.length;
      if (Math.random() < 0.6) puff(me.aim[0], me.aim[1], 1, 'rgba(120,170,235,.5)', { spread: 0.5, up: 0.3, g: 0.4, life: 0.5, r: 0.05, grow: 0.2 });
      if (me.covered >= 0.9) {
        me.mode = 'dry';
        me.aim = null;
        me.id = null;
        beep('spray', 0);
        beep('chime');
        award(2, MID, LIFT + 1.2);
        advance();
      }
    }
    if (me.mode === 'dry') {
      me.fill = Math.min(1, me.fill + dt / 0.6);
      me.wait += dt;
      if (me.wait > 1.5) me.mode = 'out';
    } else if (me.mode === 'out') {
      me.gone += dt * (1 + me.gone * 3);
      if (me.gone > 7) me.done = true;
    }
  };
  me.draw = () => {
    drawBooth();
    // The body on its carrier, the paint on it so far.
    ctx.save();
    ctx.translate(me.gone, LIFT);
    put(DOORS[0], '#7F8790', false);
    put(DOORS[1], '#7F8790', false);
    drawBody(BARE, [false, false], { booth: true, layer, fill: me.fill });
    drawCarrier();
    ctx.restore();
    drawHoist(MID + me.gone, LIFT + 2.07, true);
    // The gun: on its stand, or in the hand, its mist reaching the body.
    lines([[5.12, 0, 5.12, 0.74]], INK, 2.4);
    lines([[5.12, 0, 5.12, 0.74]], STEEL, 1.4);
    lines([[4.98, 0.74, 5.26, 0.74]], INK, 2.2);
    const spraying = me.mode === 'work' && me.aim;
    const nozzle = spraying ? [me.aim[0] + 0.41, me.aim[1] - 0.28] : REST;
    const tilt = spraying ? -0.6 : 0;
    const foot = [nozzle[0] + 0.31 * Math.cos(tilt) + 0.34 * Math.sin(tilt), nozzle[1] + 0.31 * Math.sin(tilt) - 0.34 * Math.cos(tilt)];
    ctx.save();
    ctx.lineWidth = ink * 2.2;
    ctx.beginPath();
    ctx.moveTo(foot[0], foot[1]);
    ctx.quadraticCurveTo((foot[0] + 5.5) / 2, Math.min(foot[1], 0.2) - 0.35, 5.52, 0.25);
    ctx.stroke();
    ctx.restore();
    if (spraying) {
      ctx.fillStyle = 'rgba(120,170,235,.3)';
      ctx.beginPath();
      ctx.moveTo(nozzle[0], nozzle[1]);
      ctx.lineTo(me.aim[0] - 0.14, me.aim[1] - 0.2);
      ctx.lineTo(me.aim[0] + 0.14, me.aim[1] + 0.2);
      ctx.closePath();
      ctx.fill();
    } else if (me.mode === 'work' && !me.used) {
      ring(REST[0] + 0.14, REST[1] - 0.04, 0.42);
    }
    drawGun(nozzle[0], nozzle[1], tilt);
  };
  return me;
}

/* Job 5, the body. The hoist brings it in above the line; it is moved over
   the chassis and lowered onto it. Off to one side it cannot come down. */
function bodyStage() {
  const HIGH = 1.15; // how high the body must hang to pass over the seats
  const me = { name: 'body', kind: 'hall', box: HALL, ctl: 'all', mode: 'in', bx: -8.5, by: 1.25, vx: 0, vy: 0, wait: 0, away: 0, done: false };
  me.update = (dt) => {
    let wantX = 0;
    let wantY = 0;
    if (me.mode === 'in') {
      wantX = 3;
      if (me.bx >= -2.2) me.mode = 'work';
    } else if (me.mode === 'work') {
      wantX = ctl.right ? 1.6 : ctl.left ? -1.6 : 0;
      wantY = ctl.up ? 1.2 : ctl.down ? -1.2 : 0;
    }
    me.vx += clamp(wantX - me.vx, -8 * dt, 8 * dt);
    me.vy += clamp(wantY - me.vy, -10 * dt, 10 * dt);
    const over = Math.abs(me.bx) < 0.2;
    if (me.mode === 'work') {
      // Over the chassis it lines itself up as it comes down.
      if (me.by < HIGH - 0.01) {
        me.bx += (0 - me.bx) * (1 - Math.exp(-dt / 0.08));
        me.vx = 0;
      } else {
        me.bx = clamp(me.bx + me.vx * dt, -2.3, 0.6);
      }
      me.by = clamp(me.by + me.vy * dt, over ? 0 : HIGH, 1.3);
      if (me.by <= 0.005) {
        me.bx = me.by = 0;
        car.body = true;
        me.mode = 'up';
        beep('thud');
        beep('zip');
        beep('chime');
        award(2, MID, 1.6);
        advance();
      }
      hint(!over ? (me.bx < 0 ? 'right' : 'left') : 'down');
    } else if (me.mode === 'in') {
      me.bx += me.vx * dt;
      hint('');
    } else {
      // The empty carrier goes up and away.
      hint('');
      me.wait += dt;
      me.away += dt * (0.4 + me.wait * 2.5);
      if (me.wait > 1.6) me.done = true;
    }
    beep('engine', Math.abs(me.vx) + Math.abs(me.vy) > 0.3 ? 0.18 : 0.06, 0.25 + Math.abs(me.vy) * 0.15);
  };
  me.draw = () => {
    drawHall();
    drawCar();
    if (me.mode === 'up') {
      const up = Math.min(1.2, me.away * 1.4);
      const off = Math.max(0, me.away - 0.85) * 4;
      ctx.save();
      ctx.translate(-off, up);
      drawCarrier();
      ctx.restore();
      drawHoist(MID - off, up + 2.07, true);
      return;
    }
    if (me.mode === 'work' && me.by > 0.3) {
      // Where it goes: the body's outline on the chassis.
      ghost(() => ctx.stroke(SHELL), Math.abs(me.bx) < 0.2);
    }
    ctx.save();
    ctx.translate(me.bx, me.by);
    put(DOORS[0], CABIN, false);
    put(DOORS[1], CABIN, false);
    drawBody(BLUE, [false, false]);
    drawCarrier();
    ctx.restore();
    drawHoist(MID + me.bx, me.by + 2.07, true);
  };
  return me;
}

/* Jobs 6 and 8, the doors of one side. They come on a rack; each fits only
   its own opening, the front one or the back one. */
function doorsStage(side) {
  const me = { name: side ? 'doors-b' : 'doors-a', kind: 'hall', box: HALL, ctl: '', mode: 'in', rack: -6, wait: 0, done: false, side };
  const flip = (x) => (side ? LONG - x : x);
  const items = [
    { kind: 'front', index: 0, home: [-1.45, 0.76], half: [0.55, 0.58] },
    { kind: 'back', index: 1, home: [-1.45, 2.13], half: [0.5, 0.58] },
  ].map((item) => ({ ...item, at: [...item.home], placed: false, back: false }));
  const slots = [0, 1].map((i) => ({ kind: i ? 'back' : 'front', index: i, x: flip(DOOR_MID[i][0]), y: DOOR_MID[i][1], free: true }));
  carry(me, items, slots, {
    near: 0.7, lift: 0.1,
    placed(item) {
      car.doors[side][item.index] = true;
      beep('click');
      beep('zip');
      award(1, item.at[0], item.at[1]);
      if (!items.every((each) => each.placed)) return;
      me.mode = 'out';
      beep('chime');
      advance();
    },
  });
  // A door, drawn with its middle at x, y.
  const door = (item, x, y, k = 1) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(side ? -k : k, k);
    ctx.translate(-DOOR_MID[item.index][0], -DOOR_MID[item.index][1]);
    drawDoor(item.index, BLUE);
    ctx.restore();
  };
  me.update = (dt) => {
    hint('');
    if (me.mode === 'in') {
      const turned = turnTo(FACING[me.name] || 0, dt);
      me.rack = Math.min(0, me.rack + 4 * dt);
      if (turned && me.rack >= 0) me.mode = 'work';
    } else if (me.mode === 'out') {
      me.rack -= 4 * dt;
      me.wait += dt;
      if (me.wait > 1.4) me.done = true;
    }
    me.slide(dt);
  };
  me.draw = () => {
    drawHall();
    drawRack(me.rack);
    for (const item of items) {
      if (!item.placed && item !== me.held) door(item, item.at[0] + me.rack, item.at[1], !item.back && me.mode === 'work' && !me.held ? breath() : 1);
    }
    drawCar();
    if (me.target) {
      // The opening the carried door belongs to.
      ctx.save();
      if (side) {
        ctx.translate(LONG, 0);
        ctx.scale(-1, 1);
      }
      glow(DOORS[me.target.index]);
      ctx.restore();
    }
    if (me.held) door(me.held, me.held.at[0], me.held.at[1]);
  };
  return me;
}

/* Jobs 7 and 9, the wheels of one side. They come standing on a low cart; a
   wheel is rolled off it and along the floor to a hub, and goes on it. Then it is seen close: its five bolts stand out, and
   the wheel wrench, taken from its mat, turns each one home. The wrench's
   socket sits on the bolt and its long handle sweeps round it like the hand
   of a clock. A bolt glows only while the wrench is in the hand and coming
   near it. */
function wheelsStage(side) {
  const SWEEP = 1.3; // seconds to turn a bolt home
  const CARRY = -0.95; // how the handle hangs from the socket while carried
  const me = { name: side ? 'wheels-b' : 'wheels-a', kind: 'hall', box: HALL, ctl: '', mode: 'in', hub: -1, held: null, id: null, on: -1, near: -1, tick: 0, tight: 0, wait: 0, said: false, done: false, side };
  const hubX = (i) => (side ? LONG - AXLE[i] : AXLE[i]);
  const loose = [{ home: -1.0 }, { home: -1.9 }].map((wheel) => ({ ...wheel, x: wheel.home, rot: 0, on: false }));
  let cart = -5; // how far the cart still has to come, then how far it has gone
  // How high a wheel stands at x: on the cart's deck, down its lip, on the floor.
  const deck = (x) => 0.12 * clamp((-0.2 - x) / 0.25, 0, 1);
  const wrench = { at: [0, 0], a: CARRY, held: false, back: false };
  const rest = () => [hubX(me.hub), -0.36];
  const spots = () => [0, 1, 2, 3, 4].map((k) => boltAt(side, me.hub, k));
  me.down = (event) => {
    if (me.id !== null) return;
    const point = at(event);
    if (me.mode === 'roll') {
      const wheel = loose.filter((each) => !each.on).sort((a, b) => Math.abs(a.x - point[0]) - Math.abs(b.x - point[0]))[0];
      if (!wheel || far(point, [wheel.x, HUB + deck(wheel.x)]) > 0.6) return;
      me.held = wheel;
      wheel.grip = wheel.x - point[0];
    } else if (me.mode === 'bolt' && !me.tight) {
      if (far(point, wrench.back ? wrench.at : rest()) > 0.34) return;
      wrench.held = true;
      wrench.back = false;
      wrench.at = [point[0] - 0.04, point[1] + 0.12];
      word('wrench', me.said);
      me.said = true;
    } else {
      return;
    }
    me.id = event.pointerId;
    hold(event);
  };
  me.move = (event) => {
    if (event.pointerId !== me.id) return;
    const point = at(event);
    if (me.held) {
      // It rolls: it turns as far as it travels.
      const x = clamp(point[0] + me.held.grip, -2.2, 5.3);
      me.held.rot -= (x - me.held.x) / HUB;
      me.held.x = x;
    } else if (wrench.held) {
      wrench.at = [point[0] - 0.04, point[1] + 0.12];
    }
  };
  me.up = (event) => {
    if (event.pointerId !== me.id) return;
    me.id = null;
    me.held = null;
    me.on = me.near = -1;
    if (wrench.held) {
      wrench.held = false;
      wrench.back = true;
    }
  };
  me.update = (dt) => {
    hint('');
    if (me.mode === 'in') {
      // The cart brings the wheels, and the table turns if it must.
      const turned = turnTo(FACING[me.name] || 0, dt);
      cart = Math.min(0, cart + 4 * dt);
      if (turned && cart >= 0) me.mode = 'roll';
    } else if (me.mode === 'roll' && me.held) {
      // At a bare hub the wheel goes on, and the picture comes close.
      const i = [0, 1].find((each) => !car.wheels[side][each] && Math.abs(me.held.x - hubX(each)) < 0.14);
      if (i !== undefined) {
        me.held.on = true;
        car.wheels[side][i] = true;
        car.bolts[side][i] = [0, 0, 0, 0, 0];
        // The second side's picture is a mirror image, and so is the wheel's turn in it.
        car.rot[side][i] = side ? -me.held.rot : me.held.rot;
        me.held = null;
        me.id = null;
        me.hub = i;
        me.mode = 'bolt';
        me.tight = 0;
        me.box = [hubX(i) - 0.58, -0.58, hubX(i) + 0.58, 0.88];
        Object.assign(wrench, { at: rest(), a: CARRY, held: false, back: false });
        beep('click');
      }
    } else if (me.mode === 'bolt') {
      const bolts = car.bolts[side][me.hub];
      if (wrench.held) {
        const all = spots();
        let near = -1;
        let least = 0.15;
        all.forEach((spot, k) => {
          const d = far(spot, wrench.at);
          if (bolts[k] < 1 && d < least) {
            least = d;
            near = k;
          }
        });
        const on = least < 0.085 ? near : -1;
        me.near = near;
        me.on = on;
        if (on >= 0) {
          // The handle sweeps round, clockwise as we face the wheel, and the bolt goes in.
          bolts[on] = Math.min(1, bolts[on] + dt / SWEEP);
          wrench.a -= dt * TAU * 2.3;
          me.tick += dt;
          if (me.tick > 0.13) {
            me.tick = 0;
            beep('ratchet');
          }
          if (bolts[on] >= 1) {
            beep('tick');
            puff(all[on][0], all[on][1], 5, GOLD, { spread: 0.5, up: 0.6, g: 2, life: 0.35, r: 0.012 });
            me.on = me.near = -1;
          }
        } else {
          wrench.a = CARRY;
        }
      } else if (wrench.back) {
        const home = rest();
        const part = 1 - Math.exp(-dt / 0.12);
        wrench.at = [wrench.at[0] + (home[0] - wrench.at[0]) * part, wrench.at[1] + (home[1] - wrench.at[1]) * part];
        wrench.a = CARRY;
        if (far(wrench.at, home) < 0.02) wrench.back = false;
      }
      if (!me.tight && bolts.every((p) => p >= 1)) {
        // All five are home: the wrench goes back to its mat.
        me.tight = 0.001;
        me.on = me.near = -1;
        me.id = null;
        if (wrench.held) {
          wrench.held = false;
          wrench.back = true;
        }
        beep('chime');
        award(1, hubX(me.hub), HUB);
      }
      if (me.tight) {
        me.tight += dt;
        if (me.tight > 1.1) {
          car.bolts[side][me.hub] = null;
          me.box = HALL;
          me.hub = -1;
          if (loose.every((wheel) => wheel.on)) {
            me.mode = 'out';
            advance();
          } else {
            me.mode = 'roll';
          }
        }
      }
    } else if (me.mode === 'out') {
      cart -= 4 * dt;
      me.wait += dt;
      if (me.wait > 1.2) me.done = true;
    }
  };
  me.draw = () => {
    drawHall();
    drawWheelCart(cart);
    // The mats by the hubs, each with its wrench.
    for (const i of [0, 1]) {
      const x = hubX(i);
      box(x - 0.44, -0.5, 0.88, 0.28, 0.05, '#55616B');
      if (i === me.hub && (wrench.held || wrench.back)) continue;
      const waits = i === me.hub && !me.tight;
      ctx.save();
      ctx.translate(x, -0.36);
      if (waits) ctx.scale(breath(), breath());
      wrenchFlat();
      ctx.restore();
    }
    drawCar(me.hub >= 0 && me.near >= 0 ? { side, hub: me.hub, bolt: me.near } : null);
    for (const wheel of loose) {
      if (wheel.on) continue;
      const waits = me.mode === 'roll' && !me.held;
      ctx.save();
      ctx.translate(wheel.x + cart, HUB + deck(wheel.x));
      if (waits) ctx.scale(breath(), breath());
      wheelFace(0, 0, wheel.rot, [0, 0, 0, 0, 0]);
      ctx.restore();
    }
    if (me.hub >= 0 && (wrench.held || wrench.back)) {
      const tip = me.on >= 0 ? spots()[me.on] : wrench.at;
      wrenchOn(tip[0], tip[1], wrench.a);
    }
  };
  return me;
}

/* Job 10, the headlights. The car turns to face us; the two lamps come on a
   cart, and each fits its own side. Pushed in, a lamp lights. */
function lightsStage() {
  const me = { name: 'lights', kind: 'hall', box: [-2.1, -0.6, 4.3, 2.75], ctl: '', mode: 'in', cart: -6, wait: 0, done: false };
  const items = [
    { kind: 'left', index: 0, home: [-1.42, 0.93], half: [0.27, 0.16] },
    { kind: 'right', index: 1, home: [-0.78, 0.93], half: [0.27, 0.16] },
  ].map((item) => ({ ...item, at: [...item.home], placed: false, back: false }));
  const slots = [0, 1].map((i) => ({ kind: i ? 'right' : 'left', index: i, x: MID + (i ? LAMP_AT[0] : -LAMP_AT[0]), y: LAMP_AT[1], free: true }));
  carry(me, items, slots, {
    near: 0.5, lift: 0.22,
    placed(item) {
      car.lights[item.index] = true;
      beep('click');
      beep('tick');
      award(1, item.at[0], item.at[1]);
      if (!items.every((each) => each.placed)) return;
      me.mode = 'out';
      beep('chime');
      advance();
    },
  });
  me.update = (dt) => {
    hint('');
    if (me.mode === 'in') {
      const turned = turnTo(FACING.lights, dt);
      me.cart = Math.min(0, me.cart + 4 * dt);
      if (turned && me.cart >= 0) me.mode = 'work';
    } else if (me.mode === 'out') {
      me.cart -= 4 * dt;
      me.wait += dt;
      if (me.wait > 1.5) me.done = true;
    }
    me.slide(dt);
  };
  me.draw = () => {
    drawHall();
    drawCar();
    drawLampCart(me.cart);
    for (const item of items) {
      if (item.placed || item === me.held) continue;
      const waits = !item.back && me.mode === 'work' && !me.held;
      ctx.save();
      ctx.translate(item.at[0] + me.cart, item.at[1]);
      if (waits) ctx.scale(breath(), breath());
      drawLamp(0, 0, item.index === 0, false);
      ctx.restore();
    }
    if (me.target) {
      ctx.save();
      ctx.translate(me.target.x, me.target.y);
      if (me.target.index === 0) ctx.scale(-1, 1);
      glow(LAMP);
      ctx.restore();
    }
    if (me.held) drawLamp(me.held.at[0], me.held.at[1], me.held.index === 0, false);
  };
  return me;
}

/* The ending. The finished car turns through its views to show its back,
   its engine revs three times (the exhaust puffs, the car shakes a little),
   and then الْحَمْدُ لِلَّهِ shows and is said while it turns side on. */
function showStage() {
  const me = { name: 'done', kind: 'hall', box: SHOW, ctl: '', mode: 'turn', t: 0, long: 0, praised: false, done: false };
  const goal = Math.ceil((car.turn - 1) / 4) * 4 + 1; // its back toward us, turning on from where it is
  me.update = (dt) => {
    hint('');
    if (me.mode === 'turn') {
      if (turnTo(goal, dt)) {
        me.mode = 'rev';
        me.long = beep('rev', 3) || 3.15;
        car.braking = true;
      }
    } else if (me.mode === 'rev') {
      me.t += dt;
      const each = me.long / 3;
      const part = (me.t % each) / each;
      const push = me.t < me.long && part < 0.7 ? Math.sin((part / 0.7) * Math.PI) : 0;
      car.shake = push;
      if (push > 0.25) {
        for (const sign of [-1, 1]) {
          if (Math.random() < 0.5) puff(MID + sign * 0.5, 0.44, 1, 'rgba(120,120,125,.55)', { spread: 0.25, up: 0.5, g: -0.6, life: 0.9, r: 0.05, grow: 0.25 });
        }
      }
      if (me.t > me.long + 0.5 && !me.praised) {
        me.praised = true;
        car.shake = 0;
        car.braking = false;
        me.mode = 'rest';
        me.box = WORDS_ABOVE;
        praise();
      }
    } else {
      turnTo(goal + 1, dt);
    }
  };
  me.draw = () => {
    drawHall();
    drawCar();
  };
  return me;
}

/* One job after another. advance() is called the moment a job's work is
   done, so it is kept even if the child leaves before the next one starts. */
function advance() {
  saved = Math.min(STAGES.length, STAGES.indexOf(stage.name) + 1);
  save();
  paintSteps();
}

function paintSteps() {
  [...$('steps').children].forEach((dot, i) => dot.classList.toggle('on', i < saved));
}

const MAKERS = {
  chassis: chassisStage,
  engine: engineStage,
  seats: seatsStage,
  paint: paintStage,
  body: bodyStage,
  'doors-a': () => doorsStage(0),
  'wheels-a': () => wheelsStage(0),
  'doors-b': () => doorsStage(1),
  'wheels-b': () => wheelsStage(1),
  lights: lightsStage,
};

function begin(index) {
  const before = stage ? stage.kind : '';
  beep('spray', 0);
  beep('engineOff');
  letGo();
  hint('');
  bits = [];
  if (index >= STAGES.length) {
    stage = showStage();
    beep('ambience', null);
    $('word').hidden = true;
  } else {
    const name = STAGES[index];
    stage = MAKERS[name]();
    word(name.replace(/-.$/, ''));
  }
  root.dataset.stage = stage.name;
  root.dataset.buttons = stage.ctl; // which of the four buttons this job shows
  if (stage.kind !== before) {
    veil = before ? 1 : 0;
    follow(0);
  }
}

/* The car is done: the words, the stars, and the way to build another. */
async function praise() {
  saved = 0; // the next visit starts another car
  stars += 5;
  save();
  $('done-stars').innerHTML = `${STAR}<span>${arabic(5)}</span>`;
  $('done-controls').hidden = true;
  show('done');
  beep('chime');
  flyStar(width / 2, height * 0.6);
  const mine = ++run;
  await delay(700);
  if (mine !== run) return;
  await within(sound.say('alhamdulillah'), 6000);
  if (mine !== run) return;
  await delay(600);
  if (mine !== run) return;
  $('done-controls').hidden = false;
}

function update(dt) {
  clock += dt;
  veil = Math.max(0, veil - dt / 0.45);
  for (const bit of bits) {
    bit.age += dt;
    bit.vy -= bit.g * dt;
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
    bit.r += bit.grow * dt;
  }
  bits = bits.filter((bit) => bit.age < bit.life);
  if (!stage) return;
  stage.update(dt);
  follow(dt);
  if (stage.done) begin(STAGES.indexOf(stage.name) + 1);
}

/* Drawing. Shapes are given in the floor's lengths, y up. */
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
  ctx.arc(x, y, r, 0, TAU);
  paint(fill, line);
}

function shape(points, fill, line = true) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  paint(fill, line);
}

/* Lines from x0, y0 to x1, y1, `thick` times as thick as an outline. */
function lines(points, color = INK, thick = 1) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = ink * thick;
  ctx.beginPath();
  for (const [x0, y0, x1, y1] of points) {
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  }
  ctx.stroke();
  ctx.restore();
}

/* A ready-made outline, filled and lined. */
function put(path, fill, line = true, rule = 'nonzero') {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(path, rule);
  }
  if (line) ctx.stroke(path);
}

/* The pen for the floor: its lengths, y up, a dark line. */
function onFloor() {
  ctx.setTransform(dpr * cam.s, 0, 0, -dpr * cam.s, cam.ox * dpr, cam.oy * dpr);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink;
}

/* The part of the floor on the screen, left to right. */
const span = () => [-cam.ox / cam.s - 0.5, (width - cam.ox) / cam.s + 0.5];

/* A place waiting for its part: a dashed outline, gold and filled when the
   part is near. */
function ghost(trace, lit) {
  ctx.save();
  ctx.setLineDash([ink * 3, ink * 3]);
  ctx.lineWidth = ink * 1.3;
  ctx.strokeStyle = lit ? GOLD : 'rgba(43,31,22,.55)';
  ctx.globalAlpha = lit ? 1 : 0.6;
  ctx.beginPath();
  trace();
  if (lit) {
    ctx.fillStyle = 'rgba(242,184,75,.4)';
    ctx.fill();
  }
  ctx.stroke();
  ctx.restore();
}

/* The gold light around a place whose own part is coming near. */
function glow(path) {
  ctx.save();
  ctx.strokeStyle = `rgba(242,184,75,${(0.75 + 0.25 * Math.sin(clock * 7)).toFixed(2)})`;
  ctx.lineWidth = ink * 3.2;
  ctx.fillStyle = 'rgba(242,184,75,.3)';
  ctx.fill(path);
  ctx.stroke(path);
  ctx.restore();
}

/* A gold ring that breathes: this is the thing to take. */
function ring(x, y, r) {
  ctx.save();
  ctx.strokeStyle = `rgba(242,184,75,${(0.6 + 0.35 * Math.sin(clock * 5)).toFixed(2)})`;
  ctx.lineWidth = ink * 2.4;
  ctx.beginPath();
  ctx.arc(x, y, r * (1 + 0.05 * Math.sin(clock * 5)), 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/* The hall, side on: the wall and its windows, the hoist's rail, the floor,
   the line with its rollers, and the round plate at the station. */
function drawHall() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#EDE8DE';
  ctx.fillRect(0, 0, width, height);
  onFloor();
  const [x0, x1] = span();
  ctx.fillStyle = '#DAD3C5';
  ctx.fillRect(x0, 4.25, x1 - x0, 30);
  ctx.save();
  ctx.strokeStyle = '#B9B2A5';
  for (let x = Math.floor(x0 / 2.7) * 2.7 + 0.45; x < x1; x += 2.7) {
    box(x, 1.95, 1.8, 1.15, 0.06, '#FFFDF6');
    lines([[x + 0.9, 1.95, x + 0.9, 3.1], [x, 2.52, x + 1.8, 2.52]], '#B9B2A5', 0.8);
  }
  ctx.restore();
  // The rail, hung from the roof.
  for (let x = Math.floor(x0 / 2.7) * 2.7; x < x1; x += 2.7) lines([[x, RAIL + 0.14, x, 4.25]], IRON, 2);
  ctx.fillStyle = DARK;
  ctx.fillRect(x0, RAIL, x1 - x0, 0.14);
  lines([[x0, RAIL, x1, RAIL], [x0, RAIL + 0.14, x1, RAIL + 0.14]]);
  // The floor and the line.
  ctx.fillStyle = '#CFC8BA';
  ctx.fillRect(x0, -30, x1 - x0, 30);
  lines([[x0, 0, x1, 0]], '#A9A191', 1);
  ctx.fillStyle = DARK;
  ctx.fillRect(x0, -0.2, x1 - x0, 0.17);
  lines([[x0, -0.2, x1, -0.2], [x0, -0.03, x1, -0.03]]);
  ctx.fillStyle = STEEL;
  for (let x = Math.floor(x0 / 0.5) * 0.5 + (((line % 0.5) + 0.5) % 0.5); x < x1; x += 0.5) {
    ctx.beginPath();
    ctx.arc(x, -0.115, 0.05, 0, TAU);
    ctx.fill();
  }
  drawPlate();
}

/* The plate in the floor that turns the car: round, and from where we stand,
   low and to the side, a flat ellipse, its far edge at the foot of the wall
   and its near edge toward us, with the thickness of its rim below. The
   marks near its edge go round with the car: those on the near side travel
   one way, those on the far side the other. */
const PLATE = { y: -0.13, rx: 2.9, ry: 0.13, deep: 0.06 };
function drawPlate() {
  const { y, rx, ry, deep } = PLATE;
  const a = (car.turn * Math.PI) / 2;
  ctx.beginPath();
  ctx.moveTo(MID - rx, y);
  ctx.lineTo(MID - rx, y - deep);
  ctx.ellipse(MID, y - deep, rx, ry, 0, Math.PI, TAU);
  ctx.lineTo(MID + rx, y);
  ctx.closePath();
  paint('#7F868D', true);
  ctx.beginPath();
  ctx.ellipse(MID, y, rx, ry, 0, 0, TAU);
  paint('#A9AFB6', true);
  ctx.save();
  ctx.lineWidth = ink * 0.7;
  ctx.strokeStyle = 'rgba(43,31,22,.3)';
  ctx.beginPath();
  ctx.ellipse(MID, y, rx * 0.84, ry * 0.84, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
  const grey = [];
  const gold = [];
  for (let i = 0; i < 16; i++) {
    const [dx, dy] = [Math.cos(a + (i * TAU) / 16), Math.sin(a + (i * TAU) / 16)];
    const marks = i % 8 ? grey : gold;
    marks.push([MID + dx * rx * 0.88, y + dy * ry * 0.88, MID + dx * rx * 0.97, y + dy * ry * 0.97]);
    // On the near half the mark runs on down the rim.
    if (dy < -0.05) marks.push([MID + dx * rx, y + dy * ry - deep * 0.2, MID + dx * rx, y + dy * ry - deep * 0.85]);
  }
  lines(grey, 'rgba(43,31,22,.5)', 0.9);
  lines(gold, INK, 2.6);
  lines(gold, GOLD, 1.5);
}

/* The paint booth: bright walls, lamps overhead, a grating underfoot. */
function drawBooth() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#F2F4F3';
  ctx.fillRect(0, 0, width, height);
  onFloor();
  const [x0, x1] = span();
  const seams = [];
  for (let x = Math.floor(x0 / 1.5) * 1.5; x < x1; x += 1.5) seams.push([x, 0, x, 4.25]);
  lines(seams, '#DDE1E0', 1);
  ctx.fillStyle = '#DCE0DF';
  ctx.fillRect(x0, 4.25, x1 - x0, 30);
  for (let x = Math.floor(x0 / 2.2) * 2.2 + 0.3; x < x1; x += 2.2) box(x, 3.98, 1.5, 0.14, 0.05, '#FFF9D8');
  ctx.fillStyle = DARK;
  ctx.fillRect(x0, RAIL, x1 - x0, 0.14);
  lines([[x0, RAIL, x1, RAIL], [x0, RAIL + 0.14, x1, RAIL + 0.14]]);
  ctx.fillStyle = '#B4BBC0';
  ctx.fillRect(x0, -30, x1 - x0, 30);
  const bars = [[x0, 0, x1, 0]];
  for (let x = Math.floor(x0 / 0.3) * 0.3; x < x1; x += 0.3) bars.push([x, 0, x - 0.25, -1.4]);
  for (const y of [-0.22, -0.5, -0.86]) bars.push([x0, y, x1, y]);
  lines(bars, 'rgba(43,31,22,.3)', 0.7);
}

/* The floor seen from above: the line across it, and the cart's lane. */
function drawFloorAbove() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#CFC8BA';
  ctx.fillRect(0, 0, width, height);
  onFloor();
  const [x0, x1] = span();
  ctx.fillStyle = '#5B5F66';
  ctx.fillRect(x0, -1.1, x1 - x0, 2.2);
  const slats = [];
  for (let x = Math.floor(x0 / 0.5) * 0.5; x < x1; x += 0.5) slats.push([x, -1.1, x, 1.1]);
  lines(slats, 'rgba(0,0,0,.25)', 0.8);
  lines([[x0, -1.1, x1, -1.1], [x0, 1.1, x1, 1.1]]);
  lines([[x0, -1.22, x1, -1.22], [x0, 1.22, x1, 1.22]], GOLD, 1.6);
}

/* The hoist: its trolley on the rail, the chain, and the hook whose tip is
   at y. With a carrier under it, the chain ends on the carrier's beam. */
function drawHoist(x, y, carrier = false) {
  box(x - 0.3, RAIL - 0.2, 0.6, 0.24, 0.05, GOLD);
  disc(x - 0.18, RAIL + 0.07, 0.06, DARK);
  disc(x + 0.18, RAIL + 0.07, 0.06, DARK);
  const end = carrier ? y : y + 0.3;
  lines([[x - 0.035, RAIL - 0.2, x - 0.035, end], [x + 0.035, RAIL - 0.2, x + 0.035, end]], INK, 1.2);
  if (carrier) return;
  box(x - 0.13, y + 0.12, 0.26, 0.2, 0.04, GOLD);
  ctx.save();
  ctx.lineWidth = ink * 2.6;
  ctx.beginPath();
  ctx.moveTo(x, y + 0.12);
  ctx.lineTo(x, y + 0.1);
  ctx.arc(x, y + 0.05, 0.05, Math.PI / 2, -Math.PI, true);
  ctx.stroke();
  ctx.restore();
}

/* The carrier a body hangs from: a beam, and two arms that reach in through
   the door openings and hold the roof from inside. Drawn over the body. */
function drawCarrier() {
  for (const x of [1.8, 2.76]) {
    lines([[x, 2.0, x, 1.56], [x, 1.56, x + 0.14, 1.56]], INK, 3);
    lines([[x, 2.0, x, 1.56], [x, 1.56, x + 0.14, 1.56]], GOLD, 1.6);
  }
  box(1.25, 1.96, 2.4, 0.12, 0.04, GOLD);
}

/* The dolly the engine comes on. */
function drawDolly(x) {
  lines([[x - 0.6, 0.3, x - 0.78, 0.95], [x - 0.86, 0.95, x - 0.7, 0.95]], INK, 2.4);
  box(x - 0.62, 0.24, 1.24, 0.12, 0.04, ORANGE);
  disc(x - 0.42, 0.12, 0.12, DARK);
  disc(x + 0.42, 0.12, 0.12, DARK);
  disc(x - 0.42, 0.12, 0.04, STEEL, false);
  disc(x + 0.42, 0.12, 0.04, STEEL, false);
}

/* The engine, side on, its lower back corner at x, y: the block, the head
   with its ribs, the belt and its wheels at the front, the pipes that take
   the air in, and the eye the hook lifts it by. */
function drawEngine(x, y) {
  ctx.save();
  ctx.translate(x, y);
  box(0.02, 0, 0.82, 0.3, 0.05, '#7C848C');
  box(0.1, 0.27, 0.68, 0.14, 0.04, '#A9AFB6');
  lines([[0.22, 0.29, 0.22, 0.39], [0.34, 0.29, 0.34, 0.39], [0.46, 0.29, 0.46, 0.39], [0.58, 0.29, 0.58, 0.39], [0.7, 0.29, 0.7, 0.39]], 'rgba(43,31,22,.5)', 0.8);
  box(0.14, 0.39, 0.2, 0.06, 0.03, RED);
  box(0.54, 0.39, 0.2, 0.06, 0.03, RED);
  box(0.0, 0.06, 0.12, 0.16, 0.03, '#5F666E');
  lines([[0.84, 0.13, 0.86, 0.27]], INK, 4.4);
  disc(0.85, 0.11, 0.1, DARK);
  disc(0.85, 0.11, 0.04, STEEL, false);
  disc(0.86, 0.29, 0.065, DARK);
  disc(0.86, 0.29, 0.025, STEEL, false);
  lines([[0.2, 0.08, 0.66, 0.08], [0.2, 0.16, 0.66, 0.16]], 'rgba(43,31,22,.35)', 0.8);
  ctx.save();
  ctx.lineWidth = ink * 1.8;
  ctx.beginPath();
  ctx.arc(ENGINE.w / 2, 0.47, 0.045, 0, TAU);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/* A wheel, face on: the tire, the rim with its five spokes, and the five
   bolts. bolts gives how far each is in (0 standing out, 1 home), or nothing
   when all are tight; lit is the one that glows. sense is -1 where the
   picture is drawn as a mirror image, so that a bolt still turns clockwise. */
function wheelFace(x, y, rot, bolts = null, lit = -1, sense = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  disc(0, 0, HUB, TYRE);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.14)';
  ctx.beginPath();
  ctx.arc(0, 0, 0.335, 0, TAU);
  ctx.stroke();
  ctx.restore();
  disc(0, 0, 0.275, RIM);
  ctx.fillStyle = IRON;
  for (let k = 0; k < 5; k++) {
    const a = Math.PI / 2 + ((k + 0.5) * TAU) / 5;
    ctx.beginPath();
    ctx.arc(0, 0, 0.245, a - 0.44, a + 0.44);
    ctx.arc(0, 0, 0.178, a + 0.32, a - 0.32, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  disc(0, 0, 0.052, STEEL);
  ctx.restore();
  for (let k = 0; k < 5; k++) {
    const [dx, dy] = boltOff(rot, k);
    drawBolt(x + dx, y + dy, bolts ? bolts[k] : 1, lit === k, sense);
  }
}

/* A wheel bolt's six-sided head, face on. Standing out it is bright and
   throws a shadow; turned home it is flush and dull. */
function drawBolt(x, y, p, lit, sense = 1) {
  const out = 1 - p;
  if (lit) {
    ctx.save();
    ctx.fillStyle = 'rgba(242,184,75,.45)';
    ctx.beginPath();
    ctx.arc(x, y, 0.066, 0, TAU);
    ctx.fill();
    ctx.restore();
    ring(x, y, 0.066);
  }
  if (out > 0.02) disc(x + sense * out * 0.016, y - out * 0.018, 0.036 + out * 0.004, 'rgba(43,31,22,.4)', false);
  const r = 0.032 + out * 0.008;
  const turn = -sense * p * TAU * 3;
  ctx.save();
  ctx.lineWidth = ink * 0.7;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = turn + (i * TAU) / 6;
    if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  paint(out > 0.02 ? '#F4F6F8' : '#9AA1A8', true);
  disc(x, y, r * 0.42, out > 0.02 ? '#C8CDD2' : '#7C848C', false);
  ctx.restore();
}

/* A bare hub: the spring behind it, the brake's disc with its red grip, and
   the five holes the bolts go into. */
function drawHub(x) {
  const coil = [];
  for (let i = 0; i < 8; i++) coil.push([x + (i % 2 ? 0.06 : -0.06), 0.46 + i * 0.045, x + (i % 2 ? -0.06 : 0.06), 0.505 + i * 0.045]);
  lines([[x, 0.44, x, 0.84]], IRON, 2.2);
  lines(coil, INK, 2.2);
  lines(coil, GOLD, 1);
  box(x - 0.09, 0.8, 0.18, 0.05, 0.02, IRON);
  disc(x, HUB, 0.2, RIM);
  ctx.save();
  ctx.lineWidth = ink * 0.6;
  ctx.beginPath();
  ctx.arc(x, HUB, 0.15, 0, TAU);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineWidth = 0.085;
  ctx.beginPath();
  ctx.arc(x, HUB, 0.19, 1.9, 2.95);
  ctx.stroke();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 0.085 - ink * 2;
  ctx.beginPath();
  ctx.arc(x, HUB, 0.19, 1.9 + ink * 4, 2.95 - ink * 4);
  ctx.stroke();
  ctx.restore();
  disc(x, HUB, 0.062, '#5F666E');
  for (let k = 0; k < 5; k++) {
    const a = Math.PI / 2 + (k * TAU) / 5;
    disc(x + Math.cos(a) * RING, HUB + Math.sin(a) * RING, 0.02, TYRE, false);
  }
}

/* The chassis, side on: the stand it rides on, the exhaust, the long rails,
   the floor, the engine's mounts, and the cooler at the nose. */
function drawFrame() {
  box(1.55, 0.03, 1.8, 0.12, 0.03, GOLD);
  box(1.72, 0.15, 0.12, 0.16, 0.02, GOLD);
  box(3.06, 0.15, 0.12, 0.16, 0.02, GOLD);
  lines([[0.7, 0.25, 3.3, 0.25]], INK, 2.6);
  lines([[0.7, 0.25, 3.3, 0.25]], STEEL, 1.3);
  box(0.24, 0.17, 0.52, 0.15, 0.06, '#A9AFB6');
  box(0.06, 0.2, 0.2, 0.07, 0.02, RIM);
  box(0.25, 0.3, 4.35, 0.14, 0.05, IRON);
  box(1.15, 0.43, 2.35, 0.07, 0.02, STEEL);
  box(3.52, 0.43, 0.14, 0.05, 0.01, GOLD);
  box(4.2, 0.43, 0.14, 0.05, 0.01, GOLD);
  box(4.48, 0.43, 0.1, 0.5, 0.02, '#5F666E');
  lines([[4.53, 0.5, 4.53, 0.88]], 'rgba(255,255,255,.3)', 0.8);
}

/* A seat, side on, facing the nose: x0 is the back of its cushion. */
function seatSide(x0) {
  shape([[x0 + 0.02, 0.6], [x0 + 0.17, 0.62], [x0 + 0.07, 1.25], [x0 - 0.08, 1.23]], SEAT);
  box(x0 - 0.11, 1.25, 0.16, 0.19, 0.05, '#B08D60');
  box(x0, 0.5, 0.52, 0.17, 0.06, SEAT);
}

/* A door: its panel, its glass, its handle, and on the front one the mirror
   (left off while the car turns, when the mirror is drawn standing out). */
function drawDoor(i, tint, mirror = true) {
  put(DOORS[i], tint);
  put(DOOR_GLASS[i], GLASS);
  const x = i ? 1.4 : 2.38;
  box(x, 1.05, 0.2, 0.05, 0.02, '#E9EDF0');
  if (i === 0 && mirror) shape([[3.3, 1.15], [3.5, 1.15], [3.53, 1.25], [3.44, 1.29], [3.33, 1.27]], tint);
}

/* The body's shell, with its openings for the doors, and the doors that are
   on. In the booth the back window and the tail lamp are covered with paper,
   and the paint so far lies on the bare metal. */
function drawBody(tint, doors, o = {}) {
  put(SHELL_CUT, tint, false, 'evenodd');
  if (o.layer) {
    ctx.save();
    ctx.clip(SHELL_CUT, 'evenodd');
    ctx.drawImage(o.layer, 0, 0.3, LONG, 1.5);
    if (o.fill) {
      ctx.globalAlpha = o.fill;
      ctx.fillStyle = BLUE;
      ctx.fillRect(0, 0, LONG, 2);
    }
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(20,24,30,.55)';
  ctx.fillRect(1.44, 0.36, 1.98, 0.065);
  shape([[4.7, 0.42], [4.86, 0.5], [4.85, 0.62], [4.66, 0.56]], '#30343A');
  put(TAIL, o.booth ? MASK : car.braking ? '#FF5A45' : RED);
  const lamp = car.lights[0] || car.lights[1];
  put(NOSE_LAMP, o.booth ? CABIN : lamp ? '#FFF3C4' : CABIN);
  ctx.stroke(SHELL_CUT);
  put(QUARTER, o.booth ? MASK : GLASS);
  for (const i of [0, 1]) {
    if (doors[i]) drawDoor(i, tint, !o.turning);
  }
}

/* One side of the car from its sill up, nose to the right: the dark of the
   wheel wells, the hubs, the cabin seen through the openings, the seats, and
   the body with the doors that are on. */
function drawFlank(side, turning = false) {
  for (const x of AXLE) {
    if (car.body) {
      // The dark of the wheel well.
      ctx.beginPath();
      ctx.arc(x, 0.36, 0.46, 0, Math.PI);
      ctx.closePath();
      paint('#2A2D33', false);
    }
    drawHub(x);
  }
  if (car.body) {
    put(DOORS[0], CABIN, false);
    put(DOORS[1], CABIN, false);
    put(QUARTER, CABIN, false);
  }
  if (car.seats) {
    seatSide(1.36);
    seatSide(2.32);
  }
  if (car.body) drawBody(BLUE, car.doors[side], { turning });
}

/* The car side on, nose to the right: the wheels of the far side, the
   chassis and what is on it, the body, the wheels of this side. `close`
   names the bolt that glows. */
function drawSide(side, close) {
  for (const i of [0, 1]) {
    if (!car.wheels[1 - side][i]) continue;
    wheelFace(AXLE[i], HUB, 0);
    disc(AXLE[i], HUB, HUB, 'rgba(20,20,24,.45)', false);
  }
  drawFrame();
  if (car.engine) drawEngine(MOUNT[0], MOUNT[1]);
  drawFlank(side);
  for (const i of [0, 1]) {
    if (!car.wheels[side][i]) continue;
    const lit = close && close.side === side && close.hub === i ? close.bolt : -1;
    wheelFace(AXLE[i], HUB, car.rot[side][i], car.bolts[side][i], lit, side ? -1 : 1);
  }
}

/* A headlight, face on, at x, y: `left` is the one for the left of the
   picture. Lit, it shines. */
function drawLamp(x, y, left, lit) {
  ctx.save();
  ctx.translate(x, y);
  if (left) ctx.scale(-1, 1);
  if (lit) {
    const shine = ctx.createRadialGradient(0.04, 0, 0.1, 0.04, 0, 0.4);
    shine.addColorStop(0, 'rgba(255,244,190,.6)');
    shine.addColorStop(1, 'rgba(255,244,190,0)');
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.arc(0.04, 0, 0.4, 0, TAU);
    ctx.fill();
  }
  put(LAMP, lit ? '#FFF6CF' : '#E6EDF2');
  disc(0.13, 0.005, 0.07, lit ? '#FFFFFF' : '#B9C4CC');
  disc(-0.04, -0.03, 0.05, lit ? '#FFFFFF' : '#B9C4CC');
  ctx.restore();
}

/* The body from the front or from the back, x from its middle: the shell,
   the glass, the lamps. What is under it and beside it (the wheels, the
   stand, the mirrors) is drawn by the turning car. While the car turns,
   the shell's own line is drawn only up to the belt: above it the hood and
   the roof lean away, and the turning car draws its own lines there. */
function drawEndBody(front, turning = false) {
  put(END, BLUE, !turning);
  if (turning) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-2, 0, 4, BELT);
    ctx.clip();
    ctx.stroke(END);
    ctx.restore();
  }
  if (front) {
    put(WINDSHIELD, '#BFE0F2');
    ctx.save();
    ctx.clip(WINDSHIELD);
    for (const x of [-0.42, 0.42]) box(x - 0.13, 1.1, 0.26, 0.34, 0.07, '#8FA9B8', false);
    ctx.restore();
    ctx.save();
    ctx.lineWidth = ink * 0.8;
    ctx.beginPath();
    ctx.moveTo(-0.92, 1.0);
    ctx.quadraticCurveTo(0, 1.06, 0.92, 1.0);
    ctx.moveTo(-0.42, 1.18);
    ctx.lineTo(-0.5, 1.03);
    ctx.moveTo(0.42, 1.18);
    ctx.lineTo(0.5, 1.03);
    ctx.stroke();
    ctx.restore();
    put(GRILLE, '#30343A');
    lines([[-0.46, 0.63, 0.46, 0.63], [-0.44, 0.54, 0.44, 0.54]], 'rgba(255,255,255,.22)', 0.8);
    box(0.62, 0.46, 0.28, 0.2, 0.06, '#30343A');
    box(-0.9, 0.46, 0.28, 0.2, 0.06, '#30343A');
    [-1, 1].forEach((sign, n) => {
      if (car.lights[n]) {
        drawLamp(sign * LAMP_AT[0], LAMP_AT[1], sign < 0, true);
      } else {
        ctx.save();
        ctx.translate(sign * LAMP_AT[0], LAMP_AT[1]);
        ctx.scale(sign, 1);
        put(LAMP, CABIN);
        ctx.restore();
      }
    });
  } else {
    put(BACK_GLASS, '#BFE0F2');
    lines([[-0.58, 1.64, 0.58, 1.64]], INK, 0.8);
    lines([[-0.86, 1.13, -0.82, 0.64], [-0.82, 0.64, 0.82, 0.64], [0.82, 0.64, 0.86, 1.13]], 'rgba(43,31,22,.45)', 0.8);
    if (car.braking) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,90,69,.3)';
      ctx.beginPath();
      ctx.ellipse(0, 1.01, 1.08, 0.2, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    put(LIGHT_BAR, car.braking ? '#FF5A45' : RED);
    put(DIFFUSER, '#30343A');
    for (const sign of [-1, 1]) {
      box(sign * 0.5 - 0.1, 0.39, 0.2, 0.11, 0.05, RIM);
      box(sign * 0.5 - 0.065, 0.415, 0.13, 0.06, 0.03, TYRE, false);
      box(sign * 0.86 - 0.06, 0.56, 0.12, 0.04, 0.015, RED);
    }
  }
}

/* The car while the table turns it, and when it stands end on.
   It turns as one solid thing, seen from where we stand: level with it, and
   far enough away that nothing grows or shrinks. At every angle two of its
   faces show, the side that is turning away and the end that is turning
   into view, the side narrowed by the angle's cosine and the end by its
   sine. A place on the car is given by u, along it from the back bumper,
   and v, across it from its middle line toward its right side; on the screen
   it is seen[0] * (u - MID) + seen[1] * v to the right of the car's middle. */
const seen = [1, 0];
const across = (u, v) => (u - MID) * seen[0] + v * seen[1];

/* How far the body reaches at each height, read once from its outlines: back
   and forward in the side view, and to each side in the end view. The roof
   is shorter and narrower than the sills, the hood lower than the roof; each
   strip of a face is set where the body really is at that height, which is
   what makes the two faces meet along the car's corner, from the bumper up
   the pillar to the roof, with nothing between them. */
const LOW = 0.36; // the sills
const BELT = 1; // below this the body's ends and sides stand upright
const ROW = 0.01;
const reach = { back: [], front: [], half: [] };
{
  const probe = document.createElement('canvas').getContext('2d');
  const edge = (path, y, out, inside) => {
    for (let i = 0; i < 14; i++) {
      const mid = (out + inside) / 2;
      if (probe.isPointInPath(path, mid, y)) inside = mid;
      else out = mid;
    }
    return (out + inside) / 2;
  };
  for (let j = 0; ; j++) {
    const y = Math.max(LOW + 0.006, LOW + j * ROW);
    const core = y < 1 ? null : [2.2, 2, 2.45].find((x) => probe.isPointInPath(SHELL, x, y));
    if ((y >= 1 && core === undefined) || !probe.isPointInPath(END, 0, y)) break;
    reach.back.push(edge(SHELL, y, -0.2, y < 1 ? 0.3 : core));
    reach.front.push(edge(SHELL, y, 5.1, y < 1 ? 4.6 : core));
    reach.half.push(y < 0.55 ? 0.99 : edge(END, y, 1.3, 0));
  }
}
const TOP = LOW + (reach.half.length - 1) * ROW;
const reachAt = (list, y) => {
  const at = clamp((y - LOW) / ROW, 0, list.length - 1);
  const j = Math.floor(at);
  const next = list[Math.min(list.length - 1, j + 1)];
  return list[j] + (next - list[j]) * (at - j);
};

/* What rides under the body, as plain blocks: the stand with its four legs
   and the exhaust pipe (a line) along it; behind them the exhaust's box and
   its tail; and the frame between the wheels. Each is u from, u to, v from,
   v to, y from, y to, the corners' rounding and the color. Side on they are
   the chassis's own drawing. */
const STAND = [
  [1.55, 3.35, -0.35, 0.35, 0.03, 0.15, 0.03, GOLD],
  [1.72, 1.84, -0.3, -0.18, 0.15, 0.31, 0.02, GOLD],
  [1.72, 1.84, 0.18, 0.3, 0.15, 0.31, 0.02, GOLD],
  [3.06, 3.18, -0.3, -0.18, 0.15, 0.31, 0.02, GOLD],
  [3.06, 3.18, 0.18, 0.3, 0.15, 0.31, 0.02, GOLD],
  [0.78, 3.3, 0, 0, 0.25, 0.25, 0, null],
];
const EXHAUST = [
  [0.24, 0.76, -0.3, 0.3, 0.17, 0.32, 0.06, '#A9AFB6'],
  [0.06, 0.26, -0.07, 0.07, 0.2, 0.27, 0.02, RIM],
];
const FRAME = [0.25, 4.6, -0.71, 0.71, 0.3, 0.44, 0.05, IRON];
const MIRROR = [3.3, 3.53, 0.95, 1.11, 1.15, 1.27, 0.04, BLUE];

/* A block of the car as the turn shows it: as wide as its length and its
   width make it at this angle. */
function block([u0, u1, v0, v1, y0, y1, r, fill]) {
  const xs = [across(u0, v0), across(u0, v1), across(u1, v0), across(u1, v1)];
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  if (fill) {
    box(x0, y0, x1 - x0, y1 - y0, r, fill);
    return;
  }
  lines([[x0, y0, x1, y1]], INK, 2.6);
  lines([[x0, y0, x1, y1]], STEEL, 1.3);
}

/* A wheel, or a bare hub's plate, as the turn shows it: a short drum lying
   across the car, its axle at u, from v0 to v1, r in radius. Side on it is a
   disc, end on a band, and in between a narrowed disc with its tread
   showing beside it. This traces its outline. */
function drum(u, v0, v1, r) {
  const [xa, xb] = [across(u, v0), across(u, v1)];
  const rx = Math.max(r * Math.abs(seen[0]), 0.0004);
  ctx.beginPath();
  ctx.ellipse(Math.min(xa, xb), HUB, rx, r, 0, Math.PI / 2, Math.PI * 1.5);
  ctx.ellipse(Math.max(xa, xb), HUB, rx, r, 0, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
}

/* One wheel of the turning car. On the side toward us its face shows, with
   the rim and the bolts; on the far side we see the wheel's dark back, under
   the car. A hub with no wheel yet shows its bare plate. */
function drawTurnedWheel(side, i, toward) {
  const sign = side ? -1 : 1;
  const on = car.wheels[side][i];
  const [inner, outer, r] = on ? [0.71 * sign, 0.99 * sign, HUB] : [0.865 * sign, 0.935 * sign, 0.2];
  const face = across(AXLE[i], toward ? outer : inner);
  const rest = across(AXLE[i], toward ? inner : outer);
  drum(AXLE[i], inner, outer, r);
  paint(on ? TYRE : RIM, true);
  if (!on) return;
  // The grooves of the tread, each a half ring on the part of the tire that shows.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.14)';
  ctx.lineWidth = ink * 0.8;
  for (const part of [0.32, 0.68]) {
    const x = face + (rest - face) * part;
    const from = rest < face ? Math.PI / 2 : -Math.PI / 2;
    ctx.beginPath();
    ctx.ellipse(x, HUB, Math.max(0.34 * Math.abs(seen[0]), 0.0004), 0.34, 0, from, from + Math.PI);
    ctx.stroke();
  }
  ctx.restore();
  if (Math.abs(seen[0]) > 0.02) {
    ctx.save();
    ctx.translate(face, 0);
    ctx.scale(seen[0], 1);
    wheelFace(0, HUB, toward ? car.rot[side][i] : 0, toward ? car.bolts[side][i] : null, -1, side ? -1 : 1);
    ctx.restore();
  }
  if (!toward) {
    drum(AXLE[i], inner, outer, r);
    paint(`rgba(20,20,24,${(0.45 * Math.abs(seen[0])).toFixed(3)})`, false);
  }
}

/* The two faces of the turning car are each drawn flat on a card of their
   own, at the screen's own fineness, and laid on the screen in thin level
   strips: every strip narrowed by the angle, and set where the body is at
   that height. */
const CARD_HIGH = 1.9;
const SIDE_CARD = { from: -0.15, to: 5.05, sheet: document.createElement('canvas') };
const END_CARD = { from: -1.2, to: 1.2, sheet: document.createElement('canvas') };

function paintCard(card, painter) {
  const fine = cam.s * dpr;
  const sheet = card.sheet;
  const w = Math.ceil(((card.to - card.from) * fine) / 64) * 64;
  const h = Math.ceil((CARD_HIGH * fine) / 64) * 64;
  if (sheet.width < w || sheet.height < h || sheet.width > w * 2) {
    sheet.width = w;
    sheet.height = h;
  }
  const main = ctx;
  ctx = sheet.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, sheet.width, sheet.height);
  ctx.setTransform(fine, 0, 0, -fine, -card.from * fine, sheet.height);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink;
  try {
    painter();
  } finally {
    ctx = main;
  }
}

/* Lays a card on the screen between the heights y0 and y1, `wide` times its
   own width, each strip's start shift(y) to the right of the car's middle.
   Strips are two screen dots high, or one where the body leans fast (the
   hood, the roof's edge). */
function layCard(card, wide, shift, y0, y1, lift) {
  const fine = cam.s * dpr;
  const sheet = card.sheet;
  const middle = (cam.ox + (car.x + MID) * cam.s) * dpr;
  const floor = Math.round((cam.oy - lift * cam.s) * dpr);
  const last = Math.min(sheet.height, Math.ceil(sheet.height - y0 * fine));
  let row = Math.max(0, Math.floor(sheet.height - y1 * fine));
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  while (row < last) {
    const y = (sheet.height - row - 0.5) / fine;
    const here = shift(y);
    const steep = Math.abs(shift(y - 1 / fine) - here) * fine > 0.6;
    const rows = steep || row + 1 >= last ? 1 : 2;
    const at = rows === 2 ? shift(y - 0.5 / fine) : here;
    ctx.setTransform(wide, 0, 0, 1, middle + (at + card.from * wide) * fine, 0);
    ctx.drawImage(sheet, 0, row, sheet.width, rows, 0, floor - sheet.height + row, sheet.width, rows);
    row += rows;
  }
  ctx.restore();
}

/* The outline of the turning body: at each height, from its leftmost corner
   to its rightmost. Filled, it is the body's color behind the two faces;
   stroked, the dark line round the whole car. */
function traceBody(closed) {
  const [c, s] = seen;
  const left = [];
  const right = [];
  reach.half.forEach((half, j) => {
    const [a, b] = [(reach.back[j] - MID) * c, (reach.front[j] - MID) * c];
    left.push([Math.min(a, b) - half * Math.abs(s), LOW + j * ROW]);
    right.push([Math.max(a, b) + half * Math.abs(s), LOW + j * ROW]);
  });
  ctx.beginPath();
  left.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  right.reverse().forEach(([x, y]) => ctx.lineTo(x, y));
  if (closed) ctx.closePath();
}

function drawTurned(angle, lift) {
  const [c, s] = [Math.cos(angle), Math.sin(angle)].map((value) => (Math.abs(value) < 1e-9 ? 0 : value));
  seen[0] = c;
  seen[1] = s;
  const near = c < 0 ? 1 : 0; // the side toward us
  const sign = near ? -1 : 1;
  const front = s < 0; // the end toward us
  const ends = front ? reach.front : reach.back;
  // The wheels of one side, the farther from us first.
  const wheels = (side) => [0, 1].sort((a, b) => (AXLE[b] - AXLE[a]) * s).map((i) => [side, i]);
  for (const [side, i] of wheels(1 - near)) drawTurnedWheel(side, i, false);
  for (const i of [0, 1]) {
    // The plate of a bare hub on our side: its face is on the side's card.
    if (!car.wheels[near][i]) drawTurnedWheel(near, i, true);
  }
  // Under the car, what is nearer to us last: the exhaust's box is at the back.
  const under = s < 0 ? [EXHAUST[1], EXHAUST[0], ...STAND] : [...STAND, ...EXHAUST];
  for (const each of under) block(each);
  block(FRAME);
  const mirror = (side) => {
    if (!car.body || !car.doors[side][0]) return;
    const [u0, u1, v0, v1, ...others] = MIRROR;
    block(side ? [u0, u1, -v1, -v0, ...others] : [u0, u1, v0, v1, ...others]);
  };
  mirror(1 - near);
  if (c === 0) {
    // End on, the one face is drawn straight to the screen.
    if (car.body) drawEndBody(front);
  } else {
    if (car.body) {
      traceBody(true);
      paint(BLUE, false);
    }
    const flat = ctx.getTransform();
    if (car.body && Math.abs(s) > 0.004) {
      paintCard(END_CARD, () => drawEndBody(front, true));
      layCard(END_CARD, Math.abs(s), (y) => (reachAt(ends, y) - MID) * c, LOW - 0.03, TOP + 0.05, lift);
    }
    if (Math.abs(c) > 0.004) {
      paintCard(SIDE_CARD, () => drawFlank(near, true));
      layCard(SIDE_CARD, c, (y) => -MID * c + sign * reachAt(reach.half, y) * s, 0.1, TOP + 0.05, lift);
    }
    ctx.setTransform(flat);
    if (car.body) {
      // The corner where the two faces meet, from the belt up the pillar,
      // and the line round the whole car.
      ctx.save();
      ctx.lineWidth = ink * 0.8;
      ctx.beginPath();
      for (let j = Math.round((BELT - 0.03 - LOW) / ROW); j < ends.length; j++) ctx.lineTo((ends[j] - MID) * c + sign * reach.half[j] * s, LOW + j * ROW);
      ctx.stroke();
      ctx.restore();
      traceBody(false);
      ctx.stroke();
    }
  }
  mirror(near);
  // The wheels on our side stand in their wells: of the tread, only what
  // shows through the well's opening and under the sill is seen.
  for (const [side, i] of wheels(near)) {
    if (!car.wheels[side][i]) continue;
    ctx.save();
    if (car.body) {
      ctx.beginPath();
      ctx.rect(-9, -1, 18, 1 + LOW + 0.005);
      ctx.ellipse(across(AXLE[i], sign * 0.99), LOW, Math.max(0.46 * Math.abs(c), 0.0004), 0.46, 0, 0, TAU);
      ctx.clip();
    }
    drawTurnedWheel(side, i, true);
    ctx.restore();
  }
}

/* The car at the station, facing the way the table has turned it: side on
   it is the side's own drawing, at any other angle the turning car. */
function drawCar(close = null) {
  const turn = ((car.turn % 4) + 4) % 4;
  const lift = car.shake ? Math.sin(clock * 60) * 0.012 * car.shake : 0;
  ctx.save();
  ctx.translate(car.x + MID, lift);
  if (turn === 0) {
    ctx.translate(-MID, 0);
    drawSide(0, close);
  } else if (turn === 2) {
    ctx.translate(MID, 0);
    ctx.scale(-1, 1);
    drawSide(1, close);
  } else {
    drawTurned((turn * Math.PI) / 2, lift);
  }
  ctx.restore();
}

/* The chassis from above, nose to the right: rails and cross beams, axles
   and brakes, the floor the seats stand on, the exhaust, and the engine. */
function drawChassisAbove() {
  box(0.28, -0.3, 0.5, 0.6, 0.1, '#A9AFB6');
  lines([[0.78, 0.2, 3.3, 0.2]], INK, 2.6);
  lines([[0.78, 0.2, 3.3, 0.2]], STEEL, 1.3);
  for (const x of AXLE) {
    box(x - 0.045, -0.88, 0.09, 1.76, 0.02, STEEL);
    for (const sign of [-1, 1]) {
      box(x - 0.2, sign * 0.92 - 0.04, 0.4, 0.08, 0.02, RIM);
      box(x - 0.2, sign * 0.83 - 0.045, 0.16, 0.09, 0.02, RED);
    }
  }
  for (const y of [-0.5, 0.5]) box(0.25, y - 0.07, 4.35, 0.14, 0.05, IRON);
  for (const x of [0.4, 1.0, 3.5, 4.42]) box(x - 0.05, -0.5, 0.1, 1, 0.02, IRON);
  box(1.15, -0.84, 2.35, 1.68, 0.14, '#AEB4BA');
  lines([[1.3, 0, 3.35, 0]], 'rgba(43,31,22,.25)', 0.8);
  box(4.48, -0.52, 0.1, 1.04, 0.02, '#5F666E');
  if (!car.engine) return;
  box(MOUNT[0] + 0.02, -0.34, 0.82, 0.68, 0.06, '#7C848C');
  for (const y of [-0.28, 0.09]) {
    box(MOUNT[0] + 0.1, y, 0.68, 0.19, 0.04, '#A9AFB6');
    box(MOUNT[0] + 0.14, y + 0.045, 0.2, 0.1, 0.03, RED);
    box(MOUNT[0] + 0.54, y + 0.045, 0.2, 0.1, 0.03, RED);
  }
  box(MOUNT[0] + 0.8, -0.24, 0.1, 0.48, 0.03, DARK);
}

/* A seat from above, facing the nose: the cushion, the back behind it, the
   headrest. The bench is three seats wide. With `outline` only its edge is
   traced, for the place that waits for it. */
function seatAbove(kind, x, y, outline = false) {
  const half = kind === 'bench' ? 0.7 : 0.26;
  if (outline) {
    rounded(x - 0.32, y - half, 0.6, half * 2, 0.1);
    return;
  }
  box(x - 0.2, y - half, 0.48, half * 2, 0.1, SEAT);
  box(x - 0.32, y - half + 0.01, 0.17, half * 2 - 0.02, 0.07, '#B08D60');
  const heads = kind === 'bench' ? [-0.44, 0, 0.44] : [0];
  for (const at of heads) box(x - 0.36, y + at - 0.1, 0.11, 0.2, 0.04, '#9C7B50');
  const seams = [[x - 0.02, y - half + 0.06, x - 0.02, y + half - 0.06]];
  if (kind === 'bench') seams.push([x - 0.15, y - 0.23, x + 0.26, y - 0.23], [x - 0.15, y + 0.23, x + 0.26, y + 0.23]);
  lines(seams, 'rgba(43,31,22,.3)', 0.8);
}

/* The seats' cart from above: its deck, its handle, its four small wheels. */
function drawCartAbove(x) {
  for (const [cx, cy] of [[1.1, -2.98], [4, -2.98], [1.1, -1.12], [4, -1.12]]) box(x + cx - 0.1, cy - 0.05, 0.2, 0.1, 0.04, DARK);
  lines([[x + 0.95, -2.6, x + 0.7, -2.6], [x + 0.7, -2.6, x + 0.7, -1.5], [x + 0.7, -1.5, x + 0.95, -1.5]], INK, 2.4);
  box(x + 0.95, -2.95, 3.2, 1.8, 0.1, ORANGE);
  box(x + 1.05, -2.85, 3.0, 1.6, 0.06, '#F3A45E', false);
}

/* The doors' rack, side on: two shelves on small wheels. */
function drawRack(x) {
  lines([[x - 2.15, 0.12, x - 2.15, 2.9], [x - 0.75, 0.12, x - 0.75, 2.9]], INK, 3);
  lines([[x - 2.15, 0.12, x - 2.15, 2.9], [x - 0.75, 0.12, x - 0.75, 2.9]], ORANGE, 1.6);
  for (const y of [0.1, 1.47]) box(x - 2.2, y, 1.5, 0.08, 0.02, ORANGE);
  lines([[x - 2.15, 2.9, x - 0.75, 2.9]], INK, 2.4);
  disc(x - 2.0, 0.07, 0.07, DARK);
  disc(x - 0.9, 0.07, 0.07, DARK);
}

/* The wheels' cart, side on: a low deck with a lip to roll them down. */
function drawWheelCart(x) {
  lines([[x - 2.42, 0.12, x - 2.6, 1.0], [x - 2.7, 1.0, x - 2.5, 1.0]], INK, 2.4);
  shape([[x - 0.45, 0.12], [x - 0.2, 0.01], [x - 0.45, 0.01]], ORANGE);
  box(x - 2.45, 0.05, 2.0, 0.07, 0.02, ORANGE);
  disc(x - 2.2, 0.05, 0.05, DARK);
  disc(x - 0.7, 0.05, 0.05, DARK);
}

/* The headlights' cart, side on. */
function drawLampCart(x) {
  lines([[x - 1.7, 0.2, x - 1.7, 0.74], [x - 0.5, 0.2, x - 0.5, 0.74], [x - 1.72, 0.74, x - 1.9, 1.0]], INK, 2.4);
  box(x - 1.76, 0.72, 1.32, 0.08, 0.03, ORANGE);
  box(x - 1.76, 0.2, 1.32, 0.07, 0.03, ORANGE);
  disc(x - 1.6, 0.1, 0.1, DARK);
  disc(x - 0.6, 0.1, 0.1, DARK);
}

/* The spray gun, side on, its nozzle's tip at x, y and pointing left, turned
   by `tilt`: the barrel, the cup of paint on top, the grip and the trigger. */
function drawGun(x, y, tilt) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  shape([[0.2, -0.04], [0.31, -0.04], [0.37, -0.34], [0.26, -0.34]], '#5F666E');
  lines([[0.19, -0.05, 0.14, -0.19]], INK, 1.6);
  shape([[0.07, 0.04], [0.21, 0.04], [0.25, 0.27], [0.03, 0.27]], '#EEF1F3');
  shape([[0.075, 0.05], [0.205, 0.05], [0.23, 0.19], [0.05, 0.19]], BLUE, false);
  box(0.02, 0.26, 0.24, 0.05, 0.02, STEEL);
  box(0.02, -0.05, 0.3, 0.1, 0.03, RIM);
  box(-0.04, -0.065, 0.08, 0.13, 0.02, DARK);
  ctx.restore();
}

/* The wheel wrench lying on its mat: the long handle, and at one end the
   short leg with the socket. */
function wrenchFlat() {
  lines([[-0.2, 0, 0.21, 0], [-0.2, 0, -0.2, 0.09]], INK, 3.4);
  lines([[-0.2, 0, 0.21, 0], [-0.2, 0, -0.2, 0.09]], RIM, 2);
  lines([[0.06, 0, 0.21, 0]], INK, 4.4);
  lines([[0.06, 0, 0.21, 0]], DARK, 3);
  box(-0.235, 0.07, 0.07, 0.06, 0.012, STEEL);
}

/* The wheel wrench at work, looked at along its short leg: the socket is on
   the bolt at x, y, and the handle lies across the wheel, pointing along a. */
function wrenchOn(x, y, a) {
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  lines([[x, y, x + dx * 0.42, y + dy * 0.42]], INK, 3.6);
  lines([[x, y, x + dx * 0.42, y + dy * 0.42]], RIM, 2.2);
  lines([[x + dx * 0.27, y + dy * 0.27, x + dx * 0.42, y + dy * 0.42]], INK, 4.6);
  lines([[x + dx * 0.27, y + dy * 0.27, x + dx * 0.42, y + dy * 0.42]], DARK, 3.2);
  disc(x, y, 0.046, STEEL);
  disc(x, y, 0.02, '#5F666E', false);
}

function draw() {
  if (!stage) return;
  stage.draw();
  onFloor();
  for (const bit of bits) {
    ctx.globalAlpha = Math.max(0, 1 - bit.age / bit.life);
    disc(bit.x, bit.y, bit.r, bit.color, false);
  }
  ctx.globalAlpha = 1;
  if (veil > 0) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = `rgba(254,249,239,${veil.toFixed(3)})`;
    ctx.fillRect(0, 0, width, height);
  }
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

/* Parts and tools are carried over the whole view. */
floorView.addEventListener('pointerdown', (event) => {
  if (stage && stage.down && !event.target.closest('[data-ctl]')) stage.down(event);
});
floorView.addEventListener('pointermove', (event) => {
  if (stage && stage.move) stage.move(event);
});
for (const type of ['pointerup', 'pointercancel']) {
  floorView.addEventListener(type, (event) => {
    if (stage && stage.up) stage.up(event);
  });
}

/* The car as the first `count` jobs left it. */
function setCar(count) {
  const has = (name) => STAGES.indexOf(name) < count;
  Object.assign(car, {
    x: 0,
    engine: has('engine'),
    seats: has('seats'),
    body: has('body'),
    doors: [[has('doors-a'), has('doors-a')], [has('doors-b'), has('doors-b')]],
    wheels: [[has('wheels-a'), has('wheels-a')], [has('wheels-b'), has('wheels-b')]],
    bolts: [[null, null], [null, null]],
    rot: [[0, 0], [0, 0]],
    lights: [has('lights'), has('lights')],
    turn: (count > 0 && FACING[STAGES[count - 1]]) || 0,
    shake: 0,
    braking: false,
  });
  spin.long = 0;
}

/* The floor opens on what is already built. */
function startFloor() {
  run += 1;
  setCar(saved);
  stage = null;
  bits = [];
  clock = 0;
  veil = 0;
  layout();
  show('floor');
  paintSteps();
  begin(saved);
  follow(0);
  if (saved < STAGES.length) beep('ambience', 'factory'); // the ending is heard without the hall's hum
  go();
}

/* The safety gear comes first, every time (gear.js): it opens the floor when all of it is on. */
function showGear() {
  run += 1;
  running = false;
  cancelAnimationFrame(raf);
  sound.stop();
  beep('ambience', null);
  beep('engineOff');
  beep('spray', 0);
  stage = null;
  $('word').hidden = true;
  show('gear');
  gear.start(startFloor);
}

$('again').addEventListener('click', showGear);

/* Another car, from the ☰ menu: the one being built is cleared away. */
const menu = document.querySelector('.menu');
if (menu) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'menu-item';
  button.textContent = 'سَيَّارَةٌ جَدِيدَةٌ';
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
  } else if (view === 'floor' || view === 'done') {
    go();
    if (view === 'floor' && stage && stage.name !== 'done') beep('ambience', 'factory');
  }
});
addEventListener('resize', () => {
  layout();
  if (view !== 'gear' && stage) {
    follow(0);
    draw();
  }
});

/* Start */
$('steps').innerHTML = STAGES.map(() => '<i></i>').join('');
load();
shown = stars;
showCount();
layout();
showGear();
sound.preloadPrompts(['bismillah', 'gear', 'start-right', ...Object.values(WORDS).map((entry) => entry.clip)]);
sound.preload(['alhamdulillah']);
if (LOCAL) {
  window.factoryGame = {
    get stage() { return stage; },
    get saved() { return saved; },
    set saved(value) { saved = value; },
    car, ctl, cam, hoist, update, draw, startFloor, begin,
    stop() { running = false; cancelAnimationFrame(raf); },
    /* Where a place on the floor is on the screen, for a test's fingers. */
    screen: (x, y) => [cam.ox + x * cam.s, cam.oy - y * cam.s],
  };
}
