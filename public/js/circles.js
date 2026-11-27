/* «رَتِّبِ الدَّوَائِرَ» on the door فَكِّرْ: the family's wooden color board, on the
   screen. The father's request (2026-11-26), with a photo of the toy: cards
   from easy to hard; the voice says «رَتِّبِ الدَّوَائِرَ كَمَا فِي الصُّورَةِ»
   (Egyptian «رتب الدوائر زي الصورة»). His second round the same night: harder
   boards that must be dug out, fifty of them, skipping ahead for a child
   who solves them at once, arrows to move between boards, a board played
   again, and the hint only after ten wrong moves.

   The board works as the toy does. Four columns of colored discs, four of
   each color. A column holds five: its fifth place is in the lane across
   the top, the only way from one column to another, so a disc resting there
   closes the way past its column. The board stands up on the screen, so a
   disc falls to the bottom of the column it is put in. A card shows the
   sixteen discs in the four lower rows; when the board matches it, the
   chime, and the next board. Nothing is lost: every move can be taken back.

   The child moves a disc either way:
   - drag it: the top disc of a column follows the finger inside the
     grooves (up its column, along the lane, down another), never through
     another disc, and falls into the column it is let go in;
   - tap a column: its top disc rises to the lane; tap another column and it
     slides there and falls in; tap the same column and it goes back down.
     If a disc in the lane is in the way, it slides up to it, knocks, and
     comes back.

   A wrong move is one that does not bring the board nearer its card: the
   fewest moves left are as many as before it, or more. (Every board's
   distance to its card is known: searched once per board from the card
   out to DEPTH moves, and beyond that by a search from the board until it
   meets them.) After ten wrong moves the light bulb comes out on the
   card's corner, pulses three times and stays; a tap on it shows the next
   move of a shortest way (a dotted path and a ring), and it goes away
   until ten more wrong moves.

   The boards are public/circles/cards.json, written by tools/make-circles.js:
   fifty, from 3 moves to 20, every one needing discs to be parked to free
   others. Skipping ahead: a board solved with no more wrong moves than
   about one in seven of its moves, and no hint, moves three boards on among
   the first ten, two among the next fifteen, one after that; any other
   solve moves one on. The arrows under the paper go to the board before or
   after whatever happened; the middle button starts this board again.

   think.html loads this file too, to draw the game's card on the door. */
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'circles';
  const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
  const NS = 'http://www.w3.org/2000/svg';

  /* What the child sees and hears; the parents approve every line. */
  const TEXT = {
    line: { text: 'رَتِّبِ الدَّوَائِرَ كَمَا فِي الصُّورَةِ', clip: 'circles-line' }, // the father's words (2026-11-26), voweled
    praise: { text: 'أحسنت', clip: 'well-done' },
  };

  /* The toy's four colors: each disc's face and its rim. */
  const COLORS = {
    g: { face: '#45AE3B', rim: '#2D7D25' },
    r: { face: '#E2383A', rim: '#A52224' },
    y: { face: '#F9CF2A', rim: '#C99A06' },
    b: { face: '#1F86DD', rim: '#135E9F' },
  };

  const COLS = 4;
  const LANE = 4; // the lane's row: rows 0 to 3 are the card's, from the bottom
  const CAP = 5;

  /* The board in its own lengths: a column every PX, a row every PY. */
  const PX = 1.3;
  const PY = 1;
  const M = 0.45; // the wooden frame round the grooves
  const TRACK = 0.98; // a groove's width
  const R = 0.43; // a disc's radius
  const BW = 2 * M + COLS * PX;
  const BH = 2 * M + (LANE + 1) * PY;
  /* The card: as wide as the board, its dots under the board's columns. */
  const CW = BW;
  const CH = 3.5;
  const RING = 0.6; // room above the card, for its rings and the bulb
  const DOT = 0.27;
  const dotY = (row) => 0.85 + row * 0.66; // from the card's top, the top row first

  const SPEED = 26; // rows a second, as a disc slides
  const DROP = 34; // as a disc let go falls into its place
  const TAP = 10; // CSS pixels: a finger that moves less taps
  const WRONG = 10; // wrong moves before the bulb comes out
  const HINT_FOR = 6000; // ms the next move stays shown, unless a move is made first
  const NEXT = 1500; // ms from the chime to the next board
  const PATIENCE = 4000;
  const REST = 900;
  const LINE_WAIT = 2500;
  const JUMP = [3, 2, 1]; // how far a board solved at once moves on: boards 1-10, 11-25, 26-50
  const tierOf = (i) => (i < 10 ? 0 : i < 25 ? 1 : 2);

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const INDIC = '٠١٢٣٤٥٦٧٨٩';
  const indic = (n) => String(n).replace(/\d/g, (d) => INDIC[d]);

  /* Kept on the device: the board reached, the boards solved, and whether
     the last was ever solved. */
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

  /* Moves: the top disc of column a to column b, if b has room and no disc
     rests in the lane above a column between them. Boards are four strings. */
  const key = (cols) => cols.join('|');
  function* movesOf(cols) {
    for (let a = 0; a < COLS; a++) {
      if (!cols[a].length) continue;
      for (let b = 0; b < COLS; b++) {
        if (b === a || cols[b].length >= CAP) continue;
        let open = true;
        for (let c = Math.min(a, b) + 1; c < Math.max(a, b); c++) if (cols[c].length >= CAP) open = false;
        if (!open) continue;
        const next = cols.slice();
        next[b] = cols[b] + cols[a][cols[a].length - 1];
        next[a] = cols[a].slice(0, -1);
        yield { a, b, next };
      }
    }
  }

  /* Drawing. Everything is drawn in CSS pixels from one layout L:
     L.s pixels to a length of the board, L.bx/L.by its top left corner,
     L.cx/L.cy the card's. */
  const colX = (L, x) => L.bx + L.s * (M + PX / 2 + x * PX);
  const rowY = (L, y) => L.by + L.s * (M + PY / 2 + (LANE - y) * PY);
  const cardX = (L, c) => L.cx + L.s * (M + PX / 2 + c * PX);

  function boardMarkup(L) {
    const s = L.s;
    const x0 = L.bx;
    const y0 = L.by;
    const top = y0 + s * (M + 0.02);
    const laneBottom = y0 + s * (M + PY - 0.02);
    const bottom = y0 + s * (M + (LANE + 1) * PY - 0.02);
    const left = (c) => colX(L, c) - (s * TRACK) / 2;
    const right = (c) => colX(L, c) + (s * TRACK) / 2;
    let groove = `M${left(0)} ${top}H${right(COLS - 1)}V${bottom}H${left(COLS - 1)}V${laneBottom}`;
    for (let c = COLS - 2; c >= 0; c--) groove += `H${right(c)}V${bottom}H${left(c)}${c ? `V${laneBottom}` : ''}`;
    groove += 'Z';
    const screw = (x, y) => `<g transform="translate(${x} ${y})"><circle r="${s * 0.1}" fill="#D3D3D0" stroke="#8C8A84" stroke-width="${s * 0.025}"/><path d="M${-s * 0.06} 0H${s * 0.06}M0 ${-s * 0.06}V${s * 0.06}" stroke="#7A7872" stroke-width="${s * 0.025}" stroke-linecap="round"/></g>`;
    let out = `<rect x="${x0}" y="${y0}" width="${s * BW}" height="${s * BH}" rx="${s * 0.32}" fill="#EFD3A3" stroke="#C49758" stroke-width="${s * 0.04}"/>`;
    // The grain of the wood, faint.
    for (let i = 1; i < 7; i++) {
      const y = y0 + (s * BH * i) / 7;
      out += `<path d="M${x0 + s * 0.2} ${y}c${s * 1.5} ${-s * 0.12} ${s * 3} ${s * 0.12} ${s * (BW - 0.4)} ${-s * 0.04}" fill="none" stroke="#E2C28C" stroke-width="${s * 0.03}"/>`;
    }
    out += `<rect x="${x0 + s * 0.17}" y="${y0 + s * 0.17}" width="${s * (BW - 0.34)}" height="${s * (BH - 0.34)}" rx="${s * 0.2}" fill="none" stroke="#D8B176" stroke-width="${s * 0.035}"/>`;
    out += `<path d="${groove}" fill="#D3A96C" stroke="#B48347" stroke-width="${s * 0.05}" stroke-linejoin="round"/>`;
    // The grooves' floor catches a little light along one side.
    for (let c = 0; c < COLS; c++) out += `<rect x="${left(c) + s * 0.06}" y="${laneBottom}" width="${s * 0.08}" height="${bottom - laneBottom - s * 0.06}" fill="#DDB57C"/>`;
    for (let c = 0; c < COLS - 1; c++) out += screw((right(c) + left(c + 1)) / 2, laneBottom + s * 0.32);
    for (const [cx, cy] of [[0.24, 0.24], [BW - 0.24, 0.24], [0.24, BH - 0.24], [BW - 0.24, BH - 0.24]]) out += screw(x0 + s * cx, y0 + s * cy);
    return out;
  }

  function cardMarkup(L, rows, number) {
    const s = L.s;
    const x = L.cx;
    const y = L.cy;
    let out = '';
    // The cards behind, as on the toy's ring binder.
    for (const k of [2, 1]) out += `<rect x="${x + s * 0.05 * k}" y="${y + s * 0.07 * k}" width="${s * CW}" height="${s * CH}" rx="${s * 0.2}" fill="#F3F1EC" stroke="#D9D5CC" stroke-width="${s * 0.03}"/>`;
    out += `<rect x="${x}" y="${y}" width="${s * CW}" height="${s * CH}" rx="${s * 0.2}" fill="#fff" stroke="#D5D1C8" stroke-width="${s * 0.035}"/>`;
    for (const share of [0.27, 0.73]) {
      const rx = x + s * CW * share;
      const hole = y + s * 0.24;
      out += `<ellipse cx="${rx}" cy="${hole}" rx="${s * 0.09}" ry="${s * 0.07}" fill="#BDB8AE"/>`;
      out += `<path d="M${rx - s * 0.16} ${hole}A${s * 0.2} ${s * 0.36} 0 1 1 ${rx + s * 0.16} ${hole}" fill="none" stroke="#B9B5AC" stroke-width="${s * 0.11}" stroke-linecap="round"/>`;
      out += `<path d="M${rx - s * 0.16} ${hole}A${s * 0.2} ${s * 0.36} 0 1 1 ${rx + s * 0.16} ${hole}" fill="none" stroke="#F4F2EE" stroke-width="${s * 0.06}" stroke-linecap="round"/>`;
    }
    rows.forEach((row, r) => {
      [...row].forEach((color, c) => {
        out += `<circle cx="${cardX(L, c)}" cy="${y + s * dotY(r)}" r="${s * DOT}" fill="${COLORS[color].face}"/>`;
      });
    });
    if (number) out += `<text x="${x + s * 0.34}" y="${y + s * (CH - 0.3)}" font-size="${s * 0.3}" fill="#B9B4AA">${indic(number)}</text>`;
    return out;
  }

  /* A disc, drawn round its middle; it is moved by its transform. */
  function discNode(L, color) {
    const s = L.s;
    const g = document.createElementNS(NS, 'g');
    const { face, rim } = COLORS[color];
    g.innerHTML = `<circle class="ci-ring" r="${s * R * 1.2}" fill="none" stroke="#F2B84B" stroke-width="${s * 0.09}" opacity="0"/>`
      + `<circle cx="${s * 0.04}" cy="${s * 0.07}" r="${s * R}" fill="#5B3A16" opacity=".22"/>`
      + `<circle r="${s * R}" fill="${rim}"/><circle r="${s * R * 0.84}" fill="${face}"/>`
      + `<ellipse cx="${-s * R * 0.3}" cy="${-s * R * 0.34}" rx="${s * R * 0.36}" ry="${s * R * 0.2}" transform="rotate(-32 ${-s * R * 0.3} ${-s * R * 0.34})" fill="#fff" opacity=".33"/>`;
    return g;
  }
  function putDisc(L, disc) {
    disc.node.setAttribute('transform', `translate(${colX(L, disc.x).toFixed(1)} ${rowY(L, disc.y).toFixed(1)})`);
  }

  /* Rows of a card from its columns (as written, from the bottom up). */
  const rowsOf = (cols) => [3, 2, 1, 0].map((r) => cols.map((col) => col[r]).join(''));

  /* The door: the toy's card over its board, as in the father's photo. */
  function drawArt(svg) {
    // Close in, as a photo would be: the card whole, the board's lower rows out of the picture.
    const s = 54;
    const L = { s, bx: (400 - s * BW) / 2, cy: s * 0.45 };
    L.cx = L.bx;
    L.by = L.cy + s * (CH - 0.25);
    const card = ['gryb', 'gryb', 'gryb', 'gryb'];
    const board = ['gggg', 'yrrb', 'yrbyb', 'yrb'];
    // The card stands on the board's top edge, as on the toy.
    svg.innerHTML = `<rect width="400" height="400" fill="#F6F0FA"/>${cardMarkup(L, card, 0)}${boardMarkup(L)}`;
    board.forEach((col, c) => [...col].forEach((color, r) => {
      const disc = { node: discNode(L, color), x: c, y: r };
      putDisc(L, disc);
      svg.append(disc.node);
    }));
  }

  if (document.body.classList.contains('sheet-hub')) {
    const art = document.querySelector('[data-circles-art]');
    if (art) drawArt(art);
    const card = $('circles-card');
    const show = () => {
      if (!card) return;
      const star = card.querySelector('.sheet-star');
      if (load().done && !star) {
        const mark = document.createElement('span');
        mark.className = 'sheet-star';
        mark.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
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

  let cards = []; // from cards.json: { card, moves, dig, start }
  let at = 0; // the board on the screen
  let cols = null; // the board without a disc in the hand: per column, its colors from the bottom up
  let discs = null; // the same, the drawn discs { node, color, x, y }
  let goalRows = null;
  let L = null; // the layout
  let held = null; // the disc in the hand: { disc, from, pos, goal, mode, then }
  let press = null; // the finger on the board
  let locked = true; // between boards
  let ended = false;
  let hint = null; // { a, b, until }: the move shown
  let play = null; // this board's play: { left, wrong, sinceHint, hinted, bulb }

  const svg = $('art');

  /* Layout: the card over the board, or beside it (on the right, read
     first), whichever lets the board be larger. The bulb, when it is out,
     sits on the card's top corner. */
  function layout(W, H) {
    const pad = 0.25;
    const ways = [
      { side: false, w: BW, h: RING + CH + 0.45 + BH },
      { side: true, w: BW + 0.8 + CW, h: Math.max(BH, RING + CH) },
    ];
    let best = null;
    for (const way of ways) {
      const s = Math.min(W / (way.w + 2 * pad), H / (way.h + 2 * pad), 120);
      if (!best || s > best.s) best = { ...way, s };
    }
    const { s } = best;
    const ox = (W - s * best.w) / 2;
    const oy = (H - s * best.h) / 2;
    const out = { s, side: best.side, W, H };
    if (!best.side) {
      out.cx = ox;
      out.cy = oy + s * RING;
      out.bx = ox;
      out.by = out.cy + s * (CH + 0.45);
    } else {
      out.bx = ox;
      out.by = oy + (s * best.h - s * BH) / 2;
      out.cx = ox + s * (BW + 0.8);
      out.cy = oy + (s * best.h - s * (RING + CH)) / 2 + s * RING;
    }
    const d = clamp(s * 0.95, 44, 70);
    out.bulb = { x: out.cx + s * 0.62 - d / 2, y: out.cy - d * 0.42, d };
    return out;
  }

  function render() {
    const slot = $('slot');
    const W = slot.clientWidth;
    const H = slot.clientHeight;
    if (!W || !H || !cols) return;
    L = layout(W, H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.innerHTML = `${cardMarkup(L, goalRows, at + 1)}${boardMarkup(L)}<g id="ci-path"></g><g id="ci-discs"></g>`;
    const layer = svg.querySelector('#ci-discs');
    const all = discs.flat().concat(held ? [held.disc] : []);
    for (const disc of all) {
      disc.node = discNode(L, disc.color);
      layer.append(disc.node);
      putDisc(L, disc);
    }
    if (held) ring(held.disc, true);
    const bulb = $('hint');
    bulb.style.left = `${L.bulb.x}px`;
    bulb.style.top = `${L.bulb.y}px`;
    bulb.style.width = `${L.bulb.d}px`;
    bulb.style.height = `${L.bulb.d}px`;
    drawHint();
  }

  const ring = (disc, on) => {
    const node = disc.node && disc.node.querySelector('.ci-ring');
    if (node) node.setAttribute('opacity', on ? '1' : '0');
  };

  /* The line at the top: a button that says it again, its words those of
     the recording that plays (sound.caption: Fusha, or the Egyptian card's
     words when the Egyptian recording is the one heard). */
  function showLine() {
    const line = $('line');
    sound.caption(line, TEXT.line.text, TEXT.line.clip).then(() => line.classList.remove('caption-wait'), () => line.classList.remove('caption-wait'));
    setTimeout(() => line.classList.remove('caption-wait'), LINE_WAIT);
  }

  /* The bar under the paper: the arrows, and a mark per board (filled once
     solved, a ring for the board now). */
  function showNav() {
    const kept = load();
    const marks = $('marks');
    if (marks.childElementCount !== cards.length) marks.replaceChildren(...cards.map(() => document.createElement('i')));
    [...marks.children].forEach((mark, i) => {
      mark.className = i === at ? 'now' : kept.won.includes(i) ? 'done' : '';
    });
    $('prev').disabled = at === 0;
    $('next').disabled = at === cards.length - 1;
  }

  function openCard(index) {
    at = index;
    const entry = cards[index];
    goalRows = rowsOf(entry.card);
    cols = entry.start.slice();
    discs = cols.map((col, c) => [...col].map((color, r) => ({ node: null, color, x: c, y: r })));
    held = null;
    press = null;
    hint = null;
    locked = false;
    ended = false;
    play = { left: entry.moves, wrong: 0, sinceHint: 0, hinted: false, moves: 0 };
    keep({ at: index });
    showBulb(false);
    $('sheet').classList.remove('ended');
    $('end').hidden = true;
    $('slot').hidden = false;
    render();
    $('slot').classList.remove('ci-in');
    void $('slot').offsetWidth;
    $('slot').classList.add('ci-in');
    showNav();
    // The distances are worked out while the child looks at the board.
    setTimeout(() => {
      if (at === index && !locked) distances();
    }, 500);
  }

  const solved = () => cols.every((col, c) => col === cards[at].card[c]);

  /* The lane is open to a disc lifted out of column a from lo to hi. */
  function reach(a) {
    let lo = a;
    let hi = a;
    while (lo > 0 && cols[lo - 1].length < CAP) lo -= 1;
    while (hi < COLS - 1 && cols[hi + 1].length < CAP) hi += 1;
    return [lo, hi];
  }

  /* One step along the grooves from p toward t, at most d long: up out of a
     column, along the lane, down into the other. Returns the new place and
     whether it is t. */
  function advance(p, t, d) {
    let { x, y } = p;
    const same = Math.abs(x - t.x) < 1e-6;
    if (!same && y < LANE) {
      const step = Math.min(d, LANE - y);
      y += step;
      d -= step;
      if (y < LANE - 1e-6) return { x, y, done: false };
      y = LANE;
    }
    if (!same) {
      const dx = t.x - x;
      const step = Math.min(d, Math.abs(dx));
      x += Math.sign(dx) * step;
      d -= step;
      if (Math.abs(t.x - x) > 1e-6) return { x, y, done: false };
      x = t.x;
    }
    const dy = t.y - y;
    const step = Math.min(d, Math.abs(dy));
    y += Math.sign(dy) * step;
    const done = Math.abs(t.y - y) < 1e-6;
    return { x, y: done ? t.y : y, done };
  }

  /* The nearest place to the finger that the disc in the hand can reach. */
  function project(px, py) {
    const [lo, hi] = reach(held.from);
    let best = null;
    const consider = (x, y) => {
      const d = Math.hypot(colX(L, x) - px, rowY(L, y) - py);
      if (!best || d < best.d) best = { x, y, d };
    };
    const fx = ((px - L.bx) / L.s - M - PX / 2) / PX;
    const fy = LANE - ((py - L.by) / L.s - M - PY / 2) / PY;
    consider(clamp(fx, lo, hi), LANE);
    for (let c = lo; c <= hi; c++) consider(c, clamp(fy, cols[c].length, LANE));
    return { x: best.x, y: best.y };
  }

  /* The column under a point, or -1 off the board. */
  function columnAt(px, py) {
    const fx = ((px - L.bx) / L.s - M - PX / 2) / PX;
    const fy = (py - L.by) / L.s;
    if (fy < -0.6 || fy > BH + 0.6 || fx < -0.9 || fx > COLS - 0.1) return -1;
    return clamp(Math.round(fx), 0, COLS - 1);
  }

  function pickUp(c) {
    cols[c] = cols[c].slice(0, -1);
    const disc = discs[c].pop();
    held = { disc, from: c, pos: { x: disc.x, y: disc.y }, goal: null, mode: 'press', then: null };
    ring(disc, true);
    // The disc in the hand is drawn over the others.
    disc.node.parentNode.append(disc.node);
  }

  /* The disc in the hand goes into column c, falling to its place. */
  function settle(c, fast) {
    const h = held;
    h.mode = 'travel';
    h.goal = { x: c, y: cols[c].length };
    h.speed = fast ? DROP : SPEED;
    h.then = () => land(c);
  }

  function land(c) {
    const h = held;
    held = null;
    ring(h.disc, false);
    h.disc.x = c;
    h.disc.y = cols[c].length;
    cols[c] += h.disc.color;
    discs[c].push(h.disc);
    putDisc(L, h.disc);
    sound.tick();
    if (c === h.from) return;
    moved();
  }

  /* After a move: was it a wrong one, is the bulb earned, is the card matched. */
  function moved() {
    play.moves += 1;
    clearHint();
    const left = distance(cols);
    if (left >= play.left) {
      play.wrong += 1;
      play.sinceHint += 1;
    }
    play.left = left;
    if (solved()) {
      win();
      return;
    }
    if (!play.bulb && play.sinceHint >= WRONG) showBulb(true);
  }

  /* Tapped toward a column the lane does not reach: the disc slides up to
     the disc in the way, knocks, and comes back to the lane over its own
     column. */
  function bump(b) {
    const [lo, hi] = reach(held.from);
    const edge = b < lo ? lo : hi;
    const toward = b < lo ? -1 : 1;
    const blocker = discs[edge + toward] && discs[edge + toward][LANE];
    held.mode = 'travel';
    held.speed = SPEED;
    held.goal = { x: edge + toward * 0.12, y: LANE };
    held.then = () => {
      sound.tick();
      if (blocker) nudge(blocker, toward);
      held.mode = 'travel';
      held.goal = { x: held.from, y: LANE };
      held.then = () => {
        held.mode = 'lifted';
        held.goal = null;
      };
    };
  }

  /* A disc in the way gives a little. */
  function nudge(disc, toward) {
    const began = performance.now();
    const step = () => {
      const t = (performance.now() - began) / 220;
      if (t >= 1 || !disc.node) {
        putDisc(L, disc);
        return;
      }
      const dx = Math.sin(t * Math.PI) * 0.06 * toward;
      disc.node.setAttribute('transform', `translate(${colX(L, disc.x + dx).toFixed(1)} ${rowY(L, disc.y).toFixed(1)})`);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* The finger */

  function point(event) {
    const box = svg.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function down(event) {
    if (event.button > 0 || locked || press || !L) return;
    const p = point(event);
    if (held && held.mode !== 'lifted') return; // a disc is on its way
    if (!held) {
      const c = columnAt(p.x, p.y);
      if (c < 0 || !cols[c].length) return;
      pickUp(c);
    }
    event.preventDefault();
    press = { id: event.pointerId, start: p, moved: false, lifted: held.mode === 'lifted', touch: event.pointerType !== 'mouse' };
    try {
      svg.setPointerCapture(event.pointerId);
    } catch {
      // Already gone: the lift will still come.
    }
  }

  function move(event) {
    if (!press || event.pointerId !== press.id || !held) return;
    const p = point(event);
    if (!press.moved && Math.hypot(p.x - press.start.x, p.y - press.start.y) < TAP) return;
    press.moved = true;
    held.mode = 'drag';
    held.speed = SPEED * 1.4;
    // On glass the disc rides a little above the finger, so the finger does not hide it.
    const lift = press.touch ? L.s * 0.55 : 0;
    held.goal = project(p.x, p.y - lift);
    held.then = null;
  }

  function up(event, lost) {
    if (!press || event.pointerId !== press.id) return;
    const { moved: dragged, lifted } = press;
    press = null;
    if (!held) return;
    if (dragged || lost) {
      // Into the column it is over: on the lane, the nearest it can reach.
      const to = held.goal || held.pos;
      let c = Math.round(to.x);
      if (to.y >= LANE - 1e-6) {
        const [lo, hi] = reach(held.from);
        c = clamp(Math.round(to.x), lo, hi);
      }
      settle(c, true);
      return;
    }
    if (!lifted) {
      // A tap on a column: its top disc rises to the lane.
      held.mode = 'travel';
      held.speed = SPEED;
      held.goal = { x: held.from, y: LANE };
      held.then = () => {
        held.mode = 'lifted';
        held.goal = null;
      };
      return;
    }
    // A tap while a disc waits in the lane: it goes to the column tapped.
    const p = point(event);
    const b = columnAt(p.x, p.y);
    if (b < 0 || b === held.from) {
      settle(held.from, false);
      return;
    }
    const [lo, hi] = reach(held.from);
    if (b >= lo && b <= hi) settle(b, false);
    else bump(b);
  }

  /* Every frame: the disc in the hand moves on; the hint's ring pulses. */
  let before = 0;
  function frameStep(now) {
    requestAnimationFrame(frameStep);
    const dt = before ? Math.min(0.05, (now - before) / 1000) : 0;
    before = now;
    if (held && held.goal && L) {
      const next = advance(held.pos, held.goal, (held.speed || SPEED) * dt);
      held.pos = { x: next.x, y: next.y };
      held.disc.x = next.x;
      held.disc.y = next.y;
      putDisc(L, held.disc);
      if (next.done && held.mode !== 'drag' && held.then) {
        const then = held.then;
        held.then = null;
        then();
      }
    }
    if (hint && L) {
      if (now > hint.until) clearHint();
      else pulse(now);
    }
  }

  /* How far a board is from the card. The distances to the card are
     searched once per board, out to DEPTH moves; a board further away is
     searched forward until it meets them. */
  const DEPTH = 12;
  const MOST = 160000;
  let near = null; // Map: board -> moves to the card
  let nearFor = -1;

  function distances() {
    if (nearFor === at && near) return near;
    const goal = cards[at].card.slice();
    near = new Map([[key(goal), 0]]);
    let edge = [goal];
    for (let d = 1; d <= DEPTH && edge.length && near.size < MOST; d++) {
      const next = [];
      for (const board of edge) {
        for (const { next: m } of movesOf(board)) {
          const k = key(m);
          if (near.has(k)) continue;
          near.set(k, d);
          next.push(m);
        }
      }
      edge = next;
    }
    nearFor = at;
    return near;
  }

  function distance(board) {
    const dist = distances();
    const k = key(board);
    if (dist.has(k)) return dist.get(k);
    // Out of the searched ring: layer by layer, until a layer meets it; the
    // fewest moves are then the layer plus the least distance met there.
    const seen = new Set([k]);
    let edge = [board];
    for (let layer = 1; edge.length && seen.size < MOST; layer++) {
      const next = [];
      let best = Infinity;
      for (const b of edge) {
        for (const { next: m } of movesOf(b)) {
          const mk = key(m);
          if (seen.has(mk)) continue;
          seen.add(mk);
          if (dist.has(mk)) best = Math.min(best, dist.get(mk));
          next.push(m);
        }
      }
      if (best < Infinity) return layer + best;
      edge = next;
    }
    return play ? play.left : 0; // too far to tell: count the move as neither
  }

  /* The next move of a shortest way from the board as it is. */
  function nextMove() {
    const d = distance(cols);
    if (d === 0) return null;
    let best = null;
    for (const m of movesOf(cols)) {
      const left = distance(m.next);
      if (!best || left < best.left) best = { ...m, left };
      if (left === d - 1) break;
    }
    return best;
  }

  /* The bulb: out after ten wrong moves (it pulses three times, then
     stays), away again once it is used. */
  function showBulb(on) {
    const bulb = $('hint');
    if (play) play.bulb = on;
    bulb.hidden = !on;
    bulb.classList.remove('ci-pulse');
    if (on) {
      void bulb.offsetWidth;
      bulb.classList.add('ci-pulse');
    }
  }

  function showHint() {
    if (locked || ended || !L || !play || !play.bulb) return;
    if (held) {
      // The disc in the hand goes home first; then the hint.
      if (held.mode !== 'lifted' && held.mode !== 'press') return;
      const from = held.from;
      settle(from, true);
      held.then = () => {
        land(from);
        showHint();
      };
      return;
    }
    const m = nextMove();
    if (!m) return;
    play.hinted = true;
    play.sinceHint = 0;
    showBulb(false);
    hint = { a: m.a, b: m.b, until: performance.now() + HINT_FOR };
    drawHint();
  }

  /* A dotted way from the disc to move to its place, and a ring round it. */
  function drawHint() {
    const layer = svg.querySelector('#ci-path');
    if (!layer) return;
    if (!hint || !L) {
      layer.innerHTML = '';
      return;
    }
    const { a, b } = hint;
    const fromY = cols[a].length - 1;
    const toY = cols[b].length;
    const s = L.s;
    const d = `M${colX(L, a)} ${rowY(L, fromY)}V${rowY(L, LANE)}H${colX(L, b)}V${rowY(L, toY)}`;
    layer.innerHTML = `<path d="${d}" fill="none" stroke="#fff" stroke-width="${s * 0.2}" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>`
      + `<path d="${d}" fill="none" stroke="#B07A1E" stroke-width="${s * 0.09}" stroke-dasharray="${s * 0.02} ${s * 0.2}" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<circle cx="${colX(L, b)}" cy="${rowY(L, toY)}" r="${s * R}" fill="none" stroke="#B07A1E" stroke-width="${s * 0.07}" stroke-dasharray="${s * 0.16} ${s * 0.12}"/>`
      + `<circle class="ci-pulse" cx="${colX(L, a)}" cy="${rowY(L, fromY)}" r="${s * R * 1.2}" fill="none" stroke="#F2B84B" stroke-width="${s * 0.1}"/>`;
  }
  function pulse(now) {
    const node = svg.querySelector('.ci-pulse');
    if (!node) return;
    const t = (Math.sin(now / 180) + 1) / 2;
    node.setAttribute('r', (L.s * R * (1.15 + t * 0.25)).toFixed(1));
    node.setAttribute('opacity', (1 - t * 0.6).toFixed(2));
  }
  function clearHint() {
    if (!hint) return;
    hint = null;
    drawHint();
  }

  /* The card matched: the chime, the discs light column by column, and the
     next board, further on when it was solved at once. */
  function win() {
    locked = true;
    clearHint();
    showBulb(false);
    sound.chime();
    discs.forEach((col, c) => setTimeout(() => col.forEach((disc) => ring(disc, true)), 120 * c));
    const entry = cards[at];
    const last = cards.length - 1;
    const quick = !play.hinted && play.wrong <= Math.max(1, Math.round(entry.moves / 7));
    const kept = load();
    const won = kept.won.includes(at) ? kept.won : kept.won.concat(at);
    const finished = at === last;
    const next = finished ? 0 : Math.min(last, at + (quick ? JUMP[tierOf(at)] : 1));
    keep({ won, done: kept.done || finished, at: next });
    showNav();
    const mine = at;
    setTimeout(() => {
      if (ended || at !== mine) return;
      if (finished) finish();
      else openCard(next);
    }, NEXT);
  }

  function finish() {
    ended = true;
    locked = true;
    held = null;
    $('slot').hidden = true;
    $('buttons').hidden = true;
    $('sheet').classList.add('ended');
    $('end').hidden = false;
    Promise.race([Promise.all([sound.say(TEXT.praise.clip), wait(REST)]), wait(PATIENCE * 2)]).then(() => {
      if (ended) $('buttons').hidden = false;
    });
  }

  function go(index) {
    if (!cards.length || index < 0 || index >= cards.length) return;
    openCard(index);
  }

  function listen() {
    svg.addEventListener('pointerdown', down);
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerup', (event) => up(event, false));
    svg.addEventListener('pointercancel', (event) => up(event, true));
    svg.addEventListener('contextmenu', (event) => event.preventDefault());
    $('hint').addEventListener('click', showHint);
    $('line').addEventListener('click', () => sound.say(TEXT.line.clip));
    $('prev').addEventListener('click', () => go(at - 1));
    $('next').addEventListener('click', () => go(at + 1));
    $('replay').addEventListener('click', () => go(at));
    $('again').addEventListener('click', () => go(0));
    const resized = () => {
      const slot = $('slot');
      if (!L || slot.clientWidth !== L.W || slot.clientHeight !== L.H) {
        if (press) up({ pointerId: press.id, clientX: 0, clientY: 0 }, true);
        render();
      }
    };
    addEventListener('resize', resized);
    if (typeof ResizeObserver === 'function') new ResizeObserver(resized).observe($('slot'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && press) up({ pointerId: press.id, clientX: 0, clientY: 0 }, true);
    });
    // From the beginning, in the ☰ menu.
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
    window.circlesGame = {
      get state() {
        return {
          at, cards: cards.length, cols: cols && cols.slice(), held: held && { from: held.from, mode: held.mode, pos: held.pos }, locked, ended,
          hint: hint && { a: hint.a, b: hint.b }, play: play && { ...play }, kept: load(), layout: L && { s: Math.round(L.s), side: L.side },
        };
      },
      /* Page coordinates of a column's middle at a row. */
      at(c, row) {
        const box = svg.getBoundingClientRect();
        return [box.left + colX(L, c), box.top + rowY(L, row)];
      },
      open: (index) => go(clamp(index, 0, cards.length - 1)),
      distance: () => distance(cols),
      next() {
        const m = nextMove();
        return m && { a: m.a, b: m.b };
      },
      /* Makes one move at once, as a finished drag would (no animation). */
      move(a, b) {
        if (held || locked || !cols[a].length) return false;
        const ok = [...movesOf(cols)].some((m) => m.a === a && m.b === b);
        if (!ok) return false;
        const disc = discs[a].pop();
        cols[a] = cols[a].slice(0, -1);
        disc.x = b;
        disc.y = cols[b].length;
        cols[b] += disc.color;
        discs[b].push(disc);
        putDisc(L, disc);
        moved();
        return true;
      },
      finish,
      render,
    };
  }

  listen();
  if (LOCAL) hook();
  sound.preloadPrompts([TEXT.line.clip, TEXT.praise.clip]);
  showLine();
  requestAnimationFrame(frameStep);
  fetch('circles/cards.json').then((r) => r.json()).then((data) => {
    cards = data.cards;
    openCard(clamp(load().at || 0, 0, cards.length - 1));
    sound.say(TEXT.line.clip);
  });
})();
