/* أَيْنَ؟ (where.html), tried by script: that no picture ever covers a text or a
   button, that nothing is cut off, that the thing of every picture is really
   drawn, and that Egyptian speech never has Fusha text beside it.

     node tools/test-where.js            every screen (about seventeen minutes)
     node tools/test-where.js quick      four screens (about six minutes)
     node tools/test-where.js 1280x800   the screens named (1280x800,844x390 ...)
     ... fusha | egyptian                only that half (both by default)
     ... keep=<folder>                   a picture of every screen that failed
     ... real=all | sentences | words | none
                                         the Egyptian half with the real
                                         recordings in public/audio, which
                                         must be exactly those: every one, only
                                         the sentences', only the words' and
                                         questions', or none
     ... jobs=<n>                        browsers at once (4)
     ... url=<address>                   another copy of the page

   The local site must be running (firebase serve --only hosting --port 5000).

   Every sentence of where-words.js is played in every kind of step it fits
   (show, fill, find, put), one step at a time through window.whereGame, on
   each screen. At each of these moments the page is measured: as the step
   opens, once it has settled (the thing arrived, the sentence shown), with
   the screen turned on its side and turned back, and after the right answer
   (the word in its gap, the other choices faded). (The Egyptian half flips
   the switch instead of turning the screen.) The list of stages and the
   end of a stage are measured too. It fails when
   - a picture crosses the head, the sentence, a choice, a button, the dots,
     the logo, the ✕ or the ☰, or another picture, or leaves the screen, or
     is cut by a box around it, or is a stamp (a fifth of the screen at least);
   - any of those is cut off, off the screen, or over another of them, or the
     page scrolls;
   - the ink of a large word reaches the dots above it (each word, shown in
     its real stage with all the stage's dots);
   - the thing is not really drawn: the picture is photographed with the
     thing, without it, and with it in front of everything; where it waits in
     a put step it must show whole, on its tray, with room around it, and at
     every place a step puts it at least a third of it must show, inside the
     picture;
   - two pictures of a find step draw the thing in nearly the same place, or
     a landmark has a place both for «تَحْتَ» and for «أَمَامَ», which draw alike;
   - on a put step, a finger cannot drag it: it must stay inside the picture
     wherever the finger goes, come back when let go nowhere or touched
     without being moved, settle in its place when let go there (on either
     side for «بِجَانِبِ»), stay in the finger when it is picked up again after
     a wrong place, and stay in its place when a quick hand puts it right
     just after a wrong place;
   - with nothing recorded, the next step is more than 2.3 s after a right
     answer;
   - a stage played from the list of stages, as a child would (the arrow,
     the right word, the right picture, the thing dragged to its place), does
     not reach its end screen, shows the wrong dots on the way, or is not
     kept as finished.

   The Egyptian half does not need recordings: it answers sound.masri() by
   itself, three ways (every Egyptian recording there, only the sentences',
   only the words' and questions'), and checks the father's rule as the game
   keeps it: a step whose sentence has its Egyptian recording is said in
   Egyptian, and then no Fusha text at all is on its screen (a speaker mark
   stands in for the large word, the question of a fill step, the sentence
   and each choice); any other step reads as in Fusha and asks for no
   Egyptian recording, even of a word that has one. Whenever the page asks
   sound.say() for a clip whose Egyptian recording exists, the texts on the
   screen at that moment are read: any Fusha text there is a failure (the
   head, the sentence and the choices are tapped to make them speak). The
   screen must change at once when the switch is flipped in the middle of a
   step, and everything above about pictures and texts still holds. With a
   voice made up the same way it checks that the choices of a question are
   read out in turn, that a tap stops the reading, and that nothing waits
   for a recording that is not there.

   The page is tried with the dialect switch that app.js puts beside the ✕
   and the ☰ once an activity is recorded in both dialects: the test names
   one word as recorded both ways (sound.js reads 'recordings-test' on
   localhost), so the switch is on the screen in every measurement, as it
   will be on the family's tablet. The last line says on how many runs it
   was there.

   A browser that stops answering (seen once on a busy computer) fails its
   call after a minute instead of holding the test forever; that screen is
   then run once more in a new browser. A thing that seems not drawn is
   photographed a second time, half a second later, before it counts.

   A line per failure names the screen, the step, the moment and what was
   wrong; then a short table; exit code 1 on any failure. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
/* The browsers browser.js starts are noted here, so that one that stops
   answering can be ended: its own close() would wait for an answer. */
const processes = require('child_process');
const started = [];
const spawnReal = processes.spawn;
processes.spawn = (...args) => {
  const child = spawnReal(...args);
  started.push(child);
  return child;
};
const { open, sleep } = require('./browser.js');

/* A promise that fails after ms if it has not settled. */
const limited = (promise, ms, what) => new Promise((done, fail) => {
  const timer = setTimeout(() => fail(new Error(what)), ms);
  promise.then((value) => { clearTimeout(timer); done(value); }, (error) => { clearTimeout(timer); fail(error); });
});
const ANSWER = 60000; // the longest a browser may take over one call

const PAGE = (process.argv.find((a) => a.startsWith('url=')) || 'url=http://localhost:5000/where.html').slice(4);

/* CSS pixels; touch unless noted. The father's tablet first. */
const SCREENS = [
  [1280, 800], [1280, 720], [1340, 800], [1024, 768], [1180, 820], [1024, 600], [962, 601],
  [800, 1280], [768, 1024], [601, 962], [412, 915], [390, 844], [360, 640], [844, 390], [915, 412],
  [1440, 900, 'mouse'],
];
const QUICK = ['1280x800', '1024x600', '390x844', '844x390'];
/* The Egyptian half's three ways run in full on these; the others get every recording there. */
const MIXED = ['1280x800', '390x844'];

const args = process.argv.slice(2);
const option = (name, otherwise) => {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : otherwise;
};
const named = args.filter((a) => /^\d+x\d+(,\d+x\d+)*$/.test(a)).flatMap((a) => a.split(','));
const quick = args.includes('quick');
const halves = ['fusha', 'egyptian'].filter((h) => args.includes(h));
const KEEP = option('keep', '');
const REAL = option('real', '');
const JOBS = Number(option('jobs', 4));
const screens = SCREENS.filter(([w, h]) => {
  const name = `${w}x${h}`;
  return named.length ? named.includes(name) : !quick || QUICK.includes(name);
});
for (const name of named) {
  if (!SCREENS.some(([w, h]) => `${w}x${h}` === name)) {
    const [w, h] = name.split('x').map(Number);
    screens.push([w, h]);
  }
}

/* ---------- a PNG, read ---------- */

function decode(file) {
  let at = 8;
  let w = 0;
  let h = 0;
  let type = 0;
  const parts = [];
  while (at < file.length) {
    const length = file.readUInt32BE(at);
    const name = file.toString('ascii', at + 4, at + 8);
    const data = file.subarray(at + 8, at + 8 + length);
    if (name === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; }
    if (name === 'IDAT') parts.push(data);
    at += 12 + length;
  }
  const bpp = type === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(parts));
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      let v = raw[y * (stride + 1) + 1 + x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 255;
    }
  }
  return { w, h, bpp, data: out };
}

/* How many pixels differ between two pictures of the same size. */
function differ(one, two, by = 14) {
  if (one.w !== two.w || one.h !== two.h) return -1;
  let count = 0;
  for (let i = 0, j = 0; i < one.data.length; i += one.bpp, j += two.bpp) {
    if (Math.abs(one.data[i] - two.data[j]) > by || Math.abs(one.data[i + 1] - two.data[j + 1]) > by || Math.abs(one.data[i + 2] - two.data[j + 2]) > by) count++;
  }
  return count;
}

/* ---------- inside the page ---------- */

/* Measures the page as it is now. Returns { wrong: [sentences], share } where
   share is how much of the screen the pictures take. */
function probe() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const wrong = [];
  const $ = (id) => document.getElementById(id);
  const box = (r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom });
  const fmt = (r) => `${Math.round(r.l)},${Math.round(r.t)} ${Math.round(r.r - r.l)}x${Math.round(r.b - r.t)}`;
  const visible = (el) => {
    if (!el || !el.getClientRects().length) return false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    }
    return true;
  };
  /* Where an element's words and marks are: each line as wide as its ink, as
     tall as the line (a font's own box is taller than its line, and would
     seem to touch what the glyphs never reach). */
  const ink = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const own = el.getBoundingClientRect();
    return [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5)
      .map((r) => ({ l: r.left, r: r.right, t: Math.max(r.top, own.top), b: Math.min(r.bottom, own.bottom) }))
      .filter((r) => r.b - r.t > 0.5);
  };
  const cross = (a, b, by = 1) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > by && Math.min(a.b, b.b) - Math.max(a.t, b.t) > by;
  const within = (a, b, by = 1) => a.l >= b.l - by && a.t >= b.t - by && a.r <= b.r + by && a.b <= b.b + by;
  const screen = { l: 0, t: 0, r: vw, b: vh };
  /* The boxes around an element that cut what leaves them. */
  const cutters = (el) => {
    const list = [];
    for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') list.push(box(e.getBoundingClientRect()));
    }
    return list;
  };

  const view = document.querySelector('.view:not([hidden])');
  const items = [];
  const add = (name, el, how = 'ink') => {
    if (!visible(el)) return;
    const rects = how === 'box' ? [box(el.getBoundingClientRect())] : ink(el);
    if (rects.length) items.push({ name, el, rects });
  };
  add('the logo', document.querySelector('.top .logo'), 'box');
  add('the ☰', document.querySelector('.menu-button'), 'box');
  add('the ✕', document.querySelector('.exit-button'), 'box');
  add('the dialect switch', document.querySelector('.dialect-switch'), 'box');
  if (view.id === 'view-play') {
    add('the dots', $('dots'));
    add('the head', $('head'));
    add('the sentence', $('line'));
    [...$('choices').children].forEach((b, i) => add(`choice ${i + 1}`, b, 'box'));
    add('the listen button', $('again'), 'box');
    add('the next button', $('next'), 'box');
  } else if (view.id === 'view-list') {
    add('the title', view.querySelector('.hub-title'));
    [...$('stages').children].forEach((card, i) => {
      add(`stage ${i + 1}`, card, 'box');
      if (!visible(card)) return;
      const inside = box(card.getBoundingClientRect());
      for (const r of ink(card)) if (!within(r, inside, 1)) wrong.push(`the words of stage ${i + 1} leave their card`);
    });
  } else {
    add('the praise', $('praise'));
    add('the words', $('done-words'));
    add('the button on', $('go-on'), 'box');
    add('the button to the list', $('to-list'), 'box');
  }

  const pictures = [];
  for (const svg of view.querySelectorAll('svg.w-scene')) {
    if (!visible(svg)) continue;
    const m = svg.getScreenCTM();
    if (!m) { wrong.push('a picture has no size'); continue; }
    const rect = { l: m.e, t: m.f, r: m.a * 600 + m.e, b: m.d * 400 + m.f };
    pictures.push({ rect, svg });
  }

  let area = 0;
  pictures.forEach((p, i) => {
    const name = pictures.length > 1 ? `picture ${i + 1}` : 'the picture';
    const w = p.rect.r - p.rect.l;
    area += w * (p.rect.b - p.rect.t);
    if (w < 60) wrong.push(`${name} is ${Math.round(w)} px wide`);
    if (!within(p.rect, screen)) wrong.push(`${name} leaves the screen (${fmt(p.rect)} on ${vw}x${vh})`);
    for (const c of cutters(p.svg)) if (!within(p.rect, c, 1.5)) { wrong.push(`${name} is cut by a box around it (${fmt(p.rect)} in ${fmt(c)})`); break; }
    for (const item of items) {
      const hit = item.rects.find((r) => cross(p.rect, r));
      if (hit) wrong.push(`${name} crosses ${item.name} (${fmt(p.rect)} over ${fmt(hit)})`);
    }
    pictures.slice(i + 1).forEach((q, j) => { if (cross(p.rect, q.rect)) wrong.push(`${name} crosses picture ${i + j + 2}`); });
  });
  if (view.id === 'view-play' && pictures.length && area < 0.2 * vw * vh) {
    wrong.push(`the picture is a stamp: ${pictures.map((p) => `${Math.round(p.rect.r - p.rect.l)}x${Math.round(p.rect.b - p.rect.t)}`).join(' ')} on ${vw}x${vh}`);
  }

  items.forEach((item, i) => {
    if (item.rects.some((r) => !within(r, screen))) wrong.push(`${item.name} leaves the screen (${fmt(item.rects.find((r) => !within(r, screen)))} on ${vw}x${vh})`);
    const cuts = cutters(item.el);
    const cut = item.rects.find((r) => cuts.some((c) => !within(r, c, 1.5)));
    if (cut) wrong.push(`${item.name} is cut off (${fmt(cut)})`);
    for (const other of items.slice(i + 1)) {
      if (item.el.contains(other.el) || other.el.contains(item.el)) continue;
      if (item.rects.some((a) => other.rects.some((b) => cross(a, b, 2)))) wrong.push(`${item.name} is over ${other.name}`);
    }
  });
  const page = document.scrollingElement;
  if (page.scrollHeight > vh + 1 || page.scrollWidth > vw + 1) wrong.push(`the page scrolls (${page.scrollWidth}x${page.scrollHeight} on ${vw}x${vh})`);
  return { wrong, share: area / (vw * vh) };
}

/* The thing of each scene on the screen and its picture, in page pixels. */
function things() {
  return window.whereGame.scenes().map((sc) => {
    const art = sc.piece.querySelector('[data-art]') || sc.piece;
    const b = art.getBoundingClientRect();
    const m = sc.root.getScreenCTM();
    const tray = sc.root.querySelector('[data-tray]');
    return {
      word: sc.word || '',
      size: { l: sc.size.l, r: sc.size.r, top: sc.size.top },
      halo: sc.piece.querySelector('[data-halo]').getAttribute('visibility') === 'visible',
      tray: tray && tray.getAttribute('visibility') === 'visible' ? ['x', 'y', 'width', 'height'].map((k) => Number(tray.getAttribute(k))) : null,
      at: { x: sc.at.x, y: sc.at.y },
      art: { l: b.left, t: b.top, r: b.right, b: b.bottom },
      picture: { l: m.e, t: m.f, r: m.a * 600 + m.e, b: m.d * 400 + m.f },
      scale: m.a,
    };
  });
}

/* What the play view reads now, and which of its texts a speaker mark stands in for. */
function reads() {
  const $ = (id) => document.getElementById(id);
  const text = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
  const mark = (el) => Boolean(el.querySelector('.w-mark'));
  return {
    head: text($('head')), headMark: mark($('head')),
    line: text($('line')), lineMark: mark($('line')),
    choices: [...$('choices').children].map((b) => ({ text: text(b), mark: mark(b) })),
  };
}

/* Put into the page: from now on, whenever the game asks sound.say() for a
   clip of its own whose Egyptian recording exists (as `there` says) while
   the switch is on Egyptian, the Fusha texts on the screen at that moment
   are noted in window.__beside: the father's rule is that there are none. */
function listen(there) {
  window.__beside = [];
  const seen = (el) => {
    if (!el || !el.getClientRects().length) return false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    }
    return true;
  };
  const textOf = (el) => {
    if (!el) return '';
    let out = '';
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walk.nextNode(); node; node = walk.nextNode()) if (seen(node.parentElement)) out += `${node.nodeValue} `;
    return out.replace(/\s+/g, ' ').trim();
  };
  const say = sound.say;
  sound.say = (name) => {
    if (typeof name === 'string' && name.startsWith('where-') && sound.dialect() === 'masri' && there(name)) {
      const view = document.querySelector('.view:not([hidden])');
      let text = '';
      if (view.id === 'view-play') text = ['head', 'line', 'choices'].map((id) => textOf(document.getElementById(id))).join(' ').trim();
      else text = textOf(view.querySelector(`[data-w="${name.replace('where-word-', '')}"]`));
      if (text) window.__beside.push(`${name}-masri is asked for while the screen reads «${text}»`);
    }
    return say(name);
  };
  return 1;
}

const frames = 'new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(1))))';

/* ---------- one screen ---------- */

async function run(width, height, mouse, half, way) {
  const name = `${width}x${height}`;
  const label = half === 'fusha' ? name : `${name} ${way}`;
  const wrong = [];
  const seen = new Set();
  const count = { steps: 0, looks: 0, things: 0, drags: 0, share: 1 };
  const timed = new Set(); // the kinds of step whose wait after a right answer was measured
  let again = 0; // put steps on which a thing was picked up again after a wrong place
  let hasty = 0; // put steps on which a quick hand put it right just after a wrong place
  const mine = started.length;
  const page = await open(PAGE, { width, height, touch: !mouse });
  const child = started[mine];
  /* Every call to the browser fails after a minute without an answer. */
  let dead = false;
  for (const call of ['send', 'eval', 'tap', 'drag', 'down', 'move', 'up', 'shot', 'resize']) {
    const real = page[call];
    page[call] = (...args) => limited(real(...args), ANSWER, 'the browser stopped answering').catch((error) => {
      if (/stopped answering/.test(error.message)) dead = true;
      throw error;
    });
  }
  let shots = 0;
  const fail = async (step, moment, what) => {
    const line = `${label}  ${step}  ${moment}: ${what}`;
    if (seen.has(line)) return;
    seen.add(line);
    wrong.push(line);
    if (wrong.length <= 3) process.stderr.write(`     ${line}
`);
    if (KEEP && shots < 12) {
      shots++;
      await page.shot(path.join(KEEP, `${label} ${step} ${moment}`.replace(/[^\w-]+/g, '_') + '.png'));
    }
  };
  const look = async (step, moment) => {
    const seenNow = await page.eval(`(${probe})()`);
    count.looks++;
    if (step !== 'the list' && step !== 'the end' && seenNow.share) count.share = Math.min(count.share, seenNow.share);
    for (const what of seenNow.wrong) await fail(step, moment, what);
    return seenNow;
  };
  const turn = async (step) => {
    await page.resize(height, width);
    await page.eval(frames);
    await look(step, 'turned');
    await page.resize(width, height);
    await page.eval(frames);
    await look(step, 'turned back');
  };

  try {
    /* The dialect switch on the page: one word named as recorded in both dialects. */
    await page.eval("(localStorage.setItem('recordings-test', 'where-word-in,where-word-in-masri'), 1)");
    await page.goto(PAGE);
    await page.eval('document.fonts.ready.then(() => 1)');
    await page.until("window.whereGame && typeof sound !== 'undefined'");
    count.toggle = await page.until("document.querySelector('.dialect-switch:not([hidden])')", 2500).then(() => true, () => false);
    if (count.toggle) await sleep(2300); // its two breaths of welcome
    await page.eval('whereGame.loaded ? whereGame.loaded().then(() => 1) : 1');
    const game = await page.eval(`(() => {
      const g = window.whereGame;
      const W = window.WHERE_WORDS;
      const all = Object.keys(W.words);
      g.pace = 0.02;
      g.freeze = true;
      const steps = [];
      for (const s of W.sentences) {
        steps.push({ kind: 'show', s });
        const wide = ['beside', 'under', 'behind', 'above'].filter((w) => w !== s[1]).slice(0, 2);
        steps.push({ kind: 'fill', s, choices: [wide[0], s[1], wide[1]] });
        const fits = g.fits(s);
        for (let i = 0; i < fits.length; i += 2) steps.push({ kind: 'find', s, pictures: [fits[i], s[1], ...fits.slice(i + 1, i + 2)] });
        const put = g.ask('put', s, all);
        if (put) steps.push(put);
      }
      return { steps, words: W.words, things: W.things, places: W.places, asks: W.asks, where: W.where, stages: g.STAGES.length };
    })()`);
    const clip = {
      sentence: (s) => `where-${s.join('-')}`,
      word: (w) => `where-word-${w}`,
      head: (step) => ({ show: `where-word-${step.s[1]}`, fill: `where-q-${step.s[0]}`, find: 'where-which', put: 'where-put' })[step.kind],
    };
    const headText = (step) => ({
      show: game.words[step.s[1]].text,
      fill: `${game.where.text} ${game.things[step.s[0]].text}؟`,
      find: game.asks.which.text,
      put: game.asks.put.text,
    })[step.kind];
    const placeWords = Object.values(game.words).map((w) => w.text);
    const nouns = [...Object.values(game.things).map((t) => t.text), ...Object.values(game.places).flatMap((p) => [p.text, p.two])];

    /* The Egyptian half: sound.masri() answered here, no recordings needed. */
    const ways = {
      none: () => false,
      all: () => true,
      sentences: (n) => !/^where-(word-|q-|which$|put$)/.test(n),
      words: (n) => /^where-(word-|q-|which$|put$)/.test(n),
    };
    const egyptian = half === 'egyptian' ? ways[way] : () => false;
    if (half === 'egyptian') {
      await page.eval(`(() => {
        const there = ${ways[way]};
        if (!${Boolean(REAL)}) sound.masri = (name) => Promise.resolve(sound.dialect() === 'masri' && there(name));
        (${listen})(there);
        sound.setDialect('masri');
        return 1;
      })()`);
      await page.eval('whereGame.settled().then(() => 1)');
    }

    /* What must and must not be read on a step's screen: said in Egyptian
       (its sentence has its Egyptian recording), no Fusha text at all;
       otherwise, everything as in Fusha. */
    const rule = async (step, moment, { shown = true, answered = false, masri = half === 'egyptian' } = {}) => {
      const title = stepName(step);
      const r = await page.eval(`(${reads})()`);
      const said = masri && egyptian(clip.sentence(step.s));
      const [thing, word, place] = step.s;
      const noun = word === 'between' ? game.places[place].two : game.places[place].text;
      if (said) {
        const everything = [r.head, r.line, ...r.choices.map((c) => c.text)].join(' ').trim();
        if (everything) await fail(title, moment, `said in Egyptian, but the screen reads «${everything}»`);
        if (step.kind !== 'fill' && shown && !r.lineMark) await fail(title, moment, 'no speaker mark stands in for the sentence');
        if ((step.kind === 'show' || step.kind === 'fill') && !r.headMark) await fail(title, moment, `no speaker mark stands in for ${step.kind === 'show' ? 'the large word' : 'the question'}`);
        if (r.choices.some((c) => !c.mark)) await fail(title, moment, 'a choice has no speaker mark');
        return;
      }
      if (shown) {
        const gap = step.kind === 'fill' && !answered;
        const want = gap ? [game.things[thing].text, noun] : [game.things[thing].text, game.words[word].text, noun];
        if (want.some((part) => !r.line.includes(part)) || (gap && r.line.includes(game.words[word].text))) await fail(title, moment, `the sentence reads «${r.line}»`);
      }
      if (r.head !== headText(step) || r.headMark) await fail(title, moment, `the head reads «${r.head}»${r.headMark ? ' with a speaker mark' : ''}`);
      for (let i = 0; i < r.choices.length; i++) {
        const w = step.choices[i];
        const c = r.choices[i];
        if (c.text !== game.words[w].text || c.mark) await fail(title, moment, `the choice «${game.words[w].text}» reads «${c.text}»${c.mark ? ' with a speaker mark' : ''}`);
      }
    };

    /* Whatever Egyptian recording was asked for beside Fusha text since the last call. */
    const beside = async (title, moment) => {
      const list = await page.eval('(() => { const b = window.__beside || []; window.__beside = []; return b; })()');
      for (const what of list) await fail(title, moment, what);
    };
    /* A tap on a text of the step, to make it speak. */
    const hear = async (id) => {
      const at = await page.eval(`(() => { const el = document.getElementById('${id}'); const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && (el.textContent.trim() || el.querySelector('.w-mark')) ? [r.left + r.width / 2, r.top + r.height / 2] : null; })()`);
      if (!at) return;
      await page.tap(at[0], at[1]);
      await sleep(60);
    };

    /* Three pictures of the thing's place: as it is, without the thing, and
       with the thing in front of everything. */
    const drawn = async (title, i, where, whole) => {
      const t = (await page.eval(`(${things})()`))[i];
      const pad = 3;
      const region = { x: Math.floor(t.art.l) - pad, y: Math.floor(t.art.t) - pad, width: Math.ceil(t.art.r - t.art.l) + 2 * pad, height: Math.ceil(t.art.b - t.art.t) + 2 * pad, scale: 1 };
      const inside = t.art.l >= t.picture.l - 1 && t.art.t >= t.picture.t - 1 && t.art.r <= t.picture.r + 1 && t.art.b <= t.picture.b + 1;
      count.things++;
      if (!inside) await fail(title, where, `the thing leaves the picture (${Math.round(t.art.l)},${Math.round(t.art.t)} to ${Math.round(t.art.r)},${Math.round(t.art.b)}; the picture ${Math.round(t.picture.l)},${Math.round(t.picture.t)} to ${Math.round(t.picture.r)},${Math.round(t.picture.b)})`);
      if (whole) {
        const room = 0.035 * (t.picture.r - t.picture.l);
        const least = Math.min(t.art.l - t.picture.l, t.art.t - t.picture.t, t.picture.r - t.art.r, t.picture.b - t.art.b);
        if (least < room) await fail(title, where, `the waiting thing is ${Math.round(least)} px from the picture's edge (${Math.round(room)} at least)`);
      }
      if (region.width < 8 || region.height < 8) return fail(title, where, 'the thing has no size');
      const shoot = async (prepare) => {
        await page.eval(`(() => { const sc = whereGame.scenes()[${i}]; const art = sc.piece.querySelector('[data-art]') || sc.piece; ${prepare}; return ${frames}; })()`);
        const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: region });
        return decode(Buffer.from(data, 'base64'));
      };
      const size = (t.art.r - t.art.l) * (t.art.b - t.art.t);
      const take = async () => {
        const as = await shoot('');
        const without = await shoot("art.setAttribute('visibility', 'hidden')");
        const front = await shoot("art.removeAttribute('visibility'); sc.__home = sc.piece.parentNode; sc.layer('drag').append(sc.piece)");
        await page.eval(`(() => { const sc = whereGame.scenes()[${i}]; sc.__home.append(sc.piece); return 1; })()`);
        return { full: differ(front, without), shows: differ(as, without) };
      };
      let { full, shows } = await take();
      if (full < 0.2 * size) {
        /* A busy computer can paint a picture late: one more look, a moment on. */
        await sleep(500);
        ({ full, shows } = await take());
      }
      if (full < 0.2 * size) return fail(title, where, `the thing is not drawn: ${full} pixels of a box of ${Math.round(size)} change when it is put in front of everything`);
      const part = shows / full;
      if (part < (whole ? 0.97 : 1 / 3)) await fail(title, where, `${Math.round(part * 100)}% of the thing shows`);
    };

    /* With nothing recorded, the next step must not be long after a right
       answer: measured once for each kind of question (a step played alone
       ends its stage, so the end screen is what comes). */
    const goesOn = async (step) => {
      if (half !== 'fusha' || timed.has(step.kind)) return;
      timed.add(step.kind);
      const came = await page.until('window.__took > 0', 5000).then(() => true, () => false);
      const took = came ? Math.round(await page.eval('window.__took')) : 0;
      if (!came) await fail(stepName(step), 'answered', 'no next step within 5 s of the right answer');
      else if (took > 2300) await fail(stepName(step), 'answered', `the next step came ${took} ms after the right answer (2300 at most with nothing recorded)`);
    };

    /* The page's own clock from the right answer to the next screen. */
    const clock = () => page.eval(`(() => {
      window.__took = 0;
      clearInterval(window.__clock);
      let from = 0;
      window.__clock = setInterval(() => {
        if (!from && document.querySelector('.w-choice.right, .w-frame.right')) from = performance.now();
        if (from && !document.getElementById('view-done').hidden) { window.__took = performance.now() - from; clearInterval(window.__clock); }
      }, 15);
      return 1;
    })()`);

    const stepName = (step) => `${step.kind} ${step.s.join('-')}${step.pictures ? ` [${step.pictures.join(' ')}]` : ''}`;

    /* The list of stages and the end of a stage. */
    await page.eval(`whereGame.list(), ${frames}`);
    await page.eval('whereGame.settled().then(() => 1)');
    await look('the list', 'settled');
    await turn('the list');
    for (let n = 0; n < game.stages; n++) {
      await page.eval(`whereGame.finish(${n}), ${frames}`);
      await page.eval('whereGame.settled().then(() => 1)');
      await look('the end', `of stage ${n + 1}`);
      if (n === 0) await turn('the end');
    }
    if (half === 'egyptian') {
      const chips = await page.eval(`(() => { whereGame.list(); return whereGame.settled().then(() => [...document.querySelectorAll('#stages .w-stage-card')].map((c) => ({ text: c.innerText.replace(/\\s+/g, ' ').trim(), marks: c.querySelectorAll('.w-mark').length }))); })()`);
      const hiddenWords = Object.keys(game.words).filter((w) => egyptian(clip.word(w)));
      const text = chips.map((c) => c.text).join(' ');
      for (const w of Object.keys(game.words)) {
        const there = text.includes(game.words[w].text);
        if (hiddenWords.includes(w) && there) await fail('the list', 'settled', `«${game.words[w].text}» has an Egyptian recording, but its Fusha text is on the list`);
        if (!hiddenWords.includes(w) && !there) await fail('the list', 'settled', `«${game.words[w].text}» has no Egyptian recording, but its text is not on the list`);
      }
      if (chips.reduce((sum, c) => sum + c.marks, 0) !== hiddenWords.length) await fail('the list', 'settled', 'not one speaker mark per word with an Egyptian recording');
    }

    /* A thing under a landmark and a thing in front of it draw alike. */
    const alike = await page.eval("Object.entries(whereGame.PLACES).filter(([, p]) => p.spots.under && p.spots.front).map(([name]) => name)");
    for (const place of alike) await fail('the landmarks', 'as written', `«${place}» has a place both for under and for in front: seen from the front they are the same picture`);

    /* Each large word in its real stage, under all the stage's dots: its ink
       (photographed with the word and without it) must not reach them. */
    if (half === 'fusha') {
      for (let n = 0; n < game.stages; n++) {
        await page.eval(`(whereGame.pace = 0.02, whereGame.begin(${n}), 1)`);
        const shows = await page.eval("whereGame.plan.map((x, i) => ({ i, kind: x.kind, word: x.s[1] })).filter((x, k, all) => x.kind === 'show' && all.findIndex((y) => y.kind === 'show' && y.word === x.word) === k)");
        for (const show of shows) {
          const title = `stage ${n + 1}, the large «${show.word}»`;
          await page.eval(`(whereGame.go(${show.i}), whereGame.settled().then(() => ${frames}))`);
          await page.until("document.getElementById('line').classList.contains('on')", 5000).catch(() => {});
          await sleep(450);
          await look(title, 'with all its dots');
          const box = await page.eval("(() => { const r = document.getElementById('dots').getBoundingClientRect(); return { x: Math.floor(r.left), y: Math.floor(r.top), width: Math.ceil(r.width), height: Math.ceil(r.height), scale: 1 }; })()");
          const shoot = async (how) => {
            await page.eval(`(document.getElementById('head').style.visibility = '${how}', ${frames})`);
            const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: box });
            return decode(Buffer.from(data, 'base64'));
          };
          const withWord = await shoot('');
          const without = await shoot('hidden');
          await page.eval("(document.getElementById('head').style.visibility = '', 1)");
          /* Ink, not the shade of a dot's edge, which the browser draws a little
             differently from one picture to the next (seen: two pixels, by 17 of 255). */
          const ink = differ(withWord, without, 40);
          if (ink > 0) await fail(title, 'with all its dots', `${ink} pixels of the word are drawn in the row of dots`);
        }
      }
    }

    const done = new Set();
    for (const step of game.steps) {
      const title = stepName(step);
      count.steps++;
      await page.eval(`(() => { whereGame.pace = 0.02; whereGame.try(${JSON.stringify(step)}); return 1; })()`);
      await look(title, 'opening');
      await page.eval(`whereGame.settled().then(() => ${frames})`);
      await sleep(70);
      await page.eval(frames);
      await look(title, 'settled');
      await rule(step, 'settled');
      if (half === 'fusha') await turn(title);

      if (half === 'egyptian') {
        /* The switch flipped in the middle of the step, and back. */
        await page.eval("(sound.setDialect('fusha'), 1)");
        await rule(step, 'flipped to Fusha', { masri: false });
        await look(title, 'flipped to Fusha');
        await page.eval("(sound.setDialect('masri'), whereGame.settled().then(() => 1))");
        await rule(step, 'flipped back');
        await look(title, 'flipped back');
        /* What is heard beside what is read: each text is tapped to make it speak. */
        await beside(title, 'as the step is said');
        await page.eval('(whereGame.pace = 1, 1)');
        await hear('head');
        await beside(title, 'the head tapped');
        await hear('line');
        await beside(title, 'the sentence tapped');
        if (step.kind === 'fill') {
          const wrongAt = await page.eval("(() => { const b = document.getElementById('choices').children[0].getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()");
          await page.tap(wrongAt[0], wrongAt[1]);
          await sleep(60);
          await beside(title, 'a wrong choice tapped');
        }
      } else {
        const list = await page.eval(`(${things})()`);
        if (step.kind === 'find') {
          /* Two pictures of the same layout must not draw the thing in nearly the same place. */
          const boxOf = (t) => ({ l: t.at.x - t.size.l, r: t.at.x + t.size.r, t: t.at.y - t.size.top, b: t.at.y });
          for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
              if ((step.pictures[i] === 'between') !== (step.pictures[j] === 'between')) continue;
              const a = boxOf(list[i]);
              const b = boxOf(list[j]);
              const shared = Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
              const part = shared / ((a.r - a.l) * (a.b - a.t));
              if (part >= 0.5) await fail(title, 'settled', `the pictures «${step.pictures[i]}» and «${step.pictures[j]}» draw the thing in nearly the same place (${Math.round(part * 100)}% of it is shared)`);
            }
          }
        }
        for (let i = 0; i < list.length; i++) {
          const w = step.kind === 'find' ? step.pictures[i] : step.s[1];
          /* The kind of step is part of the key: the first version drew the thing in its show step and
             never painted it in the fill step of the same sentence, so each kind is photographed. */
          const key = `${step.kind} ${step.s[0]} ${w} ${step.s[2]} ${w === 'between'}`;
          if (step.kind === 'put' || done.has(key)) continue;
          done.add(key);
          await drawn(title, i, `at «${w}»`, false);
        }
        if (step.kind === 'put') {
          await drawn(title, 0, 'waiting', true);
          const [tx, ty, tw, th] = list[0].tray || [0, 0, 0, 0];
          if (!list[0].tray) await fail(title, 'waiting', 'the waiting thing has no tray under it');
          else if (tx < 0 || ty < 0 || tx + tw > 600 || ty + th > 400) await fail(title, 'waiting', 'the tray leaves the picture');
          if (!list[0].halo) await fail(title, 'waiting', 'the waiting thing has no halo');
          for (const w of step.places) {
            const key = `put ${step.s[0]} ${w} ${step.s[2]} ${step.s[1] === 'between'}`;
            if (done.has(key)) continue;
            done.add(key);
            await page.eval(`(() => { const sc = whereGame.scenes()[0]; sc.__at = { ...sc.at }; sc.__in = sc.piece.parentNode; if (sc.waiting) sc.waiting(false); sc.show(${JSON.stringify(w)}); return ${frames}; })()`);
            await drawn(title, 0, `put «${w}»`, false);
            await page.eval('(() => { const sc = whereGame.scenes()[0]; sc.__in.append(sc.piece); sc.put(sc.__at.x, sc.__at.y); if (sc.waiting) sc.waiting(true); return 1; })()');
          }
        }
      }

      /* The answer. */
      await page.eval('(whereGame.pace = 1, 1)');
      if (step.kind === 'fill') {
        const at = await page.eval(`(() => { const b = document.getElementById('choices').children[1].getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()`);
        if (half === 'fusha' && !timed.has('fill')) await clock();
        await page.tap(at[0], at[1]);
        await look(title, 'answered');
        await sleep(450);
        await look(title, 'answered, a moment on');
        await rule(step, 'answered', { answered: true });
        if (half === 'egyptian') await beside(title, 'answered');
        if (!(await page.eval("Boolean(document.querySelector('.w-choice.right'))"))) await fail(title, 'answered', 'a tap on the right choice did not answer');
        else if (half === 'fusha') await goesOn(step);
      } else if (half === 'egyptian') {
        /* dragging and choosing a picture are the same in both halves */
      } else if (step.kind === 'find') {
        const i = step.pictures.indexOf(step.s[1]);
        const t = (await page.eval(`(${things})()`))[i];
        if (!timed.has('find')) await clock();
        await page.tap((t.picture.l + t.picture.r) / 2, t.picture.t + (t.picture.b - t.picture.t) * 0.2);
        await sleep(350);
        await look(title, 'answered');
        if (!(await page.eval("Boolean(document.querySelector('.w-frame.right'))"))) await fail(title, 'answered', 'a tap on the right picture did not answer');
        else await goesOn(step);
      } else if (step.kind === 'put') {
        count.drags++;
        const inPicture = async (moment) => {
          const t = (await page.eval(`(${things})()`))[0];
          if (t.art.l < t.picture.l - 1 || t.art.t < t.picture.t - 1 || t.art.r > t.picture.r + 1 || t.art.b > t.picture.b + 1) await fail(title, moment, 'the dragged thing left the picture');
          return t;
        };
        const t0 = (await page.eval(`(${things})()`))[0];
        const grab = [(t0.art.l + t0.art.r) / 2, (t0.art.t + t0.art.b) / 2];
        /* To nowhere: a far corner, then the other; let go, and it comes home. */
        await page.eval('(whereGame.pace = 0.05, 1)');
        await page.drag([grab, [6, height - 6]], { steps: 6, ms: 8, hold: true });
        const held = await inPicture('dragged to a corner');
        if (Math.abs(held.at.x - t0.at.x) < 20) await fail(title, 'dragged', 'the thing did not follow the finger');
        await page.move(width - 6, 62);
        await sleep(20);
        await inPicture('dragged to the other corner');
        await page.move(6, 62);
        await sleep(20);
        await inPicture('dragged to a third corner');
        await page.up(6, 62);
        await sleep(160);
        const home = (await page.eval(`(${things})()`))[0];
        if (Math.hypot(home.at.x - t0.at.x, home.at.y - t0.at.y) > 1) await fail(title, 'let go nowhere', `the thing did not come back (${Math.round(home.at.x)},${Math.round(home.at.y)}, not ${Math.round(t0.at.x)},${Math.round(t0.at.y)})`);
        await look(title, 'let go nowhere');
        await page.eval('(whereGame.pace = 1, 1)');
        const lift = mouse ? 0 : 46;
        const now = async () => (await page.eval(`(${things})()`))[0];
        const middle = (t) => [(t.art.l + t.art.r) / 2, (t.art.t + t.art.b) / 2];
        /* The finger that takes the thing from where it is to a place. */
        const fingerTo = (t, spot) => { const c = middle(t); return [c[0] + (spot.x - t.at.x) * t.scale, c[1] + (spot.y - t.at.y + lift) * t.scale]; };
        const rightDone = "Boolean(document.querySelector('.w-frame.right'))";
        /* Touched and let go without being moved: it has not been put anywhere. */
        await page.tap(grab[0], grab[1]);
        await sleep(560);
        const tapped = await now();
        if (await page.eval(rightDone)) await fail(title, 'touched, not moved', 'a touch alone answered');
        else if (Math.hypot(tapped.at.x - t0.at.x, tapped.at.y - t0.at.y) > 1) await fail(title, 'touched, not moved', 'the thing did not come back');
        const spots = await page.eval('whereGame.spots()');
        const rights = spots.filter((s) => s.right);
        const spot = rights[count.drags % rights.length]; // «بِجَانِبِ» has two: the left one on one step, the right one on the next
        const wrongSpot = spots.find((s) => !s.right);
        if (!timed.has('put')) await clock();
        if (wrongSpot && again < 4) {
          /* A wrong place; picked up again at once and held still: it must
             stay in the finger; then on to its place. */
          again++;
          await page.drag([grab, fingerTo(t0, wrongSpot)], { steps: 6, ms: 8 });
          await sleep(320);
          const there = await now();
          if (Math.hypot(there.at.x - wrongSpot.x, there.at.y - wrongSpot.y) > 2) await fail(title, 'let go at a wrong place', 'the thing did not settle there for a moment');
          const c = middle(there);
          await page.down(c[0], c[1]);
          await sleep(60);
          const taken = await now();
          await sleep(800);
          const held = await now();
          if (Math.hypot(held.at.x - taken.at.x, held.at.y - taken.at.y) > 1 || held.halo) await fail(title, 'picked up again after a wrong place', `the thing left the finger (it went from ${Math.round(taken.at.x)},${Math.round(taken.at.y)} to ${Math.round(held.at.x)},${Math.round(held.at.y)} while the finger held still)`);
          const to = fingerTo(there, spot);
          for (let k = 1; k <= 6; k++) {
            await page.move(c[0] + ((to[0] - c[0]) * k) / 6, c[1] + ((to[1] - c[1]) * k) / 6);
            await sleep(8);
          }
          await page.up(to[0], to[1]);
        } else if (wrongSpot && hasty < 3) {
          /* A wrong place, and at once to the right one: it must stay there. */
          hasty++;
          await page.drag([grab, fingerTo(t0, wrongSpot)], { steps: 6, ms: 8 });
          await sleep(260);
          const there = await now();
          await page.drag([middle(there), fingerTo(there, spot)], { steps: 3, ms: 8 });
          await sleep(650);
          const stays = await now();
          if (!stays) await fail(title, 'put right just after a wrong place', 'the step was gone 0.65 s later');
          else if (Math.hypot(stays.at.x - spot.x, stays.at.y - spot.y) > 2) await fail(title, 'put right just after a wrong place', `the thing left its place (it is at ${Math.round(stays.at.x)},${Math.round(stays.at.y)}, its place is ${Math.round(spot.x)},${Math.round(spot.y)})`);
        } else {
          /* Straight to its place. */
          await page.drag([grab, fingerTo(t0, spot)], { steps: 8, ms: 8 });
        }
        await sleep(330);
        if (!(await page.eval(rightDone))) await fail(title, 'let go at its place', 'the thing did not settle in its place');
        else {
          const placed = await now();
          if (placed && Math.hypot(placed.at.x - spot.x, placed.at.y - spot.y) > 2) await fail(title, 'let go at its place', 'the thing is not in its place');
          if (placed && placed.tray) await fail(title, 'answered', 'the tray still shows');
          await look(title, 'answered');
          await goesOn(step);
        }
      }
    }

    /* Each stage played through from the list, as a child would. */
    if (half === 'fusha') {
      const lift = mouse ? 0 : 46;
      for (let n = 0; n < game.stages; n++) {
        await page.eval(`(whereGame.pace = 0.05, whereGame.list(), ${frames})`);
        const card = await page.eval(`(() => { const r = document.querySelectorAll('#stages .w-stage-card')[${n}].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
        await page.tap(card[0], card[1]);
        const state = () => page.eval(`(() => ({ view: document.querySelector('.view:not([hidden])').id, index: whereGame.index, n: whereGame.plan.length, step: whereGame.step, dots: document.getElementById('dots').children.length, on: document.querySelectorAll('#dots .on').length }))()`);
        let last = -1;
        let waits = 0;
        let steps = 0;
        let st = await state();
        while (st.view === 'view-play' && waits < 150) {
          if (st.index === last || !st.step) {
            waits++;
            await sleep(40);
            st = await state();
            continue;
          }
          last = st.index;
          waits = 0;
          steps++;
          const step = st.step;
          const title = `stage ${n + 1} played through, step ${st.index + 1} of ${st.n} (${step.kind} ${step.s.join('-')})`;
          if (st.dots !== st.n || st.on !== st.index) await fail(title, 'opening', `${st.on} of ${st.dots} dots are on`);
          await page.eval(`whereGame.settled().then(() => ${frames})`);
          await sleep(140);
          await look(title, 'settled');
          if (step.kind === 'show') {
            await page.until("document.getElementById('line').classList.contains('on')", 4000).catch(() => {});
            await look(title, 'shown');
            const at = await page.center('#next');
            await page.tap(at[0], at[1]);
          } else if (step.kind === 'fill') {
            const at = await page.center(`#choices [data-w="${step.s[1]}"]`);
            await page.tap(at[0], at[1]);
          } else if (step.kind === 'find') {
            const t = (await page.eval(`(${things})()`))[step.pictures.indexOf(step.s[1])];
            await page.tap((t.picture.l + t.picture.r) / 2, t.picture.t + (t.picture.b - t.picture.t) * 0.2);
          } else {
            const t = (await page.eval(`(${things})()`))[0];
            const spot = await page.eval('whereGame.spots().find((s) => s.right)');
            const from = [(t.art.l + t.art.r) / 2, (t.art.t + t.art.b) / 2];
            await page.drag([from, [from[0] + (spot.x - t.at.x) * t.scale, from[1] + (spot.y - t.at.y + lift) * t.scale]], { steps: 6, ms: 8 });
          }
          st = await state();
        }
        const title = `stage ${n + 1} played through`;
        if (st.view !== 'view-done') await fail(title, 'at the end', `it stopped at step ${st.index + 1} of ${st.n} (${st.step ? `${st.step.kind} ${st.step.s.join('-')}` : 'no step'})`);
        else {
          await page.eval(frames);
          await look(title, 'at the end');
          if (steps !== st.n) await fail(title, 'at the end', `${steps} of ${st.n} steps were seen`);
          const kept = await page.eval("JSON.parse(localStorage.getItem('where') || '{}').done || []");
          if (!kept.includes(n)) await fail(title, 'at the end', 'the stage is not kept as finished');
        }
      }
    }

    if (half === 'egyptian' && way === 'all' && !REAL) await voice(page, game, fail);
    for (const error of page.errors) await fail('the page', 'at any time', `an error: ${error}`);
  } catch (error) {
    wrong.push(`${label}  the test itself stopped: ${error.message}`);
  }
  if (dead) {
    try { child.kill(); } catch { /* already gone */ }
  } else {
    await limited(page.close(), 8000, 'the browser did not close').catch(() => { try { child.kill(); } catch { /* already gone */ } });
  }
  return { label, wrong, count, dead };
}

/* The choices of a question read out in turn, with a voice made up here:
   every clip lasts 0.4 s, and those of `there` exist. */
async function voice(page, game, fail) {
  const step = { kind: 'fill', s: ['ball', 'under', 'table'], choices: ['in', 'under', 'on'] };
  const title = 'the reading-out';
  const begin = (there) => page.eval(`(() => {
    const there = ${there};
    window.__said = [];
    const speak = (name) => { const n = [].concat(name).find(there); if (!n) return Promise.resolve(); window.__said.push(n); return new Promise((done) => setTimeout(done, 400)); };
    sound.play = speak;
    sound.say = speak;
    sound.stop = () => {};
    sound.buffer = (name) => Promise.resolve(there(name) ? {} : null);
    sound.masri = () => Promise.resolve(false);
    sound.setDialect('fusha');
    whereGame.pace = 1;
    whereGame.try(${JSON.stringify(step)});
    window.__lit = [];
    window.__watch = setInterval(() => { const i = [...document.getElementById('choices').children].findIndex((b) => b.classList.contains('w-lit')); if (window.__lit[window.__lit.length - 1] !== i) window.__lit.push(i); }, 15);
    return whereGame.settled().then(() => 1);
  })()`);
  const end = () => page.eval('(clearInterval(window.__watch), { said: window.__said, lit: window.__lit.filter((i) => i >= 0) })');

  /* Everything recorded: the question, then each choice lit and said in turn. */
  await begin('() => true');
  await page.until("window.__said.length === 4 && !document.querySelector('.w-choice.w-lit')", 8000).catch(() => {});
  let r = await end();
  const want = ['where-q-ball', 'where-word-in', 'where-word-under', 'where-word-on'];
  if (r.said.join() !== want.join()) await fail(title, 'all recorded', `said ${r.said.join(', ') || 'nothing'}; wanted ${want.join(', ')}`);
  if (r.lit.join() !== '0,1,2') await fail(title, 'all recorded', `the choices lit in the order ${r.lit.join()}; wanted 0,1,2`);

  /* A tap in the middle stops it, says that word, and answers. */
  await begin('() => true');
  await page.until("document.getElementById('choices').children[0].classList.contains('w-lit')", 4000).catch(() => {});
  const at = await page.eval(`(() => { const b = document.getElementById('choices').children[2].getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()`);
  await page.tap(at[0], at[1]);
  await sleep(1300);
  r = await end();
  if (r.said.includes('where-word-under') || r.said[r.said.length - 1] !== 'where-word-on') await fail(title, 'tapped in the middle', `said ${r.said.join(', ')}; the tap should stop the reading and say the word tapped`);
  if (!(await page.eval("document.getElementById('choices').children[2].classList.contains('tried')"))) await fail(title, 'tapped in the middle', 'the tap did not answer');
  if (await page.eval("Boolean(document.querySelector('.w-choice.w-lit'))")) await fail(title, 'tapped in the middle', 'a choice is still lit');

  /* Nothing recorded: nothing lights, and nothing is waited for. */
  await begin('() => false');
  await sleep(500);
  r = await end();
  if (r.said.length || r.lit.length) await fail(title, 'nothing recorded', `said ${r.said.join(', ') || 'nothing'}, lit ${r.lit.join() || 'nothing'}`);
  const open3 = await page.eval("[...document.getElementById('choices').children].filter((b) => getComputedStyle(b).visibility === 'visible' && getComputedStyle(b).opacity === '1').length");
  if (open3 !== 3) await fail(title, 'nothing recorded', `${open3} of 3 choices are there half a second in`);

  /* Only the words recorded: they are read at once, no wait for the question. */
  await begin("(n) => n.startsWith('where-word-')");
  await sleep(700);
  r = await end();
  if (r.said[0] !== 'where-word-in') await fail(title, 'only the words recorded', `0.7 s in, said ${r.said.join(', ') || 'nothing'}: a question that is not recorded was waited for`);
}

/* ---------- all of it ---------- */

(async () => {
  const jobs = [];
  for (const [w, h, kind] of screens) {
    const name = `${w}x${h}`;
    if (REAL) {
      jobs.push([w, h, kind === 'mouse', 'egyptian', REAL]);
      continue;
    }
    if (!halves.length || halves.includes('fusha')) jobs.push([w, h, kind === 'mouse', 'fusha', '']);
    if (!halves.length || halves.includes('egyptian')) {
      jobs.push([w, h, kind === 'mouse', 'egyptian', 'all']);
      if (MIXED.includes(name) || named.includes(name)) jobs.push([w, h, kind === 'mouse', 'egyptian', 'sentences'], [w, h, kind === 'mouse', 'egyptian', 'words']);
    }
  }
  if (KEEP) fs.mkdirSync(KEEP, { recursive: true });
  const began = Date.now();
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      let result = await run(...job);
      if (result.dead) {
        process.stderr.write(`     ${result.label}: the browser stopped answering; once more in a new one\n`);
        result = await run(...job);
      }
      results[jobs.indexOf(job)] = result;
      process.stderr.write(`${result.wrong.length ? 'FAIL' : 'ok  '} ${result.label || 'fusha'}\n`);
    }
  }));

  const failures = results.flatMap((r) => r.wrong);
  for (const line of failures) console.log(line);
  if (failures.length) console.log('');
  console.log('screen               steps  looks  things  drags  pictures  failures');
  for (const r of results) {
    const c = r.count;
    console.log(`${r.label.padEnd(20)} ${String(c.steps).padStart(5)}  ${String(c.looks).padStart(5)}  ${String(c.things).padStart(6)}  ${String(c.drags).padStart(5)}  ${`${Math.round(c.share * 100)}%`.padStart(8)}  ${String(r.wrong.length).padStart(8)}`);
  }
  console.log(`\n${failures.length ? `${failures.length} failures` : 'All good'}: ${results.length} runs on ${screens.length} screens in ${Math.round((Date.now() - began) / 1000)} s. "pictures" is the least share of the screen the pictures of a step took. The dialect switch was on the page in ${results.filter((r) => r.count.toggle).length} of the ${results.length} runs.`);
  process.exit(failures.length ? 1 : 0);
})();
