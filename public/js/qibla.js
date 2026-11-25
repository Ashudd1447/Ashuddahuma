/* الْقِبْلَةُ: turning the boy to face the qibla. Everything is seen straight
   from above. The boy stands at one end of his prayer rug, facing the arch
   woven at its other end, which is the end that points to the qibla. A finger
   dragged round him turns the rug and the boy together, the way the hands of
   the clock follow a finger in clock.js. Three places, one after another,
   three rounds in each:

   - Makkah: the Kaaba in the middle of the white courtyard; he stands at a
     different spot around it each round and must face it. When he does,
     people in white stand in rings around the Kaaba, all facing it.
   - The masjid: a prayer hall, turned a different way on the screen each
     round; he must face the mihrab. When he does, a row of people stands
     beside him, shoulder to shoulder, facing it too.
   - Home: his room, with a qibla sign on the floor beside his rug, a green
     arrow with a small Kaaba on it, pointing a different way each round; he
     must face the way it points.

   He is right when he lets go within a few degrees (TOLERANCE): the rug
   settles exactly, a chime, «اللَّهُ أَكْبَرُ» shows and is said, and the picture
   of the first takbir shows whole beside it. Letting go anywhere else does
   nothing at all: he simply keeps turning. After a few tries the goal glows,
   and after a few more a faint line on the floor shows the way.

   The Kaaba is drawn as it stands: seen from the side of its door, the door
   is toward the left of that wall, by the corner of the Black Stone, and the
   low round wall of the Hijr is on the right. Every person is drawn from
   above with no face: hair or a head cover, and shoulders. */
const $ = (id) => document.getElementById(id);

/* What the child sees and hears. The parents approve every line. */
const PLACES = {
  makkah: { name: 'مَكَّةُ الْمُكَرَّمَةُ', nameClip: 'place-makkah', ask: 'اِتَّجِهْ نَحْوَ الْكَعْبَةِ', askClip: 'qibla-kaaba' },
  masjid: { name: 'الْمَسْجِدُ', nameClip: 'place-masjid', ask: 'اِتَّجِهْ نَحْوَ الْمِحْرَابِ', askClip: 'qibla-mihrab' },
  home: { name: 'الْبَيْتُ', nameClip: 'place-home', ask: 'اِتَّجِهْ نَحْوَ الْقِبْلَةِ', askClip: 'qibla-sign' },
};

/* The rounds. Angles are in degrees, clockwise from the top of the screen.
   spot: in Makkah, where he stands, as the way from the Kaaba to him.
   qibla: in the masjid, the way the mihrab is; at home, the way the sign points.
   off: how far from the right way he faces when the round opens. */
const ROUNDS = [
  { place: 'makkah', spot: 180, off: 130 },
  { place: 'makkah', spot: 300, off: -105 },
  { place: 'makkah', spot: 40, off: 175 },
  { place: 'masjid', qibla: 0, off: -140 },
  { place: 'masjid', qibla: 118, off: 100 },
  { place: 'masjid', qibla: 236, off: 170 },
  { place: 'home', qibla: 52, off: 150 },
  { place: 'home', qibla: 205, off: -95 },
  { place: 'home', qibla: 318, off: 120 },
];
const TOLERANCE = { makkah: 12, masjid: 9, home: 7 }; // degrees
const NUDGE = 3; // let go wrongly this often, and the goal glows
const GUIDE = 6; // and this often: a faint line on the floor shows the way
const STEP = 6; // degrees an arrow key turns him

/* Lengths, in units. What matters in a picture lies within five units of
   its middle; the screen's shorter side shows a little more than that. */
const ACROSS = 10.6;
const RUG = { wide: 1.5, front: 1.95, back: 0.6 }; // from where he stands to its two ends
const BOY = 1.25; // how large he is drawn: a little larger than life, so that a small screen shows him
const AWAY = 3.7; // Makkah: how far from the middle of the Kaaba he stands
const KAABA = 0.9; // half its side
const WALL = 0.5; // how much of its door wall shows below the roof
const RINGS = [2.3, 3.0, AWAY, 4.4, 5.1]; // where the people stand around it: he is in the third ring
const SIGN = [-2.45, 2.3]; // home: where the qibla sign lies on the floor
const DEAD = 0.3; // a finger this near him gives no steady angle
const CORNER = 130; // px at the top right that belong to the ✕ and the menu

/* Seconds. */
const SETTLE = 0.32; // the rug turning the last few degrees
const POP = 0.35; // a person arriving
const WON_LEAST = 2.8; // how long a round that is won shows, at least
const WON_MOST = 7; // and at most, while a recording is still playing
const FADE = 0.35; // one round's picture giving way to the next
const REST = 1.6; // the praise, before its buttons

const rad = (deg) => (deg * Math.PI) / 180;
const mod = (n, m) => ((n % m) + m) % m;
const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const apart = (a, b) => {
  const d = mod(a - b, 360);
  return Math.min(d, 360 - d);
};
const toward = (deg) => [Math.sin(rad(deg)), -Math.cos(rad(deg))]; // one unit that way on the screen
const ease = (t) => 1 - (1 - t) ** 3;
const pop = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2);
/* The same numbers every time, so that a picture does not change between two
   drawings. The generator's first numbers are always small: three are thrown away. */
const seeded = (seed) => {
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  next();
  next();
  next();
  return next;
};

const root = $('qibla');
const canvas = $('scene');
const ctx = canvas.getContext('2d');
const back = document.createElement('canvas'); // the place as a picture, painted once for each round and size
const shot = document.createElement('canvas'); // the round before, while it fades away
const bar = $('bar');

let round = 0;
let heading = 0; // the way he faces
let target = 0; // the right way
let phase = 'turn'; // turn, settle, won, done
let time = 0; // seconds into the phase
let from = 0; // where the rug settles from
let misses = 0; // how often he has let go facing wrongly, this round
let grab = null; // the finger that turns him
let crowd = []; // the people who come when he is right
let arrived = 0; // seconds into the win by which the last of them stands still
let said = true; // whether the recording that was started has ended
let turn = 0; // counts recordings started: an older one's end must not count
let fade = 0; // how much of the round before still shows
let clock = 0; // seconds, for the goal's glow
let fit = null; // the picture on the screen: size, pixel ratio, the unit, the middle
let dirty = false;
let raf = 0;
let last = 0;

const here = () => ROUNDS[round];
/* Where he stands, in units from the middle of the picture. */
const standing = (r = here()) => (r.place === 'makkah' ? toward(r.spot).map((n) => n * AWAY) : [0, 0]);
const goal = (r) => (r.place === 'makkah' ? mod(r.spot + 180, 360) : r.qibla);

/* Shapes */
function box(c, x, y, w, h, r = 0) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function oval(c, x, y, rx, ry) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function paint(c, fill, stroke, width) {
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
}

function line(c, x1, y1, x2, y2, stroke, width) {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.strokeStyle = stroke;
  c.lineWidth = width;
  c.stroke();
}

/* A pointed arch standing on y = foot, its tip at y = tip, half as wide as `half`. */
function arch(c, half, foot, tip) {
  const shoulder = foot + (tip - foot) * 0.5;
  c.beginPath();
  c.moveTo(-half, foot);
  c.lineTo(-half, shoulder);
  c.quadraticCurveTo(-half, tip + (foot - tip) * 0.14, 0, tip);
  c.quadraticCurveTo(half, tip + (foot - tip) * 0.14, half, shoulder);
  c.lineTo(half, foot);
  c.closePath();
}

/* Makkah: the white marble of the courtyard in rings around the Kaaba, the
   Hijr, and the Kaaba: its roof, and below it a little of the door wall with
   the gold band, the door and the Black Stone's corner. */
function paintMakkah(c) {
  c.fillStyle = '#F4F0E8';
  c.fillRect(-60, -60, 120, 120);
  c.strokeStyle = 'rgba(170,152,120,.3)';
  c.lineWidth = 0.03;
  for (let r = 1.95; r < 44; r += 0.7) {
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.stroke();
  }
  c.strokeStyle = 'rgba(170,152,120,.16)';
  for (let n = 0; n < 24; n++) {
    const [x, y] = toward(n * 15 + 7.5);
    c.beginPath();
    c.moveTo(x * 1.95, y * 1.95);
    c.lineTo(x * 44, y * 44);
    c.stroke();
  }
  c.lineCap = 'round';
  c.beginPath();
  c.arc(KAABA + 0.1, 0, 0.82, -Math.PI / 2, Math.PI / 2);
  paint(c, null, '#CDBFA4', 0.2);
  paint(c, null, '#FBF8F1', 0.12);
  c.lineCap = 'butt';
  oval(c, 0.05, KAABA + WALL + 0.06, KAABA * 1.15, 0.12);
  paint(c, 'rgba(74,52,36,.16)');
  c.lineJoin = 'round';
  box(c, -KAABA, KAABA, KAABA * 2, WALL);
  paint(c, '#15120F', '#0B0908', 0.05);
  line(c, -KAABA + 0.03, KAABA + WALL * 0.3, KAABA - 0.03, KAABA + WALL * 0.3, '#D8A53A', 0.085);
  box(c, -KAABA + 0.3, KAABA + WALL * 0.46, 0.36, WALL * 0.54);
  paint(c, '#D8A53A', '#9A6F1D', 0.025);
  oval(c, -KAABA + 0.065, KAABA + WALL * 0.74, 0.045, 0.06);
  paint(c, '#C9CDD2', '#0B0908', 0.018);
  box(c, -KAABA, -KAABA, KAABA * 2, KAABA * 2);
  paint(c, '#262220', '#0B0908', 0.05);
  box(c, -KAABA + 0.11, -KAABA + 0.11, KAABA * 2 - 0.22, KAABA * 2 - 0.22);
  paint(c, null, '#3D3731', 0.035);
}

/* The masjid's prayer hall, drawn with the qibla upward and turned as the
   round asks: the carpet in rows, each place marked by a small arch; the
   walls; the mihrab, a niche in the front wall; the minbar on its right, its
   steps rising to the wall; four columns; the door at the back. */
const HALL = { half: 4.7, front: -4.05, back: 4.7, row: 1.1, place: 0.94, niche: 0.88 };
function paintMasjid(c, r) {
  c.fillStyle = '#E7DCC6';
  c.fillRect(-60, -60, 120, 120);
  c.save();
  c.rotate(rad(r.qibla));
  const { half, front, back: rear, row, place, niche } = HALL;
  c.fillStyle = '#2F8B7B';
  c.fillRect(-half, front, half * 2, rear - front);
  for (let y = front + 0.95; y < rear - 0.2; y += row) {
    c.fillStyle = 'rgba(20,70,62,.22)';
    c.fillRect(-half, y, half * 2, 0.16);
    line(c, -half, y, half, y, '#E9CF95', 0.05);
    c.strokeStyle = 'rgba(233,207,149,.42)';
    c.lineWidth = 0.028;
    for (let x = -place * 4.5; x < half - 0.3; x += place) {
      c.save();
      c.translate(x + place / 2, 0);
      arch(c, place * 0.3, y - 0.12, y - 0.74);
      c.stroke();
      c.restore();
    }
  }
  for (const x of [-half, half]) {
    for (const y of [-2.4, 0.2, 2.8]) {
      c.fillStyle = '#BFE0F2';
      c.fillRect(x - 0.2, y - 0.5, 0.4, 1);
    }
  }
  c.lineJoin = 'miter';
  c.beginPath();
  c.rect(-half, front, half * 2, rear - front);
  paint(c, null, '#C7B28B', 0.34);
  paint(c, null, '#E4D5B4', 0.2);
  c.fillStyle = '#D9C7A2';
  c.fillRect(-0.95, rear - 0.17, 1.9, 0.34);
  /* The mihrab. */
  c.fillStyle = '#2F8B7B';
  c.fillRect(-niche + 0.08, front - 0.18, niche * 2 - 0.16, 0.36);
  c.beginPath();
  c.arc(0, front, niche, Math.PI, 0);
  paint(c, '#F6EEDB', '#C98A45', 0.1);
  c.beginPath();
  c.arc(0, front, niche * 0.65, Math.PI, 0);
  paint(c, null, '#2A9D8F', 0.06);
  line(c, -niche, front, -niche, front + 0.2, '#C98A45', 0.1);
  line(c, niche, front, niche, front + 0.2, '#C98A45', 0.1);
  /* The minbar, on the right of the mihrab for one who faces it. */
  box(c, 1.2, front + 0.17, 0.8, 2, 0.04);
  paint(c, '#9A6A3C', '#5E3D1F', 0.045);
  for (let n = 0; n < 6; n++) line(c, 1.2, front + 2.17 - 0.2 - n * 0.22, 2, front + 2.17 - 0.2 - n * 0.22, '#5E3D1F', 0.03);
  box(c, 1.26, front + 0.23, 0.68, 0.6, 0.03);
  paint(c, '#B98250', '#5E3D1F', 0.035);
  box(c, 1.42, front + 0.37, 0.36, 0.32, 0.03);
  paint(c, '#7A4E28');
  /* Columns. */
  for (const [x, y] of [[-2.75, -1.55], [2.75, -1.55], [-2.75, 1.75], [2.75, 1.75]]) {
    oval(c, x + 0.07, y + 0.09, 0.36, 0.36);
    paint(c, 'rgba(20,50,45,.28)');
    box(c, x - 0.36, y - 0.36, 0.72, 0.72, 0.05);
    paint(c, '#E2D6BC', '#B9A888', 0.035);
    oval(c, x, y, 0.29, 0.29);
    paint(c, '#F6EFE0', '#B9A888', 0.04);
  }
  c.restore();
}

/* His room: a wooden floor, the window with the light it lets in, the bed
   made and empty, the shelf of books, the door standing open, and on the
   floor beside his rug the qibla sign. */
function paintHome(c, r) {
  c.fillStyle = '#D8CBB3';
  c.fillRect(-60, -60, 120, 120);
  const half = 4.5;
  c.fillStyle = '#E6CDA3';
  c.fillRect(-half, -half, half * 2, half * 2);
  const random = seeded(11);
  c.save();
  c.beginPath();
  c.rect(-half, -half, half * 2, half * 2);
  c.clip();
  for (let y = -half; y < half; y += 0.62) {
    line(c, -half, y, half, y, 'rgba(150,108,60,.24)', 0.025);
    for (let x = -half + random() * 2; x < half; x += 1.6 + random() * 1.4) line(c, x, y, x, y + 0.62, 'rgba(150,108,60,.2)', 0.022);
  }
  c.restore();
  c.beginPath();
  c.moveTo(-1.3, -half);
  c.lineTo(1.3, -half);
  c.lineTo(2.1, -1.9);
  c.lineTo(-0.5, -1.9);
  c.closePath();
  paint(c, 'rgba(255,250,225,.42)');
  /* The bed, in the corner: short enough that his rug, turning, never reaches it. */
  box(c, 2.0, -4.26, 2.3, 3.3, 0.12);
  paint(c, '#A8743F', '#6E4A26', 0.04);
  box(c, 2.1, -4.14, 2.1, 3.08, 0.1);
  paint(c, '#FBF6EC');
  box(c, 2.36, -4.0, 1.58, 0.74, 0.2);
  paint(c, '#FFFFFF', '#D9CDB6', 0.03);
  box(c, 2.1, -2.8, 2.1, 1.74, 0.1);
  paint(c, '#5B8FD0', '#3F6FAE', 0.035);
  box(c, 2.1, -2.98, 2.1, 0.34, 0.08);
  paint(c, '#EAF2FB', '#B9CBE2', 0.025);
  /* The shelf of books. */
  box(c, -4.32, -2.9, 0.74, 3.5, 0.04);
  paint(c, '#B98A55', '#7A5530', 0.04);
  const COVERS = ['#C0563F', '#3E76C2', '#E9A43C', '#5E9E45', '#8E5AA8', '#2A9D8F'];
  for (let n = 0; n < 12; n++) {
    c.fillStyle = COVERS[n % COVERS.length];
    c.fillRect(-4.25, -2.8 + n * 0.275, 0.46 + (n % 3) * 0.05, 0.2);
  }
  /* The walls, the window in the far one, the open door in the near one. */
  c.lineJoin = 'miter';
  c.beginPath();
  c.rect(-half, -half, half * 2, half * 2);
  paint(c, null, '#9C8A6C', 0.36);
  paint(c, null, '#C9B796', 0.24);
  box(c, -1.3, -half - 0.16, 2.6, 0.32);
  paint(c, '#BFE0F2', '#FFFFFF', 0.06);
  line(c, 0, -half - 0.16, 0, -half + 0.16, '#FFFFFF', 0.06);
  c.fillStyle = '#E6CDA3';
  c.fillRect(1.5, half - 0.2, 1.6, 0.4);
  c.beginPath();
  c.arc(3.1, half, 1.6, Math.PI, Math.PI + rad(62));
  paint(c, null, 'rgba(120,86,48,.35)', 0.03);
  const [dx, dy] = [Math.cos(Math.PI + rad(62)), Math.sin(Math.PI + rad(62))];
  c.lineCap = 'round';
  line(c, 3.1, half, 3.1 + dx * 1.6, half + dy * 1.6, '#8A5A33', 0.13);
  c.lineCap = 'butt';
  paintSign(c, r.qibla);
}

/* The qibla sign, as on a hotel room's floor: a green arrow, with a small
   Kaaba drawn on it. */
function paintSign(c, way) {
  c.save();
  c.translate(SIGN[0], SIGN[1]);
  c.rotate(rad(way));
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(0, -0.9);
  c.lineTo(0.5, -0.24);
  c.lineTo(0.22, -0.24);
  c.lineTo(0.22, 0.86);
  c.lineTo(-0.22, 0.86);
  c.lineTo(-0.22, -0.24);
  c.lineTo(-0.5, -0.24);
  c.closePath();
  paint(c, null, 'rgba(74,52,36,.2)', 0.2);
  paint(c, null, '#FFFFFF', 0.14);
  paint(c, '#2E9E5B', '#1F7A43', 0.035);
  box(c, -0.15, 0.3, 0.3, 0.32);
  paint(c, '#1A1714', '#FFFFFF', 0.025);
  line(c, -0.15, 0.4, 0.15, 0.4, '#D8A53A', 0.06);
  c.restore();
}

const PAINT = { makkah: paintMakkah, masjid: paintMasjid, home: paintHome };

/* His prayer rug, from where he stands: the short end behind him, the arch
   at the far end in front. */
function drawRug(c) {
  const { wide, front, back: rear } = RUG;
  box(c, -wide / 2 + 0.05, -front + 0.07, wide, front + rear, 0.06);
  paint(c, 'rgba(60,40,20,.2)');
  c.strokeStyle = '#EBD9AE';
  c.lineWidth = 0.03;
  c.beginPath();
  for (let x = -wide / 2 + 0.07; x < wide / 2; x += 0.112) {
    c.moveTo(x, -front);
    c.lineTo(x, -front - 0.11);
    c.moveTo(x, rear);
    c.lineTo(x, rear + 0.11);
  }
  c.stroke();
  box(c, -wide / 2, -front, wide, front + rear, 0.04);
  paint(c, '#A3312C', '#6E1F1C', 0.04);
  box(c, -wide / 2 + 0.1, -front + 0.1, wide - 0.2, front + rear - 0.2, 0.02);
  paint(c, null, '#E9CF95', 0.035);
  arch(c, 0.34, -front + 1.08, -front + 0.24);
  paint(c, '#E9CF95');
  arch(c, 0.22, -front + 1.01, -front + 0.42);
  paint(c, '#B8413A');
  line(c, -0.34, -front + 1.2, 0.34, -front + 1.2, '#E9CF95', 0.035);
}

/* The boy from above: black hair with its tuft at the front, so that one
   sees which way he faces; navy shoulders and arms, the right hand over the
   left on his chest; the red scarf, its end down his back. No face. */
function drawBoy(c) {
  c.save();
  c.scale(BOY, BOY);
  c.lineCap = 'round';
  line(c, -0.1, 0.12, -0.2, 0.35, '#8E211C', 0.125);
  line(c, -0.1, 0.12, -0.2, 0.35, '#C8352E', 0.085);
  oval(c, 0, 0.04, 0.33, 0.17);
  paint(c, '#27406B', '#16243F', 0.03);
  /* An arm from its shoulder round to the chest, and its hand. */
  const arm = (shoulder, handX, handY) => {
    for (const [color, width] of [['#16243F', 0.15], ['#27406B', 0.1]]) {
      c.beginPath();
      c.moveTo(shoulder, 0.03);
      c.quadraticCurveTo(shoulder * 1.04, -0.25, handX - Math.sign(shoulder) * -0.07, handY + 0.01);
      c.strokeStyle = color;
      c.lineWidth = width;
      c.stroke();
    }
    oval(c, handX, handY, 0.07, 0.052);
    paint(c, '#E8B58C', '#8A5A3A', 0.018);
  };
  arm(-0.28, 0.07, -0.25); // the left arm, its hand on the chest
  arm(0.28, -0.05, -0.275); // the right arm over it, its hand on the left one
  c.lineCap = 'butt';
  oval(c, 0, 0.025, 0.2, 0.165);
  paint(c, '#C8352E', '#8E211C', 0.025);
  for (const x of [-0.152, 0.152]) {
    oval(c, x, 0, 0.034, 0.04);
    paint(c, '#E8B58C', '#8A5A3A', 0.016);
  }
  c.beginPath();
  c.moveTo(-0.08, -0.11);
  c.quadraticCurveTo(-0.03, -0.17, 0.03, -0.225);
  c.quadraticCurveTo(0.05, -0.16, 0.09, -0.1);
  c.closePath();
  paint(c, '#1A1614');
  oval(c, 0, 0.005, 0.156, 0.156);
  paint(c, '#1A1614');
  c.beginPath();
  c.arc(0, 0.005, 0.105, Math.PI * 1.1, Math.PI * 1.55);
  paint(c, null, 'rgba(255,255,255,.17)', 0.028);
  c.restore();
}

/* A grown-up from above: shoulders, and hair or a head cover. */
function drawPerson(c, person, scale) {
  c.save();
  c.translate(person.x, person.y);
  c.rotate(rad(person.way));
  c.scale(scale, scale);
  oval(c, 0.03, 0.05, 0.4, 0.21);
  paint(c, 'rgba(60,40,20,.16)');
  oval(c, 0, 0.02, 0.38, 0.19);
  paint(c, person.cloth, person.edge, 0.025);
  oval(c, 0, -0.01, 0.16, 0.16);
  paint(c, person.head, person.rim, 0.02);
  if (person.cap) {
    oval(c, 0, -0.01, 0.095, 0.095);
    paint(c, null, person.rim, 0.014);
  }
  c.restore();
}

/* The people who come when he is right. In Makkah: rings around the Kaaba,
   everyone facing it, leaving his rug clear. In the masjid: one row, to his
   right and his left, shoulder to shoulder. At home he prays alone. */
function gather() {
  const r = here();
  const random = seeded(31 + round * 17);
  const people = [];
  if (r.place === 'makkah') {
    const HAIR = ['#1F1A17', '#1F1A17', '#2E2520', '#3A2A1E', '#6B645C', '#8C857C'];
    const [sx, sy] = standing(r);
    const [fx, fy] = toward(target);
    RINGS.forEach((ring, n) => {
      const count = Math.floor((2 * Math.PI * ring) / 0.92);
      for (let k = 0; k < count; k++) {
        const bearing = r.spot + ((k + (n % 2) / 2) * 360) / count;
        const [x, y] = toward(bearing).map((v) => v * ring);
        /* His rug, and a little room around it, stay clear. */
        const along = (x - sx) * fx + (y - sy) * fy;
        const across = Math.abs(-(x - sx) * fy + (y - sy) * fx);
        if (across < RUG.wide / 2 + 0.46 && along > -RUG.back - 0.5 && along < RUG.front + 0.45) continue;
        const covered = random() < 0.22;
        people.push({
          x, y, way: mod(bearing + 180, 360), wait: n * 0.13 + random() * 0.3,
          cloth: '#FFFFFF', edge: '#C9C1B1',
          head: covered ? '#FFFFFF' : HAIR[Math.floor(random() * HAIR.length)], rim: covered ? '#BDB5A5' : '#14100E', cap: false,
        });
      }
    });
  } else if (r.place === 'masjid') {
    const CLOTH = ['#FFFFFF', '#F1EADB', '#CFE0EE', '#D9C4A0', '#C9CCD1', '#D5DEC6'];
    const [ax, ay] = toward(r.qibla + 90);
    for (let k = 0; k < 4; k++) {
      for (const side of [1, -1]) {
        const reach = side * (RUG.wide / 2 + 0.43 + k * 0.84);
        const cap = random() < 0.45;
        people.push({
          x: ax * reach, y: ay * reach, way: r.qibla, wait: k * 0.14 + random() * 0.1,
          cloth: CLOTH[Math.floor(random() * CLOTH.length)], edge: '#B9B2A2',
          head: cap ? '#FFFFFF' : random() < 0.5 ? '#1F1A17' : '#3A2A1E', rim: cap ? '#BDB5A5' : '#14100E', cap,
        });
      }
    }
  }
  return people;
}

/* The goal glowing, and the line on the floor that shows the way, for a
   child who has tried several times. */
function drawHelp(c) {
  const r = here();
  if (phase !== 'turn' || misses < NUDGE) return;
  const beat = 0.45 + 0.35 * Math.sin(clock * 4.2);
  c.save();
  c.strokeStyle = `rgba(242,184,75,${beat.toFixed(3)})`;
  c.lineWidth = 0.16;
  if (r.place === 'makkah') {
    box(c, -KAABA - 0.2, -KAABA - 0.2, KAABA * 2 + 0.4, KAABA * 2 + WALL + 0.4, 0.14);
    c.stroke();
  } else if (r.place === 'masjid') {
    c.rotate(rad(r.qibla));
    c.beginPath();
    c.arc(0, HALL.front, HALL.niche + 0.22, Math.PI, 0);
    c.stroke();
  } else {
    c.beginPath();
    c.arc(SIGN[0], SIGN[1], 1.12, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
  if (misses < GUIDE) return;
  const [sx, sy] = standing(r);
  const [fx, fy] = toward(target);
  const reach = r.place === 'makkah' ? AWAY - KAABA - WALL - 0.1 : r.place === 'masjid' ? -HALL.front - 0.9 : 3;
  c.save();
  c.setLineDash([0.16, 0.2]);
  c.lineCap = 'round';
  line(c, sx, sy, sx + fx * reach, sy + fy * reach, 'rgba(242,184,75,.85)', 0.09);
  c.restore();
}

function draw() {
  dirty = false;
  if (!fit) return;
  const { ratio, u, cx, cy } = fit;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(back, 0, 0);
  ctx.setTransform(ratio * u, 0, 0, ratio * u, ratio * cx, ratio * cy);
  drawHelp(ctx);
  if (phase === 'won' || phase === 'done') {
    for (const person of crowd) drawPerson(ctx, person, phase === 'done' ? 1 : pop((time - person.wait) / POP));
  }
  const [sx, sy] = standing();
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(rad(heading));
  drawRug(ctx);
  drawBoy(ctx);
  ctx.restore();
  if (fade > 0 && shot.width === canvas.width && shot.height === canvas.height) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = fade;
    ctx.drawImage(shot, 0, 0);
    ctx.globalAlpha = 1;
  }
}

/* The place painted once on a picture of its own, so that a turn of the rug
   costs one picture, the rug and the boy. */
function paintBack() {
  if (!fit) return;
  const { ratio, u, cx, cy } = fit;
  back.width = canvas.width;
  back.height = canvas.height;
  const c = back.getContext('2d');
  c.setTransform(ratio * u, 0, 0, ratio * u, ratio * cx, ratio * cy);
  PAINT[here().place](c, here());
}

/* The picture fills the screen; what matters is kept in a square below the
   words (beside them on a low, wide screen, and there clear of the ✕ and the
   menu, so that his rug is never under them). */
function layout() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  const side = w / h > 1.45 && h < 560;
  root.toggleAttribute('data-side', side);
  const ratio = Math.min(devicePixelRatio || 1, 3);
  const words = bar.getBoundingClientRect();
  const area = side
    ? { x: words.right + 8, y: 6, w: w - words.right - 16 - CORNER, h: h - 44 }
    : { x: 0, y: words.bottom + 6, w, h: h - words.bottom - 6 - 36 };
  const u = Math.max(6, Math.min(area.w, area.h) / ACROSS);
  canvas.width = Math.round(w * ratio);
  canvas.height = Math.round(h * ratio);
  fit = { w, h, ratio, u, cx: area.x + area.w / 2, cy: area.y + area.h / 2 };
  fade = 0;
  paintBack();
  draw();
}

/* Time passing: the rug settling, the people arriving, one round giving way
   to the next. */
const moving = () => phase === 'settle' || phase === 'won' || fade > 0 || (phase === 'turn' && misses >= NUDGE);

function update(dt) {
  clock += dt;
  if (fade > 0) {
    fade = Math.max(0, fade - dt / FADE);
    dirty = true;
  }
  if (phase === 'settle') {
    time += dt;
    let swing = mod(target - from, 360);
    if (swing > 180) swing -= 360;
    heading = mod(from + swing * ease(clamp(time / SETTLE)), 360);
    dirty = true;
    if (time >= SETTLE) won();
  } else if (phase === 'won') {
    /* Drawn anew only while the people are still arriving: a courtyard full of them is a heavy picture. */
    if (time <= arrived) dirty = true;
    time += dt;
    if (time >= WON_LEAST && (said || time >= WON_MOST)) {
      if (round + 1 < ROUNDS.length) startRound(round + 1);
      else finish();
    }
  } else if (phase === 'turn' && misses >= NUDGE) dirty = true;
}

function loop(now) {
  raf = 0;
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  update(dt);
  if (dirty) draw();
  /* update() may have opened the next round, which asks for a frame itself: never two loops. */
  if (!raf && moving() && !document.hidden) raf = requestAnimationFrame(loop);
}

/* Asks for one drawing; while something moves, the loop keeps itself going. */
function refresh() {
  dirty = true;
  if (raf || document.hidden) return;
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

/* A recorded line, in the family's dialect; silent while it is not recorded. */
function speak(clips) {
  const mine = ++turn;
  const still = () => mine === turn;
  said = false;
  clips
    .reduce((chain, clip) => chain.then(() => (still() ? salah.hear(clip, { prompt: true, still }) : false)), Promise.resolve())
    .then(() => {
      if (still()) said = true;
    });
}

function showDots() {
  const box = $('dots');
  if (!box.children.length) {
    for (let n = 0; n < 3; n++) {
      const group = document.createElement('span');
      group.className = 's-dots';
      box.append(group);
    }
  }
  const finished = phase === 'won' || phase === 'done' ? round + 1 : round;
  [...box.children].forEach((group, n) => {
    salah.dots(group, 3, clamp(finished - n * 3, 0, 3));
    if (finished < n * 3 || phase === 'done') for (const dot of group.children) dot.classList.remove('now');
  });
}

function startRound(n) {
  /* The picture as it stands fades into the new one. */
  if (fit && canvas.width) {
    shot.width = canvas.width;
    shot.height = canvas.height;
    shot.getContext('2d').drawImage(canvas, 0, 0);
    fade = 1;
  }
  const opens = n === 0 || ROUNDS[n - 1].place !== ROUNDS[n].place;
  round = n;
  const r = here();
  const place = PLACES[r.place];
  target = goal(r);
  heading = mod(target + r.off, 360);
  phase = 'turn';
  time = 0;
  misses = 0;
  crowd = [];
  grab = null;
  bar.classList.remove('won');
  $('place').textContent = place.name;
  $('ask').textContent = place.ask;
  showDots();
  paintBack();
  refresh();
  /* A place's name when it opens, then what to do. */
  speak(opens ? [place.nameClip, place.askClip] : [place.askClip]);
}

/* He let go. Within a few degrees of the right way the rug settles on it;
   anywhere else nothing happens, and he keeps turning. */
function check(counts = true) {
  if (phase !== 'turn') return;
  if (apart(heading, target) <= TOLERANCE[here().place]) {
    from = heading;
    phase = 'settle';
    time = 0;
  } else if (counts) misses += 1;
  refresh();
}

function won() {
  heading = target;
  phase = 'won';
  time = 0;
  crowd = gather();
  arrived = crowd.reduce((most, person) => Math.max(most, person.wait), 0) + POP;
  salah.beep('chime');
  $('zikr').textContent = salah.TEXT.takbir.text;
  bar.classList.add('won');
  showDots();
  speak([salah.TEXT.takbir.clip]);
}

function finish() {
  phase = 'done';
  turn += 1;
  salah.finish('qibla');
  $('buttons').hidden = true;
  $('done').hidden = false;
  salah.beep('chime');
  const mine = turn;
  const still = () => mine === turn;
  Promise.all([salah.delay(REST * 1000), Promise.race([salah.delay(350).then(() => salah.hear(salah.TEXT.praise.clip, { still })), salah.delay(5000)])]).then(() => {
    if (still()) $('buttons').hidden = false;
  });
  refresh();
}

/* The finger. Its angle round the boy turns him by as much as it moves. */
function polar(event) {
  const frame = canvas.getBoundingClientRect();
  const [sx, sy] = standing();
  const dx = event.clientX - frame.left - (fit.cx + sx * fit.u);
  const dy = event.clientY - frame.top - (fit.cy + sy * fit.u);
  return { angle: mod((Math.atan2(dx, -dy) * 180) / Math.PI, 360), r: Math.hypot(dx, dy) / fit.u };
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.button > 0 || phase !== 'turn' || !fit || (grab && !event.isPrimary)) return;
  event.preventDefault();
  const at = polar(event);
  grab = { id: event.pointerId, angle: at.r >= DEAD ? at.angle : null, moved: false };
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    // A pointer that is already gone cannot be held.
  }
});
canvas.addEventListener('pointermove', (event) => {
  if (!grab || event.pointerId !== grab.id || phase !== 'turn') return;
  const at = polar(event);
  if (at.r < DEAD) {
    grab.angle = null; // too near him for a steady angle
    return;
  }
  if (grab.angle === null) {
    grab.angle = at.angle;
    return;
  }
  let swing = mod(at.angle - grab.angle, 360);
  if (swing > 180) swing -= 360;
  if (!swing) return;
  grab.angle = at.angle;
  grab.moved = true;
  heading = mod(heading + swing, 360);
  refresh();
});
function letGo(event) {
  if (!grab || event.pointerId !== grab.id) return;
  const { moved } = grab;
  grab = null;
  if (moved) check();
}
canvas.addEventListener('pointerup', letGo);
canvas.addEventListener('pointercancel', letGo);
canvas.addEventListener('lostpointercapture', letGo);
document.addEventListener('contextmenu', (event) => event.preventDefault());

/* On a computer the arrow keys turn him; letting the key go is letting go
   (a key let go facing wrongly is not counted as a try: there are many). */
const KEYS = { ArrowLeft: -STEP, ArrowRight: STEP };
addEventListener('keydown', (event) => {
  if (!(event.key in KEYS) || phase !== 'turn' || grab) return;
  event.preventDefault();
  heading = mod(heading + KEYS[event.key], 360);
  refresh();
});
addEventListener('keyup', (event) => {
  if (event.key in KEYS && !grab) check(false);
});

/* A tap on the words says them again. */
bar.addEventListener('click', () => {
  if (phase === 'turn') speak([PLACES[here().place].askClip]);
});
$('again').addEventListener('click', () => {
  $('done').hidden = true;
  startRound(0);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(raf);
    raf = 0;
    if (grab) {
      grab = null;
      check();
    }
  } else refresh();
});
addEventListener('resize', layout);
if (typeof ResizeObserver === 'function') new ResizeObserver(layout).observe(canvas);

/* For trying the game by hand on the family's computer: turn him, let go,
   pass time and draw. */
if (salah.LOCAL) {
  window.qiblaGame = {
    go: startRound,
    turn(deg) {
      if (phase !== 'turn') return;
      heading = mod(deg, 360);
      refresh();
    },
    release: () => check(),
    update,
    draw,
    layout,
    get state() {
      const [sx, sy] = standing();
      return {
        round, place: here().place, phase, heading, target, off: apart(heading, target), tolerance: TOLERANCE[here().place],
        misses, crowd: crowd.length, said, fade, fit, running: raf !== 0, done: salah.isDone('qibla'),
        boy: fit ? [fit.cx + sx * fit.u, fit.cy + sy * fit.u] : null,
      };
    },
  };
}

/* Start */
$('takbir').append(salah.picture(salah.STATIONS.takbir));
sound.preloadPrompts([salah.TEXT.takbir.clip, ...Object.values(PLACES).flatMap((place) => [place.nameClip, place.askClip])]);
sound.preload([salah.TEXT.praise.clip]);
layout();
startRound(0);
