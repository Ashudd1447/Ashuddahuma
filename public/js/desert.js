/* الْوَاحَةُ: the ride to the oasis, the third of the driving games. An
   all-terrain bike is steered across the open desert, seen from straight
   behind it: it points the way it goes, up the middle of the picture.
   Either pedal makes it go; letting go slows it; nothing is ever lost.
   The picture is built so that it does not make anyone dizzy. The horizon
   stays at one height and never tilts; the sky, the sun and the far hills
   stand still; the camera never turns, and looks straight ahead; the bike
   stays in one place on the screen. Only the ground moves, out of one point
   ahead, and what passes close by is soft, pale and fading.
   There is no road. The way is shown by pairs of flags, by a faint pair of
   old tire tracks, by the lines of stars, and at the end by the palms of
   the oasis. Beyond the flags the sand is soft and slow and eases the bike
   back, so nobody wanders off.
   The ground has a height that changes along the way: rolling dunes, a
   hollow, a ridge, and one mountain (the takbir going up, the tasbih coming
   down). The camera follows the ground under the bike, so a climb shows as
   sand rising ahead over the horizon, a top as sand falling away, and a
   descent as the land spread out below. Rocks and wells stand in the way: a
   soft bump, and the bike slides around. Camels, gazelles and a fox are
   friends beside the way; an eagle glides high in the sky.
   The bike leaves the ground in one kind of place only: a jump ramp, a dune
   with a steady face up to a sharp lip and a steep drop behind it, its lip
   marked by two striped posts. The bike rides up the face on its wheels; at
   the lip the sand falls away from under it and it flies on as a thrown
   thing does, down to the long slope beyond.
   Every ride is put together anew from stretches picked and shuffled, at
   one of three times of day.
   This file leans on drive.js, loaded before it: the canvas and its sizes,
   the steering, the pedals, the stars, the sounds and the arrival screen
   are all there. Lengths are in lanes, as on the roads: x across, y (or z)
   along the ride, and heights up from the level sand. */
const desert = (() => {
  const PACE = { crawl: 2.6, max: 9.5, gain: 6, drop: 4.5, climb: 6, descent: 11.5, soft: 0.62, air: 6.5 };
  const TURN_RATE = 3.2; // lanes a second across, at full lock
  const HALF = 1.7; // half the width of the firm way between the flags
  const EDGE = 2.7; // the furthest the bike gets from the middle of the way
  const FLAG = 2.15; // where the flags stand, from the middle of the way
  /* A flag's pole or a ramp's post is not ridden through: from `lead` lanes
     before it the bike eases aside, to pass `clear` from its middle. */
  const POLE = { clear: 0.5, lead: 1.6 };
  const FOLLOW = 0.3; // how much of each bend the bike takes by itself
  /* The bike's drawing is this tall and its rear wheels this far from its
     middle; the camera rides this far straight behind it. */
  const BIKE = { tall: 1.25, wheel: 0.24, back: 4.6 };
  /* A jump ramp, in lanes past its foot: the sand eases up over `foot`, then
     climbs straight to the lip, `high` above the foot and `face` from it;
     behind the lip it falls by `drop` within `fall`, then runs out gently
     over `run`. */
  const RAMP = { face: 12, foot: 3, high: 2, fall: 1.5, drop: 1, run: 20 };
  const GRAVITY = 6; // lanes a second, each second: what brings a flying bike down
  const EASE = 0.1; // seconds the camera takes to follow the ground that falls away under a flight
  /* The ground is drawn from this near the camera to this far; things that stand, to a little less. */
  const VIEW = { near: 1.6, far: 124, things: 104 };
  const ZIKR = { up: { text: 'اللَّهُ أَكْبَرُ', clip: 'allahu-akbar' }, down: { text: 'سُبْحَانَ اللَّهِ', clip: 'subhanallah' } };
  /* The stretches a ride is made of: how long each is, and how much the way bends in it. */
  const LENGTH = { start: 30, dunes: 116, ridge: 100, hollow: 96, rocks: 88, wells: 88, caravan: 80, mountain: 150, grove: 46 };
  const SWAY = { start: 0, dunes: 1.2, ridge: 0.5, hollow: 1.6, rocks: 0.3, wells: 0.5, caravan: 1.3, mountain: 0.9, grove: 0.3 };
  const TALL = { camel: 2, gazelle: 1.5, fox: 0.9, acacia: 3.2, boulder: 1.15, rocks: 1.6, well: 1.6, tent: 2.1, shrub: 1, palm: 3.4, man: 1.4 }; // heights in lanes
  const MOUNTAIN = { up: 60, cap: 4, high: 11 };
  /* The hour: the sky from its top to the horizon, the far hills, the sand
     near and in the haze, and where the sun stands (across, down the sky,
     and its size). Shadows fall away from the sun: `lean` is how far to the right. */
  const DAYS = [
    { top: '#7DB9E8', mid: '#BFDDF0', low: [247, 230, 205], range: [170, 146, 160], sand: [238, 217, 176], haze: [241, 227, 202], sun: [0.2, 0.5, 0.045], glow: '255,246,222', lean: 0.6 },
    { top: '#4F9FE0', mid: '#A6D0F0', low: [228, 238, 242], range: [164, 156, 170], sand: [234, 204, 150], haze: [233, 223, 199], sun: [0.34, 0.16, 0.04], glow: '255,252,236', lean: 0.3 },
    { top: '#7AA5D6', mid: '#F1D2AC', low: [250, 206, 152], range: [176, 126, 110], sand: [232, 186, 128], haze: [243, 208, 165], sun: [0.8, 0.6, 0.055], glow: '255,226,170', lean: -0.6 },
  ];
  const PASS = 2.6; // a thing that has passed the bike has faded away by this near the camera
  const STEP = 0.5; // the way's middle and the ground's height are worked out once, every half lane
  const LEAD = 30; // and from this far before the start

  /* The screen, set by layout(): the horizon's height, the middle across,
     pixels to a lane at the bike, the lens (pixels to a lane, one lane
     ahead), and how high the camera rides above the ground under the bike. */
  let H0 = 300;
  let VX = 500;
  let sB = 120;
  let F = 550;
  let CH = 2.7;
  /* Where the camera is, set by look(). */
  let camX = 0;
  let camZ = 0;
  let camAlt = 0;
  let sky = null;
  let fingerY = 0;
  const pics = new Map();
  const seen = [];
  const zs = new Float32Array(72);
  const ys = new Float32Array(72);
  const ss = new Float32Array(72);

  const smooth = (k) => k * k * (3 - 2 * k);
  const mix = (a, b, k) => a + (b - a) * k;
  const at = (table, y) => {
    const i = clamp((y + LEAD) / STEP, 0, table.length - 1.001);
    const k = Math.floor(i);
    return table[k] + (table[k + 1] - table[k]) * (i - k);
  };
  const center = (y) => at(trip.mid, y);
  const landAt = (y) => at(trip.land, y);
  const slopeAt = (y) => (landAt(y + 1) - landAt(y - 1)) / 2;
  /* A long climb: gentle at its foot and at its top, steady between. */
  const climb = (k) => {
    const r = 0.22;
    const p = 1 / (1 - r);
    if (k <= 0) return 0;
    if (k >= 1) return 1;
    if (k < r) return (p * k * k) / (2 * r);
    if (k < 1 - r) return p * (k - r / 2);
    return 1 - (p * (1 - k) * (1 - k)) / (2 * r);
  };
  /* How high a jump ramp stands, x lanes past its foot. */
  const rampAt = (x) => {
    if (x <= 0) return 0;
    const slope = RAMP.high / (RAMP.face - RAMP.foot / 2);
    if (x < RAMP.foot) return (slope * x * x) / (2 * RAMP.foot);
    if (x <= RAMP.face) return slope * (x - RAMP.foot / 2);
    const past = x - RAMP.face;
    if (past < RAMP.fall) return RAMP.high - (RAMP.drop * past) / RAMP.fall;
    const k = 1 - (past - RAMP.fall) / RAMP.run;
    return k > 0 ? (RAMP.high - RAMP.drop) * k * k : 0;
  };
  /* A flight: a bike that left the ground `base` high, going up at `rise`
     lanes for each lane forward, is this high x lanes on. It keeps the speed
     PACE.air all the way, so this is the path of a thrown thing, and the
     same one every time. */
  const arc = (air, x) => air.base + air.rise * x - (GRAVITY * x * x) / (2 * PACE.air * PACE.air);

  /* A ride is laid out once: the stretches in a new order, the way's middle,
     the ground's height, and what each stretch puts on the sand. */
  function make(which, random) {
    const side = () => (random() < 0.5 ? -1 : 1);
    // The generator's first numbers are always small ones: they are thrown away.
    random();
    random();
    // The dunes and the mountain are in every ride, with three of the other
    // stretches: the dunes hold two jump ramps, the ridge one.
    const pool = ['ridge', 'hollow', 'rocks', 'wells', 'caravan'];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const kinds = pool.slice(0, 3);
    kinds.splice(Math.floor(random() * 4), 0, 'dunes');
    kinds.splice(Math.floor(random() * 5), 0, 'mountain');
    const sections = [];
    let end = 0;
    for (const kind of ['start', ...kinds, 'grove']) {
      sections.push({ kind, from: end, to: end + LENGTH[kind] });
      end += LENGTH[kind];
    }
    const L = end - 10;

    // How much the way bends at y: each stretch's own, easing into the next over 30 lanes.
    const sway = (y) => {
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        if (y >= s.to && i < sections.length - 1) continue;
        const before = sections[i - 1];
        const after = sections[i + 1];
        if (before && y < s.from + 15) return mix(SWAY[before.kind], SWAY[s.kind], smooth(clamp((y - s.from + 15) / 30, 0, 1)));
        if (after && y > s.to - 15) return mix(SWAY[s.kind], SWAY[after.kind], smooth(clamp((y - s.to + 15) / 30, 0, 1)));
        return SWAY[s.kind];
      }
      return 0;
    };
    const p1 = random() * 6.283;
    const p2 = random() * 6.283;
    const size = Math.ceil((end + LEAD + VIEW.far + 30) / STEP) + 2;
    const mid = new Float32Array(size);
    const land = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const y = i * STEP - LEAD;
      mid[i] = sway(y) * (Math.sin(y * 0.047 + p1) + 0.7 * Math.sin(y * 0.022 + p2));
    }
    const c = (y) => at(mid, y);
    // A rounded rise across the whole desert, or a hollow when `high` is below zero.
    const raise = (from, len, high) => {
      for (let i = Math.max(0, Math.ceil((from + LEAD) / STEP)); i < size && i * STEP - LEAD < from + len; i++) {
        land[i] += (high * (1 - Math.cos(((i * STEP - LEAD - from) / len) * 6.2832))) / 2;
      }
    };
    // The ground climbs by `high` over `len` lanes and stays there.
    const lift = (from, len, high) => {
      for (let i = Math.max(0, Math.ceil((from + LEAD) / STEP)); i < size; i++) land[i] += high * climb((i * STEP - LEAD - from) / len);
    };

    const t = {
      desert: true, road: which, L, t: 0, x: 0, y: 0, v: 0, steer: 0, pan: 0, air: null, h: 0, lift: 0, squash: 0,
      day: DAYS[Math.floor(random() * DAYS.length)], sections, mid, land,
      items: [], stars: [], ramps: [], rocks: [], lines: [], first: 0, firstStar: 0,
      dust: [], eagle: null, eagleAt: 5 + random() * 6, held: false, skyline: Array.from({ length: 16 }, random),
      earned: 0, streak: 0, picked: -9, bumped: -9, zikr: '', parked: false, done: false, shown: -1,
    };
    const star = (x, z) => t.stars.push({ kind: 'star', x, z, air: false, got: 0 });
    // A line of stars along the way, off to one side of its middle by `off`.
    const line = (y, count, gap = 1.7, off = 0) => {
      for (let i = 0; i < count; i++) star(c(y + i * gap) + off, y + i * gap);
    };
    // A jump ramp across the way, its lip near `about`. The lip lies where a
    // line of the ground's drawing always falls, so its edge is sharp from
    // any distance. Two posts mark it, and stars up the middle of the face
    // lead to it; the stars of the flight are hung once the ground is whole.
    const ramp = (about) => {
      const lip = Math.round(about / 8) * 8;
      const foot = lip - RAMP.face;
      for (let i = Math.max(0, Math.ceil((foot + LEAD) / STEP)); i < size && i * STEP - LEAD < lip + RAMP.fall + RAMP.run; i++) {
        land[i] += rampAt(i * STEP - LEAD - foot);
      }
      t.ramps.push({ foot, lip });
      for (const to of [-1, 1]) t.items.push({ kind: 'post', x: c(lip) + to * FLAG, z: lip, to });
      line(lip - 9.5, 3, 3);
      line(lip + 10, 4, 1.9);
      return lip;
    };
    // Something standing beside the way, beyond the bike's reach, `off` lanes
    // further out than the nearest it may stand: not on top of another thing.
    const put = (name, z, to, off = 0, flip = random() < 0.5) => {
      const w = TALL[name] * SPRITES[name];
      const x = c(z) + to * (4.7 + off + w / 2);
      if (t.items.some((other) => Math.abs(other.z - z) < 1.6 && Math.abs(other.x - x) < (w + (other.w || 1)) / 2 + 0.3)) return;
      t.items.push({ name, x, z, w, flip });
    };
    // A rock or a well in the way: a soft bump the bike slides around.
    const block = (name, x, z, r) => {
      t.rocks.push({ x, y: z, r });
      t.items.push({ name, x, z: z - r * 0.5, w: TALL[name] * SPRITES[name], flip: random() < 0.5 });
    };

    const build = {
      start() {
        line(11, 4);
      },
      // Dunes across the way: a jump ramp, a low dune that rolls under the
      // wheels, and a second ramp.
      dunes(s) {
        line(s.from + 5, 4, 1.7, 1);
        const lip = ramp(s.from + 30);
        raise(lip + 22, 22, 1.1);
        line(lip + 27, 4, 2.2, -0.9);
        ramp(lip + 56);
        put('camel', lip + 14, -1, 1.5, false);
        put('camel', lip + 40, 1, 2.5, true);
      },
      // One tall dune, a long way up and a long way down on its wheels, then
      // a jump ramp on the level sand beyond it.
      ridge(s) {
        const top = s.from + 33;
        raise(s.from + 8, 50, 4.5);
        line(s.from + 4, 4, 2, -0.9);
        line(s.from + 20, 5, 2.2, 0.8);
        line(top + 8, 5, 2.4, 0.9);
        ramp(s.from + 74);
        put('gazelle', s.from + 10, 1, 0.6, true);
        put('gazelle', s.from + 12.5, 1, 2.4, true);
        put('gazelle', s.from + 52, -1, 0.8, false);
      },
      // The way goes down into a wide hollow where acacias grow, and up out of it.
      hollow(s) {
        raise(s.from + 8, 80, -4.5);
        line(s.from + 12, 4, 2.2, 1);
        line(s.from + 38, 6, 1.8, -1);
        line(s.from + 64, 4, 2.2, 0.8);
        put('acacia', s.from + 42, 1, 0.4);
        put('acacia', s.from + 49, -1, 0.8);
        put('acacia', s.from + 55, 1, 2.6);
        put('fox', s.from + 46, -1, 0, false);
        put('shrub', s.from + 51, 1, 0.2);
      },
      // Rocks in the way, on one side then the other: the stars show the way around.
      rocks(s) {
        raise(s.from + 10, 68, 0.7);
        let to = side();
        let big = random() < 0.5;
        for (let y = s.from + 22; y < s.to - 18; y += 10) {
          block(big ? 'rocks' : 'boulder', c(y) + to * 0.9, y, 0.6);
          star(c(y) - to * 0.9, y);
          star(c(y + 5), y + 5);
          to = -to;
          big = !big;
        }
        put('fox', s.from + 43, 1, 0.3, true);
      },
      // Wells along the way, a tent and camels resting near them.
      wells(s) {
        let to = side();
        for (const d of [26, 48, 70]) {
          const y = s.from + d;
          block('well', c(y) + to * 0.85, y, 0.68);
          star(c(y - 2.4) - to * 0.5, y - 2.4);
          star(c(y) - to * 1, y);
          star(c(y + 2.4) - to * 0.5, y + 2.4);
          to = -to;
        }
        line(s.from + 8, 4);
        line(s.from + 34, 4, 1.8);
        line(s.from + 56, 4, 1.8);
        put('tent', s.from + 40, to, 1.2, false);
        put('camel', s.from + 31, -to, 0.6, to > 0);
        put('camel', s.from + 54, to, 1.4, to < 0);
        put('acacia', s.from + 22, -1, 1);
        put('acacia', s.from + 64, 1, 1.6);
      },
      // A herder leads his camels across the sand beside the way.
      caravan(s) {
        raise(s.from + 16, 48, 0.9);
        const z = s.from + 46;
        const to = side();
        t.lines.push({ z, to, x: c(z) + to * 11, walked: 0, phase: 0, walkers: ['man', 'camel', 'camel', 'camel'].map((name) => ({ name, x: 0, z, flip: to < 0, hop: 0 })) });
        line(s.from + 9, 4, 1.8, -to * 1);
        line(s.from + 30, 5, 1.8, -to * 0.7);
        line(s.from + 56, 4, 1.8, to * 0.9);
        put('tent', s.from + 66, to, 3.5, false);
        put('acacia', s.from + 24, -to, 0.8);
      },
      // The mountain: a long climb, a rounded top the wheels never leave, a long way down.
      mountain(s) {
        const from = s.from + 10;
        const top = from + MOUNTAIN.up + MOUNTAIN.cap / 2;
        const to = from + 2 * MOUNTAIN.up + MOUNTAIN.cap;
        lift(from, MOUNTAIN.up, MOUNTAIN.high);
        lift(to - MOUNTAIN.up, MOUNTAIN.up, -MOUNTAIN.high);
        line(top - 1, 3, 2.2);
        line(from + 8, 5, 2.2);
        line(from + 32, 5, 2.2, -1);
        line(top + 13, 5, 2.4, 1);
        line(top + 36, 5, 2.4);
        for (let z = from + 2; z < to; z += 5 + random() * 5) put(random() < 0.5 ? 'boulder' : 'rocks', z, side(), random() * 5);
      },
      // Palms thicken toward the oasis: its pool, its tent, a camel at rest.
      grove(s) {
        line(s.from + 7, 5);
        const x = c(L);
        t.items.push(
          { kind: 'pool', x: x - 3.3, at: L + 5.2, z: L + 3.4, rx: 2.9, rz: 1.8 },
          { name: 'tent', x: x + 4.2, z: L + 6.5, flip: false },
          { name: 'palm', x: x - 6.6, z: L + 6.4, flip: false },
          { name: 'palm', x: x - 4.2, z: L + 8.2, flip: true },
          { name: 'palm', x: x - 1.3, z: L + 8.8, flip: false },
          { name: 'palm', x: x + 1.4, z: L + 9.6, flip: true },
          { name: 'palm', x: x + 7.4, z: L + 8.4, flip: false },
          { name: 'palm', x: x - 9.5, z: L + 10, flip: true },
          { name: 'gazelle', x: x - 6.3, z: L + 4.4, flip: false },
          { name: 'camel', x: x + 4.4, z: L + 4.4, flip: true },
          { name: 'well', x: x + 1.9, z: L + 5.6, flip: false },
        );
        for (let z = s.from + 3; z < L - 3; z += 4.4) {
          put('palm', z, -1, random() * 2);
          put('palm', z + 2.2, 1, random() * 2);
        }
        for (let z = L + 11; z < L + 26; z += 2.2) put('palm', z, side(), random() * 9 - 4);
      },
    };
    for (const s of sections) build[s.kind](s);
    // Each ramp's flight, from the ground as it was built: the slope the
    // bike leaves the lip at, how far on its path meets the sand again, and
    // three stars hung along that path.
    for (const one of t.ramps) {
      one.base = at(land, one.lip);
      one.rise = (one.base - at(land, one.lip - 2)) / 2;
      one.reach = 0.5;
      while (one.reach < 30 && arc(one, one.reach) > at(land, one.lip + one.reach)) one.reach += 0.05;
      for (const part of [0.25, 0.5, 0.75]) {
        const x = one.reach * part;
        t.stars.push({ kind: 'star', x: c(one.lip + x), z: one.lip + x, air: true, high: arc(one, x) + 0.55, got: 0 });
      }
    }
    // Pairs of flags mark the way from the start to the oasis. A ramp's lip
    // has its own posts, and no flag stands where a flight comes down. A
    // pair stands a little way along from a rock or a well, so that there
    // is room to ride between the two.
    for (let z = 6; z < L - 4; z += 12) {
      if (t.ramps.some((one) => z > one.lip - 6 && z < one.lip + one.reach + 3)) continue;
      let at = z;
      while (at < z + 9 && t.rocks.some((rock) => Math.abs(rock.y - at) < 3)) at += 1.5;
      for (const to of [-1, 1]) t.items.push({ kind: 'flag', x: c(at) + to * FLAG, z: at, to });
    }
    // Then shrubs, rocks and a tree here and there along the whole ride,
    // and low dunes further off on both sides.
    const any = ['shrub', 'shrub', 'boulder', 'shrub', 'acacia', 'rocks'];
    for (let z = 5; z < L - 3; z += 2.5 + random() * 3.5) put(any[Math.floor(random() * any.length)], z, side(), random() * random() * 16);
    for (let z = -6; z < end + 60; z += 3 + random() * 4) {
      const to = side();
      const w = 7 + random() * 9;
      t.items.push({ kind: 'mound', x: c(z) + to * (10 + w / 2 + random() * 34), z, w, high: 0.6 + random() * 1.3 });
    }
    t.items.sort((a, b) => a.z - b.z);
    t.stars.sort((a, b) => a.z - b.z);
    // The poles of the flags and the posts of the ramps, in the order they are met.
    t.poles = t.items.filter((it) => it.kind === 'flag' || it.kind === 'post');
    return t;
  }

  /* The sizes that follow from the screen. The bike stands a little under a
     quarter of the screen tall, low in the picture, and the camera high
     enough over it that a star on the bike's own line shows above the
     rider's helmet until it is three lanes away; the horizon is two fifths
     of the way down. */
  function layout() {
    sB = clamp(Math.min((height * 0.24) / BIKE.tall, width / 5.4), 34, 200);
    H0 = Math.round(height * 0.4);
    VX = width / 2;
    CH = (Math.min(height * 0.88, H0 + 3.4 * sB) - H0) / sB;
    F = sB * BIKE.back;
    sky = null;
    pics.clear();
    for (const name of [...Object.keys(TALL), 'atv', 'eagle']) pic(name, 1);
  }

  /* Each drawing is turned into pictures once per screen size: one as large
     as it is ever shown sharp, then halves of it, so that a far thing is
     drawn from a small picture. */
  function pic(name, tall) {
    let levels = pics.get(name);
    if (!levels) {
      const image = images[name];
      if (!image || !image.naturalWidth) return null;
      const most = name === 'atv' ? BIKE.tall * sB : name === 'eagle' ? Math.min(width, height) * 0.08 : Math.min((TALL[name] * F) / 4, height * 0.9);
      levels = [];
      for (let h = Math.ceil(most * dpr); h >= 12 && levels.length < 6; h = Math.ceil(h / 2)) {
        const copy = document.createElement('canvas');
        copy.height = h;
        copy.width = Math.max(1, Math.ceil(h * SPRITES[name]));
        const pen = copy.getContext('2d');
        pen.drawImage(levels.length ? levels[0] : image, 0, 0, copy.width, copy.height);
        levels.push(copy);
      }
      pics.set(name, levels);
    }
    const need = tall * dpr * 0.9;
    for (let i = levels.length - 1; i > 0; i--) if (levels[i].height >= need) return levels[i];
    return levels[0];
  }

  /* The camera: straight behind the bike, so the bike is in the middle of
     the picture and the ground comes out of the point right ahead of it. It
     rides at one height above the ground under the bike; where that ground
     falls away under a flight it follows a moment late (`lift`), never the
     bike itself. */
  function look() {
    const t = trip;
    camZ = t.y - BIKE.back;
    camX = t.x;
    camAlt = landAt(t.y) + CH + t.lift;
  }

  /* A finger on the picture points at a place on the sand: further away the
     higher it is. The bike steers toward that place. */
  for (const type of ['pointerdown', 'pointermove']) {
    tripView.addEventListener(type, (event) => {
      if (event.pointerId === finger.id) fingerY = event.clientY;
    });
  }
  const pointed = (px) => {
    const d = clamp((CH * F) / Math.max(1.35 * (fingerY - H0), 1), BIKE.back, 26);
    return camX + ((px - VX) * d) / F;
  };

  /* Dust rises behind one rear wheel or the other. */
  function puff(count) {
    const dust = trip.dust;
    for (let i = 0; i < count && dust.length < 18; i++) {
      dust.push({ x: (Math.random() < 0.5 ? -1 : 1) * BIKE.wheel + (Math.random() - 0.5) * 0.22, back: 0.25 + Math.random() * 0.3, drift: (Math.random() - 0.5) * 0.8, age: 0, life: 0.5 + Math.random() * 0.3 });
    }
  }

  /* An eagle glides across the sky now and then, and cries once. */
  function glide(dt) {
    const t = trip;
    if (!t.eagle) {
      if (t.t < t.eagleAt || t.parked) return;
      t.eagle = { from: Math.random() < 0.5 ? -1 : 1, high: 0.25 + Math.random() * 0.3, age: 0, cried: false };
      return;
    }
    const eagle = t.eagle;
    eagle.age += dt;
    if (!eagle.cried && eagle.age > 1.5) {
      eagle.cried = true;
      beep('eagle');
    }
    if (eagle.age > 11) {
      t.eagle = null;
      t.eagleAt = t.t + 13 + Math.random() * 12;
    }
  }

  /* The caravan: a herder and three camels, each this far behind him. They
     set off when the bike comes near and walk on across the sand, away from
     the way and a little forward. */
  const CARAVAN = { behind: [0, 1.9, 4.6, 7.3], pace: 0.9, near: 80, most: 16 };
  function stroll(dt) {
    const t = trip;
    for (const one of t.lines) {
      const walking = t.y > one.z - CARAVAN.near && one.walked < CARAVAN.most;
      if (walking) {
        one.walked += CARAVAN.pace * dt;
        one.phase += dt * 6;
      }
      one.walkers.forEach((walker, i) => {
        const along = one.walked - CARAVAN.behind[i];
        walker.x = one.x + one.to * along * 0.9;
        walker.z = one.z + along * 0.42;
        walker.hop = walking ? Math.abs(Math.sin(one.phase + i * 1.7)) * 0.04 : 0;
      });
    }
  }

  /* Every climb and every descent of the way, worked out once from the
     ground's height: a stretch at least ZIKR_RUN lanes long where the ground
     rises (or falls) more steeply than ZIKR_SLOPE. The gentle swells and a
     ramp's run-out are below it; the dunes, a ramp's face, the ridge, the
     hollow and the mountain are above it. */
  const ZIKR_SLOPE = 0.06;
  const ZIKR_RUN = 4;
  function slopes() {
    const out = [];
    let run = null;
    for (let y = 0; y <= trip.L; y += STEP) {
      const slope = slopeAt(y);
      const way = slope > ZIKR_SLOPE ? 'up' : slope < -ZIKR_SLOPE ? 'down' : '';
      if (run && run.way === way) {
        run.to = y;
        continue;
      }
      if (run && run.to - run.from >= ZIKR_RUN) out.push(run);
      run = way ? { way, from: y, to: y, said: false } : null;
    }
    if (run && run.to - run.from >= ZIKR_RUN) out.push(run);
    return out;
  }

  /* On every climb اللَّهُ أَكْبَرُ, on every descent سُبْحَانَ اللَّهِ: the words
     show only while the bike is on it, gone the moment it ends, and are said
     once as it begins. */
  function zikr() {
    const t = trip;
    if (!t.slopes) t.slopes = slopes();
    const run = t.slopes.find((one) => t.y >= one.from && t.y <= one.to);
    const now = run ? run.way : '';
    if (run && !run.said) {
      run.said = true;
      sound.say(ZIKR[now].clip);
    }
    if (now === t.zikr) return;
    t.zikr = now;
    $('zikr').hidden = !now;
    if (now) $('zikr').textContent = ZIKR[now].text;
  }

  function update(dt) {
    const t = trip;
    t.t += dt;
    for (const bit of t.dust) bit.age += dt;
    t.dust = t.dust.filter((bit) => bit.age < bit.life);
    t.squash = Math.max(0, t.squash - dt * 4);
    glide(dt);
    stroll(dt);
    if (t.parked) {
      beep('engine', 0);
      return;
    }
    const L = t.L;
    const ending = t.y > L - 16;
    look();
    const steer = steering(dt, pointed);
    const slope = slopeAt(t.y);
    const soft = Math.abs(t.x - center(t.y)) > HALF + 0.1;

    // The pedal, and what the ground allows: slower up a slope and on soft
    // sand, faster coming down.
    let top = clamp(PACE.max * (1 - slope * 1.9), PACE.climb, PACE.descent);
    if (soft) top *= PACE.soft;
    const gas = pedalDown() && !ending;
    let want = gas ? top : PACE.crawl;
    // Up a ramp's face the motor pulls at one speed, pedal or no pedal, and
    // a flight keeps that speed: every bike leaves the lip the same way.
    const pulled = Boolean(t.air) || t.ramps.some((one) => t.y >= one.foot && t.y < one.lip);
    if (pulled) want = PACE.air;
    if (ending) want = clamp((L - t.y) * 0.8, 0.35, 6);
    if (want > t.v) t.v = Math.min(want, t.v + PACE.gain * dt);
    else t.v = Math.max(want, t.v - (ending || pulled ? 9 : PACE.drop) * dt);

    const was = t.y;
    t.y += t.v * dt;
    // The bike takes part of each bend by itself; the rest is steered.
    t.x += FOLLOW * (center(t.y) - center(was));
    const turn = ending ? clamp((center(L) - t.x) * 1.4, -1, 1) : steer;
    t.steer += (turn - t.steer) * (1 - Math.exp(-dt / 0.12));
    t.x += t.steer * TURN_RATE * (t.air ? 0.5 : 1) * (0.45 + (0.55 * Math.min(t.v, PACE.max)) / PACE.max) * dt;

    // A rock or a well in the way is a soft bump: the bike slides around it.
    // A flag's pole or a ramp's post is no bump at all: the bike eases to
    // one side of it as it comes up, and passes beside it.
    if (!t.air) {
      for (const pole of t.poles) {
        if (pole.z > t.y + POLE.lead) break;
        if (pole.z <= t.y - POLE.lead) continue;
        const dx = t.x - pole.x;
        const room = POLE.clear * smooth(1 - Math.abs(pole.z - t.y) / POLE.lead) - Math.abs(dx);
        if (room > 0) t.x += (dx >= 0 ? 1 : -1) * Math.min(room, 6 * dt + 0.02);
      }
      for (const rock of t.rocks) {
        const dx = t.x - rock.x;
        const dy = t.y - rock.y;
        const reach = rock.r + 0.46;
        if (Math.abs(dy) > reach + 0.5 || Math.abs(dx) > reach) continue;
        const gap = Math.hypot(dx, dy * 0.75);
        if (gap >= reach) continue;
        t.x += (dx >= 0 ? 1 : -1) * Math.min(reach - gap, 6 * dt + 0.02);
        if (t.t - t.bumped > 1) {
          t.bumped = t.t;
          t.v *= 0.55;
          puff(5);
          sound.wrong();
        }
      }
    }
    // Beyond the flags the soft sand eases the bike back toward the way.
    const off = t.x - center(t.y);
    if (Math.abs(off) > HALF) t.x -= Math.sign(off) * (Math.abs(off) - HALF) * 1.8 * dt;
    t.x = clamp(t.x, center(t.y) - EDGE, center(t.y) + EDGE);

    // Flights. The wheels follow the ground everywhere but past a ramp's
    // lip: there the sand drops from under the bike, which goes on the way
    // it was going, up the face's slope, and falls as a thrown thing falls
    // until its path meets the ground again.
    const ground = landAt(t.y);
    if (t.air) {
      t.h = arc(t.air, t.y - t.air.from) - ground;
      if (t.h <= 0) {
        t.air = null;
        t.h = 0;
        t.squash = 1;
        puff(8);
        sound.tick();
      }
    } else {
      const ramp = t.ramps.find((one) => was < one.lip && t.y >= one.lip);
      if (ramp) {
        t.air = { from: ramp.lip, base: ramp.base, rise: ramp.rise };
        t.v = PACE.air;
        t.h = Math.max(0, arc(t.air, t.y - ramp.lip) - ground);
      }
    }
    // The camera stays with the ground, not with the bike: it comes down
    // after the sand that fell away, a moment late, so the picture does not jerk.
    t.lift = (t.air ? t.lift + landAt(was) - ground : t.lift) * Math.exp(-dt / EASE);
    // Dust behind the wheels on a climb and on a descent, and on soft sand.
    if (!t.air && t.v > 3) {
      const steep = Math.min(1, Math.abs(slope) / 0.12);
      if (Math.random() < dt * (steep > 0.3 ? 30 * steep : soft ? 12 : 0)) puff(1);
    }
    zikr();

    // Stars: those on the ground are driven over, those in the air are flown through.
    for (const one of t.stars) {
      if (one.got) {
        one.got += dt;
        continue;
      }
      if (one.z > t.y + 2) break;
      if (one.air !== Boolean(t.air)) continue;
      if (Math.abs(one.x - t.x) > (one.air ? 0.95 : 0.75) || Math.abs(one.z - t.y) > 0.85) continue;
      one.got = 0.001;
      t.streak = t.t - t.picked < 2.5 ? t.streak + 1 : 0;
      t.picked = t.t;
      t.earned += 1;
      stars += 1;
      shown = stars;
      showCount();
    }

    // The motor is light: a hum with the pedal, more on a climb, most in the air.
    beep('engine', t.air ? 0.7 : gas || pulled ? 0.22 + clamp(slope, 0, 0.2) * 1.7 : 0.06, t.v / PACE.max + (t.air ? 0.4 : 0));
    dash(t.y / L, turn, ending);
    if (ending && L - t.y < 0.12) {
      t.v = 0;
      $('zikr').hidden = true;
      arrive(VX, H0 + (CH - 1) * sB);
    }
  }

  /* Drawing. */
  function ellipse(x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const css = (rgb, k = 1) => `rgb(${Math.min(255, rgb[0] * k) | 0},${Math.min(255, rgb[1] * k) | 0},${Math.min(255, rgb[2] * k) | 0})`;
  const blend = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
  /* How much haze lies over a thing this far away, from none to all. */
  const fog = (d) => Math.max(1 - Math.exp(-d / 55), (d - 88) / (VIEW.far - 88));
  /* The sand's color this far away on a slope: the sun stands ahead, so sand
     that climbs away from the camera is in shade and sand that falls away is lit. */
  function tone(d, slope) {
    const day = trip.day;
    const f = clamp(fog(d), 0, 1);
    const lit = 1 + clamp(-slope * 0.9, -0.2, 0.12) * (1 - 0.6 * f);
    const warm = Math.min(lit, 1) - 1; // shade is browner, not grayer
    return `rgb(${Math.min(255, mix(day.sand[0], day.haze[0], f) * lit) | 0},${Math.min(255, mix(day.sand[1], day.haze[1], f) * (lit + warm * 0.1)) | 0},${Math.min(255, mix(day.sand[2], day.haze[2], f) * (lit + warm * 0.45)) | 0})`;
  }
  /* How clearly a thing shows: it comes out of the haze far away, and fades as it passes the camera. */
  const veil = (d) => {
    const f = clamp(fog(d), 0, 1);
    return clamp((VIEW.things - d) / 14, 0, 1) * clamp((d - PASS) / 1.4, 0, 1) * (1 - 0.45 * f * f);
  };

  /* The sky, the sun and three ranges of far hills are painted once: they stand still. */
  function paintSky() {
    const t = trip;
    const day = t.day;
    const n = t.skyline;
    const copy = document.createElement('canvas');
    copy.width = Math.round(width * dpr);
    copy.height = Math.round((H0 + 2) * dpr);
    const pen = copy.getContext('2d');
    pen.scale(dpr, dpr);
    const air = pen.createLinearGradient(0, 0, 0, H0);
    air.addColorStop(0, day.top);
    air.addColorStop(0.62, day.mid);
    air.addColorStop(1, css(day.low));
    pen.fillStyle = air;
    pen.fillRect(0, 0, width, H0 + 2);
    const sx = width * day.sun[0];
    const sy = H0 * day.sun[1];
    const r = Math.min(width, height) * day.sun[2];
    const glow = pen.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 6);
    glow.addColorStop(0, `rgba(${day.glow},.85)`);
    glow.addColorStop(0.25, `rgba(${day.glow},.35)`);
    glow.addColorStop(1, `rgba(${day.glow},0)`);
    pen.fillStyle = glow;
    pen.fillRect(0, 0, width, H0 + 2);
    pen.fillStyle = '#FFFBEA';
    pen.beginPath();
    pen.arc(sx, sy, r, 0, Math.PI * 2);
    pen.fill();
    // A few thin clouds.
    pen.fillStyle = 'rgba(255,255,255,.42)';
    for (let i = 0; i < 4; i++) {
      const x = width * n[i];
      const y = H0 * (0.12 + 0.5 * n[i + 4]);
      const w = width * (0.07 + 0.08 * n[i + 8]);
      for (const [dx, dy, k] of [[0, 0, 1], [0.55, 0.25, 0.7], [-0.5, 0.3, 0.6]]) {
        pen.beginPath();
        pen.ellipse(x + dx * w, y + dy * w * 0.16, w * k, w * 0.075 * k, 0, 0, Math.PI * 2);
        pen.fill();
      }
    }
    // The ranges, the furthest first: peaks, then table hills, then low dunes.
    const shapes = [
      (x) => 0.5 * Math.abs(Math.sin(x * 4.1 + n[12] * 6)) + 0.3 * Math.abs(Math.sin(x * 9.3 + n[13] * 6)) + 0.2 * (0.5 + 0.5 * Math.sin(x * 21 + n[14] * 6)),
      (x) => Math.min(0.62, 0.45 + 0.4 * Math.sin(x * 5.7 + n[13] * 6) + 0.16 * Math.sin(x * 15 + n[15] * 6)) / 0.62,
      (x) => 0.5 + 0.3 * Math.sin(x * 7.9 + n[14] * 6) + 0.2 * Math.sin(x * 17.3 + n[12] * 6),
    ];
    const tints = [blend(day.low, day.range, 0.4), blend(day.low, day.range, 0.62), blend(day.haze, day.range, 0.3)];
    const highs = [0.3, 0.19, 0.085];
    shapes.forEach((shape, i) => {
      pen.fillStyle = css(tints[i]);
      pen.beginPath();
      pen.moveTo(0, H0 + 2);
      for (let x = 0; x <= width + 6; x += 6) pen.lineTo(x, H0 - H0 * highs[i] * Math.max(0.06, shape(x / Math.max(width, height))));
      pen.lineTo(width + 6, H0 + 2);
      pen.closePath();
      pen.fill();
    });
    // Haze lies along the horizon.
    const mist = pen.createLinearGradient(0, H0 * 0.72, 0, H0 + 2);
    mist.addColorStop(0, `rgba(${day.haze.join(',')},0)`);
    mist.addColorStop(1, `rgba(${day.haze.join(',')},.8)`);
    pen.fillStyle = mist;
    pen.fillRect(0, H0 * 0.72, width, H0 * 0.28 + 2);
    sky = { copy, day };
  }

  /* Small stones and hollows lie on the near sand: they show the speed. They
     are pale, and paler still where they pass close by. */
  function speckle(j, light) {
    const near = zs[j];
    const d = near - camZ;
    const row = Math.floor(near);
    const reach = (width / 2 / F) * (d + 1) + 1;
    ctx.beginPath();
    for (let col = Math.floor((camX - reach) / 1.7); col * 1.7 < camX + reach; col++) {
      const n = Math.abs(Math.sin(row * 12.9898 + col * 78.233) * 43758.5453) % 1;
      if (light ? n < 0.86 : n < 0.45 || n >= 0.86) continue;
      const z = row + ((n * 57.3) % 1);
      const depth = z - camZ;
      if (depth < VIEW.near + 0.3) continue;
      const s = F / depth;
      const x = VX + ((col + ((n * 113.7) % 1)) * 1.7 - camX) * s;
      const y = H0 + (camAlt - landAt(z)) * s;
      const r = (0.06 + 0.09 * ((n * 31.7) % 1)) * s;
      ctx.moveTo(x + r, y);
      ctx.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI * 2);
    }
    ctx.globalAlpha = (light ? 0.34 : 0.2) * clamp((d - 2.4) / 3, 0, 1) * clamp((22 - d) / 9, 0, 1);
    ctx.fillStyle = light ? '#FFF9EA' : '#7E5A36';
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* The old tire tracks wander a little about the middle of the way. */
  const rut = (z) => center(z) + 0.22 * Math.sin(z * 0.13);

  /* One slice of ground, between two lines across the desert. */
  function slice(j) {
    const near = zs[j];
    const far = zs[j + 1];
    const d = (near + far) / 2 - camZ;
    ctx.fillStyle = tone(d, (landAt(far) - landAt(near)) / (far - near));
    ctx.fillRect(0, ys[j + 1], width, ys[j] - ys[j + 1] + 0.7);
    if (d < 48) {
      const xn = VX + (rut(near) - camX) * ss[j];
      const xf = VX + (rut(far) - camX) * ss[j + 1];
      ctx.globalAlpha = 0.17 * (1 - d / 48) * clamp((d - 2) / 3, 0.35, 1);
      ctx.fillStyle = '#7A522E';
      ctx.beginPath();
      for (const to of [-0.36, 0.36]) {
        ctx.moveTo(xn + (to - 0.07) * ss[j], ys[j]);
        ctx.lineTo(xn + (to + 0.07) * ss[j], ys[j]);
        ctx.lineTo(xf + (to + 0.07) * ss[j + 1], ys[j + 1]);
        ctx.lineTo(xf + (to - 0.07) * ss[j + 1], ys[j + 1]);
        ctx.closePath();
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (d < 22 && far - near < 1.5) {
      speckle(j, false);
      speckle(j, true);
    }
  }

  /* Something that stands up from the sand, with its shadow. */
  function stand(it, d, s) {
    const name = it.name;
    const h = (it.tall || TALL[name]) * s;
    const w = h * SPRITES[name];
    const x = VX + (it.x - camX) * s;
    if (x + w < 0 || x - w > width) return;
    const y = H0 + (camAlt - landAt(it.z)) * s;
    if (y - h > height) return;
    const image = pic(name, h);
    if (!image) return;
    ctx.globalAlpha = veil(d);
    ctx.fillStyle = 'rgba(70,45,20,.2)';
    ellipse(x + trip.day.lean * h * 0.1, y + h * 0.012, w * 0.46, Math.max(1.5, w * 0.1));
    const up = (it.hop || 0) * s;
    if (it.flip) {
      ctx.save();
      ctx.translate(x, y - up);
      ctx.scale(-1, 1);
      ctx.drawImage(image, -w / 2, -h, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(image, x - w / 2, y - up - h, w, h);
    }
    ctx.globalAlpha = 1;
  }

  /* A flag on a pole: its pennant points away from the way and stirs a little. */
  function flag(it, d, s) {
    const x = VX + (it.x - camX) * s;
    if (x < -s || x > width + s) return;
    const y = H0 + (camAlt - landAt(it.z)) * s;
    const top = y - s;
    ctx.globalAlpha = veil(d);
    ctx.fillStyle = 'rgba(70,45,20,.2)';
    ellipse(x + trip.day.lean * s * 0.1, y, s * 0.16, Math.max(1, s * 0.04));
    ctx.strokeStyle = '#6B4A32';
    ctx.lineWidth = Math.max(1, s * 0.055);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, top);
    ctx.stroke();
    const wave = Math.sin(trip.t * 5 + it.z) * 0.05 * s;
    ctx.fillStyle = '#E2552F';
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + it.to * 0.5 * s, top + 0.16 * s + wave);
    ctx.lineTo(x, top + 0.34 * s);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* A low dune off to the side: its sunlit back, and its lee in shade. */
  function mound(it, d, s) {
    const w = it.w * s;
    const x = VX + (it.x - camX) * s;
    if (x + w / 2 < 0 || x - w / 2 > width) return;
    const y = H0 + (camAlt - landAt(it.z)) * s + 1;
    const h = it.high * s;
    const to = trip.day.lean >= 0 ? 1 : -1; // the lee is on the side away from the sun
    ctx.globalAlpha = clamp((VIEW.things - d) / 14, 0, 1) * clamp((d - PASS) / 2.5, 0, 1);
    ctx.fillStyle = tone(d, -0.11);
    ctx.beginPath();
    ctx.moveTo(x - to * w * 0.5, y);
    ctx.bezierCurveTo(x - to * w * 0.25, y - h * 0.1, x - to * w * 0.06, y - h, x + to * w * 0.1, y - h);
    ctx.bezierCurveTo(x + to * w * 0.24, y - h, x + to * w * 0.36, y - h * 0.12, x + to * w * 0.5, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone(d, 0.13);
    ctx.beginPath();
    ctx.moveTo(x + to * w * 0.1, y - h);
    ctx.bezierCurveTo(x + to * w * 0.24, y - h, x + to * w * 0.36, y - h * 0.12, x + to * w * 0.5, y);
    ctx.lineTo(x + to * w * 0.16, y);
    ctx.quadraticCurveTo(x + to * w * 0.2, y - h * 0.5, x + to * w * 0.1, y - h);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* A star hangs a little over the sand, above its shadow; one over a
     ramp's drop hangs on the path the flying bike takes. One just taken
     stays with the bike, rising and fading. */
  function starAt(one, d, s) {
    if (one.got > 0.3 || d > 80) return;
    const gone = Math.min(1, one.got / 0.3);
    const x = VX + ((one.got ? trip.x : one.x) - camX) * s;
    if (x < -s || x > width + s) return;
    const ground = H0 + (one.got ? CH + trip.lift : camAlt - landAt(one.z)) * s;
    const high = one.got ? trip.h + 0.5 + 0.9 * gone : one.air ? one.high - landAt(one.z) : 0.5;
    const show = clamp((80 - d) / 16, 0, 1) * clamp((d - PASS - 0.6) / 1, 0, 1);
    const r = (one.air ? 0.27 : 0.25) * s;
    if (!one.got) {
      ctx.globalAlpha = show;
      ctx.fillStyle = 'rgba(70,45,20,.2)';
      ellipse(x, ground, r * 0.8, Math.max(1, r * 0.2));
    }
    ctx.globalAlpha = show * (1 - gone);
    drawStar(x, ground - (high + Math.sin(trip.t * 4 + one.z) * 0.04) * s, r * (1 + gone * 0.5));
    ctx.globalAlpha = 1;
  }

  /* A post at one end of a ramp's lip: taller than a flag, in bands of red
     and white, its pennant pointing in over the lip. Between the two posts
     the bike flies. */
  function post(it, d, s) {
    const x = VX + (it.x - camX) * s;
    if (x < -s || x > width + s) return;
    const y = H0 + (camAlt - landAt(it.z)) * s;
    const tall = 1.7 * s;
    const wide = Math.max(1.5, s * 0.1);
    ctx.globalAlpha = veil(d);
    ctx.fillStyle = 'rgba(70,45,20,.2)';
    ellipse(x + trip.day.lean * s * 0.1, y, s * 0.2, Math.max(1, s * 0.05));
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#FFFFFF' : '#D8402F';
      ctx.fillRect(x - wide / 2, y - (tall * (i + 1)) / 5, wide, tall / 5 + 0.5);
    }
    const wave = Math.sin(trip.t * 5 + it.to) * 0.05 * s;
    ctx.fillStyle = '#F5B92E';
    ctx.beginPath();
    ctx.moveTo(x, y - tall);
    ctx.lineTo(x - it.to * 0.62 * s, y - tall + 0.2 * s + wave);
    ctx.lineTo(x, y - tall + 0.42 * s);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* The pool of the oasis lies flat on the sand: wet sand around blue water. */
  function pool(it) {
    const mid = it.at - camZ;
    if (mid - it.rz < PASS || mid > VIEW.things) return;
    const s = F / mid;
    const x = VX + (it.x - camX) * s;
    const height0 = camAlt - landAt(it.at);
    const front = H0 + (height0 * F) / (mid - it.rz);
    const rear = H0 + (height0 * F) / (mid + it.rz);
    const y = (front + rear) / 2;
    const ry = (front - rear) / 2;
    ctx.globalAlpha = veil(mid);
    ctx.fillStyle = css(blend(trip.day.sand, [150, 120, 84], 0.35));
    ellipse(x, y, it.rx * s * 1.1, ry * 1.14);
    ctx.fillStyle = '#58AEDD';
    ellipse(x, y, it.rx * s, ry);
    ctx.fillStyle = 'rgba(214,240,252,.55)';
    ellipse(x - it.rx * s * 0.1, y - ry * 0.42, it.rx * s * 0.62, ry * 0.3);
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.lineCap = 'round';
    for (const [dx, dy] of [[-0.45, 0.2], [0.3, 0.45], [0.5, -0.1], [-0.15, 0.62]]) {
      const drift = Math.sin(trip.t * 0.8 + dx * 9) * 0.04;
      ctx.beginPath();
      ctx.moveTo(x + (dx + drift) * it.rx * s, y + dy * ry);
      ctx.lineTo(x + (dx + drift + 0.16) * it.rx * s, y + dy * ry);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* The bike, in the middle of the picture: seen from straight behind, both
     rear wheels side by side, its rider a grown-up in a helmet whose face is
     turned away. It leans a little into a turn, about its wheels. In a
     flight it leaves its shadow on the sand below and comes back down to
     it, and is pressed down for a moment as it lands. Dust rises low behind
     its rear wheels. */
  function bike() {
    const t = trip;
    const x = VX;
    const y = H0 + (CH + t.lift) * sB;
    const h = BIKE.tall * sB;
    const w = h * SPRITES.atv;
    const press = Math.sin(t.squash * Math.PI);
    const up = (t.h + Math.sin(t.y * 2.3) * 0.012 * Math.min(1, t.v / 6)) * sB;
    const small = 1 - Math.min(t.h, 1.4) * 0.14;
    ctx.fillStyle = 'rgba(70,45,20,.28)';
    ellipse(x + t.day.lean * t.h * sB * 0.3, y - h * 0.03, w * 0.54 * small, h * 0.08 * small);
    const image = pic('atv', h);
    if (image) {
      ctx.save();
      ctx.translate(x, y - up);
      ctx.rotate(t.steer * 0.06);
      ctx.scale(1 + 0.06 * press, 1 - 0.1 * press);
      ctx.drawImage(image, -w / 2, -h, w, h);
      ctx.restore();
    }
    for (const bit of t.dust) {
      const k = bit.age / bit.life;
      const s = F / (BIKE.back - bit.back - bit.age * 1.4);
      ctx.fillStyle = `rgba(${t.day.haze.join(',')},${(0.42 * (1 - k)).toFixed(2)})`;
      ellipse(VX + (bit.x + bit.drift * bit.age) * s, H0 + (CH + t.lift - 0.1 - bit.age * 0.55) * s, (0.07 + 0.2 * k) * s, (0.06 + 0.15 * k) * s);
    }
  }

  function thing(it) {
    if (it.kind === 'bike') {
      bike();
      return;
    }
    if (it.kind === 'pool') {
      pool(it);
      return;
    }
    const d = it.got ? BIKE.back : it.z - camZ;
    if (d <= PASS) return;
    const s = F / d;
    if (it.kind === 'star') starAt(it, d, s);
    else if (it.kind === 'flag') flag(it, d, s);
    else if (it.kind === 'post') post(it, d, s);
    else if (it.kind === 'mound') mound(it, d, s);
    else stand(it, d, s);
  }

  const ME = { kind: 'bike', z: 0 };

  function draw() {
    const t = trip;
    if (!t) return;
    const day = t.day;
    look();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!sky || sky.day !== day) paintSky();
    ctx.drawImage(sky.copy, 0, 0, width, H0 + 2);
    // The eagle, high in the sky.
    if (t.eagle) {
      const eagle = t.eagle;
      const h = Math.min(width, height) * 0.08;
      const image = pic('eagle', h);
      if (image) {
        const k = eagle.age / 11;
        ctx.save();
        ctx.translate(width * (0.5 + eagle.from * (k * 1.3 - 0.65)), H0 * (eagle.high + 0.08 * Math.sin(eagle.age * 0.6)));
        ctx.rotate(eagle.from * (Math.PI / 2 - 0.12 * Math.cos(eagle.age * 0.6)));
        ctx.globalAlpha = 0.9;
        ctx.drawImage(image, (-h * SPRITES.eagle) / 2, -h / 2, h * SPRITES.eagle, h);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }
    // Beyond the furthest ground that is drawn lies sand in haze.
    ctx.fillStyle = css(day.haze);
    ctx.fillRect(0, H0, width, height - H0);

    // The lines across the desert between which the ground is drawn: a lane
    // apart near the camera, further apart far away, always at the same
    // places on the ground so that nothing swims.
    let n = 0;
    for (let z = camZ + VIEW.near; n < zs.length; n++) {
      const d = z - camZ;
      zs[n] = z;
      ss[n] = F / d;
      ys[n] = H0 + (camAlt - landAt(z)) * ss[n];
      if (d >= VIEW.far) {
        n += 1;
        break;
      }
      const step = d < 22 ? 1 : d < 46 ? 2 : d < 78 ? 4 : 8;
      z = (Math.floor(z / step + 1e-6) + 1) * step;
    }
    ys[0] = Math.max(ys[0], height + 2);

    // Everything that stands on the sand, the furthest first.
    seen.length = 0;
    const lo = camZ + VIEW.near;
    const hi = camZ + VIEW.things;
    while (t.first < t.items.length && t.items[t.first].z < lo) t.first += 1;
    for (let i = t.first; i < t.items.length && t.items[i].z < hi; i++) seen.push(t.items[i]);
    while (t.firstStar < t.stars.length && t.stars[t.firstStar].z < lo) t.firstStar += 1;
    for (let i = t.firstStar; i < t.stars.length && t.stars[i].z < hi; i++) seen.push(t.stars[i]);
    for (const one of t.lines) {
      if (one.z > lo - 12 && one.z < hi + 12) for (const walker of one.walkers) seen.push(walker);
    }
    ME.z = t.y;
    seen.push(ME);
    seen.sort((a, b) => b.z - a.z);

    // Ground and things together, from the far haze to the camera, so that a
    // crest hides what lies behind it. A thing is drawn once the ground under
    // its shadow is.
    let k = 0;
    while (k < seen.length && seen[k].z - 0.35 >= zs[n - 1]) thing(seen[k++]);
    for (let j = n - 2; j >= 0; j--) {
      if (ys[j + 1] < ys[j]) {
        slice(j);
        // Light catches a crest that hides the ground beyond it, and most of
        // all a ramp's lip: a bright edge, seen from far off.
        const d = zs[j + 1] - camZ;
        if (t.ramps.some((one) => one.lip === zs[j + 1])) {
          const thick = clamp(ss[j + 1] * 0.07, 2, 8);
          ctx.fillStyle = `rgba(255,251,238,${clamp(1.25 - d / 90, 0.35, 0.95).toFixed(2)})`;
          ctx.fillRect(0, ys[j + 1] - thick / 2, width, thick);
        } else if (j + 2 < n && ys[j + 2] >= ys[j + 1] + 0.5 && d < 60) {
          ctx.fillStyle = `rgba(255,250,236,${(0.5 * (1 - d / 60)).toFixed(2)})`;
          ctx.fillRect(0, ys[j + 1] - 1, width, 2);
        }
      }
      while (k < seen.length && seen[k].z - 0.35 >= zs[j]) thing(seen[k++]);
    }
    while (k < seen.length) thing(seen[k++]);
  }

  return { make, layout, update, draw };
})();
if (LOCAL) window.driveGame.desert = desert;
