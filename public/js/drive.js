/* قِيَادَةُ الْمَرْكَبَاتِ: the driving games. Pick a road, drag the seat belt across until
   it clicks, see the du'a of riding, then drive to the end of the road, where
   the car turns off into a side street and stops at the place it was going.
   Steering is by turning the tablet like a steering wheel: level is straight,
   whatever way it was held when the drive began. Either pedal makes the car go
   faster; letting go slows it down. Nothing is ever lost: the car slows behind
   traffic by itself, a touch is a soft bump, and it stops by itself at a red
   light or for people crossing. Stars lie along the road to be driven over,
   in a lane traffic keeps out of. Near the end the right turn signal blinks.
   The road is drawn on a canvas, seen straight from above, and scrolls at one
   size. Lengths are in lanes: the road is three lanes wide, x from -1.5 to
   1.5, and y grows along it.
   Two roads are in the list twice: their second copies (chase: true) are the
   same drives seen from behind the car, drawn by chase.js, and at their end
   the side street leaves the road at a slant, so that nothing has to turn.
   The ride to the oasis is a game of its own, in desert.js. */
const $ = (id) => document.getElementById(id);

const KEY = 'drive';
const DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arabic = (n) => String(n).replace(/\d/g, (d) => DIGITS[d]);
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const within = (promise, ms) => Promise.race([promise, delay(ms)]); // a sound that never ends must not hold the game
const RAD = Math.PI / 180;
const INK = '#2B1F16';
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

const LANES = [-1, 0, 1];
/* Speeds in lanes per second, for the roads seen from above and the roads
   seen from behind (whose picture is drawn STRETCH times longer along the
   road, so the same number covers more of it). The father found both too
   slow: a drive should be a little exciting. Traffic keeps one speed of its
   own, so the gaps between cars stay open. Steering is in degrees of tilt,
   and its rate is how many lanes a second the car crosses at full lock. */
const SPEED = {
  above: { crawl: 2.2, max: 12, gain: 6, drop: 5.5, brake: 20 },
  behind: { crawl: 2.2, max: 15, gain: 7, drop: 5.5, brake: 20 },
};
const STEER = { dead: 3, full: 26, rate: { above: 5.5, behind: 6.5 } };
const TRAFFIC = { above: 3, behind: 4.5 };
const pace = () => (trip.chase ? SPEED.behind : SPEED.above);
const CAR = { w: 0.62, l: 1.16 };
const TURN = 1.25; // the radius of the turn into the side street
const GOAL_X = 4.5; // how far along the side street the car stops, in lanes from the middle of the road
/* Seen from behind, the side street leaves the right lane at a gentle slant,
   straightens beside the road and ends at the door of the place. Lengths are
   lanes of the picture, which chase.js draws stretched along the road: the
   slant, the straight after it, how far from the middle of the road the
   street ends up, and the speed the car takes it at, in the road's own lanes
   a second. */
const SLIP = { slant: 22, straight: 8, x: 4.2, speed: 2.6 };
const STARS_APART = { above: 1.5, behind: 3.2 }; // lanes between the stars of a line: seen from behind they stand end on, and need more room
const ADHANS = 1; // audio/adhan-1.mp3; with more files and a higher number here, they take turns
const CAR_COLORS = ['#3E76C2', '#5E9E45', '#E9A43C', '#8C6A4C', '#B05A8C', '#F4F1EA', '#2A9D8F', '#7C8A99'];
const WALKERS = { man: 0.92, woman: 0.88, boy: 0.66 }; // heights in lanes
const FACING = { man: 1, woman: 1, boy: -1 }; // the way each drawing walks: 1 is to the right
const ON_WALK = { palm: { tall: 2.5, at: 2.1 }, lamp: { tall: 1.5, at: 1.86 } }; // on the walk: height and place, in lanes

/* The drawings in images/drive, with their width over their height, and how
   tall each stands beside the road. */
const SPRITES = {
  bakery: 0.997, boy: 0.447, cart: 1, felucca: 0.746, 'grand-house': 1.713, grandma: 0.41, 'house-a': 0.786,
  'house-b': 1.649, 'house-c': 0.691, lamp: 0.272, man: 0.405, 'masjid-big': 0.888, masjid: 0.553, palm: 0.598,
  tower: 0.423, tree: 0.73, woman: 0.385,
  // The desert's own, sized in desert.js.
  acacia: 1.088, atv: 0.569, boulder: 1.051, camel: 1.229, eagle: 1.598, fox: 0.685, gazelle: 0.738, rocks: 0.693, shrub: 1.153, tent: 2.046,
  well: 0.763,
};
const SIZE = {
  'house-a': 2.7, 'house-b': 2, 'house-c': 3.1, bakery: 2.1, masjid: 3.7, tower: 4.4, palm: 3.1, tree: 2.1,
  lamp: 1.8, cart: 1.4, felucca: 2.1, 'masjid-big': 5, 'grand-house': 3.3, grandma: 1.2,
};

/* The roads. A stop is a red light or a crossing; a special is a building
   placed once, at about that point of the road; a row is what stands beyond
   the walk, picked in turn. The goal stands at the end of a side street. */
const ROADS = [
  {
    id: 'hayy', name: 'الْحَيُّ', goal: 'masjid-big', goalName: 'الْمَسْجِدُ', goalClip: 'place-masjid', adhan: true,
    length: 520, seed: 11, ground: '#EBD9B4', walk: '#DCC9A6',
    left: { row: ['house-a', 'house-c', 'house-b', 'tree', 'house-a', 'cart', 'house-b', 'house-c'], specials: [{ y: 90, name: 'bakery' }, { y: 250, name: 'masjid' }] },
    right: { row: ['house-b', 'house-c', 'tree', 'house-a', 'house-b', 'cart', 'house-c'], specials: [{ y: 380, name: 'bakery' }] },
    stops: [{ y: 170, kind: 'light' }, { y: 350, kind: 'light' }],
  },
  {
    id: 'nile', name: 'كُورْنِيشُ النِّيلِ', goal: 'grand-house', goalName: 'بَيْتُ جَدَّتِي', goalClip: 'place-grandma', grandma: true,
    length: 640, seed: 29, ground: '#EBD9B4', walk: '#DCC9A6',
    left: { river: true },
    right: { row: ['tower', 'house-c', 'house-b', 'tree', 'house-a', 'tower', 'cart'], specials: [{ y: 280, name: 'bakery' }, { y: 450, name: 'masjid' }] },
    stops: [{ y: 180, kind: 'crossing' }, { y: 340, kind: 'light' }, { y: 500, kind: 'crossing' }],
  },
  // The ride to the oasis is a game of its own, in desert.js: a bike steered across the desert.
  { id: 'waha', name: 'الْوَاحَةُ', desert: true, goal: 'palm', goalName: 'الْوَاحَةُ', goalClip: 'place-oasis', seed: 47 },
];

/* Each street is also offered seen from behind the car: the same drive with
   the same rules, drawn by chase.js, its card right after the original's.
   That picture shows far more road at once, so chase.js draws the road
   stretched along its length, and a few numbers here follow it: cars are
   shorter in the road's lanes, so that they keep their true length in the
   picture; traffic and the stars of a line stand further apart; and a car
   beside the child's car is a wall, because one pushed back behind him
   would be out of the picture. */
const BEHIND = { hayy: 'الْحَيُّ الْجَدِيدُ', nile: 'الْكُورْنِيشُ الْجَدِيدُ' };
for (const [id, name] of Object.entries(BEHIND)) {
  const at = ROADS.findIndex((item) => item.id === id);
  ROADS.splice(at + 1, 0, { ...ROADS[at], id: `${id}-chase`, name, chase: true });
}

const root = $('drive');
const canvas = $('road');
const ctx = canvas.getContext('2d');
const tripView = $('view-trip');

let stars = 0;
let shown = 0;
let steerBy = 'tilt'; // 'tilt', or 'finger' when a parent picks it in the menu
let road = ROADS[0];
let trip = null;
let view = 'roads';
let running = false;
let last = 0;
let raf = 0;

/* The screen: sizes in CSS pixels, set by layout(). */
let width = 0;
let height = 0;
let dpr = 1;
let lane = 60; // one lane at the car
let cx = 0; // the middle of the road
let carY = 0; // where the child's car sits
let su = 40; // one unit of roadside scenery
let far = 10; // lanes of road on the screen ahead of the car
let near = 3; // and behind it
let adhanTurn = 0; // which adhan played last

function show(next) {
  view = next;
  root.dataset.view = next;
  for (const section of root.querySelectorAll('.drive-view')) section.hidden = section.id !== `view-${next}`;
  canvas.hidden = next !== 'trip' && next !== 'arrived';
}

/* Saved on the device: the stars, the way of steering, and which adhan played last. */
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ stars, steer: steerBy, adhan: adhanTurn }));
  } catch {
    // Private browsing: they last for this visit only.
  }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && Number.isInteger(saved.stars) && saved.stars >= 0) stars = saved.stars;
    if (saved && saved.steer === 'finger') steerBy = 'finger';
    if (saved && Number.isInteger(saved.adhan)) adhanTurn = saved.adhan;
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

/* Tilt. The game reads which way is down from the tablet's own sensors and
   measures how far the screen's left-to-right edge is turned from level, the
   way a steering wheel is turned. Level is zero however the tablet leans
   back, so straight is always straight, and nothing is set at the start. */
const tilt = { seen: false, beta: 0, gamma: 0, angle: 0, allowed: null, asking: false, listening: false, latched: null, level: 0 };

/* How far the picture is turned from the device's own upright: 0, 90, 180 or
   270. window.orientation comes first: on iPad the newer screen.orientation
   counts from landscape while the sensors count from portrait. */
function screenAngle() {
  if (typeof window.orientation === 'number') return (window.orientation + 360) % 360;
  return screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : 0;
}

/* Degrees, positive when the right edge of the screen is the lower one. Held
   up like a wheel, it is the wheel's turn exactly, however far the tablet
   leans back; lying nearly flat, where a wheel turn cannot be felt, it is
   how far the right edge dips. */
function steerAngle(beta, gamma, turned) {
  const b = beta * RAD;
  const g = gamma * RAD;
  const a = turned * RAD;
  const gx = Math.cos(b) * Math.sin(g); // down, along the device's right edge
  const gy = -Math.sin(b); // down, along the device's top edge
  const right = gx * Math.cos(a) - gy * Math.sin(a); // down, along the screen's right
  const up = gx * Math.sin(a) + gy * Math.cos(a); // down, along the screen's top
  const dip = Math.asin(clamp(right, -1, 1)) / RAD;
  if (up >= 0) return dip;
  const upright = clamp((Math.hypot(right, up) - 0.3) / 0.3, 0, 1) * clamp(-up / 0.2, 0, 1);
  return upright * (Math.atan2(right, -up) / RAD) + (1 - upright) * dip;
}

function onOrientation(event) {
  if (typeof event.beta !== 'number' || typeof event.gamma !== 'number') return;
  tilt.beta = event.beta;
  tilt.gamma = event.gamma;
  tilt.seen = true;
}

/* The tilt now. When the system turns the picture (a wheel turned past
   halfway does that too), the old way up is kept until the tablet has been
   about level the new way for a moment, so the steering never flips. */
function readTilt(now) {
  const turned = screenAngle();
  if (tilt.latched === null || turned === tilt.latched) {
    tilt.latched = turned;
    tilt.level = 0;
  } else if (Math.abs(steerAngle(tilt.beta, tilt.gamma, turned)) < 20) {
    if (!tilt.level) tilt.level = now;
    else if (now - tilt.level > 400) {
      tilt.latched = turned;
      tilt.level = 0;
    }
  } else {
    tilt.level = 0;
  }
  return steerAngle(tilt.beta, tilt.gamma, tilt.latched);
}

function listenForTilt() {
  if (tilt.listening) return;
  tilt.listening = true;
  addEventListener('deviceorientation', onOrientation);
}

/* iPhone and iPad show their own Allow box, and only from inside a touch:
   the seat belt's release asks, and the go button asks again if that did not
   count as one. An answer already given comes back without a box, so the
   page asks quietly when it opens. Other devices just listen. */
async function askMotion() {
  const Orientation = window.DeviceOrientationEvent;
  if (!Orientation) {
    tilt.allowed = false;
    return;
  }
  if (typeof Orientation.requestPermission !== 'function') {
    tilt.allowed = true;
    listenForTilt();
    return;
  }
  if (tilt.allowed !== null || tilt.asking) return;
  tilt.asking = true;
  try {
    tilt.allowed = (await Orientation.requestPermission()) === 'granted';
  } catch {
    tilt.allowed = null; // not asked from inside a touch: the next touch asks again
  }
  tilt.asking = false;
  if (tilt.allowed) listenForTilt();
}

/* The sounds this game added. An older saved copy of sound.js may not
   have them yet on the first launch after an update. */
const beep = (name, ...values) => {
  if (typeof sound[name] === 'function') sound[name](...values);
};

const tilting = () => steerBy === 'tilt' && tilt.seen;

/* Finger and keys. A finger steers only when tilt is off or missing, so
   thumbs resting on the glass do not fight the tilt. */
const finger = { id: null, x: 0 };
const keys = { left: false, right: false, gas: false };
const pedals = new Set();
const pedalDown = () => pedals.size > 0 || keys.gas;

tripView.addEventListener('pointerdown', (event) => {
  if (event.target.closest('[data-pedal]') || tilting() || finger.id !== null) return;
  finger.id = event.pointerId;
  finger.x = event.clientX;
  try {
    tripView.setPointerCapture(event.pointerId);
  } catch {
    // The pointer is already gone.
  }
});
tripView.addEventListener('pointermove', (event) => {
  if (event.pointerId === finger.id) finger.x = event.clientX;
});
for (const type of ['pointerup', 'pointercancel']) {
  tripView.addEventListener(type, (event) => {
    if (event.pointerId === finger.id) finger.id = null;
  });
}

for (const button of document.querySelectorAll('[data-pedal]')) {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    pedals.add(event.pointerId);
    root.classList.remove('nudge');
    try {
      button.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone.
    }
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(type, (event) => pedals.delete(event.pointerId));
  }
}

addEventListener('keydown', (event) => {
  if (view !== 'trip') return;
  if (event.key === 'ArrowLeft') keys.left = true;
  else if (event.key === 'ArrowRight') keys.right = true;
  else if (event.key === 'ArrowUp' || event.key === ' ') keys.gas = true;
  else return;
  root.classList.remove('nudge');
  event.preventDefault();
});
addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft') keys.left = false;
  else if (event.key === 'ArrowRight') keys.right = false;
  else if (event.key === 'ArrowUp' || event.key === ' ') keys.gas = false;
});
addEventListener('blur', () => {
  keys.left = keys.right = keys.gas = false;
});
root.addEventListener('contextmenu', (event) => event.preventDefault());

/* How hard to steer, from -1 (left) to 1 (right). pointed turns a place
   across the screen into a place across the road, for the finger. */
function steering(dt, pointed = (px) => (px - cx) / lane) {
  if (tilt.seen) tilt.angle += (readTilt(performance.now()) - tilt.angle) * (1 - Math.exp(-dt / 0.09));
  if (keys.left !== keys.right) return keys.left ? -1 : 1;
  if (tilting()) {
    const size = Math.abs(tilt.angle);
    return size < STEER.dead ? 0 : Math.sign(tilt.angle) * Math.min(1, (size - STEER.dead) / (STEER.full - STEER.dead));
  }
  if (finger.id !== null) return clamp((pointed(finger.x) - trip.x) * 4, -1, 1);
  return 0;
}

/* The screen and the drawings. */
function layout() {
  width = innerWidth;
  height = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  carY = height * 0.84;
  lane = clamp(Math.min((width * 0.6) / 3, carY / 8.5), 38, 130);
  su = clamp((width / 2 - lane * 2.2) / 2.4, lane * 0.7, lane * 1.35);
  far = carY / lane + 0.5;
  near = (height - carY) / lane + 0.5;
  cx = width / 2 - (trip ? trip.pan : 0) * lane;
  rasters.clear();
  if (trip && trip.desert) desert.layout();
  else if (trip) {
    if (trip.chase) chase.layout();
    trip.scenery = buildScenery(trip.road);
  }
}

const images = {};
const rasters = new Map();

function loadSprites() {
  return Promise.all(Object.keys(SPRITES).map((name) => new Promise((resolve) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = `images/drive/${name}.svg`;
    images[name] = image;
  })));
}

/* Each drawing is turned into a picture once, at the size it is shown. */
function raster(name) {
  const hit = rasters.get(name);
  if (hit) return hit;
  const image = images[name];
  if (!image || !image.naturalWidth || !(name in WALKERS || name in SIZE)) return null;
  const tall = name in WALKERS ? WALKERS[name] * lane : Math.max(SIZE[name] * su, name in ON_WALK ? ON_WALK[name].tall * lane : 0);
  const h = Math.ceil(tall * dpr);
  const w = Math.ceil(h * SPRITES[name]);
  const copy = document.createElement('canvas');
  copy.width = w;
  copy.height = h;
  copy.getContext('2d').drawImage(image, 0, 0, w, h);
  rasters.set(name, copy);
  return copy;
}

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/* What stands beside the road. On the walk, lamps and palms well apart.
   Beyond the walk, a row of buildings, trees and carts, each clear of the
   next, so nothing stands in the road or in front of something else; on a
   river side, boats on the water. The same road always gets the same street.
   The side street, the goal, the lights and the crossings are kept clear. */
function buildScenery(which) {
  const items = [];
  const end = which.length + far + 8;
  const goalTall = (SIZE[which.goal] * su) / lane;
  // Seen from behind, chase.js clears its own side street, and the street is
  // laid out closer along the road, to stand as close in the stretched picture.
  const kept = (side, y, tall) => which.chase || !(side > 0 && y + tall > which.length - 3 && y < which.length + goalTall + 3);
  const step = which.chase ? 1 / chase.STRETCH : 1;
  const open = (y) => which.stops.some((stop) => y > stop.y - 2.2 && y < stop.y + (stop.kind === 'crossing' ? 3.6 : 1.4));
  for (const side of [-1, 1]) {
    const spec = side < 0 ? which.left : which.right;
    const random = rng(which.seed * (side < 0 ? 3 : 5));
    for (let y = side < 0 ? 6 : 11, i = 0; y < end; y += 10 * step, i++) {
      if (!open(y) && kept(side, y, 3)) items.push({ name: i % 2 ? 'palm' : 'lamp', side, y, walk: true });
    }
    if (spec.river) {
      for (let y = 9; y < end; y += (12 + random() * 10) * step) items.push({ name: 'felucca', side, y, off: 0.6 + random() * 2.6, flip: random() < 0.5, bob: random() * 6, water: true });
      continue;
    }
    const specials = (spec.specials || []).slice();
    let previous = '';
    for (let y = 3; y < end;) {
      let name = '';
      if (specials.length && y >= specials[0].y) name = specials.shift().name;
      while (!name || name === previous) name = spec.row[Math.floor(random() * spec.row.length)];
      previous = name;
      const tall = (SIZE[name] * su) / lane;
      if (kept(side, y, tall)) items.push({ name, side, y });
      y += (tall + 0.5 + random() * 0.8) * step;
    }
  }
  return items.sort((a, b) => b.y - a.y);
}

/* Where a line across the road at y lands on the screen. Everything is drawn
   at one size and slides straight down as the car drives. */
const rowY = (y) => carY - (y - trip.y) * lane;

/* A patch of ground from x0 to x1 lanes across and from y0 to y1 along the road. */
function patch(x0, x1, y0, y1, color) {
  ctx.fillStyle = color;
  ctx.fillRect(cx + x0 * lane, rowY(y1), (x1 - x0) * lane, (y1 - y0) * lane);
}

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

/* A car from above, nose up the road. */
function drawCar(car, x, y, s) {
  const w = car.w * lane * s;
  const l = car.l * lane * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(car.yaw || 0);
  ctx.lineWidth = Math.max(1, w * 0.05);
  ctx.strokeStyle = INK;
  ctx.fillStyle = 'rgba(50,30,10,.2)';
  rounded(-w / 2 + w * 0.07, -l / 2 + l * 0.05, w, l, w * 0.3);
  ctx.fill();
  ctx.fillStyle = '#2B2622';
  for (const side of [-1, 1]) {
    for (const end of [-0.3, 0.27]) {
      rounded(side * w * 0.5 - w * 0.08, end * l - l * 0.1, w * 0.16, l * 0.2, w * 0.05);
      ctx.fill();
    }
  }
  ctx.fillStyle = car.color;
  rounded(-w / 2, -l / 2, w, l, w * 0.3);
  ctx.fill();
  ctx.stroke();
  if (car.kind === 'pickup') {
    ctx.fillStyle = '#6E533B';
    rounded(-w * 0.38, l * 0.02, w * 0.76, l * 0.4, w * 0.06);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#E9A43C';
    for (const dx of [-0.2, 0.2]) {
      rounded(dx * w - w * 0.13, l * 0.09, w * 0.26, l * 0.12, w * 0.04);
      ctx.fill();
      rounded(dx * w - w * 0.13, l * 0.25, w * 0.26, l * 0.12, w * 0.04);
      ctx.fill();
    }
    ctx.fillStyle = '#24323F';
    rounded(-w * 0.36, -l * 0.26, w * 0.72, l * 0.24, w * 0.14);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#24323F';
    rounded(-w * 0.37, -l * 0.23, w * 0.74, l * 0.54, w * 0.17);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = car.roof || car.color;
    rounded(-w * 0.32, -l * 0.1, w * 0.64, l * 0.28, w * 0.1);
    ctx.fill();
    ctx.stroke();
    if (car.kind === 'taxi') {
      ctx.fillStyle = '#F2B84B';
      rounded(-w * 0.13, -l * 0.01, w * 0.26, l * 0.09, w * 0.03);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#FFE9A8';
  for (const side of [-1, 1]) {
    rounded(side * w * 0.3 - w * 0.11, -l * 0.5 + l * 0.02, w * 0.22, l * 0.045, w * 0.04);
    ctx.fill();
  }
  const braking = car.braking || car.flash > 0;
  ctx.fillStyle = braking ? '#FF3B2F' : '#9E2B22';
  for (const side of [-1, 1]) {
    rounded(side * w * 0.3 - w * 0.12, l * 0.5 - l * 0.065, w * 0.24, l * 0.05, w * 0.04);
    ctx.fill();
  }
  if (braking) {
    ctx.fillStyle = 'rgba(255,59,47,.28)';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * w * 0.3, l * 0.5, w * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The turn signal: amber lamps at both corners of that side, blinking.
  if (car.signal && blinkOn()) {
    for (const end of [-0.46, 0.46]) {
      ctx.fillStyle = 'rgba(255,181,46,.4)';
      ctx.beginPath();
      ctx.arc(car.signal * w * 0.44, end * l, w * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFB52E';
      ctx.beginPath();
      ctx.arc(car.signal * w * 0.42, end * l, w * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* The turn signals blink together, on for a part of each beat. */
const blinkOn = () => (trip.t * 1.4) % 1 < 0.55;

/* Two amber arrowheads beside the child's car, pointing the way it is about to turn. */
function drawTurnArrow(X, Y, dir) {
  const s = lane * 0.3;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, lane * 0.05);
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#FFB52E';
  for (let i = 0; i < 2; i++) {
    const x = X + dir * i * s * 0.95;
    ctx.beginPath();
    ctx.moveTo(x, Y - s);
    ctx.lineTo(x + dir * s * 0.5, Y - s);
    ctx.lineTo(x + dir * s * 1.3, Y);
    ctx.lineTo(x + dir * s * 0.5, Y + s);
    ctx.lineTo(x, Y + s);
    ctx.lineTo(x + dir * s * 0.8, Y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/* Something that stands up from the ground at X, Y. */
function upright(name, X, Y, tall, flip, tip) {
  const image = raster(name);
  if (!image) return;
  const w = tall * SPRITES[name];
  ctx.fillStyle = 'rgba(60,40,20,.16)';
  ctx.beginPath();
  ctx.ellipse(X, Y, w * 0.45, Math.max(2, tall * 0.035), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(X, Y);
  if (tip) ctx.rotate(tip);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(image, -w / 2, -tall, w, tall);
  ctx.restore();
}

function drawLight(X, Y, s, state) {
  const u = lane * s;
  ctx.lineWidth = Math.max(1, u * 0.035);
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#4A4F57';
  rounded(X - u * 0.05, Y - u * 1.5, u * 0.1, u * 1.5, u * 0.03);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2B2F36';
  rounded(X - u * 0.27, Y - u * 2.5, u * 0.54, u * 1.1, u * 0.12);
  ctx.fill();
  ctx.stroke();
  const lamps = [['red', '#FF3B2F', '#5A2622'], ['amber', '#FFB52E', '#5A4722'], ['green', '#35C759', '#22492C']];
  lamps.forEach(([name, lit, dim], i) => {
    const on = state === name;
    ctx.fillStyle = on ? lit : dim;
    ctx.beginPath();
    ctx.arc(X, Y - u * (2.26 - i * 0.31), u * 0.125, 0, Math.PI * 2);
    ctx.fill();
    if (on) {
      ctx.fillStyle = `${lit}44`;
      ctx.beginPath();
      ctx.arc(X, Y - u * (2.26 - i * 0.31), u * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/* What a light shows for each state of its stop. */
const lamp = (stop) => ({ amber: 'amber', red: 'red' }[stop.state] || 'green');

function drawStar(X, Y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const q = i % 2 ? r * 0.46 : r;
    ctx.lineTo(X + Math.cos(a) * q, Y + Math.sin(a) * q);
  }
  ctx.closePath();
  ctx.fillStyle = '#F7C948';
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.strokeStyle = '#A9603A';
  ctx.stroke();
}

function draw() {
  if (!trip) return;
  const which = trip.road;
  const L = which.length;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = which.ground;
  ctx.fillRect(0, 0, width, height);
  const from = trip.y - near;
  const to = trip.y + far;

  // Ground: the river, the walks, the side street, the road and its markings.
  if (which.left.river) {
    ctx.fillStyle = '#62B2DE';
    ctx.fillRect(0, 0, Math.max(0, cx - 2.32 * lane), height);
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, lane * 0.04);
    for (let i = Math.floor(from / 1.3); i * 1.3 < to; i++) {
      const Y = rowY(i * 1.3);
      for (let j = 0; j < 3; j++) {
        const X = cx - (2.7 + (((i * 37 + j * 61) % 97) / 97) * 7) * lane;
        if (X < -20) continue;
        ctx.beginPath();
        ctx.moveTo(X, Y);
        ctx.quadraticCurveTo(X + lane * 0.14, Y - lane * 0.08, X + lane * 0.3, Y);
        ctx.stroke();
      }
    }
    patch(-2.32, -2.2, from, to, '#B89A74');
  }
  patch(-2.2, -1.5, from, to, which.walk);
  patch(1.5, 2.2, from, to, which.walk);
  patch(-1.62, -1.5, from, to, '#B9A27E');
  patch(1.5, 1.62, from, to, '#B9A27E');
  if (L + 3 > from && L - 3 < to) {
    patch(1.5, GOAL_X + 2.9, L - 1.05, L + 1.05, which.walk);
    patch(1.5, GOAL_X + 2.7, L - 0.75, L + 0.75, '#5B5F66');
    for (let x = 2; x < GOAL_X + 2.2; x += 1.5) patch(x, x + 0.7, L - 0.03, L + 0.03, '#F4EFE2');
    patch(GOAL_X - 0.9, GOAL_X + 0.9, L + 0.63, L + 0.75, '#F2B84B');
  }
  patch(-1.5, 1.5, from, to, '#5B5F66');
  for (let i = Math.floor(from / 3); i * 3 < to; i++) {
    for (const x of [-0.5, 0.5]) patch(x - 0.035, x + 0.035, i * 3, i * 3 + 1.3, '#F4EFE2');
  }
  for (const stop of trip.stops) {
    if (stop.y < from - 3 || stop.y > to) continue;
    patch(-1.5, 1.5, stop.y - 0.14, stop.y, '#F4EFE2');
    if (stop.kind === 'crossing') {
      for (let i = 0; i < 8; i++) patch(-1.44 + i * 0.37, -1.44 + i * 0.37 + 0.2, stop.y + 0.35, stop.y + 1.65, '#F4EFE2');
    }
  }

  // The stars to drive over; one just taken grows and fades.
  for (const star of trip.pickups) {
    if (star.y < from - 1 || star.y > to + 1 || star.got > 0.25) continue;
    const gone = star.got / 0.25;
    ctx.globalAlpha = 1 - gone;
    drawStar(cx + star.x * lane, rowY(star.y) - Math.sin(trip.t * 4 + star.y) * lane * 0.03, lane * 0.27 * (1 + gone * 1.2));
    ctx.globalAlpha = 1;
  }

  // Cars, the furthest first.
  const cars = trip.cars.filter((car) => car.y > from - 2 && car.y < to + 2).sort((a, b) => b.y - a.y);
  let drawn = false;
  const me = { w: CAR.w, l: CAR.l, color: '#D4533A', roof: '#E8765E', yaw: trip.yaw, braking: trip.braking, signal: trip.signal };
  for (const car of cars) {
    if (!drawn && car.y < trip.y) {
      drawCar(me, cx + trip.x * lane, carY, 1);
      drawn = true;
    }
    drawCar(car, cx + car.x * lane, rowY(car.y), 1);
  }
  if (!drawn) drawCar(me, cx + trip.x * lane, carY, 1);
  if (trip.signal && trip.phase === 'drive' && blinkOn()) drawTurnArrow(cx + (trip.x + CAR.w / 2 + 0.16) * lane, carY, trip.signal);

  // Everything that stands up, the furthest first. A thing is drawn while
  // any part of it is on the screen.
  const standing = [];
  for (const item of trip.scenery) {
    const Y = rowY(item.y);
    if (Y < -10 || Y - Math.max(SIZE[item.name] * su, 2.6 * lane) > height + 10) continue;
    standing.push(item);
  }
  for (const stop of trip.stops) {
    if (stop.y < from - 3 || stop.y > to + 3) continue;
    if (stop.kind === 'light') standing.push({ y: stop.y, light: stop });
    for (const walker of stop.people) standing.push({ y: stop.y + walker.at, walker });
  }
  standing.push({ y: L + 1.1, goal: true });
  if (which.grandma && trip.parked) standing.push({ y: L + 0.86, grandma: true });
  standing.sort((a, b) => b.y - a.y);
  for (const item of standing) {
    const Y = rowY(item.y);
    if (item.light) {
      for (const side of [-1, 1]) drawLight(cx + side * 1.86 * lane, Y, 1, lamp(item.light));
    } else if (item.walker) {
      const walker = item.walker;
      const step = Math.sin(walker.phase);
      upright(walker.name, cx + walker.x * lane, Y - Math.abs(step) * lane * 0.03, WALKERS[walker.name] * lane, walker.dir !== FACING[walker.name], step * 0.05);
    } else if (item.goal) {
      upright(which.goal, cx + GOAL_X * lane, Y, SIZE[which.goal] * su);
    } else if (item.grandma) {
      // She comes out of the door, then waves.
      const out = trip.out;
      const tip = out < 1 ? Math.sin(trip.t * 10) * 0.03 : Math.sin(trip.t * 8) * 0.08;
      upright('grandma', cx + GOAL_X * lane + (0.1 + out * 0.75) * su, Y, SIZE.grandma * su * (0.7 + 0.3 * out), false, tip);
    } else if (item.water) {
      const bob = Math.sin(trip.t * 1.3 + item.bob);
      upright(item.name, cx - (2.32 * lane + (item.off + (SIZE[item.name] * SPRITES[item.name]) / 2) * su), Y + bob * su * 0.04, SIZE[item.name] * su, item.flip, bob * 0.03);
    } else if (item.walk) {
      upright(item.name, cx + item.side * ON_WALK[item.name].at * lane, Y, ON_WALK[item.name].tall * lane);
    } else {
      upright(item.name, cx + item.side * (2.2 * lane + (0.12 + (SIZE[item.name] * SPRITES[item.name]) / 2) * su), Y, SIZE[item.name] * su);
    }
  }
}

/* The drive. */
function makeCar(laneIndex, y, random, long = 1, speed = TRAFFIC.above) {
  const kind = random() < 0.16 ? 'pickup' : random() < 0.2 ? 'taxi' : 'car';
  const color = kind === 'taxi' ? '#F4F1EA' : CAR_COLORS[Math.floor(random() * CAR_COLORS.length)];
  return {
    lane: laneIndex, x: LANES[laneIndex], y, v: speed, cruise: speed,
    w: 0.6, l: (kind === 'pickup' ? 1.3 : 1.1 + random() * 0.12) * long, color, roof: kind === 'taxi' ? '#2B2622' : '', kind,
    braking: false, flash: 0, honked: -9,
  };
}

/* Traffic is laid out ahead before the drive starts, in rows well apart: one
   car, or now and then two side by side, so a lane is always open. All of it
   keeps one speed, so the open lanes stay open and there is always a way past.
   Seen from behind, many rows are in sight at once: they are laid out further
   apart, mostly one car to a row, now and then two to weave between. */
function seedTraffic(which, random) {
  const cars = [];
  if (which.chase) {
    for (let y = 16; y < which.length * 0.62; y += 12 + random() * 6) {
      const first = Math.floor(random() * 3);
      cars.push(makeCar(first, y, random, 1 / chase.STRETCH, TRAFFIC.behind));
      if (random() < 0.15) cars.push(makeCar((first + 1 + Math.floor(random() * 2)) % 3, y + random() * 0.6 - 0.3, random, 1 / chase.STRETCH, TRAFFIC.behind));
    }
    return cars;
  }
  for (let y = 16; y < which.length * 0.62; y += 8 + random() * 5) {
    const first = Math.floor(random() * 3);
    cars.push(makeCar(first, y, random));
    if (random() < 0.3) cars.push(makeCar((first + 1 + Math.floor(random() * 2)) % 3, y + random() - 0.5, random));
  }
  return cars;
}

/* Stars lie on the road in short lines, each line in one lane, away from the
   lights, the crossings and the end. A line's lane is settled only as it
   comes into view (see placeLines), and traffic keeps out of it. */
function seedPickups(which, random) {
  const lines = [];
  const apart = which.chase ? STARS_APART.behind : STARS_APART.above;
  for (let y = 18; y < which.length - 40; y += 22 + random() * 10) {
    if (which.stops.some((stop) => Math.abs(stop.y - y - (apart * 1.5 - 0.25)) < 10)) continue;
    const line = { lane: Math.floor(random() * 3), from: y, to: y + apart * 3, placed: false, stars: [] };
    for (let i = 0; i < 4; i++) line.stars.push({ x: LANES[line.lane], y: y + i * apart, got: 0 });
    lines.push(line);
  }
  return lines;
}

/* How much of a lane a line of stars keeps clear of traffic: from well before
   its first star, so there is room to pull in, to just past its last. */
const CLEAR = { before: 10, after: 2.5 };
const claims = (line, car) => car.y + car.l / 2 > line.from - CLEAR.before && car.y - car.l / 2 < line.to + CLEAR.after;
const waiting = (line) => line.to > trip.y - 1 && line.stars.some((star) => !star.got);

/* As a line of stars is about to come into view, it takes the lane with the
   fewest cars between the child's car and its end. */
function placeLines() {
  for (const line of trip.lines) {
    if (line.placed || line.from - trip.y > far + 6) continue;
    line.placed = true;
    const busy = [0, 0, 0];
    for (const car of trip.cars) {
      if (car.y > trip.y - 1.5 && car.y < line.to + CLEAR.after + 2) busy[car.lane] += 1;
    }
    const least = Math.min(...busy);
    if (busy[line.lane] === least) continue;
    line.lane = busy.indexOf(least);
    for (const star of line.stars) star.x = LANES[line.lane];
  }
}

/* A car in a lane that a line of stars has taken moves over to another lane,
   signaling, when there is room beside it; until then it holds back. So the
   stars are never behind slow traffic. Returns the most it may drive. */
function yieldToStars(car) {
  const taken = (laneIndex) => trip.lines.some((line) => line.lane === laneIndex && waiting(line) && claims(line, car));
  if (!taken(car.lane)) return Infinity;
  const free = (laneIndex) => laneIndex >= 0 && laneIndex <= 2
    && !trip.cars.some((other) => other !== car && other.lane === laneIndex && Math.abs(other.y - car.y) < (other.l + car.l) / 2 + 1.1)
    && !(Math.abs(trip.x - LANES[laneIndex]) < 0.85 && trip.y > car.y - 7.5 && trip.y < car.y + 2.8);
  const sides = car.lane === 1 ? (car.x < 0 ? [0, 2] : [2, 0]) : [1];
  const next = sides.find((laneIndex) => free(laneIndex) && !taken(laneIndex)) ?? sides.find(free);
  if (next === undefined) return 1.2;
  car.signal = Math.sign(next - car.lane);
  car.lane = next;
  return Infinity;
}

/* The side street of a road seen from behind, in the road's own lanes: where
   it leaves the right lane, how long its slant is, and how far across it
   ends up. The car stops at the end of the road's length. */
function slipOf(which) {
  const long = (SLIP.slant + SLIP.straight) / chase.STRETCH;
  return { from: which.length - long, slant: SLIP.slant / chase.STRETCH, x: SLIP.x };
}

/* How far over that side street has gone at y along the road, from 0 where
   it leaves the lane to 1 where it runs straight. */
function slipPart(y) {
  const k = clamp((y - trip.slip.from) / trip.slip.slant, 0, 1);
  return k * k * (3 - 2 * k);
}

function startTrip() {
  const random = rng(road.seed + 100 + Math.floor(performance.now() % 1000));
  trip = road.desert ? desert.make(road, random) : {
    road, chase: Boolean(road.chase), t: 0, x: 0, y: 0, v: 0, yaw: 0, pan: 0, braking: false, held: false,
    // The child's car's length along the road, and, seen from behind, where the side street leaves it.
    l: road.chase ? CAR.l / chase.STRETCH : CAR.l, was: 0, slip: road.chase ? slipOf(road) : null,
    phase: 'drive', angle: 0, out: 0, parked: false, done: false,
    earned: 0, streak: 0, picked: -9, bumped: -9, random, signal: 0, lit: false,
    cars: seedTraffic(road, random), lines: seedPickups(road, random),
    stops: road.stops.map((stop) => ({ ...stop, state: 'open', clock: 0, waited: 0, people: [] })),
    scenery: [], shown: -1,
  };
  if (!road.desert) trip.pickups = trip.lines.flatMap((line) => line.stars);
  layout();
  if (!trip.chase) for (const name of Object.keys(SPRITES)) raster(name); // seen from behind, chase.js keeps its own
  $('trip-goal').src = `images/drive/${road.goal}.svg`;
  $('finger-hint').hidden = true;
  root.classList.add('nudge');
  root.classList.remove('wait', 'gas');
  root.classList.toggle('behind', trip.chase === true); // the finger's hint sits under the car there
  pedals.clear();
  finger.id = null;
  tilt.latched = null;
  tilt.level = 0;
  $('zikr').hidden = true;
  show('trip');
  // Birds in town, wind over the water by the river, an eagle and small birds in the desert.
  trip.ambience = road.desert ? 'desert' : road.left.river ? 'river' : 'town';
  beep('ambience', trip.ambience);
  if (screen.orientation && screen.orientation.lock) screen.orientation.lock(screen.orientation.type).catch(() => {});
  running = true;
  last = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
}

/* The speed a car may keep with something ahead of it: slower as the gap
   closes, never into it. Seen from behind, a car hides most of one close
   ahead of it in its lane, so that the two look like one: cars keep a
   longer gap there, KEEP lanes, and one that finds itself closer drops back
   gently. */
const KEEP = 2;
const behind = (gap, leadSpeed) => {
  if (!trip.chase) return Math.max(0, leadSpeed + (gap - 0.35) * 1.7);
  return gap > KEEP ? leadSpeed + (gap - KEEP) * 1.7 : leadSpeed * (0.45 + (0.55 * Math.max(0, gap)) / KEEP);
};

/* True while a stop holds the road. */
const blocks = (stop) => stop.state === 'red' || stop.state === 'walk';

function stopLimit(front, laneIndex = -1) {
  let limit = Infinity;
  // Seen from behind, a car hides the road just ahead of it: it stops further
  // back, so that the line and the crossing show clear of it.
  const short = trip.chase ? 1 : 0.25;
  for (const stop of trip.stops) {
    // Once a stop clears, traffic pulls away one lane after another, not as a wall.
    const holds = blocks(stop) || (laneIndex >= 0 && stop.state === 'done' && stop.clock < laneIndex * 1.5);
    if (!holds || front > stop.y + 0.3) continue;
    limit = Math.min(limit, Math.max(0, (stop.y - short - front) * 1.7));
  }
  return limit;
}

function updateStop(stop, dt) {
  const front = trip.y + trip.l / 2;
  const away = stop.y - front;
  stop.clock += dt;
  // People come to the curb as the car nears, and step out when it is close.
  if (stop.kind === 'crossing' && stop.state === 'open' && !stop.people.length && away < 24 && away > 0) {
    const names = ['man', 'woman', 'boy'].sort(() => trip.random() - 0.5);
    const count = 2 + Math.floor(trip.random() * 2);
    for (let i = 0; i < count; i++) {
      const dir = i % 2 ? -1 : 1;
      stop.people.push({ name: names[i], dir, x: -dir * (1.74 + i * 0.16), at: 0.6 + i * 0.4, speed: 0.95 + trip.random() * 0.3, phase: trip.random() * 6 });
    }
  }
  if (stop.state === 'open' && away > 0 && away < (stop.kind === 'light' ? Math.max(18, trip.v * 2.4) : 11)) {
    stop.state = stop.kind === 'light' ? 'amber' : 'walk';
    stop.clock = 0;
  } else if (stop.state === 'amber' && stop.clock > 1.2) {
    stop.state = 'red';
    stop.clock = 0;
  }
  if (stop.state !== 'open') {
    // The last one waits at the curb until the car has stopped for them.
    // Across, they stay on the walk.
    const waits = stop.state === 'walk' && !stop.waited && stop.clock < 12 ? stop.people[stop.people.length - 1] : null;
    for (const walker of stop.people) {
      if (walker === waits || walker.x * walker.dir >= 2.05) continue;
      walker.x += walker.dir * walker.speed * dt;
      walker.phase += dt * 9;
    }
  }
  if (stop.y < trip.y - near - 3) stop.people = [];
  if (!blocks(stop)) return;
  if (trip.v < 0.15 && away > -0.3 && away < 12) stop.waited += dt;
  // A light also turns green by itself in the end, long after the slowest car would have reached it.
  const clear = stop.kind === 'light'
    ? stop.waited > 2.2 || stop.clock > 25
    : stop.people.every((walker) => walker.x * walker.dir > 1.8);
  if (!clear) return;
  stop.state = 'done';
  stop.clock = 0;
  sound.tick();
}

/* Driving along the road: the pedal, what is in the way, the steering. On
   the last stretch the car takes itself to the right lane and slows for the
   turn into the side street; seen from behind, for where the side street
   slants off. */
function driveOn(dt, steer) {
  const L = trip.road.length;
  const turnAt = trip.chase ? trip.slip.from : L - TURN;
  const front = trip.y + trip.l / 2;
  const ending = trip.y > L - 26;
  const speed = pace();
  let want = pedalDown() ? speed.max : speed.crawl;
  let limit = stopLimit(front);
  for (const car of trip.cars) {
    if (car.y <= trip.y || Math.abs(car.x - trip.x) > (car.w + CAR.w) / 2 + 0.06) continue;
    limit = Math.min(limit, behind(car.y - car.l / 2 - front, car.v));
  }
  // Held: stopped at a red light or a crossing, or behind a car that is.
  trip.held = limit < 0.4 && trip.stops.some((stop) => blocks(stop) && stop.y > front - 0.3 && stop.y - front < 12);
  let turn = steer;
  if (ending) {
    // It waits for a gap rather than push into a car on its right.
    // Seen from behind, that is also a car it has only just passed, still in the picture.
    const beside = trip.cars.some((car) => car.x > trip.x && car.x - trip.x < (car.w + CAR.w) / 2 + 0.3
      && (trip.chase ? car.y - car.l / 2 < front + 0.3 : Math.abs(car.y - trip.y) < (car.l + CAR.l) / 2 + 0.3));
    turn = beside ? 0 : clamp((1 - trip.x) * 2.4, -1, 1);
    want = clamp((turnAt - trip.y) * 0.5 + 3, 3, 7);
    if (Math.abs(1 - trip.x) > 0.12) want = Math.min(want, Math.max(0, (turnAt - 0.5 - trip.y) * 1.5));
  }
  const target = Math.min(want, limit);
  trip.braking = target < trip.v - 0.25 || (trip.v < 0.1 && limit < 0.4);
  if (target > trip.v) trip.v = Math.min(target, trip.v + speed.gain * dt);
  else trip.v = Math.max(target, trip.v - (limit < want ? speed.brake : speed.drop) * dt);
  trip.y += trip.v * dt;
  const edge = 1.5 - CAR.w / 2 - 0.05;
  const rate = trip.chase ? STEER.rate.behind : STEER.rate.above;
  trip.x = clamp(trip.x + turn * rate * (0.45 + (0.55 * trip.v) / speed.max) * dt, -edge, edge);
  trip.yaw += (turn * 0.2 * Math.min(1, trip.v / 3 + 0.25) - trip.yaw) * (1 - Math.exp(-dt / 0.08));
  if (ending && trip.y >= turnAt - 0.03 && Math.abs(1 - trip.x) <= 0.12) {
    trip.phase = 'turn';
    trip.x = 1;
    trip.y = turnAt;
    trip.angle = 0;
    trip.held = false;
  } else if (ending && trip.y > turnAt) {
    trip.y = turnAt;
  }
  return turn;
}

/* The end of the drive: a quarter turn to the right into the side street,
   then along it to the door, the picture sliding over to follow. */
function turnOff(dt) {
  const L = trip.road.length;
  if (trip.chase) {
    slipOff(dt);
    return;
  }
  trip.braking = false;
  if (trip.phase === 'turn') {
    trip.v += (3 - trip.v) * Math.min(1, dt * 3);
    trip.angle = Math.min(Math.PI / 2, trip.angle + (trip.v / TURN) * dt);
    trip.x = 1 + TURN * (1 - Math.cos(trip.angle));
    trip.y = L - TURN + TURN * Math.sin(trip.angle);
    if (trip.angle >= Math.PI / 2) trip.phase = 'street';
  } else {
    trip.v = Math.min(3, (GOAL_X - trip.x) * 1.8 + 0.15);
    trip.x = Math.min(GOAL_X, trip.x + trip.v * dt);
    trip.y = L;
    trip.braking = true;
    if (GOAL_X - trip.x < 0.02) {
      trip.v = 0;
      arrive();
    }
  }
  trip.yaw = trip.angle;
  const part = clamp((trip.x - 1) / (GOAL_X - 1), 0, 1);
  trip.pan = GOAL_X * part * part * (3 - 2 * part);
}

/* The end of the drive seen from behind: the car follows the side street by
   itself, slowing, and stops with its nose at the door. The picture moves
   over with it and never turns; the car shows a few degrees of its slant. */
function slipOff(dt) {
  const L = trip.road.length;
  const from = { x: trip.x, y: trip.y };
  const want = Math.min(SLIP.speed, (L - trip.y) * 1.6 + 0.15);
  trip.braking = want < trip.v - 0.05;
  trip.v += (want - trip.v) * Math.min(1, dt * 3);
  trip.y = Math.min(L, trip.y + trip.v * dt);
  const part = slipPart(trip.y);
  trip.x = 1 + (trip.slip.x - 1) * part;
  trip.pan = trip.slip.x * part;
  trip.yaw = Math.min(0.2, ((trip.x - from.x) / Math.max(trip.y - from.y, 1e-4)) * 0.35);
  if (L - trip.y > 0.01) return;
  trip.y = L;
  trip.v = 0;
  trip.yaw = 0;
  trip.braking = true;
  arrive();
}

/* Seen from behind, a car whose tail has not passed the child's nose is
   beside him, or in the space between him and the camera: true when, at x
   across the road, it would be over his car's place there. */
const walls = (car, x) => car.y - car.l / 2 < trip.y + trip.l / 2 && Math.abs(x - trip.x) < (car.w + CAR.w) / 2;

/* Traffic keeps its lane and its distance, and stops where the child's car must. */
function moveTraffic(dt) {
  const sorted = trip.cars.slice().sort((a, b) => a.y - b.y);
  for (let i = 0; i < sorted.length; i++) {
    const car = sorted[i];
    const nose = car.y + car.l / 2;
    let most = Math.min(stopLimit(nose, car.lane), yieldToStars(car));
    // Changing lanes: it slides over, and the signal goes off once it is there.
    // Seen from behind, it waits rather than slide into the child's car or in behind it.
    const aside = LANES[car.lane] - car.x;
    const slide = clamp(aside, -1.3 * dt, 1.3 * dt);
    if (!trip.chase || !walls(car, car.x + slide) || Math.abs(car.x + slide - trip.x) >= Math.abs(car.x - trip.x)) car.x += slide;
    if (Math.abs(aside) < 0.03) car.signal = 0;
    // Seen from behind, a car the child has passed drops back out of the
    // picture and never comes forward again, where it would come between
    // his car and the camera. On the last stretch, where his car slows for
    // the side street, the cars beside it drive on.
    if (trip.chase && nose < trip.y - trip.l / 2 && trip.y <= trip.road.length - 26) most = Math.min(most, Math.max(0, trip.v - 0.8));
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].lane !== car.lane) continue;
      most = Math.min(most, behind(sorted[j].y - sorted[j].l / 2 - nose, sorted[j].v));
      break;
    }
    // Seen from behind, a car the child's car only leans on from the side drives on as it was.
    if (trip.y > car.y && Math.abs(car.x - trip.x) < (car.w + CAR.w) / 2 + (trip.chase ? -0.02 : 0.06)) {
      const gap = trip.y - trip.l / 2 - nose;
      most = Math.min(most, behind(gap, trip.v));
      if (gap < 0.9 && car.v - trip.v > 1.2 && trip.t - car.honked > 3) {
        car.honked = trip.t;
        beep('honk');
      }
    }
    const aim = Math.min(car.cruise, most);
    car.braking = aim < car.v - 0.25;
    car.v = aim > car.v ? Math.min(aim, car.v + 3 * dt) : Math.max(aim, car.v - pace().brake * dt);
    car.y += car.v * dt;
    car.flash = Math.max(0, car.flash - dt);
  }
  // Seen from behind, a car left behind the camera is gone for good.
  trip.cars = trip.cars.filter((car) => car.y > trip.y - near - (trip.chase ? 0 : 12) && car.y < trip.road.length + far + 6);
}

/* The soft bump: the child's car slows, the other car's lamps flash, a horn sounds. */
function bump(car) {
  if (trip.t - trip.bumped <= 1) return;
  trip.bumped = trip.t;
  trip.v *= 0.6;
  car.flash = 0.6;
  sound.wrong();
  setTimeout(() => beep('honk'), 180);
}

/* Seen from behind, a car beside the child's car is a wall: steered into, his
   car is put back sideways to where the two touch, with the soft bump, and
   the other car stays exactly where it is. A car he has only just passed,
   still between him and the camera, is a wall too, and sounds its horn: let
   in front of it, his car would be hidden behind it. Only his own car is
   ever moved along the road, and only when the two were already in line in
   one lane. */
function touchBeside() {
  const edge = 1.5 - CAR.w / 2 - 0.05;
  for (const car of trip.cars) {
    if (!walls(car, car.x)) continue;
    const reach = (car.w + CAR.w) / 2;
    const touching = car.y + car.l / 2 > trip.y - trip.l / 2;
    if (Math.abs(car.x - trip.was) < reach - 0.02) {
      if (!touching) continue;
      trip.y = car.y + (car.y > trip.y ? -1 : 1) * ((car.l + trip.l) / 2);
    } else {
      trip.x = clamp(car.x + (trip.was < car.x ? -reach : reach), -edge, edge);
    }
    if (touching) bump(car);
    else if (trip.t - car.honked > 3) {
      car.honked = trip.t;
      beep('honk');
    }
  }
  trip.was = trip.x;
}

/* A touch is a soft bump: the cars part, the child's car slows, a horn sounds. */
function touchCars() {
  const edge = 1.5 - CAR.w / 2 - 0.05;
  for (const car of trip.cars) {
    const overX = (car.w + CAR.w) / 2 - Math.abs(car.x - trip.x);
    const overY = (car.l + CAR.l) / 2 - Math.abs(car.y - trip.y);
    if (overX <= 0 || overY <= 0) continue;
    if (overX < overY * 0.7) trip.x = clamp(trip.x + (trip.x < car.x ? -overX : overX), -edge, edge);
    else if (trip.y < car.y) trip.y -= overY;
    else car.y -= overY;
    bump(car);
  }
}

/* Driving over a star takes it. Stars taken one after another pop higher and higher. */
/* Driving over a star takes it, with no sound: a ping for every star was
   too much. Every star passed over since the last frame counts, so that a
   fast car on a slow tablet does not jump over one. */
function pickUp(dt, was = trip.y) {
  const reach = trip.chase ? trip.l / 2 + 0.1 : 0.75; // seen from behind, as the car's nose comes to it
  for (const star of trip.pickups) {
    if (star.got) {
      star.got += dt;
      continue;
    }
    if (Math.abs(star.x - trip.x) > 0.5 || star.y < Math.min(was, trip.y) - reach || star.y > trip.y + reach) continue;
    star.got = 0.001;
    trip.streak = trip.t - trip.picked < 2.5 ? trip.streak + 1 : 0;
    trip.picked = trip.t;
    trip.earned += 1;
    stars += 1;
    shown = stars;
    showCount();
  }
}

function update(dt) {
  trip.t += dt;
  if (trip.parked) {
    trip.out = Math.min(1, trip.out + dt / (trip.chase ? 2.6 : 1.4)); // seen from behind she walks out to the car, further
    if (trip.chase) moveTraffic(dt); // the road ahead stays in sight, and the cars on it drive on
    return;
  }
  const steer = steering(dt, trip.chase ? chase.pointed : undefined); // seen from behind, a finger points along the road as well as across it
  for (const stop of trip.stops) updateStop(stop, dt);
  const was = trip.y;
  const turn = trip.phase === 'drive' ? driveOn(dt, steer) : 0;
  if (trip.phase !== 'drive') turnOff(dt);
  cx = width / 2 - trip.pan * lane;
  // Seen from behind, the wall comes before traffic moves, so that a car leaned on does not brake for it.
  if (trip.chase && trip.phase === 'drive') touchBeside();
  placeLines();
  moveTraffic(dt);
  if (!trip.chase && trip.phase === 'drive') touchCars();
  pickUp(dt, was);

  // Near the end the right turn signal comes on, a little before the car
  // takes itself to the right lane, and ticks until it has turned and stopped.
  // At these speeds it comes on 50 lanes before the end, a few seconds ahead.
  trip.signal = !trip.parked && trip.y > trip.road.length - 50 ? 1 : 0;
  const lit = Boolean(trip.signal) && blinkOn();
  if (lit !== trip.lit) {
    trip.lit = lit;
    if (trip.signal) beep('blink', lit);
  }
  dash(trip.y / trip.road.length, turn, trip.phase !== 'drive' || trip.y > trip.road.length - 26);
}

/* The bar along the top, the pedals, the little wheel and the finger's hint,
   for the roads and the desert alike. */
function dash(done, turn, ending) {
  const part = Math.round(clamp(done, 0, 1) * 200) / 2;
  if (part !== trip.shown) {
    trip.shown = part;
    $('trip').style.setProperty('--part', `${part}%`);
  }
  root.classList.toggle('wait', trip.held);
  root.classList.toggle('gas', pedalDown() && !trip.held && !trip.parked);
  $('wheel').style.transform = `rotate(${(tilting() && !ending ? clamp(tilt.angle, -50, 50) : turn * 30).toFixed(1)}deg)`;
  // With no tilt to read, a hand shows for a few seconds how to steer by finger.
  $('finger-hint').hidden = tilting() || finger.id !== null || keys.left || keys.right || trip.t < 1.5 || trip.t > 7 || ending;
}

function frame(now) {
  if (!running || !trip) return;
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (trip.desert) {
    desert.update(dt);
    desert.draw();
  } else {
    update(dt);
    render();
  }
  if (running) raf = requestAnimationFrame(frame);
}

/* A street's picture: from above, or from behind the car. */
function render() {
  if (trip.chase) chase.draw();
  else draw();
}

/* Arrived: the place's name is shown and said, then the praise; at the masjid
   the first words of the adhan follow, a different recording each time; at
   her house the grandmother comes out and waves. Then the buttons come. */
async function arrive(starX, starY) {
  const mine = trip;
  trip.parked = true;
  trip.done = true;
  trip.signal = 0;
  trip.earned += 5;
  stars += 5;
  save();
  sound.chime();
  flyStar(starX === undefined ? cx + trip.x * lane : starX, starY === undefined ? carY - lane : starY);
  $('arrived-name').textContent = road.goalName;
  $('arrived-stars').innerHTML = `${STAR}<span>${arabic(trip.earned)}</span>`;
  $('arrived-controls').hidden = true;
  show('arrived');
  const began = performance.now();
  await delay(700);
  if (trip !== mine) return;
  await within(sound.say(road.goalClip), 6000);
  if (trip !== mine) return;
  await within(sound.say('alhamdulillah'), 6000);
  if (trip !== mine) return;
  if (road.adhan) {
    adhanTurn = (adhanTurn % ADHANS) + 1;
    save();
    await within(sound.play(`adhan-${adhanTurn}.mp3`), 32000);
    if (trip !== mine) return;
  }
  await delay(Math.max(0, 3200 - (performance.now() - began)));
  if (trip !== mine) return;
  $('arrived-controls').hidden = false;
}

/* Leaving a drive, wherever it is: the exit button, the two buttons at the end. */
function leave() {
  running = false;
  cancelAnimationFrame(raf);
  duaRun += 1;
  sound.stop();
  beep('ambience', null);
  beep('engineOff');
  $('zikr').hidden = true;
  clearInterval(belt.timer);
  if (trip) save();
  trip = null;
  pedals.clear();
  finger.id = null;
  if (screen.orientation && screen.orientation.unlock) {
    try {
      screen.orientation.unlock();
    } catch {
      // Not locked.
    }
  }
}

/* The seat belt. The tongue is dragged from the pillar across the seat to the
   buckle; let go there and it clicks in. Anywhere else it slides back. */
const BELT = { top: [350, 64], bottom: [350, 346], rest: [344, 156], buckle: [86, 288], latch: [126, 288], reach: 52 };
const belt = { x: 344, y: 156, id: null, near: false, latched: false, timer: null };

function drawBelt() {
  const x = belt.near || belt.latched ? BELT.latch[0] : belt.x;
  const y = belt.near || belt.latched ? BELT.latch[1] : belt.y;
  const strap = `M${BELT.top[0]} ${BELT.top[1]}L${x} ${y}`;
  $('belt-strap').setAttribute('d', strap);
  $('belt-strap-line').setAttribute('d', strap);
  $('belt-lap').setAttribute('d', `M${BELT.bottom[0]} ${BELT.bottom[1]}L${x} ${y}`);
  const turn = belt.near || belt.latched ? 0 : Math.atan2(y - BELT.top[1], x - BELT.top[0]) / RAD + 180;
  $('belt-tongue').setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${turn.toFixed(1)})`);
  $('belt').classList.toggle('near', belt.near);
  $('belt').classList.toggle('latched', belt.latched);
}

function beltPoint(event) {
  const box = $('belt').getBoundingClientRect();
  return [((event.clientX - box.left) / box.width) * 400, ((event.clientY - box.top) / box.height) * 400];
}

function slideBack() {
  clearInterval(belt.timer);
  const [x0, y0] = [belt.x, belt.y];
  let step = 0;
  belt.timer = setInterval(() => {
    step += 1;
    const t = 1 - (1 - step / 12) ** 2;
    belt.x = x0 + (BELT.rest[0] - x0) * t;
    belt.y = y0 + (BELT.rest[1] - y0) * t;
    drawBelt();
    if (step >= 12) clearInterval(belt.timer);
  }, 16);
}

function latch(byTouch) {
  if (belt.latched) return;
  belt.latched = true;
  belt.near = false;
  drawBelt();
  beep('click');
  if (!byTouch) askMotion();
  setTimeout(showDua, 1000);
}

$('belt-tongue').addEventListener('pointerdown', (event) => {
  if (belt.latched || belt.id !== null) return;
  clearInterval(belt.timer);
  belt.id = event.pointerId;
  try {
    $('belt-tongue').setPointerCapture(event.pointerId);
  } catch {
    // The pointer is already gone.
  }
  event.preventDefault();
});
$('belt-tongue').addEventListener('pointermove', (event) => {
  if (event.pointerId !== belt.id) return;
  const [x, y] = beltPoint(event);
  belt.x = clamp(x, 30, 372);
  belt.y = clamp(y, 40, 372);
  belt.near = Math.hypot(belt.x - BELT.buckle[0], belt.y - BELT.buckle[1]) < BELT.reach;
  drawBelt();
});
for (const type of ['pointerup', 'pointercancel']) {
  $('belt-tongue').addEventListener(type, (event) => {
    if (event.pointerId !== belt.id) return;
    belt.id = null;
    if (belt.near && type === 'pointerup') latch(event.pointerType === 'touch');
    else {
      belt.near = false;
      slideBack();
    }
  });
}
// A finger's release asks for the tilt here: iPhone and iPad are known to
// count the end of a touch as one, and may not count the pointer's.
$('belt-tongue').addEventListener('touchend', () => {
  if (belt.latched) askMotion();
});
$('belt').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  latch(false);
});

function showBelt() {
  clearInterval(belt.timer);
  Object.assign(belt, { x: BELT.rest[0], y: BELT.rest[1], id: null, near: false, latched: false });
  drawBelt();
  show('belt');
  sound.say('belt');
}

/* The du'a of riding. Its words light up as the recording says them, as in
   the reciter; the go button comes when it ends, or after a moment when
   there is no recording yet. */
let dua = null;
let duaRun = 0;

function buildDua() {
  const box = $('dua');
  box.innerHTML = '';
  const words = [];
  for (const part of dua.parts) {
    const line = document.createElement('p');
    line.className = part.quran ? 'dua-line quran' : 'dua-line';
    for (let n = 0; n < (part.times || 1); n++) {
      const group = document.createElement('span');
      group.className = 'dua-said';
      part.words.forEach((word, i) => {
        const span = document.createElement('span');
        span.className = 'word-lit';
        span.textContent = part.quran ? mushafText(word) : word;
        group.append(span, i < part.words.length - 1 ? ' ' : '');
        // The timing follows the Quran's spelling, where the silent alif that opens
        // a word is a wasla; a plain one would be counted as a long vowel.
        words.push(part.quran ? word : word.replace(/^(\u0641\u064E)?\u0627/, '$1\u0671'));
      });
      line.append(group, ' ');
    }
    box.append(line);
  }
  dua.words = words;
}

function showDua() {
  const mine = ++duaRun;
  const lit = [...$('dua').querySelectorAll('.word-lit')];
  const light = (index) => lit.forEach((word, i) => word.classList.toggle('on', i === index));
  light(-1);
  $('go').hidden = true;
  show('dua');
  const ready = () => {
    if (mine !== duaRun) return;
    light(-1);
    $('go').hidden = false;
  };
  sound.buffer('riding-dua').then((decoded) => {
    if (mine !== duaRun) return;
    if (!decoded || !dua) {
      setTimeout(ready, 2500);
      return;
    }
    const times = timing.autoWords(dua.words, timing.envelope(decoded), { waqf: true });
    let ended = false;
    sound.play('riding-dua').then(() => {
      ended = true;
      ready();
    });
    const tick = () => {
      if (mine !== duaRun || ended) return;
      const playing = sound.current();
      if (playing && playing.name === 'riding-dua' && times.length === lit.length + 1) {
        const t = playing.position();
        let index = -1;
        if (t >= times[0] && t < times[times.length - 1]) {
          index = 0;
          while (index < lit.length - 1 && t >= times[index + 1]) index += 1;
        }
        light(index);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

$('go').addEventListener('click', async () => {
  duaRun += 1;
  sound.stop();
  await askMotion();
  startTrip();
});

/* A drive begins with the seat belt. A bike has none: the desert ride goes
   straight to the du'a. */
function begin() {
  if (road.desert) showDua();
  else showBelt();
}

/* The roads to pick from. */
function buildRoads() {
  const list = $('road-cards');
  list.innerHTML = '';
  for (const item of ROADS) {
    if (item.chase && typeof chase === 'undefined') continue; // an older saved page does not load chase.js
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'road-card';
    card.innerHTML = `<span class="road-art road-${item.id}${item.chase ? ' road-behind' : ''}"><img src="images/drive/${item.goal}.svg" alt=""></span><span class="road-name">${item.name}</span>`;
    card.addEventListener('click', () => {
      road = item;
      begin();
    });
    list.append(card);
  }
}

$('again').addEventListener('click', () => {
  leave();
  begin();
});
// The ✕ leaves a drive for the list of roads; from the list it is a link to the games.
$('exit').addEventListener('click', (event) => {
  if (view === 'roads') return;
  event.preventDefault();
  leave();
  show('roads');
});
$('to-roads').addEventListener('click', () => {
  leave();
  show('roads');
});

/* Finger steering sits in the ☰ menu, for a child who finds tilting hard. */
const menu = document.querySelector('.menu');
if (menu) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'menu-item steer-pick';
  const TILT_ICON = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="14" width="32" height="20" rx="4" fill="none" stroke="currentColor" stroke-width="3.5" transform="rotate(-16 24 24)"/><path d="M5 12q-3 6 0 12M43 24q3 6 0 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  const FINGER_ICON = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M20 26V9a4 4 0 0 1 8 0v13l8 2a5 5 0 0 1 4 6l-2 9a6 6 0 0 1-6 5H22a6 6 0 0 1-5-3l-7-11a3.5 3.5 0 0 1 5-5z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/></svg>';
  const paint = () => {
    button.innerHTML = steerBy === 'finger' ? FINGER_ICON : TILT_ICON;
    button.setAttribute('aria-label', steerBy === 'finger' ? 'التَّوْجِيهُ بِالْإِصْبَعِ' : 'التَّوْجِيهُ بِإِمَالَةِ الْجِهَازِ');
  };
  button.addEventListener('click', () => {
    steerBy = steerBy === 'finger' ? 'tilt' : 'finger';
    finger.id = null;
    save();
    paint();
  });
  paint();
  const rule = document.createElement('hr');
  rule.className = 'menu-rule';
  menu.append(rule, button);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    running = false;
    pedals.clear();
    finger.id = null;
    keys.left = keys.right = keys.gas = false;
  } else if ((view === 'trip' || view === 'arrived') && trip) {
    running = true;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    beep('ambience', trip.ambience);
  }
});
addEventListener('resize', () => {
  layout();
  if (trip && trip.desert) desert.draw();
  else if (trip) render();
});

/* Start */
load();
shown = stars;
showCount();
buildRoads();
layout();
askMotion();
loadSprites();
fetch('dua/riding.json').then((response) => response.json()).then((data) => {
  dua = data;
  buildDua();
}).catch(() => {});
sound.preloadPrompts(['belt']);
sound.preload(['riding-dua', 'alhamdulillah']);
if (LOCAL) window.driveGame = { get trip() { return trip; }, set road(id) { road = ROADS.find((item) => item.id === id); }, update, draw, render, tilt, steerAngle, onOrientation, keys, pedals, startTrip, show };
