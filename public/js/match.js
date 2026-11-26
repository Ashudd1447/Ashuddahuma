/* «صِلْ كُلَّ رَقْمٍ بِالصُّورَةِ الْمُنَاسِبَةِ لَهُ» (first drafted as كَمْ؟) on the door الْأَرْقَامُ وَالْحِسَابُ: numbers matched to pictures of
   that many things. The father's request (2026-11-25): match "3" to three
   fingers, with fingers held up on a hand, cars, fruits, chairs and more,
   one to ten; first with the digits used in modern Arabic (١ ٢ ٣), then the
   same game with 1 2 3. match.html?d=ar is the first batch, ?d=en the second.

   A round shows three groups of things (four when the screen has room, in the
   second half of a batch) and their numbers in a tray. The child drags each
   number onto its group: the right group takes it with a chime and the
   number's name; any other gives a soft buzz and the number slides back,
   nothing lost. A tap on a group counts it aloud, each thing lighting as its
   number is said; a tap on a number says its name. The ١ ٢ ٣ batch says the
   Arabic names in the family's chosen dialect (count-1 …), the 1 2 3 batch
   the English names (en-1 …), which the father records; nothing English is
   ever written. After the last round: أحسنت.

   Hands, chairs and the cards' art are drawn here; every other picture is the
   books' own clip art (sheets/img). numbers.html loads this file too, to draw
   the two cards and mark a finished batch with a star. */
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'match';
  const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

  /* The hands, counted from the thumb, the father's way (2026-11-25): one is
     the thumb up from a fist, two the thumb and the index, three adds the
     middle finger, four the ring finger, five the open hand. They are
     pictures made with the family's Recraft plan (images/hands/hand-1 to 5,
     raw copies in recraft/hands-raw), after two drawings in code were sent
     back the same day as strange and confusing. Each picture's width (its
     height is HAND_H) and its raised fingertips, thumb first, as shares of
     its width and height: counting aloud lights them in that order. Six to
     ten are the open hand and the hand of the rest, mirrored beside it. */
  const HAND_H = 640;
  const HANDS = {
    1: { w: 261, tips: [[0.43, 0.08]] },
    2: { w: 439, tips: [[0.08, 0.47], [0.52, 0.07]] },
    3: { w: 449, tips: [[0.08, 0.48], [0.37, 0.08], [0.63, 0.07]] },
    4: { w: 382, tips: [[0.08, 0.4], [0.37, 0.11], [0.62, 0.06], [0.84, 0.12]] },
    5: { w: 441, tips: [[0.07, 0.46], [0.29, 0.11], [0.57, 0.06], [0.8, 0.09], [0.93, 0.2]] },
  };

  /* What the child sees and hears; the parents approve every line. */
  const TEXT = {
    line: { text: 'صِلْ كُلَّ رَقْمٍ بِالصُّورَةِ الْمُنَاسِبَةِ لَهُ', clip: 'numbers-match' }, // the game's name too, the father's (2026-11-25)
    praise: { text: 'أحسنت', clip: 'well-done' }, // the father's choice (2026-11-25): أحسنت, not مَا شَاءَ اللَّهُ
  };
  const INDIC = '٠١٢٣٤٥٦٧٨٩';
  /* 1 2 3 in a plain round face: the Naskh font has none of its own. */
  const LATIN = 'system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif';
  const BATCHES = {
    ar: { digits: (n) => String(n).replace(/\d/g, (d) => INDIC[d]), name: (n) => sound.say(`count-${n}`) },
    en: { digits: (n) => String(n), name: (n) => sound.play(`en-${n}`) },
  };

  const ROUNDS = 8; // rounds in a batch
  const MOST_IN_ROW = 5; // so seven reads as five and two
  /* The things to count besides hands: the books' clip art by file name, and
     chairs, drawn here. A kind's family keeps two cars out of one round. */
  const KINDS = [
    'chair', 'chair', 'chair',
    'car-red', 'car-blue', 'car-purple',
    'apple-red', 'banana', 'orange', 'strawberry', 'pear', 'grapes',
    'balloon-red', 'star', 'flower', 'ball', 'kite', 'gift', 'cup-blue', 'cupcake-pink',
    'ice-cream', 'umbrella-blue', 'boat', 'bus', 'bicycle', 'tree', 'teapot-green', 'lantern', 'plane',
  ];
  const family = (kind) => kind.split('-')[0];

  /* Milliseconds. */
  const STEP = 560; // the least time a counted thing stays the newest, with or without its recording
  const PATIENCE = 4000; // the longest wait for one recording to end
  const LIT = 1100; // a counted group stays lit this long after its last number
  const NEXT = 900; // after a round's last number is said, before the next round
  const REST = 900; // the praise, before the buttons
  const TAP = 10; // a finger that moves less than this many CSS pixels taps

  const INK = '#26283F';
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  function shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));

  /* Kept on the device: which batches were ever finished. */
  function load() {
    try {
      const kept = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (kept && kept.v === 1) return kept;
    } catch {
      // Unreadable: start clean.
    }
    return { v: 1, ar: { done: false }, en: { done: false } };
  }
  function keep(batch) {
    const kept = load();
    kept[batch] = { done: true };
    try {
      localStorage.setItem(KEY, JSON.stringify(kept));
    } catch {
      // Private browsing: nothing is kept.
    }
  }

  /* Drawings */

  /* One hand: its picture, mirrored or not, and over each raised fingertip
     a ring that lights when that finger is counted (data-i, its place in
     the counting). */
  function handMarkup(n, x, mirror, first) {
    const hand = HANDS[n];
    const w = hand.w;
    const flip = mirror ? ` transform="translate(${x + w} 0) scale(-1 1)"` : ` transform="translate(${x} 0)"`;
    let out = `<g${flip}><image href="images/hands/hand-${n}.webp" width="${w}" height="${HAND_H}"/></g>`;
    hand.tips.forEach(([tx, ty], i) => {
      const cx = x + (mirror ? 1 - tx : tx) * w;
      out += `<circle class="mt-finger" data-i="${first + i}" cx="${cx.toFixed(1)}" cy="${(ty * HAND_H).toFixed(1)}" r="34"/>`;
    });
    return out;
  }

  /* The hands for a number. One to five: one hand, its thumb on our left.
     Six to ten: the open hand on the right, counted first, and the hand of
     the rest on the left, mirrored, so the two thumbs face each other as on
     a person holding up both hands. */
  const GAP = 40;
  function handsMarkup(n) {
    if (n <= 5) return { width: HANDS[n].w, height: HAND_H, markup: handMarkup(n, 0, false, 0) };
    const rest = n - 5;
    const left = HANDS[rest].w;
    const markup = handMarkup(5, left + GAP, false, 0) + handMarkup(rest, 0, true, 5);
    return { width: left + GAP + HANDS[5].w, height: HAND_H, markup };
  }

  /* A chair, seen from the front and a little above. viewBox 100 by 100. */
  const CHAIR = `<g stroke="${INK}" stroke-width="3" stroke-linejoin="round">`
    + '<rect x="28" y="66" width="7" height="24" fill="#A9603A"/><rect x="65" y="66" width="7" height="24" fill="#A9603A"/>'
    + '<rect x="24" y="6" width="52" height="52" rx="9" fill="#C98A45"/><rect x="33" y="15" width="34" height="26" rx="5" fill="#F0C98C"/>'
    + '<path d="M24 54H76L88 68H12Z" fill="#E5534B"/><rect x="12" y="68" width="76" height="8" rx="2" fill="#C98A45"/>'
    + '<rect x="14" y="76" width="9" height="20" fill="#C98A45"/><rect x="77" y="76" width="9" height="20" fill="#C98A45"/></g>';

  function thingNode(kind) {
    const node = document.createElement('div');
    node.className = 'mt-thing';
    if (kind === 'chair') node.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">${CHAIR}</svg>`;
    else {
      const img = document.createElement('img');
      img.src = `sheets/img/${kind}.png`;
      img.alt = '';
      img.draggable = false;
      node.append(img);
    }
    return node;
  }

  /* The cards on the door: big numbers over a hand showing three. */
  function drawArt(svg, batch) {
    const digits = BATCHES[batch].digits;
    // ١ ٢ ٣ run from right to left, 1 2 3 from left to right, as each is written.
    const xs = batch === 'ar' ? [310, 200, 90] : [90, 200, 310];
    const colors = ['#2E9E4A', '#E08A1E', '#3E76C2'];
    const hands = handsMarkup(3);
    const h = 238;
    const scale = h / hands.height;
    const w = hands.width * scale;
    svg.innerHTML = '<rect width="400" height="400" fill="#F3FAF4"/>'
      + xs.map((x, i) => `<text x="${x}" y="${batch === 'ar' ? 84 : 78}" fill="${colors[i]}" font-family="${batch === 'ar' ? 'Noto Naskh Arabic, serif' : LATIN}" font-weight="700" font-size="${batch === 'ar' ? 118 : 104}" text-anchor="middle" dominant-baseline="central">${digits(i + 1)}</text>`).join('')
      + `<g transform="translate(${(400 - w) / 2} ${400 - h - 12}) scale(${scale})">${hands.markup}</g>`;
  }

  function showHub() {
    const kept = load();
    for (const batch of ['ar', 'en']) {
      const card = $(`match-${batch}`);
      if (!card) continue;
      const art = card.querySelector('[data-match-art]');
      if (art && !art.childElementCount) drawArt(art, batch);
      const star = card.querySelector('.sheet-star');
      if (kept[batch].done && !star) {
        const mark = document.createElement('span');
        mark.className = 'sheet-star';
        mark.innerHTML = STAR;
        card.append(mark);
      } else if (!kept[batch].done && star) star.remove();
    }
  }

  if (document.body.classList.contains('sheet-hub')) {
    showHub();
    addEventListener('pageshow', (event) => {
      if (event.persisted) showHub();
    });
    return;
  }

  /* The game */

  const batch = new URLSearchParams(location.search).get('d');
  if (!Object.prototype.hasOwnProperty.call(BATCHES, batch || '')) {
    location.replace('numbers.html');
    return;
  }
  const { digits, name: sayName } = BATCHES[batch];

  let rounds = []; // the batch: per round, its groups { n, kind } in screen order and the tray's order
  let at = 0; // the round on the screen
  let view = null; // its elements and state
  let drag = null; // the number being carried
  let counting = 0; // the counting now going on, by serial; a newer one ends it
  let ended = false;
  let busy = false; // the round is done and the next one is coming

  /* A batch: ROUNDS rounds of distinct numbers, every number from one to ten
     at least twice, the small numbers more often early; one group in every
     round is hands, and the other kinds change from group to group. */
  function makeBatch(four) {
    const sizes = Array.from({ length: ROUNDS }, (_, i) => (four && i >= ROUNDS / 2 ? 4 : 3));
    const total = sizes.reduce((a, b) => a + b, 0);
    let numbers = null;
    for (let attempt = 0; attempt < 500 && !numbers; attempt++) {
      const pool = [];
      for (let n = 1; n <= 10; n++) pool.push(n, n);
      while (pool.length < total) pool.push(1 + Math.floor(Math.random() * 10));
      const ranked = pool.map((n) => ({ n, key: n + Math.random() * 8 })).sort((a, b) => a.key - b.key);
      const filled = sizes.map(() => []);
      let ok = true;
      for (const { n } of ranked) {
        const r = filled.findIndex((round, i) => round.length < sizes[i] && !round.includes(n));
        if (r < 0) {
          ok = false;
          break;
        }
        filled[r].push(n);
      }
      if (ok) numbers = filled;
    }
    const shownAsHands = new Set();
    let kinds = [];
    let before = [];
    return numbers.map((list) => {
      // Hands: a number not yet shown on hands in this batch, when there is one.
      const fresh = list.filter((n) => !shownAsHands.has(n));
      const handN = pick(fresh.length ? fresh : list);
      shownAsHands.add(handN);
      const used = [];
      const groups = list.map((n) => {
        if (n === handN) return { n, kind: 'hands' };
        if (kinds.length < 4) kinds = kinds.concat(shuffle(KINDS));
        let i = kinds.findIndex((k) => !used.includes(family(k)) && !before.includes(family(k)));
        if (i < 0) i = kinds.findIndex((k) => !used.includes(family(k)));
        const kind = kinds.splice(Math.max(0, i), 1)[0];
        used.push(family(kind));
        return { n, kind };
      });
      before = used;
      let tray = shuffle(list);
      const order = shuffle(groups);
      if (tray.every((n, i) => n === order[i].n)) tray = tray.reverse();
      return { groups: order, tray };
    });
  }

  /* Layout: where everything stands, in CSS pixels inside the paper, worked
     out anew for every size. The tray of numbers is under the groups or
     beside them (on our left, the end of a line), and the groups are cards in
     a grid, the number's place beside or under the things; of all the ways,
     the one where the things come out largest is taken. */
  const SPACE = 0.14; // between two things, as a share of a thing

  function fitThings(count, w, h) {
    const cols = Math.min(count, MOST_IN_ROW);
    const rows = Math.ceil(count / MOST_IN_ROW);
    return Math.min(w / (cols + (cols - 1) * SPACE), h / (rows + (rows - 1) * SPACE));
  }
  function fitHands(count, w, h) {
    const { width, height } = handsMarkup(count);
    return Math.min(h, (w * height) / width);
  }
  const HAND_RATIO = 2.3; // a hand stands this many things tall: large enough to read its fingers

  function measure(W, H, groups) {
    const base = Math.min(W, H);
    const T = Math.round(clamp(base * 0.15, 58, 100));
    const G = Math.round(clamp(base * 0.025, 8, 18));
    const p = Math.round(G * 0.9);
    const n = groups.length;
    let best = null;
    for (const trayAt of ['bottom', 'side']) {
      let tray;
      let area;
      if (trayAt === 'bottom') {
        const th = T + 2 * p;
        tray = { x: G, y: H - G - th, w: W - 2 * G, h: th };
        area = { x: G, y: G, w: W - 2 * G, h: H - 3 * G - th };
        if (n * T + (n + 1) * p > tray.w) continue;
      } else {
        const tw = T + 2 * p;
        tray = { x: G, y: G, w: tw, h: H - 2 * G };
        area = { x: 2 * G + tw, y: G, w: W - 3 * G - tw, h: H - 2 * G };
        if (n * T + (n + 1) * p > tray.h) continue;
      }
      for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const cw = (area.w - (cols - 1) * G) / cols;
        const ch = (area.h - (rows - 1) * G) / rows;
        for (const badgeAt of ['side', 'below']) {
          const tw = badgeAt === 'side' ? cw - 3 * p - T : cw - 2 * p;
          const th = badgeAt === 'side' ? ch - 2 * p : ch - 3 * p - T;
          if (tw < 20 || th < 20 || (badgeAt === 'side' && ch - 2 * p < T)) continue;
          let s = Infinity;
          for (const g of groups) {
            s = Math.min(s, g.kind === 'hands' ? fitHands(g.n, tw, th) / HAND_RATIO : fitThings(g.n, tw, th));
          }
          s = Math.min(s, T * 1.3);
          if (!best || s > best.s + 0.5) best = { s, T, G, p, trayAt, tray, area, cols, rows, cw, ch, badgeAt, tw, th };
        }
      }
    }
    return best;
  }

  /* Places for one round in the layout found. */
  function arrange(L, groups) {
    const n = groups.length;
    const cards = groups.map((g, i) => {
      const row = Math.floor(i / L.cols);
      const inRow = row === L.rows - 1 ? n - row * L.cols : L.cols;
      const col = i % L.cols;
      // From the right, as a line of Arabic is read; a short last row is centered.
      const rowW = inRow * L.cw + (inRow - 1) * L.G;
      const right = L.area.x + L.area.w - (L.area.w - rowW) / 2;
      const x = right - (col + 1) * L.cw - col * L.G;
      const y = L.area.y + row * (L.ch + L.G);
      const card = { x, y, w: L.cw, h: L.ch };
      if (L.badgeAt === 'side') {
        card.badge = { x: x + L.p, y: y + (L.ch - L.T) / 2 };
        card.things = { x: x + 2 * L.p + L.T, y: y + L.p, w: L.tw, h: L.th };
      } else {
        card.badge = { x: x + (L.cw - L.T) / 2, y: y + L.ch - L.p - L.T };
        card.things = { x: x + L.p, y: y + L.p, w: L.tw, h: L.th };
      }
      return card;
    });
    const places = [];
    for (let i = 0; i < n; i++) {
      if (L.trayAt === 'bottom') {
        const rowW = n * L.T + (n - 1) * L.p * 2;
        const right = L.tray.x + (L.tray.w + rowW) / 2;
        places.push({ x: right - (i + 1) * L.T - i * L.p * 2, y: L.tray.y + L.p });
      } else {
        const colH = n * L.T + (n - 1) * L.p * 2;
        const top = L.tray.y + (L.tray.h - colH) / 2;
        places.push({ x: L.tray.x + L.p, y: top + i * (L.T + L.p * 2) });
      }
    }
    return { cards, places };
  }

  /* One round on the paper */

  function build(round) {
    const slot = $('slot');
    const tray = document.createElement('div');
    tray.className = 'mt-tray';
    const cards = round.groups.map((g, i) => {
      const card = document.createElement('div');
      card.className = 'mt-card';
      card.dataset.i = i;
      const badge = document.createElement('div');
      badge.className = 'mt-badge';
      const things = document.createElement('div');
      things.className = 'mt-things';
      if (g.kind === 'hands') {
        const hands = handsMarkup(g.n);
        things.innerHTML = `<svg class="mt-hands" viewBox="-5 -5 ${hands.width + 10} ${hands.height + 10}" aria-hidden="true">${hands.markup}</svg>`;
      } else {
        for (let k = 0; k < g.n; k++) things.append(thingNode(g.kind));
      }
      card.append(things, badge);
      return { node: card, badge, things, n: g.n, kind: g.kind, filled: false };
    });
    const tiles = round.tray.map((n, i) => {
      const tile = document.createElement('div');
      tile.className = n > 9 ? 'mt-tile mt-two' : 'mt-tile';
      tile.dataset.n = n;
      tile.dataset.i = i;
      const text = document.createElement('span');
      text.textContent = digits(n);
      tile.append(text);
      return { node: tile, n, place: i, placed: false, card: null };
    });
    slot.replaceChildren(tray, ...cards.map((c) => c.node), ...tiles.map((t) => t.node));
    return { tray, cards, tiles, layout: null, w: 0, h: 0 };
  }

  const px = (node, box) => {
    node.style.left = `${box.x}px`;
    node.style.top = `${box.y}px`;
    if (box.w !== undefined) node.style.width = `${box.w}px`;
    if (box.h !== undefined) node.style.height = `${box.h}px`;
  };

  function place() {
    if (!view) return;
    const slot = $('slot');
    const W = slot.clientWidth;
    const H = slot.clientHeight;
    if (!W || !H) return;
    view.w = W;
    view.h = H;
    const groups = view.cards.map((c) => ({ n: c.n, kind: c.kind }));
    const L = measure(W, H, groups);
    if (!L) return;
    const { cards, places } = arrange(L, groups);
    view.layout = { L, cards, places };
    const slotStyle = slot.style;
    slotStyle.setProperty('--tile', `${L.T}px`);
    px(view.tray, L.tray);
    view.cards.forEach((card, i) => {
      const box = cards[i];
      px(card.node, { x: box.x, y: box.y, w: box.w, h: box.h });
      px(card.badge, { x: box.badge.x - box.x, y: box.badge.y - box.y, w: L.T, h: L.T });
      px(card.things, { x: box.things.x - box.x, y: box.things.y - box.y, w: box.things.w, h: box.things.h });
      layThings(card, box.things, L.s);
    });
    for (const tile of view.tiles) {
      if (drag && drag.tile === tile) continue;
      tile.node.style.width = `${L.T}px`;
      tile.node.style.height = `${L.T}px`;
      px(tile.node, home(tile));
    }
  }

  /* Where a number belongs now: its group's place once matched, else the tray. */
  function home(tile) {
    const { cards, places } = view.layout;
    return tile.placed ? cards[tile.card].badge : places[tile.place];
  }

  /* The things of a group in rows of at most five, the rows read from the
     right; one row is centered, two keep their right edges together, so
     seven is five and two. Hands are one drawing, as large as fits. */
  function layThings(card, box, s) {
    if (card.kind === 'hands') {
      const svg = card.things.firstElementChild;
      const hands = handsMarkup(card.n);
      const ratio = (hands.width + 10) / (hands.height + 10);
      const h = Math.min(box.h, box.w / ratio, s * HAND_RATIO * 1.15);
      const w = h * ratio;
      px(svg, { x: (box.w - w) / 2, y: (box.h - h) / 2, w, h });
      return;
    }
    const count = card.n;
    const cols = Math.min(count, MOST_IN_ROW);
    const rows = Math.ceil(count / MOST_IN_ROW);
    const gap = s * SPACE;
    const blockW = cols * s + (cols - 1) * gap;
    const blockH = rows * s + (rows - 1) * gap;
    const right = (box.w + blockW) / 2;
    const top = (box.h - blockH) / 2;
    [...card.things.children].forEach((node, k) => {
      const row = Math.floor(k / MOST_IN_ROW);
      const col = k % MOST_IN_ROW;
      px(node, { x: right - (col + 1) * s - col * gap, y: top + row * (s + gap), w: s, h: s });
    });
  }

  /* Marks under the paper: rounds done, the round now, rounds to come. */
  function showMarks(done) {
    const marks = $('marks');
    if (marks.childElementCount !== rounds.length) marks.replaceChildren(...rounds.map(() => document.createElement('i')));
    [...marks.children].forEach((mark, i) => {
      mark.className = i < done ? 'done' : i === done ? 'now' : '';
    });
  }

  function openRound(index) {
    stopCounting();
    drag = null;
    busy = false;
    ended = false;
    at = index;
    $('sheet').classList.remove('ended');
    $('end').hidden = true;
    $('slot').hidden = false;
    view = build(rounds[index]);
    place();
    $('slot').classList.remove('mt-in');
    void $('slot').offsetWidth;
    $('slot').classList.add('mt-in');
    showMarks(index);
  }

  /* Four groups to a round only where four still come out large enough. */
  function roomForFour() {
    const slot = $('slot');
    const L = measure(slot.clientWidth, slot.clientHeight, [{ n: 10, kind: 'hands' }, { n: 9, kind: 'car' }, { n: 8, kind: 'car' }, { n: 7, kind: 'car' }]);
    return Boolean(L && L.s >= 36);
  }

  function startBatch() {
    // The paper is shown before it is measured: "again" comes from the praise, where it is hidden.
    $('sheet').classList.remove('ended');
    $('end').hidden = true;
    $('slot').hidden = false;
    rounds = makeBatch(roomForFour());
    openRound(0);
  }

  /* Counting a group aloud: each thing lights as its number is said. */
  function stopCounting() {
    counting += 1;
    document.querySelectorAll('.mt-lit').forEach((node) => node.classList.remove('mt-lit'));
  }

  async function count(card) {
    stopCounting();
    const mine = counting;
    const items = card.kind === 'hands'
      ? [...card.things.querySelectorAll('.mt-finger')].sort((a, b) => a.dataset.i - b.dataset.i)
      : [...card.things.children];
    for (let k = 0; k < items.length; k++) {
      if (mine !== counting) return;
      items[k].classList.add('mt-lit');
      await Promise.race([Promise.all([sayName(k + 1), wait(STEP)]), wait(PATIENCE)]);
    }
    await wait(LIT);
    if (mine === counting) stopCounting();
  }

  /* Dragging a number */

  function slotPoint(event) {
    const box = $('slot').getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  /* The group a carried number is over: the one under its middle, or failing
     that the nearest within half a number's size. */
  function target(center) {
    const { cards, L } = view.layout;
    let found = -1;
    let nearest = L.T * 0.5;
    cards.forEach((box, i) => {
      const dx = Math.max(box.x - center.x, 0, center.x - (box.x + box.w));
      const dy = Math.max(box.y - center.y, 0, center.y - (box.y + box.h));
      const d = Math.hypot(dx, dy);
      if (d < nearest) {
        nearest = d;
        found = i;
      }
    });
    return found;
  }

  function carry(event) {
    const p = slotPoint(event);
    const T = view.layout.L.T;
    drag.moved = drag.moved || Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > TAP;
    // On glass the number rides above the finger, so the finger does not hide it.
    const lift = drag.touch && drag.moved ? T * 0.85 : 0;
    const x = p.x - drag.grab.x;
    const y = p.y - drag.grab.y - lift;
    drag.at = { x, y };
    px(drag.tile.node, { x, y });
    const over = drag.moved ? target({ x: x + T / 2, y: y + T / 2 }) : -1;
    view.cards.forEach((card, i) => card.node.classList.toggle('mt-over', i === over && !card.filled));
  }

  function lift(event) {
    if (!view || busy || drag) return;
    const tileNode = event.target.closest('.mt-tile');
    const cardNode = event.target.closest('.mt-card');
    if (tileNode) {
      const tile = view.tiles[Number(tileNode.dataset.i)];
      event.preventDefault();
      if (tile.placed) {
        sayName(tile.n);
        return;
      }
      stopCounting();
      const p = slotPoint(event);
      const box = home(tile);
      drag = { tile, id: event.pointerId, start: p, grab: { x: p.x - box.x, y: p.y - box.y }, moved: false, touch: event.pointerType !== 'mouse', at: box };
      tile.node.classList.add('mt-held');
      try {
        $('slot').setPointerCapture(event.pointerId);
      } catch {
        // Already gone: the lift will still come.
      }
      return;
    }
    if (cardNode) {
      event.preventDefault();
      count(view.cards[Number(cardNode.dataset.i)]);
    }
  }

  function drop(event, lost) {
    if (!drag || event.pointerId !== drag.id) return;
    const { tile, moved } = drag;
    const T = view.layout.L.T;
    const over = moved && !lost ? target({ x: drag.at.x + T / 2, y: drag.at.y + T / 2 }) : -1;
    drag = null;
    view.cards.forEach((card) => card.node.classList.remove('mt-over'));
    tile.node.classList.remove('mt-held');
    if (!moved) {
      px(tile.node, home(tile));
      if (!lost) sayName(tile.n);
      return;
    }
    const card = over >= 0 ? view.cards[over] : null;
    if (!card || card.filled) {
      px(tile.node, home(tile)); // back to the tray, nothing said
      return;
    }
    if (card.n !== tile.n) {
      sound.wrong();
      card.node.classList.remove('mt-no');
      void card.node.offsetWidth;
      card.node.classList.add('mt-no');
      px(tile.node, home(tile));
      return;
    }
    tile.placed = true;
    tile.card = over;
    card.filled = true;
    card.node.classList.add('mt-done');
    tile.node.classList.add('mt-placed');
    px(tile.node, home(tile));
    sound.chime();
    const said = Promise.race([Promise.all([wait(250).then(() => sayName(tile.n)), wait(500)]), wait(PATIENCE)]);
    if (view.tiles.every((t) => t.placed)) roundDone(said);
  }

  function roundDone(said) {
    busy = true;
    const mine = view;
    showMarks(at + 1);
    said.then(() => wait(NEXT)).then(() => {
      if (view !== mine) return;
      if (at + 1 < rounds.length) openRound(at + 1);
      else finish();
    });
  }

  function finish() {
    stopCounting();
    keep(batch);
    ended = true;
    view = null;
    $('slot').hidden = true;
    $('slot').replaceChildren();
    $('buttons').hidden = true;
    $('sheet').classList.add('ended');
    $('end').hidden = false;
    Promise.race([Promise.all([sound.say(TEXT.praise.clip), wait(REST)]), wait(PATIENCE * 2)]).then(() => {
      if (ended) $('buttons').hidden = false;
    });
  }

  function listen() {
    const slot = $('slot');
    slot.addEventListener('pointerdown', (event) => {
      if (event.button > 0) return;
      lift(event);
    });
    slot.addEventListener('pointermove', (event) => {
      if (drag && event.pointerId === drag.id) carry(event);
    });
    slot.addEventListener('pointerup', (event) => drop(event, false));
    slot.addEventListener('pointercancel', (event) => drop(event, true));
    slot.addEventListener('contextmenu', (event) => event.preventDefault());
    slot.addEventListener('dragstart', (event) => event.preventDefault());
    $('line').addEventListener('click', () => sound.say(TEXT.line.clip));
    $('again').addEventListener('click', startBatch);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden || !drag) return;
      drop({ pointerId: drag.id }, true);
    });
    const resized = () => {
      if (view && (slot.clientWidth !== view.w || slot.clientHeight !== view.h)) place();
    };
    addEventListener('resize', resized);
    if (typeof ResizeObserver === 'function') new ResizeObserver(resized).observe(slot);
  }

  /* For trying the game by script on the family's computer. */
  function hook() {
    const page = (box, size) => {
      const slot = $('slot').getBoundingClientRect();
      return [slot.left + box.x + size / 2, slot.top + box.y + size / 2];
    };
    window.matchGame = {
      get state() {
        return {
          batch, at, rounds: rounds.length, ended, busy,
          groups: view ? view.cards.map((c) => ({ n: c.n, kind: c.kind, filled: c.filled })) : null,
          tray: view ? view.tiles.map((t) => ({ n: t.n, placed: t.placed })) : null,
          layout: view && view.layout ? { trayAt: view.layout.L.trayAt, cols: view.layout.L.cols, badgeAt: view.layout.L.badgeAt, s: Math.round(view.layout.L.s), T: view.layout.L.T } : null,
        };
      },
      plan: () => rounds.map((r) => r.groups.map((g) => `${g.n}:${g.kind}`)),
      /* Page coordinates of the middle of each number (tile-<n>), group (card-<n>) and group's place (badge-<n>). */
      hits() {
        const out = {};
        if (!view || !view.layout) return out;
        const { cards, L } = view.layout;
        view.tiles.forEach((t) => { out[`tile-${t.n}`] = page(home(t), L.T); });
        view.cards.forEach((c, i) => {
          const box = cards[i];
          const slot = $('slot').getBoundingClientRect();
          out[`card-${c.n}`] = [slot.left + box.x + box.w / 2, slot.top + box.y + box.h / 2];
          out[`badge-${c.n}`] = page(box.badge, L.T);
        });
        return out;
      },
      open: (index) => openRound(clamp(index, 0, rounds.length - 1)),
      finish,
      place,
      hands: handsMarkup,
    };
  }

  document.body.classList.toggle('mt-latin', batch === 'en');
  listen();
  if (LOCAL) hook();
  for (const id of ['home', 'exit', 'to-hub']) if ($(id)) $(id).href = 'numbers.html';
  document.title = TEXT.line.text;
  const clips = [TEXT.line.clip, TEXT.praise.clip];
  if (batch === 'ar') for (let n = 1; n <= 10; n++) clips.push(`count-${n}`);
  else sound.preload(Array.from({ length: 10 }, (_, i) => `en-${i + 1}`));
  sound.preloadPrompts(clips);
  sound.say(TEXT.line.clip);
  startBatch();
})();
