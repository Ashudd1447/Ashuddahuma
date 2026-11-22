/* الْوَاحَةُ: the ride to the oasis, the third of the driving games. An
   all-terrain bike, seen from above like the cars, is steered along a track
   that winds across the desert. Either pedal makes it go; letting go slows
   it; nothing is ever lost. Off the track the sand is soft and slow.
   Every ride is put together anew from stretches picked and shuffled: dunes
   to hop over, ramps to fly off, a canyon between rock walls, a mountain to
   climb and come down (the takbir going up, the tasbih coming down), a camel
   caravan to wait for, streams to splash through, and rocks to steer around.
   The time of day changes too: morning, noon or late afternoon. Animals are
   friends in the scenery, out of the bike's reach; an eagle glides over now
   and then. Stars lie on the track, and hang over every jump well inside
   the flight, which lasts a set distance however fast the bike took off.
   This file leans on drive.js, loaded before it: the canvas and its sizes,
   the steering, the pedals, the stars, the sounds and the arrival screen
   are all there. Lengths are in lanes, as on the roads: x across, y along
   the ride, which heads up the screen. */
const desert = (() => {
  const PACE = { crawl: 2.6, max: 9.5, gain: 6, drop: 4.5, climb: 6.2, descent: 11.5, slow: 5.5, soft: 0.62, air: 6.5 };
  const TURN_RATE = 4.2; // lanes a second across, at full lock
  const HALF = 1.7; // half the width of the firm track
  const BIKE = { w: 0.94, l: 1.3 };
  const ZIKR = { up: { text: 'اللَّهُ أَكْبَرُ', clip: 'allahu-akbar' }, down: { text: 'سُبْحَانَ اللَّهِ', clip: 'subhanallah' } };
  /* The stretches a ride is made of: how long each is, and how much the track winds in it. */
  const LENGTH = { start: 30, dunes: 92, jumps: 88, canyon: 104, mountain: 116, caravan: 70, wadi: 84, rocks: 88, grove: 46 };
  const SWAY = { start: 0, dunes: 1.5, jumps: 0.25, canyon: 2.1, mountain: 0.9, caravan: 0.4, wadi: 1.1, rocks: 0.3, grove: 0.3 };
  const TALL = { camel: 2, gazelle: 1.5, fox: 0.9, acacia: 3, boulder: 1.3, tent: 2, shrub: 1, palm: 3.2, man: 1.35 }; // heights in lanes
  const DAYS = [
    // Morning: pale sand, long shadows to the left.
    { sand: '#EFDDB2', track: '#E2C791', high: 'rgba(255,250,232,.55)', low: 'rgba(170,124,70,.22)', ripple: 'rgba(176,138,84,.4)', rock: '#C48A68', gully: '#CFAE80', wet: '#D3B98C', tint: 'rgba(255,246,220,.07)', lean: -0.5 },
    // Noon: bright sand, short shadows.
    { sand: '#EACB93', track: '#DCB777', high: 'rgba(255,244,214,.5)', low: 'rgba(160,112,58,.24)', ripple: 'rgba(169,128,72,.45)', rock: '#BC7F5E', gully: '#C9A26E', wet: '#CDAE7C', tint: '', lean: 0.15 },
    // Late afternoon: golden sand, long shadows to the right.
    { sand: '#E9BD84', track: '#D8A466', high: 'rgba(255,232,190,.5)', low: 'rgba(140,84,40,.26)', ripple: 'rgba(150,96,52,.45)', rock: '#B5714F', gully: '#C59760', wet: '#C9A470', tint: 'rgba(255,140,60,.1)', lean: 0.55 },
  ];
  const STEP = 0.5; // the track's middle is worked out once, every half lane
  const LEAD = 30; // and from this far before the start

  /* The screen, set by layout(): pixels to a lane, lanes in view ahead of the
     bike and behind it, half the view across, and how far from the middle of
     the track the bike may stray. */
  let u = 60;
  let ahead = 10;
  let back = 3;
  let half = 5;
  let roam = 3;
  const pics = new Map();

  const smooth = (k) => k * k * (3 - 2 * k);
  const mix = (a, b, k) => a + (b - a) * k;
  const at = (mid, y) => {
    const i = clamp((y + LEAD) / STEP, 0, mid.length - 1.001);
    const k = Math.floor(i);
    return mid[k] + (mid[k + 1] - mid[k]) * (i - k);
  };
  const center = (y) => at(trip.mid, y);
  const X = (x) => width / 2 + (x - trip.cam) * u;
  const Y = (y) => carY - (y - trip.y) * u;

  /* A ride is laid out once: the stretches in a new order, the track's
     middle, and what each stretch puts on the ground and beside it. */
  function make(which, random) {
    const side = () => (random() < 0.5 ? -1 : 1);
    // The generator's first numbers are always small ones: they are thrown away.
    random();
    random();
    const pool = ['dunes', 'jumps', 'canyon', 'caravan', 'wadi', 'rocks'];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const kinds = pool.slice(0, 4);
    kinds.splice(Math.floor(random() * 5), 0, 'mountain');
    const sections = [];
    let end = 0;
    for (const kind of ['start', ...kinds, 'grove']) {
      sections.push({ kind, from: end, to: end + LENGTH[kind] });
      end += LENGTH[kind];
    }
    const L = end - 10;

    // How much the track winds at y: each stretch's own, easing into the next over 30 lanes.
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
    const mid = new Float32Array(Math.ceil((end + LEAD + 40) / STEP) + 2);
    for (let i = 0; i < mid.length; i++) {
      const y = i * STEP - LEAD;
      mid[i] = sway(y) * (Math.sin(y * 0.047 + p1) + 0.7 * Math.sin(y * 0.022 + p2));
    }
    const c = (y) => at(mid, y);

    const t = {
      desert: true, road: which, L, t: 0, x: 0, y: 0, v: 0, yaw: 0, steer: 0, cam: 0, pan: 0, air: null, h: 0, squash: 0, scrape: 0,
      day: DAYS[Math.floor(random() * DAYS.length)], sections, mid,
      items: [], stars: [], ramps: [], rocks: [], streams: [], caravans: [], peaks: [], walls: [], crescents: [], kept: [],
      dust: [], eagle: null, eagleAt: 5 + random() * 6, held: false, wet: false,
      earned: 0, streak: 0, picked: -9, bumped: -9, zikr: '', parked: false, done: false, shown: -1,
    };
    const star = (x, y, air = false) => t.stars.push({ x, y, air, got: 0 });
    // A line of stars along the track, off to one side of its middle by `off`.
    const line = (y, count, gap = 1.7, off = 0) => {
      for (let i = 0; i < count; i++) star(c(y + i * gap) + off, y + i * gap);
    };
    // Something standing beside the track, beyond the bike's reach: never
    // inside the canyon, where a caravan walks, or in front of another thing.
    const put = (name, y, to, off = 0, flip = random() < 0.5) => {
      const top = y + TALL[name] + 0.4;
      if (t.walls.some((wall) => y > wall.from - 5 && y < wall.to + 1)) return;
      if (t.kept.some((zone) => y < zone.to && top > zone.from)) return;
      if (t.items.some((other) => other.side === to && other.y < top && other.y + TALL[other.name] + 0.4 > y)) return;
      t.items.push({ name, y, side: to, off, flip });
    };

    const build = {
      start() {
        line(11, 4);
      },
      // Low dunes lie across the track: the bike hops over each one.
      dunes(s) {
        put('camel', s.from + 18, -1, 0.4, false);
        put('camel', s.from + 61, 1, 0.5, true);
        line(s.from + 9, 4, 1.7, 0.8);
        [26, 48, 70].forEach((d, k) => {
          const y = s.from + d;
          t.ramps.push({ y, hop: true, reach: 3.8, peak: 0.55 });
          star(c(y + 1.3), y + 1.3, true);
          star(c(y + 2.5), y + 2.5, true);
          line(y + 8, 4, 1.7, k % 2 ? 0.8 : -0.8);
        });
        for (let y = s.from + 6; y < s.to - 6; y += 9 + random() * 8) t.crescents.push({ y, side: side(), off: random() * 4, r: 1.6 + random() * 1.6 });
      },
      // Wooden ramps: the bike flies over a dry stream bed after each.
      jumps(s) {
        for (const d of [24, 46, 68]) {
          const y = s.from + d;
          const x = c(y);
          t.ramps.push({ y, x, w: 2.2, len: 1.8, reach: 7.2, peak: 1 });
          t.streams.push({ y: y + 5.4, w: 4.2, tilt: 0, dry: true });
          for (const part of [0.2, 0.4, 0.6, 0.8]) star(x, y + 1.8 + 7.2 * part, true);
          for (const before of [7, 5, 3]) star(c(y - before), y - before);
        }
      },
      // Rock walls close in on both sides, and the track winds between them.
      canyon(s) {
        t.walls.push({ from: s.from + 8, to: s.to - 8 });
        for (let y = s.from + 22; y < s.to - 26; y += 20) line(y, 4);
        t.items.push({ name: 'fox', y: s.from + 44, side: side(), off: 0.3, flip: random() < 0.5, wall: true });
        for (let y = s.from + 24; y < s.to - 24; y += 7 + random() * 6) t.items.push({ name: random() < 0.6 ? 'boulder' : 'shrub', y, side: side(), off: 0.8 + random() * 4, flip: random() < 0.5, wall: true });
      },
      // Up one side and down the other, with a little flight over the top.
      mountain(s) {
        const from = s.from + 12;
        const to = s.to - 12;
        const top = (from + to) / 2;
        t.peaks.push({ from, to, top, said: '' });
        t.ramps.push({ y: top, hop: true, crest: true, reach: 5.4, peak: 0.85 });
        for (const part of [0.25, 0.5, 0.75]) star(c(top + 5.4 * part), top + 5.4 * part, true);
        line(from + 8, 5, 2.2);
        line(from + 27, 4, 2.2, -0.7);
        line(top + 11, 5, 2.4, 0.7);
        line(top + 28, 4, 2.4);
        for (let y = from + 2; y < to; y += 6 + random() * 5) put('boulder', y, side(), random() * 2.5);
      },
      // A herder leads his camels across; the bike waits by itself.
      caravan(s) {
        const y = s.from + 36;
        t.caravans.push({ y, dir: side(), state: 'wait', walked: 0, phase: 0 });
        t.kept.push({ from: y - 1, to: y + 3.4 });
        line(s.from + 12, 4);
        line(y + 9, 5);
        put('tent', s.from + 54, side(), 0.6, false);
        put('acacia', s.from + 20, -1, 0.5);
        put('acacia', s.from + 26, 1, 1.2);
        put('acacia', s.from + 46, -1, 0.8);
      },
      // Shallow water runs across the track twice: gazelles drink, palms stand by.
      wadi(s) {
        [26, 56].forEach((d, k) => {
          const y = s.from + d;
          const to = k ? 1 : -1;
          t.streams.push({ y, w: 3.2, tilt: to * 0.2 });
          for (const along of [-1.3, 0, 1.3]) star(c(y + along), y + along);
          put('gazelle', y + 3, to, 0.2, to < 0);
          put('gazelle', y - 3.4, -to, 0.5, to > 0);
          put('palm', y + 4.4, to, 1.6);
          put('palm', y - 5.4, to, 0.4);
          put('palm', y + 1.2, -to, 1.2);
        });
        line(s.from + 9, 4, 1.7, -0.8);
        line(s.from + 39, 4, 1.7, 0.8);
        line(s.from + 68, 4, 1.7, -0.6);
      },
      // Boulders on the track, on one side then the other: the stars show the way around.
      rocks(s) {
        let to = side();
        for (let y = s.from + 22; y < s.to - 18; y += 9.5) {
          t.rocks.push({ x: c(y) + to * 0.9, y, r: 0.62 });
          star(c(y) - to * 0.9, y);
          star(c(y + 4.75), y + 4.75);
          to = -to;
        }
        put('fox', s.from + 43, side(), 0.3);
      },
      // Palms thicken toward the oasis: its pool, its tent, a camel at rest.
      grove(s) {
        line(s.from + 7, 5);
        const x = c(L);
        t.items.push(
          { name: 'tent', x: x + 2.9, y: L + 3, flip: false },
          { name: 'palm', x: x - 5.3, y: L + 4.6, flip: false },
          { name: 'palm', x: x - 0.9, y: L + 6.4, flip: true },
          { name: 'palm', x: x + 1.3, y: L + 6, flip: false },
          { name: 'palm', x: x + 5.6, y: L + 5.2, flip: true },
          { name: 'gazelle', x: x - 4.4, y: L + 2.5, flip: false },
          { name: 'camel', x: x + 6.4, y: L + 1.2, flip: true },
        );
        t.kept.push({ from: L - 2, to: end + 20 });
        for (let y = s.from + 3; y < L - 3; y += 4.4) {
          put('palm', y, -1, random() * 1.4);
          put('palm', y + 2.2, 1, random() * 1.4);
        }
      },
    };
    for (const s of sections) build[s.kind](s);
    // Then shrubs, rocks and a tree here and there along the whole ride.
    const any = ['shrub', 'shrub', 'boulder', 'shrub', 'acacia'];
    for (let y = 5; y < L - 3; y += 4 + random() * 5) put(any[Math.floor(random() * any.length)], y, side(), random() * 3);
    return t;
  }

  function layout() {
    u = clamp(Math.min(width / 9, carY / 10.5), 26, 110);
    ahead = carY / u + 1;
    back = (height - carY) / u + 1;
    half = width / 2 / u;
    roam = clamp(half - 2.4, 1.9, 3.3);
    pics.clear();
  }

  /* Each drawing is turned into a picture once, at the size it is shown. */
  function pic(name, tall) {
    const h = Math.ceil(tall * u * dpr);
    let hit = pics.get(name);
    if (!hit || hit.height < h) {
      const image = images[name];
      if (!image || !image.naturalWidth) return null;
      hit = document.createElement('canvas');
      hit.height = h;
      hit.width = Math.ceil(h * SPRITES[name]);
      hit.getContext('2d').drawImage(image, 0, 0, hit.width, hit.height);
      pics.set(name, hit);
    }
    return hit;
  }

  /* What the ground does at y. */
  const gradeAt = (y) => {
    for (const peak of trip.peaks) if (y > peak.from && y < peak.to) return y < peak.top ? 1 : -1;
    return 0;
  };
  // Half the open width between the canyon's walls: they come in from beyond the screen.
  const wallGap = (y) => {
    for (const wall of trip.walls) {
      if (y > wall.from && y < wall.to) return mix(half + 1.5, 1.6, smooth(clamp(Math.min(y - wall.from, wall.to - y) / 14, 0, 1)));
    }
    return Infinity;
  };
  const inStream = (stream, x, y) => Math.abs(y - stream.y - stream.tilt * (x - center(stream.y))) < stream.w / 2;

  function puff(count, wet = false) {
    for (let i = 0; i < count; i++) {
      trip.dust.push({ x: trip.x + (Math.random() - 0.5) * 0.9, y: trip.y - 0.45 + (Math.random() - 0.5) * 0.5, drift: (Math.random() - 0.5) * 1.4, age: 0, wet });
    }
  }

  /* An eagle glides across now and then, a little slower than the bike, and cries once. */
  function glide(dt) {
    const t = trip;
    if (!t.eagle) {
      if (t.t < t.eagleAt || t.parked) return;
      const from = Math.random() < 0.5 ? -1 : 1;
      t.eagle = { x: t.cam + from * (half + 2.5), y: t.y + ahead * (0.6 + Math.random() * 0.3), vx: (-from * (2 * half + 5)) / 4.5, vy: 0, age: 0, cried: false };
      return;
    }
    const eagle = t.eagle;
    eagle.age += dt;
    eagle.vy = Math.max(t.v, 3) * 0.75;
    eagle.x += eagle.vx * dt;
    eagle.y += eagle.vy * dt;
    if (!eagle.cried && eagle.age > 0.7) {
      eagle.cried = true;
      beep('eagle');
    }
    if (eagle.age > 10 || Math.abs(eagle.x - t.cam) > half + 4 || eagle.y < t.y - back - 3) {
      t.eagle = null;
      t.eagleAt = t.t + 13 + Math.random() * 12;
    }
  }

  /* The caravan: a herder and three camels, each this far behind him. They
     stand beside the track until the bike is near, cross it in a line, and
     the bike may go once the last of them is beyond its reach. */
  const CARAVAN = { behind: [0, 1.7, 4.3, 6.9], pace: 2.1, start: HALF + 2.4, near: 40 };
  const walkerX = (caravan, i) => center(caravan.y) + caravan.dir * (caravan.walked - CARAVAN.behind[i] - CARAVAN.start);
  const walked = (caravan) => caravan.walked >= CARAVAN.behind[3] + CARAVAN.start + roam + 7;
  function walk(dt) {
    const t = trip;
    for (const caravan of t.caravans) {
      if (caravan.state === 'wait') {
        if (t.y > caravan.y - CARAVAN.near) caravan.state = 'cross';
        continue;
      }
      const last = CARAVAN.behind[3] + CARAVAN.start;
      if (!walked(caravan)) {
        caravan.walked += CARAVAN.pace * dt;
        caravan.phase += dt * 7;
      }
      if (caravan.state === 'cross' && caravan.walked > last + roam + 1.3) {
        caravan.state = 'done';
        sound.tick();
      }
    }
  }

  /* Going up a mountain or coming down it: the words show, and are said once. */
  function zikr() {
    const t = trip;
    let now = '';
    for (const peak of t.peaks) {
      if (t.y < peak.from + 2 || t.y > peak.to - 2 || Math.abs(t.y - peak.top) < 1) continue;
      now = t.y < peak.top ? 'up' : 'down';
      if (peak.said !== now) {
        peak.said = now;
        sound.say(ZIKR[now].clip);
      }
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
    t.dust = t.dust.filter((bit) => bit.age < 0.8);
    t.squash = Math.max(0, t.squash - dt * 4);
    glide(dt);
    walk(dt);
    if (t.parked) {
      beep('engine', 0);
      return;
    }
    const L = t.L;
    const ending = t.y > L - 16;
    const steer = steering(dt, (px) => t.cam + (px - width / 2) / u);
    const grade = gradeAt(t.y);
    const soft = Math.abs(t.x - center(t.y)) > HALF + 0.15;
    const stream = t.air ? null : t.streams.find((one) => inStream(one, t.x, t.y));
    if (stream && !t.wet) {
      puff(7, !stream.dry);
      if (!stream.dry) beep('splash');
    }
    t.wet = Boolean(stream);

    // The pedal, and what the ground allows: slower up a mountain, through
    // water, on soft sand and along a wall; faster coming down.
    let top = grade > 0 ? PACE.climb : grade < 0 ? PACE.descent : PACE.max;
    if (stream) top = Math.min(top, PACE.slow);
    if (soft) top *= PACE.soft;
    if (t.scrape > 0) top *= 0.7;
    const gas = pedalDown() && !ending;
    let want = gas ? top : PACE.crawl;
    if (t.air) want = Math.max(t.v, PACE.air);
    if (ending) want = clamp((L - t.y) * 0.8, 0.35, 6);
    // It stops by itself for a caravan on the track.
    let limit = Infinity;
    const front = t.y + BIKE.l / 2;
    for (const caravan of t.caravans) {
      if (caravan.state !== 'done' && front < caravan.y) limit = Math.min(limit, Math.max(0, (caravan.y - 1.2 - front) * 1.7));
    }
    t.held = limit < 0.4;
    const target = Math.min(want, limit);
    if (target > t.v) t.v = Math.min(target, t.v + PACE.gain * dt);
    else t.v = Math.max(target, t.v - (limit < want ? 20 : ending ? 9 : PACE.drop) * dt);

    const was = { x: t.x, y: t.y };
    t.y += t.v * dt;
    const turn = ending ? clamp((center(L) - t.x) * 1.4, -1, 1) : steer;
    t.x += turn * TURN_RATE * (t.air ? 0.5 : 1) * (0.45 + (0.55 * Math.min(t.v, PACE.max)) / PACE.max) * dt;

    // A boulder on the track is a soft bump: the bike slides around it.
    if (!t.air) {
      for (const rock of t.rocks) {
        const dx = t.x - rock.x;
        const dy = t.y - rock.y;
        const reach = rock.r + 0.42;
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
    // The canyon's walls, and the edge of the bike's reach in the open.
    const open = Math.min(roam, wallGap(t.y) - 0.55);
    const free = t.x;
    t.x = clamp(t.x, center(t.y) - open, center(t.y) + open);
    if (t.x !== free && open < roam) {
      t.scrape = 0.25;
      if (Math.random() < dt * 14) puff(1);
    } else {
      t.scrape = Math.max(0, t.scrape - dt);
    }
    const drift = (t.x - was.x) / Math.max(dt, 0.001);
    t.yaw += (clamp(Math.atan2(drift, Math.max(t.v, 2.5)), -0.6, 0.6) - t.yaw) * (1 - Math.exp(-dt / 0.1));
    t.steer += (turn - t.steer) * (1 - Math.exp(-dt / 0.08));

    // Flights: off a ramp when the bike is on it, over a dune or a crest
    // wherever it crosses. A flight covers a set distance, so every star
    // hung over it can be reached.
    if (t.air) {
      const part = (t.y - t.air.from) / t.air.reach;
      if (part >= 1) {
        t.air = null;
        t.h = 0;
        t.squash = 1;
        puff(8);
        sound.tick();
      } else {
        t.h = t.air.peak * 4 * part * (1 - part);
      }
    } else {
      for (const ramp of t.ramps) {
        const lip = ramp.y + (ramp.len || 0);
        if (was.y >= lip || t.y < lip) continue;
        if (ramp.hop || Math.abs(t.x - ramp.x) < ramp.w / 2 + 0.2) t.air = { from: lip, reach: ramp.reach, peak: ramp.peak };
      }
    }
    if (!t.air && t.v > 4 && Math.random() < dt * (soft ? 16 : 7)) puff(1, t.wet && !stream.dry);
    t.cam += (center(t.y + 3) - t.cam) * (1 - Math.exp(-dt / 0.5));
    zikr();

    // Stars: those on the ground are driven over, those in the air are flown through.
    for (const one of t.stars) {
      if (one.got) {
        one.got += dt;
        continue;
      }
      if (one.air !== Boolean(t.air)) continue;
      if (Math.abs(one.x - t.x) > (one.air ? 0.95 : 0.72) || Math.abs(one.y - t.y) > 0.85) continue;
      one.got = 0.001;
      t.streak = t.t - t.picked < 2.5 ? t.streak + 1 : 0;
      t.picked = t.t;
      t.earned += 1;
      stars += 1;
      shown = stars;
      showCount();
      beep('pop', t.streak);
    }

    // The motor is light: a hum with the pedal, more on a climb, most in the air.
    beep('engine', t.air ? 0.7 : gas && !t.held ? (grade > 0 ? 0.55 : 0.22) : 0.06, t.v / PACE.max + (t.air ? 0.4 : 0));
    dash(t.y / L, turn, ending);
    if (ending && L - t.y < 0.12) {
      t.v = 0;
      $('zikr').hidden = true;
      arrive(X(t.x), carY - u * 1.3);
    }
  }

  /* Drawing. */
  function ellipse(x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Something that stands up from the sand at x, y on the screen, with its shadow. */
  function stand(name, x, y, tall, flip, tip) {
    const image = pic(name, tall);
    if (!image) return;
    const h = tall * u;
    const w = h * SPRITES[name];
    const lean = trip.day.lean;
    ctx.fillStyle = 'rgba(70,45,20,.17)';
    ellipse(x + lean * h * 0.22, y, w * 0.42 + Math.abs(lean) * h * 0.2, Math.max(2, h * 0.05));
    ctx.save();
    ctx.translate(x, y);
    if (tip) ctx.rotate(tip);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(image, -w / 2, -h, w, h);
    ctx.restore();
  }

  /* The bike from above, nose up the track: four fat tires, a red body, and
     its rider, a grown-up in a helmet, so no face shows. */
  function bike(x, y, yaw, steer, scale) {
    const s = u * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(yaw);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.fillStyle = '#2B2622';
    for (const [wx, wy, turned] of [[-0.35, -0.4, 1], [0.35, -0.4, 1], [-0.37, 0.4, 0], [0.37, 0.4, 0]]) {
      ctx.save();
      ctx.translate(wx * s, wy * s);
      ctx.rotate(turned * steer * 0.45);
      rounded(-0.11 * s, -0.2 * s, 0.22 * s, 0.4 * s, 0.07 * s);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#8D949B'; // the racks, front and back
    rounded(-0.2 * s, -0.65 * s, 0.4 * s, 0.16 * s, 0.04 * s);
    ctx.fill();
    ctx.stroke();
    rounded(-0.23 * s, 0.44 * s, 0.46 * s, 0.2 * s, 0.05 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#D4533A';
    rounded(-0.25 * s, -0.56 * s, 0.5 * s, 1.08 * s, 0.17 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3A3A3A'; // the seat
    rounded(-0.15 * s, 0 * s, 0.3 * s, 0.42 * s, 0.1 * s);
    ctx.fill();
    ctx.stroke();
    // The bar turns with the steering, and the arms reach to its ends.
    const bar = steer * 0.4;
    const grips = [-1, 1].map((hand) => [hand * 0.33 * Math.cos(bar) * s, (-0.3 + hand * 0.33 * Math.sin(bar)) * s]);
    ctx.lineWidth = s * 0.07;
    ctx.beginPath();
    ctx.moveTo(...grips[0]);
    ctx.lineTo(...grips[1]);
    ctx.stroke();
    grips.forEach(([gx, gy], i) => {
      ctx.strokeStyle = INK;
      ctx.lineWidth = s * 0.15;
      ctx.beginPath();
      ctx.moveTo((i ? 0.19 : -0.19) * s, 0.1 * s);
      ctx.lineTo(gx, gy);
      ctx.stroke();
      ctx.strokeStyle = '#3E76C2';
      ctx.lineWidth = s * 0.1;
      ctx.stroke();
    });
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.fillStyle = '#3E76C2'; // the shoulders
    ctx.beginPath();
    ctx.ellipse(0, 0.16 * s, 0.26 * s, 0.17 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#F4F1EA'; // the helmet, with a stripe
    ctx.beginPath();
    ctx.arc(0, 0.06 * s, 0.17 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#D4533A';
    rounded(-0.03 * s, -0.1 * s, 0.06 * s, 0.32 * s, 0.03 * s);
    ctx.fill();
    ctx.restore();
  }

  /* A line across the whole view at y, following a stream's tilt. */
  function band(stream, grow, color) {
    const m = center(stream.y);
    const left = trip.cam - half - 1;
    const right = trip.cam + half + 1;
    const yl = stream.y + stream.tilt * (left - m);
    const yr = stream.y + stream.tilt * (right - m);
    const r = stream.w / 2 + grow;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(X(left), Y(yl - r));
    ctx.lineTo(X(right), Y(yr - r));
    ctx.lineTo(X(right), Y(yr + r));
    ctx.lineTo(X(left), Y(yl + r));
    ctx.closePath();
    ctx.fill();
  }

  function ground(from, to) {
    const t = trip;
    const day = t.day;
    const left = t.cam - half - 1;
    const right = t.cam + half + 1;
    ctx.fillStyle = day.sand;
    ctx.fillRect(0, 0, width, height);

    // Ripples in the sand.
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, u * 0.035);
    ctx.strokeStyle = day.ripple;
    for (let i = Math.floor(from / 1.5); i * 1.5 < to; i++) {
      for (let j = Math.floor(left / 2.4); j * 2.4 < right; j++) {
        const n = Math.abs((i * 73 + j * 151) % 97) / 97;
        if (n < 0.35) continue;
        const x = X(j * 2.4 + n * 1.9);
        const y = Y(i * 1.5 + ((n * 7) % 1) * 1.2);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + u * 0.22, y - u * 0.1, x + u * 0.5, y);
        ctx.stroke();
      }
    }
    // Crescent dunes off to the sides: a pale back and a shaded lee.
    for (const dune of t.crescents) {
      if (dune.y < from - dune.r || dune.y > to + dune.r) continue;
      const x = X(center(dune.y) + dune.side * (roam + 1.4 + dune.off + dune.r));
      const y = Y(dune.y);
      ctx.fillStyle = day.high;
      ellipse(x, y, dune.r * u, dune.r * 0.55 * u);
      ctx.fillStyle = day.low;
      ctx.beginPath();
      ctx.ellipse(x, y, dune.r * u, dune.r * 0.55 * u, 0, 0, Math.PI);
      ctx.ellipse(x, y, dune.r * u, dune.r * 0.22 * u, 0, Math.PI, 0, true);
      ctx.fill();
    }
    // A mountain: steps of rock, paler toward the top, each with a dark edge
    // that faces the bike on the way up and falls away on the way down.
    for (const peak of t.peaks) {
      if (peak.to < from - 2 || peak.from > to + 2) continue;
      const span = peak.top - peak.from;
      // A step's edge across the view: it bows around the track and wavers a little.
      const edge = (y, back) => {
        for (let k = 0; k <= right - left + 1; k++) {
          const x = back ? right + 1 - k : left + k;
          ctx.lineTo(X(x), Y(y + 0.55 * Math.cos((x - center(y)) * 0.32) + 0.16 * Math.sin(x * 1.3 + y * 0.7)));
        }
      };
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';
      ctx.lineWidth = Math.max(1.5, u * 0.11);
      for (let y = Math.max(Math.floor((from - 2) / 2) * 2, peak.from); y < Math.min(to + 2, peak.to); y += 2) {
        const high = 1 - Math.abs(y + 1 - peak.top) / span;
        const fade = smooth(clamp(Math.min(y + 1 - peak.from, peak.to - y - 1) / 8, 0, 1));
        ctx.fillStyle = `rgba(${Math.round(mix(190, 228, high))},${Math.round(mix(150, 210, high))},${Math.round(mix(112, 182, high))},${fade.toFixed(2)})`;
        ctx.beginPath();
        edge(y, false);
        edge(y + 2.04, true);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = y + 1 < peak.top ? `rgba(104,70,42,${(0.34 * fade).toFixed(2)})` : `rgba(255,250,238,${(0.5 * fade).toFixed(2)})`;
        ctx.beginPath();
        edge(y, false);
        ctx.stroke();
      }
    }
    // The track: firmer sand, two faint ruts, and small stones along its edges.
    const trace = (off) => {
      ctx.beginPath();
      for (let y = from - 1; y <= to + 1; y += 1) ctx.lineTo(X(center(y) + off), Y(y));
    };
    ctx.lineJoin = 'round';
    ctx.lineCap = 'butt';
    ctx.strokeStyle = day.track;
    ctx.lineWidth = HALF * 2 * u;
    trace(0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,84,48,.16)';
    ctx.lineWidth = u * 0.16;
    for (const off of [-0.34, 0.34]) {
      trace(off);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(126,96,66,.75)';
    for (let i = Math.floor(from / 2.6); i * 2.6 < to; i++) {
      const y = i * 2.6;
      ellipse(X(center(y) + (i % 2 ? 1 : -1) * (HALF + 0.06)), Y(y), u * 0.12, u * 0.085);
    }
    // Streams of water, and the dry beds the ramps fly over.
    for (const stream of t.streams) {
      if (stream.y + stream.w + 2 < from || stream.y - stream.w - 2 > to) continue;
      if (stream.dry) {
        band(stream, 0, day.gully);
        ctx.fillStyle = 'rgba(120,92,62,.8)';
        for (let k = Math.floor(left / 0.9); k * 0.9 < right; k++) {
          const n = Math.abs((k * 61) % 23) / 23;
          ellipse(X(k * 0.9 + n * 0.5), Y(stream.y + (n - 0.5) * (stream.w - 0.6)), u * (0.08 + n * 0.1), u * (0.06 + n * 0.06));
        }
      } else {
        band(stream, 0.28, day.wet);
        band(stream, 0, '#62B2DE');
        ctx.strokeStyle = 'rgba(255,255,255,.55)';
        ctx.lineWidth = Math.max(1, u * 0.045);
        ctx.lineCap = 'round';
        const m = center(stream.y);
        for (let k = Math.floor(left / 1.3); k * 1.3 < right; k++) {
          const n = Math.abs((k * 37) % 19) / 19;
          const wx = k * 1.3 + ((t.t * 0.5 + n) % 1) * 1.3;
          const x = X(wx);
          const y = Y(stream.y + stream.tilt * (wx - m) + (n - 0.5) * (stream.w - 0.8));
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + u * 0.16, y - u * 0.08, x + u * 0.34, y);
          ctx.stroke();
        }
      }
    }
    // The oasis: its pool, straight ahead of where the bike stops.
    if (t.L + 9 > from && t.L - 2 < to) {
      const x = X(center(t.L) - 2.6);
      const y = Y(t.L + 4.6);
      ctx.fillStyle = day.wet;
      ellipse(x, y, u * 2.75, u * 1.6);
      ctx.fillStyle = '#62B2DE';
      ellipse(x, y, u * 2.45, u * 1.36);
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = Math.max(1, u * 0.05);
      ctx.lineCap = 'round';
      for (const [dx, dy] of [[-1.2, -0.4], [0.5, 0.3], [-0.2, 0.75], [1.1, -0.5]]) {
        ctx.beginPath();
        ctx.moveTo(x + dx * u, y + dy * u);
        ctx.quadraticCurveTo(x + (dx + 0.18) * u, y + (dy - 0.09) * u, x + (dx + 0.4) * u, y + dy * u);
        ctx.stroke();
      }
    }
    // Dunes and the mountain's top lie across the track: a pale rise, then shade beyond the crest.
    for (const ramp of t.ramps) {
      if (!ramp.hop || ramp.y < from - 2 || ramp.y > to + 2) continue;
      const y = Y(ramp.y);
      let tone = ctx.createLinearGradient(0, y + u * 1.1, 0, y);
      tone.addColorStop(0, 'rgba(255,248,226,0)');
      tone.addColorStop(1, ramp.crest ? 'rgba(255,250,236,.75)' : 'rgba(255,248,226,.8)');
      ctx.fillStyle = tone;
      ctx.fillRect(0, y, width, u * 1.1);
      tone = ctx.createLinearGradient(0, y, 0, y - u * 1.2);
      tone.addColorStop(0, 'rgba(110,70,36,.36)');
      tone.addColorStop(1, 'rgba(110,70,36,0)');
      ctx.fillStyle = tone;
      ctx.fillRect(0, y - u * 1.2, width, u * 1.2);
    }
    // The ramps: a wooden deck, its far end raised, with arrows up it.
    for (const ramp of t.ramps) {
      if (ramp.hop || ramp.y < from - 3 || ramp.y > to + 1) continue;
      const x0 = X(ramp.x - ramp.w / 2);
      const x1 = X(ramp.x + ramp.w / 2);
      const near = Y(ramp.y);
      const lip = Y(ramp.y + ramp.len);
      ctx.fillStyle = 'rgba(70,45,20,.26)';
      ctx.fillRect(x0 + day.lean * u * 0.4, lip - u * 0.5, x1 - x0, u * 0.55);
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1, u * 0.04);
      ctx.strokeStyle = INK;
      ctx.fillStyle = '#C98A45';
      ctx.beginPath();
      ctx.moveTo(x0 - u * 0.14, near);
      ctx.lineTo(x1 + u * 0.14, near);
      ctx.lineTo(x1, lip);
      ctx.lineTo(x0, lip);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(74,52,36,.4)';
      for (let k = 1; k < 5; k++) {
        const y = near + ((lip - near) * k) / 5;
        ctx.beginPath();
        ctx.moveTo(x0 - u * 0.14 * (1 - k / 5), y);
        ctx.lineTo(x1 + u * 0.14 * (1 - k / 5), y);
        ctx.stroke();
      }
      ctx.fillStyle = '#F2D7A6';
      ctx.fillRect(x0, lip, x1 - x0, u * 0.13);
      ctx.strokeStyle = '#FFFDF6';
      ctx.lineWidth = u * 0.12;
      ctx.lineCap = 'round';
      const cx0 = (x0 + x1) / 2;
      for (const k of [0.3, 0.62]) {
        const y = near + (lip - near) * k;
        ctx.beginPath();
        ctx.moveTo(cx0 - u * 0.42, y + u * 0.2);
        ctx.lineTo(cx0, y - u * 0.16);
        ctx.lineTo(cx0 + u * 0.42, y + u * 0.2);
        ctx.stroke();
      }
    }
    // The canyon: rock on both sides, its edge ragged, the shaded wall's shadow on the floor.
    for (const wall of t.walls) {
      if (wall.to < from || wall.from > to) continue;
      const y0 = Math.max(from - 1, wall.from + 0.01);
      const y1 = Math.min(to + 1, wall.to - 0.01);
      for (const to1 of [-1, 1]) {
        const edge = (extra) => {
          ctx.beginPath();
          for (let y = y0; y <= y1; y += 0.5) {
            ctx.lineTo(X(center(y) + to1 * (wallGap(y) + 0.2 * Math.sin(y * 1.7 + to1) + 0.14 * Math.sin(y * 0.63 + 2 * to1) + extra)), Y(y));
          }
        };
        ctx.lineJoin = 'round';
        ctx.lineCap = 'butt';
        if (to1 === (day.lean > 0 ? -1 : 1)) {
          edge(0);
          ctx.strokeStyle = 'rgba(70,40,20,.2)';
          ctx.lineWidth = u * 1.3;
          ctx.stroke();
        }
        edge(0);
        ctx.lineTo(to1 < 0 ? -20 : width + 20, Y(y1));
        ctx.lineTo(to1 < 0 ? -20 : width + 20, Y(y0));
        ctx.closePath();
        ctx.fillStyle = day.rock;
        ctx.fill();
        ctx.strokeStyle = 'rgba(96,52,34,.28)';
        ctx.lineWidth = Math.max(1, u * 0.07);
        for (const extra of [0.9, 2.2, 3.8, 5.8, 8.2]) {
          edge(extra);
          ctx.stroke();
        }
        edge(0);
        ctx.strokeStyle = '#7E4A33';
        ctx.lineWidth = Math.max(2, u * 0.1);
        ctx.stroke();
      }
    }
  }

  function draw() {
    const t = trip;
    if (!t) return;
    const day = t.day;
    const from = t.y - back;
    const to = t.y + ahead;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ground(from, to);

    // Stars on the ground; one just taken grows and fades.
    const drawOne = (one, r, lift) => {
      const gone = Math.min(1, one.got / 0.25);
      ctx.globalAlpha = 1 - gone;
      drawStar(X(one.x), Y(one.y) - lift - Math.sin(t.t * 4 + one.y) * u * 0.03, r * (1 + gone * 1.2));
      ctx.globalAlpha = 1;
    };
    for (const one of t.stars) {
      if (one.air || one.y < from - 1 || one.y > to + 1 || one.got > 0.25) continue;
      drawOne(one, u * 0.27, 0);
    }
    // Dust and spray.
    for (const bit of t.dust) {
      const age = bit.age / 0.8;
      ctx.fillStyle = bit.wet ? `rgba(214,236,250,${(0.7 * (1 - age)).toFixed(2)})` : `rgba(214,184,132,${(0.6 * (1 - age)).toFixed(2)})`;
      ellipse(X(bit.x + bit.drift * bit.age), Y(bit.y - bit.age * 0.8), u * (0.14 + bit.age * 0.5), u * (0.14 + bit.age * 0.5));
    }

    // Everything that stands up, the furthest first, the bike among it.
    const standing = [];
    for (const item of t.items) {
      if (item.y > to + 0.5 || item.y < from - TALL[item.name] - 0.5) continue;
      const w = TALL[item.name] * SPRITES[item.name];
      let x = item.x;
      if (x === undefined) {
        const gap = item.wall ? wallGap(item.y) : roam;
        if (gap === Infinity) continue;
        x = center(item.y) + item.side * (gap + 0.55 + item.off + w / 2);
      }
      standing.push({ y: item.y, name: item.name, x, flip: item.flip });
    }
    for (const rock of t.rocks) {
      if (rock.y > to + 1 || rock.y < from - 2) continue;
      standing.push({ y: rock.y - rock.r * 0.9, name: 'boulder', x: rock.x, flip: false });
    }
    for (const caravan of t.caravans) {
      if (caravan.y > to + 1 || caravan.y < from - 3) continue;
      for (let i = 0; i < CARAVAN.behind.length; i++) {
        const step = caravan.state !== 'wait' && !walked(caravan) ? Math.sin(caravan.phase + i * 1.7) : 0;
        standing.push({ y: caravan.y, name: i ? 'camel' : 'man', x: walkerX(caravan, i), flip: caravan.dir < 0, tip: step * 0.04, hop: Math.abs(step) * 0.04 });
      }
    }
    const high = t.h + t.squash * 0.12 * Math.sin(t.squash * Math.PI);
    const scale = 1 + high * 0.3;
    const me = { y: t.y - 0.35, bike: true };
    if (!t.air) standing.push(me);
    standing.sort((a, b) => b.y - a.y);
    const drawBike = () => {
      // Its shadow stays on the sand, further off the higher it flies.
      ctx.fillStyle = `rgba(70,45,20,${t.air ? 0.16 : 0.24})`;
      ellipse(X(t.x) + (day.lean * 0.5 + 0.1) * t.h * u + u * 0.04, carY + t.h * u * 0.55 + u * 0.05, u * 0.5, u * 0.66);
      bike(X(t.x), carY, t.yaw, t.steer, scale);
    };
    for (const thing of standing) {
      if (thing.bike) drawBike();
      else stand(thing.name, X(thing.x), Y(thing.y) - (thing.hop || 0) * u, TALL[thing.name], thing.flip, thing.tip);
    }
    // Stars in the air hang over their shadows; a bike in flight is above everything.
    for (const one of t.stars) {
      if (!one.air || one.y < from - 1 || one.y > to + 1 || one.got > 0.25) continue;
      if (!one.got) {
        ctx.fillStyle = 'rgba(70,45,20,.18)';
        ellipse(X(one.x) + day.lean * u * 0.35, Y(one.y) + u * 0.5, u * 0.24, u * 0.1);
      }
      drawOne(one, u * 0.36, u * 0.25);
    }
    if (t.air) drawBike();

    // The eagle and its shadow.
    if (t.eagle) {
      const eagle = t.eagle;
      const image = pic('eagle', 2);
      const x = X(eagle.x);
      const y = Y(eagle.y);
      const turn = Math.atan2(eagle.vx, eagle.vy) + Math.sin(eagle.age * 1.3) * 0.08;
      ctx.fillStyle = 'rgba(70,45,20,.16)';
      ctx.save();
      ctx.translate(x + (day.lean + 0.3) * u * 1.6, y + u * 1.7);
      ctx.rotate(turn);
      ellipse(0, 0, u * 1.45, u * 0.34);
      ellipse(0, u * 0.1, u * 0.3, u * 0.9);
      ctx.restore();
      if (image) {
        const h = 2 * u;
        const w = h * SPRITES.eagle;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(turn);
        ctx.drawImage(image, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }
    // The light of the hour over the whole picture.
    if (day.tint) {
      ctx.fillStyle = day.tint;
      ctx.fillRect(0, 0, width, height);
    }
  }

  return { make, layout, update, draw };
})();
if (LOCAL) window.driveGame.desert = desert;
