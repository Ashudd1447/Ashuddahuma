/* أَيْنَ؟, the words of where a thing is (فِي، عَلَى، تَحْتَ …), shown and then
   asked, the father's way: "Show that فِي means inside, then quiz him."

   Three stages, each a short run of steps, one dot each. A word is taught by
   showing it: a thing moves to its place by a landmark (the ball hops into
   the box), the word stands large in its own color, and the sentence shows
   under the picture and is said. Then the questions, of three kinds, over
   the words taught so far, the newest more often:
   - fill: the picture and its sentence with the word missing, under «أَيْنَ
     الْكُرَةُ؟»; he taps the word that fits;
   - find: the sentence is said; he taps the one of two or three pictures it
     tells;
   - put: the sentence is said; he drags the thing to its place himself.
   No losing: a wrong answer wobbles with the soft buzzer (a vibration on a
   touch screen that has one) and he tries again. A stage ends with
   «أحسنت», unvoweled as everywhere on the site. Which stages are finished is kept on the device.

   The pictures are made here: each scene is an SVG in its own lengths, 600
   by 400, with the landmarks standing on one ground line, drawn in layers
   (what is behind, the landmarks' back, what is among them, their front, what
   is in front), so that a thing in the box is hidden by the box's front and
   a thing behind the box by all of it. The small things and the tree and the
   house are the books' own clip art (sheets/img); the table, the chair, the
   box, the basket, the cat and the bird are drawn here in the same flat,
   outlined way, the animals with no eyes or other features. The words, the
   sentences and their clips are in where-words.js. */
(() => {
  const $ = (id) => document.getElementById(id);
  const W = window.WHERE_WORDS;
  const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
  const NS = 'http://www.w3.org/2000/svg';
  const KEY = 'where';
  const INK = '#22213F';

  /* The scene, in its own lengths. */
  const BASE = 330; // the ground line the landmarks stand on
  const BACK = -24; // a thing behind stands this much further up the floor
  const FRONT = 44; // a thing in front, this much further down
  const AT = 330; // the middle of a lone landmark (room on its left for «بِجَانِبِ»)
  const PAIR = [165, 435]; // two landmarks, for «بَيْنَ»
  const REACH = 105; // put: how near the thing must be let go to a place to take it

  /* Milliseconds. */
  const MOVE = 1300; // a thing going to its place while a word is shown
  const QUICK = 650; // the same at the start of a question
  const SNAP = 220; // a thing let go, settling in a place
  const BACKHOME = 450; // a thing going back to where it waits
  const AFTER = 900; // a right answer: after the sentence, before the next step
  const PATIENCE = 7000; // the longest wait for a recording to end
  const QUIET = 1400; // how long a missing recording is waited for

  /* The stages. A plan is a run of: ['show', word], which shows its first two
     sentences, and ['ask', words, count, newest], questions over those
     words, at least every other one about the newest. */
  const STAGES = [
    {
      words: ['in', 'on', 'under'],
      plan: [['show', 'in'], ['show', 'on'], ['ask', ['in', 'on'], 4], ['show', 'under'], ['ask', ['in', 'on', 'under'], 6, ['under']]],
    },
    {
      words: ['above', 'front', 'behind'],
      plan: [
        ['show', 'above'], ['ask', ['on', 'under', 'above'], 4, ['above']],
        ['show', 'front'], ['show', 'behind'], ['ask', ['in', 'on', 'under', 'above', 'front', 'behind'], 6, ['front', 'behind']],
      ],
    },
    {
      words: ['beside', 'between'],
      plan: [['show', 'beside'], ['show', 'between'], ['ask', ['in', 'on', 'under', 'above', 'front', 'behind', 'beside', 'between'], 8, ['beside', 'between']]],
    },
  ];
  /* The words a thing can be put to by dragging; in front and behind are
     only shown and asked about, as a picture cannot be dragged behind. */
  const PUTTABLE = new Set(['in', 'on', 'under', 'above', 'beside', 'between']);

  /* ---------- the drawings ---------- */

  /* The things that move: a picture of the books' (sheets/img) or one drawn
     here, its size, and the words it makes a sensible picture with. */
  const THINGS = {
    ball: { img: 'ball', w: 66, h: 66, can: 'in on under front behind beside between' },
    apple: { img: 'apple-red', w: 54, h: 67, can: 'in on under front behind beside between' },
    gift: { img: 'gift', w: 70, h: 68, can: 'in on under front behind beside between' },
    car: { img: 'car-red', w: 124, h: 69, toy: 0.7, can: 'in on under front behind beside between' },
    cat: { draw: cat, w: 72, h: 86, can: 'in on under front behind beside between' },
    bird: { draw: bird, w: 56, h: 44, flies: true, can: 'on above under beside' },
    balloon: { img: 'balloon-red', w: 46, h: 114, flies: true, can: 'above beside' },
    plane: { img: 'plane', w: 133, h: 62, flies: true, can: 'above' },
  };

  /* A thing's size in a scene: a car indoors is a toy. */
  function size(thing, place) {
    const t = THINGS[thing];
    const scale = t.toy && !PLACES[place].yard ? t.toy : 1;
    return { w: t.w * scale, h: t.h * scale };
  }

  const can = (thing, word) => THINGS[thing].can.split(' ').includes(word);

  function cat() {
    return `<g stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">
      <path d="M22 -8C50 -6 54 -38 36 -48" fill="none" stroke-width="12"/>
      <path d="M22 -8C50 -6 54 -38 36 -48" fill="none" stroke="#EFA24E" stroke-width="5.5"/>
      <path d="M-29 0C-35 -30 -24 -56 0 -56C24 -56 35 -30 29 0Z" fill="#EFA24E"/>
      <path d="M-10 -40C-14 -22 -12 -8 -6 0H6C12 -8 14 -22 10 -40Z" fill="#FFE3BD" stroke="none"/>
      <ellipse cx="-11" cy="-4" rx="9" ry="5" fill="#FFE3BD"/>
      <ellipse cx="11" cy="-4" rx="9" ry="5" fill="#FFE3BD"/>
      <path d="M-19 -70L-23 -94L-4 -82Z" fill="#EFA24E"/>
      <path d="M19 -70L23 -94L4 -82Z" fill="#EFA24E"/>
      <circle cx="0" cy="-64" r="22" fill="#EFA24E"/>
      <path d="M-17 -74L-19 -87L-10 -80Z" fill="#F7B9A8" stroke="none"/>
      <path d="M17 -74L19 -87L10 -80Z" fill="#F7B9A8" stroke="none"/>
      <path d="M-6 -85V-77M0 -86V-77M6 -85V-77M-29 -30H-21M29 -30H21M-28 -20H-20M28 -20H20" stroke="#C9792F" stroke-width="3"/>
    </g>`;
  }

  /* A small bird, side on, its head to the left; sitting, or flying with its
     wings up. No eye. */
  function bird(word) {
    const flying = word === 'above' || word === 'between';
    const legs = flying ? '' : '<path d="M-5 -9V0M5 -9V0M-9 0H-1M1 0H9" stroke="#E39B2D" stroke-width="3"/>';
    const wing = flying
      ? `<path d="M-6 -24C-14 -44 -2 -50 12 -44C10 -36 6 -28 6 -22Z" fill="#2F7FC0"/>`
      : `<path d="M-6 -24C2 -14 14 -14 20 -22C12 -28 2 -30 -6 -24Z" fill="#2F7FC0"/>`;
    return `<g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      ${legs}
      <path d="M16 -22L30 -30L28 -14Z" fill="#2F7FC0"/>
      <ellipse cx="0" cy="-20" rx="21" ry="14" fill="#56A9E6"/>
      <path d="M-24 -35L-33 -31L-24 -27Z" fill="#F2B84B"/>
      <circle cx="-15" cy="-31" r="11" fill="#56A9E6"/>
      ${wing}
    </g>`;
  }

  const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
  const clip = (name, w, h) => `<image href="sheets/img/${name}.png" x="${-w / 2}" y="${-h}" width="${w}" height="${h}"/>`;

  /* The landmarks: their back and front, drawn with the middle of their foot
     at 0,0, and where a thing of size t stands for each word, from that
     point (y up is negative) and in which layer. */
  const PLACES = {
    table: {
      half: 125,
      back: () => `<g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
        ${rect(-112, -120, 16, 120, '#B9773F')}${rect(96, -120, 16, 120, '#B9773F')}
        ${rect(-116, -122, 232, 16, '#A9683A')}
        ${rect(-125, -136, 250, 18, '#D08E4E', 'rx="5"')}
      </g>`,
      front: () => '',
      spots: {
        on: () => ({ x: 0, y: -136 }),
        under: () => ({ x: 0, y: 0 }),
        above: () => ({ x: 0, y: -206 }),
        beside: (t) => ({ x: -(125 + 22 + t.w / 2), y: 0 }),
      },
    },
    chair: {
      half: 62,
      back: () => `<g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
        ${rect(-52, -196, 13, 100, '#3B7FB0')}${rect(39, -196, 13, 100, '#3B7FB0')}
        ${rect(-44, -160, 88, 12, '#4F9BD0', 'rx="3"')}
        ${rect(-58, -202, 116, 26, '#4F9BD0', 'rx="7"')}
        ${rect(-56, -86, 13, 86, '#3B7FB0')}${rect(43, -86, 13, 86, '#3B7FB0')}
        ${rect(-62, -100, 124, 18, '#4F9BD0', 'rx="5"')}
      </g>`,
      front: () => '',
      spots: {
        on: () => ({ x: 0, y: -100 }),
        under: () => ({ x: 0, y: 0 }),
        above: () => ({ x: 0, y: -262 }),
        front: () => ({ x: 0, y: FRONT, layer: 'front' }),
        beside: (t) => ({ x: -(62 + 22 + t.w / 2), y: 0 }),
      },
    },
    box: {
      half: 76,
      pairs: true,
      back: () => `<g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
        <path d="M-62 -118L-52 -150H52L62 -118Z" fill="#D9A066"/>
        <path d="M-76 -100L-110 -126L-86 -140L-62 -118Z" fill="#E7B47A"/>
        <path d="M76 -100L110 -126L86 -140L62 -118Z" fill="#E7B47A"/>
        <path d="M-76 -100L-62 -118H62L76 -100Z" fill="#9C6A3A"/>
      </g>`,
      front: () => `<g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
        ${rect(-76, -100, 152, 100, '#E0A867', 'rx="3"')}
        <path d="M-76 -100H76V-84H-76Z" fill="#C98F50"/>
        ${rect(-20, -60, 40, 26, '#F3D9B0', 'rx="3" stroke-width="3"')}
      </g>`,
      spots: {
        in: (t) => ({ x: 0, y: -100 + t.h * 0.5 }),
        front: () => ({ x: 8, y: FRONT, layer: 'front' }),
        behind: () => ({ x: 76, y: BACK, layer: 'back' }),
        beside: (t) => ({ x: -(76 + 22 + t.w / 2), y: 0 }),
      },
    },
    basket: {
      half: 68,
      pairs: true,
      back: () => `<g stroke-linecap="round" fill="none">
        <path d="M-54 -78C-54 -168 54 -168 54 -78" stroke="${INK}" stroke-width="13"/>
        <path d="M-54 -78C-54 -168 54 -168 54 -78" stroke="#C48A47" stroke-width="6"/>
        <ellipse cx="0" cy="-78" rx="66" ry="14" fill="#7E5128" stroke="${INK}" stroke-width="4"/>
      </g>`,
      front: () => `<g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
        <path d="M-68 -78L-54 0H54L68 -78Q0 -62 -68 -78Z" fill="#D9A15B"/>
        <path d="M-62 -48Q0 -36 62 -48M-58 -22Q0 -12 58 -22M-30 -70L-24 0M0 -66V0M30 -70L24 0" fill="none" stroke="#A8743A" stroke-width="3"/>
        <path d="M-70 -80Q0 -60 70 -80" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>
        <path d="M-70 -80Q0 -60 70 -80" fill="none" stroke="#C48A47" stroke-width="5" stroke-linecap="round"/>
      </g>`,
      spots: {
        in: (t) => ({ x: 0, y: -78 + t.h * 0.55 }),
        front: () => ({ x: 8, y: FRONT, layer: 'front' }),
        behind: () => ({ x: 68, y: BACK, layer: 'back' }),
        beside: (t) => ({ x: -(68 + 22 + t.w / 2), y: 0 }),
      },
    },
    tree: {
      half: 72,
      yard: true,
      pairs: true,
      back: () => clip('tree', 144, 230),
      front: () => '',
      spots: {
        on: () => ({ x: 0, y: -226 }),
        above: () => ({ x: 0, y: -272 }),
        under: () => ({ x: 34, y: 8 }),
        front: () => ({ x: 0, y: FRONT, layer: 'front' }),
        beside: (t) => ({ x: -(72 + 18 + t.w / 2), y: 0 }),
      },
    },
    house: {
      half: 108,
      yard: true,
      back: () => clip('house', 216, 214),
      front: () => '',
      spots: {
        above: () => ({ x: 0, y: -262 }),
        front: () => ({ x: 0, y: FRONT, layer: 'front' }),
        behind: (t) => ({ x: 108 - 0.1 * t.w, y: BACK, layer: 'back' }),
        beside: (t) => ({ x: -(108 + 20 + t.w / 2), y: 0 }),
      },
    },
  };

  /* Whether a landmark has a place for a word, for this thing: above anything,
   and on a tree, only for a thing that flies (an apple sitting on top of a
   tree was a silly picture). */
  function supports(place, word, thing) {
    if (word === 'between') return Boolean(PLACES[place].pairs);
    if (!PLACES[place].spots[word]) return false;
    const flying = (word === 'above' || (word === 'on' && place === 'tree'));
    return !flying || Boolean(THINGS[thing].flies);
  }

  function backdrop(yard) {
    if (yard) {
      return `<defs><linearGradient id="w-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CC4EA"/><stop offset="1" stop-color="#E4F1F8"/></linearGradient></defs>
        <rect width="600" height="400" fill="url(#w-sky)"/>
        <circle cx="540" cy="58" r="26" fill="#FFD45C"/>
        <g fill="#FFFFFF" opacity=".9"><ellipse cx="96" cy="70" rx="38" ry="14"/><ellipse cx="120" cy="60" rx="24" ry="14"/></g>
        <rect y="262" width="600" height="138" fill="#A8D27F"/>
        <rect y="258" width="600" height="8" fill="#8FBF66"/>`;
    }
    return `<rect width="600" height="400" fill="#F4E7D0"/>
      <rect x="40" y="46" width="104" height="90" rx="6" fill="#CFE8F6" stroke="#C99B66" stroke-width="8"/>
      <path d="M92 46V136M40 91H144" stroke="#C99B66" stroke-width="6"/>
      <rect y="262" width="600" height="138" fill="#E3C79C"/>
      <rect y="254" width="600" height="10" fill="#C99B66"/>`;
  }

  function svg(name, attrs = {}) {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  }

  /* One scene: the landmark, or two of it for «بَيْنَ», and the thing.
     Returns the svg and what moves the thing about. */
  function scene(thing, word, place, { pair = word === 'between', hidden = false } = {}) {
    const p = PLACES[place];
    const root = svg('svg', { viewBox: '0 0 600 400', class: 'w-scene', 'aria-hidden': 'true' });
    const xs = pair ? PAIR : [AT];
    const lands = (part) => xs.map((x) => `<g transform="translate(${x} ${BASE})">${p[part]()}</g>`).join('');
    root.innerHTML = `${backdrop(p.yard)}<g data-layer="back"></g><g>${lands('back')}</g><g data-layer="mid"></g><g>${lands('front')}</g><g data-layer="front"></g><g data-layer="drag"></g>`;
    const t = size(thing, place);
    const piece = svg('g', { class: 'w-thing' });
    const art = THINGS[thing];
    piece.innerHTML = art.img ? clip(art.img, t.w, t.h) : art.draw(word);
    if (!art.img) piece.firstElementChild.setAttribute('transform', `scale(${t.w / art.w})`);
    const layer = (name) => root.querySelector(`[data-layer="${name}"]`);

    /* Where the thing stands for a word, in this scene's layout. */
    function spot(w) {
      if (w === 'between') return { x: 300, y: BASE + (art.flies ? -150 : 0), layer: 'mid' };
      const s = p.spots[w](t);
      return { x: (pair ? PAIR[0] : AT) + s.x, y: BASE + s.y, layer: s.layer || 'mid' };
    }

    const at = { x: 0, y: 0 };
    function put(x, y, name) {
      at.x = x;
      at.y = y;
      piece.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      if (name && piece.parentNode !== layer(name)) layer(name).append(piece);
    }

    /* Moves the thing along legs of { x, y, ms, lift }, each a straight line
       with a hop of lift above it, and calls done at the end. Runs on the
       animation frames, with a timer that finishes it if they stall (a
       hidden page has none). */
    let run = 0;
    function go(legs, done) {
      const mine = ++run;
      let leg = 0;
      let from = { ...at };
      let start = performance.now();
      const total = legs.reduce((sum, l) => sum + l.ms, 0);
      const finish = () => {
        if (mine !== run) return;
        run++;
        const last = legs[legs.length - 1];
        put(last.x, last.y);
        if (done) done();
      };
      const guard = setTimeout(finish, total + 250);
      const frame = (now) => {
        if (mine !== run) return clearTimeout(guard);
        const l = legs[leg];
        const k = Math.min(1, (now - start) / l.ms);
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        put(from.x + (l.x - from.x) * e, from.y + (l.y - from.y) * e - (l.lift || 0) * 4 * k * (1 - k));
        if (k < 1) return requestAnimationFrame(frame);
        leg++;
        if (leg >= legs.length) {
          clearTimeout(guard);
          finish();
          return;
        }
        from = { ...at };
        start = now;
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }

    /* The way into a place, from the side of the scene nearer to it: along
       the floor (behind, in front or among the landmarks), a hop at the end
       up into or onto a landmark; a flying thing glides in; «بَيْنَ» drops
       in from above. */
    function arrive(w, ms, done) {
      const s = spot(w);
      const fromLeft = s.x < 300;
      const edge = fromLeft ? -t.w : 600 + t.w;
      if (art.flies) {
        put(edge, s.y - 40, s.layer);
        return go([{ x: s.x, y: s.y, ms }], done);
      }
      if (w === 'between') {
        put(s.x, -10, s.layer);
        return go([{ x: s.x, y: s.y, ms: ms * 0.7 }, { x: s.x, y: s.y, ms: ms * 0.3, lift: 18 }], done);
      }
      const floor = s.layer === 'mid' ? BASE : s.y;
      put(edge, floor, s.layer);
      if (s.y >= floor - 4) return go([{ x: s.x, y: s.y, ms }], done);
      /* Up into or onto a landmark: along the floor to beside it, then a hop. */
      const near = (pair ? PAIR[0] : AT) + (fromLeft ? -1 : 1) * (p.half + t.w / 2 + 12);
      const lift = floor - s.y + 50;
      go([{ x: near, y: floor, ms: ms * 0.55 }, { x: s.x, y: s.y, ms: ms * 0.45, lift: lift / 2 + 40 }], done);
    }

    function show(w) {
      const s = spot(w);
      put(s.x, s.y, s.layer);
    }

    if (!hidden) show(word);
    return { root, piece, spot, put, go, arrive, show, at, size: t, layer, stop: () => run++ };
  }

  /* ---------- the game ---------- */

  const all = W.sentences;
  const key = (s) => s.join('-');
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  function shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /* The steps of a stage, worked out afresh each time it is played. */
  function steps(stage) {
    const out = [];
    for (const [kind, word, count, newest] of STAGES[stage].plan) {
      if (kind === 'show') {
        for (const s of all.filter((s) => s[1] === word).slice(0, 2)) out.push({ kind: 'show', s });
      } else {
        out.push(...questions(word, count, newest || word));
      }
    }
    return out;
  }

  /* Questions over some words: every other one about the newest of them, no
     sentence twice in a row of three, the kinds taking turns where they fit. */
  function questions(words, count, newest) {
    const out = [];
    const kinds = ['fill', 'find', 'put'];
    let turn = Math.floor(Math.random() * kinds.length);
    const recent = [];
    for (let i = 0; i < count; i++) {
      const focus = i % 2 === 0 ? newest : words;
      let pool = all.filter((s) => focus.includes(s[1]) && !recent.includes(key(s)));
      if (out.length) pool = pool.filter((s) => s[1] !== out[out.length - 1].s[1] || focus.length === 1);
      if (!pool.length) pool = all.filter((s) => focus.includes(s[1]));
      const s = pick(pool);
      recent.push(key(s));
      if (recent.length > 3) recent.shift();
      let step = null;
      for (let k = 0; k < kinds.length && !step; k++) step = ask(kinds[(turn + k) % kinds.length], s, words);
      turn++;
      out.push(step || ask('fill', s, words));
    }
    return out;
  }

  /* One question of a kind about a sentence, or null where it does not fit. */
  function ask(kind, s, words) {
    const [thing, word, place] = s;
    const others = words.filter((w) => w !== word);
    if (kind === 'fill') {
      return { kind, s, choices: shuffle([word, ...shuffle(others).slice(0, 2)]) };
    }
    const fits = others.filter((w) => can(thing, w) && supports(place, w, thing));
    if (kind === 'find') {
      if (!fits.length) return null;
      return { kind, s, pictures: shuffle([word, ...shuffle(fits).slice(0, 2)]) };
    }
    if (kind === 'put') {
      if (!PUTTABLE.has(word) || thing === 'plane') return null;
      /* The places offered are those of the words in play that fit this
         layout: with two landmarks, «بَيْنَ» and the rest by the first one. */
      const places = [word, ...fits.filter((w) => PUTTABLE.has(w) && (w !== 'between' || word === 'between'))];
      return { kind, s, places };
    }
    return null;
  }

  /* ---------- the page ---------- */

  const clipOf = W.clip;
  const words = W.words;

  let kept = null;
  let stage = 0;
  let plan = [];
  let index = 0;
  let current = null; // the step on the screen: its scene, its state
  let busy = false; // a right answer is being said: no more taps
  let saidWhich = false;
  let saidPut = false;
  const timers = new Set();

  function later(run, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      run();
    }, ms);
    timers.add(id);
    return id;
  }

  function forget() {
    for (const id of timers) clearTimeout(id);
    timers.clear();
    if (current && current.scene) current.scene.stop();
  }

  /* Says clips one after another and then calls done: each clip as long as
     it lasts, a missing one a short quiet moment, never longer than
     PATIENCE in all. Only the latest call ever calls its done. */
  let speech = 0;
  function say(names, done) {
    const mine = ++speech;
    const list = [].concat(names);
    const began = Date.now();
    const next = (i) => {
      if (mine !== speech) return;
      if (i >= list.length || Date.now() - began > PATIENCE) {
        if (done) done();
        return;
      }
      const started = Date.now();
      const fallback = later(() => next(i + 1), PATIENCE);
      sound.say(list[i]).then(() => {
        clearTimeout(fallback);
        timers.delete(fallback);
        if (mine !== speech) return;
        const heard = Date.now() - started > 250;
        later(() => next(i + 1), heard ? 120 : QUIET);
      });
    };
    next(0);
  }

  function hush() {
    speech++;
    sound.stop();
  }

  function load() {
    try {
      kept = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      kept = null;
    }
    if (!kept || kept.v !== 1 || !Array.isArray(kept.done)) kept = { v: 1, done: [] };
    kept.done = kept.done.filter((n) => Number.isInteger(n) && n >= 0 && n < STAGES.length);
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(kept));
    } catch {
      /* a full or private store: the game plays on */
    }
  }

  function view(name) {
    for (const v of ['list', 'play', 'done']) $(`view-${v}`).hidden = v !== name;
  }

  const wordSpan = (w, cls = 'w-word') => `<span class="${cls}" style="--c:${words[w].color}">${words[w].text}</span>`;

  /* The sentence under a picture; with gap, the word's place is left open. */
  function sentence(s, gap = false) {
    const [thing, word, place] = s;
    const where = word === 'between' ? W.places[place].two : W.places[place].text;
    const middle = gap ? '<span class="w-gap" id="gap"></span>' : wordSpan(word);
    return `<span>${W.things[thing].text}</span> ${middle} <span>${where}</span>`;
  }

  /* ---------- the list of stages ---------- */

  function list() {
    forget();
    hush();
    current = null;
    view('list');
    const nav = $('stages');
    nav.textContent = '';
    const next = STAGES.findIndex((_, i) => !kept.done.includes(i));
    STAGES.forEach((st, i) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'w-stage-card';
      if (kept.done.includes(i)) card.classList.add('done');
      if (i === next) card.classList.add('invite');
      card.innerHTML = `<span class="w-stage-words">${st.words.map((w) => wordSpan(w)).join('')}</span>`;
      card.addEventListener('click', () => begin(i));
      nav.append(card);
    });
  }

  /* ---------- playing a stage ---------- */

  function begin(n) {
    stage = n;
    plan = steps(n);
    index = 0;
    saidWhich = false;
    saidPut = false;
    const names = [];
    for (const step of plan) {
      names.push(clipOf.sentence(step.s), clipOf.word(step.s[1]), clipOf.ask(step.s[0]));
      if (step.choices) names.push(...step.choices.map(clipOf.word));
    }
    sound.preloadPrompts([...new Set([...names, clipOf.which, clipOf.put, 'well-done'])]);
    view('play');
    $('dots').innerHTML = plan.map(() => '<i></i>').join('');
    play();
  }

  function dots() {
    [...$('dots').children].forEach((dot, i) => dot.classList.toggle('on', i < index));
  }

  function play() {
    forget();
    hush();
    busy = false;
    dots();
    if (index >= plan.length) return finish();
    const step = plan[index];
    current = { step };
    const playView = $('view-play');
    playView.dataset.kind = step.kind;
    $('head').innerHTML = '';
    $('line').innerHTML = '';
    $('choices').innerHTML = '';
    $('stage').innerHTML = '';
    $('next').hidden = true;
    $('next').classList.remove('call');
    ({ show: showStep, fill: fillStep, find: findStep, put: putStep })[step.kind](step);
    fit();
  }

  function advance() {
    index++;
    play();
  }

  /* A frame for one scene, as large as the room under the head allows. */
  function frame(sc) {
    const box = document.createElement('div');
    box.className = 'w-frame';
    box.append(sc.root);
    return box;
  }

  /* The pictures fill the room they have: one as large as fits at 3 by 2,
     several in the number of columns that makes each largest. */
  function fit() {
    const stageBox = $('stage');
    const frames = [...stageBox.querySelectorAll('.w-frame')];
    if (!frames.length) return;
    const W0 = stageBox.clientWidth;
    const H0 = stageBox.clientHeight;
    const gap = 14;
    let best = { cols: 1, w: 0 };
    for (let cols = 1; cols <= frames.length; cols++) {
      const rows = Math.ceil(frames.length / cols);
      const w = Math.min((W0 - gap * (cols - 1)) / cols, ((H0 - gap * (rows - 1)) / rows) * 1.5);
      if (w > best.w) best = { cols, w };
    }
    stageBox.style.gridTemplateColumns = `repeat(${best.cols}, ${Math.max(60, Math.floor(best.w))}px)`;
  }

  /* Show: the word large in its color, the thing going to its place, then
     the sentence, shown and said. The next arrow breathes when it is said. */
  function showStep(step) {
    const [thing, word, place] = step.s;
    $('head').innerHTML = wordSpan(word, 'w-word w-big');
    $('head').onclick = () => say(clipOf.word(word));
    const sc = scene(thing, word, place, { hidden: true });
    current.scene = sc;
    const box = frame(sc);
    $('stage').append(box);
    const run = () => {
      hush();
      $('line').classList.remove('on');
      $('next').classList.remove('call');
      sc.arrive(word, MOVE, () => {
        $('line').innerHTML = sentence(step.s);
        $('line').classList.add('on');
        say(clipOf.sentence(step.s), () => $('next').classList.add('call'));
      });
    };
    box.onclick = run;
    $('again').onclick = run;
    $('next').hidden = false;
    $('next').onclick = advance;
    later(run, 350);
  }

  /* Fill: «أَيْنَ الْكُرَةُ؟», the picture, its sentence with the word missing,
     and the words in play to choose from. */
  function fillStep(step) {
    const [thing, word, place] = step.s;
    $('head').textContent = `${W.where.text} ${W.things[thing].text}؟`;
    const sc = scene(thing, word, place, { hidden: true });
    current.scene = sc;
    $('stage').append(frame(sc));
    sc.arrive(word, QUICK);
    $('line').innerHTML = sentence(step.s, true);
    $('line').classList.add('on');
    for (const w of step.choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'w-choice';
      b.style.setProperty('--c', words[w].color);
      b.textContent = words[w].text;
      b.addEventListener('click', () => {
        if (busy || b.classList.contains('tried')) return;
        if (w !== word) return no(b);
        busy = true;
        b.classList.add('right');
        $('gap').outerHTML = wordSpan(word, 'w-word w-filled');
        sound.chime();
        for (const other of $('choices').children) if (other !== b) other.classList.add('away');
        later(() => say(clipOf.sentence(step.s), () => later(advance, AFTER)), 500);
      });
      $('choices').append(b);
    }
    const prompt = () => say(clipOf.ask(thing));
    $('head').onclick = prompt;
    $('again').onclick = prompt;
    later(prompt, 300);
  }

  /* A wrong answer: it wobbles, the soft buzzer (or a vibration), and it
     stays faded so the child narrows it down. */
  function no(node) {
    node.classList.remove('wobble');
    void node.getBoundingClientRect();
    node.classList.add('wobble', 'tried');
    sound.wrong();
  }

  /* Find: the sentence is said; two or three pictures, one of them right. */
  function findStep(step) {
    const [thing, word, place] = step.s;
    $('head').textContent = W.asks.which.text;
    $('line').innerHTML = sentence(step.s);
    $('line').classList.add('on');
    const stageBox = $('stage');
    for (const w of step.pictures) {
      const sc = scene(thing, w, place);
      const box = frame(sc);
      box.classList.add('w-pick');
      box.addEventListener('click', () => {
        if (busy || box.classList.contains('tried')) return;
        if (w !== word) return no(box);
        busy = true;
        box.classList.add('right');
        for (const other of stageBox.children) if (other !== box) other.classList.add('away');
        sound.chime();
        later(() => say(clipOf.sentence(step.s), () => later(advance, AFTER)), 500);
      });
      stageBox.append(box);
    }
    const prompt = () => say(clipOf.sentence(step.s));
    $('again').onclick = prompt;
    $('line').onclick = prompt;
    const first = !saidWhich;
    saidWhich = true;
    later(() => say(first ? [clipOf.which, clipOf.sentence(step.s)] : clipOf.sentence(step.s)), 300);
  }

  /* Put: the sentence is said; the thing waits at the side and the child
     drags it. Let go near a place, it settles there: the right one chimes,
     another buzzes and the thing goes back. */
  function putStep(step) {
    const [thing, word, place] = step.s;
    $('head').textContent = W.asks.put.text;
    $('line').innerHTML = sentence(step.s);
    $('line').classList.add('on');
    const sc = scene(thing, word, place, { hidden: true });
    current.scene = sc;
    const box = frame(sc);
    $('stage').append(box);
    const t = sc.size;
    const home = THINGS[thing].flies && thing !== 'bird'
      ? { x: 600 - 14 - t.w / 2, y: BASE - 70, layer: 'front' }
      : { x: 600 - 14 - t.w / 2, y: BASE + FRONT, layer: 'front' };
    sc.put(home.x, home.y, home.layer);
    sc.piece.classList.add('w-grab');
    const places = step.places.map((w) => ({ w, ...sc.spot(w) }));

    let hold = null;
    const point = (event) => {
      const m = sc.root.getScreenCTM();
      if (!m) return { x: 0, y: 0 };
      const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(m.inverse());
      return { x: p.x, y: p.y };
    };
    sc.piece.addEventListener('pointerdown', (event) => {
      if (busy || hold) return;
      event.preventDefault();
      sc.stop();
      const p = point(event);
      /* On glass the thing rides above the finger, so the finger does not hide it. */
      const lift = event.pointerType === 'touch' ? 46 : 0;
      hold = { id: event.pointerId, dx: sc.at.x - p.x, dy: sc.at.y - p.y - lift };
      sc.root.setPointerCapture(event.pointerId);
      sc.piece.classList.remove('w-grab');
      sc.piece.classList.add('w-held');
      sc.put(p.x + hold.dx, p.y + hold.dy, 'drag');
    });
    sc.root.addEventListener('pointermove', (event) => {
      if (!hold || event.pointerId !== hold.id) return;
      const p = point(event);
      sc.put(Math.max(0, Math.min(600, p.x + hold.dx)), Math.max(t.h, Math.min(400, p.y + hold.dy)));
    });
    const release = (event) => {
      if (!hold || event.pointerId !== hold.id) return;
      hold = null;
      sc.piece.classList.remove('w-held');
      const mid = { x: sc.at.x, y: sc.at.y - t.h / 2 };
      let near = null;
      for (const pl of places) {
        const d = Math.hypot(pl.x - mid.x, pl.y - t.h / 2 - mid.y);
        if (d < REACH && (!near || d < near.d)) near = { ...pl, d };
      }
      if (!near) return back();
      sc.put(sc.at.x, sc.at.y, near.layer);
      sc.go([{ x: near.x, y: near.y, ms: SNAP }], () => {
        if (near.w !== word) {
          sound.wrong();
          box.classList.remove('wobble');
          void box.getBoundingClientRect();
          box.classList.add('wobble');
          return later(back, 600);
        }
        busy = true;
        sound.chime();
        box.classList.add('right');
        later(() => say(clipOf.sentence(step.s), () => later(advance, AFTER)), 400);
      });
    };
    sc.root.addEventListener('pointerup', release);
    sc.root.addEventListener('pointercancel', release);
    function back() {
      sc.put(sc.at.x, sc.at.y, 'front');
      sc.go([{ x: home.x, y: home.y, ms: BACKHOME }], () => sc.piece.classList.add('w-grab'));
    }

    const prompt = () => say(clipOf.sentence(step.s));
    $('again').onclick = prompt;
    $('line').onclick = prompt;
    const first = !saidPut;
    saidPut = true;
    later(() => say(first ? [clipOf.put, clipOf.sentence(step.s)] : clipOf.sentence(step.s)), 300);
  }

  /* The end of a stage: «أحسنت» (the father's choice), its words, and the way on. */
  function finish() {
    current = null;
    if (!kept.done.includes(stage)) kept.done.push(stage);
    save();
    view('done');
    $('done-words').innerHTML = STAGES[stage].words.map((w) => wordSpan(w)).join('');
    const more = stage + 1 < STAGES.length;
    $('go-on').hidden = !more;
    $('go-on').onclick = () => begin(stage + 1);
    $('to-list').onclick = list;
    sound.chime();
    later(() => say('well-done'), 500);
  }

  addEventListener('resize', fit);
  load();
  list();

  if (LOCAL) {
    window.whereGame = {
      STAGES, THINGS, PLACES, scene, steps, questions,
      begin, list, advance,
      get plan() { return plan; },
      get index() { return index; },
      get step() { return current && current.step; },
      go(i) { index = i; play(); },
      reset() { kept = { v: 1, done: [] }; save(); list(); },
      /* put: the places on offer now, in the scene's lengths, the right one marked. */
      spots() {
        const step = current && current.step;
        if (!step || step.kind !== 'put') return [];
        return step.places.map((w) => ({ w, right: w === step.s[1], h: current.scene.size.h, ...current.scene.spot(w) }));
      },
    };
  }
})();
