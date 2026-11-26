/* الرِّمَايَةُ: archery. A boy seen over his right shoulder shoots at targets
   in an open field at the edge of a town. The child sets three things, as an
   archer does: left and right, up and down, and how far the string is drawn.
   The arrow then flies as a real one: along the aim, as fast as the draw
   makes it, falling under gravity, and it stops in the first thing it meets.

   The file has two parts. The first, archeryEngine, is the field and the
   flight, the bow as it is held, and the eye of the picture: lengths in
   meters, x to the right, y up, z away from the archer; it has no page in
   it, and in node it is module.exports, so a test can shoot every level and
   check where things fall on a screen. The second part is the page: the
   picture, the fingers, the words and the sounds. */
const archeryEngine = (() => {
  const RAD = Math.PI / 180;
  const C = {
    G: 9.8, // gravity, meters a second each second
    FAST: 25, // meters a second off a fully drawn child's bow
    SLOW: 0.25, // the speed grows with the draw from this share of FAST: a real bow's grows from nothing, and a small child's short draw would drop the arrow at his feet
    LET_DOWN: 0.15, // a draw shorter than this, let go, only lets the string down
    UP: 1, // the arrow's height above the ground he stands on: the hand at his cheek
    YAW: 22 * RAD, // how far left and right the bow turns
    HIGH: 30 * RAD, // and how far up
    LOW: -6 * RAD, // and down
    AIM_DEPTH: 12, // a finger on the picture points the arrow at the place under it this far away
    CAMERA: { right: 0.5, up: 0.25, back: 1.3 }, // the eye of the picture, from the arrow at his cheek: behind his right shoulder, a little above his head
    // The picture on a screen: the horizon's share of the height; the focal length as a share of the height; and, in focal
    // lengths from the point straight ahead of the eye, the room the boy takes to the left (all of him, then the least: his
    // head) and the room the targets take to the right. A narrow screen gets a wider lens, never a different eye.
    VIEW: { horizon: 0.4, tall: 1.05, left: 0.69, least: 0.58, right: 0.29 },
    BOW: { reach: 0.44, brace: 0.13, half: 0.46 }, // the grip ahead of his cheek, the string behind the grip at rest, half the string
    ARROW: 0.62,
    STEP: 1 / 400, // seconds between two looks at where the flying arrow is
    LONGEST: 6, // seconds: no flight lasts longer
    FAR: 90, // meters: the field ends
    HITS: 3, // hits to finish a level
    GOLD: 0.2, // the gold is this share of a ring target's radius, as on a real face
    BOSS: 0.22, // how thick the straw of a ring target is
    SINK: 0.07, // how deep an arrow goes in
    POT: { rx: 0.24, ry: 0.32 }, // half the width and half the height of a clay jar
  };
  C.BOW.draw = C.BOW.reach - C.BOW.brace; // how far the string comes back at full draw

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  /* What stands in every level, off to the sides and far away: the tent with
     its rugs, and the palms. An arrow that reaches one of them stops in it. */
  const SCENERY = [
    { kind: 'tent', x: -6.4, z: 17, w: 4.2, d: 3.6, eave: 1.5, ridge: 2.6, rugs: true },
    { kind: 'palm', x: 8.5, z: 21, h: 5.2 },
    { kind: 'palm', x: -10.5, z: 27, h: 6 },
    { kind: 'palm', x: 5.2, z: 32, h: 5.6 },
    { kind: 'palm', x: -4.2, z: 37, h: 5 },
    { kind: 'palm', x: 12, z: 34, h: 6.2 },
  ];

  const ring = (x, y, z, r = 0.6) => ({ kind: 'ring', x, y, z, r });
  const bag = (x, z, swing) => ({ kind: 'bag', x, z, top: 2.6, rope: 1.45, swing, r: 0.3, half: 0.38, span: 1.25 });
  const pot = (x, wall) => ({ kind: 'pot', x, y: wall.h, z: wall.z + wall.thick / 2 });
  const wall = (x0, x1, z, h) => ({ kind: 'wall', x0, x1, z, h, thick: 0.5 });
  const potWall = wall(-1.55, 1.55, 7, 0.8);
  const mixWall = wall(-0.85, 1.25, 6.6, 0.8);

  /* The levels. say: the instruction (the page has its words). path: how much
     of the arrow's path is shown, 1, a third, or none. aim: where the bow
     points when the level opens, degrees right and up. stands: the places to
     stand (up: on a mound this high); start: the one he begins on; clear:
     the ones a target can be hit from. Every other place has something tall
     close in front of it, in line with the target. */
  const LEVELS = [
    { say: 'pull', path: 1, aim: [0, 8], stands: [{ x: 0, z: 0 }], targets: [ring(0, 1.15, 6.5, 0.65)], things: [] },
    { say: 'aim', path: 1, aim: [0, 6], stands: [{ x: 0, z: 0 }], targets: [ring(1.9, 1.15, 9)], things: [] },
    { say: 'aim', path: 1, aim: [0, 4], stands: [{ x: 0, z: 0 }], targets: [ring(0.9, 1.2, 18)], things: [] },
    { say: 'wait', path: 1, aim: [0, 6], stands: [{ x: 0, z: 0 }], targets: [bag(0, 8, 0.38)], things: [] },
    { say: 'pots', path: 1, aim: [0, 5], stands: [{ x: 0, z: 0 }], targets: [pot(-1, potWall), pot(0, potWall), pot(1, potWall)], things: [potWall] },
    {
      say: 'place', path: 1, aim: [0, 6], stands: [{ x: 0, z: 0 }, { x: 1.6, z: 2.5 }], start: 0, clear: [1],
      targets: [ring(0, 1.15, 13)], things: [{ kind: 'palm', x: 0, z: 3.2, h: 5 }],
    },
    { say: 'aim', path: 1 / 3, aim: [0, 5], stands: [{ x: 0, z: 0 }], targets: [ring(-1.4, 1.2, 20)], things: [] },
    { say: 'wait', path: 0, aim: [0, 6], stands: [{ x: 0, z: 0 }], targets: [bag(0.6, 9, 0.34)], things: [] },
    {
      say: 'place', path: 1 / 3, aim: [0, 6], stands: [{ x: -2.5, z: 0 }, { x: 0, z: 0 }, { x: 2.6, z: 0, up: 1 }], start: 1, clear: [2],
      targets: [ring(0.4, 1.2, 15)],
      things: [
        { kind: 'tent', x: -2.2, z: 2, w: 3.4, d: 3, eave: 2.4, ridge: 3.3 },
        { kind: 'palm', x: 0.08, z: 3, h: 5 },
      ],
    },
    { say: 'aim', path: 0, aim: [0, 6], stands: [{ x: 0, z: 0 }], targets: [ring(-2.4, 1.2, 14), bag(1.9, 9, 0.34), pot(-0.3, mixWall), pot(0.7, mixWall)], things: [mixWall] },
  ];
  for (const level of LEVELS) {
    if (level.start === undefined) level.start = 0;
    if (!level.clear) level.clear = level.stands.map((_, i) => i);
    // A stand on a mound brings its mound, a low ridge that runs away from the archer; the scenery stands in every level.
    const mounds = level.stands.filter((stand) => stand.up).map((stand) => ({ kind: 'mound', x: stand.x, z: stand.z, rx: 2.2, rz: 5.2, h: stand.up }));
    level.solids = level.things.concat(mounds, SCENERY);
    level.mounds = mounds;
  }

  /* How high the ground is: flat, but for a mound. */
  function ground(level, x, z) {
    let high = 0;
    for (const mound of level.mounds) {
      const part = 1 - ((x - mound.x) / mound.rx) ** 2 - ((z - mound.z) / mound.rz) ** 2;
      if (part > 0) high = Math.max(high, mound.h * part);
    }
    return high;
  }

  /* Where the arrow's nock is at full draw when he stands on a place: at his
     right cheek. And the eye of the picture: behind his right shoulder. It
     looks straight down the field and never turns. */
  function anchor(level, stand) {
    const place = level.stands[stand];
    return [place.x, ground(level, place.x, place.z) + C.UP, place.z];
  }
  function camera(level, stand) {
    const o = anchor(level, stand);
    return [o[0] + C.CAMERA.right, o[1] + C.CAMERA.up, o[2] - C.CAMERA.back];
  }

  /* The picture on a screen of a width and a height: f, the pixels to the
     meter one meter ahead of the eye; mid and horizon, where the point
     straight ahead of the eye falls. The eye is to the right of the boy, so
     he is to the left of that point: on a wide screen it is the middle, or
     far enough right for all of him to show; on a narrow one the lens is
     wider and the point further right, so that his head and the targets both
     show. And a place in the field on that picture: x, y, and k pixels to
     the meter there; null when it is behind the eye. */
  function lens(width, height) {
    const V = C.VIEW;
    const f = Math.min(height * V.tall, width / (V.least + V.right));
    return { f, mid: Math.max(width / 2, Math.min(V.left * f, width - V.right * f)), horizon: Math.round(height * V.horizon) };
  }
  function onto(cam, glass, x, y, z) {
    const dz = z - cam[2];
    if (dz < 0.25) return null;
    const k = glass.f / dz;
    return { x: glass.mid + (x - cam[0]) * k, y: glass.horizon - (y - cam[1]) * k, k };
  }
  const project = (cam, glass, p) => onto(cam, glass, p[0], p[1], p[2]);

  const direction = (yaw, pitch) => [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  const speed = (pull) => C.FAST * (C.SLOW + (1 - C.SLOW) * clamp(pull, 0, 1));

  /* A finger on the picture, u focal lengths right of the point straight
     ahead of the eye and v above the horizon: the line from the eye through
     the finger meets the field AIM_DEPTH ahead of the archer at a place, and
     the arrow, from its nock at his cheek, points at that place. And back:
     where on the picture the place an aim points at is. */
  function aimAt(u, v) {
    const far = C.AIM_DEPTH + C.CAMERA.back;
    const x = u * far + C.CAMERA.right;
    const y = v * far + C.CAMERA.up;
    const yaw = clamp(Math.atan2(x, C.AIM_DEPTH), -C.YAW, C.YAW);
    // The height is worked out for the turn the bow really takes, so that past the limit of its turn the aim still rises and falls with the finger.
    return { yaw, pitch: clamp(Math.atan2(y * Math.cos(yaw), C.AIM_DEPTH), C.LOW, C.HIGH) };
  }
  function aimPoint(yaw, pitch) {
    const d = direction(yaw, pitch);
    const k = C.AIM_DEPTH / d[2];
    const far = C.AIM_DEPTH + C.CAMERA.back;
    return { u: (d[0] * k - C.CAMERA.right) / far, v: (d[1] * k - C.CAMERA.up) / far };
  }
  /* That place itself, in the field. */
  function aimPlace(level, stand, yaw, pitch) {
    const o = anchor(level, stand);
    const d = direction(yaw, pitch);
    const k = C.AIM_DEPTH / d[2];
    return [o[0] + d[0] * k, o[1] + d[1] * k, o[2] + d[2] * k];
  }

  /* The bow at a draw from 0 to 1: how far behind the grip the arrow's nock
     is, and where the limb tips are, across the bow and behind the grip. A
     limb turns about the grip as a stiff arm and the string keeps its
     length, so the tips come back and in as the string is drawn. */
  function bow(pull) {
    const B = C.BOW;
    const nock = B.brace + B.draw * clamp(pull, 0, 1);
    const limb = Math.hypot(B.half, B.brace);
    const bend = Math.asin(clamp((limb * limb + nock * nock - B.half * B.half) / (2 * nock * limb), -1, 1));
    return { nock, across: limb * Math.cos(bend), behind: limb * Math.sin(bend) };
  }

  /* The bow and the arrow as he holds them, in the field: o, his cheek; d,
     the way the arrow points; right and up, across it; grip, where the arrow
     crosses the bow; nock, the arrow's end on the string; rest, where the
     nock is with the string at rest; point, the arrow's tip; and the two
     tips of the bow. The bow stands upright in the plane of the arrow, and
     the arrow lies on the line from his cheek along the aim at every draw:
     the picture draws them from these, and the flight leaves from point. */
  function held(level, stand, yaw, pitch, pull) {
    const o = anchor(level, stand);
    const d = direction(yaw, pitch);
    const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const up = [d[1] * right[2] - d[2] * right[1], d[2] * right[0] - d[0] * right[2], d[0] * right[1] - d[1] * right[0]];
    const bent = bow(pull);
    const along = (from, way, far) => [from[0] + way[0] * far, from[1] + way[1] * far, from[2] + way[2] * far];
    const grip = along(o, d, C.BOW.reach);
    const nock = along(grip, d, -bent.nock);
    const back = along(grip, d, -bent.behind);
    return {
      o, d, right, up, grip, nock,
      rest: along(grip, d, -C.BOW.brace),
      point: along(nock, d, C.ARROW),
      tipUp: along(back, up, bent.across),
      tipDown: along(back, up, -bent.across),
    };
  }

  /* A sandbag hangs from its frame and swings as a pendulum of its rope's
     length: where its middle is at a time, and which way its rope runs. */
  function bagAt(target, time) {
    const angle = target.swing * Math.sin(Math.sqrt(C.G / target.rope) * time);
    const ax = Math.sin(angle);
    const ay = -Math.cos(angle);
    return { x: target.x + target.rope * ax, y: target.top + target.rope * ay, z: target.z, ax, ay, angle };
  }
  const bagPeriod = (target) => (2 * Math.PI) / Math.sqrt(C.G / target.rope);

  /* What a point is inside of, if anything: a target, something that stands
     in the field, or the ground. met.index is the target's number; met.solid
     is the thing that stands there, when it is one. */
  const met = { kind: '', index: -1, solid: null };
  function inside(level, broken, x, y, z, time) {
    met.index = -1;
    met.solid = null;
    const targets = level.targets;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      met.index = i;
      if (t.kind === 'ring') {
        if (z >= t.z && z <= t.z + C.BOSS && (x - t.x) ** 2 + (y - t.y) ** 2 <= t.r * t.r) return (met.kind = 'ring');
      } else if (t.kind === 'pot') {
        if (broken && broken[i]) continue;
        const dx = (x - t.x) / C.POT.rx;
        const dy = (y - t.y - C.POT.ry) / C.POT.ry;
        const dz = (z - t.z) / C.POT.rx;
        if (dx * dx + dy * dy + dz * dz <= 1) return (met.kind = 'pot');
      } else {
        const b = bagAt(t, time);
        const px = x - b.x;
        const py = y - b.y;
        const along = clamp(px * b.ax + py * b.ay, -t.half, t.half);
        if ((px - along * b.ax) ** 2 + (py - along * b.ay) ** 2 + (z - b.z) ** 2 <= t.r * t.r) return (met.kind = 'bag');
      }
    }
    met.index = -1;
    for (const s of level.solids) {
      met.solid = s;
      if (s.kind === 'wall') {
        if (y <= s.h && x >= s.x0 && x <= s.x1 && z >= s.z && z <= s.z + s.thick) return (met.kind = 'wall');
      } else if (s.kind === 'palm') {
        if (y <= s.h && (x - s.x) ** 2 + (z - s.z) ** 2 <= (s.r || 0.24) ** 2) return (met.kind = 'palm');
      } else if (s.kind === 'tent') {
        const off = Math.abs(x - s.x) / (s.w / 2);
        if (off <= 1 && z >= s.z && z <= s.z + s.d && y <= s.eave + (s.ridge - s.eave) * (1 - off)) return (met.kind = 'tent');
      }
    }
    met.solid = null;
    if (y <= ground(level, x, z)) return (met.kind = 'ground');
    return (met.kind = '');
  }

  /* One arrow, from the string to where it stops. shot: the place he stands
     on (stand), the aim (yaw and pitch, in radians), the draw (pull, 0 to 1),
     the level's clock at the release (time, seconds), and which jars are
     already broken. The answer: where the arrow's point is at any moment
     (at), which way it heads then (heading), how long it flies (duration),
     where it stops (end, dir) and in what (hit: 'ring', 'bag', 'pot',
     'wall', 'palm', 'tent', 'ground' or 'far'; target: the target's number,
     or -1; solid: the wall, palm or tent it stopped in). The dotted path on
     the page is this same answer, drawn. */
  function fly(level, shot) {
    const o = anchor(level, shot.stand);
    const d = direction(shot.yaw, shot.pitch);
    const v = speed(shot.pull);
    // The point of the arrow where the hand lets the string go: the flight is reckoned from there, at the speed the draw gives, so the arrow leaves from where it is drawn.
    const lead = C.BOW.reach - bow(shot.pull).nock + C.ARROW;
    const from = [o[0] + d[0] * lead, o[1] + d[1] * lead, o[2] + d[2] * lead];
    const velocity = [d[0] * v, d[1] * v, d[2] * v];
    const at = (t) => [from[0] + velocity[0] * t, from[1] + velocity[1] * t - 0.5 * C.G * t * t, from[2] + velocity[2] * t];
    const heading = (t) => {
      const vy = velocity[1] - C.G * t;
      const size = Math.hypot(velocity[0], vy, velocity[2]);
      return [velocity[0] / size, vy / size, velocity[2] / size];
    };
    const began = shot.time || 0;
    const broken = shot.broken || null;
    const look = (t) => {
      const p = at(t);
      return inside(level, broken, p[0], p[1], p[2], began + t);
    };
    let t = 0;
    let hit = look(0);
    let target = met.index;
    let solid = met.solid;
    if (!hit) {
      for (;;) {
        const next = t + C.STEP;
        hit = look(next);
        if (hit) {
          target = met.index;
          solid = met.solid;
          // Halve the step until the place it went in is found.
          let out = t;
          let into = next;
          for (let i = 0; i < 16; i++) {
            const half = (out + into) / 2;
            const kind = look(half);
            if (kind) {
              into = half;
              hit = kind;
              target = met.index;
              solid = met.solid;
            } else out = half;
          }
          t = into;
          break;
        }
        t = next;
        const p = at(t);
        if (t > C.LONGEST || p[2] > C.FAR || Math.abs(p[0]) > C.FAR) {
          hit = 'far';
          target = -1;
          solid = null;
          break;
        }
      }
    }
    const end = at(t);
    const flight = { stand: shot.stand, pull: shot.pull, time: began, from, velocity, at, heading, duration: t, end, dir: heading(t), hit, target, solid, gold: false, off: 0 };
    const struck = target >= 0 ? level.targets[target] : null;
    if (hit === 'ring') {
      // How far from the middle, as a share of the radius; an arrow that touches the gold's edge is in the gold.
      flight.off = Math.hypot(end[0] - struck.x, end[1] - struck.y) / struck.r;
      flight.gold = flight.off <= C.GOLD + 0.02;
    } else if (hit === 'bag') {
      // Where on the bag, so the arrow can swing with it: along its rope, across it, and how deep.
      const b = bagAt(struck, began + t);
      const px = end[0] - b.x;
      const py = end[1] - b.y;
      flight.on = { along: px * b.ax + py * b.ay, across: px * -b.ay + py * b.ax, deep: end[2] - b.z };
    }
    return flight;
  }

  /* An aim and a draw that hit a target from a place, or null: for the tests,
     and for trying the game by hand. It turns the bow to the target, tries a
     few draws, finds the height that carries the arrow to the target's
     middle as if nothing stood in between, then flies the arrow for real.
     For a sandbag it also finds how long to wait. */
  function findShot(level, want) {
    const o = anchor(level, want.stand);
    const t = level.targets[want.target];
    const rest = t.kind === 'bag' ? bagAt(t, 0) : null;
    const middle = t.kind === 'ring' ? [t.x, t.y, t.z] : t.kind === 'pot' ? [t.x, t.y + C.POT.ry, t.z - C.POT.rx * 0.8] : [t.x, t.top - t.rope, rest.z - t.r * 0.8];
    const yaw = Math.atan2(middle[0] - o[0], middle[2] - o[2]);
    if (Math.abs(yaw) > C.YAW) return null;
    const away = Math.hypot(middle[0] - o[0], middle[2] - o[2]);
    const waits = [0];
    if (t.kind === 'bag') for (let wait = 0.05; wait < bagPeriod(t); wait += 0.05) waits.push(wait);
    for (const pull of [0.85, 1, 0.7, 0.55, 0.4]) {
      const v = speed(pull);
      const lead = C.BOW.reach - bow(pull).nock + C.ARROW;
      const over = (pitch) => {
        const run = (away - lead * Math.cos(pitch)) / (v * Math.cos(pitch));
        return o[1] + lead * Math.sin(pitch) + v * Math.sin(pitch) * run - 0.5 * C.G * run * run - middle[1];
      };
      if (over(C.HIGH) < 0 || over(C.LOW) > 0) continue;
      let low = C.LOW;
      let high = C.HIGH;
      for (let i = 0; i < 40; i++) {
        const half = (low + high) / 2;
        if (over(half) < 0) low = half;
        else high = half;
      }
      const pitch = (low + high) / 2;
      for (const wait of waits) {
        const flight = fly(level, { stand: want.stand, yaw, pitch, pull, time: (want.time || 0) + wait, broken: want.broken });
        if (flight.hit === t.kind && flight.target === want.target) return { yaw, pitch, pull, wait, flight };
      }
    }
    return null;
  }

  /* What a point is inside of at a time, by name, or '' (the tests look along a path with it). */
  const meets = (level, broken, point, time) => inside(level, broken, point[0], point[1], point[2], time || 0);

  return { C, RAD, LEVELS, SCENERY, ground, anchor, camera, lens, onto, project, direction, speed, aimAt, aimPoint, aimPlace, bow, held, bagAt, bagPeriod, meets, fly, findShot };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = archeryEngine;

/* The page. The picture is seen over the archer's right shoulder in true
   perspective from one eye (archeryEngine.camera): it stands still behind
   him, half a meter to the right of the arrow and a little above his head,
   and looks straight down the field; the horizon is two fifths of the way
   down the screen and never moves, and a thing z meters ahead of the eye is
   drawn f / z pixels to the meter. Nothing follows the arrow: it flies off
   into a picture that stands still. Moving to another place to stand changes
   the picture with a quick fade.
   The boy is a right-handed archer and stands as one does: sideways to the
   target, his left shoulder toward it, his chest to the right. So the eye
   sees the back of his black hair and his right ear, the red scarf, the navy
   sweater, the quiver on his back. His left arm is stretched toward the
   target and its fist holds the bow, upright; his right hand holds the
   string at the arrow's nock and draws it back to his right cheek, the elbow
   coming back toward the eye. He, the bow, the string and the arrow are all
   drawn from where they really are (archeryEngine.held), the nearer over the
   farther: so the arrow on the screen points at the place it is aimed at,
   the limbs bend and the string folds as the draw says. */
if (typeof document !== 'undefined') (() => {
  const E = archeryEngine;
  const { C, RAD, LEVELS } = E;
  const $ = (id) => document.getElementById(id);
  const KEY = 'archery';
  const SAVE = 1;
  const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
  /* The words: what shows, and the recording that says it. */
  const TEXT = {
    pull: { line: 'اِسْحَبِ السَّهْمَ ثُمَّ أَطْلِقْهُ', clip: 'archery-pull' },
    aim: { line: 'صَوِّبْ نَحْوَ الْهَدَفِ', clip: 'archery-aim' },
    wait: { line: 'اِنْتَظِرِ اللَّحْظَةَ الْمُنَاسِبَةَ', clip: 'archery-wait' },
    pots: { line: 'أَصِبِ الْجِرَارَ الثَّلَاثَ', clip: 'archery-pots' },
    place: { line: 'اِخْتَرْ مَكَانَ الْوُقُوفِ', clip: 'archery-place' },
    gold: { line: 'مَا شَاءَ اللَّهُ', clip: 'mashaallah' },
    done: { line: 'أحسنت', clip: 'well-done' },
    end: { line: 'الْحَمْدُ لِلَّهِ', clip: 'alhamdulillah' },
    restart: 'مِنَ الْبِدَايَةِ',
    left: 'إِلَى الْيَسَارِ',
    right: 'إِلَى الْيَمِينِ',
  };
  const HADITH = 'archery-hadith';
  const RELOAD = 0.75; // seconds for his hand to bring the next arrow from the quiver
  const KEY_DRAW = 1.1; // seconds for the space bar to draw the bow fully
  const FADE = { out: 0.14, back: 0.24 }; // the quick fade between two places, and between two levels
  const MOST = 60; // arrows left standing in the field
  const DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const arabic = (n) => String(n).replace(/\d/g, (d) => DIGITS[d]);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const rng = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const FEET = '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor"><path d="M9 21a7 7 0 0 1 14 0v7H9z"/><rect x="9" y="31" width="14" height="9" rx="4"/><path d="M25 14a7 7 0 0 1 14 0v7H25z"/><rect x="25" y="24" width="14" height="9" rx="4"/></g></svg>';
  const FEET_UP = '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor"><path d="M12 14a5 5 0 0 1 10 0v5H12z"/><rect x="12" y="21" width="10" height="6" rx="3"/><path d="M26 9a5 5 0 0 1 10 0v5H26z"/><rect x="26" y="16" width="10" height="6" rx="3"/></g><path d="M5 43Q24 25 43 43" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';

  /* Colors */
  const WOOD = '#8A6238';
  const WOOD_DARK = '#5E4022';
  const NAVY = '#22355F';
  const NAVY_DARK = '#182849';
  const CUFF = '#31477A';
  const RED = '#C8372D';
  const RED_DARK = '#9C2A22';
  const HAIR = '#1E1B1F';
  const SKIN = '#E3B78E';
  const SKIN_DARK = '#B98C62';
  const TROUSERS = '#7A6A58';
  const TROUSERS_DARK = '#54483A';
  const STRAW = '#D9B65F';
  const FACE = ['#F6F2E6', '#33302E', '#3E86C6', '#D5483A', '#F3C22F']; // a ring target, from the outside in
  const CLAY = '#C97B4E';
  const CLAY_DARK = '#8E4F2E';
  const BURLAP = '#C8A46A';
  const BURLAP_DARK = '#8E6E3F';
  const FIELD = [[0, [228, 216, 168]], [0.1, [211, 205, 147]], [0.45, [191, 195, 128]], [1, [169, 182, 109]]]; // the ground, from the horizon to the foot of the screen
  const tint = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const css = (c) => `rgb(${c.map((v) => Math.round(v)).join(',')})`;

  /* The boy: a child, 1.17 tall, a right-handed archer who stands sideways to
     the target. Lengths in meters. TOP is all of him above the waist, from
     the arrow's nock at his cheek at full draw: x to the right of the aim
     (his chest is on that side), y up, z along the aim (his left shoulder is
     ahead, his right one behind). It turns with the aim as one piece, about
     that point, and leans back as the arrow rises (pose); his arms then
     reach from his shoulders to the bow and the string, wherever they are.
     LOW is his hips, legs and feet, from the ground under that point: x to
     the right, y up, z down the field; they stay as the aim turns. */
  const TOP = {
    head: [-0.05, 0.085, -0.09], // the back of his head is toward the eye; his face is toward the target
    headR: 0.09,
    jaw: [-0.04, 0.02, -0.05], // his right cheek and jaw, where the hand comes to
    jawR: 0.058,
    ear: [0.037, 0.068, -0.086], // his right ear
    neck: [-0.07, -0.07, -0.08],
    shoulderL: [-0.07, -0.1, 0.055], // toward the target
    shoulderR: [-0.14, -0.135, -0.2], // at full draw, drawn back and round
    shoulderReach: [0.01, -0.12, -0.07], // and when the right hand reaches forward to the string at rest
    upper: 0.19, // an upper arm
    fore: 0.215, // a forearm, to the middle of the hand
    poleL: [-0.3, -1, 0], // which way each elbow points: the left one down,
    poleR: [0.33, 0.43, -1], // the right one back at full draw, in line with the arrow,
    poleReach: [0.7, -0.8, -0.3], // down and out when the hand reaches forward,
    poleQuiver: [0.6, 0.4, -0.7], // and up and back when it goes to the quiver
    hand: [0.02, -0.008, -0.035], // the middle of the right hand, from the nock its fingers hold
    quiverMouth: [-0.175, -0.015, -0.18], // on his back, by his right shoulder
    quiverFoot: [-0.165, -0.4, -0.02],
    round: [[0.16, -0.04, -0.05], [0.08, 0, -0.34]], // the hand goes out past his right cheek and round the back of his neck to the quiver,
    back: [[0.04, -0.06, -0.3], [0.21, -0.02, 0.02]], // and comes back the same way with the arrow: never through his head
  };
  const LOW = {
    spine: [-0.07, -0.08], // x and z of the middle of him
    waist: 0.69,
    hips: 0.55,
    knee: 0.29,
    ankle: 0.06,
    apart: 0.13, // each foot from the middle, along the shooting line
  };
  const POT_LEAN = (() => {
    const lean = [0.12, -0.8, 0.58];
    const size = Math.hypot(...lean);
    return lean.map((v) => v / size);
  })(); // an arrow that broke a jar rests in what is left of it, point down

  const root = $('archery');
  const canvas = $('field');
  let ctx = canvas.getContext('2d'); // the picture; for a moment the mound's own sheet (drawMounds)
  const lineEl = $('line');
  const wordEl = $('word');
  const endBox = $('end');
  const praiseEl = $('praise');
  const againButton = $('again');

  /* The game */
  let view = 'hadith';
  let saved = 0; // the level kept on the device
  let levelIndex = 0;
  let level = LEVELS[0];
  let stand = 0; // the place he stands on
  let yaw = 0;
  let pitch = 0;
  let pull = 0; // the draw now, 0 to 1
  let lastPull = 0.75; // the draw of the last arrow: the path is drawn for it while the string rests
  let hits = 0;
  let broken = []; // the jars that are broken
  let stuck = []; // the arrows that have landed
  let arrow = null; // the arrow in the air
  let reload = 1; // his hand on its way to the quiver and back; at 1 an arrow is on the string
  let handFrom = 0; // how far ahead of his cheek his hand let the string go
  let clock = 0; // the level's clock, in seconds
  let bits = []; // straw, dust and shards
  let jolts = {}; // when each sandbag was last hit
  let fade = null; // the quick fade, and what changes behind it
  let busy = true; // nothing can be aimed or shot: a level is over, or not yet open
  let run = 0; // counts the levels opened, so that an old wait does nothing
  let wordRun = 0;
  let used = false; // the grip has been pulled once in this visit
  let moved = false; // he has gone to another place in this level
  let wantStand = -1; // a place asked for while an arrow was in the air
  let aimId = null; // the finger that aims
  let pullId = null; // the finger that draws
  let pullFrom = [0, 0]; // where on the screen it began to pull
  let pullAt = [0, 0]; // where it is now
  let pullWaits = false; // it took the grip before the next arrow was on the string
  let keyPull = false; // the space bar is drawing the bow
  let shown = null; // the flight the dotted path was last drawn from

  /* The screen */
  let width = 0;
  let height = 0;
  let dpr = 1;
  let glass = { f: 600, mid: 0, horizon: 0 }; // the picture on this screen (archeryEngine.lens), and the same three by name:
  let f = 600; // pixels to the meter, one meter ahead of the eye
  let mid = 0; // the point straight ahead of the eye: across the screen,
  let horizon = 0; // and down it
  let cam = [0, 0, 0];
  let grab = 34; // the radius of the grip's ring
  let span = 100; // how far a finger travels for a full draw
  let headAt = null; // his head on the screen: a touch on it is not an aim
  let backdrop = null;
  let moundSheet = null; // the mound as it looks from one place, painted once
  let moundKey = '';
  let running = false;
  let raf = 0;
  let last = 0;

  const ready = () => reload >= 1 && !arrow && !busy && !fade;

  /* Saved on the device: the level reached. */
  function save(to) {
    saved = to;
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: SAVE, level: to }));
    } catch {
      // Private browsing: it lasts for this visit only.
    }
  }

  function load() {
    try {
      const kept = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (kept && kept.v === SAVE && Number.isInteger(kept.level) && kept.level >= 0 && kept.level < LEVELS.length) saved = kept.level;
    } catch {
      saved = 0;
    }
  }

  function show(next) {
    view = next;
    root.dataset.view = next;
    $('view-hadith').hidden = next !== 'hadith';
    $('view-field').hidden = next !== 'field';
    canvas.hidden = next !== 'field';
  }

  /* Small helpers with points [x, y, z]. */
  const add = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];
  const between = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const unit = (v) => {
    const size = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / size, v[1] / size, v[2] / size];
  };

  /* A place in the field, on the screen: x, y, and k pixels to the meter there. Null when it is behind the eye. */
  const P = (x, y, z) => E.onto(cam, glass, x, y, z);
  const Pv = (p) => P(p[0], p[1], p[2]);

  function layout() {
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    glass = E.lens(width, height);
    f = glass.f;
    mid = glass.mid;
    horizon = glass.horizon;
    grab = clamp(Math.min(width, height) * 0.07, 28, 46);
    // The nock comes back this far on the screen from rest to his cheek, on a level aim; the finger goes half as far again, so a small hand has room to choose its draw.
    const travel = f * Math.hypot(C.CAMERA.right, C.CAMERA.up) * (1 / C.CAMERA.back - 1 / (C.CAMERA.back + C.BOW.draw));
    span = clamp(travel * 1.5, 56, 130);
    paintBackdrop();
    placePlaces();
  }

  /* The sky of a late afternoon, the far town with its domes and minarets,
     and the field, painted once for a screen size: none of it ever moves. */
  function paintBackdrop() {
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const c = copy.getContext('2d');
    c.scale(dpr, dpr);
    const sky = c.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#86B4DC');
    sky.addColorStop(0.5, '#BCD4DF');
    sky.addColorStop(0.84, '#F2E2BF');
    sky.addColorStop(1, '#F8D9A4');
    c.fillStyle = sky;
    c.fillRect(0, 0, width, horizon + 1);
    const tall = clamp(height / 110, 3.2, 8); // the town's own measure
    // The sun, low on the right.
    const sunX = width * 0.82;
    const sunY = horizon - tall * 9;
    const sunR = tall * 3.2;
    const glow = c.createRadialGradient(sunX, sunY, sunR * 0.4, sunX, sunY, sunR * 7);
    glow.addColorStop(0, 'rgba(255,238,178,.8)');
    glow.addColorStop(1, 'rgba(255,238,178,0)');
    c.fillStyle = glow;
    c.fillRect(sunX - sunR * 7, sunY - sunR * 7, sunR * 14, sunR * 14);
    c.fillStyle = '#FFEDB0';
    c.beginPath();
    c.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    c.fill();
    // A few long, thin clouds.
    const random = rng(23);
    c.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 4; i++) {
      const x = (i + 0.15 + random() * 0.6) * (width / 4);
      const y = horizon * (0.14 + random() * 0.4);
      for (const [dx, dy, r] of [[-3, 0.3, 2.4], [0, 0, 3.4], [3.2, 0.4, 2.2]]) {
        c.beginPath();
        c.ellipse(x + dx * tall, y + dy * tall, r * tall * 1.7, r * tall * 0.42, 0, 0, Math.PI * 2);
        c.fill();
      }
    }
    // Far hills, then the town.
    c.fillStyle = '#DFCEAC';
    c.beginPath();
    c.moveTo(0, horizon + 1);
    for (let x = 0; x <= width + 30; x += 30) c.lineTo(x, horizon - tall * (1.5 + 1.1 * Math.sin(x / (tall * 37) + 1) + 0.5 * Math.sin(x / (tall * 13))));
    c.lineTo(width + 30, horizon + 1);
    c.closePath();
    c.fill();
    c.fillStyle = '#C9AB84';
    for (let x = -tall * 2; x < width + tall * 2;) {
      const w = tall * (1.6 + random() * 3.4);
      const up = tall * (0.9 + random() * 2);
      const kind = random();
      c.fillRect(x, horizon - up, w + 0.5, up + 1);
      if (kind < 0.16) {
        // A dome.
        c.beginPath();
        c.arc(x + w / 2, horizon - up, w * 0.38, Math.PI, 0);
        c.fill();
        c.fillRect(x + w / 2 - tall * 0.06, horizon - up - w * 0.38 - tall * 0.6, tall * 0.12, tall * 0.6);
      } else if (kind < 0.27) {
        // A minaret: a slim tower, its balcony and its pointed top.
        const mx = x + w * 0.25;
        const mt = tall * (5 + random() * 2.4);
        const mw = tall * 0.5;
        c.fillRect(mx, horizon - mt, mw, mt);
        c.fillRect(mx - mw * 0.35, horizon - mt * 0.72, mw * 1.7, tall * 0.28);
        c.beginPath();
        c.moveTo(mx - mw * 0.1, horizon - mt);
        c.lineTo(mx + mw / 2, horizon - mt - tall * 1.2);
        c.lineTo(mx + mw * 1.1, horizon - mt);
        c.closePath();
        c.fill();
      }
      x += w + (random() < 0.2 ? tall * random() * 2 : 0);
    }
    const haze = c.createLinearGradient(0, horizon - tall * 3.5, 0, horizon);
    haze.addColorStop(0, 'rgba(248,224,180,0)');
    haze.addColorStop(1, 'rgba(248,224,180,.6)');
    c.fillStyle = haze;
    c.fillRect(0, horizon - tall * 3.5, width, tall * 3.5);
    // The field.
    const land = c.createLinearGradient(0, horizon, 0, height);
    for (const [at, color] of FIELD) land.addColorStop(at, css(color));
    c.fillStyle = land;
    c.fillRect(0, horizon, width, height - horizon);
    backdrop = copy;
  }

  /* The field's color at a height on the screen, as the backdrop paints it. */
  function fieldAt(y) {
    const part = clamp((y - horizon) / Math.max(1, height - horizon), 0, 1);
    let i = 0;
    while (i < FIELD.length - 2 && part > FIELD[i + 1][0]) i++;
    return tint(FIELD[i][1], FIELD[i + 1][1], clamp((part - FIELD[i][0]) / (FIELD[i + 1][0] - FIELD[i][0]), 0, 1));
  }

  /* Drawing: small pieces first. */
  function line(a, b, color, wide) {
    if (!a || !b) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = wide;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  function disc(p, r, color) {
    if (!p) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, r), 0, Math.PI * 2);
    ctx.fill();
  }

  function shape(points, fill, edge, wide) {
    if (points.some((p) => !p)) return false;
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (edge) {
      ctx.strokeStyle = edge;
      ctx.lineWidth = wide || 1;
      ctx.stroke();
    }
    return true;
  }

  /* A box with round corners, for browsers without roundRect. */
  function box(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* The soft shadow of something that stands on the ground. */
  function shadow(x, y, z, rx, rz) {
    const p = P(x, y, z);
    if (!p) return;
    ctx.fillStyle = 'rgba(74,52,36,.16)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx * p.k, Math.max(1, (rz * p.k * (cam[1] - y)) / (z - cam[2])), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Tufts of grass and small stones, strewn once. */
  const TUFTS = (() => {
    const random = rng(5);
    const list = [];
    for (let i = 0; i < 110; i++) list.push({ x: (random() - 0.5) * 36, z: 3 + random() * random() * 46, size: 0.6 + random() * 0.8, stone: random() < 0.18 });
    return list;
  })();

  function drawTufts() {
    ctx.lineCap = 'round';
    for (const tuft of TUFTS) {
      const p = P(tuft.x, E.ground(level, tuft.x, tuft.z), tuft.z);
      if (!p || p.x < -20 || p.x > width + 20 || p.y > height + 10) continue;
      const s = tuft.size * 0.16 * p.k;
      if (s < 1.2) continue;
      ctx.globalAlpha = clamp(1.2 - (tuft.z - cam[2]) / 45, 0.2, 0.85);
      if (tuft.stone) {
        ctx.fillStyle = '#BDAF8B';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, s * 0.7, s * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#8C9E58';
        ctx.lineWidth = Math.max(1, s * 0.16);
        ctx.beginPath();
        for (const lean of [-0.6, 0, 0.6]) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + lean * s, p.y - s * (1 - Math.abs(lean) * 0.3));
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* A mound: the ground itself, drawn in small patches from the far side to
     the near one, each lit by the low sun on the right. */
  function drawMound(mound) {
    const rows = 20;
    const cols = 16;
    const far = mound.z + mound.rz;
    const near = Math.max(mound.z - mound.rz, cam[2] + 0.5);
    if (far <= near) return;
    const across = (z) => {
      const points = [];
      for (let i = 0; i <= cols; i++) {
        const x = mound.x - mound.rx + (2 * mound.rx * i) / cols;
        points.push([x, E.ground(level, x, z), z]);
      }
      return points;
    };
    let back = across(far);
    for (let r = 1; r <= rows; r++) {
      const front = across(far + ((near - far) * r) / rows);
      for (let i = 0; i < cols; i++) {
        const corners = [back[i], back[i + 1], front[i + 1], front[i]];
        const high = Math.max(...corners.map((p) => p[1]));
        if (high <= 0) continue; // level ground: the backdrop has it
        const on = corners.map(Pv);
        if (on.some((p) => !p)) continue;
        // The slope across and along, and how the sun (low, to the right and ahead) meets it.
        const sx = (back[i + 1][1] - back[i][1] + front[i + 1][1] - front[i][1]) / 2 / (back[i + 1][0] - back[i][0]);
        const sz = (back[i][1] - front[i][1] + back[i + 1][1] - front[i + 1][1]) / 2 / (back[i][2] - front[i][2]);
        const lit = (-sx * 0.5 + 0.6 - sz * 0.62) / Math.hypot(sx, 1, sz) - 0.6;
        const ground = fieldAt((on[0].y + on[2].y) / 2);
        const color = css(lit > 0 ? tint(ground, [232, 224, 168], clamp(lit * 1.2, 0, 0.4)) : tint(ground, [124, 134, 78], clamp(-lit * 1.2, 0, 0.4)));
        shape(on, color, color, 1);
      }
      back = front;
    }
  }

  /* The mound stands still like the backdrop, and its hundreds of patches
     are slow to paint: they are painted once for a level, a place and a
     screen size, on a sheet of their own, and the sheet is laid down each frame. */
  function drawMounds() {
    if (!level.mounds.length) return;
    const key = [levelIndex, stand, canvas.width, canvas.height, dpr].join(' ');
    if (key !== moundKey || !moundSheet) {
      const sheet = document.createElement('canvas');
      sheet.width = canvas.width;
      sheet.height = canvas.height;
      const picture = ctx;
      ctx = sheet.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      try {
        for (const mound of level.mounds) drawMound(mound);
      } finally {
        ctx = picture;
      }
      moundSheet = sheet;
      moundKey = key;
    }
    ctx.drawImage(moundSheet, 0, 0, width, height);
  }

  /* A small rug marks a place to stand. */
  function drawRug(place) {
    const y = E.ground(level, place.x, place.z) + 0.01;
    const corners = (inset) => [[-0.55 + inset, -0.3 + inset], [0.55 - inset, -0.3 + inset], [0.55 - inset, 0.5 - inset], [-0.55 + inset, 0.5 - inset]].map(([x, z]) => P(place.x + x, y, place.z + z));
    if (!shape(corners(0), '#A63C32')) return;
    shape(corners(0.07), null, '#F1E2BE', Math.max(1, 0.02 * corners(0)[0].k));
    shape([[0, -0.12], [0.22, 0.1], [0, 0.32], [-0.22, 0.1]].map(([x, z]) => P(place.x + x, y, place.z + z)), '#2F7F78');
  }

  /* A palm: a trunk an arrow stops in, and a crown it would fly through. */
  const FRONDS = [[-1, 0.3], [1, 0.3], [-0.9, -0.12], [0.9, -0.12], [-0.6, -0.45], [0.6, -0.45], [-0.22, -0.62], [0.22, -0.62], [-0.55, 0.5], [0.55, 0.5]];
  function drawPalm(s) {
    const foot = P(s.x, 0, s.z);
    const top = P(s.x, s.h, s.z);
    if (!foot || !top) return;
    const k = foot.k;
    const r = (s.r || 0.24) * k;
    shadow(s.x, 0, s.z, 0.8, 0.45);
    ctx.fillStyle = '#9B7B54';
    ctx.beginPath();
    ctx.moveTo(foot.x - r * 1.15, foot.y);
    ctx.lineTo(top.x - r * 0.75, top.y);
    ctx.lineTo(top.x + r * 0.75, top.y);
    ctx.lineTo(foot.x + r * 1.15, foot.y);
    ctx.closePath();
    ctx.fill();
    // The trunk's rings, and its shaded side.
    ctx.fillStyle = 'rgba(74,52,36,.16)';
    ctx.beginPath();
    ctx.moveTo(foot.x - r * 1.15, foot.y);
    ctx.lineTo(top.x - r * 0.75, top.y);
    ctx.lineTo(top.x - r * 0.2, top.y);
    ctx.lineTo(foot.x - r * 0.35, foot.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(74,52,36,.3)';
    ctx.lineWidth = Math.max(1, 0.025 * k);
    const rings = Math.round(s.h / 0.45);
    for (let i = 1; i < rings; i++) {
      const t = i / rings;
      const y = lerp(foot.y, top.y, t);
      const w = r * lerp(1.15, 0.75, t);
      ctx.beginPath();
      ctx.moveTo(foot.x - w, y);
      ctx.quadraticCurveTo(foot.x, y + w * 0.4, foot.x + w, y);
      ctx.stroke();
    }
    const long = 2.4 * k;
    FRONDS.forEach(([dx, dy], i) => {
      const ex = top.x + dx * long;
      const ey = top.y + dy * long;
      const mx = (top.x + ex) / 2;
      const my = (top.y + ey) / 2;
      ctx.fillStyle = i % 2 ? '#4E7C40' : '#5F8E4B';
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.quadraticCurveTo(mx, my - long * 0.42, ex, ey);
      ctx.quadraticCurveTo(mx, my - long * 0.12, top.x, top.y);
      ctx.fill();
    });
    disc(top, r * 0.9, '#7A6038');
  }

  /* A tent: its front toward the archers, the side that shows, and for the
     one that stands in every level, rugs spread before its door. */
  function drawTent(s) {
    const x0 = s.x - s.w / 2;
    const x1 = s.x + s.w / 2;
    const z1 = s.z + s.d;
    const front = [P(x0, 0, s.z), P(x0, s.eave, s.z), P(s.x, s.ridge, s.z), P(x1, s.eave, s.z), P(x1, 0, s.z)];
    const backRidge = P(s.x, s.ridge, z1);
    if (front.some((p) => !p) || !backRidge) return;
    const k = front[0].k;
    shadow(s.x, 0, s.z + s.d / 2, s.w * 0.6, s.d * 0.6);
    // The side wall and the slope of the roof on the side the eye is on.
    for (const [x, sign] of [[x0, -1], [x1, 1]]) {
      if ((cam[0] - x) * sign > 0) shape([P(x, 0, s.z), P(x, s.eave, s.z), P(x, s.eave, z1), P(x, 0, z1)], '#D8C59C');
      const over = (cam[0] - x) * sign * (s.ridge - s.eave) + (cam[1] - s.eave) * (s.w / 2);
      if (over > 0) shape([P(x, s.eave, s.z), front[2], backRidge, P(x, s.eave, z1)], sign < 0 ? '#E4D4AE' : '#F0E4C4');
    }
    shape(front, '#EFE2C2');
    // Stripes down the front, and a band under the eaves.
    ctx.save();
    ctx.beginPath();
    front.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = '#B9563F';
    ctx.lineWidth = Math.max(1, 0.07 * k);
    for (let i = 1; i < 8; i++) {
      if (i === 4) continue;
      const x = lerp(front[0].x, front[4].x, i / 8);
      ctx.beginPath();
      ctx.moveTo(x, front[0].y);
      ctx.lineTo(x, front[2].y);
      ctx.stroke();
    }
    ctx.restore();
    line(front[1], front[3], '#B9563F', Math.max(1, 0.05 * k));
    shape(front, null, '#A88E5E', Math.max(1, 0.02 * k));
    // The door: dark inside, a flap held back.
    const sill = P(s.x, 0, s.z);
    const doorTop = P(s.x, s.eave * 0.92, s.z);
    const half = Math.min(0.75, s.w * 0.2) * k;
    ctx.fillStyle = '#5B4636';
    ctx.beginPath();
    ctx.moveTo(sill.x - half, sill.y);
    ctx.lineTo(doorTop.x, doorTop.y);
    ctx.lineTo(sill.x + half, sill.y);
    ctx.closePath();
    ctx.fill();
    if (!s.rugs) return;
    const rug = (x, z, w, d, color, inner) => {
      shape([P(x, 0.01, z), P(x + w, 0.01, z), P(x + w, 0.01, z + d), P(x, 0.01, z + d)], color);
      shape([P(x + 0.15, 0.01, z + 0.12), P(x + w - 0.15, 0.01, z + 0.12), P(x + w - 0.15, 0.01, z + d - 0.12), P(x + 0.15, 0.01, z + d - 0.12)], null, inner, Math.max(1, 0.03 * k));
    };
    rug(s.x - 2, s.z - 2.3, 1.7, 1.9, '#A63C32', '#F1E2BE');
    rug(s.x + 0.2, s.z - 2, 1.6, 1.6, '#2F7F78', '#F1E2BE');
  }

  /* A low wall of mud brick. */
  function drawWall(s) {
    const z1 = s.z + s.thick;
    const front = [P(s.x0, 0, s.z), P(s.x0, s.h, s.z), P(s.x1, s.h, s.z), P(s.x1, 0, s.z)];
    if (front.some((p) => !p)) return;
    const k = front[0].k;
    shadow((s.x0 + s.x1) / 2, 0, s.z + s.thick / 2, (s.x1 - s.x0) / 2 + 0.1, s.thick);
    if (cam[0] < s.x0) shape([P(s.x0, 0, s.z), P(s.x0, s.h, s.z), P(s.x0, s.h, z1), P(s.x0, 0, z1)], '#C4A678');
    if (cam[0] > s.x1) shape([P(s.x1, 0, s.z), P(s.x1, s.h, s.z), P(s.x1, s.h, z1), P(s.x1, 0, z1)], '#C4A678');
    if (cam[1] > s.h) shape([P(s.x0, s.h, s.z), P(s.x1, s.h, s.z), P(s.x1, s.h, z1), P(s.x0, s.h, z1)], '#EBD9B3');
    shape(front, '#D8BC91');
    if (k < 22) return;
    // The courses of brick.
    ctx.strokeStyle = 'rgba(74,52,36,.2)';
    ctx.lineWidth = Math.max(1, 0.012 * k);
    const courses = Math.round(s.h / 0.2);
    ctx.beginPath();
    for (let i = 1; i < courses; i++) {
      const y = lerp(front[0].y, front[1].y, i / courses);
      ctx.moveTo(front[0].x, y);
      ctx.lineTo(front[3].x, y);
    }
    const bricks = Math.round((s.x1 - s.x0) / 0.4);
    for (let i = 0; i < courses; i++) {
      for (let j = 1; j < bricks + (i % 2); j++) {
        const x = lerp(front[0].x, front[3].x, (j - (i % 2) * 0.5) / bricks);
        ctx.moveTo(x, lerp(front[0].y, front[1].y, i / courses));
        ctx.lineTo(x, lerp(front[0].y, front[1].y, (i + 1) / courses));
      }
    }
    ctx.stroke();
  }

  /* The round straw target on its wooden stand: rings of white, black, blue and red, and gold in the middle. */
  function drawRing(t) {
    const c = P(t.x, t.y, t.z);
    if (!c) return;
    const k = c.k;
    const R = t.r * k;
    shadow(t.x, 0, t.z + 0.3, t.r * 1.15, 0.55);
    ctx.lineCap = 'round';
    const top = P(t.x, t.y + t.r * 0.5, t.z + 0.14);
    const wide = Math.max(1.5, 0.07 * k);
    line(top, P(t.x, 0, t.z + 0.9), WOOD_DARK, wide);
    line(top, P(t.x - t.r * 0.85, 0, t.z - 0.02), WOOD, wide);
    line(top, P(t.x + t.r * 0.85, 0, t.z - 0.02), WOOD, wide);
    disc(c, R * 1.05, '#B8953F');
    disc(c, R * 1.03, STRAW);
    FACE.forEach((color, i) => disc(c, R * (1 - i * C.GOLD), color));
    if (R > 14) {
      ctx.strokeStyle = 'rgba(51,48,46,.35)';
      ctx.lineWidth = 1;
      for (let i = 2; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, R * (1 - i * C.GOLD), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  /* The sandbag on its frame. It swings as the engine says; a hit makes it
     shake and rock back for a moment, and the arrows in it ride along. */
  function drawBag(t, index) {
    const at = E.bagAt(t, clock);
    const since = jolts[index] === undefined ? 9 : clock - jolts[index];
    const shake = since < 2.5 ? 0.09 * Math.exp(-3 * since) * Math.sin(24 * since) : 0;
    const back = since < 2.5 ? 0.22 * Math.exp(-2.5 * since) * Math.sin(8 * since) : 0;
    const angle = at.angle + shake;
    const ax = Math.sin(angle);
    const ay = -Math.cos(angle);
    const centre = [t.x + t.rope * ax, t.top + t.rope * ay, t.z + back];
    const c = Pv(centre);
    const foot = P(t.x, 0, t.z);
    if (!c || !foot) return;
    const k = foot.k;
    const beam = t.top + 0.14;
    shadow(t.x, 0, t.z, t.span + 0.25, 0.4);
    ctx.lineCap = 'round';
    const wide = Math.max(2, 0.1 * k);
    for (const side of [-1, 1]) {
      line(P(t.x + side * t.span, 0, t.z), P(t.x + side * t.span, beam, t.z), WOOD, wide);
      line(P(t.x + side * t.span, beam - 0.55, t.z), P(t.x + side * (t.span - 0.5), beam, t.z), WOOD_DARK, wide * 0.6);
    }
    line(P(t.x - t.span - 0.14, beam, t.z), P(t.x + t.span + 0.14, beam, t.z), WOOD, wide);
    const neck = add(centre, [ax, ay, 0], -(t.half + t.r * 0.6));
    line(P(t.x, t.top + 0.07, t.z), Pv(neck), '#B9A77E', Math.max(1.2, 0.025 * k));
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(-angle);
    const w = t.r * c.k;
    const h = (t.half + t.r * 0.55) * c.k;
    box(-w, -h, w * 2, h * 2, w * 0.6);
    ctx.fillStyle = BURLAP;
    ctx.fill();
    // Its shaded side, its seams, the tied neck.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(74,52,36,.14)';
    ctx.fillRect(-w, -h, w * 0.7, h * 2);
    ctx.restore();
    box(-w, -h, w * 2, h * 2, w * 0.6);
    ctx.strokeStyle = BURLAP_DARK;
    ctx.lineWidth = Math.max(1, 0.025 * c.k);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w * 0.9, -h * 0.45);
    ctx.quadraticCurveTo(0, -h * 0.34, w * 0.9, -h * 0.45);
    ctx.moveTo(-w * 0.9, h * 0.5);
    ctx.quadraticCurveTo(0, h * 0.62, w * 0.9, h * 0.5);
    ctx.stroke();
    ctx.fillStyle = BURLAP_DARK;
    ctx.fillRect(-w * 0.42, -h - w * 0.2, w * 0.84, w * 0.32);
    ctx.restore();
    for (const a of stuck) {
      if (a.host !== 'bag' || a.target !== index) continue;
      drawArrow([centre[0] + a.on.along * ax + a.on.across * -ay, centre[1] + a.on.along * ay + a.on.across * ax, centre[2] + a.on.deep], a.dir, true);
    }
  }

  /* A clay jar on the wall; a broken one leaves its foot and a few shards. */
  function drawPot(t, index) {
    const p = P(t.x, t.y, t.z);
    if (!p) return;
    const w = C.POT.rx * p.k;
    const h = C.POT.ry * 2 * p.k;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (broken[index]) {
      ctx.fillStyle = CLAY_DARK;
      for (const [x, y, s] of [[-1.25, -0.02, 0.2], [1.2, -0.03, 0.16], [0.75, -0.02, 0.12]]) {
        ctx.beginPath();
        ctx.moveTo(x * w, y * h);
        ctx.lineTo((x + s) * w, y * h);
        ctx.lineTo((x + s * 0.4) * w, (y - s * 0.5) * h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(-w * 1.3, h * 0.1);
      for (const [x, y] of [[-1.3, -0.3], [-0.8, -0.44], [-0.5, -0.27], [-0.15, -0.45], [0.2, -0.28], [0.55, -0.41], [0.85, -0.27], [1.3, -0.36], [1.3, 0.1]]) ctx.lineTo(x * w, y * h);
      ctx.closePath();
      ctx.clip();
    }
    ctx.beginPath();
    ctx.moveTo(-0.45 * w, 0);
    ctx.bezierCurveTo(-1.2 * w, -0.25 * h, -1.1 * w, -0.72 * h, -0.42 * w, -0.85 * h);
    ctx.lineTo(-0.5 * w, -0.97 * h);
    ctx.lineTo(0.5 * w, -0.97 * h);
    ctx.lineTo(0.42 * w, -0.85 * h);
    ctx.bezierCurveTo(1.1 * w, -0.72 * h, 1.2 * w, -0.25 * h, 0.45 * w, 0);
    ctx.closePath();
    ctx.fillStyle = CLAY;
    ctx.fill();
    ctx.strokeStyle = CLAY_DARK;
    ctx.lineWidth = Math.max(1, 0.02 * p.k);
    ctx.stroke();
    // A lighter band, a shine, and the rim.
    ctx.strokeStyle = '#E0A070';
    ctx.lineWidth = Math.max(1, 0.035 * p.k);
    ctx.beginPath();
    ctx.moveTo(-0.9 * w, -0.52 * h);
    ctx.quadraticCurveTo(0, -0.44 * h, 0.9 * w, -0.52 * h);
    ctx.stroke();
    if (!broken[index]) {
      ctx.fillStyle = CLAY_DARK;
      box(-0.58 * w, -1.02 * h, 1.16 * w, 0.08 * h, 0.03 * h);
      ctx.fill();
    }
    ctx.restore();
  }

  /* An arrow: a wooden shaft, a steel point, red and white feathers, from
     where its point is and the way it heads. One that has landed shows only
     what is left outside. Near the eye it is drawn part by part; far down
     the field, where it is a few pixels long, as plain strokes. */
  function drawArrow(tip, dir, landed, long) {
    const tail = add(tip, dir, -C.ARROW);
    const b = Pv(tail);
    if (!b) return;
    if (b.k * 4 > f) {
      // Within four meters of the eye, in the hand or on the string or just
      // off it: every part from where it is, each as thick as it is there.
      // long: how much of it shows, from the nock (an arrow that stands in
      // the quiver, or comes out of it); one in the ground shows what is outside.
      const shows = landed ? C.ARROW - C.SINK : long === undefined ? C.ARROW : long;
      const whole = shows >= C.ARROW;
      const front = whole ? add(tip, dir, -0.045) : add(tail, dir, shows);
      limb(tail, 0.0095, front, 0.0095, 'rgba(58,42,28,.8)');
      limb(tail, 0.007, front, 0.007, '#DDBB84');
      if (whole) {
        // The steel point.
        const base = Pv(front);
        const end = Pv(tip);
        if (base && end) {
          const far = Math.hypot(end.x - base.x, end.y - base.y) || 1;
          const nx = (-(end.y - base.y) / far) * 0.013 * base.k;
          const ny = ((end.x - base.x) / far) * 0.013 * base.k;
          shape([{ x: base.x + nx, y: base.y + ny }, end, { x: base.x - nx, y: base.y - ny }], '#8F979E', '#4E555B', 1);
        }
      }
      // Three feathers round the shaft, a white one and two red: those turned away from the eye first.
      const side = unit(Math.abs(dir[1]) > 0.98 ? [1, 0, 0] : [dir[2], 0, -dir[0]]);
      const over = [dir[1] * side[2] - dir[2] * side[1], dir[2] * side[0] - dir[0] * side[2], dir[0] * side[1] - dir[1] * side[0]];
      const toEye = [cam[0] - tail[0], cam[1] - tail[1], cam[2] - tail[2]];
      [[90, '#F6F2E6', '#B9AE98'], [210, '#D5483A', '#9C2A22'], [330, '#D5483A', '#9C2A22']]
        .map(([angle, fill, rim]) => {
          const out = [0, 1, 2].map((i) => over[i] * Math.cos(angle * RAD) + side[i] * Math.sin(angle * RAD));
          return { out, fill, rim, near: out[0] * toEye[0] + out[1] * toEye[1] + out[2] * toEye[2] };
        })
        .sort((p, q) => p.near - q.near)
        .forEach(({ out, fill, rim }) => {
          shape([add(tail, dir, 0.028), add(add(tail, dir, 0.042), out, 0.019), add(add(tail, dir, 0.092), out, 0.019), add(tail, dir, 0.118)].map(Pv), fill, rim, 1);
        });
      ball(tail, 0.0075, '#3A2A1C');
      return;
    }
    const head = landed ? add(tip, dir, -C.SINK) : tip;
    const a = Pv(head);
    if (!a) return;
    const k = (a.k + b.k) / 2;
    const wide = Math.max(1.6, 0.014 * k);
    const at = (t) => ({ x: lerp(b.x, a.x, t), y: lerp(b.y, a.y, t) });
    ctx.lineCap = 'round';
    line(b, a, 'rgba(58,42,28,.75)', wide + 1.4);
    line(b, a, '#DDBB84', wide);
    if (!landed) {
      ctx.lineCap = 'butt';
      line(at(0.9), a, '#8F979E', wide * 1.9);
      ctx.lineCap = 'round';
    }
    line(at(0.04), at(0.24), '#D5483A', wide * 2.5);
    line(at(0.06), at(0.22), '#F6F2E6', wide * 0.9);
    if (landed) {
      // Seen from the bow an arrow in a target is little more than its nock:
      // a pale dot with a dark rim, so that where it hit shows on any color.
      const r = Math.max(3, wide * 1.5);
      disc(b, r + 1.3, '#3A2A1C');
      disc(b, r, '#FFF7E0');
      disc(b, r * 0.42, '#D5483A');
    } else disc(b, wide * 0.9, '#3A2A1C');
  }

  function drawBits() {
    for (const bit of bits) {
      const p = Pv(bit.p);
      if (!p) continue;
      ctx.globalAlpha = clamp(1 - bit.age / bit.life, 0, 1);
      const r = Math.max(1.2, bit.r * p.k);
      ctx.fillStyle = bit.color;
      ctx.beginPath();
      if (bit.shard) {
        const turn = bit.age * bit.spin;
        for (let i = 0; i < 3; i++) ctx.lineTo(p.x + Math.cos(turn + i * 2.1) * r * 1.6, p.y + Math.sin(turn + i * 2.1) * r * 1.6);
      } else ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* The dotted path: where the arrow would fly with this moment's aim and
     draw, from the arrow's point to a mark where it would land. While the
     string rests it is drawn for the draw of the last arrow, paler. A level
     shows all of it, its first third, or none. */
  function drawPath() {
    shown = null;
    if (!level.path || busy || arrow || reload < 1) return;
    const drawing = (pullId !== null && !pullWaits) || keyPull;
    if (drawing && pull < C.LET_DOWN) return;
    const flight = E.fly(level, { stand, yaw, pitch, pull: drawing ? pull : lastPull, time: clock, broken });
    shown = flight;
    ctx.globalAlpha = drawing ? 1 : 0.6;
    const until = flight.duration * level.path;
    // The dots begin at the arrow's point.
    for (let t = 0.012; t < until; t += 0.04) {
      const p = Pv(flight.at(t));
      if (!p) continue;
      const r = clamp(0.03 * p.k, 1.7, 4.5);
      disc(p, r + 1, 'rgba(58,42,28,.5)');
      disc(p, r, '#FFFFFF');
    }
    if (level.path === 1) {
      const p = Pv(flight.end);
      if (p) {
        const r = clamp(0.1 * p.k, 5, 13);
        ctx.lineWidth = Math.max(2, r * 0.36);
        ctx.strokeStyle = 'rgba(58,42,28,.6)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = flight.target >= 0 ? '#FFD54A' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* A small sight: the place the arrow is pointed at, AIM_DEPTH ahead of
     him. It is a place on the arrow's own line, so the arrow on the screen
     points at it. */
  function drawSight() {
    if (busy) return;
    const at = Pv(E.aimPlace(level, stand, yaw, pitch));
    if (!at) return;
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = 'rgba(58,42,28,.45)';
    ctx.beginPath();
    ctx.arc(at.x, at.y, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(at.x, at.y, 7, 0, Math.PI * 2);
    ctx.stroke();
    disc(at, 1.6, '#FFFFFF');
  }

  /* Drawing a body from points in the field. A limb is a round bar between
     two of them, as thick at each end as it is there on the screen. */
  function limb(a, ra, b, rb, fill, edge, wide) {
    const p = Pv(a);
    const q = Pv(b);
    if (!p || !q) return;
    const r0 = Math.max(0.5, ra * p.k);
    const r1 = Math.max(0.5, rb * q.k);
    const far = Math.hypot(q.x - p.x, q.y - p.y);
    ctx.beginPath();
    if (far <= Math.abs(r0 - r1) + 0.01) {
      // One end hides the other: we look along it.
      const big = r0 >= r1 ? p : q;
      ctx.arc(big.x, big.y, Math.max(r0, r1), 0, Math.PI * 2);
    } else {
      const way = Math.atan2(q.y - p.y, q.x - p.x);
      const open = Math.acos(clamp((r0 - r1) / far, -1, 1));
      ctx.arc(p.x, p.y, r0, way + open, way - open + Math.PI * 2);
      ctx.arc(q.x, q.y, r1, way - open, way + open);
      ctx.closePath();
    }
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (edge) {
      ctx.strokeStyle = edge;
      ctx.lineWidth = wide || 1.5;
      ctx.stroke();
    }
  }

  /* A ball: where it is on the screen and how big. */
  function ball(p, r, fill, edge, wide) {
    const at = Pv(p);
    if (!at) return null;
    ctx.beginPath();
    ctx.arc(at.x, at.y, Math.max(0.5, r * at.k), 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (edge) {
      ctx.strokeStyle = edge;
      ctx.lineWidth = wide || 1.5;
      ctx.stroke();
    }
    return at;
  }

  /* The outline of a round body: the smallest shape that holds a set of
     places on the screen. gather adds the rim of a ball, or a ring of
     places about a middle, to the set. */
  function hull(points) {
    const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const turn = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const half = (list) => {
      const out = [];
      for (const p of list) {
        while (out.length >= 2 && turn(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
        out.push(p);
      }
      out.pop();
      return out;
    };
    return half(sorted).concat(half(sorted.reverse()));
  }
  function gatherBall(into, p, r) {
    const at = Pv(p);
    if (!at) return;
    for (let i = 0; i < 12; i++) into.push({ x: at.x + Math.cos(i * 0.5236) * r * at.k, y: at.y + Math.sin(i * 0.5236) * r * at.k });
  }
  function gatherRing(into, middle, e1, a, e2, b) {
    for (let i = 0; i < 12; i++) {
      const at = Pv(add(add(middle, e1, a * Math.cos(i * 0.5236)), e2, b * Math.sin(i * 0.5236)));
      if (at) into.push(at);
    }
  }
  function fillHull(points, fill, edge, wide, shade) {
    if (points.length < 3) return;
    const rim = hull(points);
    ctx.beginPath();
    rim.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (shade) {
      // The side turned from the sun, which is low on the right, is darker.
      const left = Math.min(...rim.map((p) => p.x));
      const right = Math.max(...rim.map((p) => p.x));
      const fall = ctx.createLinearGradient(left, 0, right, 0);
      fall.addColorStop(0, shade);
      fall.addColorStop(0.62, 'rgba(0,0,0,0)');
      ctx.fillStyle = fall;
      ctx.fill();
    }
    if (edge) {
      ctx.strokeStyle = edge;
      ctx.lineWidth = wide || 1.5;
      ctx.stroke();
    }
  }

  /* Where the elbow is, between a shoulder and a hand, bent toward the pole. */
  function elbow(shoulder, hand, pole) {
    const to = [hand[0] - shoulder[0], hand[1] - shoulder[1], hand[2] - shoulder[2]];
    const far = clamp(Math.hypot(to[0], to[1], to[2]), 0.05, (TOP.upper + TOP.fore) * 0.999);
    const along = unit(to);
    const part = (TOP.upper * TOP.upper - TOP.fore * TOP.fore + far * far) / (2 * far);
    const dot = pole[0] * along[0] + pole[1] * along[1] + pole[2] * along[2];
    const out = unit([pole[0] - along[0] * dot, pole[1] - along[1] * dot, pole[2] - along[2] * dot]);
    return add(add(shoulder, along, part), out, Math.sqrt(Math.max(0, TOP.upper * TOP.upper - part * part)));
  }

  /* The boy as he is at this moment, in the field. His hands follow the
     bow: the left fist is on its handle, the right hand on the string at
     the arrow's nock. All of him above the waist (TOP) turns with the aim
     and leans back half as much as the arrow rises, about the point at his
     cheek; his hips and legs (LOW) stay. His right shoulder comes forward
     when the hand reaches to the string at rest and goes back as the string
     is drawn. After a shot the hand goes round the back of his neck to the
     quiver on his back, takes an arrow by its nock, and brings it round to
     the string. */
  const LEAN = 0.5;
  const curve = (a, b, c, t) => between(between(a, b, t), between(b, c, t), t);
  const sweep = (a, b, c, d, t) => curve(between(a, b, t), between(b, c, t), between(c, d, t), t);
  function pose(bow) {
    const { o, d, right, up } = bow;
    const back = E.direction(yaw, pitch * LEAN); // the way his shoulders point
    const tall = [back[1] * right[2] - back[2] * right[1], back[2] * right[0] - back[0] * right[2], back[0] * right[1] - back[1] * right[0]];
    const frame = (ahead, over) => (p) => [
      o[0] + right[0] * p[0] + over[0] * p[1] + ahead[0] * p[2],
      o[1] + right[1] * p[0] + over[1] * p[1] + ahead[1] * p[2],
      o[2] + right[2] * p[0] + over[2] * p[1] + ahead[2] * p[2],
    ];
    const top = frame(back, tall); // a place of his body
    const aimed = frame(d, up); // a place by the bow
    const turn = (p) => [right[0] * p[0] + tall[0] * p[1] + back[0] * p[2], right[1] * p[0] + tall[1] * p[1] + back[1] * p[2], right[2] * p[0] + tall[2] * p[1] + back[2] * p[2]];
    const low = (x, y, z) => [o[0] + LOW.spine[0] + x, o[1] - C.UP + y, o[2] + LOW.spine[1] + z];
    const onString = (ahead) => aimed([TOP.hand[0], TOP.hand[1], ahead + TOP.hand[2]]);
    const rest = onString(C.BOW.draw);
    const mouth = top(TOP.quiverMouth);
    const foot = top(TOP.quiverFoot);
    const axis = unit([mouth[0] - foot[0], mouth[1] - foot[1], mouth[2] - foot[2]]);
    const taking = add(mouth, axis, 0.12); // the nocks of the arrows that stand in the quiver
    let hand = onString(C.BOW.reach - E.bow(pull).nock);
    let carried = null; // the arrow in his hand on its way to the string: its nock, the way it points, how much of it is out of the quiver
    let toQuiver = 0; // how much of the way to the quiver the arm is
    let coming = -1; // how much of the way back to the string
    if (reload < 1) {
      if (reload < 0.3) {
        toQuiver = ease(reload / 0.3);
        hand = sweep(onString(handFrom), top(TOP.round[0]), top(TOP.round[1]), taking, toQuiver);
      } else if (reload < 0.45) {
        toQuiver = 1;
        hand = taking;
      } else {
        const part = ease((reload - 0.45) / 0.55);
        coming = part;
        hand = sweep(taking, top(TOP.back[0]), top(TOP.back[1]), rest, part);
        const out = clamp((part - 0.15) / 0.5, 0, 1);
        const toMouth = [mouth[0] - hand[0], mouth[1] - hand[1], mouth[2] - hand[2]];
        const inHand = aimed(TOP.hand);
        carried = {
          // In the middle of his hand at first, and on the string at the end.
          nock: [hand[0] - (inHand[0] - o[0]) * part, hand[1] - (inHand[1] - o[1]) * part, hand[2] - (inHand[2] - o[2]) * part],
          dir: unit(between(unit(toMouth), d, ease(clamp(part * 1.25, 0, 1)))),
          long: lerp(Math.min(C.ARROW, Math.hypot(toMouth[0], toMouth[1], toMouth[2])), C.ARROW, ease(out)),
        };
      }
    }
    // The shoulder follows the hand: forward with a hand that is far ahead, back with one at his cheek or behind.
    const gone = ease(clamp(((rest[0] - hand[0]) * d[0] + (rest[1] - hand[1]) * d[1] + (rest[2] - hand[2]) * d[2]) / C.BOW.draw, 0, 1));
    const shoulderR = top(between(TOP.shoulderReach, TOP.shoulderR, gone));
    const shoulderL = top(TOP.shoulderL);
    const fist = add(add(bow.grip, up, -0.05), d, -0.014);
    return {
      top, turn, low, mouth, foot, axis, hand, carried, fist, shoulderL, shoulderR,
      elbowL: elbow(shoulderL, fist, turn(TOP.poleL)),
      // His right elbow: back as he draws; up and back on the way to the quiver; out and down as he brings the arrow forward.
      elbowR: elbow(shoulderR, hand, turn(coming >= 0 ? between(TOP.poleQuiver, TOP.poleReach, coming) : between(between(TOP.poleReach, TOP.poleR, gone), TOP.poleQuiver, toQuiver))),
    };
  }

  /* Whether a place is hidden from the eye by a ball: the line from the eye to it goes through the ball first. */
  function behind(place, middle, r) {
    const to = [place[0] - cam[0], place[1] - cam[1], place[2] - cam[2]];
    const far = Math.hypot(to[0], to[1], to[2]) || 1;
    const along = ((middle[0] - cam[0]) * to[0] + (middle[1] - cam[1]) * to[1] + (middle[2] - cam[2]) * to[2]) / far;
    if (along <= 0 || along >= far) return false;
    return Math.hypot(cam[0] + (to[0] * along) / far - middle[0], cam[1] + (to[1] * along) / far - middle[1], cam[2] + (to[2] * along) / far - middle[2]) < r;
  }

  /* The bow: wood, thicker at the handle with its leather wrap, and two
     limbs that leave the handle straight and bend back to their tips. */
  function drawBow(bow) {
    const { grip, up } = bow;
    for (const [tip, sign] of [[bow.tipDown, -1], [bow.tipUp, 1]]) {
      const from = add(grip, up, sign > 0 ? 0.05 : -0.115);
      const bend = add(grip, up, sign * 0.3);
      for (const [color, more] of [[WOOD_DARK, 0.004], ['#A9743D', 0]]) {
        for (let i = 0; i < 10; i++) {
          limb(curve(from, bend, tip, i / 10), lerp(0.016, 0.009, i / 10) + more, curve(from, bend, tip, (i + 1) / 10), lerp(0.016, 0.009, (i + 1) / 10) + more, color);
        }
      }
      // The horn at the tip, where the string is tied.
      limb(curve(from, bend, tip, 0.96), 0.011, add(tip, unit([tip[0] - bend[0], tip[1] - bend[1], tip[2] - bend[2]]), 0.022), 0.007, '#3A2A1C');
    }
    limb(add(grip, up, -0.115), 0.02, add(grip, up, 0.05), 0.02, '#4A3424', '#2E2018', 1.2);
  }

  /* The string, from tip to tip through the nock: straight at rest, folded where the hand holds it when drawn. */
  function drawString(bow) {
    const a = Pv(bow.tipUp);
    const n = Pv(bow.nock);
    const b = Pv(bow.tipDown);
    if (!a || !n || !b) return;
    const wide = Math.max(1.3, 0.005 * n.k);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [color, more] of [['rgba(58,42,28,.6)', 1.4], ['#F7F0DA', 0]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = wide + more;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(n.x, n.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  /* The archer, the farthest of him first: his legs; the quiver on his
     back; his left arm, the arrow, the bow and the string, which are all
     beyond his body; his body; his head; and last his right arm, the
     nearest thing to the eye. Only the right hand changes its turn: on the
     string with the bow turned far to the left it is beyond his head, and
     his head hides it. */
  function drawArcher() {
    const bow = E.held(level, stand, yaw, pitch, pull);
    const { d, right, up } = bow;
    const now = pose(bow);
    const { top, low } = now;
    const neck = Pv(top(TOP.neck));
    if (!neck) return;
    const k = neck.k; // pixels to the meter where he stands
    const edge = Math.max(1.2, 0.006 * k);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // His shadow, his legs and his shoes: the leg toward the target first.
    shadow(bow.o[0] + LOW.spine[0], bow.o[1] - C.UP + 0.005, bow.o[2] + LOW.spine[1], 0.3, 0.3);
    for (const side of [1, -1]) {
      limb(low(-0.04, 0.036, side * LOW.apart), 0.036, low(0.095, 0.032, side * LOW.apart), 0.032, '#4A3424', '#2E2018', edge);
      limb(low(0.012, LOW.knee, side * 0.1), 0.05, low(0, LOW.ankle, side * LOW.apart), 0.04, TROUSERS, TROUSERS_DARK, edge);
      limb(low(0, LOW.hips - 0.03, side * 0.06), 0.07, low(0.012, LOW.knee, side * 0.1), 0.052, TROUSERS, TROUSERS_DARK, edge);
    }

    // The quiver on his back: its leather, its open mouth, the arrows that stand in it, their feathers by his right shoulder.
    const { mouth, axis } = now;
    limb(now.foot, 0.04, mouth, 0.046, '#8A5A30', '#5E3C1E', edge);
    limb(add(mouth, axis, -0.05), 0.047, add(mouth, axis, -0.03), 0.047, '#6B4423');
    ball(add(mouth, axis, 0.02), 0.033, '#3E2714');
    for (const [dx, dz, out] of [[-0.016, 0.012, 0.15], [0.016, 0.004, 0.17], [0, -0.016, 0.13]]) {
      const end = add(add(add(mouth, axis, out), right, dx), d, dz);
      drawArrow(add(end, axis, -C.ARROW), [-axis[0], -axis[1], -axis[2]], false, out - 0.01);
    }

    // His left arm, stretched toward the target; its fist is on the bow's handle.
    const { fist, shoulderL, shoulderR, elbowL, elbowR, hand } = now;
    limb(shoulderL, 0.046, elbowL, 0.038, NAVY, NAVY_DARK, edge);
    limb(elbowL, 0.038, between(elbowL, fist, 0.74), 0.031, NAVY, NAVY_DARK, edge);
    limb(between(elbowL, fist, 0.72), 0.033, between(elbowL, fist, 0.78), 0.033, CUFF, NAVY_DARK, edge);

    // The arrow on the string lies on that fist; the bow's handle stands in front of it. Then the string.
    if (reload >= 1) drawArrow(bow.point, d, false);
    drawBow(bow);
    ball(fist, 0.037, SKIN, SKIN_DARK, edge);
    limb(add(add(fist, right, 0.03), d, -0.012), 0.012, add(add(add(fist, right, 0.027), d, 0.03), up, 0.012), 0.011, SKIN, SKIN_DARK, edge * 0.8);
    for (const drop of [0.012, -0.006, -0.024]) line(Pv(add(add(add(fist, right, 0.012), d, 0.026), up, drop)), Pv(add(add(add(fist, right, 0.03), d, 0.012), up, drop - 0.004)), SKIN_DARK, edge * 0.8);
    drawString(bow);

    // His right hand, with the arrow it carries or its fingers on the string, and the forearm behind it.
    const rightHand = () => {
      if (now.carried) drawArrow(add(now.carried.nock, now.carried.dir, C.ARROW), now.carried.dir, false, now.carried.long);
      if (reload >= 1) {
        // Three fingers hooked on the string: one above the arrow's nock, two under it.
        for (const [rise, hook] of [[0.019, 0.02], [-0.014, -0.012], [-0.034, -0.032]]) {
          limb(add(add(hand, d, 0.018), up, rise), 0.0095, add(add(bow.nock, d, 0.007), up, hook), 0.0085, SKIN, SKIN_DARK, edge * 0.8);
        }
      }
      ball(hand, 0.034, SKIN, SKIN_DARK, edge);
      limb(elbowR, 0.039, between(elbowR, hand, 0.72), 0.026, NAVY, NAVY_DARK, edge);
      limb(between(elbowR, hand, 0.69), 0.028, between(elbowR, hand, 0.75), 0.028, CUFF, NAVY_DARK, edge);
    };
    const headPlace = top(TOP.head);
    const hidden = behind(hand, headPlace, TOP.headR);
    if (hidden) rightHand();

    // His body: the navy sweater, from the hips to the shoulders.
    const body = [];
    gatherRing(body, low(0, LOW.hips - 0.02, 0), [1, 0, 0], 0.08, [0, 0, 1], 0.108);
    gatherRing(body, low(0, LOW.waist, 0), [1, 0, 0], 0.074, [0, 0, 1], 0.098);
    const across = unit([shoulderL[0] - shoulderR[0], shoulderL[1] - shoulderR[1], shoulderL[2] - shoulderR[2]]);
    gatherRing(body, add(between(shoulderL, shoulderR, 0.5), now.turn([0, 1, 0]), -0.07), right, 0.082, across, 0.13);
    gatherBall(body, shoulderL, 0.05);
    gatherBall(body, shoulderR, 0.052);
    gatherBall(body, top(TOP.neck), 0.05);
    fillHull(body, NAVY, NAVY_DARK, edge, 'rgba(10,16,40,.42)');

    // The quiver's strap comes up his back and over his right shoulder, under the scarf.
    const strap = [add(mouth, axis, -0.07), top([-0.12, -0.06, -0.16]), top([-0.055, -0.058, -0.125])].map(Pv);
    if (strap.every(Boolean)) {
      for (const [color, wide] of [['#5E3C1E', 0.024 * k + 2], ['#8A5A30', 0.024 * k]]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = wide;
        ctx.beginPath();
        ctx.moveTo(strap[0].x, strap[0].y);
        ctx.quadraticCurveTo(strap[1].x, strap[1].y, strap[2].x, strap[2].y);
        ctx.stroke();
      }
    }

    // The end of the scarf hangs down his back from the nape of his neck.
    const hang = (angle, out, drop) => Pv(top([TOP.neck[0] + Math.cos(angle * RAD) * out, TOP.neck[1] + drop, TOP.neck[2] + Math.sin(angle * RAD) * out]));
    const tail = [hang(208, 0.07, 0), hang(256, 0.07, 0), hang(259, 0.125, -0.2), hang(214, 0.104, -0.21)];
    if (shape(tail, RED, RED_DARK, edge * 0.8)) {
      for (let i = 1; i < 5; i++) {
        const x = lerp(tail[3].x, tail[2].x, i / 5);
        const y = lerp(tail[3].y, tail[2].y, i / 5);
        line({ x, y }, { x: x + (tail[1].x - tail[2].x) * 0.13, y: y + (tail[1].y - tail[2].y) * 0.13 }, RED_DARK, edge * 0.7);
      }
    }

    // His neck, the scarf round it, his cheek, his black hair, his right ear. His face is toward the target: none of it shows.
    limb(top(TOP.neck), 0.04, top([TOP.jaw[0] - 0.01, TOP.jaw[1] - 0.01, TOP.jaw[2] - 0.03]), 0.04, SKIN, SKIN_DARK, edge);
    const wrap = [];
    gatherRing(wrap, top([TOP.neck[0], TOP.neck[1] + 0.04, TOP.neck[2]]), right, 0.062, now.turn([0, 0, 1]), 0.062);
    gatherRing(wrap, top([TOP.neck[0], TOP.neck[1] - 0.012, TOP.neck[2]]), right, 0.073, now.turn([0, 0, 1]), 0.073);
    fillHull(wrap, RED, RED_DARK, edge);
    const fold = [-0.045, 0, 0.045].map((side) => Pv(top([TOP.neck[0] + side * 0.75 - 0.01, TOP.neck[1] + 0.016 - Math.abs(side) * 0.1, TOP.neck[2] - 0.066 + Math.abs(side) * 0.5])));
    if (fold.every(Boolean)) {
      ctx.strokeStyle = RED_DARK;
      ctx.lineWidth = edge * 0.8;
      ctx.beginPath();
      ctx.moveTo(fold[0].x, fold[0].y);
      ctx.quadraticCurveTo(fold[1].x, fold[1].y + 0.012 * k, fold[2].x, fold[2].y);
      ctx.stroke();
    }
    ball(top(TOP.jaw), TOP.jawR, SKIN, SKIN_DARK, edge);
    const head = ball(headPlace, TOP.headR, HAIR);
    if (head) {
      const r = TOP.headR * head.k;
      headAt = { x: head.x, y: head.y, r };
      // A tuft at his crown, and the light on his hair.
      ctx.fillStyle = HAIR;
      ctx.beginPath();
      ctx.moveTo(head.x - r * 0.5, head.y - r * 0.82);
      ctx.quadraticCurveTo(head.x - r * 0.3, head.y - r * 1.2, head.x + r * 0.02, head.y - r * 1.2);
      ctx.quadraticCurveTo(head.x - r * 0.06, head.y - r * 1.08, head.x + r * 0.16, head.y - r * 0.96);
      ctx.quadraticCurveTo(head.x + r * 0.36, head.y - r * 1.16, head.x + r * 0.6, head.y - r * 1.06);
      ctx.quadraticCurveTo(head.x + r * 0.5, head.y - r * 0.92, head.x + r * 0.62, head.y - r * 0.74);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3D3944';
      ctx.lineWidth = Math.max(1.5, r * 0.08);
      ctx.beginPath();
      ctx.arc(head.x, head.y, r * 0.68, Math.PI * 1.62, Math.PI * 1.92);
      ctx.stroke();
    }
    const ear = ball(top(TOP.ear), 0.022, SKIN, SKIN_DARK, edge);
    if (ear) {
      ctx.strokeStyle = SKIN_DARK;
      ctx.lineWidth = edge * 0.8;
      ctx.beginPath();
      ctx.arc(ear.x, ear.y, 0.011 * ear.k, Math.PI * 0.6, Math.PI * 1.7);
      ctx.stroke();
    }

    // His right arm: the hand and the forearm, then the upper arm with the elbow.
    if (!hidden) rightHand();
    limb(shoulderR, 0.05, elbowR, 0.04, NAVY, NAVY_DARK, edge);
  }

  /* The grip: a ring round the arrow's nock, where the finger takes hold. It
     breathes until it has been pulled once; while the bow is drawn an arc
     round it fills with the draw. The finger pulls it back along the arrow's
     own line on the screen: away from the bow, toward the boy. */
  function nockOnScreen() {
    const bow = E.held(level, stand, yaw, pitch, pull);
    return Pv(reload >= 1 ? bow.nock : bow.rest);
  }

  /* Which way that is on the screen, as a step of length one: from the nock at rest to the nock at his cheek. */
  function pullWay() {
    const bow = E.held(level, stand, yaw, pitch, 0);
    const from = Pv(bow.rest);
    const to = Pv(bow.o);
    if (!from || !to) return [-0.86, 0.5];
    const far = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    return [(to.x - from.x) / far, (to.y - from.y) / far];
  }

  /* How far the string is drawn by a finger that took the grip at one place
     and is now at another: as far as it has gone back along that line. A
     finger that strays to the side of the line, straight down or straight
     to the left, still draws; one that goes forward does not. */
  function drawnBy(from, to) {
    const way = pullWay();
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    return clamp(Math.min(Math.hypot(dx, dy), 2 * Math.max(0, dx * way[0] + dy * way[1])) / span, 0, 1);
  }

  function drawGrip() {
    if (busy) return;
    const at = nockOnScreen();
    if (!at) return;
    const drawing = (pullId !== null && !pullWaits) || keyPull;
    const beat = used ? 1 : 1 + 0.13 * Math.sin(clock * 4.2);
    const r = grab * beat;
    ctx.globalAlpha = ready() ? 1 : 0.35;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(58,42,28,.4)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
    ctx.stroke();
    if (drawing) {
      ctx.strokeStyle = pull < C.LET_DOWN ? '#C9BFA8' : '#F3C22F';
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.arc(at.x, at.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, pull));
      ctx.stroke();
    } else if (!used && ready()) {
      // Two small arrowheads beyond the ring: pull this way.
      const way = pullWay();
      const out = r + 10 + 5 * Math.sin(clock * 4.2);
      for (const [color, wide] of [['rgba(58,42,28,.4)', 7], ['#FFFFFF', 4]]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = wide;
        ctx.beginPath();
        for (const step of [0, 12]) {
          const x = at.x + way[0] * (out + step);
          const y = at.y + way[1] * (out + step);
          ctx.moveTo(x - way[1] * 10, y + way[0] * 10);
          ctx.lineTo(x + way[0] * 9, y + way[1] * 9);
          ctx.lineTo(x + way[1] * 10, y - way[0] * 10);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* How far away a thing counts as being, to draw the farthest first: a tent
     and a wall by their middle, a jar just before the wall it stands on. */
  const depth = (s) => (s.kind === 'tent' ? s.z + s.d / 2 : s.kind === 'wall' ? s.z + s.thick / 2 : s.kind === 'pot' ? s.z - 0.3 : s.z);

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (backdrop) ctx.drawImage(backdrop, 0, 0, width, height);
    drawMounds();
    drawTufts();
    // Everything that stands in the field, the farthest first; an arrow that
    // stopped in one of them is drawn right after it.
    const things = [];
    for (const s of level.solids) {
      if (s.kind === 'palm') things.push([depth(s), drawPalm, s]);
      else if (s.kind === 'tent') things.push([depth(s), drawTent, s]);
      else if (s.kind === 'wall') things.push([depth(s), drawWall, s]);
    }
    level.targets.forEach((t, i) => things.push([depth(t), t.kind === 'ring' ? drawRing : t.kind === 'bag' ? drawBag : drawPot, t, i]));
    level.stands.forEach((place) => things.push([place.z + 0.5, drawRug, place]));
    for (const a of stuck) {
      if (a.host === 'bag') continue;
      const host = a.target >= 0 ? level.targets[a.target] : a.solid;
      things.push([host ? depth(host) - 0.01 : a.tip[2] - 0.35, (s) => drawArrow(s.tip, s.dir, true), a]);
    }
    if (arrow) {
      const tip = arrow.flight.at(arrow.t);
      things.push([tip[2] - 0.3, () => {
        // A faint streak behind it, so the eye can follow.
        const behind = Pv(arrow.flight.at(Math.max(0, arrow.t - 0.05)));
        const now = Pv(tip);
        ctx.lineCap = 'round';
        line(behind, now, 'rgba(255,255,255,.4)', 2);
        drawArrow(tip, arrow.flight.heading(arrow.t), false);
      }, null]);
    }
    things.sort((a, b) => b[0] - a[0]);
    for (const [, paint, what, index] of things) paint(what, index);
    drawBits();
    drawPath();
    drawArcher();
    drawSight();
    drawGrip();
    if (fade) {
      ctx.fillStyle = `rgba(254,249,239,${clamp(fade.t < FADE.out ? fade.t / FADE.out : 1 - (fade.t - FADE.out) / FADE.back, 0, 1).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  /* The sounds, soft and short: the string, the arrow through the air, a jar, the ground, wood. */
  const twang = (p) => {
    sound.tone(165 + 70 * p, 0, 0.18, 0.045 + 0.04 * p, 'triangle', 92);
    sound.rush(2400, 0, 0.05, 0.015 + 0.02 * p, 1.2);
  };
  const whoosh = (p) => sound.rush(850 + 500 * p, 0.03, 0.24, 0.016 + 0.014 * p, 0.8, 380);
  const crack = () => {
    sound.rush(3200, 0, 0.06, 0.06, 1.5, 1400);
    sound.tone(520, 0, 0.05, 0.035, 'square', 240);
    sound.rush(1500, 0.05, 0.14, 0.03, 1, 700);
  };
  const pat = () => sound.rush(420, 0, 0.09, 0.03, 0.8, 200);
  const tock = () => sound.tone(240, 0, 0.07, 0.07, 'triangle', 130);

  /* Bits that fly from where an arrow lands. */
  function puff(at, colors, count, force, shard) {
    for (let i = 0; i < count; i++) {
      bits.push({
        p: at.slice(),
        v: [(Math.random() - 0.5) * 2 * force, (0.4 + Math.random() * 1.4) * force, -(0.2 + Math.random()) * force],
        age: 0,
        life: 0.45 + Math.random() * 0.4,
        r: shard ? 0.035 + Math.random() * 0.03 : 0.018 + Math.random() * 0.02,
        color: colors[i % colors.length],
        shard,
        spin: (Math.random() - 0.5) * 16,
      });
    }
  }

  function setMarks() {
    [...$('marks').children].forEach((mark, i) => mark.classList.toggle('on', i < hits));
  }

  /* مَا شَاءَ اللَّهُ, in place of the instruction for a moment. */
  function showWord() {
    const mine = ++wordRun;
    wordEl.textContent = TEXT.gold.line;
    lineEl.classList.add('away');
    wordEl.hidden = true;
    void wordEl.offsetWidth; // so that it rises again
    wordEl.hidden = false;
    setTimeout(() => {
      if (mine !== wordRun) return;
      wordEl.hidden = true;
      lineEl.classList.remove('away');
    }, 1900);
    return sound.say(TEXT.gold.clip);
  }

  function hideWord() {
    wordRun += 1;
    wordEl.hidden = true;
    lineEl.classList.remove('away');
  }

  /* The buttons to the other places: at the left edge for a place to his
     left, at the right edge for one to his right, the farthest first. Those
     on the left stand at the horizon and upward, above the boy; those on
     the right stand under the band of the field where the targets are, and
     downward: so a button never covers him or a target. */
  function placePlaces() {
    const size = clamp(Math.min(width, height) * 0.11, 52, 72);
    for (const button of document.querySelectorAll('.arch-place')) {
      const rank = Number(button.dataset.rank) || 0;
      const top = button.dataset.side === 'left' ? horizon - 4 - size - rank * (size + 10) : horizon + 0.2 * f + 8 + rank * (size + 10);
      button.style.top = `${Math.round(top)}px`;
    }
  }

  function placeButtons() {
    const holder = $('places');
    holder.textContent = '';
    const here = level.stands[stand];
    const call = !level.clear.includes(stand); // they breathe while he stands where the target cannot be hit from
    for (const side of ['left', 'right']) {
      level.stands
        .map((place, i) => i)
        .filter((i) => i !== stand && (level.stands[i].x < here.x ? 'left' : 'right') === side)
        .sort((a, b) => Math.abs(level.stands[b].x - here.x) - Math.abs(level.stands[a].x - here.x))
        .forEach((i, rank) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = call ? 'arch-place call' : 'arch-place';
          button.dataset.side = side;
          button.dataset.place = String(i);
          button.dataset.rank = String(rank);
          button.setAttribute('aria-label', TEXT[side]);
          button.innerHTML = level.stands[i].up ? FEET_UP : FEET;
          button.addEventListener('click', () => goStand(i));
          holder.append(button);
        });
    }
    placePlaces();
  }

  function dropFingers() {
    aimId = null;
    pullId = null;
    pullWaits = false;
    keyPull = false;
    pull = 0;
  }

  /* To another place: the picture changes behind a quick fade. An arrow in the air lands first. */
  function goStand(to) {
    if (view !== 'field' || busy || fade || to === stand || !level.stands[to]) return;
    if (arrow) {
      wantStand = to;
      return;
    }
    dropFingers();
    fade = {
      t: 0,
      swap() {
        stand = to;
        moved = true;
        reload = 1;
        cam = E.camera(level, stand);
        placeButtons();
      },
    };
  }

  /* A level opens: the field as it begins, the instruction shown and said. */
  function openLevel(index, soft) {
    run += 1;
    const set = () => {
      levelIndex = index;
      level = LEVELS[index];
      stand = level.start;
      yaw = level.aim[0] * RAD;
      pitch = level.aim[1] * RAD;
      hits = 0;
      broken = level.targets.map(() => false);
      stuck = [];
      arrow = null;
      reload = 1;
      clock = 0;
      bits = [];
      jolts = {};
      moved = false;
      wantStand = -1;
      busy = false;
      dropFingers();
      cam = E.camera(level, stand);
      endBox.hidden = true;
      againButton.hidden = true;
      hideWord();
      setMarks();
      // A speaker mark in its place when the Egyptian recording is the one
      // said (the father's rule, 2026-11-25); a tap on it says the line again.
      if (typeof sound.caption === 'function') sound.caption(lineEl, TEXT[level.say].line, TEXT[level.say].clip, { mark: true });
      else lineEl.textContent = TEXT[level.say].line;
      $('level-number').textContent = arabic(index + 1);
      placeButtons();
      save(index);
      sound.say(TEXT[level.say].clip);
    };
    if (soft) {
      busy = true;
      fade = { t: 0, swap: set };
    } else set();
  }

  /* The string is let go: the arrow's whole flight is worked out at once, and the picture then follows it. */
  function release() {
    const flight = E.fly(level, { stand, yaw, pitch, pull, time: clock, broken });
    arrow = { flight, t: 0 };
    handFrom = C.BOW.reach - E.bow(pull).nock;
    lastPull = pull;
    twang(pull);
    whoosh(pull);
    pull = 0;
    reload = 0;
  }

  /* The arrow stops in the first thing it met, and stays there. */
  function land() {
    const { hit, target, solid, end, dir, gold, on } = arrow.flight;
    arrow = null;
    const t = target >= 0 ? level.targets[target] : null;
    let said = null;
    if (hit === 'pot') {
      broken[target] = true;
      stuck.push({ tip: [t.x, t.y + 0.05, t.z], dir: POT_LEAN, host: hit, target, solid: null, on: null });
      puff([t.x, t.y + C.POT.ry, t.z - C.POT.rx], [CLAY, CLAY_DARK, '#E0A070'], 12, 1.6, true);
      crack();
    } else if (hit !== 'far') {
      stuck.push({ tip: add(end, dir, C.SINK), dir, host: hit, target, solid, on: on || null });
      if (hit === 'ring' || hit === 'bag') {
        sound.thud();
        puff(end, [STRAW, '#EAD9A4', BURLAP], 7, 1.1, false);
        if (hit === 'bag') jolts[target] = clock;
      } else if (hit === 'ground') {
        pat();
        puff(end, ['#D8CC9A', '#C2B785'], 5, 0.8, false);
      } else if (hit === 'tent') pat();
      else tock();
    }
    if (stuck.length > MOST) stuck.shift();
    // busy here means the game is starting over behind its fade (the menu, with this arrow in the air): the hit counts for nothing.
    if (t && !busy) {
      hits += 1;
      setMarks();
      if (hit === 'pot') setTimeout(() => sound.chime(), 150);
      else sound.chime();
      if (gold) said = showWord();
      if (hits >= C.HITS) finishLevel(said);
    }
    if (wantStand >= 0 && !busy) goStand(wantStand);
    wantStand = -1;
  }

  /* Three hits: أحسنت, and the next level by itself. After the last level, الْحَمْدُ لِلَّهِ. */
  async function finishLevel(said) {
    busy = true;
    dropFingers();
    const mine = run;
    const lastLevel = levelIndex === LEVELS.length - 1;
    save(lastLevel ? 0 : levelIndex + 1);
    if (said) await Promise.race([said, wait(2600)]);
    await wait(said ? 400 : 800);
    if (mine !== run) return;
    hideWord();
    const words = lastLevel ? TEXT.end : TEXT.done;
    praiseEl.textContent = words.line;
    endBox.hidden = false;
    const began = performance.now();
    await Promise.race([sound.say(words.clip), wait(lastLevel ? 6000 : 4000)]);
    await wait(Math.max(0, 1900 - (performance.now() - began)));
    if (mine !== run) return;
    if (lastLevel) {
      againButton.hidden = false;
      return;
    }
    openLevel(levelIndex + 1, true);
  }

  function update(dt) {
    clock += dt;
    if (keyPull) pull = Math.min(1, pull + dt / KEY_DRAW);
    if (reload < 1) reload = Math.min(1, reload + dt / RELOAD);
    if (pullWaits && pullId !== null && ready()) {
      // The arrow is on the string now: the finger that waited on the grip pulls from where it is.
      pullWaits = false;
      pullFrom = pullAt.slice();
    }
    if (arrow) {
      arrow.t += dt;
      if (arrow.t >= arrow.flight.duration) land();
    }
    if (bits.length) {
      for (const bit of bits) {
        bit.age += dt;
        bit.v[1] -= C.G * dt;
        bit.p = add(bit.p, bit.v, dt);
      }
      bits = bits.filter((bit) => bit.age < bit.life && bit.p[1] > -0.05);
    }
    if (fade) {
      fade.t += dt;
      if (fade.swap && fade.t >= FADE.out) {
        const swap = fade.swap;
        fade.swap = null;
        swap();
      }
      if (fade.t >= FADE.out + FADE.back) fade = null;
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

  function halt() {
    running = false;
    cancelAnimationFrame(raf);
  }

  /* Fingers. One aims: the arrow points at the place under it, and stays
     there. One draws: it takes the grip at the arrow's nock and pulls it
     back, away from the bow, and letting go shoots. They may be the same
     finger in turn, or two at once. */
  function aimTo(x, y) {
    const aim = E.aimAt((x - mid) / f, (horizon - y) / f);
    yaw = aim.yaw;
    pitch = aim.pitch;
  }

  /* The grip is the ring round the nock, and the way the nock comes back from there. */
  function onGrip(x, y) {
    const at = nockOnScreen();
    if (!at) return false;
    const way = pullWay();
    const back = clamp((x - at.x) * way[0] + (y - at.y) * way[1], 0, span);
    return Math.hypot(x - at.x - way[0] * back, y - at.y - way[1] * back) <= grab * 1.6;
  }

  /* A touch on his own figure is not an aim: on his head, or low in the picture, where his body, his arms and the bow's handle are. */
  const lowest = () => horizon + 0.17 * f;
  const onField = (x, y) => y <= lowest() && !(headAt && Math.hypot(x - headAt.x, y - headAt.y) <= headAt.r * 1.25);

  root.addEventListener('pointerdown', (event) => {
    if (view !== 'field' || busy || fade || event.button > 0 || (event.target.closest && event.target.closest('button, a'))) return;
    const x = event.clientX;
    const y = event.clientY;
    if (onGrip(x, y)) {
      if (pullId !== null || keyPull) return;
      pullId = event.pointerId;
      pullFrom = [x, y];
      pullAt = [x, y];
      pullWaits = !ready();
      pull = 0;
      used = true;
    } else if (aimId === null && onField(x, y)) {
      aimId = event.pointerId;
      aimTo(x, y);
    } else return;
    event.preventDefault();
    try {
      root.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone.
    }
  });

  /* A finger's moves and its end are heard on the whole window, so that one
     that ends over a button, or after the capture was lost, still ends. */
  function fingerUp(id, shoots) {
    if (id === pullId) {
      pullId = null;
      if (shoots && !pullWaits && pull >= C.LET_DOWN && ready()) release();
      else pull = 0; // too short a draw, or the touch was taken away: the string is let down
      pullWaits = false;
    } else if (id === aimId) aimId = null;
  }

  addEventListener('pointermove', (event) => {
    if (event.pointerId !== pullId && event.pointerId !== aimId) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      // The mouse button was let go where the page could not see it.
      fingerUp(event.pointerId, false);
    } else if (event.pointerId === pullId) {
      pullAt = [event.clientX, event.clientY];
      if (!pullWaits) pull = drawnBy(pullFrom, pullAt);
    } else aimTo(event.clientX, event.clientY);
  });
  addEventListener('pointerup', (event) => fingerUp(event.pointerId, true));
  addEventListener('pointercancel', (event) => fingerUp(event.pointerId, false));
  root.addEventListener('contextmenu', (event) => event.preventDefault());

  /* On a computer: the arrow keys turn the bow; the space bar, held, draws it, and let go, shoots. */
  addEventListener('keydown', (event) => {
    if (view !== 'field' || busy || fade) return;
    const turn = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key];
    if (turn) {
      yaw = clamp(yaw + turn[0] * RAD, -C.YAW, C.YAW);
      pitch = clamp(pitch + turn[1] * RAD * 0.5, C.LOW, C.HIGH);
      event.preventDefault();
    } else if ((event.key === ' ' || event.key === 'Enter') && !(event.target.closest && event.target.closest('button, a'))) {
      event.preventDefault();
      // A bar pressed before the next arrow is on the string draws once it is, as a finger that waits on the grip does: the key's repeats ask again.
      if (keyPull || pullId !== null || !ready()) return;
      keyPull = true;
      used = true;
      pull = 0;
    }
  });
  addEventListener('keyup', (event) => {
    if ((event.key !== ' ' && event.key !== 'Enter') || !keyPull) return;
    keyPull = false;
    if (pull >= C.LET_DOWN && ready()) release();
    else pull = 0;
  });
  addEventListener('blur', dropFingers);

  /* The hadith opens every visit. Its words come from dua/archery.json
     (tools/make-archery-hadith.py); the button is there at once, and its tap
     is also what lets the page speak. While the hadith is said the words
     stay where they are and only the button hides. */
  fetch('dua/archery.json')
    .then((reply) => (reply.ok ? reply.json() : null))
    .then((data) => {
      const part = data && Array.isArray(data.parts) ? data.parts[0] : null;
      if (part && Array.isArray(part.words)) $('hadith').textContent = part.words.join(' ');
    })
    .catch(() => {});

  function startField() {
    delete root.dataset.step;
    show('field');
    layout();
    openLevel(saved, false);
    go();
  }

  $('begin').addEventListener('click', async () => {
    if (root.dataset.step === 'saying' || view !== 'hadith') return;
    root.dataset.step = 'saying';
    const began = performance.now();
    await Promise.race([sound.play(HADITH), wait(30000)]);
    await wait(Math.max(0, 900 - (performance.now() - began)));
    if (view === 'hadith') startField();
  });

  /* From the beginning: the button after the last level, and the same in the ☰ menu. */
  function restart() {
    save(0);
    if (view !== 'field') return;
    fade = null;
    openLevel(0, true);
  }
  againButton.addEventListener('click', restart);
  const menu = document.querySelector('.menu');
  if (menu) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'menu-item';
    button.textContent = TEXT.restart;
    button.addEventListener('click', () => {
      menu.hidden = true;
      restart();
    });
    const rule = document.createElement('hr');
    rule.className = 'menu-rule';
    menu.append(rule, button);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      halt();
      dropFingers();
    } else if (view === 'field') go();
  });
  addEventListener('resize', () => {
    layout();
    if (view === 'field') draw();
  });

  /* Start */
  load();
  show('hadith');
  sound.preloadPrompts(['pull', 'aim', 'wait', 'pots', 'place'].map((name) => TEXT[name].clip));
  sound.preload([HADITH, TEXT.gold.clip, TEXT.done.clip, TEXT.end.clip]);
  if (LOCAL) {
    /* For trying the game by hand and by script. */
    window.archeryGame = {
      engine: E,
      get state() {
        return {
          view, level: levelIndex, saved, stand, yaw, pitch, pull, lastPull, hits, busy, clock, reload, used, moved,
          ready: ready(), flying: !!arrow, fading: !!fade, broken: broken.slice(),
          stuck: stuck.map((a) => ({ tip: a.tip.slice(), host: a.host, target: a.target })),
        };
      },
      get preview() {
        return shown ? { end: shown.end.slice(), dir: shown.dir.slice(), hit: shown.hit, target: shown.target, duration: shown.duration, pull: shown.pull } : null;
      },
      /* Where things are on the screen, in CSS pixels. */
      screen: {
        nock: () => nockOnScreen(),
        aim: (toYaw, toPitch) => {
          const at = E.aimPoint(toYaw, toPitch);
          return { x: mid + at.u * f, y: horizon - at.v * f };
        },
        /* The arrow on the string and the sight, as the picture draws them: the nock, the point, and the place aimed at. */
        arrow: () => {
          const bow = E.held(level, stand, yaw, pitch, pull);
          return { nock: Pv(bow.nock), point: Pv(bow.point), grip: Pv(bow.grip), sight: Pv(E.aimPlace(level, stand, yaw, pitch)), tipUp: Pv(bow.tipUp), tipDown: Pv(bow.tipDown) };
        },
        /* His arms: how far each hand is from its shoulder, and how long an arm is. A hand farther than an arm would be a hand let go. */
        arms: () => {
          const now = pose(E.held(level, stand, yaw, pitch, pull));
          const far = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
          return {
            left: far(now.shoulderL, now.fist), right: far(now.shoulderR, now.hand), arm: TOP.upper + TOP.fore,
            hand: now.hand, fist: now.fist, head: now.top(TOP.head), elbow: now.elbowR, shoulderL: now.shoulderL, shoulderR: now.shoulderR, eye: cam.slice(),
          };
        },
        span: () => span,
        grab: () => grab,
        way: () => pullWay(),
        lowest: () => lowest(),
        head: () => headAt,
        point: (x, y, z) => P(x, y, z),
        size: () => ({ width, height, f, mid, horizon }),
      },
      begin: startField,
      open: (index) => {
        if (view !== 'field') startField();
        fade = null;
        openLevel(index, false);
      },
      aim: (toYaw, toPitch) => {
        yaw = clamp(toYaw, -C.YAW, C.YAW);
        pitch = clamp(toPitch, C.LOW, C.HIGH);
      },
      hold: (withPull) => {
        if (!ready()) return false;
        keyPull = true;
        pull = clamp(withPull, 0, 1);
        return true;
      },
      shoot: (withPull) => {
        if (!ready()) return false;
        keyPull = false;
        pull = clamp(withPull, 0, 1);
        release();
        return true;
      },
      stand: goStand,
      /* What an arrow let go at this moment would hit. */
      now: () => {
        const flight = E.fly(level, { stand, yaw, pitch, pull, time: clock, broken });
        return { hit: flight.hit, target: flight.target, end: flight.end };
      },
      solve: (target) => {
        const shot = E.findShot(level, { stand, target, time: clock, broken });
        return shot ? { yaw: shot.yaw, pitch: shot.pitch, pull: shot.pull, wait: shot.wait, hit: shot.flight.hit } : null;
      },
      step: update,
      draw,
      layout,
      go,
      stop: halt,
    };
  }
})();
