/* The roads seen from behind the car: the same drives as the roads seen from
   above, with the same rules, drawn another way. Everything that happens on
   the road is worked out in drive.js, loaded before this file; here is only
   the picture.
   The picture is made to be easy on the eye. The sky and the horizon, two
   fifths of the way down the screen, never move. The camera looks straight
   along the road from well behind the car and never turns or leans:
   changing lanes moves the car across the picture, not the picture. The
   child's car is always the same size, low in the picture, a still thing to
   rest the eye on. The road is a plain mid grey with thin, pale dashes set
   well apart that fade out near the camera, so the ground that passes
   fastest shows nothing passing. Buildings stand back from the road and
   come in out of a haze.
   Lengths are in lanes, as in drive.js: x across the road, y along it. This
   view shows a hundred lanes of road where the view from above shows a
   dozen, and a car that crossed that picture in a breath would crawl
   through this one. So every distance along the road is drawn STRETCH times
   longer, while cars, people, stars and buildings keep their true sizes:
   the car covers that much more ground in the picture, and whatever is on
   the road stands that much further apart. A place along the picture is p,
   in lanes of the picture: p = y * STRETCH. A point z lanes of the picture
   ahead of the camera is drawn f / z pixels to the lane.
   The three numbers to turn when the drive should feel faster or slower:
   STRETCH (the ground covered), BACK (how far behind the car the camera
   rides) and HAZE (how far the eye sees). */
const chase = (() => {
  const STRETCH = 2.5; // lanes of the picture for each lane the car drives
  const BACK = 12; // the camera is this many lanes behind the car
  const HAZE = { from: 46, to: 108 }; // lanes from the camera: where the haze begins, and where it has taken everything
  const SKY = { top: '#8FC3E8', low: '#E9F0EE' }; // the low color is the haze's too
  const ROADWAY = '#878B90';
  const CURB = '#B9A27E';
  const DASH = { every: 8, long: 2.2, half: 0.03 };
  const WALK_TO = 3.6; // the walk is wide: it reaches this far from the middle of the road
  const ROW_AT = 4.1; // the buildings stand back: their near edges are this far out
  const POST_AT = 3.25; // the lamps and palms on the walk
  const TALL = 0.85; // lanes of height for each unit of SIZE
  const LIGHT = { ahead: 4, at: 1.95, size: 0.8 }; // the lights stand past the stop line, where the stopped car still sees them
  /* A star stands just above the road, facing the camera. It is small, so
     that the stars of a line, seen end on, each show clear of the next from
     about thirty lanes ahead of the car. */
  const STAR = { r: 0.12, up: 0.05 };
  const ROOF = 0.7; // the tallest a car stands, in lanes
  /* The side street: half its width where it runs straight, the walk on each
     side of it, and how far past the stopped car's nose the place stands. */
  const SIDE = { half: 0.8, walk: 0.75, door: 3.4 };

  let mid = 0; // the middle of the screen, where the road runs to
  let horizon = 0;
  let f = 1000; // pixels to the lane, one lane ahead of the camera
  let h = 1.5; // the camera's height in lanes
  let nearZ = 8; // how far ahead of the camera the ground at the bottom of the screen is
  let gone = 4; // nearer the camera than this, a car's roof is below the bottom of the screen
  let camP = 0; // the camera's place along the picture
  let camX = 0; // and across the road: it moves over only with the car on the side street
  let side = null; // the side street, in lanes of the picture
  let goal = null; // the place at its end
  let backdrop = null;
  const fills = new Map();
  const sprites = new Map();
  const tones = new Map();

  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const mix = (a, b, k) => {
    const from = rgb(a);
    const to = rgb(b);
    return `rgb(${from.map((v, i) => Math.round(v + (to[i] - v) * k)).join(',')})`;
  };
  const haze = (z) => clamp((z - HAZE.from) / (HAZE.to - HAZE.from), 0, 1);
  const along = (y) => y * STRETCH;

  /* The sizes drive.js steers and counts by are set to fit this view: a lane
     at the car, the car's place on the screen, and how far ahead of the car
     and behind it things are in the picture, in the road's own lanes. */
  function layout() {
    horizon = Math.round(height * 0.4);
    mid = width / 2;
    lane = clamp(Math.min(width * 0.3, height * 0.27), 56, 230);
    su = lane;
    carY = height * 0.8;
    cx = mid - (trip ? trip.pan : 0) * lane;
    f = lane * BACK;
    h = (carY - horizon) / lane;
    nearZ = (f * h) / (height - horizon);
    gone = nearZ * Math.max(0.3, (h - ROOF) / h);
    far = (HAZE.to - BACK) / STRETCH;
    near = (BACK - gone) / STRETCH;
    backdrop = null;
    fills.clear();
    sprites.clear();
  }

  /* A finger on the picture points at a place on the road: further away the
     higher it is, so a finger on a far star points at that star's lane. At
     the car's own row and below it, it is the place straight under the
     finger, at the car's size. */
  let fingerY = 0;
  for (const type of ['pointerdown', 'pointermove']) {
    tripView.addEventListener(type, (event) => {
      if (event.pointerId === finger.id) fingerY = event.clientY;
    });
  }
  const pointed = (px) => camX + ((px - mid) * clamp((f * h) / Math.max(fingerY - horizon, 1), BACK, HAZE.from)) / f;

  /* A color of the ground, paler with distance until it is the haze. */
  function fill(color) {
    let made = fills.get(color);
    if (made) return made;
    made = ctx.createLinearGradient(0, horizon, 0, height);
    made.addColorStop(0, SKY.low);
    for (const k of [1, 0.75, 0.5, 0.25, 0]) {
      const z = HAZE.from + (HAZE.to - HAZE.from) * k;
      made.addColorStop(clamp((f * h) / z / (height - horizon), 0, 1), mix(color, SKY.low, k));
    }
    fills.set(color, made);
    return made;
  }

  /* A color of a car with the haze of its distance mixed in, in a few steps:
     a far car is pale, and never see-through. */
  function tone(color, k) {
    const step = Math.round(k * 16);
    if (!step) return color;
    const key = color + step;
    let made = tones.get(key);
    if (!made) {
      made = mix(color, SKY.low, step / 16);
      tones.set(key, made);
    }
    return made;
  }

  /* The sky, a few clouds and a far town on the horizon, painted once: none
     of it ever moves. By the river the far bank is low. */
  function paintBackdrop(which) {
    const copy = document.createElement('canvas');
    copy.width = Math.round(width * dpr);
    copy.height = Math.round((horizon + 1) * dpr);
    const c = copy.getContext('2d');
    c.scale(dpr, dpr);
    const sky = c.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, SKY.top);
    sky.addColorStop(0.7, mix(SKY.top, SKY.low, 0.75));
    sky.addColorStop(1, SKY.low);
    c.fillStyle = sky;
    c.fillRect(0, 0, width, horizon + 1);
    const random = rng(which.seed * 7);
    random();
    random();
    const unit = clamp(height / 96, 4, 9);
    c.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 4; i++) {
      const x = (i + 0.2 + random() * 0.6) * (width / 4);
      const y = horizon * (0.16 + random() * 0.34);
      for (const [dx, dy, r] of [[-2.6, 0.3, 2.2], [0, 0, 3], [2.8, 0.4, 2]]) {
        c.beginPath();
        c.ellipse(x + dx * unit, y + dy * unit, r * unit * 1.5, r * unit * 0.55, 0, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.fillStyle = mix(SKY.low, '#7C97AB', 0.34);
    for (let x = -10; x < width + 10;) {
      const bank = which.left.river && x < width * 0.42;
      const w = unit * (2 + random() * 4);
      const tall = bank ? unit * (0.3 + random() * 0.4) : unit * (0.8 + random() * 2.2);
      c.fillRect(x, horizon - tall, w + 1, tall + 1);
      const kind = bank ? 1 : random();
      if (kind < 0.14) {
        c.beginPath();
        c.arc(x + w / 2, horizon - tall, w * 0.36, Math.PI, 0);
        c.fill();
      } else if (kind < 0.24) {
        c.fillRect(x + w * 0.4, horizon - tall - unit * 2.6, unit * 0.45, unit * 2.6);
      }
      x += w;
    }
    return copy;
  }

  /* The side street, in lanes of the picture: where it leaves the right
     lane, where its near curb parts from the road's, where the car stops,
     and where the place stands. */
  function sideStreet() {
    const from = along(trip.slip.from);
    const stop = along(trip.road.length);
    let gore = from;
    while (gore < stop && sideX(gore) - sideHalf(gore) - 0.12 < 1.5) gore += 0.25;
    return { from, gore, stop, door: stop + CAR.l / 2 + SIDE.door };
  }

  /* The middle of the side street across the road at p, and half its width:
     it leaves the road as wide as the lane and opens out as it goes. */
  const sideX = (p) => 1 + (trip.slip.x - 1) * slipPart(p / STRETCH);
  const sideHalf = (p) => 0.5 + (SIDE.half - 0.5) * Math.min(1, slipPart(p / STRETCH) * 3);

  /* The place stands across the end of the side street, facing back down it,
     as big as fits between the top of the screen and the car. */
  function goalPlace(which) {
    const s = f / (BACK + CAR.l / 2 + SIDE.door);
    const name = which.goal;
    const tall = Math.min(SIZE[name] * TALL, (horizon + h * s - height * 0.1) / s, (width - 16) / s / SPRITES[name]);
    return { p: side.door, x: trip.slip.x, tall, wide: tall * SPRITES[name], closest: s };
  }

  /* A strip of ground from x0 to x1 lanes across, from the bottom of the
     screen to the point the road runs to. */
  function strip(x0, x1, color) {
    const s = f / nearZ;
    ctx.fillStyle = fill(color);
    ctx.beginPath();
    ctx.moveTo(mid + (x0 - camX) * s, height);
    ctx.lineTo(mid + (x1 - camX) * s, height);
    ctx.lineTo(mid, horizon);
    ctx.closePath();
    ctx.fill();
  }

  /* A patch painted on the ground, from x0 to x1 across and from p0 to p1 along the picture. */
  function patch(x0, x1, p0, p1, color) {
    const z0 = Math.max(p0 - camP, nearZ * 0.8);
    const z1 = p1 - camP;
    if (z1 <= z0) return;
    const s0 = f / z0;
    const s1 = f / z1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(mid + (x0 - camX) * s0, horizon + h * s0);
    ctx.lineTo(mid + (x1 - camX) * s0, horizon + h * s0);
    ctx.lineTo(mid + (x1 - camX) * s1, horizon + h * s1);
    ctx.lineTo(mid + (x0 - camX) * s1, horizon + h * s1);
    ctx.closePath();
    ctx.fill();
  }

  /* A band on the ground that bends: from p0 to p1 along the picture,
     between the places across the road that left and right give for each. */
  function ribbon(p0, p1, left, right, color) {
    const from = Math.max(p0, camP + nearZ * 0.8);
    const to = Math.min(p1, camP + HAZE.to);
    if (to <= from) return;
    const at = [];
    for (let p = from; p < to; p += 1) at.push(p);
    at.push(to);
    ctx.fillStyle = fill(color);
    ctx.beginPath();
    for (const p of at) {
      const s = f / (p - camP);
      ctx.lineTo(mid + (left(p) - camX) * s, horizon + h * s);
    }
    for (const p of at.reverse()) {
      const s = f / (p - camP);
      ctx.lineTo(mid + (right(p) - camX) * s, horizon + h * s);
    }
    ctx.closePath();
    ctx.fill();
  }

  /* The ground: the river, the walks, the road, and the side street that
     leaves the right lane near the end. The side street's walk is laid
     before the road and the street itself after it, so that the road's curb
     opens where the street leaves. */
  function drawGround(which) {
    ctx.fillStyle = fill(which.ground);
    ctx.fillRect(0, horizon, width, height - horizon);
    if (which.left.river) {
      // The water lies to the left as far as the eye sees, behind a stone quay.
      strip(-400, -WALK_TO - 0.3, '#62B2DE');
      strip(-WALK_TO - 0.3, -WALK_TO, '#B89A74');
    }
    strip(-WALK_TO, -1.5, which.walk);
    strip(1.5, WALK_TO, which.walk);
    const end = side.door - 0.5;
    const shown = side.from - camP < HAZE.to;
    if (shown) {
      ribbon(side.from, side.door + 1.5, (p) => sideX(p) - sideHalf(p) - SIDE.walk, (p) => sideX(p) + sideHalf(p) + SIDE.walk, which.walk);
      patch(goal.x - goal.wide / 2 - 0.4, goal.x + goal.wide / 2 + 0.4, side.stop + 1, side.door + 1.5, fill(which.walk));
    }
    strip(-1.62, -1.5, CURB);
    strip(1.5, 1.62, CURB);
    strip(-1.5, 1.5, ROADWAY);
    if (!shown) return;
    ribbon(side.from, end, (p) => sideX(p) - sideHalf(p), (p) => sideX(p) + sideHalf(p), ROADWAY);
    ribbon(side.from, end, (p) => sideX(p) + sideHalf(p), (p) => sideX(p) + sideHalf(p) + 0.12, CURB);
    ribbon(side.gore, end, (p) => sideX(p) - sideHalf(p) - 0.12, (p) => sideX(p) - sideHalf(p), CURB);
    // The street ends at a curb before the door, with a yellow line to stop at.
    patch(goal.x - SIDE.half - 0.12, goal.x + SIDE.half + 0.12, end, end + 0.12, fill(CURB));
    patch(goal.x - SIDE.half, goal.x + SIDE.half, end - 0.4, end - 0.22, fill('#F2B84B'));
  }

  /* The paint on the road: the lane dashes, thin and pale, gone by the time
     they are near the camera; the stop lines; the stripes of the crossings. */
  function drawMarks() {
    const first = Math.floor((camP + BACK - 2) / DASH.every);
    for (let i = first; i * DASH.every - camP < HAZE.from + 30; i++) {
      const p = i * DASH.every;
      const z = p + DASH.long / 2 - camP;
      const alpha = 0.5 * clamp((z - BACK + 1) / 9, 0, 1) * (1 - haze(z));
      if (alpha < 0.02) continue;
      const color = `rgba(255,255,255,${alpha.toFixed(3)})`;
      for (const x of [-0.5, 0.5]) patch(x - DASH.half, x + DASH.half, p, p + DASH.long, color);
    }
    for (const stop of trip.stops) {
      const p = along(stop.y);
      const z = p - camP;
      if (z < nearZ * 0.5 || z > HAZE.to) continue;
      // Once the car is over them they fade, so nothing white races under the camera.
      const alpha = 0.7 * (1 - haze(z)) * clamp((z - BACK + 3.5) / 2.5, 0, 1);
      if (alpha < 0.02) continue;
      const color = `rgba(255,255,255,${alpha.toFixed(3)})`;
      patch(-1.5, 1.5, p - 0.3, p, color);
      if (stop.kind !== 'crossing') continue;
      for (let i = 0; i < 8; i++) patch(-1.44 + i * 0.37, -1.44 + i * 0.37 + 0.2, p + 0.35, p + 1.65, color);
    }
  }

  /* Each drawing is kept at several sizes, each half the one before, and the
     one just big enough is used, so that a far building does not shimmer.
     A copy in the haze's color is laid over a far one. */
  function sprite(name, top) {
    let set = sprites.get(name);
    if (set) return set;
    const image = images[name];
    if (!image || !image.naturalWidth) return null;
    set = { clear: [], hazed: [] };
    for (let tall = clamp(Math.ceil(top), 32, 1024); tall >= 16; tall = Math.floor(tall / 2)) {
      const copy = document.createElement('canvas');
      copy.height = tall;
      copy.width = Math.max(1, Math.round(tall * SPRITES[name]));
      copy.getContext('2d').drawImage(set.clear.length ? set.clear[set.clear.length - 1] : image, 0, 0, copy.width, copy.height);
      set.clear.push(copy);
    }
    sprites.set(name, set);
    return set;
  }

  function hazed(set, i) {
    if (set.hazed[i]) return set.hazed[i];
    const copy = document.createElement('canvas');
    copy.width = set.clear[i].width;
    copy.height = set.clear[i].height;
    const c = copy.getContext('2d');
    c.drawImage(set.clear[i], 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = SKY.low;
    c.fillRect(0, 0, copy.width, copy.height);
    set.hazed[i] = copy;
    return copy;
  }

  /* Before the first picture of a drive, every drawing of its street is
     copied at its sizes, the biggest as big as it is ever seen, so that none
     has to be made as it comes into view. A thing is at its biggest as its
     near edge leaves the screen; beside the side street the camera has
     moved over toward it by then. */
  function prepare(which) {
    const tops = new Map();
    const want = (name, tall, pixels) => tops.set(name, Math.max(tops.get(name) || 0, tall * dpr * pixels));
    for (const item of trip.scenery) {
      const place = spot(item);
      if (!place) continue;
      const [x, tall, closest] = place;
      const over = item.side > 0 && along(item.y) > side.from ? trip.slip.x : 0;
      const edge = Math.max(0.5, Math.abs(x) - (tall * SPRITES[item.name]) / 2 - over);
      want(item.name, tall, closest || Math.min(lane * 1.3, mid / edge));
    }
    for (const name of Object.keys(WALKERS)) want(name, WALKERS[name], lane * 1.3);
    want(which.goal, goal.tall, goal.closest);
    if (which.grandma) want('grandma', SIZE.grandma * TALL, lane);
    for (const [name, top] of tops) sprite(name, top);
  }

  /* Where a thing of the street stands across the road, and how tall: a
     lamp or a palm on the walk, a boat out on the water, or a building,
     tree or cart in the row set back from the road. Along the side street
     the row on the right stands back behind it, clear of the place at its
     end, and nothing stands in the street itself. */
  function spot(item) {
    const p = along(item.y);
    const beside = item.side > 0 && p > side.from && p < side.door + 3;
    if (item.walk) {
      if (beside && Math.abs(POST_AT - sideX(p)) < sideHalf(p) + 0.7) return null;
      if (beside && p > side.stop - 2 && Math.abs(POST_AT - goal.x) < goal.wide / 2 + 0.4) return null;
      return [item.side * POST_AT, ON_WALK[item.name].tall];
    }
    const tall = SIZE[item.name] * TALL;
    const wide = tall * SPRITES[item.name];
    if (item.water) return [-(WALK_TO + 1.2 + item.off * 2 + wide / 2), tall, mid / (WALK_TO + 2)];
    let edge = ROW_AT;
    if (beside) {
      edge = Math.max(edge, sideX(p) + sideHalf(p) + SIDE.walk + 0.15);
      if (p > side.stop - 4) edge = Math.max(edge, goal.x + goal.wide / 2 + 0.6);
    }
    return [item.side * (edge + wide / 2), tall];
  }

  /* A drawing that stands on the ground, x lanes across and at p along the
     picture, tall lanes high, on its shadow. */
  function stand(name, x, p, tall, flip, tip) {
    const z = p - camP;
    if (z < nearZ * 0.5 || z > HAZE.to) return;
    const s = f / z;
    const high = tall * s;
    const wide = high * SPRITES[name];
    const X = mid + (x - camX) * s;
    if (X + wide / 2 < 0 || X - wide / 2 > width) return;
    const set = sprite(name, tall * dpr * lane);
    if (!set) return;
    const Y = horizon + h * s;
    const k = haze(z);
    const alpha = clamp((HAZE.to - z) / 12, 0, 1);
    let i = 0;
    while (i < set.clear.length - 1 && set.clear[i + 1].height >= high * dpr) i += 1;
    ctx.globalAlpha = alpha * (1 - k);
    ctx.fillStyle = 'rgba(60,40,20,.18)';
    ctx.beginPath();
    ctx.ellipse(X, Y, wide * 0.45, Math.max(1, high * 0.03), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(X, Y);
    if (tip) ctx.rotate(tip);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(set.clear[i], -wide / 2, -high, wide, high);
    if (k > 0) {
      ctx.globalAlpha = alpha * k;
      ctx.drawImage(hazed(set, i), -wide / 2, -high, wide, high);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* A car from behind, standing on the road at X, Y, s pixels to the lane:
     its wheels, the cabin with the back window, the body with the tail
     lamps, which glow when it brakes, and the amber lamp of a turn signal
     on the side it is turning to. A pickup shows its load over the tailgate
     and its cab beyond; a taxi carries its sign on a dark roof. Every car is
     solid: k is the haze of its distance, mixed into its own colors. */
  function rearCar(car, X, Y, s, k = 0) {
    const w = car.w * s;
    const lean = (car.yaw || 0) * s * 0.12;
    const lit = car.braking || car.flash > 0;
    const ink = (color) => tone(color, k);
    const soft = (r, g, b, a) => `rgba(${r},${g},${b},${(a * (1 - k)).toFixed(3)})`; // shadows and glows thin out with the haze
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.strokeStyle = ink(INK);
    ctx.fillStyle = soft(40, 28, 16, 0.22);
    ctx.beginPath();
    ctx.ellipse(X, Y, w * 0.6, Math.max(1, s * 0.045), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink('#2B2622');
    for (const half of [-1, 1]) {
      rounded(X + half * w * 0.36 - w * 0.11, Y - s * 0.16, w * 0.22, s * 0.16, s * 0.03);
      ctx.fill();
    }
    if (car.kind === 'pickup') {
      ctx.fillStyle = ink(car.color);
      rounded(X - w * 0.4, Y - s * 0.6, w * 0.8, s * 0.3, s * 0.05);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink('#24323F');
      rounded(X - w * 0.3, Y - s * 0.56, w * 0.6, s * 0.12, s * 0.025);
      ctx.fill();
      ctx.fillStyle = ink('#E9A43C');
      for (const dx of [-0.19, 0.19]) {
        rounded(X + dx * w - w * 0.16, Y - s * 0.47, w * 0.32, s * 0.14, s * 0.012);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = ink(car.roof || car.color);
      ctx.beginPath();
      ctx.moveTo(X - w * 0.44, Y - s * 0.33);
      ctx.lineTo(X - w * 0.34 + lean, Y - s * 0.54);
      ctx.quadraticCurveTo(X + lean, Y - s * 0.6, X + w * 0.34 + lean, Y - s * 0.54);
      ctx.lineTo(X + w * 0.44, Y - s * 0.33);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink('#24323F');
      ctx.beginPath();
      ctx.moveTo(X - w * 0.36, Y - s * 0.36);
      ctx.lineTo(X - w * 0.29 + lean, Y - s * 0.515);
      ctx.lineTo(X + w * 0.29 + lean, Y - s * 0.515);
      ctx.lineTo(X + w * 0.36, Y - s * 0.36);
      ctx.closePath();
      ctx.fill();
      if (car.kind === 'taxi') {
        ctx.fillStyle = ink('#F2B84B');
        rounded(X - w * 0.13 + lean, Y - s * 0.625, w * 0.26, s * 0.06, s * 0.015);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.fillStyle = ink(car.color);
    rounded(X - w / 2, Y - s * 0.37, w, s * 0.3, s * 0.07);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = soft(30, 20, 12, 0.3);
    rounded(X - w * 0.46, Y - s * 0.135, w * 0.92, s * 0.055, s * 0.02);
    ctx.fill();
    ctx.fillStyle = ink('#EFE9DC');
    rounded(X - w * 0.14, Y - s * 0.24, w * 0.28, s * 0.07, s * 0.012);
    ctx.fill();
    for (const half of [-1, 1]) {
      ctx.fillStyle = ink(lit ? '#FF3B2F' : '#9E2B22');
      rounded(X + half * w * 0.34 - w * 0.12, Y - s * 0.335, w * 0.24, s * 0.075, s * 0.02);
      ctx.fill();
      if (!lit) continue;
      ctx.fillStyle = soft(255, 59, 47, 0.3);
      ctx.beginPath();
      ctx.arc(X + half * w * 0.34, Y - s * 0.3, w * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    if (car.signal && blinkOn()) {
      const x = X + car.signal * w * 0.41;
      ctx.fillStyle = soft(255, 181, 46, 0.42);
      ctx.beginPath();
      ctx.arc(x, Y - s * 0.3, w * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink('#FFB52E');
      ctx.beginPath();
      ctx.arc(x, Y - s * 0.3, w * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  /* A star stands in its lane just above the road, bobbing a little, over
     its shadow. One the car has passed without taking fades away behind it,
     before it can grow big at the bottom of the screen. */
  function standStar(star, p) {
    const z = p - camP;
    const s = f / z;
    const alpha = (1 - haze(z)) * clamp((z - BACK + 2.4) / 1.5, 0, 1);
    if (alpha < 0.02) return;
    const X = mid + (star.x - camX) * s;
    const Y = horizon + h * s;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(40,28,16,.2)';
    ctx.beginPath();
    ctx.ellipse(X, Y, s * STAR.r * 0.8, Math.max(1, s * STAR.r * 0.14), 0, 0, Math.PI * 2);
    ctx.fill();
    drawStar(X, Y - s * (STAR.up + STAR.r + Math.sin(trip.t * 3 + star.y) * 0.012), s * STAR.r);
    ctx.globalAlpha = 1;
  }

  /* A star just taken rises over the car's roof, growing, and fades. */
  function popStar(star) {
    const gone = star.got / 0.25;
    ctx.globalAlpha = 1 - gone;
    drawStar(mid + (trip.x - camX) * lane, carY - lane * (0.72 + gone * 0.45), lane * STAR.r * (1.3 + gone * 1.5));
    ctx.globalAlpha = 1;
  }

  /* The grandmother comes out of the door at the middle of her house and
     walks to the car, to stand beside its nose and wave. */
  function grandmother() {
    const out = trip.out * trip.out * (3 - 2 * trip.out);
    const fit = goal.tall / (SIZE[trip.road.goal] * TALL);
    const from = { x: goal.x - 0.02 * goal.wide, p: goal.p - 0.15, tall: 0.8 * fit };
    const to = { x: goal.x + CAR.w / 2 + 0.6, p: side.stop + CAR.l / 2 + 0.9, tall: 1 };
    const between = (name) => from[name] + (to[name] - from[name]) * out;
    return { p: between('p'), x: between('x'), tall: SIZE.grandma * TALL * between('tall'), grandma: true };
  }

  function draw() {
    if (!trip) return;
    const which = trip.road;
    camP = along(trip.y) - BACK;
    camX = trip.pan;
    side = sideStreet();
    goal = goalPlace(which);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    if (!backdrop) {
      backdrop = paintBackdrop(which);
      prepare(which);
    }
    ctx.drawImage(backdrop, 0, 0, width, horizon + 1);
    drawGround(which);
    drawMarks();

    // Everything that stands on the ground, the furthest first.
    const things = [];
    const seen = (p) => p - camP > nearZ * 0.5 && p - camP < HAZE.to;
    for (const item of trip.scenery) {
      if (seen(along(item.y))) things.push({ p: along(item.y), item });
    }
    for (const stop of trip.stops) {
      const p = along(stop.y);
      if (stop.kind === 'light' && seen(p + LIGHT.ahead)) things.push({ p: p + LIGHT.ahead, light: stop });
      for (const walker of stop.people) things.push({ p: p + walker.at, walker });
    }
    for (const star of trip.pickups) {
      if (!star.got && along(star.y) - camP > nearZ * 0.6 && seen(along(star.y))) things.push({ p: along(star.y), star });
    }
    // Every car in the picture is drawn, and drawn solid.
    for (const car of trip.cars) {
      const z = along(car.y) - camP;
      if (z > gone * 0.9 && z < HAZE.to) things.push({ p: along(car.y), car });
    }
    things.push({ p: along(trip.y), me: true }, { p: goal.p, goal: true });
    if (which.grandma && trip.parked) things.push(grandmother());
    things.sort((a, b) => b.p - a.p);

    for (const thing of things) {
      const z = thing.p - camP;
      const s = f / z;
      if (thing.me) {
        const X = mid + (trip.x - camX) * lane;
        rearCar({ w: CAR.w, color: '#D4533A', roof: '#E8765E', yaw: trip.yaw, braking: trip.braking, signal: trip.signal }, X, carY, lane);
        if (trip.signal && blinkOn()) {
          // The arrowheads of drive.js are sized by the lane, which is wide here.
          ctx.save();
          ctx.translate(X + (CAR.w / 2 + 0.1) * lane, carY - lane * 0.28);
          ctx.scale(0.5, 0.5);
          drawTurnArrow(0, 0, trip.signal);
          ctx.restore();
        }
      } else if (thing.car) {
        rearCar(thing.car, mid + (thing.car.x - camX) * s, horizon + h * s, s, haze(z));
      } else if (thing.star) {
        standStar(thing.star, thing.p);
      } else if (thing.light) {
        ctx.globalAlpha = 1 - haze(z);
        for (const half of [-1, 1]) drawLight(mid + (half * LIGHT.at - camX) * s, horizon + h * s, (s / lane) * LIGHT.size, lamp(thing.light));
        ctx.globalAlpha = 1;
      } else if (thing.walker) {
        const walker = thing.walker;
        stand(walker.name, walker.x, thing.p, WALKERS[walker.name], walker.dir !== FACING[walker.name], Math.sin(walker.phase) * 0.05);
      } else if (thing.goal) {
        stand(which.goal, goal.x, goal.p, goal.tall);
      } else if (thing.grandma) {
        // She sways as she walks, then waves.
        stand('grandma', thing.x, thing.p, thing.tall, false, trip.out < 1 ? Math.sin(trip.t * 10) * 0.03 : Math.sin(trip.t * 8) * 0.08);
      } else {
        // A boat rocks a little on the water.
        const item = thing.item;
        const place = spot(item);
        if (place) stand(item.name, place[0], thing.p, place[1], item.flip, item.water ? Math.sin(trip.t * 1.3 + item.bob) * 0.03 : 0);
      }
    }
    for (const star of trip.pickups) {
      if (star.got > 0 && star.got <= 0.25) popStar(star);
    }
  }

  return { layout, draw, pointed, STRETCH, BACK, HAZE };
})();
buildRoads(); // the list of roads leaves these out until this file is here to draw them
if (LOCAL) window.driveGame.chase = chase;
