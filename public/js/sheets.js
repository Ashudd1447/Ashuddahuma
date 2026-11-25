/* الْأَرْقَامُ وَالْحِسَابُ and فَكِّرْ: the number games and the thinking games of
   the son's two activity books, on the screen. sheets/sheets.json holds every
   page as data (written by tools/make-sheets.py from the books themselves) and
   this file plays it. numbers.html and think.html are the two doors: a card
   for each game, with a small still made from its own first round.
   sheet.html?g=<id> is one game: the run of its rounds, in book order.

   A round is one SVG drawing, the paper, laid out anew for the room the screen
   gives it. Where the book says to put a circle round the answer, the child
   taps it and the ring is drawn for him, as he would draw it on the page. A
   right answer chimes and the next round comes by itself; a wrong one wobbles
   with a soft buzz, nothing is lost, and he tries again. After the last round
   comes the praise, with a button back to the door and one to play again.
   Which games are finished, and how far along each is, is kept on the device. */
(() => {
  const $ = (id) => document.getElementById(id);

  const KEY = 'sheets';
  const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
  const NS = 'http://www.w3.org/2000/svg';
  const FILES = 'sheets/img/';
  const HUBS = { numbers: 'numbers.html', think: 'think.html' };

  /* What the child sees and hears; the parents approve every line. A game's
     title stands on its card, its line at the top of the game, and the clip is
     the line read aloud. The books' own lines speak of pencil and paper ("put
     a circle round"); these are the same lines for a finger on a screen. */
  const TEXT = {
    praise: { text: 'أحسنت', clip: 'well-done' },
    games: {
      count: { title: 'عُدَّ', line: 'عُدَّ، ثُمَّ اضْغَطْ عَلَى الْعَدَدِ', clip: 'sheet-count' },
      'color-count': { title: 'لَوِّنْ بِعَدَدِ الرَّقْمِ', line: 'لَوِّنْ بِعَدَدِ الرَّقْمِ', clip: 'sheet-color-count' },
      'match-number': { title: 'صِلْ كُلَّ مَجْمُوعَةٍ بِعَدَدِهَا', line: 'صِلْ كُلَّ مَجْمُوعَةٍ بِعَدَدِهَا', clip: 'sheet-match-number' },
      dots: { title: 'صِلِ النِّقَاطَ بِالتَّرْتِيبِ', line: 'صِلِ النِّقَاطَ بِالتَّرْتِيبِ', clip: 'sheet-dots' },
      more: { title: 'الْأَكْثَرُ', line: 'اِضْغَطْ عَلَى الْأَكْثَرِ', clip: 'sheet-more' },
      size: {
        title: 'الْأَكْبَرُ وَالْأَصْغَرُ',
        line: 'اِضْغَطْ عَلَى الْأَكْبَرِ',
        clip: 'sheet-bigger',
        smallest: { line: 'اِضْغَطْ عَلَى الْأَصْغَرِ', clip: 'sheet-smaller' },
      },
      missing: { title: 'الْعَدَدُ النَّاقِصُ', line: 'مَا الْعَدَدُ النَّاقِصُ؟', clip: 'sheet-missing' },
      shapes: { title: 'لَوِّنِ الْأَشْكَالَ', line: 'لَوِّنِ الْأَشْكَالَ كَمَا فِي الْمِثَالِ', clip: 'sheet-shapes' },
      add: { title: 'الْجَمْعُ بِالصُّوَرِ', line: 'عُدَّ الْكُلَّ، ثُمَّ اضْغَطْ عَلَى الْجَوَابِ', clip: 'sheet-add' },
      'color-number': { title: 'لَوِّنْ كُلَّ رَقْمٍ بِلَوْنِهِ', line: 'لَوِّنْ كُلَّ رَقْمٍ بِلَوْنِهِ', clip: 'sheet-color-number' },
      shadow: { title: 'صِلْ كُلَّ صُورَةٍ بِظِلِّهَا', line: 'صِلْ كُلَّ صُورَةٍ بِظِلِّهَا', clip: 'sheet-shadow' },
      different: { title: 'الْمُخْتَلِفُ', line: 'اِضْغَطْ عَلَى الْمُخْتَلِفِ', clip: 'sheet-different' },
      similar: { title: 'الصُّورَتَانِ الْمُتَشَابِهَتَانِ', line: 'اِضْغَطْ عَلَى الصُّورَتَيْنِ الْمُتَشَابِهَتَيْنِ', clip: 'sheet-similar' },
      next: { title: 'مَاذَا يَأْتِي بَعْدُ؟', line: 'مَاذَا يَأْتِي بَعْدُ؟', clip: 'sheet-next' },
      letter: { title: 'اِبْحَثْ عَنِ الْحَرْفِ', line: 'لَوِّنْ كُلَّ حَرْفٍ مِثْلَ هَذَا', clip: 'sheet-letter' },
      differences: { title: 'اِبْحَثْ عَنِ الِاخْتِلَافَاتِ', line: 'اِبْحَثْ عَنْ ٣ اخْتِلَافَاتٍ', clip: 'sheet-differences' },
      complete: { title: 'أَكْمِلِ الرَّسْمَ', line: 'أَكْمِلِ الرَّسْمَ', clip: 'sheet-complete' },
    },
  };

  const TARGET = 56; // the smallest thing to touch, in CSS pixels
  const SPACE = 0.12; // the room between two pictures of a group, as a share of a picture's width
  const SAID = 10; // the counting is recorded up to this number
  /* Tracing a dotted line, in CSS pixels: how near an end or the line's head a
     finger takes the line up, how far from the dots it may stray, how far ahead
     of its head the line may jump, how little counts as not begun, and how near
     the end counts as done. */
  const TRACE = { grip: 42, stray: 34, ahead: 84, begun: 14, done: 8 };

  /* Milliseconds. */
  const PAUSE = 1100; // a finished round stays this long before the next one comes
  const SLIDE = 450; // the right choice sliding into the place of the «؟»
  const STOPPED = 1000; // color-count: how long the right number of shapes stays colored before it counts
  const REST = 900; // the praise, before the buttons
  const PATIENCE = 6000; // the longest wait for a recording to end

  /* Pictures on which a wrong answer is told more gently: no buzz and no shaking. */
  const GENTLE = new Set(['mushaf', 'mosque', 'mosque-shadow', 'prayer-rug']);
  /* color-count says to color in any color: the crayons take turns by round. */
  const TURNS = ['red', 'blue', 'green', 'yellow'];
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const fix = (n) => Math.round(n * 100) / 100;
  const far = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const digits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

  let data = null; // sheets.json
  let pictures = {}; // its pictures' sizes, by name
  let kept = null; // what the device keeps, as it was read
  let game = null; // the open game
  let view = null; // the round on the screen
  let line = ''; // the clip of the instruction now on the line
  let press = null; // the finger that is down: { id, hit }
  let ended = false; // the praise is up
  let serial = 0; // for names inside the drawings
  const timers = new Set();

  /* The sounds made in code. An older saved copy of sound.js may lack one. */
  const beep = (name, ...values) => {
    if (typeof sound[name] === 'function') sound[name](...values);
  };
  /* A small step done right, on the way to a finished round: one short, soft note. */
  const ping = () => beep('tone', 740, 0, 0.13, 0.06, 'sine', 980);
  /* A recorded line, in the family's dialect; silent while it is not recorded. */
  const say = (clip) => sound.say(clip);

  /* Waits that end with the round: a later round never hears from an earlier one. */
  function later(run, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      run();
    }, ms);
    timers.add(id);
    return id;
  }

  function drop(id) {
    clearTimeout(id);
    timers.delete(id);
  }

  function forget() {
    for (const id of timers) clearTimeout(id);
    timers.clear();
  }

  /* Saved on the device: for each game, how many rounds of this run are done
     and whether it was ever finished. Anything else found there is ignored. */
  function progress(id) {
    const games = kept && kept.v === 1 && kept.games && typeof kept.games === 'object' ? kept.games : null;
    const entry = games && Object.prototype.hasOwnProperty.call(games, id) ? games[id] : null;
    const rounds = data.games.find((g) => g.id === id).rounds.length;
    const at = entry && Number.isInteger(entry.at) && entry.at > 0 && entry.at < rounds ? entry.at : 0;
    return { at, done: Boolean(entry && entry.done === true) };
  }

  function load() {
    try {
      kept = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      kept = null;
    }
  }

  function keep(id, at, finished) {
    load(); // another tab may have played meanwhile: its marks are kept
    const games = {};
    for (const g of data.games) {
      const was = progress(g.id);
      const now = g.id === id ? { at, done: finished || was.done } : was;
      if (now.at || now.done) games[g.id] = now;
    }
    kept = { v: 1, games };
    try {
      localStorage.setItem(KEY, JSON.stringify(kept));
    } catch {
      // Private browsing: the marks last for this visit only.
    }
  }

  /* Drawing: the pieces every game is made of */
  function svg(name, attrs = {}, kids = []) {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) {
      if (value !== null && value !== undefined && value !== false) node.setAttribute(key, typeof value === 'number' ? Math.round(value * 1e4) / 1e4 : value);
    }
    for (const kid of kids) if (kid) node.append(kid);
    return node;
  }

  function text(string, x, y, size, more = {}) {
    const node = svg('text', { x, y, 'font-size': size, ...more });
    node.textContent = string;
    return node;
  }

  const image = (name, x, y, w, h) => svg('image', { href: `${FILES}${name}.png`, x, y, width: w, height: h });
  /* The room a finger may touch for a thing: it is not seen. */
  const hit = ([x, y, w, h]) => svg('rect', { class: 'sh-hit', x, y, width: w, height: h });
  const grown = ([x, y, w, h], by, least = 0) => {
    const mx = Math.max(w * by, least);
    const my = Math.max(h * by, least);
    return [x - mx, y - my, w + 2 * mx, h + 2 * my];
  };
  /* A room made no smaller than a fingertip, about its own middle. */
  const atLeast = ([x, y, w, h], size) => {
    const nw = Math.max(w, size);
    const nh = Math.max(h, size);
    return [x - (nw - w) / 2, y - (nh - h) / 2, nw, nh];
  };
  const middle = ([x, y, w, h]) => [x + w / 2, y + h / 2];
  const part = (v, name) => v.svg.querySelector(`[data-hit="${name}"]`);
  const parse = (name) => {
    const [what, n] = String(name || '').split(':');
    return [what, Number(n)];
  };

  /* A box of the page (1 wide, h tall) at its largest in a room, in the middle of it. */
  function fit(bw, bh, x, y, w, h) {
    const s = Math.min(w / bw, h / bh);
    return { s, x: x + (w - bw * s) / 2, y: y + (h - bh * s) / 2, w: bw * s, h: bh * s };
  }

  /* Where a picture lies when it is put whole into a room, its shape kept. */
  function contain(name, [x, y, w, h]) {
    const p = pictures[name];
    const s = Math.min(w / p.w, h / p.h);
    return [x + (w - p.w * s) / 2, y + (h - p.h * s) / 2, p.w * s, p.h * s];
  }

  /* Equal things in rows: how many across make them largest in a room. Never
     a tall column of them (at most one row more than there are across), and of
     two ways equally large, the one whose last row is fuller, then the one
     with the longer rows. */
  const stands = (n, cols) => Math.ceil(n / cols) <= cols + 1;
  const lacks = (n, cols) => (cols - (n % cols)) % cols; // how many the last row is short of a full one
  const better = (now, best) => !best || now.u > best.u * 1.01 || (now.u >= best.u * 0.99 && now.lack <= best.lack);

  function rowsFor(n, ratio, w, h, space, most) {
    let best = null;
    for (let cols = 1; cols <= n; cols++) {
      if (!stands(n, cols)) continue;
      const rows = Math.ceil(n / cols);
      const now = { cols, lack: lacks(n, cols), u: Math.min(w / (cols + (cols - 1) * space), h / (rows * ratio + (rows - 1) * space), most) };
      if (better(now, best)) best = now;
    }
    return best;
  }

  /* Their places: rows filled from the right, as the page is read, each row in
     the middle, the whole about (cx, cy). */
  function rowPlaces(n, cols, u, ratio, space, cx, cy) {
    const rows = Math.ceil(n / cols);
    const high = u * ratio;
    const g = u * space;
    const top = cy - (rows * high + (rows - 1) * g) / 2;
    const places = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const across = Math.min(cols, n - row * cols);
      const right = cx + (across * u + (across - 1) * g) / 2;
      places.push([right - (i - row * cols) * (u + g) - u, top + row * (high + g), u, high]);
    }
    return places;
  }

  /* The ring a child draws round an answer: a loop a little uneven, begun near
     the top and ended past its own beginning. The same place gets the same
     ring every time. `square` 2 is an oval; more makes it squarer, for a box. */
  function loop([x, y, w, h], square) {
    let seed = Math.floor(Math.abs(x * 7.3 + y * 13.7 + w * 3.1)) % 2147483647 || 1;
    const rand = () => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    };
    const cx = x + w / 2;
    const cy = y + h / 2;
    const start = -Math.PI / 2 - 0.25 - rand() * 0.5;
    const turn = Math.PI * 2 * (1.06 + rand() * 0.04);
    const phase = rand() * Math.PI * 2;
    const lean = (rand() - 0.5) * 0.07;
    const steps = 48;
    const e = 2 / square;
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = start + (turn * i) / steps;
      const size = 0.975 + (i / steps) * 0.06 + 0.018 * Math.sin(t * 3 + phase);
      const c = Math.cos(t);
      const s = Math.sin(t);
      const px = Math.sign(c) * Math.abs(c) ** e * (w / 2) * size;
      const py = Math.sign(s) * Math.abs(s) ** e * (h / 2) * size;
      points.push([cx + px * Math.cos(lean) - py * Math.sin(lean), cy + px * Math.sin(lean) + py * Math.cos(lean)]);
    }
    // A smooth line through the points.
    let d = `M${fix(points[0][0])} ${fix(points[0][1])}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      d += `C${fix(p1[0] + (p2[0] - p0[0]) / 6)} ${fix(p1[1] + (p2[1] - p0[1]) / 6)} ${fix(p2[0] - (p3[0] - p1[0]) / 6)} ${fix(p2[1] - (p3[1] - p1[1]) / 6)} ${fix(p2[0])} ${fix(p2[1])}`;
    }
    return d;
  }

  /* The ring round a place; `drawn` shows the pencil going round. */
  function ring(v, place, square, drawn) {
    const node = svg('path', {
      class: drawn ? 'sh-ring sh-draw' : 'sh-ring',
      d: loop(place, square),
      pathLength: 1,
      'stroke-width': clamp(Math.min(place[2], place[3]) * 0.05, 3.2, 6),
    });
    v.top.append(node);
    return node;
  }

  /* A short movement of a thing, by a class the stylesheet knows: `no` shakes
     it, `not` only dims it for a moment, `pop` swells it once. */
  function nudge(node, name) {
    if (!node) return;
    clearTimeout(node.sheetNudge);
    node.classList.remove('sh-no', 'sh-not', 'sh-pop');
    node.getBoundingClientRect();
    node.classList.add(name);
    node.sheetNudge = setTimeout(() => node.classList.remove(name), 480);
  }

  /* A wrong answer: the soft buzz (a short vibration on a tablet) and a wobble. */
  function no(node, picture) {
    if (picture && GENTLE.has(picture)) {
      beep('tick');
      nudge(node, 'sh-not');
      return;
    }
    beep('wrong');
    nudge(node, 'sh-no');
  }

  /* A thing drawn where it stands, made to come there from another place. */
  function slide(node, from, to, scale) {
    const [fx, fy] = middle(from);
    const [tx, ty] = middle(to);
    node.style.transform = `translate(${fix(fx - tx)}px, ${fix(fy - ty)}px) scale(${fix(scale)})`;
    node.getBoundingClientRect();
    node.style.transition = `transform ${SLIDE}ms cubic-bezier(.3,.7,.3,1)`;
    node.style.transform = 'translate(0px, 0px) scale(1)';
  }

  /* A line that draws itself from its beginning, and one that goes back into it. */
  function reveal(node, ms) {
    const length = node.getTotalLength();
    node.style.strokeDasharray = `${length} ${length}`;
    node.style.strokeDashoffset = `${length}`;
    node.getBoundingClientRect();
    node.style.transition = `stroke-dashoffset ${ms}ms ease-out`;
    node.style.strokeDashoffset = '0';
  }

  function retract(node, ms) {
    if (!node.isConnected) return; // the paper was drawn anew meanwhile, and the line went with the old one
    const length = node.getTotalLength();
    node.style.strokeDasharray = `${length} ${length}`;
    node.style.strokeDashoffset = '0';
    node.getBoundingClientRect();
    node.style.transition = `stroke-dashoffset ${ms}ms ease-in`;
    node.style.strokeDashoffset = `${length}`;
    setTimeout(() => node.remove(), ms + 30);
  }

  /* The page's number in its circle, to be tapped: the first of the list stands rightmost. */
  function picks(v, list, cx, cy, r, gap, inside) {
    const span = list.length * 2 * r + (list.length - 1) * gap;
    v.geo.picks = [];
    list.forEach((item, i) => {
      const x = cx + span / 2 - r - i * (2 * r + gap);
      v.svg.append(svg('g', { 'data-hit': `pick:${i}`, class: 'sh-pick' }, [
        svg('circle', { class: 'sh-disc', cx: x, cy, r }),
        inside(item, x, cy, r),
      ]));
      v.geo.picks[i] = [x - r, cy - r, 2 * r, 2 * r];
    });
  }

  const numeral = (n, x, y, r) => text(digits(n), x, y, r * (n > 9 ? 0.95 : 1.12));
  const picked = (v) => ring(v, grown(v.geo.picks[v.state.picked], 0.07, 5), 2, false);

  /* The place of the «؟», which the right choice will fill. */
  function gap(v, place) {
    const [x, y, w, h] = place;
    v.geo.gap = place;
    v.svg.append(svg('rect', { class: 'sh-gap', x, y, width: w, height: h, rx: Math.min(w, h) * 0.14 }));
    if (v.state.picked === null) v.svg.append(text('؟', x + w / 2, y + h / 2, Math.min(w, h) * 0.56, { class: 'sh-ask' }));
  }

  /* The right choice tapped: its ring, and a copy of it into the place of the «؟». */
  function answered(v, i, copy) {
    v.state.picked = i;
    const ask = v.svg.querySelector('.sh-ask');
    if (ask) ask.remove();
    ring(v, grown(v.geo.picks[i], 0.07, 5), 2, true);
    const made = copy(v);
    v.svg.append(made.node);
    slide(made.node, made.from, made.to, made.scale);
    win(v, SLIDE);
  }

  /* Pictures to be counted: a tap marks one with its number and says it; a
     counted one says its number again. */
  function things(v, picture, places, first) {
    if (!v.geo.things) v.geo.things = [];
    places.forEach((place, i) => {
      const k = first + i;
      const [x, y, w, h] = place;
      const room = Math.min(w * SPACE, 12);
      v.geo.things[k] = place;
      v.svg.append(svg('g', { 'data-hit': `thing:${k}`, class: 'sh-thing' }, [
        hit([x - room / 2, y - room / 2, w + room, h + room]),
        image(picture, x, y, w, h),
      ]));
      const n = v.state.counted.indexOf(k);
      if (n >= 0) badge(v, k, n + 1, false);
    });
  }

  function badge(v, k, n, fresh) {
    const [x, y, w, h] = v.geo.things[k];
    const r = clamp(Math.min(w, h) * 0.24, 13, 28);
    const node = part(v, `thing:${k}`);
    node.classList.add('sh-counted');
    node.append(svg('g', { class: fresh ? 'sh-badge sh-pop' : 'sh-badge' }, [
      svg('circle', { cx: x + w / 2, cy: y + h / 2, r }),
      text(digits(n), x + w / 2, y + h / 2, r * 1.3),
    ]));
  }

  function countThing(v, k) {
    const { counted } = v.state;
    let n = counted.indexOf(k) + 1;
    if (n) {
      nudge(part(v, `thing:${k}`).querySelector('.sh-badge'), 'sh-pop');
    } else {
      counted.push(k);
      n = counted.length;
      badge(v, k, n, true);
    }
    if (n <= SAID) say(`count-${n}`);
    beep('tick');
  }

  /* A crayon, as the page draws it, its point to the right. */
  function crayon(x, y, long, thick, color) {
    const body = long - thick * 1.05;
    return svg('g', { class: 'sh-stick' }, [
      svg('path', { d: `M${fix(x + body)} ${fix(y + thick * 0.1)}L${fix(x + long)} ${fix(y + thick / 2)}L${fix(x + body)} ${fix(y + thick * 0.9)}Z`, fill: color }),
      svg('rect', { x, y, width: body, height: thick, rx: thick * 0.16, fill: color }),
      svg('rect', { class: 'sh-band', x: x + body * 0.14, y: y + 1, width: body * 0.08, height: thick - 2 }),
      svg('rect', { class: 'sh-band', x: x + body * 0.74, y: y + 1, width: body * 0.08, height: thick - 2 }),
    ]);
  }

  /* The key of a coloring page, which is also the box of crayons: each sign
     over its crayon. On a wide screen it stands in a column on the right, on a
     tall one in a row at the top. Returns the room left for the drawing. */
  function crayons(v, key, sign) {
    const { w, h, pad, state } = v;
    const n = key.length;
    const wide = w > h * 1.2;
    const g = pad * 0.7;
    const cells = [];
    let room;
    if (wide) {
      const cw = clamp(w * 0.17, 104, 190);
      const ch = Math.min((h - 2 * pad - (n - 1) * g) / n, cw);
      const top = (h - n * ch - (n - 1) * g) / 2;
      for (let k = 0; k < n; k++) cells.push([w - pad - cw, top + k * (ch + g), cw, ch]);
      room = [pad, pad, w - cw - 3 * pad, h - 2 * pad];
    } else {
      const cw = Math.min((w - 2 * pad - (n - 1) * g) / n, 190);
      const ch = clamp(h * 0.2, 80, 132);
      const right = (w + n * cw + (n - 1) * g) / 2;
      for (let k = 0; k < n; k++) cells.push([right - cw - k * (cw + g), pad, cw, ch]);
      room = [pad, 2 * pad + ch, w - 2 * pad, h - 3 * pad - ch];
    }
    key.forEach((entry, k) => {
      const [x, y, cw, ch] = cells[k];
      const held = state.crayon === entry.color;
      const node = svg('g', { 'data-hit': `crayon:${k}`, class: `sh-crayon${held ? ' sh-held' : ''}${state.crayon === null ? ' sh-breathe' : ''}` }, [
        svg('rect', { class: 'sh-cell', x, y, width: cw, height: ch, rx: Math.min(cw, ch) * 0.16 }),
        sign(entry, [x + cw * 0.12, y + ch * 0.1, cw * 0.76, ch * 0.46]),
        crayon(x + cw * 0.15, y + ch * 0.66, cw * 0.7, Math.min(ch * 0.22, cw * 0.2), data.colors[entry.color].hex),
      ]);
      v.svg.append(node);
    });
    return room;
  }

  /* A crayon taken up: it lifts a little, and its color is said. */
  function takeCrayon(v, k, key) {
    v.state.crayon = key[k].color;
    v.svg.querySelectorAll('.sh-crayon').forEach((node, i) => {
      node.classList.remove('sh-breathe');
      node.classList.toggle('sh-held', i === k);
    });
    say(`color-${key[k].color}`);
    beep('tick');
  }

  /* A part of a coloring page tapped: colored when the crayon in hand is its
     color by the key. With no crayon in hand, the crayons call for a choice. */
  function colorPart(v, name, i, color, total) {
    const { state } = v;
    if (state.done.includes(i)) return;
    const node = part(v, name);
    if (state.crayon === null) {
      v.svg.querySelectorAll('.sh-crayon').forEach((one) => nudge(one, 'sh-pop'));
      return;
    }
    if (state.crayon !== color) {
      no(node);
      return;
    }
    state.done.push(i);
    node.querySelector('.sh-fill').style.fill = data.colors[color].hex;
    ping();
    if (state.done.length === total) win(v);
  }

  /* A line of points measured: sums[i] is the way from the first point to point i. */
  function measured(points) {
    const sums = [0];
    for (let i = 1; i < points.length; i++) sums.push(sums[i - 1] + far(points[i], points[i - 1]));
    return { points, sums, total: sums[sums.length - 1] };
  }

  function pointAt(way, length) {
    const { points, sums } = way;
    const want = clamp(length, 0, way.total);
    let i = 1;
    while (i < points.length - 1 && sums[i] < want) i++;
    const span = sums[i] - sums[i - 1];
    const t = span > 0 ? (want - sums[i - 1]) / span : 0;
    return [points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t, points[i - 1][1] + (points[i][1] - points[i - 1][1]) * t];
  }

  /* The points of the line from its beginning up to a length. */
  function upTo(way, length) {
    const out = [];
    for (let i = 0; i < way.points.length && way.sums[i] < length; i++) out.push(way.points[i]);
    out.push(pointAt(way, length));
    return out;
  }

  const listed = (points) => points.map(([x, y]) => `${fix(x)},${fix(y)}`).join(' ');

  /* The kinds of game. For each: fresh() is a round nobody has touched, demo()
     the round as its card shows it, draw() puts the round on the paper as its
     state has it (and again after every change of size), tap() is a finger put
     down and lifted on one thing, and down(), move() and up() are a finger that
     draws (up() with no point: the finger was lost). points() names places on
     the paper for trying the game by script. */
  const KINDS = {};

  /* عُدَّ: a group of pictures to count, and three numbers. */
  KINDS.count = {
    fresh: () => ({ counted: [], picked: null }),
    demo: (round) => ({ counted: [0, 1].slice(0, round.group.count), picked: null }),
    draw(v) {
      const { round, state, w, h, pad } = v;
      const { group } = round;
      const r = clamp(Math.min(w, h) * 0.115, 36, 66);
      const g = r * 0.4;
      const span = 6 * r + 2 * g;
      const wide = w > h * 1.25; // then as on the page: the group on the right, the numbers on the left
      const room = wide ? [span + 3 * pad, pad, w - span - 4 * pad, h - 2 * pad] : [pad, pad, w - 2 * pad, h - 2 * r - 3 * pad];
      const ratio = pictures[group.picture].h / pictures[group.picture].w;
      const best = rowsFor(group.count, ratio, room[2], room[3], SPACE, 240);
      things(v, group.picture, rowPlaces(group.count, best.cols, best.u, ratio, SPACE, room[0] + room[2] / 2, room[1] + room[3] / 2), 0);
      picks(v, round.choices, wide ? 1.5 * pad + span / 2 : w / 2, wide ? h / 2 : h - pad - r, r, g, numeral);
      if (state.picked !== null) picked(v);
    },
    tap(v, name) {
      const [what, i] = parse(name);
      if (what === 'thing') countThing(v, i);
      if (what !== 'pick') return;
      if (i !== v.round.answer) {
        no(part(v, name));
        return;
      }
      v.state.picked = i;
      ring(v, grown(v.geo.picks[i], 0.07, 5), 2, true);
      win(v);
    },
  };

  /* لَوِّنْ بِعَدَدِ الرَّقْمِ: a number and six outline shapes; as many are colored as the number says. */
  KINDS['color-count'] = {
    fresh: () => ({ on: [] }),
    demo: (round) => ({ on: [0, 1].slice(0, round.number) }),
    draw(v) {
      const { round, state, w, h, pad } = v;
      const outline = data.outlines[round.group.outline];
      const n = round.group.count;
      const ratio = outline.box.h / outline.box.w;
      const r = clamp(Math.min(w, h) * 0.13, 34, 72);
      const wide = w > h * 1.2; // then as on the page: the number on the right, its shapes in a row
      const room = wide ? [pad, pad, w - 2 * r - 4 * pad, h - 2 * pad] : [pad, 2 * r + 2.5 * pad, w - 2 * pad, h - 2 * r - 3.5 * pad];
      const space = 0.24;
      const best = rowsFor(n, ratio, room[2], room[3], space, 190);
      const places = rowPlaces(n, best.cols, best.u, ratio, space, room[0] + room[2] / 2, room[1] + room[3] / 2);
      const at = wide ? [w - 1.5 * pad - r, h / 2] : [w / 2, pad + r];
      v.geo.number = [at[0] - r, at[1] - r, 2 * r, 2 * r];
      v.svg.append(svg('g', { class: 'sh-pick' }, [svg('circle', { class: 'sh-disc', cx: at[0], cy: at[1], r }), numeral(round.number, at[0], at[1], r)]));
      v.svg.style.setProperty('--crayon', data.colors[TURNS[v.index % TURNS.length]].hex);
      places.forEach(([x, y, u, high], i) => {
        const half = (u * space) / 2;
        v.svg.append(svg('g', { 'data-hit': `shape:${i}`, class: state.on.includes(i) ? 'sh-shape sh-on' : 'sh-shape' }, [
          hit([x - half, y - half, u + 2 * half, high + 2 * half]),
          svg('g', { transform: `translate(${fix(x)} ${fix(y)}) scale(${fix(u)})` }, [
            svg('path', { class: 'sh-fill', d: outline.fill, 'stroke-width': outline.stroke }),
            outline.line ? svg('path', { class: 'sh-string', d: outline.line, 'stroke-width': outline.stroke }) : null,
          ]),
        ]));
      });
      if (v.locked) ring(v, grown(v.geo.number, 0.07, 5), 2, false);
    },
    tap(v, name) {
      const [what, i] = parse(name);
      if (what !== 'shape') return;
      const { on } = v.state;
      const { number } = v.round;
      const node = part(v, name);
      const at = on.indexOf(i);
      if (at >= 0) {
        on.splice(at, 1);
        node.classList.remove('sh-on');
        beep('tick');
      } else if (on.length >= number) {
        // One too many: it shows its color for a moment and loses it.
        node.classList.add('sh-on');
        no(node);
        setTimeout(() => {
          if (!on.includes(i)) node.classList.remove('sh-on');
        }, 380);
      } else {
        on.push(i);
        node.classList.add('sh-on');
        ping();
      }
      // It counts when exactly that many are colored and he has stopped.
      drop(v.hold.stopped);
      v.hold.stopped = on.length === number ? later(() => {
        if (on.length !== number) return;
        ring(v, grown(v.geo.number, 0.07, 5), 2, true);
        win(v);
      }, STOPPED) : 0;
    },
  };

  /* صِلْ: two columns to join with lines, each thing with the dot its line
     starts from. match-number joins a group to its number, shadow a picture to
     its shadow. Side a is the page's right column, side b its left. */
  function matchSides(round) {
    if (round.groups) {
      return {
        a: round.groups.map((group) => ({ at: group.at, dot: group.dot, group })),
        b: round.numbers.map((number) => ({ at: number.at, dot: number.dot, n: number.n })),
      };
    }
    return { a: round.pictures, b: round.shadows };
  }

  const MATCH = {
    fresh: () => ({ joined: [], chosen: null }),
    demo: (round) => ({ joined: [[0, round.answer[0]]], chosen: null }),
    draw(v) {
      const { round, state, w, h, pad } = v;
      const f = fit(1, round.box.h, pad, pad, w - 2 * pad, h - 2 * pad);
      const sides = matchSides(round);
      const r = Math.max(round.dotRadius * f.s, 5.5);
      // On a wide screen the page's two columns stand a little further apart, their things at the page's sizes.
      const apart = Math.max(0, Math.min(w - 2 * pad - f.w, f.w * 0.5));
      const shift = { a: apart / 2, b: -apart / 2 };
      v.geo.sides = sides;
      v.geo.dots = { a: [], b: [] };
      for (const side of ['a', 'b']) {
        sides[side].forEach((item, i) => {
          const [x, y, iw, ih] = [f.x + shift[side] + item.at[0] * f.s, f.y + item.at[1] * f.s, item.at[2] * f.s, item.at[3] * f.s];
          const dot = [f.x + shift[side] + item.dot[0] * f.s, f.y + item.dot[1] * f.s];
          v.geo.dots[side][i] = dot;
          const left = Math.min(x, dot[0] - r);
          const top = Math.min(y, dot[1] - r);
          const room = [left - 8, top - 6, Math.max(x + iw, dot[0] + r) - left + 16, Math.max(y + ih, dot[1] + r) - top + 12];
          const joined = state.joined.some((pair) => pair[side === 'a' ? 0 : 1] === i);
          const chosen = state.chosen && state.chosen.side === side && state.chosen.i === i;
          const node = svg('g', { 'data-hit': `${side}:${i}`, class: `sh-end${joined ? ' sh-joined' : ''}${chosen ? ' sh-chosen' : ''}` }, [hit(atLeast(room, TARGET))]);
          if (item.group) {
            for (const [px, py, pw, ph] of item.group.places) node.append(image(item.group.picture, x + px * iw, y + py * iw, pw * iw, ph * iw));
          } else if (item.picture) {
            node.append(image(item.picture, x, y, iw, ih));
          } else {
            const rr = Math.min(iw, ih) / 2;
            node.append(svg('circle', { class: 'sh-disc', cx: x + iw / 2, cy: y + ih / 2, r: rr }), numeral(item.n, x + iw / 2, y + ih / 2, rr));
          }
          node.append(svg('circle', { class: 'sh-halo', cx: dot[0], cy: dot[1], r: r * 2.6 }), svg('circle', { class: 'sh-dot', cx: dot[0], cy: dot[1], r }));
          v.svg.append(node);
        });
      }
      for (const [a, b] of state.joined) v.top.append(this.join(v, { side: 'a', i: a }, { side: 'b', i: b }));
    },
    join(v, from, to) {
      const p = v.geo.dots[from.side][from.i];
      const q = v.geo.dots[to.side][to.i];
      return svg('path', { class: 'sh-join', d: `M${fix(p[0])} ${fix(p[1])}L${fix(q[0])} ${fix(q[1])}` });
    },
    /* The thing under a name, unless it has its line already. */
    end(v, name) {
      const [side, i] = parse(name);
      if ((side !== 'a' && side !== 'b') || !Number.isInteger(i)) return null;
      if (v.state.joined.some((pair) => pair[side === 'a' ? 0 : 1] === i)) return null;
      return { side, i };
    },
    choose(v, end) {
      v.state.chosen = end;
      v.svg.querySelectorAll('.sh-end.sh-chosen').forEach((node) => node.classList.remove('sh-chosen'));
      if (end) part(v, `${end.side}:${end.i}`).classList.add('sh-chosen');
    },
    /* A line from one thing to a thing of the other column: it stays if they
       belong together, and goes back into its dot with the buzz if not. */
    judge(v, from, to, grow) {
      const a = from.side === 'a' ? from.i : to.i;
      const b = from.side === 'a' ? to.i : from.i;
      const made = this.join(v, from, to);
      v.top.append(made);
      if (grow) reveal(made, 200);
      if (v.round.answer[a] === b) {
        v.state.joined.push([a, b]);
        part(v, `a:${a}`).classList.add('sh-joined');
        part(v, `b:${b}`).classList.add('sh-joined');
        ping();
        if (v.state.joined.length === v.round.answer.length) win(v);
        return;
      }
      const item = v.geo.sides[to.side][to.i];
      later(() => {
        retract(made, 300);
        no(part(v, `${to.side}:${to.i}`), item.picture);
      }, grow ? 220 : 0);
    },
    down(v, p, name) {
      const end = this.end(v, name);
      if (!end) return;
      const from = v.geo.dots[end.side][end.i];
      const pull = svg('path', { class: 'sh-pull', d: `M${fix(from[0])} ${fix(from[1])}L${fix(p[0])} ${fix(p[1])}` });
      v.top.append(pull);
      v.temp.pull = { end, from, node: pull };
    },
    move(v, p) {
      const { pull } = v.temp;
      if (pull) pull.node.setAttribute('d', `M${fix(pull.from[0])} ${fix(pull.from[1])}L${fix(p[0])} ${fix(p[1])}`);
    },
    up(v, p, name) {
      const { pull } = v.temp;
      v.temp.pull = null;
      if (!pull) return;
      const end = p ? this.end(v, name) : null;
      if (end && end.side !== pull.end.side) {
        // The line was drawn to a thing of the other column.
        pull.node.remove();
        this.choose(v, null);
        this.judge(v, pull.end, end, false);
        return;
      }
      if (end && end.i === pull.end.i) {
        // Put down and lifted on one thing: a tap. The second tap, in the other column, makes the line.
        pull.node.remove();
        const { chosen } = v.state;
        if (chosen && chosen.side !== end.side) {
          this.choose(v, null);
          this.judge(v, chosen, end, true);
        } else if (chosen && chosen.i === end.i) {
          this.choose(v, null);
        } else {
          this.choose(v, end);
          beep('tick');
        }
        return;
      }
      // Let go over nothing: the line goes back, and nothing is said.
      if (p) retract(pull.node, 220);
      else pull.node.remove();
    },
    points(v) {
      const out = {};
      for (const side of ['a', 'b']) v.geo.dots[side].forEach((dot, i) => { out[`${side}:${i}`] = dot; });
      return out;
    },
  };
  KINDS['match-number'] = MATCH;
  KINDS.shadow = MATCH;

  /* صِلِ النِّقَاطَ: dots joined in the order of their numbers, by a finger drawn
     from one to the next or by a tap on each. The drawing then closes and fills. */
  KINDS.dots = {
    fresh: () => ({ joined: 0, closed: false }),
    demo: (round) => ({ joined: Math.min(4, round.dots.length), closed: false }),
    /* The dot to go to: none when the drawing is finished. */
    next(v) {
      if (v.state.joined < v.round.dots.length) return v.state.joined;
      return v.round.closed && !v.state.closed ? 0 : null;
    },
    draw(v) {
      const { round, w, h } = v;
      const edge = clamp(Math.min(w, h) * 0.085, 26, 48); // room for the numbers outside the dots
      const f = fit(1, round.box.h, edge, edge, w - 2 * edge, h - 2 * edge);
      const pts = round.dots.map((dot) => [f.x + dot.x * f.s, f.y + dot.y * f.s]);
      const r = Math.max(round.radius * f.s * 1.2, 6.5);
      const size = clamp(f.s * 0.07, 17, 32);
      let nearest = Infinity;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) nearest = Math.min(nearest, far(pts[i], pts[j]));
      const fill = svg('polygon', { class: 'sh-dots-fill', points: listed(pts) });
      const drawn = svg('polyline', { class: 'sh-join', points: '' });
      const band = svg('line', { class: 'sh-pull', x1: 0, y1: 0, x2: 0, y2: 0, style: 'display:none' });
      const pulse = svg('circle', { class: 'sh-pulse', r: r * 2.3 });
      v.svg.append(fill, drawn, band, pulse);
      const nodes = round.dots.map((dot, i) => {
        // The page's number, kept clear of its dot at any size.
        const to = [f.x + dot.label[0] * f.s, f.y + dot.label[1] * f.s];
        const away = far(to, pts[i]) || 1;
        const reach = Math.max(away, (i ? r : r * 1.35) + size * 0.62);
        const at = [pts[i][0] + ((to[0] - pts[i][0]) / away) * reach, pts[i][1] + ((to[1] - pts[i][1]) / away) * reach];
        const node = svg('g', { class: i ? 'sh-spot' : 'sh-spot sh-first' }, [
          svg('circle', { cx: pts[i][0], cy: pts[i][1], r: i ? r : r * 1.35 }),
          text(digits(dot.n), at[0], at[1], size),
        ]);
        v.svg.append(node);
        return node;
      });
      // A finger this near the next dot has reached it (`grip`), if no other dot is nearer still; on a dot
      // whose turn has not come it must be closer (`reach`), never so far that two dots answer at once.
      v.geo = { ...v.geo, pts, nodes, fill, drawn, band, pulse, grip: clamp(f.s * 0.1, 28, 40), reach: clamp(nearest * 0.4, 12, 28) };
      this.sync(v);
    },
    sync(v) {
      const { pts, nodes, fill, drawn, pulse } = v.geo;
      const { joined, closed } = v.state;
      const way = pts.slice(0, joined);
      if (closed) way.push(pts[0]);
      drawn.setAttribute('points', listed(way));
      nodes.forEach((node, i) => node.classList.toggle('sh-joined', i < joined));
      const next = this.next(v);
      pulse.style.display = next === null || v.still ? 'none' : '';
      if (next !== null) {
        pulse.setAttribute('cx', fix(pts[next][0]));
        pulse.setAttribute('cy', fix(pts[next][1]));
      }
      fill.classList.toggle('sh-on', next === null);
    },
    /* The finger at a point: on the next dot, the line reaches it and its
       number is said; on a dot whose turn has not come, only the soft buzz. */
    touch(v, p) {
      const next = this.next(v);
      if (next === null) return;
      const { pts, reach, grip } = v.geo;
      const { state } = v;
      const off = far(p, pts[next]);
      if (off <= grip && pts.every((dot) => far(p, dot) >= off)) {
        if (state.joined < pts.length) {
          state.joined++;
          if (state.joined <= SAID) say(`count-${state.joined}`);
        } else {
          state.closed = true;
        }
        ping();
        v.temp.armed = true;
        v.temp.wrong = null;
        this.sync(v);
        if (this.next(v) === null) win(v);
        return;
      }
      let wrong = null;
      for (let i = state.joined + 1; i < pts.length; i++) if (far(p, pts[i]) <= reach) wrong = i;
      if (wrong !== null && wrong !== v.temp.wrong) beep('wrong');
      v.temp.wrong = wrong;
    },
    /* The line still being drawn, from the last dot reached to the finger. */
    stretch(v, p) {
      const { band, pts } = v.geo;
      const { joined } = v.state;
      const show = Boolean(p) && v.temp.armed && joined > 0 && this.next(v) !== null;
      band.style.display = show ? '' : 'none';
      if (!show) return;
      const from = pts[joined - 1];
      band.setAttribute('x1', fix(from[0]));
      band.setAttribute('y1', fix(from[1]));
      band.setAttribute('x2', fix(p[0]));
      band.setAttribute('y2', fix(p[1]));
    },
    down(v, p) {
      const { joined } = v.state;
      // The line is taken up where it ended; a finger put down elsewhere draws nothing until it reaches the next dot.
      v.temp.armed = joined > 0 && far(p, v.geo.pts[joined - 1]) <= v.geo.grip;
      v.temp.wrong = null;
      this.touch(v, p);
      this.stretch(v, p);
    },
    move(v, p) {
      this.touch(v, p);
      this.stretch(v, p);
    },
    up(v) {
      v.temp.armed = false;
      v.temp.wrong = null;
      this.stretch(v, null);
    },
    points(v) {
      const out = {};
      v.geo.pts.forEach((dot, i) => { out[`dot:${i}`] = dot; });
      return out;
    },
  };

  /* الْأَكْثَرُ: two boxes of one picture; the fuller one is tapped. */
  KINDS.more = {
    fresh: () => ({ picked: null }),
    demo: (round) => ({ picked: round.answer }),
    draw(v) {
      const { round, state, w, h, pad } = v;
      const high = round.groups[0].box.h;
      const g = pad * 1.4;
      // Side by side as on the page, the first on the right, or the first on top: whichever shows them larger.
      const beside = Math.min((w - 2 * pad - g) / 2, (h - 2 * pad) / high);
      const above = Math.min(w - 2 * pad, (h - 2 * pad - g) / 2 / high);
      const wide = beside >= above;
      const fw = Math.min(Math.max(beside, above), 560);
      const fh = fw * high;
      v.geo.picks = round.groups.map((group, k) => (wide
        ? [k ? w / 2 - g / 2 - fw : w / 2 + g / 2, (h - fh) / 2, fw, fh]
        : [(w - fw) / 2, k ? h / 2 + g / 2 : h / 2 - g / 2 - fh, fw, fh]));
      round.groups.forEach((group, k) => {
        const [x, y] = v.geo.picks[k];
        const node = svg('g', { 'data-hit': `pick:${k}`, class: 'sh-pick' }, [svg('rect', { class: 'sh-frame', x, y, width: fw, height: fh, rx: fw * 0.045 })]);
        for (const [px, py, pw, ph] of group.places) node.append(image(group.picture, x + px * fw, y + py * fw, pw * fw, ph * fw));
        v.svg.append(node);
      });
      if (state.picked !== null) ring(v, grown(v.geo.picks[state.picked], 0.025, 5), 7, false);
    },
    tap(v, name) {
      const [what, i] = parse(name);
      if (what !== 'pick') return;
      if (i !== v.round.answer) {
        no(part(v, name));
        return;
      }
      v.state.picked = i;
      ring(v, grown(v.geo.picks[i], 0.025, 5), 7, true);
      win(v);
    },
  };

  /* A row (or two) of pictures to choose among: the largest or the smallest
     of one picture at three sizes, the one that does not belong, the two alike. */
  function choose(v, i, right) {
    const name = `pick:${i}`;
    if (!right) {
      no(part(v, name), v.geo.names[i]);
      return false;
    }
    ring(v, grown(v.geo.picks[i], 0.1, 7), 3, true);
    return true;
  }

  KINDS.size = {
    fresh: () => ({ picked: null }),
    demo: (round) => ({ picked: round.answer }),
    draw(v) {
      const { round, state, w, h, pad } = v;
      const ratio = pictures[round.picture].h / pictures[round.picture].w;
      const sum = round.sizes.reduce((a, b) => a + b, 0);
      const g = clamp(w * 0.045, 14, 56);
      // The largest is 1: all three keep the sizes they have to each other on the page.
      const base = Math.min((w - 2 * pad - 2 * g) / (sum * 1.08), ((h - 2 * pad) * 0.86) / ratio, 420);
      let right = w / 2 + (sum * base + 2 * g) / 2;
      v.geo.picks = [];
      v.geo.names = [];
      round.sizes.forEach((size, i) => {
        const place = [right - size * base, h / 2 - (size * base * ratio) / 2, size * base, size * base * ratio];
        right -= size * base + g;
        v.geo.picks[i] = place;
        v.svg.append(svg('g', { 'data-hit': `pick:${i}`, class: 'sh-pick' }, [hit(atLeast(grown(place, 0.06), TARGET)), image(round.picture, ...place)]));
      });
      if (state.picked !== null) ring(v, grown(v.geo.picks[state.picked], 0.1, 7), 3, false);
    },
    tap(v, name) {
      const [what, i] = parse(name);
      if (what !== 'pick' || !choose(v, i, i === v.round.answer)) return;
      v.state.picked = i;
      win(v);
    },
  };

  /* Four pictures: in one row on a wide screen, two by two on a tall one, from the right. */
  function four(v) {
    const { round, w, h, pad } = v;
    const n = round.pictures.length;
    const cols = w > h * 1.3 ? n : Math.ceil(n / 2);
    const rows = Math.ceil(n / cols);
    const side = Math.min((w - 2 * pad - (cols - 1) * pad) / cols, (h - 2 * pad - (rows - 1) * pad) / rows, 300);
    v.geo.picks = [];
    v.geo.names = round.pictures;
    rowPlaces(n, cols, side, 1, pad / side, w / 2, h / 2).forEach((cell, i) => {
      const place = contain(round.pictures[i], grown(cell, -0.13));
      v.geo.picks[i] = place;
      v.svg.append(svg('g', { 'data-hit': `pick:${i}`, class: 'sh-pick' }, [
        hit(cell),
        svg('rect', { class: 'sh-mark', x: cell[0] + 3, y: cell[1] + 3, width: cell[2] - 6, height: cell[3] - 6, rx: side * 0.12 }),
        image(round.pictures[i], ...place),
      ]));
    });
  }

  KINDS.different = {
    fresh: () => ({ picked: null }),
    demo: (round) => ({ picked: round.answer }),
    draw(v) {
      four(v);
      if (v.state.picked !== null) ring(v, grown(v.geo.picks[v.state.picked], 0.1, 7), 3, false);
    },
    tap(v, name) {
      const [what, i] = parse(name);
      if (what !== 'pick' || !choose(v, i, i === v.round.answer)) return;
      v.state.picked = i;
      win(v);
    },
  };

  /* The first tap marks a picture; the second, on another, decides. */
  KINDS.similar = {
    fresh: () => ({ marked: null, picked: false }),
    demo: () => ({ marked: null, picked: true }),
    draw(v) {
      const { round, state } = v;
      four(v);
      if (state.marked !== null) part(v, `pick:${state.marked}`).classList.add('sh-marked');
      if (state.picked) for (const i of round.answer) ring(v, grown(v.geo.picks[i], 0.1, 7), 3, false);
    },
    tap(v, name) {
      const [what, i] = parse(name);
      if (what !== 'pick') return;
      const { state, round } = v;
      const node = part(v, name);
      if (state.marked === null) {
        state.marked = i;
        node.classList.add('sh-marked');
        beep('tick');
        return;
      }
      const first = part(v, `pick:${state.marked}`);
      first.classList.remove('sh-marked');
      if (state.marked === i) {
        state.marked = null;
        return;
      }
      const pair = [state.marked, i];
      state.marked = null;
      if (pair.every((k) => round.answer.includes(k))) {
        state.picked = true;
        for (const k of pair) ring(v, grown(v.geo.picks[k], 0.1, 7), 3, true);
        win(v);
        return;
      }
      beep('wrong');
      nudge(first, 'sh-no');
      nudge(node, 'sh-no');
    },
  };

  /* الْعَدَدُ النَّاقِصُ: a run of numbers with a gap, and three numbers to fill it from. */
  KINDS.missing = {
    fresh: () => ({ picked: null }),
    draw(v) {
      const { round, state, w, h, pad } = v;
      const n = round.run.length;
      const r = clamp(Math.min(w, h) * 0.115, 36, 66);
      const g = clamp(w * 0.022, 6, 18);
      const side = Math.min((w - 2 * pad - (n - 1) * g) / n, (h - 2 * r - 4 * pad) * 0.8, 150);
      const between = clamp(h * 0.1, 22, 84); // the run and the choices stand together in the middle of the paper
      const y = (h - side - between - 2 * r) / 2;
      const right = (w + n * side + (n - 1) * g) / 2;
      round.run.forEach((number, i) => {
        const place = [right - side - i * (side + g), y, side, side];
        if (number === null) {
          gap(v, place);
        } else {
          v.svg.append(svg('rect', { class: 'sh-box', x: place[0], y, width: side, height: side, rx: side * 0.14 }), text(digits(number), place[0] + side / 2, y + side / 2, side * 0.6));
        }
      });
      picks(v, round.choices, w / 2, y + side + between + r, r, r * 0.4, numeral);
      if (state.picked !== null) {
        picked(v);
        v.svg.append(this.copy(v).node);
      }
    },
    copy(v) {
      const to = v.geo.gap;
      const size = to[2] * 0.6;
      const [x, y] = middle(to);
      const from = v.geo.picks[v.state.picked];
      const number = v.round.choices[v.state.picked];
      return { node: text(digits(number), x, y, size, { class: 'sh-slide' }), from, to, scale: ((from[2] / 2) * (number > 9 ? 0.95 : 1.12)) / size };
    },
    tap(v, name) {
      const [what, i] = parse(name);
      if (what !== 'pick') return;
      if (i !== v.round.answer) no(part(v, name));
      else answered(v, i, this.copy);
    },
  };

  /* مَاذَا يَأْتِي بَعْدُ؟: a run of pictures that repeats, the place of the next one, and three pictures. */
  KINDS.next = {
    fresh: () => ({ picked: null }),
    draw(v) {
      const { round, state, w, h, pad } = v;
      const n = round.run.length + 1;
      const r = clamp(Math.min(w / 7.4, h * 0.2), 38, 92);
      const g = clamp(w * 0.012, 3, 14);
      const side = Math.min((w - 2 * pad - (n - 1) * g) / n, (h - 2 * r - 4 * pad) * 0.8, 170);
      const between = clamp(h * 0.1, 22, 84);
      const y = (h - side - between - 2 * r) / 2;
      const right = (w + n * side + (n - 1) * g) / 2;
      round.run.forEach((name, i) => {
        v.svg.append(image(name, ...contain(name, grown([right - side - i * (side + g), y, side, side], -0.04))));
      });
      gap(v, [right - n * side - (n - 1) * g, y, side, side]);
      v.geo.names = round.choices;
      picks(v, round.choices, w / 2, y + side + between + r, r, r * 0.42, (name, x, cy, rr) => image(name, ...contain(name, [x - rr * 0.66, cy - rr * 0.66, rr * 1.32, rr * 1.32])));
      if (state.picked !== null) {
        picked(v);
        v.svg.append(this.copy(v).node);
      }
    },
    copy(v) {
      const name = v.round.choices[v.state.picked];
      const to = contain(name, grown(v.geo.gap, -0.12));
      const [x, y, r] = [...middle(v.geo.picks[v.state.picked]), v.geo.picks[v.state.picked][2] / 2];
      const from = contain(name, [x - r * 0.66, y - r * 0.66, r * 1.32, r * 1.32]);
      const node = image(name, ...to);
      node.setAttribute('class', 'sh-slide');
      return { node, from, to, scale: from[2] / to[2] };
    },
    tap(v, name) {
      const [what, i] = parse(name);
      if (what !== 'pick') return;
      if (i !== v.round.answer) no(part(v, name), v.geo.names[i]);
      else answered(v, i, this.copy);
    },
  };

  /* الْجَمْعُ بِالصُّوَرِ: two groups of one picture, the sum to choose among three
     numbers. The pictures may be counted by tapping, on through both groups. */
  KINDS.add = {
    fresh: () => ({ counted: [], picked: null }),
    draw(v) {
      const { round, state, w, h, pad } = v;
      const [a, b] = round.groups;
      const ratio = pictures[a.picture].h / pictures[a.picture].w;
      const r = clamp(Math.min(w, h) * 0.105, 36, 62);
      const sign = clamp(w * 0.05, 20, 44); // the room of the + and of the =
      const box = clamp(Math.min(w, h) * 0.16, 52, 104);
      const g = clamp(w * 0.016, 5, 16);
      const roomW = w - 2 * pad;
      const roomH = h - 2 * r - 3.5 * pad;
      const fixed = 2 * sign + box + 4 * g;
      const wide = (cols, u) => cols * u + (cols - 1) * u * SPACE;
      const tall = (n, cols, u) => Math.ceil(n / cols) * u * ratio + (Math.ceil(n / cols) - 1) * u * SPACE;
      // Both groups at one size: the rows that make the pictures largest, in one
      // line as on the page, or with one group above the other.
      const plan = (line) => {
        let best = null;
        for (let ca = 1; ca <= a.count; ca++) {
          for (let cb = 1; cb <= b.count; cb++) {
            if (!stands(a.count, ca) || !stands(b.count, cb)) continue;
            const ra = Math.ceil(a.count / ca);
            const rb = Math.ceil(b.count / cb);
            const u = line
              ? Math.min((roomW - fixed) / (ca + cb + (ca + cb - 2) * SPACE), roomH / (Math.max(ra, rb) * ratio + (Math.max(ra, rb) - 1) * SPACE), 200)
              : Math.min(roomW / (Math.max(ca, cb) + (Math.max(ca, cb) - 1) * SPACE), (roomH - sign - box - 5 * g) / ((ra + rb) * ratio + (ra + rb - 2) * SPACE), 200);
            const now = { ca, cb, u, line, lack: lacks(a.count, ca) + lacks(b.count, cb) };
            if (better(now, best)) best = now;
          }
        }
        return best;
      };
      // The page's one line, unless standing them one above the other shows the pictures a good deal larger (a phone held upright).
      const inLine = plan(true);
      const stacked = plan(false);
      const { ca, cb, u, line } = stacked.u > inLine.u * 1.35 ? stacked : inLine;
      const wa = wide(ca, u);
      const wb = wide(cb, u);
      const arm = sign * 0.32;
      const plus = (x, y) => svg('path', { class: 'sh-sign', d: `M${fix(x - arm)} ${fix(y)}h${fix(2 * arm)}M${fix(x)} ${fix(y - arm)}v${fix(2 * arm)}`, 'stroke-width': sign * 0.13 });
      const equals = (x, y) => svg('path', { class: 'sh-sign', d: `M${fix(x - arm)} ${fix(y - arm * 0.5)}h${fix(2 * arm)}M${fix(x - arm)} ${fix(y + arm * 0.5)}h${fix(2 * arm)}`, 'stroke-width': sign * 0.13 });
      if (line) {
        const cy = pad + roomH / 2;
        let x = (w + wa + wb + fixed) / 2; // from the right: the first group, +, the second, =, the answer's place
        things(v, a.picture, rowPlaces(a.count, ca, u, ratio, SPACE, x - wa / 2, cy), 0);
        x -= wa + g;
        v.svg.append(plus(x - sign / 2, cy));
        x -= sign + g;
        things(v, b.picture, rowPlaces(b.count, cb, u, ratio, SPACE, x - wb / 2, cy), a.count);
        x -= wb + g;
        v.svg.append(equals(x - sign / 2, cy));
        x -= sign + g;
        gap(v, [x - box, cy - box / 2, box, box]);
      } else {
        const ha = tall(a.count, ca, u);
        const hb = tall(b.count, cb, u);
        let y = pad + (roomH - ha - hb - sign - box - 5 * g) / 2; // from the top: the first group, +, the second, then = and the answer's place
        things(v, a.picture, rowPlaces(a.count, ca, u, ratio, SPACE, w / 2, y + ha / 2), 0);
        y += ha + 2 * g;
        v.svg.append(plus(w / 2, y + sign / 2));
        y += sign + 2 * g;
        things(v, b.picture, rowPlaces(b.count, cb, u, ratio, SPACE, w / 2, y + hb / 2), a.count);
        y += hb + g;
        const right = (w + sign + g + box) / 2;
        v.svg.append(equals(right - sign / 2, y + box / 2));
        gap(v, [right - sign - g - box, y, box, box]);
      }
      picks(v, round.choices, w / 2, h - 1.5 * pad - r, r, r * 0.4, numeral);
      if (state.picked !== null) {
        picked(v);
        v.svg.append(KINDS.missing.copy(v).node);
      }
    },
    tap(v, name) {
      const [what, i] = parse(name);
      if (what === 'thing') countThing(v, i);
      if (what !== 'pick') return;
      if (i !== v.round.answer) no(part(v, name));
      else answered(v, i, KINDS.missing.copy);
    },
  };

  /* اِبْحَثْ عَنِ الْحَرْفِ: the letter in its box, and a grid of letters; every one like it is tapped. */
  KINDS.letter = {
    fresh: () => ({ found: [] }),
    demo: (round) => ({ found: round.answer.slice(0, 3) }),
    draw(v) {
      const { round, state, w, h, pad } = v;
      const wide = w > h * 1.15; // then the box stands on the right of the grid; else above it
      const box = clamp(Math.min(w, h) * 0.2, 64, 150);
      const room = wide ? [pad, pad, w - box - 3.5 * pad, h - 2 * pad] : [pad, box + 2.2 * pad, w - 2 * pad, h - box - 3.2 * pad];
      const pitch = Math.min(room[2] / round.cols, room[3] / round.rows, 170);
      const r = pitch * 0.44;
      const right = room[0] + room[2] / 2 + (round.cols * pitch) / 2;
      const high = round.rows * pitch;
      // On a tall screen the box and the grid stand together in the middle of the paper.
      const at = wide ? [w - 1.5 * pad - box, h / 2 - box / 2] : [w / 2 - box / 2, (h - box - 1.2 * pad - high) / 2];
      const top = wide ? (h - high) / 2 : at[1] + box + 1.2 * pad;
      v.svg.append(svg('rect', { class: 'sh-model', x: at[0], y: at[1], width: box, height: box, rx: box * 0.16 }), text(round.letter, at[0] + box / 2, at[1] + box / 2, box * 0.62, { class: 'sh-model-letter' }));
      round.cells.forEach((letter, i) => {
        const cx = right - ((i % round.cols) + 0.5) * pitch; // each row from the right
        const cy = top + (Math.floor(i / round.cols) + 0.5) * pitch;
        v.svg.append(svg('g', { 'data-hit': `cell:${i}`, class: state.found.includes(i) ? 'sh-cell-letter sh-found' : 'sh-cell-letter' }, [
          hit([cx - pitch / 2, cy - pitch / 2, pitch, pitch]),
          svg('circle', { class: 'sh-disc', cx, cy, r }),
          text(letter, cx, cy, r * 1.22),
        ]));
      });
    },
    tap(v, name) {
      const [what, i] = parse(name);
      if (what !== 'cell') return;
      const { found } = v.state;
      if (found.includes(i)) return;
      const node = part(v, name);
      // The page's own list says which cells hold the letter: ى and ي are two letters.
      if (!v.round.answer.includes(i)) {
        no(node);
        return;
      }
      found.push(i);
      node.classList.add('sh-found');
      ping();
      if (found.length === v.round.answer.length) win(v);
    },
  };

  /* لَوِّنِ الْأَشْكَالَ: a key of four shapes, each with its crayon, and sixteen shapes to color by it. */
  KINDS.shapes = {
    fresh: () => ({ crayon: null, done: [] }),
    demo: (round) => ({ crayon: round.key[0].color, done: round.shapes.map((shape, i) => (shape.color === round.key[0].color ? i : -1)).filter((i) => i >= 0).slice(0, 2) }),
    draw(v) {
      const { round, state } = v;
      const room = crayons(v, round.key, (entry, [x, y, w, h]) => {
        const s = Math.min(w / entry.box.w, h / entry.box.h);
        return svg('g', { transform: `translate(${fix(x + (w - entry.box.w * s) / 2)} ${fix(y + (h - entry.box.h * s) / 2)}) scale(${fix(s)})` }, [
          svg('path', { class: 'sh-sign-shape', d: entry.d, 'stroke-width': 2.4 / s }),
        ]);
      });
      const f = fit(1, round.box.h, ...room);
      round.shapes.forEach((shape, i) => {
        const [x, y, w, h] = shape.at;
        v.svg.append(svg('g', { 'data-hit': `shape:${i}`, class: 'sh-piece' }, [
          hit(atLeast([f.x + x * f.s, f.y + y * f.s, w * f.s, h * f.s], TARGET)),
          svg('g', { transform: `translate(${fix(f.x)} ${fix(f.y)}) scale(${fix(f.s)})` }, [
            svg('path', { class: 'sh-fill', d: shape.d, 'stroke-width': Math.max(round.stroke, 2.2 / f.s), style: state.done.includes(i) ? `fill:${data.colors[shape.color].hex}` : null }),
          ]),
        ]));
      });
    },
    tap(v, name) {
      const [what, i] = parse(name);
      if (what === 'crayon') takeCrayon(v, i, v.round.key);
      if (what === 'shape') colorPart(v, name, i, v.round.shapes[i].color, v.round.shapes.length);
    },
  };

  /* لَوِّنْ كُلَّ رَقْمٍ بِلَوْنِهِ: a drawing in numbered parts, and a crayon for each number. */
  KINDS['color-number'] = {
    fresh: () => ({ crayon: null, done: [] }),
    demo: (round) => ({ crayon: round.regions[0].color, done: [0] }),
    draw(v) {
      const { round, state } = v;
      const room = crayons(v, round.key, (entry, [x, y, w, h]) => text(digits(entry.number), x + w / 2, y + h / 2, Math.min(h * 1.05, w * 0.7)));
      const f = fit(1, round.box.h, ...room);
      v.geo.f = f;
      const scaled = `translate(${fix(f.x)} ${fix(f.y)}) scale(${fix(f.s)})`;
      const stroke = Math.max(round.stroke, 2.2 / f.s);
      // In the page's order: a later part lies on an earlier one, and the topmost under the finger is the one touched.
      round.regions.forEach((region, i) => {
        v.svg.append(svg('g', { 'data-hit': `region:${i}`, class: 'sh-piece' }, [
          svg('g', { transform: scaled }, [
            svg('path', { class: 'sh-fill', d: region.d, 'stroke-width': stroke, style: state.done.includes(i) ? `fill:${data.colors[region.color].hex}` : null }),
          ]),
        ]));
      });
      const marks = svg('g', { class: 'sh-over' });
      for (const one of round.lines) marks.append(svg('g', { transform: scaled }, [svg('path', { class: 'sh-mast', d: one.d, 'stroke-width': one.width })]));
      const size = clamp(f.s * 0.068, 16, 32);
      for (const region of round.regions) marks.append(text(digits(region.number), f.x + region.label[0] * f.s, f.y + region.label[1] * f.s, size));
      v.svg.append(marks);
    },
    /* Once the paper is on the screen: a part smaller than a fingertip gets room to be touched. */
    shown(v) {
      v.round.regions.forEach((region, i) => {
        const node = part(v, `region:${i}`);
        const b = node.getBBox();
        if (b.width < TARGET || b.height < TARGET) node.prepend(hit(atLeast([b.x, b.y, b.width, b.height], TARGET)));
      });
    },
    tap(v, name) {
      const [what, i] = parse(name);
      if (what === 'crayon') takeCrayon(v, i, v.round.key);
      if (what === 'region') colorPart(v, name, i, v.round.regions[i].color, v.round.regions.length);
    },
    /* Where each part's number stands: a part's own middle may lie under a later part. */
    points(v) {
      const out = {};
      v.round.regions.forEach((region, i) => { out[`region:${i}`] = [v.geo.f.x + region.label[0] * v.geo.f.s, v.geo.f.y + region.label[1] * v.geo.f.s]; });
      return out;
    },
  };

  /* اِبْحَثْ عَنِ الِاخْتِلَافَاتِ: two pictures that differ in three things. A tap on
     one of them, in either picture, rings it in both. */
  KINDS.differences = {
    fresh: () => ({ found: [] }),
    demo: () => ({ found: [0] }),
    draw(v) {
      const { round, state, w, h, pad } = v;
      const high = round.box.h;
      const dot = clamp(Math.min(w, h) * 0.022, 7, 12);
      const foot = 2 * dot + pad; // room for the marks that count what is left
      const g = pad;
      // One above the other as on the page, or side by side with the page's upper picture on the right: whichever shows them larger.
      const beside = Math.min((w - 2 * pad - g) / 2, (h - 2 * pad - foot) / high);
      const above = Math.min(w - 2 * pad, (h - 2 * pad - foot - g) / 2 / high);
      const wide = beside > above;
      const sw = Math.max(beside, above);
      const sh = sw * high;
      const top = wide ? (h - foot - sh) / 2 : (h - foot - 2 * sh - g) / 2;
      v.geo.sw = sw;
      v.geo.scenes = wide
        ? { top: [w / 2 + g / 2, top], bottom: [w / 2 - g / 2 - sw, top] }
        : { top: [(w - sw) / 2, top], bottom: [(w - sw) / 2, top + sh + g] };
      for (const which of ['top', 'bottom']) {
        const [x, y] = v.geo.scenes[which];
        const id = `sheet-clip-${++serial}`;
        const inside = svg('g', { 'clip-path': `url(#${id})` }, [
          svg('rect', { class: 'sh-sky', x, y, width: sw, height: sh }),
          svg('rect', { class: 'sh-grass', x, y: y + round.ground * sw, width: sw, height: sh - round.ground * sw }),
        ]);
        for (const item of round[which]) inside.append(image(item.picture, x + item.at[0] * sw, y + item.at[1] * sw, item.at[2] * sw, item.at[3] * sw));
        v.svg.append(svg('g', { 'data-hit': `scene:${which}`, class: 'sh-scene' }, [
          svg('clipPath', { id }, [svg('rect', { x, y, width: sw, height: sh, rx: sw * 0.03 })]),
          inside,
          svg('rect', { class: 'sh-scene-edge', x, y, width: sw, height: sh, rx: sw * 0.03 }),
        ]));
      }
      const foundAt = top + (wide ? sh : 2 * sh + g) + foot / 2;
      v.geo.marks = round.differences.map((one, i) => {
        const node = svg('circle', { class: i < state.found.length ? 'sh-left sh-found' : 'sh-left', cx: w / 2 + ((round.differences.length - 1) / 2 - i) * dot * 3.4, cy: foundAt, r: dot });
        v.svg.append(node);
        return node;
      });
      for (const i of state.found) this.rings(v, i, false);
    },
    rings(v, i, drawn) {
      const [x, y, w, h] = v.round.differences[i].at;
      const { sw, scenes } = v.geo;
      for (const [sx, sy] of Object.values(scenes)) ring(v, grown([sx + x * sw, sy + y * sw, w * sw, h * sw], 0.12, 6), 2.6, drawn);
    },
    tap(v, name, p) {
      const [what, which] = String(name).split(':');
      if (what !== 'scene' || !v.geo.scenes[which]) return;
      const { sw } = v.geo;
      const [sx, sy] = v.geo.scenes[which];
      const at = [(p[0] - sx) / sw, (p[1] - sy) / sw];
      const { found } = v.state;
      // The difference whose place, made no smaller than a fingertip, holds the tap: of two, the nearer.
      let best = -1;
      let near = Infinity;
      v.round.differences.forEach((one, i) => {
        if (found.includes(i)) return;
        const [x, y, w, h] = atLeast(grown(one.at, 0.08), TARGET / sw);
        if (at[0] < x || at[0] > x + w || at[1] < y || at[1] > y + h) return;
        const d = far(at, middle(one.at));
        if (d < near) {
          near = d;
          best = i;
        }
      });
      if (best < 0) return; // a tap on nothing does nothing
      found.push(best);
      this.rings(v, best, true);
      v.geo.marks[found.length - 1].classList.add('sh-found');
      ping();
      if (found.length === v.round.differences.length) win(v);
    },
    points(v) {
      const out = {};
      const { sw, scenes } = v.geo;
      v.round.differences.forEach((one, i) => {
        const [x, y] = middle(one.at);
        out[`top:${i}`] = [scenes.top[0] + x * sw, scenes.top[1] + y * sw];
        out[`bottom:${i}`] = [scenes.bottom[0] + x * sw, scenes.bottom[1] + y * sw];
      });
      return out;
    },
  };

  /* أَكْمِلِ الرَّسْمَ: half a drawing, and its other half in dots for the finger to
     trace, from either end. The line grows along the dots as far as the finger
     has gone along them. */
  KINDS.complete = {
    fresh: () => ({ end: null, along: 0, done: false }),
    demo: () => ({ end: 0, along: 0.55, done: false }),
    draw(v) {
      const { round, state, w, h, pad } = v;
      const edge = pad * 1.7;
      const f = fit(1, round.box.h, edge, edge, w - 2 * edge, h - 2 * edge);
      const place = ([x, y]) => [f.x + x * f.s, f.y + y * f.s];
      // The dotted half without what lies on the fold itself, where the drawn half already is.
      let dotted = round.todo.points;
      const onFold = (point) => Math.abs(point[0] - round.axis) < 1e-6;
      while (dotted.length > 2 && onFold(dotted[0]) && onFold(dotted[1])) dotted = dotted.slice(1);
      while (dotted.length > 2 && onFold(dotted[dotted.length - 1]) && onFold(dotted[dotted.length - 2])) dotted = dotted.slice(0, -1);
      const way = measured(dotted.map(place));
      const back = measured(way.points.slice().reverse());
      const stroke = Math.max(round.stroke * f.s, 4);
      const whole = round.drawn.points.concat(round.todo.points.slice().reverse()).map(place);
      const fill = svg('polygon', { class: 'sh-half-fill', points: listed(whole) });
      const trace = svg('polyline', { class: 'sh-trace', points: '', 'stroke-width': stroke * 1.15 });
      const heads = [svg('circle', { class: 'sh-pulse', r: stroke * 2.2 }), svg('circle', { class: 'sh-pulse', r: stroke * 2.2 })];
      v.svg.append(
        fill,
        svg('line', { class: 'sh-fold', x1: f.x + round.axis * f.s, y1: f.y - edge * 0.5, x2: f.x + round.axis * f.s, y2: f.y + f.h + edge * 0.5 }),
        svg('polyline', { class: 'sh-dotted', points: listed(way.points), 'stroke-width': stroke * 0.72, 'stroke-dasharray': `0 ${fix(stroke * 1.9)}` }),
        svg('polyline', { class: 'sh-half', points: listed(round.drawn.points.map(place)), 'stroke-width': stroke }),
        trace,
        ...heads,
      );
      v.geo = { ...v.geo, ways: [way, back], total: way.total, fill, trace, heads };
      this.sync(v);
    },
    sync(v) {
      const { ways, total, fill, trace, heads } = v.geo;
      const { end, along, done } = v.state;
      trace.setAttribute('points', end === null ? '' : listed(upTo(ways[end], along * total)));
      // Where the finger goes: both ends before a line is begun, then the line's head.
      const at = end === null ? [ways[0].points[0], ways[1].points[0]] : [pointAt(ways[end], along * total)];
      heads.forEach((node, i) => {
        const show = !done && !v.still && i < at.length;
        node.style.display = show ? '' : 'none';
        if (!show) return;
        node.setAttribute('cx', fix(at[i][0]));
        node.setAttribute('cy', fix(at[i][1]));
      });
      fill.classList.toggle('sh-on', done);
    },
    /* The finger at a point: the line goes on to the place on the dots nearest
       the finger, a little way ahead of its head at most, and only if the
       finger is near the dots there. */
    follow(v, p) {
      const { state } = v;
      const { ways, total } = v.geo;
      const way = ways[state.end];
      const from = state.along * total;
      const to = Math.min(total, from + TRACE.ahead);
      let best = from;
      let near = Infinity;
      for (let s = from; ; s = Math.min(to, s + 2)) {
        const d = far(p, pointAt(way, s));
        if (d < near) {
          near = d;
          best = s;
        }
        if (s >= to) break;
      }
      if (near > TRACE.stray || best <= from) return;
      state.along = best / total;
      if (total - best < TRACE.done) {
        state.along = 1;
        state.done = true;
      }
      this.sync(v);
      if (state.done) win(v);
    },
    down(v, p) {
      const { state } = v;
      const { ways, total } = v.geo;
      v.temp.tracing = false;
      if (state.done) return;
      if (state.end === null || state.along * total < TRACE.begun) {
        // Nothing to speak of is drawn yet: the line may begin at either end.
        const d = [far(p, ways[0].points[0]), far(p, ways[1].points[0])];
        const end = d[0] <= d[1] ? 0 : 1;
        if (d[end] > TRACE.grip) return;
        if (end !== state.end) {
          state.end = end;
          state.along = 0;
        }
      } else if (far(p, pointAt(ways[state.end], state.along * total)) > TRACE.grip) {
        return; // a line is taken up at its head
      }
      v.temp.tracing = true;
      this.sync(v);
      this.follow(v, p);
    },
    move(v, p) {
      if (v.temp.tracing) this.follow(v, p);
    },
    up(v) {
      v.temp.tracing = false;
    },
    points(v) {
      const out = {};
      const way = v.geo.ways[0];
      for (let s = 0, i = 0; ; s = Math.min(way.total, s + 12), i++) {
        out[`way:${i}`] = pointAt(way, s);
        if (s >= way.total) break;
      }
      return out;
    },
  };

  /* A round as a drawing of a given size. */
  function build(v) {
    v.temp = {};
    v.geo = {};
    v.pad = clamp(Math.min(v.w, v.h) * 0.04, 10, 28);
    v.svg = svg('svg', { class: 'sheet-paper', viewBox: `0 0 ${fix(v.w)} ${fix(v.h)}`, 'aria-hidden': 'true' });
    v.top = svg('g', { class: 'sh-top' });
    KINDS[v.kind].draw(v);
    v.svg.append(v.top);
    return v.svg;
  }

  /* The still on a game's card: its first round, a little way into it. */
  function still(g) {
    const kind = KINDS[g.id];
    const round = g.rounds[0];
    const node = build({ kind: g.id, round, index: 0, state: (kind.demo || kind.fresh)(round), w: 400, h: 400, hold: {}, still: true, locked: false });
    node.classList.add('art');
    return node;
  }

  /* The pictures a round shows, asked for ahead of it. */
  function fetchAhead(round) {
    if (!round) return;
    JSON.stringify(round, (key, value) => {
      if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(pictures, value)) new Image().src = `${FILES}${value}.png`;
      return value;
    });
  }

  /* A door: a card for each of its games, a star on the finished ones. */
  function showHub(hub) {
    load();
    $('cards').replaceChildren(...data.games.filter((g) => g.hub === hub && KINDS[g.id] && TEXT.games[g.id] && g.rounds.length).map((g) => {
      const card = document.createElement('a');
      card.className = 'game-card sheet-card';
      card.href = `sheet.html?g=${encodeURIComponent(g.id)}`;
      const title = document.createElement('h2');
      title.textContent = TEXT.games[g.id].title;
      card.append(title, still(g));
      if (progress(g.id).done) {
        const star = document.createElement('span');
        star.className = 'sheet-star';
        star.innerHTML = STAR;
        card.append(star);
      }
      return card;
    }));
  }

  /* One game */
  const words = (round) => {
    const all = TEXT.games[game.id];
    return round.want === 'smallest' && all.smallest ? all.smallest : all;
  };

  /* The strip of small marks: a round done, the round now, the rounds to come. */
  function showMarks(at) {
    const marks = $('marks');
    if (marks.childElementCount !== game.rounds.length) marks.replaceChildren(...game.rounds.map(() => document.createElement('i')));
    [...marks.children].forEach((mark, i) => {
      mark.className = i < at ? 'done' : i === at ? 'now' : '';
    });
  }

  function redraw() {
    if (!view || ended) return;
    const slot = $('slot');
    const w = slot.clientWidth;
    const h = slot.clientHeight;
    if (!w || !h) return;
    const kind = KINDS[view.kind];
    if (press && kind.up) kind.up(view, null, null); // a finger that was drawing lets go
    press = null;
    view.w = w;
    view.h = h;
    slot.replaceChildren(build(view));
    if (kind.shown) kind.shown(view);
  }

  function openRound(index) {
    forget();
    const round = game.rounds[index];
    view = { kind: game.id, round, index, state: KINDS[game.id].fresh(round), hold: {}, locked: false, still: false, w: 0, h: 0 };
    ended = false;
    press = null;
    $('sheet').classList.remove('ended');
    $('end').hidden = true;
    $('slot').hidden = false;
    // The line is said when the game opens, and again whenever it changes.
    const now = words(round);
    if (now.clip !== line) {
      line = now.clip;
      $('line').textContent = now.line;
      say(now.clip);
    }
    showMarks(index);
    redraw();
    fetchAhead(game.rounds[index + 1]);
  }

  /* A round done: the chime, and after a moment the next round, or the praise. */
  function win(v, wait = 0) {
    if (v !== view || v.locked) return;
    v.locked = true;
    sound.chime();
    const next = v.index + 1;
    const last = next >= game.rounds.length;
    keep(game.id, last ? 0 : next, last);
    showMarks(next);
    later(() => (last ? finish() : openRound(next)), PAUSE + wait);
  }

  /* After the last round: the praise, shown and said, then the two buttons. */
  function finish() {
    forget();
    ended = true;
    view = null;
    press = null;
    $('slot').hidden = true;
    $('slot').replaceChildren();
    $('buttons').hidden = true;
    $('praise').textContent = TEXT.praise.text;
    $('sheet').classList.add('ended'); // the instruction has nothing more to say
    $('end').hidden = false;
    const wait = (ms) => new Promise((done) => { later(done, ms); });
    Promise.race([Promise.all([say(TEXT.praise.clip), wait(REST)]), wait(PATIENCE)]).then(() => {
      if (ended) $('buttons').hidden = false;
    });
  }

  function openGame(found) {
    game = found;
    const hub = HUBS[game.hub];
    $('sheet').dataset.hub = game.hub;
    document.title = TEXT.games[game.id].title;
    // The logo and the ✕ lead back to the game's own door.
    for (const id of ['home', 'exit', 'to-hub']) if ($(id)) $(id).href = hub;
    const clips = [TEXT.praise.clip, TEXT.games[game.id].clip];
    if (TEXT.games[game.id].smallest) clips.push(TEXT.games[game.id].smallest.clip);
    // What a tap says is fetched ahead too, so the first number or color is heard with its tap.
    if (['count', 'add', 'dots'].includes(game.id)) for (let n = 1; n <= SAID; n++) clips.push(`count-${n}`);
    if (game.rounds[0].key) for (const entry of game.rounds[0].key) clips.push(`color-${entry.color}`);
    sound.preloadPrompts(clips);
    line = '';
    openRound(progress(game.id).at);
  }

  /* A finger (or the mouse) on the paper. One finger at a time; a tap is a
     finger put down and lifted on the same thing, wherever it slid between. */
  function spot(event) {
    const box = $('slot').getBoundingClientRect();
    return [event.clientX - box.left, event.clientY - box.top];
  }

  function under(node) {
    const found = node && typeof node.closest === 'function' ? node.closest('[data-hit]') : null;
    return found && $('slot').contains(found) ? found.dataset.hit : null;
  }

  function listen() {
    const slot = $('slot');
    slot.addEventListener('pointerdown', (event) => {
      if (event.button > 0 || !view || view.locked) return;
      event.preventDefault();
      if (event.isPrimary && press) {
        // The first finger down means none was down: a lift that was missed holds nothing back, and its line goes.
        const before = KINDS[view.kind];
        if (before.up) before.up(view, null, null);
        press = null;
      }
      if (press) return;
      press = { id: event.pointerId, hit: under(event.target) };
      try {
        slot.setPointerCapture(event.pointerId);
      } catch {
        // A pointer that is already gone cannot be held; the tap still counts.
      }
      const kind = KINDS[view.kind];
      if (kind.down) kind.down(view, spot(event), press.hit);
    });
    slot.addEventListener('pointermove', (event) => {
      if (!press || event.pointerId !== press.id || !view || view.locked) return;
      const kind = KINDS[view.kind];
      if (!kind.move) return;
      // A fast finger gives several places between two frames: the line takes them all.
      const parts = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
      for (const one of parts.length ? parts : [event]) {
        if (view.locked) break;
        kind.move(view, spot(one));
      }
    });
    const lift = (event) => {
      if (!press || event.pointerId !== press.id) return;
      const down = press;
      press = null;
      if (!view || view.locked) return;
      const kind = KINDS[view.kind];
      const lost = event.type === 'pointercancel';
      const p = lost ? null : spot(event);
      const name = lost ? null : under(document.elementFromPoint(event.clientX, event.clientY));
      if (kind.up) kind.up(view, p, name);
      if (kind.tap && !lost && name && name === down.hit && !view.locked) kind.tap(view, name, p);
    };
    slot.addEventListener('pointerup', lift);
    slot.addEventListener('pointercancel', lift);
    slot.addEventListener('contextmenu', (event) => event.preventDefault());
    slot.addEventListener('dragstart', (event) => event.preventDefault());

    $('line').addEventListener('click', () => {
      if (line) say(line);
    });
    $('again').addEventListener('click', () => {
      line = '';
      openRound(0);
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden || !press || !view) return;
      const kind = KINDS[view.kind];
      if (kind.up) kind.up(view, null, null);
      press = null;
    });
    // The paper is drawn again when its room changes: a turned tablet, a window pulled wider.
    const resized = () => {
      if (view && (slot.clientWidth !== view.w || slot.clientHeight !== view.h)) redraw();
    };
    addEventListener('resize', resized);
    if (typeof ResizeObserver === 'function') new ResizeObserver(resized).observe(slot);
  }

  /* For trying the games by script on the family's computer: what is on the
     screen, and where its things are, in page pixels. */
  function hook() {
    const offset = ([x, y]) => {
      const box = $('slot').getBoundingClientRect();
      return [box.left + x, box.top + y];
    };
    window.sheetGame = {
      get state() {
        return {
          id: game && game.id,
          hub: game && game.hub,
          rounds: game ? game.rounds.length : 0,
          index: view ? view.index : null,
          round: view ? view.round : null,
          play: view ? view.state : null,
          locked: view ? view.locked : null,
          ended,
          line,
          size: view ? [view.w, view.h] : null,
          kept,
        };
      },
      /* The middle of everything that can be touched, by name. */
      hits() {
        const out = {};
        if (!view) return out;
        for (const node of view.svg.querySelectorAll('[data-hit]')) {
          const box = node.getBoundingClientRect();
          out[node.dataset.hit] = [box.left + box.width / 2, box.top + box.height / 2];
        }
        return out;
      },
      /* The places a drawing finger needs: dots, line ends, the way to trace. */
      points() {
        const out = {};
        const kind = view && KINDS[view.kind];
        if (!kind || !kind.points) return out;
        for (const [name, point] of Object.entries(kind.points(view))) out[name] = offset(point);
        return out;
      },
      open: (index) => openRound(clamp(index, 0, game.rounds.length - 1)),
      redraw,
    };
  }

  /* Start */
  const hub = document.body.dataset.hub;
  const id = new URLSearchParams(location.search).get('g');
  const known = Object.prototype.hasOwnProperty.call(TEXT.games, id || '') && Object.prototype.hasOwnProperty.call(KINDS, id || '');
  if (!hub && !known) {
    location.replace('games.html'); // no such game
    return;
  }
  function start(json) {
    data = json;
    pictures = data.pictures;
    if (hub) {
      showHub(hub);
      // Come back to by the browser's own arrow, the door shows the stars as they are now.
      addEventListener('pageshow', (event) => {
        if (event.persisted) showHub(hub);
      });
      return;
    }
    const found = data.games.find((g) => g.id === id);
    if (!found || !found.rounds.length || !HUBS[found.hub]) {
      location.replace('games.html');
      return;
    }
    load();
    listen();
    if (LOCAL) hook();
    openGame(found);
  }

  fetch('sheets/sheets.json')
    .then((response) => response.json())
    .then(start, () => {
      // Without the books' data there is nothing to show; the page stays empty.
    });
})();
