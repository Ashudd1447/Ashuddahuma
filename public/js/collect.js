/* «اِجْمَعْ وَعُدَّ» on the door فَكِّرْ: numbers, shapes, colors and sizes, as five
   little games that take turns. The father's requests (2026-11-26): start
   with "collect three circles", then "four red squares", from easy to
   hard; then harder; then, the same night, "it's not fun … Make it more fun
   for a 4 year old … Boring educational games don't help", no rounds like
   "three non-red circles", and never an attribute named that nothing on
   the screen differs in. The design is Claude's.

   The five (the rounds and their words are in collect-words.js):
   - train «اِجْمَعْ …»: shapes lie about; a train rolls in with a wagon per
     kind asked for, one empty seat per shape; a tap or a drag loads a
     shape and says its number; when every seat is full the train whistles
     and leaves.
   - count «كَمْ …؟» under a night sky: a tap lights a shape with its number;
     then the number among three.
   - catch «اِلْتَقِطْ …»: shapes rise in bubbles; a tap on one asked for pops
     it and its shape drops into the jar; the others float away and more
     come.
   - build «اِبْنِ …»: a picture in dashed outlines (a tree, a house, a car,
     ice cream, a boat, a rocket, a lantern, a masjid) is built from the
     shapes on the shelf, each dragged (or tapped, then its place tapped)
     to an outline of its shape and size; some on the shelf are the wrong
     size or shape. Whole, it comes alive: the car drives off, the rocket
     flies, the boat sails, the windows light.
   - compare «أَيُّهُمَا أَكْثَرُ / أَقَلُّ …؟» under the night sky: a tap marks
     the two kinds in two colors; then one of two pictures.
   A wrong tap wobbles with the soft buzzer, nothing lost. Whatever a round
   names (a shape, a color, a size), there are shapes on the screen that
   differ in just that, so every word counts (the father's first screenshot
   asked for large yellow triangles with no small one about).

   Skipping ahead: a round won with no mistake moves three rounds on among
   the first fifteen, two among the next fifteen, one after; a round with a
   mistake, one. The bar under the paper goes to the round before or after
   whatever happened, and the middle button plays this round again. The
   rounds won are kept on the device.

   think.html loads this file too, to draw the game's card on the door. */
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'collect';
  const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
  const WORDS = window.COLLECT_WORDS;
  const { COLORS } = WORDS;

  const TEXT = { praise: { text: 'أحسنت', clip: 'well-done' } };

  /* The shapes, in a box of 100, and the part of the box each fills. */
  const SHAPES = {
    circle: '<circle cx="50" cy="50" r="41"/>',
    square: '<rect x="11" y="11" width="78" height="78" rx="7"/>',
    triangle: '<path d="M50 9L92 87H8Z"/>',
    star: `<path d="${starPath(50, 54, 46, 19)}"/>`,
    heart: '<path d="M50 88C22 68 7 51 9 33C11 16 33 8 50 27C67 8 89 16 91 33C93 51 78 68 50 88Z"/>',
    crescent: '<path d="M76 12A40 40 0 1 0 76 88A30 38 0 0 1 76 12Z"/>',
    rectangle: '<rect x="5" y="25" width="90" height="50" rx="6"/>',
  };
  const SHAPE_BOX = { circle: [9, 9, 91, 91], square: [11, 11, 89, 89], triangle: [8, 9, 92, 87], star: [6, 8, 94, 92], heart: [8, 8, 92, 88], crescent: [10, 12, 76, 88], rectangle: [5, 25, 95, 75] };
  function starPath(cx, cy, outer, inner) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? inner : outer;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
    }
    return `${d}Z`;
  }
  /* The colors: the six of the words, and a few more for the pictures. */
  const PAINT = {
    ...COLORS,
    brown: { fill: '#A0673A', edge: '#6B4220' },
    cream: { fill: '#F3E2B8', edge: '#A98A50' },
    dark: { fill: '#4A4F5C', edge: '#24272F' },
    pink: { fill: '#F49AC1', edge: '#C25E8C' },
    white: { fill: '#FBFBF7', edge: '#9AA1AB' },
    sky: { fill: '#9AD0F5', edge: '#4B8FC2' },
  };
  const inner = (shape, paint) => `<g transform="translate(2.5 4)" fill="#3B2A18" opacity=".14">${SHAPES[shape]}</g>`
    + `<g fill="${PAINT[paint].fill}" stroke="${PAINT[paint].edge}" stroke-width="5" stroke-linejoin="round">${SHAPES[shape]}</g>`;
  /* A shape's drawing: its box of 100 is 100/112 of the drawing. */
  const shapeSvg = (shape, paint) => `<svg viewBox="-6 -6 112 112" aria-hidden="true">${inner(shape, paint)}</svg>`;
  const BOX = 112 / 100;
  const GREY = { fill: '#C9CFD6', edge: '#7C8792' };

  /* The pictures to build: each piece is a shape, its box's middle (x, y),
     its size s (the box's side), its turn and its paint, in drawing order.
     anim: how the whole picture comes alive. */
  const PICTURES = {
    tree: { anim: 'pop', pieces: [
      ['rectangle', 50, 82, 44, 90, 'brown'], ['circle', 50, 40, 76, 0, 'green'],
      ['circle', 36, 36, 16, 0, 'red'], ['circle', 63, 50, 16, 0, 'red'],
    ] },
    house: { anim: 'shine', pieces: [
      ['square', 50, 78, 64, 0, 'cream'], ['triangle', 50, 26.9, 76, 0, 'red'],
      ['rectangle', 50, 89.5, 30, 90, 'brown'], ['square', 35, 66, 16, 0, 'sky'], ['square', 65, 66, 16, 0, 'sky'],
    ] },
    car: { anim: 'drive', pieces: [
      ['rectangle', 50, 25, 56, 0, 'sky'], ['rectangle', 50, 60, 100, 0, 'red'],
      ['circle', 27, 85, 30, 0, 'dark'], ['circle', 73, 85, 30, 0, 'dark'],
    ] },
    icecream: { anim: 'pop', pieces: [
      ['triangle', 50, 78, 56, 180, 'orange'], ['circle', 50, 48, 50, 0, 'pink'],
      ['circle', 50, 22, 40, 0, 'yellow'], ['circle', 55, 1, 14, 0, 'red'],
    ] },
    boat: { anim: 'sail', pieces: [
      ['triangle', 44, 33, 62, 0, 'white'], ['triangle', 72, 45, 36, 0, 'red'],
      ['rectangle', 50, 82, 80, 0, 'brown'], ['triangle', 50, 2, 16, 90, 'green'],
    ] },
    rocket: { anim: 'launch', pieces: [
      ['triangle', 27, 84, 30, 0, 'red'], ['triangle', 73, 84, 30, 0, 'red'],
      ['rectangle', 50, 60, 70, 90, 'white'], ['triangle', 50, 13, 42, 0, 'red'], ['circle', 50, 50, 20, 0, 'sky'],
    ] },
    lantern: { anim: 'shine', pieces: [
      ['circle', 50, -4, 16, 0, 'yellow'], ['triangle', 50, 21.5, 50, 0, 'orange'],
      ['rectangle', 50, 92, 50, 0, 'orange'], ['square', 50, 62, 56, 0, 'purple'], ['circle', 50, 62, 26, 0, 'yellow'],
    ] },
    masjid: { anim: 'shine', pieces: [
      ['rectangle', 15, 78, 60, 90, 'cream'], ['triangle', 15, 39.9, 30, 0, 'green'],
      ['circle', 55, 50, 50, 0, 'green'], ['crescent', 55, 22, 18, 0, 'yellow'],
      ['square', 55, 78, 70, 0, 'cream'], ['rectangle', 55, 92.8, 28, 90, 'brown'],
    ] },
  };

  const INDIC = '٠١٢٣٤٥٦٧٨٩';
  const indic = (n) => String(n).replace(/\d/g, (d) => INDIC[d]);
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';

  /* Milliseconds, pixels. */
  const STEP = 560; // the least time a counted shape stays lit
  const PATIENCE = 4000; // the longest wait for one recording
  const NEXT = 1300; // after the chime, before the next round
  const REST = 900;
  const LINE_WAIT = 2500;
  const TAP = 10; // a finger that moves less taps
  const SMALL = 0.55; // a small shape, as a share of a large one
  const JUMP = [3, 2, 1]; // how far a round won with no mistake moves on, by tier
  const ARRIVE = 1200; // the train rolling in
  const LEAVE = 1700; // and out
  const RISE = [9, 7.5, 6]; // seconds a bubble takes to cross, by tier
  const AFLOAT = [5, 6, 7]; // bubbles in the air, by tier

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const between = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  function shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const px = (node, box) => {
    node.style.left = `${box.x}px`;
    node.style.top = `${box.y}px`;
    if (box.w !== undefined) node.style.width = `${box.w}px`;
    if (box.h !== undefined) node.style.height = `${box.h}px`;
  };

  /* Whether a shape is one a group asks for. */
  function fits(item, g) {
    if (g.shape && g.shape !== 'shape' && item.shape !== g.shape) return false;
    if (g.color && item.color !== g.color) return false;
    if (g.size && item.size !== g.size) return false;
    return true;
  }

  /* Kept on the device: the round reached, the rounds won, and whether the
     last was ever won. */
  function load() {
    try {
      const kept = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (kept && kept.v === 3) return kept;
    } catch {
      // Unreadable: start clean.
    }
    return { v: 3, at: 0, won: [], done: false };
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

  /* Sounds made here: a steam train rolling, its whistle, a rocket's whoosh. */
  function chug(times = 6) {
    for (let i = 0; i < times; i++) sound.rush(420, i * 0.2, 0.1, 0.05, 0.9);
  }
  function whistle() {
    for (const at of [0, 0.45]) {
      sound.tone(740, at, 0.36, 0.05, 'sine', 760);
      sound.tone(932, at, 0.36, 0.035, 'sine', 950);
    }
  }
  const whoosh = () => sound.rush(700, 0, 1.2, 0.07, 0.6, 2600);

  /* The steam engine, seen from the side, its front on the left (it rolls
     in from the right). No face: a lamp, a chimney, a cab with a window. */
  const LOCO = `<svg class="co-loco" viewBox="0 0 120 100" aria-hidden="true"><g stroke="#24272F" stroke-width="3" stroke-linejoin="round">
    <path d="M2 78L14 62H22V78Z" fill="#6B7180"/>
    <rect x="20" y="16" width="16" height="26" fill="#4A4F5C"/><rect x="16" y="11" width="24" height="9" rx="2" fill="#4A4F5C"/>
    <rect x="14" y="38" width="62" height="34" rx="12" fill="#E5484D"/><path d="M44 38a9 9 0 0 1 18 0Z" fill="#F7C833"/>
    <rect x="72" y="22" width="40" height="50" rx="4" fill="#3B7DDD"/><rect x="81" y="30" width="22" height="16" rx="3" fill="#CFE8FF"/>
    <rect x="67" y="15" width="50" height="9" rx="3" fill="#4A4F5C"/><rect x="8" y="70" width="108" height="9" rx="3" fill="#4A4F5C"/>
    <circle cx="12" cy="52" r="5" fill="#FFE07A"/>
    <circle cx="32" cy="85" r="11" fill="#4A4F5C"/><circle cx="58" cy="85" r="11" fill="#4A4F5C"/><circle cx="93" cy="83" r="14" fill="#4A4F5C"/>
    <circle cx="32" cy="85" r="3" fill="#C9CFD6"/><circle cx="58" cy="85" r="3" fill="#C9CFD6"/><circle cx="93" cy="83" r="4" fill="#C9CFD6"/>
  </g></svg>`;
  const WAGON_COLORS = ['#3DAE5C', '#F58A2B', '#9B5BD3'];

  /* The door: a train taking shapes on. */
  function drawArt(svg) {
    const at = (shape, paint, x, y, size, turn = 0) => `<g transform="translate(${x} ${y}) rotate(${turn}) scale(${size / 100}) translate(-50 -50)">${inner(shape, paint)}</g>`;
    svg.innerHTML = '<rect width="400" height="400" fill="#F6F0FA"/>'
      + at('circle', 'red', 70, 74, 68) + at('square', 'blue', 192, 64, 62, -8) + at('triangle', 'yellow', 316, 80, 72, 6)
      + at('star', 'green', 96, 182, 74) + at('heart', 'red', 214, 176, 46) + at('circle', 'orange', 322, 190, 60)
      + '<rect x="0" y="352" width="400" height="10" fill="#C9B79A"/>'
      + `<g transform="translate(18 258) scale(1)">${LOCO.replace('<svg class="co-loco" viewBox="0 0 120 100" aria-hidden="true">', '<svg x="0" y="0" width="132" height="110" viewBox="0 0 120 100">')}</g>`
      + '<rect x="160" y="318" width="214" height="22" rx="6" fill="#3DAE5C" stroke="#24272F" stroke-width="3"/>'
      + '<circle cx="196" cy="344" r="10" fill="#4A4F5C"/><circle cx="338" cy="344" r="10" fill="#4A4F5C"/>'
      + at('circle', 'blue', 205, 290, 54) + at('circle', 'purple', 268, 290, 54)
      + '<rect x="306" y="262" width="54" height="54" rx="12" fill="#FBF6EC" stroke="#E0C99E" stroke-width="2"/>';
  }

  if (document.body.classList.contains('sheet-hub')) {
    const art = document.querySelector('[data-collect-art]');
    if (art) drawArt(art);
    const card = $('collect-card');
    const show = () => {
      if (!card) return;
      const star = card.querySelector('.sheet-star');
      if (load().done && !star) {
        const mark = document.createElement('span');
        mark.className = 'sheet-star';
        mark.innerHTML = STAR;
        card.append(mark);
      }
    };
    show();
    addEventListener('pageshow', (event) => {
      if (event.persisted) show();
    });
    return;
  }

  /* The game */

  const rounds = WORDS.rounds;
  const last = rounds.length - 1;
  let at = 0;
  let view = null; // the round on the screen
  let press = null; // the finger on the paper
  let ended = false;
  let counting = 0; // the counting aloud now going on, by serial
  const slot = $('slot');

  /* What a round may draw from, by tier, and the round's own words. */
  const SHAPE_SETS = [['circle', 'square', 'triangle', 'star', 'heart'], ['circle', 'square', 'triangle', 'star', 'heart', 'crescent'], Object.keys(SHAPES)];
  const COLOR_SETS = [['red', 'blue', 'yellow', 'green'], Object.keys(COLORS), Object.keys(COLORS)];
  const FIELD = [[10, 12], [12, 14], [14, 16]]; // shapes lying about, by tier
  const EXTRA = [[1, 2], [1, 2], [2, 3]]; // more of a kind asked for than asked, by tier

  function pools(round) {
    const groups = round.kind === 'compare' ? round.groups : round.parts;
    const named = (k) => groups.map((gr) => gr[k]).filter((val) => val && val !== 'shape');
    return {
      groups,
      shapes: [...new Set([...SHAPE_SETS[round.tier], ...named('shape')])],
      colors: [...new Set([...COLOR_SETS[round.tier], ...named('color')])],
      // All large in the first rounds, then both, so that a size is a thing to notice.
      sizes: round.index < 5 && !named('size').length ? ['large'] : ['large', 'small'],
    };
  }

  /* A shape that a group asks for, its other traits left to chance. */
  function made(gr, p) {
    for (let guard = 0; guard < 300; guard++) {
      const item = {
        shape: !gr.shape || gr.shape === 'shape' ? pick(p.shapes) : gr.shape,
        color: gr.color || pick(p.colors),
        size: gr.size || pick(p.sizes),
      };
      if (fits(item, gr)) return item;
    }
    throw new Error(`no shape fits ${JSON.stringify(gr)}`);
  }

  /* A look-alike: a shape the group asks for with one named trait changed,
     so that the word for that trait is needed. */
  function lookAlike(gr, p, trait) {
    const item = made(gr, p);
    if (trait === 'shape') item.shape = pick(p.shapes.filter((s) => s !== gr.shape));
    if (trait === 'color') item.color = pick(p.colors.filter((c) => c !== gr.color));
    if (trait === 'size') item.size = gr.size === 'large' ? 'small' : 'large';
    return item;
  }
  const traitsOf = (gr) => ['shape', 'color', 'size'].filter((k) => gr[k] && gr[k] !== 'shape');

  /* The shapes lying about in a train, count or compare round: those asked
     for (and, but when counting, one to three more of them), two look-alikes
     for every trait a group names, and others to make up the number. */
  function makeField(round) {
    const p = pools(round);
    const asked = (item) => p.groups.some((gr) => fits(item, gr));
    const items = [];
    if (round.kind === 'compare') {
      round.groups.forEach((gr, i) => {
        for (let k = 0; k < round.counts[i]; k++) {
          let item = made(gr, p);
          for (let guard = 0; guard < 50 && fits(item, round.groups[1 - i]); guard++) item = made(gr, p);
          items.push(item);
        }
      });
      // A comparison of sizes counts every shape: there are no others.
      if (round.groups[0].size) return dress(items);
    } else {
      // With two or three kinds asked for, fewer of each, so the paper is not crowded.
      const several = round.parts.length > 1;
      for (const part of round.parts) {
        const more = round.kind === 'count' ? 0 : several ? 1 : between(...EXTRA[round.tier]);
        for (let k = 0; k < part.n + more; k++) items.push(made(part, p));
      }
      for (const part of round.parts) {
        for (const trait of traitsOf(part)) {
          for (let k = 0, guard = 0; k < (several ? 1 : 2) && guard < 40; guard++) {
            const item = lookAlike(part, p, trait);
            if (!asked(item)) {
              items.push(item);
              k++;
            }
          }
        }
      }
    }
    const total = Math.max(between(...FIELD[round.tier]), items.length + (round.parts && round.parts.length > 1 ? 1 : 3));
    for (let guard = 0; items.length < total && guard < 2000; guard++) {
      const gr = pick(p.groups);
      const traits = traitsOf(gr);
      const item = traits.length && Math.random() < 0.5 ? lookAlike(gr, p, pick(traits)) : { shape: pick(p.shapes), color: pick(p.colors), size: pick(p.sizes) };
      if (!asked(item)) items.push(item);
    }
    return dress(items);
  }
  const dress = (items) => shuffle(items).map((item) => ({ ...item, turn: item.shape === 'circle' ? 0 : between(-14, 14) }));

  /* Layout: a band along the bottom (the train, the jar, the answers, the
     shelf) or down the left side on a wide screen (all but the train), and
     the field in the rest. */
  function bands(W, H, v) {
    const side = W > H * 1.2 && v.mode !== 'train';
    const pad = Math.round(clamp(Math.min(W, H) * 0.025, 8, 16));
    return { side, pad };
  }

  /* The loose grid the shapes lie on: about a third more cells than shapes. */
  function grid(field, count) {
    const cells = Math.ceil(count * 1.3);
    let best = null;
    for (let cols = 2; cols <= cells; cols++) {
      const rows = Math.ceil(cells / cols);
      const size = Math.min(field.w / cols, field.h / rows);
      if (!best || size > best.size) best = { cols, rows, size };
    }
    return best;
  }
  function scatter(v) {
    const { cols, rows } = v.L.grid;
    const order = shuffle(Array.from({ length: cols * rows }, (_, i) => i)).slice(0, v.items.length);
    v.items.forEach((item, i) => {
      item.cell = order[i];
      item.dx = (Math.random() - 0.5) * 0.24;
      item.dy = (Math.random() - 0.5) * 0.24;
    });
  }
  const sizeOf = (item, full) => (item.size === 'small' ? full * SMALL : full);
  function fieldBox(v, item) {
    const { field, grid: g, u } = v.L;
    const cw = field.w / g.cols;
    const ch = field.h / g.rows;
    const col = item.cell % g.cols;
    const row = Math.floor(item.cell / g.cols);
    const s = sizeOf(item, u);
    // Cells run from the right, as a line of Arabic does.
    const cx = field.x + field.w - (col + 0.5) * cw + item.dx * Math.max(0, cw - u);
    const cy = field.y + (row + 0.5) * ch + item.dy * Math.max(0, ch - u);
    return { x: cx - s / 2, y: cy - s / 2, w: s, h: s };
  }

  function itemNode(item, i, extra = '') {
    const node = document.createElement('div');
    node.className = `co-item${extra}`;
    node.dataset.i = i;
    node.innerHTML = `${shapeSvg(item.shape, item.color)}<span class="co-badge"></span>`;
    node.firstElementChild.style.transform = `rotate(${item.turn || 0}deg)`;
    item.node = node;
    return node;
  }

  /* The train */

  function buildTrain(v) {
    v.items = makeField(v.round);
    v.places = [];
    const rails = document.createElement('div');
    rails.className = 'co-rails';
    const train = document.createElement('div');
    train.className = 'co-train';
    train.insertAdjacentHTML('beforeend', LOCO);
    v.round.parts.forEach((part, p) => {
      const wagon = document.createElement('div');
      wagon.className = 'co-wagon';
      wagon.style.setProperty('--paint', WAGON_COLORS[p % WAGON_COLORS.length]);
      const seats = document.createElement('div');
      seats.className = 'co-seats';
      for (let k = 0; k < part.n; k++) {
        const place = document.createElement('div');
        place.className = 'co-place';
        seats.append(place);
        v.places.push({ node: place, part: p });
      }
      wagon.innerHTML = '<div class="co-bed"></div><div class="co-wheels"><i></i><i></i></div>';
      wagon.prepend(seats);
      train.append(wagon);
    });
    v.rails = rails;
    v.train = train;
    slot.replaceChildren(rails, train, ...v.items.map((item, i) => itemNode(item, i)));
  }

  function placeTrain(v, W, H) {
    const { pad } = bands(W, H, v);
    const seats = v.round.parts.map((part) => part.n);
    const units = 2.5 + seats.reduce((sum, n) => sum + n * 1.12 + 0.5 + 0.2, 0);
    const t = Math.min((W - 2 * pad) / units, H * 0.12, 84);
    const bandH = t * 2.05;
    const band = { x: 0, y: H - pad - bandH, w: W, h: bandH };
    const field = { x: pad, y: pad, w: W - 2 * pad, h: band.y - 2 * pad };
    const g = grid(field, v.items.length);
    v.L = { ...v.L, W, H, pad, t, band, field, grid: g, u: Math.min(g.size * 0.8, 130) };
    slot.style.setProperty('--t', `${t}px`);
    const trainW = units * t;
    v.train.style.left = `${(W - trainW) / 2}px`;
    v.train.style.top = `${band.y}px`;
    v.train.style.height = `${bandH}px`;
    px(v.rails, { x: 0, y: band.y + bandH - t * 0.16, w: W, h: t * 0.24 });
    v.L.trainBox = { x: (W - trainW) / 2 - 20, y: band.y - 20, w: trainW + 40, h: bandH + 40 };
  }

  function arrive(v) {
    v.ready = false;
    const train = v.train;
    train.style.transition = 'none';
    train.style.transform = `translateX(${v.L.W}px)`;
    void train.offsetWidth;
    train.style.transition = `transform ${ARRIVE}ms cubic-bezier(.2,.7,.25,1)`;
    train.style.transform = 'translateX(0)';
    chug(6);
    setTimeout(() => {
      if (view === v) v.ready = true;
    }, ARRIVE);
  }

  /* Full: every shape rides in its seat, the whistle, and away to the left. */
  function depart(v) {
    for (const place of v.places) {
      if (!place.item) continue;
      const node = place.item.node;
      const f = place.item.size === 'small' ? 0.5 : 0.86;
      node.classList.add('co-seated');
      node.style.left = `${((1 - f) / 2) * 100}%`;
      node.style.top = `${((1 - f) / 2) * 100}%`;
      node.style.width = `${f * 100}%`;
      node.style.height = `${f * 100}%`;
      place.node.append(node);
    }
    whistle();
    setTimeout(() => {
      if (view !== v) return;
      chug(5);
      v.train.style.transition = `transform ${LEAVE}ms cubic-bezier(.5,0,.8,.4)`;
      v.train.style.transform = `translateX(${-(v.L.W + v.train.offsetWidth)}px)`;
    }, 700);
  }

  /* A shape for the train: the first free seat of a wagon it belongs to. */
  function load1(item) {
    const v = view;
    const free = v.places.find((p) => !p.item && fits(item, v.round.parts[p.part]));
    if (!free) {
      back(item);
      no(item.node);
      return;
    }
    free.item = item;
    item.in = free;
    item.node.classList.remove('co-drag', 'co-chosen');
    item.node.classList.add('co-in-tray');
    px(item.node, seatBox(item));
    const k = v.places.filter((p) => p.part === free.part && p.item).length;
    const said = sound.say(`count-${k}`);
    sound.tick();
    if (v.places.every((p) => p.item)) win(said);
  }
  function seatBox(item) {
    const box = slot.getBoundingClientRect();
    const seat = item.in.node.getBoundingClientRect();
    const s = seat.width * (item.size === 'small' ? 0.5 : 0.86);
    return { x: seat.left - box.left + (seat.width - s) / 2, y: seat.top - box.top + (seat.height - s) / 2, w: s, h: s };
  }

  /* The night sky: count and compare */

  function buildSky(v) {
    v.items = makeField(v.round);
    const n = v.mode === 'count' ? v.round.parts[0].n : 0;
    v.choices = v.mode === 'count'
      ? shuffle([n, ...shuffle([n - 2, n - 1, n + 1, n + 2].filter((m) => m >= 1 && m <= 12)).slice(0, 2)])
      : v.round.groups.slice();
    const tray = document.createElement('div');
    tray.className = 'co-answers';
    v.tiles = v.choices.map((choice) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'co-tile';
      if (v.mode === 'count') tile.textContent = indic(choice);
      else tile.innerHTML = tileArt(choice);
      tray.append(tile);
      return { node: tile, choice };
    });
    v.tray = tray;
    slot.replaceChildren(tray, ...v.items.map((item, i) => itemNode(item, i, ' co-glow')));
    // The shapes twinkle, each in its own time.
    v.items.forEach((item) => item.node.style.setProperty('--delay', `${(Math.random() * 3).toFixed(2)}s`));
  }

  /* An answer of a comparison: the kind, in grey for a shape, the color
     itself, or a large or a small grey circle. */
  function tileArt(gr) {
    const [k, val] = Object.entries(gr)[0];
    if (k === 'shape') return `<svg viewBox="-6 -6 112 112" aria-hidden="true"><g fill="${GREY.fill}" stroke="${GREY.edge}" stroke-width="5" stroke-linejoin="round">${SHAPES[val]}</g></svg>`;
    if (k === 'color') return `<svg viewBox="-6 -6 112 112" aria-hidden="true"><path d="M50 8C70 8 92 20 92 44C92 70 76 92 50 92C26 92 8 74 8 50C8 26 28 8 50 8Z" fill="${COLORS[val].fill}" stroke="${COLORS[val].edge}" stroke-width="5"/></svg>`;
    const r = val === 'large' ? 40 : 22;
    return `<svg viewBox="-6 -6 112 112" aria-hidden="true"><circle cx="50" cy="50" r="${r}" fill="${GREY.fill}" stroke="${GREY.edge}" stroke-width="5"/></svg>`;
  }

  function placeSky(v, W, H) {
    const { side, pad } = bands(W, H, v);
    const n = v.tiles.length;
    let t;
    let band;
    if (side) {
      t = clamp(Math.min(W * 0.11, (H - 2 * pad) / (n * 1.35)), 56, 110);
      band = { x: pad, y: pad, w: t * 1.5, h: H - 2 * pad };
    } else {
      t = clamp(Math.min(H * 0.13, (W - 2 * pad) / (n * 1.5)), 56, 110);
      band = { x: pad, y: H - pad - t * 1.4, w: W - 2 * pad, h: t * 1.4 };
    }
    const field = side
      ? { x: band.x + band.w + pad, y: pad, w: W - band.w - 3 * pad, h: H - 2 * pad }
      : { x: pad, y: pad, w: W - 2 * pad, h: band.y - 2 * pad };
    const g = grid(field, v.items.length);
    v.L = { ...v.L, W, H, pad, side, t, band, field, grid: g, u: Math.min(g.size * 0.8, 130) };
    slot.style.setProperty('--t', `${t}px`);
    v.tray.classList.toggle('co-side', side);
    px(v.tray, band);
  }

  /* A tap on a shape in the sky: it lights with its number. */
  function mark(item) {
    const v = view;
    const groups = v.mode === 'count' ? v.round.parts : v.round.groups;
    const g = groups.findIndex((gr) => fits(item, gr));
    if (g < 0) {
      no(item.node);
      return;
    }
    if (!item.mark) {
      v.marks[g] += 1;
      item.mark = v.marks[g];
      item.node.classList.add('co-marked');
      if (v.mode === 'compare') item.node.dataset.group = g;
      item.node.querySelector('.co-badge').textContent = indic(item.mark);
      sound.tone(880 + item.mark * 40, 0, 0.18, 0.04, 'sine', 1320 + item.mark * 40);
    }
    if (item.mark <= 10) sound.say(`count-${item.mark}`);
  }

  function answer(tile) {
    const v = view;
    let right;
    if (v.mode === 'count') right = tile.choice === v.round.parts[0].n;
    else {
      const [a, b] = v.round.counts;
      right = tile.choice === v.round.groups[v.round.more === (a > b) ? 0 : 1];
    }
    if (!right) {
      no(tile.node);
      return;
    }
    tile.node.classList.add('co-right');
    v.tiles.forEach((other) => {
      if (other !== tile) other.node.classList.add('co-faded');
    });
    slot.classList.add('co-sparkle');
    win(v.mode === 'count' ? wait(300).then(() => sound.say(`count-${tile.choice}`)) : Promise.resolve());
  }

  /* Bubbles */

  function buildBubbles(v) {
    v.places = [];
    v.items = [];
    v.bubbles = [];
    const jar = document.createElement('div');
    jar.className = 'co-jar';
    const box = document.createElement('div');
    box.className = 'co-jar-in';
    v.round.parts.forEach((part, p) => {
      for (let k = 0; k < part.n; k++) {
        const place = document.createElement('div');
        place.className = 'co-place';
        box.append(place);
        v.places.push({ node: place, part: p });
      }
    });
    jar.append(box);
    v.tray = jar;
    v.pool = pools(v.round);
    v.clock = 0;
    v.nextAt = 0;
    slot.replaceChildren(jar);
  }

  function placeBubbles(v, W, H) {
    const { side, pad } = bands(W, H, v);
    const n = v.places.length;
    let t;
    let band;
    if (side) {
      const per = n > 5 ? 2 : 1;
      t = clamp(Math.min(W * 0.085, (H - 2 * pad) / (Math.ceil(n / per) * 1.2 + 0.6)), 34, 80);
      band = { x: pad, y: pad, w: per * t * 1.2 + t * 0.6, h: H - 2 * pad };
    } else {
      const per = n > 6 ? Math.ceil(n / 2) : n;
      const rows = Math.ceil(n / per);
      t = clamp(Math.min(H * 0.1, (W - 2 * pad) / (per * 1.2 + 0.8)), 34, 80);
      band = { x: pad, y: H - pad - (rows * t * 1.2 + t * 0.6), w: W - 2 * pad, h: rows * t * 1.2 + t * 0.6 };
      v.tray.style.setProperty('--per', per);
    }
    if (side) v.tray.style.setProperty('--per', n > 5 ? 2 : 1);
    const field = side
      ? { x: band.x + band.w + pad, y: 0, w: W - band.w - 2 * pad, h: H }
      : { x: pad, y: 0, w: W - 2 * pad, h: band.y - pad };
    const d = clamp(Math.min(field.w, field.h) * 0.2, 60, 130);
    v.L = { ...v.L, W, H, pad, side, t, band, field, d, speed: field.h / RISE[v.round.tier] };
    slot.style.setProperty('--t', `${t}px`);
    v.tray.classList.toggle('co-side', side);
    px(v.tray, band);
    for (const b of v.bubbles) sizeBubble(v, b);
    for (const item of v.items) if (item.in) px(item.node, seatBox(item));
  }

  /* What the next bubble holds: one asked for whenever none is on its way
     up low enough to catch; otherwise a two-in-five chance of one, and most
     of the rest look-alikes. */
  function nextContents(v) {
    const p = v.pool;
    const open = v.round.parts.filter((part, i) => v.places.filter((pl) => pl.part === i && pl.item).length < part.n);
    const asked = (item) => p.groups.some((gr) => fits(item, gr));
    const coming = v.bubbles.some((b) => !b.gone && asked(b.item) && b.y > v.L.field.h * 0.35);
    if (open.length && (!coming || Math.random() < 0.4)) return made(pick(open), p);
    for (let guard = 0; guard < 100; guard++) {
      const gr = pick(p.groups);
      const traits = traitsOf(gr);
      const item = traits.length && Math.random() < 0.7 ? lookAlike(gr, p, pick(traits)) : { shape: pick(p.shapes), color: pick(p.colors), size: pick(p.sizes) };
      if (!asked(item)) return item;
    }
    return { shape: pick(p.shapes), color: pick(p.colors), size: pick(p.sizes) };
  }

  function spawn(v, y) {
    const { field, d } = v.L;
    const item = nextContents(v);
    item.turn = item.shape === 'circle' ? 0 : between(-14, 14);
    // A lane away from the last two bubbles.
    let x = field.x + Math.random() * Math.max(1, field.w - d);
    for (let tries = 0; tries < 12; tries++) {
      const near = v.bubbles.slice(-2).some((b) => Math.abs(b.x - x) < d * 0.95);
      if (!near) break;
      x = field.x + Math.random() * Math.max(1, field.w - d);
    }
    const node = document.createElement('div');
    node.className = 'co-bubble';
    node.innerHTML = `<div class="co-in-bubble">${shapeSvg(item.shape, item.color)}</div>`;
    node.firstElementChild.firstElementChild.style.transform = `rotate(${item.turn}deg)`;
    const b = { item, node, x, y: y === undefined ? field.y + field.h : y, phase: Math.random() * 6.28, gone: false };
    node.dataset.b = v.bubbles.length;
    v.bubbles.push(b);
    sizeBubble(v, b);
    slot.append(node);
    moveBubble(v, b);
  }
  function sizeBubble(v, b) {
    const { d } = v.L;
    b.node.style.width = `${d}px`;
    b.node.style.height = `${d}px`;
    b.node.style.setProperty('--shape', b.item.size === 'small' ? '38%' : '64%');
  }
  function moveBubble(v, b) {
    const sway = Math.sin(v.clock * 1.3 + b.phase) * v.L.d * 0.12;
    b.node.style.transform = `translate(${(b.x + sway).toFixed(1)}px, ${b.y.toFixed(1)}px)`;
  }

  /* Every frame: the bubbles rise, the gone ones are cleared, new ones come. */
  let before = 0;
  function frameStep(now) {
    requestAnimationFrame(frameStep);
    const dt = before ? Math.min(0.05, (now - before) / 1000) : 0;
    before = now;
    const v = view;
    if (!v || v.mode !== 'catch' || !v.L) return;
    v.clock += dt;
    const speed = v.L.speed * (v.locked ? 3 : 1);
    for (const b of v.bubbles) {
      if (b.gone) continue;
      b.y -= speed * dt;
      if (b.y < -v.L.d) {
        b.gone = true;
        b.node.remove();
      } else moveBubble(v, b);
    }
    if (v.locked) return;
    const afloat = v.bubbles.filter((b) => !b.gone && !b.popped).length;
    if (v.clock >= v.nextAt && afloat < AFLOAT[v.round.tier]) {
      spawn(v);
      v.nextAt = v.clock + (v.L.field.h + v.L.d) / v.L.speed / AFLOAT[v.round.tier];
    }
  }

  /* A tap on a bubble: pop it if its shape is asked for and the jar has room. */
  function popBubble(b) {
    const v = view;
    const free = v.places.find((p) => !p.item && fits(b.item, v.round.parts[p.part]));
    if (!free) {
      no(b.node);
      return;
    }
    b.popped = true;
    b.gone = true;
    const rect = b.node.getBoundingClientRect();
    const box = slot.getBoundingClientRect();
    const s = v.L.d * (b.item.size === 'small' ? 0.38 : 0.64) * BOX;
    const item = { ...b.item };
    const i = v.items.length;
    v.items.push(item);
    const node = itemNode(item, i, ' co-in-tray');
    px(node, { x: rect.left - box.left + (rect.width - s) / 2, y: rect.top - box.top + (rect.height - s) / 2, w: s, h: s });
    slot.append(node);
    b.node.classList.add('co-popped');
    setTimeout(() => b.node.remove(), 300);
    free.item = item;
    item.in = free;
    void node.offsetWidth;
    px(node, seatBox(item));
    const k = v.places.filter((p) => p.part === free.part && p.item).length;
    sound.pop(k);
    const said = wait(180).then(() => sound.say(`count-${k}`));
    if (v.places.every((p) => p.item)) win(said);
  }

  /* Building a picture */

  /* A piece's corners, turned, and so the box round the whole picture. */
  function pieceBox([shape, x, y, s, rot]) {
    const [x0, y0, x1, y1] = SHAPE_BOX[shape];
    const a = (rot * Math.PI) / 180;
    const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([px0, py0]) => {
      const dx = px0 - 50;
      const dy = py0 - 50;
      return [x + ((dx * Math.cos(a) - dy * Math.sin(a)) * s) / 100, y + ((dx * Math.sin(a) + dy * Math.cos(a)) * s) / 100];
    });
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }

  function buildPicture(v) {
    const pic = PICTURES[v.round.picture];
    v.plain = Boolean(v.round.plain);
    v.slots = pic.pieces.map(([shape, x, y, s, rot, paint], i) => ({ i, shape, x, y, s, rot, paint, piece: null }));
    const boxes = pic.pieces.map(pieceBox);
    const m = 4;
    v.bbox = [Math.min(...boxes.map((b) => b[0])) - m, Math.min(...boxes.map((b) => b[1])) - m, Math.max(...boxes.map((b) => b[2])) + m, Math.max(...boxes.map((b) => b[3])) + m];
    // The shelf: a piece for every outline, and some that are the wrong size or shape.
    const pieces = v.slots.map((sl) => ({ shape: sl.shape, s: sl.s, rot: sl.rot, color: sl.paint }));
    const decoys = [2, 3, 4][v.round.tier] + (v.plain ? 1 : 0);
    const same = (a, b) => a.shape === b.shape && Math.abs(a.s - b.s) < 1 && (v.plain || a.color === b.color);
    for (let guard = 0; pieces.length < v.slots.length + decoys && guard < 200; guard++) {
      const sl = pick(v.slots);
      const piece = { shape: sl.shape, s: sl.s, rot: sl.rot, color: sl.paint };
      if (Math.random() < 0.6) piece.s = Math.round(sl.s * (sl.s >= 50 || Math.random() < 0.5 ? 0.62 : 1.35));
      else piece.shape = pick(['circle', 'square', 'triangle', 'rectangle'].filter((s) => s !== sl.shape));
      if (piece.shape === 'circle') piece.rot = 0;
      if (piece.s < 12 || piece.s > 110) continue;
      if (v.slots.some((other) => same(piece, { shape: other.shape, s: other.s, color: other.paint }))) continue;
      if (pieces.some((other) => same(piece, other) && other.s === piece.s)) continue;
      pieces.push(piece);
    }
    v.items = shuffle(pieces).map((piece) => ({ ...piece, size: 'large', turn: piece.rot }));
    const picture = document.createElement('div');
    picture.className = 'co-picture';
    const [bx, by, bx1, by1] = v.bbox;
    const fill = (sl) => (v.plain ? 'transparent' : PAINT[sl.paint].fill);
    picture.innerHTML = `<svg class="co-outline" viewBox="${bx} ${by} ${bx1 - bx} ${by1 - by}" aria-hidden="true">${v.slots.map((sl) => `<g data-slot="${sl.i}" transform="translate(${sl.x} ${sl.y}) rotate(${sl.rot}) scale(${sl.s / 100}) translate(-50 -50)"><g fill="${fill(sl)}" fill-opacity=".28" stroke="#8A95A1" stroke-width="2.4" stroke-dasharray="6 5" stroke-linejoin="round" vector-effect="non-scaling-stroke">${SHAPES[sl.shape].replace('/>', ' vector-effect="non-scaling-stroke"/>')}</g></g>`).join('')}</svg>`;
    const shelf = document.createElement('div');
    shelf.className = 'co-shelf';
    v.picture = picture;
    v.tray = shelf;
    slot.replaceChildren(shelf, picture, ...v.items.map((item, i) => itemNode(item, i, ' co-piece')));
  }

  function placePicture(v, W, H) {
    const side = W > H * 1.2;
    const pad = Math.round(clamp(Math.min(W, H) * 0.025, 8, 16));
    const [bx, by, bx1, by1] = v.bbox;
    const bw = bx1 - bx;
    const bh = by1 - by;
    const area = side ? { x: W * 0.42, y: pad, w: W * 0.58 - pad, h: H - 2 * pad } : { x: pad, y: pad, w: W - 2 * pad, h: H * 0.56 - pad };
    const shelf = side ? { x: pad, y: pad, w: W * 0.42 - 2 * pad, h: H - 2 * pad } : { x: pad, y: H * 0.56 + pad, w: W - 2 * pad, h: H * 0.44 - 2 * pad };
    let k = Math.min(area.w / bw, area.h / bh) * 0.94;
    // The shelf holds every piece at the picture's own scale, in rows from
    // the right, each piece taking its own room: smaller, both, until they fit.
    const extent = (item) => {
      const [x0, y0, x1, y1] = pieceBox([item.shape, 0, 0, item.s, item.rot]);
      return { w: x1 - x0, h: y1 - y0 };
    };
    const gap = 16;
    const pack = (scale) => {
      const rows = [];
      let row = null;
      for (const item of v.items) {
        const e = extent(item);
        const w = e.w * scale + gap;
        const h = e.h * scale + gap;
        if (!row || row.w + w > shelf.w) {
          row = { w: 0, h: 0, items: [] };
          rows.push(row);
        }
        row.items.push({ item, w, h });
        row.w += w;
        row.h = Math.max(row.h, h);
      }
      return rows;
    };
    let rows = pack(k);
    for (let tries = 0; tries < 60 && rows.reduce((sum, r) => sum + r.h, 0) > shelf.h; tries++) {
      k *= 0.95;
      rows = pack(k);
    }
    const pic = { w: bw * k, h: bh * k };
    pic.x = area.x + (area.w - pic.w) / 2;
    pic.y = area.y + (area.h - pic.h) / 2;
    v.L = { ...v.L, W, H, pad, side, k, pic, shelf };
    px(v.picture, pic);
    px(v.tray, shelf);
    let y = shelf.y + (shelf.h - rows.reduce((sum, r) => sum + r.h, 0)) / 2;
    for (const row of rows) {
      let x = shelf.x + (shelf.w + row.w) / 2;
      for (const cell of row.items) {
        cell.item.home = { x: x - cell.w / 2, y: y + row.h / 2 };
        x -= cell.w;
      }
      y += row.h;
    }
    for (const item of v.items) px(item.node, item.slot ? slotBox(item.slot, item.s) : pieceAt(item));
  }
  const pieceAt = (item) => {
    const e = item.s * view.L.k * BOX;
    return { x: item.home.x - e / 2, y: item.home.y - e / 2, w: e, h: e };
  };
  /* Where a piece of size s stands on an outline, inside the paper. */
  function slotBox(sl, s) {
    const { pic, k } = view.L;
    const e = s * k * BOX;
    const cx = pic.x + (sl.x - view.bbox[0]) * k;
    const cy = pic.y + (sl.y - view.bbox[1]) * k;
    return { x: cx - e / 2, y: cy - e / 2, w: e, h: e };
  }
  /* The empty outline under a point, if any: of those near enough, one the
     piece fits first (a window's outline lies inside a wall's), else the
     nearest. */
  const fitsSlot = (item, sl) => item.shape === sl.shape && Math.abs(item.s - sl.s) < 1 && (view.plain || item.color === sl.paint);
  function slotAt(p, item) {
    const v = view;
    const { pic, k } = v.L;
    const x = (p.x - pic.x) / k + v.bbox[0];
    const y = (p.y - pic.y) / k + v.bbox[1];
    const near = v.slots
      .filter((sl) => !sl.piece)
      .map((sl) => ({ sl, d: Math.hypot(sl.x - x, sl.y - y) }))
      .filter(({ sl, d }) => d <= Math.max(sl.s * 0.5, 9))
      .sort((a, b) => a.d - b.d);
    const right = near.find(({ sl }) => fitsSlot(item, sl));
    return right ? right.sl : near.length ? near[0].sl : null;
  }

  function setPiece(item, sl) {
    const v = view;
    const right = fitsSlot(item, sl);
    if (!right) {
      back(item);
      no(item.node);
      return;
    }
    sl.piece = item;
    item.slot = sl;
    item.node.classList.remove('co-drag', 'co-chosen');
    item.node.classList.add('co-set');
    item.node.style.zIndex = 2 + sl.i;
    px(item.node, slotBox(sl, item.s));
    // Its outline goes; the others stay drawn over every piece, so none is hidden.
    const outline = v.picture.querySelector(`[data-slot="${sl.i}"]`);
    if (outline) outline.remove();
    v.selected = null;
    sound.tick();
    if (v.slots.every((s) => s.piece)) win(Promise.resolve());
  }

  /* Whole: the pieces join the picture, and it comes alive. */
  function alive(v) {
    const { pic } = v.L;
    for (const sl of v.slots) {
      const node = sl.piece.node;
      const box = slotBox(sl, sl.piece.s);
      node.style.left = `${box.x - pic.x}px`;
      node.style.top = `${box.y - pic.y}px`;
      v.picture.append(node);
    }
    const anim = PICTURES[v.round.picture].anim;
    v.picture.classList.add(`co-${anim}`);
    v.picture.style.setProperty('--away', `${-(pic.x + pic.w + 40)}px`);
    v.picture.style.setProperty('--up', `${-(pic.y + pic.h + 40)}px`);
    if (anim === 'drive') sound.rev(1);
    if (anim === 'launch') whoosh();
    if (anim === 'sail') sound.splash();
  }

  /* Shared */

  const MODES = {
    train: { build: buildTrain, place: placeTrain },
    count: { build: buildSky, place: placeSky },
    compare: { build: buildSky, place: placeSky },
    catch: { build: buildBubbles, place: placeBubbles },
    build: { build: buildPicture, place: placePicture },
  };

  function place() {
    const v = view;
    if (!v) return;
    const W = slot.clientWidth;
    const H = slot.clientHeight;
    if (!W || !H) return;
    const was = v.L && v.L.grid;
    v.L = v.L || {};
    MODES[v.mode].place(v, W, H);
    if (v.mode === 'train' || v.mode === 'count' || v.mode === 'compare') {
      if (!was || was.cols !== v.L.grid.cols || was.rows !== v.L.grid.rows) scatter(v);
      slot.style.setProperty('--u', `${v.L.u}px`);
      for (const item of v.items) {
        if (press && press.item === item && press.moved) continue;
        if (item.in) {
          if (!item.node.classList.contains('co-seated')) px(item.node, seatBox(item));
        } else px(item.node, fieldBox(v, item));
      }
    }
  }

  /* The line at the top: the round's sentence, shown and said; a tap says it again. */
  function showLine(round) {
    const line = $('line');
    if (typeof sound.caption === 'function') {
      sound.caption(line, round.text, round.clip).then(() => line.classList.remove('caption-wait'), () => line.classList.remove('caption-wait'));
    } else line.textContent = round.text;
    setTimeout(() => line.classList.remove('caption-wait'), LINE_WAIT);
  }

  /* The bar under the paper: the arrows, and a mark per round (filled once
     won, a ring for the round now). */
  function showNav() {
    const kept = load();
    const marks = $('marks');
    if (marks.childElementCount !== rounds.length) marks.replaceChildren(...rounds.map(() => document.createElement('i')));
    [...marks.children].forEach((mark, i) => {
      mark.className = i === at ? 'now' : kept.won.includes(i) ? 'done' : '';
    });
    $('prev').disabled = at === 0;
    $('next').disabled = at === last;
  }

  function openRound(index) {
    stopCounting();
    at = index;
    ended = false;
    press = null;
    const round = rounds[index];
    const v = { round, mode: round.kind, items: [], places: [], L: null, locked: false, ready: true, mistakes: 0, marks: [0, 0], selected: null };
    view = v;
    keep({ at: index });
    $('sheet').classList.remove('ended');
    $('end').hidden = true;
    slot.hidden = false;
    slot.className = `sheet-slot co-slot co-mode-${v.mode}`;
    MODES[v.mode].build(v);
    place();
    if (v.mode === 'catch') {
      // Bubbles already on their way, so the screen is never empty.
      const { field, d } = v.L;
      for (let k = 0; k < AFLOAT[round.tier] - 1; k++) spawn(v, field.y + field.h * (0.15 + (0.8 * k) / AFLOAT[round.tier]) - d / 2);
      v.nextAt = 0.6;
    }
    if (v.mode === 'train') arrive(v);
    else {
      slot.classList.remove('co-in');
      void slot.offsetWidth;
      slot.classList.add('co-in');
    }
    showNav();
    showLine(round);
    sound.say(round.clip);
    if (rounds[index + 1]) sound.preloadPrompts([rounds[index + 1].clip]);
  }

  /* Wrong: the thing tapped wobbles, with the soft buzzer. */
  function no(node) {
    if (view) view.mistakes += 1;
    sound.wrong();
    node.classList.remove('co-no');
    void node.offsetWidth;
    node.classList.add('co-no');
  }
  function back(item) {
    item.node.classList.remove('co-drag', 'co-chosen');
    if (view.mode === 'build') px(item.node, pieceAt(item));
    else px(item.node, fieldBox(view, item));
  }

  /* Counting aloud what the train or the jar holds, each shape lighting as its number is said. */
  function stopCounting() {
    counting += 1;
    document.querySelectorAll('.co-lit').forEach((node) => node.classList.remove('co-lit'));
  }
  async function countLoad() {
    const v = view;
    if (!v || !v.places.length) return;
    stopCounting();
    const mine = counting;
    const list = v.places.filter((p) => p.item).map((p) => p.item);
    for (let k = 0; k < list.length; k++) {
      if (mine !== counting || view !== v) return;
      list[k].node.classList.add('co-lit');
      await Promise.race([Promise.all([sound.say(`count-${k + 1}`), wait(STEP)]), wait(PATIENCE)]);
    }
    await wait(900);
    if (mine === counting) stopCounting();
  }

  /* A round won: the chime, the round's own ending, then the next round
     (further on when it had no mistake), or the praise after the last. */
  function win(said) {
    const v = view;
    if (v.locked) return;
    v.locked = true;
    stopCounting();
    sound.chime();
    const kept = load();
    const won = kept.won.includes(at) ? kept.won : kept.won.concat(at);
    const finished = at === last;
    const next = finished ? 0 : Math.min(last, at + (v.mistakes ? 1 : JUMP[v.round.tier]));
    keep({ won, done: kept.done || finished, at: next });
    showNav();
    let ending = NEXT;
    if (v.mode === 'train') {
      depart(v);
      ending = 700 + LEAVE;
    } else if (v.mode === 'build') {
      setTimeout(() => {
        if (view === v) alive(v);
      }, 350);
      ending = 2600;
    } else if (v.mode === 'catch') ending = 1500;
    Promise.all([Promise.race([Promise.resolve(said), wait(PATIENCE)]), wait(ending)]).then(() => wait(300)).then(() => {
      if (view !== v) return;
      if (finished) finish();
      else openRound(next);
    });
  }

  function finish() {
    stopCounting();
    ended = true;
    view = null;
    slot.hidden = true;
    slot.replaceChildren();
    $('buttons').hidden = true;
    $('sheet').classList.add('ended');
    $('end').hidden = false;
    Promise.race([Promise.all([sound.say(TEXT.praise.clip), wait(REST)]), wait(PATIENCE * 2)]).then(() => {
      if (ended) $('buttons').hidden = false;
    });
  }

  /* The finger. A shape can be dragged (onto the train, or onto an outline)
     or tapped; a tap is put down and lifted without moving. A bubble pops
     as soon as it is touched. */
  function slotPoint(event) {
    const box = slot.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function down(event) {
    const v = view;
    if (event.button > 0 || !v || v.locked || press) return;
    if (v.mode === 'catch') {
      const node = event.target.closest('.co-bubble');
      if (node) {
        event.preventDefault();
        const b = v.bubbles[Number(node.dataset.b)];
        if (b && !b.gone) popBubble(b);
      } else if (event.target.closest('.co-jar')) countLoad();
      return;
    }
    if (!v.ready) return;
    const target = event.target.closest('.co-item, .co-tile, .co-train, .co-picture');
    if (!target) return;
    const p = slotPoint(event);
    const item = target.classList.contains('co-item') ? v.items[Number(target.dataset.i)] : null;
    press = { id: event.pointerId, start: p, target, item, moved: false, touch: event.pointerType !== 'mouse' };
    const draggable = item && !item.in && !item.slot && (v.mode === 'train' || v.mode === 'build');
    if (draggable) {
      const box = v.mode === 'build' ? pieceAt(item) : fieldBox(v, item);
      press.grab = { x: p.x - box.x, y: p.y - box.y, w: box.w };
      event.preventDefault();
      try {
        slot.setPointerCapture(event.pointerId);
      } catch {
        // Already gone: the lift will still come.
      }
    }
  }

  function move(event) {
    if (!press || event.pointerId !== press.id || !press.grab) return;
    const p = slotPoint(event);
    if (!press.moved && Math.hypot(p.x - press.start.x, p.y - press.start.y) < TAP) return;
    if (!press.moved) {
      press.moved = true;
      stopCounting();
      press.item.node.classList.add('co-drag');
    }
    // On glass the shape rides a little above the finger, so the finger does not hide it.
    const lift = press.touch ? press.grab.w * 0.5 : 0;
    press.item.node.style.left = `${p.x - press.grab.x}px`;
    press.item.node.style.top = `${p.y - press.grab.y - lift}px`;
  }

  function up(event, lost) {
    if (!press || event.pointerId !== press.id) return;
    const { target, item, moved, start, grab } = press;
    press = null;
    const v = view;
    if (!v || v.locked) return;
    if (moved) {
      const middle = { x: parseFloat(item.node.style.left) + grab.w / 2, y: parseFloat(item.node.style.top) + grab.w / 2 };
      if (lost) back(item);
      else if (v.mode === 'train') {
        const t = v.L.trainBox;
        if (middle.x > t.x && middle.x < t.x + t.w && middle.y > t.y && middle.y < t.y + t.h) load1(item);
        else back(item);
      } else {
        const sl = slotAt(middle, item);
        if (sl) setPiece(item, sl);
        else back(item);
      }
      return;
    }
    if (lost || event.clientX === undefined) return;
    const p = slotPoint(event);
    if (Math.hypot(p.x - start.x, p.y - start.y) > TAP * 3) return;
    if (item) {
      if (item.in) countLoad();
      else if (item.slot) {
        // A tap on a piece already set, with another taken up: the outline under the finger (a window on a wall).
        const sl = v.selected && slotAt(p, v.selected);
        if (sl) setPiece(v.selected, sl);
      } else if (v.mode === 'train') {
        stopCounting();
        load1(item);
      } else if (v.mode === 'build') choose(item);
      else mark(item);
      return;
    }
    if (target.classList.contains('co-tile')) answer(v.tiles.find((t) => t.node === target));
    else if (target.classList.contains('co-train')) countLoad();
    else if (target.classList.contains('co-picture') && v.selected) {
      const sl = slotAt(p, v.selected);
      if (sl) setPiece(v.selected, sl);
    }
  }

  /* Building by taps: a tap takes a piece up (a ring round it), a tap on an
     outline puts it there; a tap on it again puts it down. */
  function choose(item) {
    const v = view;
    if (v.selected === item) {
      v.selected = null;
      item.node.classList.remove('co-chosen');
      return;
    }
    if (v.selected) v.selected.node.classList.remove('co-chosen');
    v.selected = item;
    item.node.classList.add('co-chosen');
    sound.tick();
  }

  function go(index) {
    if (index < 0 || index > last) return;
    openRound(index);
  }

  function listen() {
    slot.addEventListener('pointerdown', down);
    slot.addEventListener('pointermove', move);
    slot.addEventListener('pointerup', (event) => up(event, false));
    slot.addEventListener('pointercancel', (event) => up(event, true));
    slot.addEventListener('contextmenu', (event) => event.preventDefault());
    slot.addEventListener('dragstart', (event) => event.preventDefault());
    $('line').addEventListener('click', () => {
      if (view) sound.say(view.round.clip);
    });
    $('prev').addEventListener('click', () => go(at - 1));
    $('next').addEventListener('click', () => go(at + 1));
    $('replay').addEventListener('click', () => go(at));
    $('again').addEventListener('click', () => go(0));
    let size = '';
    const resized = () => {
      const now = `${slot.clientWidth}x${slot.clientHeight}`;
      if (now === size) return;
      size = now;
      if (press) up({ pointerId: press.id }, true);
      place();
    };
    addEventListener('resize', resized);
    if (typeof ResizeObserver === 'function') new ResizeObserver(resized).observe(slot);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && press) up({ pointerId: press.id }, true);
    });
    const menu = document.querySelector('.menu');
    if (menu) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'menu-item';
      button.textContent = 'مِنَ الْبِدَايَةِ';
      button.addEventListener('click', () => {
        menu.hidden = true;
        keep({ won: [] });
        go(0);
      });
      const rule = document.createElement('hr');
      rule.className = 'menu-rule';
      menu.append(rule, button);
    }
  }

  /* For trying the game by script on the family's computer. */
  function hook() {
    const middle = (node) => {
      const box = node.getBoundingClientRect();
      return [box.left + box.width / 2, box.top + box.height / 2];
    };
    const page = (p) => {
      const box = slot.getBoundingClientRect();
      return [box.left + p.x, box.top + p.y];
    };
    window.collectGame = {
      get state() {
        const v = view;
        return {
          at, rounds: rounds.length, ended, kept: load(),
          round: v && { text: v.round.text, clip: v.round.clip, mode: v.mode, tier: v.round.tier, locked: v.locked, ready: v.ready, mistakes: v.mistakes, loaded: v.places.filter((p) => p.item).length, set: v.slots ? v.slots.filter((s) => s.piece).length : 0, side: v.L && v.L.side },
        };
      },
      /* Page coordinates of each shape lying about (or piece on the shelf), and which groups it fits. */
      items: () => (view ? view.items.map((item, i) => {
        const groups = view.mode === 'compare' ? view.round.groups : view.round.parts || [];
        return { i, shape: item.shape, color: item.color, size: item.size, s: item.s, fits: groups.map((gr) => fits(item, gr)), in: Boolean(item.in || item.slot), at: middle(item.node) };
      }) : []),
      bubbles: () => (view && view.bubbles ? view.bubbles.map((b, i) => ({ i, shape: b.item.shape, color: b.item.color, size: b.item.size, gone: b.gone, fits: view.round.parts.map((gr) => fits(b.item, gr)), at: b.gone ? null : middle(b.node) })) : []),
      tiles: () => (view && view.tiles ? view.tiles.map((t) => ({ choice: t.choice, at: middle(t.node) })) : []),
      /* Page coordinates of the train, or of each outline: { i, shape, s, paint, at }. */
      train: () => (view && view.train ? middle(view.train) : null),
      slots: () => (view && view.slots ? view.slots.map((sl) => {
        const box = slotBox(sl, sl.s);
        return { i: sl.i, shape: sl.shape, s: sl.s, paint: sl.paint, set: Boolean(sl.piece), at: page({ x: box.x + box.w / 2, y: box.y + box.h / 2 }) };
      }) : []),
      open: (index) => go(clamp(index, 0, last)),
      finish,
      place,
    };
  }

  listen();
  if (LOCAL) hook();
  requestAnimationFrame(frameStep);
  // Every sentence the game can say is announced as it opens (for the dialect
  // switch, which reads what is recorded without fetching); the numbers are
  // fetched now, each sentence as its round comes near.
  sound.uses(rounds.map((r) => r.clip));
  sound.preloadPrompts(Array.from({ length: 10 }, (_, i) => `count-${i + 1}`).concat([TEXT.praise.clip]));
  openRound(clamp(load().at || 0, 0, last));
})();
