/* الصَّحْرَاءُ: the desert ride, the third of the driving games. An all-terrain
   bike, seen from the side, crosses the sand toward an oasis: low dunes to
   bounce over, ramps to fly off, and mountains to climb and come down. Either
   pedal makes it go; letting go slows it; it never falls and never stops for
   good. Going up a mountain the takbir shows and is said, coming down the
   tasbih. Stars hang over the dunes and along the jumps. The sun sits behind
   clouds that drift, and shows now and then.
   This file leans on drive.js, loaded before it: the canvas and its sizes,
   the pedals, the stars, the sounds and the arrival screen are all there.
   Lengths are in bike lengths, more or less; s grows along the ride, and the
   bike heads to the left of the screen, as the bar along the top does. */
const desert = (() => {
  const GRAVITY = 26;
  const PACE = { crawl: 2.4, max: 11, gain: 7, drop: 4, least: 1.3 };
  const ZIKR = { up: { text: 'اللَّهُ أَكْبَرُ', clip: 'allahu-akbar' }, down: { text: 'سُبْحَانَ اللَّهِ', clip: 'subhanallah' } };
  let unit = 60; // pixels per length
  let anchor = 0; // where the bike sits across the screen
  let base = 0; // where the ground under the bike sits down the screen

  const smooth = (t) => t * t * (3 - 2 * t);

  /* How high one shape lifts the ground at s. */
  function lift(shape, s) {
    const t = (s - shape.s) / shape.w;
    if (shape.kind === 'ramp') {
      if (t <= 0) return 0;
      if (t <= 1) return shape.a * smooth(t);
      const off = (s - shape.s - shape.w) / 0.7;
      return off >= 1 ? 0 : shape.a * (1 - smooth(off));
    }
    return t <= 0 || t >= 1 ? 0 : (shape.a * (1 - Math.cos(2 * Math.PI * t))) / 2;
  }

  const ground = (s) => trip.shapes.reduce((sum, shape) => (s < shape.s - 1 || s > shape.s + shape.w + 1 ? sum : sum + lift(shape, s)), 0);
  const slope = (s) => (ground(s + 0.06) - ground(s - 0.06)) / 0.12;

  /* The ride is laid out once: the shapes of the ground in a set order with
     gaps that vary, three mountains among them, and the stars over them. */
  function make(which, random) {
    const shapes = [];
    const stars = [];
    const order = ['dune', 'dune', 'ramp', 'mountain', 'dune', 'ramp', 'dune', 'ramp', 'mountain', 'ramp', 'dune', 'dune', 'mountain', 'ramp', 'dune'];
    let s = 14;
    for (let i = 0; s < which.length - 44; i++) {
      // A mountain needs room before the oasis; near the end a dune takes its place.
      const kind = order[i % order.length] === 'mountain' && s > which.length - 110 ? 'dune' : order[i % order.length];
      if (kind === 'dune') {
        const shape = { kind, s, w: 7 + random() * 3, a: 1 + random() * 0.6 };
        shapes.push(shape);
        stars.push({ s: s + shape.w / 2, h: shape.a + 1.5, got: 0 });
        s += shape.w + 3 + random() * 4;
      } else if (kind === 'ramp') {
        const shape = { kind, s, w: 6 + random() * 2, a: 1.5 + random() * 0.8 };
        shapes.push(shape);
        for (let k = 1; k <= 4; k++) stars.push({ s: s + shape.w + k * 1.7, h: shape.a + 1.1 + k * 0.5 - k * k * 0.16, got: 0 });
        s += shape.w + 12 + random() * 4;
      } else {
        const shape = { kind, s, w: 44 + random() * 12, a: 6 + random() * 2, said: '' };
        shapes.push(shape);
        for (let k = 1; k < 8; k++) {
          const at = s + (shape.w * k) / 8;
          stars.push({ s: at, h: lift(shape, at) + 1.1, got: 0 });
        }
        s += shape.w + 6 + random() * 4;
      }
    }
    const clouds = [{ at: 0.02, y: 0.17, size: 2.6, pace: 0.014 }, { at: 0.55, y: 0.1, size: 1.3, pace: 0.02 }, { at: 0.95, y: 0.24, size: 1.7, pace: 0.011 }, { at: 1.3, y: 0.13, size: 1.1, pace: 0.017 }];
    const rocks = [];
    for (let at = 6; at < which.length + 10; at += 5 + random() * 9) rocks.push({ s: at, size: 0.25 + random() * 0.35 });
    return {
      desert: true, road: which, t: 0, s: 0, y: 0, v: 0, vx: 0, vy: 0, flying: 0, lean: 0, spin: 0, squash: 0, cam: 0, pan: 0,
      shapes, stars, clouds, rocks, dust: [], earned: 0, streak: 0, picked: -9, zikr: '', light: 0,
      parked: false, done: false, shown: -1,
    };
  }

  function layout() {
    unit = clamp(height / 10, 34, 84);
    anchor = width * (width > height ? 0.7 : 0.66);
    base = height * 0.72;
  }

  function puff(count) {
    for (let i = 0; i < count; i++) trip.dust.push({ s: trip.s - 0.5 + Math.random(), h: trip.y + 0.1, up: 0.6 + Math.random() * 1.2, back: 1 + Math.random() * 2, age: 0 });
  }

  /* Going up a mountain or coming down it: the words show, and are said once. */
  function zikr() {
    let now = '';
    for (const shape of trip.shapes) {
      if (shape.kind !== 'mountain' || trip.s < shape.s + 3 || trip.s > shape.s + shape.w - 3) continue;
      now = trip.s < shape.s + shape.w / 2 ? 'up' : 'down';
      if (shape.said !== now) {
        shape.said = now;
        sound.say(ZIKR[now].clip);
      }
    }
    if (now === trip.zikr) return;
    trip.zikr = now;
    $('zikr').hidden = !now;
    if (now) $('zikr').textContent = ZIKR[now].text;
  }

  function update(dt) {
    const t = trip;
    t.t += dt;
    for (const cloud of t.clouds) cloud.at = (cloud.at + cloud.pace * dt) % 1.9;
    for (const bit of t.dust) bit.age += dt;
    t.dust = t.dust.filter((bit) => bit.age < 0.7);
    t.squash = Math.max(0, t.squash - dt * 5);
    if (t.parked) {
      beep('engine', 0);
      return;
    }
    const L = t.road.length;
    const ending = t.s > L - 20;
    const gas = pedalDown() && !ending;
    const m = slope(t.s);
    if (!t.flying) {
      // On the sand: the pedal, and the slope that slows a climb and speeds a descent.
      const want = ending ? clamp((L - t.s) * 0.8, 0, 6) : gas ? PACE.max : PACE.crawl;
      t.v += (want > t.v ? PACE.gain : -PACE.drop) * dt - m * 13 * dt;
      t.v = ending ? Math.min(t.v, Math.max(want, 0.3)) : clamp(t.v, PACE.least, PACE.max + 3);
      t.vx = t.v / Math.sqrt(1 + m * m);
      const before = t.y;
      t.s += t.vx * dt;
      const under = ground(t.s);
      // Where it would be if nothing held it up: above the sand means it has taken off.
      const free = before + t.vy * dt - (GRAVITY * dt * dt) / 2;
      if (free > under + 0.0005) {
        t.y = free;
        t.vy -= GRAVITY * dt;
        t.flying = 0.001;
      } else {
        t.y = under;
        t.vy = (under - before) / dt;
      }
      t.lean += (Math.atan(m) - t.lean) * (1 - Math.exp(-dt / 0.07));
    } else {
      t.flying += dt;
      t.vy -= GRAVITY * dt;
      t.y += t.vy * dt;
      t.s += t.vx * dt;
      t.lean += (Math.atan2(t.vy, t.vx) * 0.45 - t.lean) * (1 - Math.exp(-dt / 0.2));
      const under = ground(t.s);
      if (t.y <= under) {
        t.y = under;
        if (t.flying > 0.25) {
          t.squash = 1;
          puff(7);
          sound.tick();
        }
        t.flying = 0;
        t.vy = 0;
      }
    }
    t.spin += (t.vx * dt) / 0.34;
    if (!t.flying && t.v > 5 && Math.random() < dt * 9) puff(1);
    t.cam += (ground(t.s) - t.cam) * (1 - Math.exp(-dt / 0.45));
    zikr();

    // Stars, each one in a row a little higher than the last.
    for (const star of t.stars) {
      if (star.got) {
        star.got += dt;
        continue;
      }
      if (Math.abs(star.s - t.s) > 0.95 || Math.abs(star.h - t.y - 0.7) > 1.15) continue;
      star.got = 0.001;
      t.streak = t.t - t.picked < 2.5 ? t.streak + 1 : 0;
      t.picked = t.t;
      t.earned += 1;
      stars += 1;
      shown = stars;
      showCount();
      beep('pop', t.streak);
    }

    // The motor is light: a hum with the pedal, more on a climb, most in the air.
    beep('engine', t.flying ? 0.8 : gas ? (m > 0.15 ? 0.55 : 0.2) : 0.06, t.v / PACE.max + (t.flying ? 0.5 : 0));
    const part = Math.round(clamp(t.s / L, 0, 1) * 200) / 2;
    if (part !== t.shown) {
      t.shown = part;
      $('trip').style.setProperty('--part', `${part}%`);
    }
    root.classList.toggle('gas', gas);
    if (ending && t.v < 0.35 && L - t.s < 0.6) {
      t.v = 0;
      $('zikr').hidden = true;
      arrive(anchor, base - unit * 1.6);
    }
  }

  /* Drawing. Across the screen, something at s sits at X(s); a height h sits at Y(h). */
  const X = (s) => anchor - (s - trip.s) * unit;
  const Y = (h) => base - (h - trip.cam) * unit;

  function blob(x, y, w, h) {
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function sky() {
    const tint = ctx.createLinearGradient(0, 0, 0, base);
    tint.addColorStop(0, '#9CC3E0');
    tint.addColorStop(1, '#EFE2C4');
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, width, height);
    const sunX = width * 0.3;
    const sunY = height * 0.17;
    const r = unit * 0.75;
    ctx.fillStyle = 'rgba(255,221,120,.35)';
    blob(sunX, sunY, r * 1.7, r * 1.7);
    ctx.fillStyle = '#FFD45C';
    blob(sunX, sunY, r, r);
    // Clouds drift across; the sun shows while none is in front of it.
    let covered = 0;
    for (const cloud of trip.clouds) {
      const x = (cloud.at - 0.45) * width * 1.25;
      const y = height * cloud.y;
      const w = unit * 2.1 * cloud.size;
      covered = Math.max(covered, clamp(1.3 - Math.abs(x - sunX) / (w * 0.95), 0, 1));
      ctx.fillStyle = 'rgba(255,255,255,.96)';
      blob(x, y, w, unit * 0.62 * cloud.size);
      blob(x - w * 0.45, y + unit * 0.18 * cloud.size, w * 0.6, unit * 0.46 * cloud.size);
      blob(x + w * 0.42, y + unit * 0.2 * cloud.size, w * 0.66, unit * 0.5 * cloud.size);
      ctx.fillStyle = 'rgba(214,222,232,.9)';
      blob(x + w * 0.05, y + unit * 0.42 * cloud.size, w * 0.78, unit * 0.26 * cloud.size);
    }
    trip.light += (1 - covered - trip.light) * 0.05;
  }

  /* A far row of rocky peaks and a nearer row of dunes, each sliding slower than the ground. */
  function ridge(pace, color, shape) {
    const shift = trip.s * pace;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width + unit; x += unit * 0.5) {
      const at = (width - x) / unit + shift;
      ctx.lineTo(x, base - unit * shape(at));
    }
    ctx.lineTo(width + unit, height);
    ctx.closePath();
    ctx.fill();
  }
  const peaks = (at) => 2.3 + Math.abs(((at * 0.37) % 2) - 1) * 2.6 + Math.abs(((at * 0.93 + 0.4) % 2) - 1) * 1.1;
  const dunes = (at) => 1.1 + Math.sin(at * 0.5) * 0.5 + Math.sin(at * 0.21 + 1) * 0.6;

  function star(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const q = i % 2 ? r * 0.46 : r;
      ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    }
    ctx.closePath();
    ctx.fillStyle = '#F7C948';
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.strokeStyle = '#A9603A';
    ctx.stroke();
  }

  /* The bike and its rider, heading left: a grown-up in a helmet, so no face is drawn. */
  function bike(x, y, lean, spin, squash) {
    const u = unit;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean);
    ctx.scale(1, 1 - squash * 0.12);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2B1F16';
    for (const wx of [-0.56, 0.52]) {
      ctx.lineWidth = u * 0.05;
      ctx.fillStyle = '#2B2622';
      blob(wx * u, -0.34 * u, 0.34 * u, 0.34 * u);
      ctx.fillStyle = '#C9A063';
      blob(wx * u, -0.34 * u, 0.13 * u, 0.13 * u);
      ctx.strokeStyle = '#8C6A4C';
      ctx.lineWidth = u * 0.035;
      for (let k = 0; k < 3; k++) {
        const a = spin + (k * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(wx * u - Math.cos(a) * 0.3 * u, -0.34 * u - Math.sin(a) * 0.3 * u);
        ctx.lineTo(wx * u + Math.cos(a) * 0.3 * u, -0.34 * u + Math.sin(a) * 0.3 * u);
        ctx.stroke();
      }
      ctx.strokeStyle = '#2B1F16';
    }
    ctx.lineWidth = u * 0.05;
    ctx.fillStyle = '#D4533A';
    ctx.beginPath(); // the body, from the front fender to the rear rack
    ctx.moveTo(-0.92 * u, -0.6 * u);
    ctx.quadraticCurveTo(-0.6 * u, -0.98 * u, -0.2 * u, -0.86 * u);
    ctx.lineTo(0.2 * u, -0.9 * u);
    ctx.quadraticCurveTo(0.7 * u, -1 * u, 0.95 * u, -0.62 * u);
    ctx.lineTo(0.6 * u, -0.6 * u);
    ctx.quadraticCurveTo(0.5 * u, -0.74 * u, 0.3 * u, -0.6 * u);
    ctx.lineTo(-0.3 * u, -0.56 * u);
    ctx.quadraticCurveTo(-0.56 * u, -0.8 * u, -0.78 * u, -0.56 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3A3A3A'; // the seat
    ctx.beginPath();
    ctx.ellipse(0.22 * u, -0.95 * u, 0.36 * u, 0.09 * u, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath(); // the handlebar
    ctx.moveTo(-0.4 * u, -0.9 * u);
    ctx.lineTo(-0.52 * u, -1.28 * u);
    ctx.stroke();
    ctx.fillStyle = '#24323F'; // the rider's leg
    ctx.beginPath();
    ctx.moveTo(0.3 * u, -1.02 * u);
    ctx.lineTo(-0.1 * u, -0.98 * u);
    ctx.lineTo(-0.16 * u, -0.6 * u);
    ctx.lineTo(0.02 * u, -0.6 * u);
    ctx.lineTo(0.06 * u, -0.86 * u);
    ctx.lineTo(0.36 * u, -0.88 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3E76C2'; // the body, leaning to the bar
    ctx.beginPath();
    ctx.moveTo(0.4 * u, -1 * u);
    ctx.quadraticCurveTo(0.34 * u, -1.6 * u, -0.02 * u, -1.72 * u);
    ctx.lineTo(-0.2 * u, -1.56 * u);
    ctx.quadraticCurveTo(0.04 * u, -1.36 * u, 0.04 * u, -1 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = u * 0.13; // the arm
    ctx.strokeStyle = '#2B1F16';
    ctx.beginPath();
    ctx.moveTo(-0.06 * u, -1.56 * u);
    ctx.lineTo(-0.48 * u, -1.3 * u);
    ctx.stroke();
    ctx.lineWidth = u * 0.085;
    ctx.strokeStyle = '#3E76C2';
    ctx.stroke();
    ctx.strokeStyle = '#2B1F16';
    ctx.lineWidth = u * 0.05;
    ctx.fillStyle = '#F4F1EA'; // the helmet, with a dark visor
    blob(-0.16 * u, -1.9 * u, 0.25 * u, 0.25 * u);
    ctx.stroke();
    ctx.fillStyle = '#24323F';
    ctx.beginPath();
    ctx.ellipse(-0.27 * u, -1.88 * u, 0.13 * u, 0.1 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    if (!trip) return;
    const t = trip;
    const L = t.road.length;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sky();
    ridge(0.12, '#B79A80', peaks);
    ridge(0.35, '#DDBA85', dunes);

    // The sand, sampled across the screen from the far side to the near.
    const from = t.s - (width - anchor) / unit - 1;
    const to = t.s + anchor / unit + 1;
    ctx.beginPath();
    ctx.moveTo(X(to), height + 4);
    for (let s = to; s >= from; s -= 0.2) ctx.lineTo(X(s), Y(ground(s)));
    ctx.lineTo(X(from), height + 4);
    ctx.closePath();
    ctx.fillStyle = '#EACB93';
    ctx.fill();
    ctx.lineWidth = Math.max(2, unit * 0.07);
    ctx.strokeStyle = '#C9A063';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let s = to; s >= from; s -= 0.2) ctx.lineTo(X(s), Y(ground(s)));
    ctx.stroke();
    ctx.lineWidth = Math.max(1, unit * 0.03);
    ctx.strokeStyle = 'rgba(169,128,72,.5)';
    for (let s = Math.ceil(from / 1.6) * 1.6; s < to; s += 1.6) {
      const y = Y(ground(s)) + unit * (0.35 + ((s * 7) % 3) * 0.3);
      ctx.beginPath();
      ctx.moveTo(X(s), y);
      ctx.quadraticCurveTo(X(s + 0.3), y - unit * 0.07, X(s + 0.6), y);
      ctx.stroke();
    }
    ctx.fillStyle = '#A68A6D';
    for (const rock of t.rocks) {
      if (rock.s < from || rock.s > to) continue;
      blob(X(rock.s), Y(ground(rock.s)) + unit * rock.size * 0.15, unit * rock.size, unit * rock.size * 0.6);
    }

    // The oasis at the end: water, palms and a tent.
    if (L + 8 > from && L - 2 < to) {
      const floor = Y(ground(L + 3));
      ctx.fillStyle = '#62B2DE';
      blob(X(L + 4.6), floor + unit * 0.22, unit * 1.9, unit * 0.3);
      const palm = raster('palm');
      if (palm) {
        for (const [at, tall] of [[2.3, 3.4], [6.4, 4], [7.6, 3]]) ctx.drawImage(palm, X(L + at) - (tall * unit * SPRITES.palm) / 2, floor - tall * unit, tall * unit * SPRITES.palm, tall * unit);
      }
      const tx = X(L + 3.6);
      ctx.lineWidth = unit * 0.05;
      ctx.strokeStyle = '#2B1F16';
      ctx.fillStyle = '#F4F1EA';
      ctx.beginPath();
      ctx.moveTo(tx - unit * 1.5, floor);
      ctx.lineTo(tx, floor - unit * 1.7);
      ctx.lineTo(tx + unit * 1.5, floor);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#A9603A';
      ctx.beginPath();
      ctx.moveTo(tx - unit * 0.32, floor);
      ctx.lineTo(tx, floor - unit * 0.95);
      ctx.lineTo(tx + unit * 0.32, floor);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    for (const one of t.stars) {
      if (one.s < from || one.s > to || one.got > 0.25) continue;
      const gone = one.got / 0.25;
      ctx.globalAlpha = 1 - gone;
      star(X(one.s), Y(one.h) - Math.sin(t.t * 4 + one.s) * unit * 0.04, unit * 0.3 * (1 + gone * 1.2));
      ctx.globalAlpha = 1;
    }

    // The bike's shadow on the sand, its dust, and the bike.
    ctx.fillStyle = `rgba(90,60,20,${t.flying ? 0.14 : 0.22})`;
    blob(X(t.s), Y(ground(t.s)) + unit * 0.04, unit * 0.95, unit * 0.12);
    for (const bit of t.dust) {
      ctx.fillStyle = `rgba(214,184,132,${0.6 * (1 - bit.age / 0.7)})`;
      blob(X(bit.s - bit.back * bit.age), Y(bit.h + bit.up * bit.age), unit * (0.12 + bit.age * 0.35), unit * (0.12 + bit.age * 0.35));
    }
    bike(X(t.s), Y(t.y), t.lean, t.spin, t.squash);

    // The sun out from behind the clouds warms the whole picture a little.
    if (t.light > 0.02) {
      ctx.fillStyle = `rgba(255,232,160,${(t.light * 0.14).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  return { make, layout, update, draw };
})();
