/* الْمِيزَانُ, the balance, the second game on the lab's door (balance.html).
   The engine (weights, the beam's tilt and spring, the forty levels) is in
   js/balance-engine.js; this file draws, listens and saves.

   The second version (2026-11-27), after the father's review of the first:
   every cup the same and full, the goal of every level to make the two trays
   balance, the same moves everywhere (any cup from the shelf or either tray
   to the shelf or either tray), every cup moving the beam a little, and on
   each tray the number of cups it holds, seen and not said.

   The scene is one canvas: a plain wall and table drawn here, the modern pan
   balance from Recraft cut into its stand, its beam and its tray
   (recraft/balance-raw/v2/cut-parts.js), and the cups and their water drawn
   here. The beam turns about its pivot; each tray stands level on its post
   at the beam's end, so its cups ride up and down with it. Lengths are in
   the balance picture's pixels ("units"), scaled to the screen by L.s. */
(() => {
  const E = balanceEngine;
  const $ = (id) => document.getElementById(id);
  const KEY = 'balance';
  const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

  /* What the child sees and hears; drafts until the parents approve them. */
  const TEXT = {
    line: { text: 'اِجْعَلِ الْكِفَّتَيْنِ مُتَسَاوِيَتَيْنِ', clip: 'balance-line' },
    equal: { text: 'تَسَاوَتِ الْكِفَّتَانِ', clip: 'balance-equal' },
    praise: { text: 'أحسنت', clip: 'well-done' },
  };

  /* The pictures, and the points on them, measured with a grid. */
  const PIC = {
    stand: { src: 'images/balance/stand.webp', w: 455, h: 284, px: 227, py: 5 }, // the pivot; the base's bottom at 281 (the column cut 90 shorter)
    beam: { src: 'images/balance/beam.webp', w: 1046, h: 94, px: 522, py: 61 },
    tray: { src: 'images/balance/tray.webp', w: 405, h: 137, post: [203, 136], mid: 201.5, half: 195, front: 23 },
  };
  const POSTS = { L: [-359, -27], R: [359.5, -27] }; // from the pivot, where each tray's post stands on the beam
  const BASE = 276; // from the pivot down to the bottom of the stand
  const CUP = 66; // a cup's width
  const TOP_RY = 26; // the tray's top, an oval seen a little from above
  const FRONT = 6; // the front row of cups stands this far behind the tray's front edge,
  const BACK = 46; // the row behind this far, so that more of it shows above the front row
  const SHELF = { y: 340, perRow: 8 }; // the shelf of spare cups: its cups' bottoms, below the pivot
  const WIDE = 1150;

  const FLY = 0.4; // seconds for a cup to go to its place
  const TAP = 10; // CSS pixels: a finger that moves less taps
  const NEXT = 900; // ms from the words to the next level

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const INDIC = '٠١٢٣٤٥٦٧٨٩';
  const indic = (n) => String(n).replace(/\d/g, (d) => INDIC[d]);

  /* Kept on the device: the level reached, the levels balanced, and whether
     the last was ever balanced. */
  function load() {
    try {
      const kept = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (kept && kept.v === 2) return kept;
    } catch {
      // Unreadable: start clean.
    }
    return { v: 2, at: 0, won: [], done: false };
  }
  function keep(change) {
    const kept = { ...load(), ...change };
    try {
      localStorage.setItem(KEY, JSON.stringify(kept));
    } catch {
      // Private browsing: nothing is kept.
    }
    return kept;
  }

  const images = {};
  for (const [name, pic] of Object.entries(PIC)) {
    const image = new Image();
    image.src = pic.src;
    images[name] = image;
  }
  const drawn = (name) => images[name] && images[name].complete && images[name].naturalWidth > 0;
  // The numbers on the trays are drawn in the site's font, once it is there.
  if (document.fonts && document.fonts.load) document.fonts.load('700 40px "Noto Naskh Arabic"', '٠١٢٣٤٥٦٧٨٩').catch(() => {});

  const canvas = $('scene');
  const g = canvas.getContext('2d');
  let L = null;

  /* The state */

  const levels = E.LEVELS;
  let at = 0;
  let level = null;
  let cups = []; // { id, kind, where: 'L' | 'R' | 'S', landed, x, y, fly, bounce }
  let places = { L: [], R: [], S: [] }; // the cups in each place, in order
  let beam = { a: 0, v: 0 };
  let held = null; // { cup, from, dx, dy, fx, fy }
  let press = null;
  let phase = 'idle'; // 'play', 'won', 'idle'
  let moves = 0;
  let sparkles = [];
  let token = 0;
  let saidLine = false;
  let nextId = 1;

  /* Layout: the balance as large as the paper lets it be, with room above
     each tray for its cups when it rises (more when double cups can stand
     there), and the shelf of spare cups in front of the stand. */
  function layout() {
    const slot = $('slot');
    const W = slot.clientWidth;
    const H = slot.clientHeight;
    if (!W || !H) return null;
    const doubles = level && level.left.concat(level.right, level.shelf).includes('d');
    const above = doubles ? 480 : 380;
    const below = SHELF.y + 14;
    const s = Math.min((H - 10) / (above + below), (W - 12) / WIDE, 1.3);
    const py = (H - (above + below) * s) / 2 + above * s;
    return { W, H, s, px: W / 2, py, c: CUP * s, table: py + (BASE - 70) * s };
  }

  function resize() {
    const next = layout();
    if (!next) return;
    L = next;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(L.W * dpr);
    canvas.height = Math.round(L.H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const sizeOf = (cup) => ({ w: L.c, h: L.c * E.CUPS[cup.kind].h });

  /* Where things are, this frame */

  function postAt(side) {
    const [x, y] = POSTS[side];
    const cos = Math.cos(beam.a);
    const sin = Math.sin(beam.a);
    return { x: L.px + (x * cos - y * sin) * L.s, y: L.py + (x * sin + y * cos) * L.s };
  }
  /* A tray: its post's foot, the middle of its top's front edge, its half width. */
  function trayAt(side) {
    const post = postAt(side);
    const s = L.s;
    const x = post.x + (PIC.tray.mid - PIC.tray.post[0]) * s;
    return { post, x, front: post.y + (PIC.tray.front - PIC.tray.post[1]) * s, half: PIC.tray.half * s };
  }
  function spotsOf(where) {
    const list = places[where];
    if (where === 'S') return shelfSpots(list.length);
    const tray = trayAt(where);
    return E.arrange(list.length).map((spot) => ({ x: tray.x + spot.x * L.c, y: tray.front - (spot.row ? BACK : FRONT) * L.s, row: spot.row }));
  }
  /* The shelf: a row of up to eight, then a second row behind it. */
  function shelfSpots(count) {
    const spots = [];
    const bottom = L.py + SHELF.y * L.s;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / SHELF.perRow);
      const inRow = Math.min(SHELF.perRow, count - row * SHELF.perRow);
      const k = i - row * SHELF.perRow;
      spots.push({ x: L.px + ((inRow - 1) / 2 - k) * L.c * 1.18, y: bottom - row * L.c * 0.5, row });
    }
    return spots;
  }
  function spotOf(cup) {
    const i = places[cup.where].indexOf(cup);
    return spotsOf(cup.where)[i];
  }
  function shelfBox() {
    const inRow = Math.min(SHELF.perRow, Math.max(places.S.length, 3));
    const w = (inRow * 1.18 + 0.5) * L.c;
    return { x: L.px - w / 2, y: L.py + SHELF.y * L.s - L.c * 0.06, w, h: L.c * 0.2 };
  }

  const weightOf = (side) => places[side].filter((cup) => cup.landed).reduce((sum, cup) => sum + E.CUPS[cup.kind].weight, 0);
  const diffNow = () => weightOf('R') - weightOf('L');
  const kinds = (side) => places[side].filter((cup) => cup.landed).map((cup) => cup.kind);

  /* Opening a level */

  function openLevel(index) {
    token += 1;
    at = clamp(index, 0, levels.length - 1);
    level = levels[at];
    keep({ at });
    cups = [];
    places = { L: [], R: [], S: [] };
    for (const [where, list] of [['L', level.left], ['R', level.right], ['S', level.shelf]]) {
      for (const kind of list) {
        const cup = { id: nextId++, kind, where, landed: true, x: 0, y: 0, fly: null, bounce: 0 };
        places[where].push(cup);
        cups.push(cup);
      }
    }
    held = null;
    press = null;
    moves = 0;
    sparkles = [];
    phase = 'play';
    resize();
    // The beam starts where these cups put it.
    beam = { a: E.tilt(diffNow()), v: 0 };
    if (L) {
      for (const cup of cups) {
        const spot = spotOf(cup);
        cup.x = spot.x;
        cup.y = spot.y;
      }
    }
    $('word').hidden = true;
    $('end').hidden = true;
    $('sheet').classList.remove('ended');
    showNav();
    showLine();
    if (!saidLine) {
      saidLine = true;
      sound.say(TEXT.line.clip);
    }
  }

  function showLine() {
    const line = $('line');
    sound.caption(line, TEXT.line.text, TEXT.line.clip).then(() => line.classList.remove('caption-wait'), () => line.classList.remove('caption-wait'));
    setTimeout(() => line.classList.remove('caption-wait'), 2500);
  }

  function showNav() {
    const kept = load();
    const marks = $('marks');
    if (marks.childElementCount !== levels.length) marks.replaceChildren(...levels.map(() => document.createElement('i')));
    [...marks.children].forEach((mark, i) => {
      mark.className = i === at ? 'now' : kept.won.includes(i) ? 'done' : '';
    });
    $('prev').disabled = at === 0;
    $('next').disabled = at === levels.length - 1;
  }

  /* Moving cups */

  /* A cup goes to a place and flies there; it weighs on a tray once it has landed. */
  function send(cup, where) {
    const from = places[cup.where];
    if (from.includes(cup)) from.splice(from.indexOf(cup), 1);
    places[where].push(cup);
    cup.where = where;
    cup.landed = false;
    cup.fly = { x0: cup.x, y0: cup.y, t: 0 };
  }
  function landed(cup) {
    cup.landed = true;
    cup.fly = null;
    if (cup.where === 'S') sound.tick();
    else {
      sound.tone(2500 + Math.random() * 400, 0, 0.16, 0.05);
      sound.tone(3800, 0.012, 0.1, 0.025);
    }
    check();
  }
  function check() {
    if (phase !== 'play' || held || cups.some((cup) => cup.fly)) return;
    if (E.balanced(kinds('L'), kinds('R'))) won();
  }

  /* Balanced: the numbers turn green, the chime, the water glints, the words,
     and the next level, as far ahead as the engine says. */
  async function won() {
    phase = 'won';
    const mine = token;
    sound.chime();
    sparkle();
    const word = $('word');
    word.hidden = false;
    sound.caption(word, TEXT.equal.text, TEXT.equal.clip);
    await Promise.all([sound.say(TEXT.equal.clip), wait(1800)]);
    if (mine !== token) return;
    const kept = load();
    const won = kept.won.includes(at) ? kept.won : kept.won.concat(at).sort((a, b) => a - b);
    const last = at === levels.length - 1;
    keep({ won, done: kept.done || last });
    showNav();
    await wait(last ? 300 : NEXT);
    if (mine !== token) return;
    if (last) theEnd();
    else openLevel(E.nextAfter(at, E.clean(level, moves)));
  }

  function sparkle() {
    const now = performance.now();
    for (const cup of cups) {
      if (cup.where === 'S') continue;
      for (let i = 0; i < 2; i++) sparkles.push({ cup, dx: (Math.random() - 0.5) * 0.6, t0: now + i * 180 + Math.random() * 250, life: 900 });
    }
  }

  async function theEnd() {
    token += 1;
    phase = 'idle';
    $('word').hidden = true;
    $('sheet').classList.add('ended');
    $('end').hidden = false;
    $('buttons').hidden = true;
    sound.caption($('praise'), TEXT.praise.text, TEXT.praise.clip);
    const mine = token;
    await Promise.race([sound.say(TEXT.praise.clip), wait(2500)]);
    if (mine === token) $('buttons').hidden = false;
  }

  /* Each frame: the cups follow their places or fly to them; the beam glides
     to the tilt the cups on the trays give it. */
  function step(dt) {
    for (const cup of cups) {
      if (cup.bounce > 0) cup.bounce = Math.max(0, cup.bounce - dt * 1.8);
      if (held && held.cup === cup) {
        cup.x += (held.fx + held.dx - cup.x) * Math.min(1, dt * 20);
        cup.y += (held.fy + held.dy - cup.y) * Math.min(1, dt * 20);
        continue;
      }
      const spot = spotOf(cup);
      if (!spot) continue;
      if (cup.fly) {
        cup.fly.t += dt / FLY;
        const t = ease(clamp(cup.fly.t, 0, 1));
        cup.x = cup.fly.x0 + (spot.x - cup.fly.x0) * t;
        cup.y = cup.fly.y0 + (spot.y - cup.fly.y0) * t - Math.sin(t * Math.PI) * L.c * 0.4;
        if (cup.fly.t >= 1) {
          cup.x = spot.x;
          cup.y = spot.y;
          landed(cup);
        }
      } else {
        // A settled cup follows its place: a tray rising or falling, a row closing up.
        cup.x += (spot.x - cup.x) * Math.min(1, dt * 16);
        cup.y += (spot.y - cup.y) * Math.min(1, dt * 16);
      }
    }
    E.swing(beam, E.tilt(diffNow()), dt);
    sparkles = sparkles.filter((one) => performance.now() - one.t0 < one.life);
  }

  /* Drawing */

  function render() {
    const { W, H, s } = L;
    // The wall and the table: plain, so nothing stands near the trays but the cups.
    const wall = g.createLinearGradient(0, 0, 0, L.table);
    wall.addColorStop(0, '#F7F3EC');
    wall.addColorStop(1, '#EEE6D9');
    g.fillStyle = wall;
    g.fillRect(0, 0, W, L.table);
    const table = g.createLinearGradient(0, L.table, 0, H);
    table.addColorStop(0, '#E6D7C2');
    table.addColorStop(1, '#D9C6AA');
    g.fillStyle = table;
    g.fillRect(0, L.table, W, H - L.table);
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.fillRect(0, L.table, W, Math.max(1, 2 * s));
    // A soft shadow under the stand.
    g.fillStyle = 'rgba(60,50,40,.10)';
    g.beginPath();
    g.ellipse(L.px, L.py + (BASE - 4) * s, 240 * s, 18 * s, 0, 0, Math.PI * 2);
    g.fill();
    if (drawn('stand')) g.drawImage(images.stand, L.px - PIC.stand.px * s, L.py - PIC.stand.py * s, PIC.stand.w * s, PIC.stand.h * s);
    // The trays on their posts, then the beam over the posts' feet, then the cups and the numbers.
    for (const side of ['L', 'R']) drawTray(side);
    g.save();
    g.translate(L.px, L.py);
    g.rotate(beam.a);
    if (drawn('beam')) g.drawImage(images.beam, -PIC.beam.px * s, -PIC.beam.py * s, PIC.beam.w * s, PIC.beam.h * s);
    g.restore();
    for (const side of ['L', 'R']) drawCupsOn(side);
    for (const side of ['L', 'R']) drawNumber(side);
    // The shelf of spare cups, in front.
    drawShelf();
    const onShelf = places.S.filter((cup) => !cup.fly && !(held && held.cup === cup));
    for (const row of [1, 0]) for (const cup of onShelf) if ((spotOf(cup) || {}).row === row) drawCup(cup);
    // What moves or is carried, over everything.
    for (const cup of cups) if (cup.fly || (held && held.cup === cup)) drawCup(cup);
    drawSparkles();
  }

  function drawTray(side) {
    const s = L.s;
    const tray = trayAt(side);
    if (drawn('tray')) g.drawImage(images.tray, tray.post.x - PIC.tray.post[0] * s, tray.post.y - PIC.tray.post[1] * s, PIC.tray.w * s, PIC.tray.h * s);
    // Its flat top, an oval seen a little from above, where the cups stand.
    const ry = TOP_RY * s;
    const top = g.createLinearGradient(0, tray.front - 2 * ry, 0, tray.front);
    top.addColorStop(0, '#E9EEF0');
    top.addColorStop(1, '#FBFCFC');
    g.fillStyle = top;
    g.beginPath();
    g.ellipse(tray.x, tray.front - ry, tray.half, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(42,140,150,.55)';
    g.lineWidth = Math.max(1, 2.2 * s);
    g.stroke();
  }

  function drawCupsOn(side) {
    const on = places[side].filter((cup) => !cup.fly && !(held && held.cup === cup));
    const spots = spotsOf(side);
    for (const row of [1, 0]) {
      for (const cup of on) {
        const spot = spots[places[side].indexOf(cup)];
        if (spot && spot.row === row) drawCup(cup);
      }
    }
  }

  /* The number of cups on a tray (a double counts two), on the tray's front;
     green while the two are balanced. */
  function drawNumber(side) {
    const s = L.s;
    const tray = trayAt(side);
    const n = weightOf(side);
    const x = tray.x;
    const y = tray.front + 30 * s;
    const r = 27 * s;
    const w = r * (n >= 10 ? 2.9 : 2.1);
    const on = phase === 'won';
    g.save();
    g.fillStyle = on ? '#35A85A' : '#FFFFFF';
    g.strokeStyle = on ? '#2A8A49' : 'rgba(30,114,104,.5)';
    g.lineWidth = Math.max(1, 2 * s);
    g.beginPath();
    g.roundRect(x - w / 2, y - r, w, r * 2, r);
    g.fill();
    g.stroke();
    g.fillStyle = on ? '#FFFFFF' : '#1E7268';
    g.font = `700 ${Math.round(40 * s)}px "Noto Naskh Arabic", "Geeza Pro", serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(indic(n), x, y + 3 * s);
    g.restore();
  }

  function drawShelf() {
    const box = shelfBox();
    const s = L.s;
    g.save();
    g.fillStyle = 'rgba(60,50,40,.10)';
    g.beginPath();
    g.ellipse(box.x + box.w / 2, box.y + box.h + 4 * s, box.w / 2, 8 * s, 0, 0, Math.PI * 2);
    g.fill();
    const grad = g.createLinearGradient(0, box.y, 0, box.y + box.h);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(1, '#DCE3E6');
    g.fillStyle = grad;
    g.strokeStyle = 'rgba(42,140,150,.55)';
    g.lineWidth = Math.max(1, 2 * s);
    g.beginPath();
    g.roundRect(box.x, box.y, box.w, box.h, box.h / 2);
    g.fill();
    g.stroke();
    g.restore();
  }

  /* A cup, the middle of its bottom at (cup.x, cup.y): clear glass, full of
     water. A double cup is the same cup twice as tall, with a white line
     round its middle where one cup's worth ends. */
  function drawCup(cup) {
    const { w, h } = sizeOf(cup);
    const x = cup.x;
    const y = cup.y - (cup.bounce > 0 ? Math.abs(Math.sin(cup.bounce * Math.PI * 2)) * L.c * 0.15 : 0);
    const top = w / 2;
    const bot = w * 0.43;
    const ry = w * 0.13;
    const by = bot * 0.26;
    g.save();
    g.translate(x, y);
    // Its shadow on what it stands on.
    if (!cup.fly && !(held && held.cup === cup)) {
      g.fillStyle = 'rgba(20,50,60,.12)';
      g.beginPath();
      g.ellipse(0, 0, bot * 1.15, by * 1.2, 0, 0, Math.PI * 2);
      g.fill();
    }
    // The glass.
    g.fillStyle = 'rgba(255,255,255,.4)';
    g.beginPath();
    g.moveTo(-bot, 0);
    g.lineTo(-top, -h);
    g.ellipse(0, -h, top, ry, 0, Math.PI, 0, true);
    g.lineTo(bot, 0);
    g.ellipse(0, 0, bot, by, 0, 0, Math.PI);
    g.fill();
    // The water, nearly to the brim.
    const f = cup.kind === 'd' ? 0.94 : 0.88;
    const level = -h * f;
    const half = bot + (top - bot) * f;
    const water = g.createLinearGradient(0, level, 0, 0);
    water.addColorStop(0, '#4DB8EA');
    water.addColorStop(1, '#2186CC');
    g.fillStyle = water;
    g.beginPath();
    g.moveTo(-bot * 0.95, -h * 0.04);
    g.lineTo(-half * 0.95, level);
    g.ellipse(0, level, half * 0.95, ry * (half / top), 0, Math.PI, 0, true);
    g.lineTo(bot * 0.95, -h * 0.04);
    g.ellipse(0, -h * 0.04, bot * 0.95, by, 0, 0, Math.PI);
    g.fill();
    g.fillStyle = '#A8E2F8';
    g.beginPath();
    g.ellipse(0, level, half * 0.95, ry * (half / top), 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(33,134,204,.55)';
    g.lineWidth = Math.max(1, w * 0.02);
    g.stroke();
    if (cup.kind === 'd') {
      const mid = -h / 2;
      const hw = bot + (top - bot) * 0.5;
      g.strokeStyle = 'rgba(255,255,255,.95)';
      g.lineWidth = Math.max(1.5, w * 0.045);
      g.beginPath();
      g.ellipse(0, mid, hw * 0.97, ry * (hw / top), 0, 0, Math.PI);
      g.stroke();
    }
    // The glass's thick foot, its edges and rim, and the light on it.
    g.fillStyle = 'rgba(214,234,242,.9)';
    g.beginPath();
    g.ellipse(0, -h * 0.02, bot * 0.97, by * 1.05, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(120,160,178,.85)';
    g.lineWidth = Math.max(1, w * 0.025);
    g.beginPath();
    g.moveTo(-top, -h);
    g.lineTo(-bot, 0);
    g.ellipse(0, 0, bot, by, 0, Math.PI, 0, true);
    g.lineTo(top, -h);
    g.stroke();
    g.beginPath();
    g.ellipse(0, -h, top, ry, 0, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = Math.max(1, w * 0.02);
    g.beginPath();
    g.ellipse(0, -h, top * 0.9, ry * 0.7, 0, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.7)';
    g.lineWidth = Math.max(1.5, w * 0.07);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-top * 0.64, -h * 0.85);
    g.lineTo(-bot * 0.68, -h * 0.15);
    g.stroke();
    g.restore();
  }

  function drawSparkles() {
    const now = performance.now();
    for (const one of sparkles) {
      const t = (now - one.t0) / one.life;
      if (t < 0 || t > 1) continue;
      const { w, h } = sizeOf(one.cup);
      const f = one.cup.kind === 'd' ? 0.94 : 0.88;
      const x = one.cup.x + one.dx * w;
      const y = one.cup.y - h * f - t * L.c * 0.4;
      const r = L.c * 0.13 * Math.sin(t * Math.PI);
      g.save();
      g.translate(x, y);
      g.fillStyle = `rgba(255,252,225,${0.95 * Math.sin(t * Math.PI)})`;
      g.beginPath();
      for (let k = 0; k < 8; k++) {
        const rr = k % 2 ? r * 0.3 : r;
        const a = (k * Math.PI) / 4;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
      g.restore();
    }
  }

  /* Touch: any cup, from anywhere to anywhere. */

  function pointAt(event) {
    const box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }
  function cupAt(p) {
    if (phase !== 'play') return null;
    let best = null;
    for (const cup of cups) {
      if (cup.fly) continue;
      const { w, h } = sizeOf(cup);
      const pad = Math.max(8, 26 - w * 0.2);
      if (p.x < cup.x - w / 2 - pad || p.x > cup.x + w / 2 + pad || p.y < cup.y - h - pad || p.y > cup.y + pad) continue;
      const d = Math.hypot(p.x - cup.x, p.y - (cup.y - h / 2));
      if (!best || d < best.d) best = { cup, d };
    }
    return best && best.cup;
  }
  /* Where a cup let go at p belongs: a tray it is over, else the shelf when
     it is low, else nowhere (it goes back). */
  function dropAt(p) {
    for (const side of ['L', 'R']) {
      const tray = trayAt(side);
      if (Math.abs(p.x - tray.x) < tray.half + 30 * L.s && p.y > tray.front - 340 * L.s && p.y < tray.front + 90 * L.s) return side;
    }
    if (p.y > L.table - 40 * L.s) return 'S';
    return null;
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!L || held || press) return;
    sound.unlock();
    const p = pointAt(event);
    const cup = cupAt(p);
    if (!cup) return;
    event.preventDefault();
    try { canvas.setPointerCapture(event.pointerId); } catch { /* fine */ }
    press = { id: event.pointerId, x: p.x, y: p.y, cup, touch: event.pointerType !== 'mouse', moved: false };
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!press || event.pointerId !== press.id) return;
    const p = pointAt(event);
    if (!press.moved && Math.hypot(p.x - press.x, p.y - press.y) > TAP) {
      if (phase !== 'play') return;
      press.moved = true;
      // Picked up: it no longer weighs on its tray. On glass it rides above the finger.
      const cup = press.cup;
      const lift = press.touch ? L.c * 0.75 : 0;
      held = { cup, from: cup.where, fx: p.x, fy: p.y, dx: cup.x - press.x, dy: cup.y - press.y - lift };
      cup.landed = false;
      canvas.classList.add('held');
    }
    if (held) {
      held.fx = p.x;
      held.fy = p.y;
    }
  });
  const release = (event) => {
    if (!press || event.pointerId !== press.id) return;
    const p = pointAt(event);
    const was = press;
    press = null;
    canvas.classList.remove('held');
    if (!was.moved || !held) {
      // A tap only makes the cup hop: cups are moved by dragging them.
      was.cup.bounce = 1;
      return;
    }
    const cup = held.cup;
    const from = held.from;
    held = null;
    const middle = { x: cup.x, y: cup.y - sizeOf(cup).h / 2 };
    let where = dropAt(middle) || dropAt(p);
    if (where && where !== from && where !== 'S' && places[where].length >= E.SLOTS) where = null;
    if (!where || where === from) {
      // Back to its own place, which it kept.
      cup.landed = false;
      cup.fly = { x0: cup.x, y0: cup.y, t: 0 };
      return;
    }
    moves += 1;
    send(cup, where);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  /* The loop */
  let last = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (L && level && $('sheet').dataset.view === 'game') {
      step(dt);
      render();
    }
    requestAnimationFrame(frame);
  }

  /* The ayah that opens every visit (quran/rahman-9.json, from the Quran.com
     API through tools/make-balance-ayah.py), read by a parent. */
  function showAyah() {
    fetch('quran/rahman-9.json').then((r) => r.json()).then((data) => {
      const ayah = $('ayah');
      ayah.textContent = `${mushafText(data.words.join(' '))} `;
      const number = document.createElement('span');
      number.className = 'ayah-no';
      number.textContent = mushafText(data.ayah);
      ayah.append(number);
    }).catch(() => {});
  }

  function begin() {
    sound.unlock();
    $('sheet').dataset.view = 'game';
    requestAnimationFrame(() => openLevel(load().at));
  }

  $('begin').addEventListener('click', begin);
  $('line').addEventListener('click', () => sound.say(TEXT.line.clip));
  $('prev').addEventListener('click', () => openLevel(at - 1));
  $('next').addEventListener('click', () => openLevel(at + 1));
  $('replay').addEventListener('click', () => openLevel(at));
  $('again').addEventListener('click', () => {
    keep({ at: 0 });
    openLevel(0);
  });
  addEventListener('resize', () => {
    if ($('sheet').dataset.view === 'game') resize();
  });

  sound.uses(Object.values(TEXT).map((entry) => entry.clip));
  showAyah();
  requestAnimationFrame(frame);

  if (LOCAL) {
    window.balanceGame = {
      open: (i) => openLevel(i),
      begin,
      cups: () => cups.map((cup) => ({ id: cup.id, kind: cup.kind, where: cup.where, landed: cup.landed, x: Math.round(cup.x), y: Math.round(cup.y) })),
      weights: () => ({ L: weightOf('L'), R: weightOf('R') }),
      move: (id, where) => {
        const cup = cups.find((one) => one.id === id);
        if (cup && cup.where !== where) {
          moves += 1;
          send(cup, where);
        }
      },
      beam: () => beam.a,
      phase: () => phase,
      at: () => at,
      moves: () => moves,
      layout: () => L,
    };
  }
})();
