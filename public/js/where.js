/* أَيْنَ؟, the words of where a thing is (فِي، عَلَى، تَحْتَ …), shown and then
   asked, the father's way: "Show that فِي means inside, then quiz him."

   Three stages, each a short run of steps, one dot each. A word is taught by
   showing it: a thing moves to its place by a landmark (the ball hops into
   the box), the word stands large in its own color, and the sentence shows
   by the picture and is said. Then the questions, of three kinds, over
   the words taught so far, the newest more often:
   - fill: the picture and its sentence with the word missing, under «أَيْنَ
     الْكُرَةُ؟»; he taps the word that fits. For a child who cannot read yet,
     the choices are read out after the question, each lit as it is said;
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
   sentences and their clips are in where-words.js.

   Two rules the father gave after trying it on his son's tablet (2026-11-25),
   which shape this file:

   A picture never covers a word. No picture is sized by a measurement taken
   at one moment (the first version did, and when the sentence appeared under
   a picture it was hidden behind it). Each picture is an svg that fills a
   box the page's own layout gives it (where.css) and fits itself inside
   through its viewBox, its rounded corners cut inside the svg, so whatever
   changes around it, the browser keeps it in its box. The one thing worked
   out here is how several pictures share their room (pack()), and that
   follows every change of size.

   Nothing in a picture depends on what some tablets get wrong: no CSS
   filter, animation or transform-box on anything inside an svg. The thing
   that waits to be dragged draws the eye with a halo whose size is set from
   here, tick by tick, and it waits well inside the picture, on a pale tray
   that shows it has not been put anywhere yet.

   Egyptian: the words on the screen are the words the voice says. Each
   step speaks one dialect. It is "said in Egyptian" when the switch is on
   Egyptian and its sentence's Egyptian recording exists (sound.masri). Then
   its texts are the Egyptian ones of where-words.js (the father, 2026-11-26:
   the speaker marks that stood in for the Fusha could not be told apart, so
   "show Egyptian text"), each in the dialect its own recording is heard in.
   Any other step is all Fusha, text and voice: a word's Egyptian recording
   is not played beside a sentence that is read in Fusha. dress() draws the
   texts of a step from what is known, again whenever the switch is flipped,
   and speak() chooses the recording by the same rule.

   The arrows go back and forth through a stage's steps (the father,
   2026-11-26); the round button between them plays the step again: a play
   mark where it moves the thing again (a show step), a speaker where it only
   says the question again. */
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
  const SHIFT = 30; // put: the landmarks stand this much to the left, clear of where the thing waits
  const STILL = 14; // put: a finger that has not moved this far has not dragged the thing anywhere
  const EDGE = { right: 24, bottom: 32, held: 6 }; // put: the room between the waiting thing and the picture's edge; and while it is dragged
  const RIDE = 46; // put: on glass the thing rides this far above the finger
  const CARD = { pad: 8, round: 22 }; // the picture card: the room around it for its shadow and ring, and its corners
  const RATIO = (600 + 2 * CARD.pad) / (400 + 2 * CARD.pad); // a scene's shape, its room included
  const GAP = 12; // between pictures, in page pixels (where.css)

  /* Milliseconds. */
  const MOVE = 1300; // a thing going to its place while a word is shown
  const QUICK = 650; // the same at the start of a question
  const SNAP = 220; // a thing let go, settling in a place
  const BACKHOME = 450; // a thing going back to where it waits
  const AFTER = 900; // a right answer: after the sentence, before the next step
  const PATIENCE = 7000; // the longest wait for a recording to end
  const QUIET = 1400; // how long a recording is waited for while it is not known whether it exists
  const NONE = 300; // the pause in place of a recording known not to exist
  const WRONG = 600; // put: a thing let go in a wrong place stays there this long, then goes back
  const PICTURES = 4000; // the longest a step waits for a picture file that has not come
  const UNSURE = 2500; // the longest a text waits, unseen, to learn whether its Egyptian recording exists
  const BEAT = 1600; // the halo of a waiting thing: one swell

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
     here, its size, and the words it makes a sensible picture with. A drawn
     thing says how far its ink really reaches from the middle of its foot
     (the cat's tail, its ears), so that all of it is kept inside a picture. */
  const THINGS = {
    ball: { img: 'ball', w: 66, h: 66, can: 'in on under front behind beside between' },
    apple: { img: 'apple-red', w: 54, h: 67, can: 'in on under front behind beside between' },
    gift: { img: 'gift', w: 70, h: 68, can: 'in on under front behind beside between' },
    car: { img: 'car-red', w: 124, h: 69, toy: 0.7, can: 'in on under front behind beside between' },
    cat: { draw: cat, w: 72, h: 86, ink: { l: 36, r: 57, top: 97 }, can: 'in on under front behind beside between' },
    bird: { draw: bird, w: 56, h: 44, ink: { l: 36, r: 33, top: 50 }, flies: true, can: 'on above under beside' },
    balloon: { img: 'balloon-red', w: 46, h: 114, flies: true, can: 'above beside' },
    plane: { img: 'plane', w: 133, h: 62, flies: true, can: 'above' },
  };

  /* A thing's size in a scene: a car indoors is a toy. With how far it
     reaches left, right and up from the middle of its foot. */
  function size(thing, place) {
    const t = THINGS[thing];
    const scale = t.toy && !PLACES[place].yard ? t.toy : 1;
    const ink = t.ink || { l: t.w / 2, r: t.w / 2, top: t.h };
    return { w: t.w * scale, h: t.h * scale, l: ink.l * scale, r: ink.r * scale, top: ink.top * scale };
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
  /* href is said twice: an iPad older than iOS 12.2 reads only the xlink one. */
  const clip = (name, w, h) => `<image data-clip="${name}" href="sheets/img/${name}.png" xlink:href="sheets/img/${name}.png" x="${-w / 2}" y="${-h}" width="${w}" height="${h}"/>`;

  /* The books' pictures are asked for as the page opens, so that none is
     still on its way when its scene is drawn: a thing whose file had not
     come would be a hole in the picture. A file that fails is asked for
     again, a little later each time, and the scenes that wait for it draw
     it when it comes. Each is a Promise that it is there (true when it took
     more than one asking). */
  const clips = new Map();
  const held = []; // the loaded pictures are kept, so that a scene's own copy needs no second fetch or decoding
  function fetched(name) {
    if (!clips.has(name)) {
      clips.set(name, new Promise((there) => {
        let tries = 0;
        const ask = () => {
          const img = new Image();
          img.onload = () => {
            held.push(img);
            there(tries > 0);
          };
          img.onerror = () => {
            tries++;
            setTimeout(ask, Math.min(8000, 700 * tries));
          };
          img.src = `sheets/img/${name}.png`;
        };
        ask();
      }));
    }
    return clips.get(name);
  }

  /* The landmarks: their back and front, drawn with the middle of their foot
     at 0,0, and where a thing of size t stands for each word, from that
     point (y up is negative) and in which layer.

     No landmark has a place both for «تَحْتَ» and for «أَمَامَ»: seen from the
     front, a thing under a chair or a tree and a thing in front of it are
     the same picture, and a child asked to tell them apart got the buzzer
     for a right answer. A chair and a tree have «تَحْتَ», a box, a basket and
     a house «أَمَامَ» (tools/test-where.js holds this). */
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
        /* Under the seat and between the legs, which are drawn over it. */
        under: () => ({ x: 0, y: 0, layer: 'back' }),
        above: () => ({ x: 0, y: -262 }),
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

  /* What is behind everything: a yard under the sky, or a room. */
  function backdrop(yard, id) {
    if (yard) {
      return `<rect width="600" height="400" fill="url(#${id}-sky)"/>
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

  /* For trying the game by hand and by script (tools/test-where.js): time
     runs pace times as long, and freeze holds the waiting thing's halo still. */
  const debug = { pace: 1, freeze: false };
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scenes = 0;

  /* One scene: the landmark, or two of it for «بَيْنَ», and the thing.
     Returns the svg and what moves the thing about.

     The svg fills whatever box it is given and fits the card inside it (its
     viewBox, with a little room around the card for its shadow and its gold
     ring). The card's rounded corners are a clip inside the svg, and so are
     its shadow and ring: nothing of the picture is a CSS box that could be
     the wrong size. Every id is the scene's own, as several scenes share a
     page. */
  function scene(thing, word, place, { pair = word === 'between', hidden = false, shift = 0 } = {}) {
    const p = PLACES[place];
    const id = `w-s${++scenes}`;
    const { pad, round } = CARD;
    const root = svg('svg', { viewBox: `${-pad} ${-pad} ${600 + 2 * pad} ${400 + 2 * pad}`, preserveAspectRatio: 'xMidYMid meet', class: 'w-scene', 'aria-hidden': 'true', focusable: 'false' });
    const xs = (pair ? PAIR : [AT]).map((x) => x - shift);
    const middle = pair ? (xs[0] + xs[1]) / 2 : 300 - shift; // where «بَيْنَ» is
    const lands = (part) => xs.map((x) => `<g transform="translate(${x} ${BASE})">${p[part]()}</g>`).join('');
    root.innerHTML = `<defs>
        <clipPath id="${id}-card"><rect width="600" height="400" rx="${round}"/></clipPath>
        <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CC4EA"/><stop offset="1" stop-color="#E4F1F8"/></linearGradient>
        <radialGradient id="${id}-glow"><stop offset=".3" stop-color="#F2B84B" stop-opacity=".9"/><stop offset="1" stop-color="#F2B84B" stop-opacity="0"/></radialGradient>
      </defs>
      <rect x="1" y="5" width="598" height="400" rx="${round}" fill="#4A3424" fill-opacity=".06"/>
      <rect y="2" width="600" height="400" rx="${round}" fill="#4A3424" fill-opacity=".08"/>
      <g clip-path="url(#${id}-card)">${backdrop(p.yard, id)}<rect data-tray="" rx="20" fill="#FFFFFF" fill-opacity=".6" stroke="#4A3424" stroke-opacity=".3" stroke-width="2.5" stroke-dasharray="1 9" stroke-linecap="round" visibility="hidden"/><g data-layer="back"></g><g>${lands('back')}</g><g data-layer="mid"></g><g>${lands('front')}</g><g data-layer="front"></g><g data-layer="drag"></g></g>
      <rect data-ring="" x="3.5" y="3.5" width="593" height="393" rx="${round - 3.5}" fill="none" stroke="#F2B84B" stroke-width="7" visibility="hidden"/>`;
    const t = size(thing, place);
    const art = THINGS[thing];
    const reach = Math.max(t.w, t.h) * 0.62 + 16;
    /* The thing: a halo for when it waits to be dragged, then its drawing. */
    const piece = svg('g', { class: 'w-thing' });
    piece.innerHTML = `<circle data-halo="" cy="${-t.h / 2}" r="${reach}" fill="url(#${id}-glow)" visibility="hidden"/><g data-art="">${art.img ? clip(art.img, t.w, t.h) : art.draw(word)}</g>`;
    const halo = piece.firstElementChild;
    const drawing = piece.lastElementChild;
    if (!art.img) drawing.firstElementChild.setAttribute('transform', `scale(${t.w / art.w})`);
    const layer = (name) => root.querySelector(`[data-layer="${name}"]`);
    /* The scene's pictures from the books: ready when all are there. An
       svg gives up on a picture whose file fails, so one that came to the
       page only at a second asking is put into the scene anew; and so is one
       whose own request fails though the page has the file (the network
       gone for a moment with nothing saved): again a little later each
       time, while the scene is on the page. */
    let ended = false;
    function renew(slot) {
      const fresh = slot.node.cloneNode();
      if (slot.node.parentNode) slot.node.parentNode.replaceChild(fresh, slot.node);
      slot.node = fresh;
      fresh.addEventListener('error', () => again(slot));
    }
    function again(slot) {
      if (ended || slot.tries >= 12) return;
      slot.tries++;
      setTimeout(() => { if (!ended) renew(slot); }, Math.min(8000, 700 * slot.tries));
    }
    const ready = Promise.all([...root.querySelectorAll('image'), ...piece.querySelectorAll('image')].map((node) => {
      const slot = { node, tries: 0 };
      node.addEventListener('error', () => again(slot));
      return fetched(node.getAttribute('data-clip')).then((late) => { if (late && !ended) renew(slot); });
    }));

    /* Where the thing stands for a word, in this scene's layout: always
       whole inside the picture (beside the first of two trees, a car would
       stand half outside it). */
    function spot(w, side = -1) {
      const s = w === 'between' ? { x: middle - xs[0], y: art.flies ? -150 : 0 } : p.spots[w](t);
      const x = xs[0] + (side > 0 ? -s.x : s.x); // «بِجَانِبِ» is drawn on the left; its other side is as true
      return {
        x: Math.max(t.l + EDGE.held, Math.min(600 - t.r - EDGE.held, x)),
        y: Math.max(t.top + 4, Math.min(396, BASE + s.y)),
        layer: s.layer || 'mid',
      };
    }

    /* The thing's place is an attribute, written from here: its foot at x, y,
       a little larger while its halo swells. */
    const at = { x: 0, y: 0 };
    let grow = 1;
    function move() {
      piece.setAttribute('transform', `translate(${at.x.toFixed(1)} ${at.y.toFixed(1)})${grow === 1 ? '' : ` scale(${grow.toFixed(3)})`}`);
    }
    function put(x, y, name) {
      at.x = x;
      at.y = y;
      move();
      if (name && piece.parentNode !== layer(name)) layer(name).append(piece);
    }

    /* Moves the thing along legs of { x, y, ms, lift }, each a straight line
       with a hop of lift above it, and calls done at the end. Runs on the
       animation frames, with a timer that finishes it if they stall (a
       hidden page has none). */
    let run = 0;
    function go(path, done) {
      const mine = ++run;
      const legs = path.map((l) => ({ ...l, ms: Math.max(1, l.ms * debug.pace) }));
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
        const k = Math.max(0, Math.min(1, (now - start) / l.ms));
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
      const near = xs[0] + (fromLeft ? -1 : 1) * (p.half + t.w / 2 + 12);
      const lift = floor - s.y + 50;
      go([{ x: near, y: floor, ms: ms * 0.55 }, { x: s.x, y: s.y, ms: ms * 0.45, lift: lift / 2 + 40 }], done);
    }

    function show(w) {
      const s = spot(w);
      put(s.x, s.y, s.layer);
    }

    /* The thing waiting to be dragged draws the eye: a gold halo behind it
       swells and fades, and the thing grows a little with it. Written into
       attributes on a timer: a CSS animation of a filter on this group is
       the kind of thing some tablets lose a picture over. */
    let beat = 0;
    function waiting(on) {
      clearInterval(beat);
      beat = 0;
      halo.setAttribute('visibility', on ? 'visible' : 'hidden');
      grow = 1;
      if (!on) return move();
      const began = performance.now();
      const tick = () => {
        const k = calm || debug.freeze ? 0.5 : (1 - Math.cos(((performance.now() - began) / BEAT) * 2 * Math.PI)) / 2;
        halo.setAttribute('r', (reach * (0.8 + 0.3 * k)).toFixed(1));
        halo.setAttribute('opacity', (0.45 + 0.55 * k).toFixed(2));
        grow = 1 + 0.05 * k;
        move();
      };
      tick();
      if (!calm) beat = setInterval(tick, 50);
    }

    /* The tray the thing waits on in a put step: a pale card on the floor at
       the side, under everything, so that the thing is seen to be waiting
       there and not already put somewhere (a car that waited by the house
       looked as if it was beside it already). Given the thing's foot. */
    function tray(x, y) {
      const card = root.querySelector('[data-tray]');
      if (x === undefined) return card.setAttribute('visibility', 'hidden');
      const box = { x: x - t.l - 14, y: y - t.top - 12, width: t.l + t.r + 28, height: t.top + 26 };
      for (const [key, value] of Object.entries(box)) card.setAttribute(key, value.toFixed(1));
      card.setAttribute('visibility', 'visible');
    }

    /* A wide, unseen handle over the thing, so that a small finger takes it. */
    function grip() {
      const w = Math.max(t.w + 44, 110);
      const h = Math.max(t.h + 44, 110);
      piece.append(svg('rect', { x: -w / 2, y: -t.h / 2 - h / 2, width: w, height: h, rx: 18, fill: '#000', 'fill-opacity': 0 }));
      piece.style.cursor = 'grab';
    }

    /* A point of the page in the scene's lengths; null while the svg has no size. */
    function point(event) {
      const m = root.getScreenCTM();
      if (!m) return null;
      const q = root.createSVGPoint();
      q.x = event.clientX;
      q.y = event.clientY;
      const r = q.matrixTransform(m.inverse());
      return { x: r.x, y: r.y };
    }
    /* Whether a tap is on the card itself: the svg's box may be wider or taller than it. */
    function inside(event) {
      const q = point(event);
      return Boolean(q) && q.x >= 0 && q.x <= 600 && q.y >= 0 && q.y <= 400;
    }
    const ring = (on) => root.querySelector('[data-ring]').setAttribute('visibility', on ? 'visible' : 'hidden');
    root.addEventListener('contextmenu', (event) => event.preventDefault());

    if (!hidden) show(word);
    return {
      root, piece, word, spot, put, go, arrive, show, at, size: t, layer, waiting, tray, grip, point, inside, ring, ready,
      stop: () => run++,
      end: () => { run++; ended = true; clearInterval(beat); },
    };
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

  for (const name of [...Object.values(THINGS).map((t) => t.img).filter(Boolean), 'tree', 'house']) fetched(name);

  /* A device that still holds the page as it was before 2026-11-25 (the
     offline copy is renewed file by file) has no room around the pictures:
     it is made here, so that this file works with either page. */
  if (!$('room') && $('stage')) {
    const room = document.createElement('div');
    room.className = 'w-room';
    room.id = 'room';
    const grid = $('stage');
    grid.replaceWith(room);
    room.append(grid);
  }

  const clipOf = W.clip;
  const words = W.words;

  /* Everything the game can say is told to sound.js as the page opens, so
     that the dialect switch app.js puts on the page (once something here is
     recorded in both dialects) is there from the first screen. */
  if (typeof sound.uses === 'function') {
    sound.uses([...W.sentences.map(clipOf.sentence), ...Object.keys(words).map(clipOf.word), ...Object.keys(W.things).map(clipOf.ask), clipOf.which, clipOf.put]);
  }

  let kept = null;
  let stage = 0;
  let plan = [];
  let index = 0;
  let screen = 'list'; // the view that shows: list, play or done
  let current = null; // the step on the screen: { step, scenes, shown, answered }
  let busy = false; // a right answer is being said: no more taps
  let saidWhich = false;
  let saidPut = false;
  const timers = new Set();

  function later(run, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      run();
    }, ms * debug.pace);
    timers.add(id);
    return id;
  }

  function forget() {
    for (const id of timers) clearTimeout(id);
    timers.clear();
    if (current) for (const sc of current.scenes) sc.end();
  }

  /* ---------- what is heard, and so what may be read ---------- */

  /* A screen speaks one dialect. A step is said in Egyptian when the switch
     is on Egyptian and its sentence's Egyptian recording exists: then every
     clip of the step plays in Egyptian where that is recorded (in Fusha
     where it is not), and no Fusha text is on its screen. Any other step is
     a Fusha screen: Fusha text, and only Fusha recordings, even for a word
     whose Egyptian recording exists, so that the voice never says «قدّام»
     beside a sentence that reads «أَمَامَ». The list of stages and the end of
     a stage go word by word.

     For each clip asked about: whether its Egyptian recording exists (always
     false while the switch is on Fusha) and whether its Fusha one does.
     Asked of sound.js, which fetches the recording; kept until the switch is
     flipped. */
  const egyptian = new Map();
  const fusha = new Map();
  const asked = new Map(); // a clip's questions, each put once: { masri, voice }
  const sentenceClips = new Set(W.sentences.map(W.clip.sentence));
  let flips = 0; // answers to questions asked before the switch was flipped are dropped
  let learning = Promise.resolve();
  let sureBy = 0; // until then, a text whose answer has not come yet waits unseen

  const masriOn = () => sound.dialect() === 'masri';
  const isEgyptian = (name) => masriOn() && egyptian.get(name) === true;
  const unsure = (names) => masriOn() && Date.now() < sureBy && names.some((name) => !egyptian.has(name));
  /* The step on the screen is said in Egyptian. */
  const stepSaid = () => Boolean(current) && isEgyptian(W.clip.sentence(current.step.s));
  /* A clip plays in Egyptian now: on an Egyptian step, or in a list of words. */
  const inEgyptian = (name) => isEgyptian(name) && (!current || stepSaid());
  /* Whether a clip will be heard, and whether that is known yet. */
  const heard = (name) => inEgyptian(name) || fusha.get(name) === true;
  const known = (name) => inEgyptian(name) || fusha.has(name);

  /* Learns about clips (and so loads them ahead of the tap), then draws the
     screen again from what is known. Whether the Egyptian recording exists
     is learned first, as that is what a text waits for; with voices false
     nothing more is asked. A sentence that has its Egyptian recording never
     plays in Fusha, so its Fusha one is not fetched. */
  function learn(names, { voices = true } = {}) {
    const mine = flips;
    const jobs = [];
    for (const name of new Set(names)) {
      let q = asked.get(name);
      if (!q) {
        q = {
          voice: null,
          masri: Promise.resolve().then(() => sound.masri(name)).catch(() => false).then((masri) => {
            if (mine === flips) {
              egyptian.set(name, Boolean(masri));
              if (sentenceClips.has(name) && current && clipOf.sentence(current.step.s) === name) refresh();
            }
            return Boolean(masri);
          }),
        };
        asked.set(name, q);
      }
      if (voices && !q.voice) {
        q.voice = q.masri
          .then((masri) => (masri && sentenceClips.has(name) ? false : Promise.resolve(sound.buffer(name)).then(Boolean, () => false)))
          .then((there) => { if (mine === flips) fusha.set(name, there); });
      }
      jobs.push(voices ? q.voice : q.masri);
    }
    if (!jobs.length) return Promise.resolve();
    const job = Promise.all(jobs).then(() => { if (mine === flips) refresh(); });
    learning = Promise.all([learning, job]).then(() => {});
    return job;
  }

  /* A text that waits unseen for its answer is shown after UNSURE at the
     latest: a slow network must not leave the screen empty. */
  let unsureTimer = 0;
  function wonder() {
    sureBy = Date.now() + UNSURE;
    clearTimeout(unsureTimer);
    if (masriOn()) unsureTimer = setTimeout(refresh, UNSURE + 40);
  }

  /* A spoken prompt, in the dialect of the screen it is said on. While it is
     not yet known whether the step is said in Egyptian, the voice waits for
     that as the text does. When it is known that a clip has no Egyptian
     recording, the Fusha one is asked for directly, with no wait for the one
     that is not there. */
  let speech = 0;
  function speak(name) {
    if (!masriOn()) return sound.play(name);
    if (!current) return isEgyptian(name) ? sound.say(name) : sound.play(name);
    const sentence = clipOf.sentence(current.step.s);
    if (egyptian.has(sentence)) return stepSaid() && egyptian.get(name) !== false ? sound.say(name) : sound.play(name);
    const mine = current;
    const voice = speech;
    return learn([sentence, name], { voices: false }).then(() => (current === mine && voice === speech ? speak(name) : undefined));
  }

  /* Says clips one after another and then calls done: each clip as long as
     it lasts, a missing one a short pause (a longer one while it is not
     known to be missing), never longer than PATIENCE in all. Only the
     latest call ever calls its done. */
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
      Promise.resolve(speak(list[i])).then(() => {
        clearTimeout(fallback);
        timers.delete(fallback);
        if (mine !== speech) return;
        const sure = known(list[i]);
        const spoken = sure ? heard(list[i]) : Date.now() - started > 250;
        later(() => next(i + 1), spoken ? 120 : sure ? NONE : QUIET);
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
    screen = name;
    for (const v of ['list', 'play', 'done']) $(`view-${v}`).hidden = v !== name;
  }

  /* ---------- the texts ---------- */

  /* Writes an element's inside only when it changes, so that drawing a
     screen again (an answer learned, the switch flipped) starts nothing over. */
  const written = new WeakMap();
  function write(el, html) {
    if (written.get(el) === html) return;
    written.set(el, html);
    el.innerHTML = html;
  }

  /* A word of place in its color, in Fusha or (eg) in Egyptian. */
  const wordSpan = (w, cls = 'w-word', eg = false) => `<span class="${cls}" style="--c:${words[w].color}"${eg ? ' lang="arz"' : ''}>${eg ? words[w].masri : words[w].text}</span>`;
  /* A word of place in a list of words, in the dialect its recording is heard in. */
  const chip = (w) => `<span data-w="${w}">${wordSpan(w, 'w-word', inEgyptian(clipOf.word(w)))}</span>`;
  const GAPMARK = '<span class="w-gap"></span>';

  /* The sentence by a picture, with something in the word's place, in Fusha
     or (eg) in Egyptian. */
  function sentence(s, middle, eg = false) {
    const [thing, word, place] = s;
    const p = W.places[place];
    const where = word === 'between' ? (eg ? p.masriTwo : p.two) : eg ? p.masri : p.text;
    return `<span>${eg ? W.things[thing].masri : W.things[thing].text}</span> ${middle} <span>${where}</span>`;
  }

  const headClip = (step) => ({ show: clipOf.word(step.s[1]), fill: clipOf.ask(step.s[0]), find: clipOf.which, put: clipOf.put })[step.kind];
  const namesOf = (step) => [clipOf.sentence(step.s), clipOf.word(step.s[1]), headClip(step), ...(step.choices || []).map(clipOf.word)];
  const wordClips = Object.keys(words).map(clipOf.word);

  /* The texts of the step on the screen, from what is known now: the head,
     the sentence and the words to choose. Called again whenever something is
     learned, the step moves on (the sentence shown, the gap filled) or the
     switch is flipped.

     said: the step is said in Egyptian, so its sentence shows in Egyptian,
     and every other text in the dialect its own recording is heard in
     (inEgyptian): the large word, the question, a choice. Otherwise
     everything reads as in Fusha, and speak() plays only Fusha. */
  function dress() {
    const { step } = current;
    const [thing, word] = step.s;
    const said = stepSaid();
    $('view-play').classList.toggle('w-hold', unsure([clipOf.sentence(step.s)]));

    let head;
    if (step.kind === 'show') head = wordSpan(word, 'w-word w-big', inEgyptian(clipOf.word(word)));
    else if (step.kind === 'fill') head = inEgyptian(clipOf.ask(thing)) ? `<span lang="arz">${W.where.masri} ${W.things[thing].masri}؟</span>` : `${W.where.text} ${W.things[thing].text}؟`;
    else {
      const ask = step.kind === 'find' ? W.asks.which : W.asks.put;
      head = inEgyptian(step.kind === 'find' ? clipOf.which : clipOf.put) ? `<span lang="arz">${ask.masri}</span>` : ask.text;
    }
    write($('head'), head);

    let line = '';
    if (step.kind === 'fill') line = sentence(step.s, current.answered ? wordSpan(word, 'w-word w-filled', said) : GAPMARK, said);
    else if (step.kind !== 'show' || current.shown) line = sentence(step.s, wordSpan(word, 'w-word', said), said);
    write($('line'), line);
    $('line').classList.toggle('on', Boolean(line));
    if (said) $('line').setAttribute('lang', 'arz');
    else $('line').removeAttribute('lang');

    for (const b of $('choices').children) {
      const eg = inEgyptian(clipOf.word(b.dataset.w));
      write(b, `<span${eg ? ' lang="arz"' : ''}>${eg ? words[b.dataset.w].masri : words[b.dataset.w].text}</span>`);
    }
  }

  /* Whatever shows is drawn again from what is known now. */
  function refresh() {
    if (screen === 'list') drawList();
    else if (screen === 'done') drawDone();
    else if (current) dress();
  }

  /* The switch in the ☰ menu was flipped: everything learned is for the other
     dialect. The screen changes at once (to Fusha, the texts are back; to
     Egyptian, they wait unseen for the answers, which come in a moment). */
  addEventListener('dialectchange', () => {
    flips++;
    egyptian.clear();
    fusha.clear();
    asked.clear();
    wonder();
    refresh();
    if (screen === 'play' && current) learnStage(current.step);
    else ahead();
  });

  /* What the texts on the screen wait for is asked first, by itself (a
     browser sends only a few requests at a time, and on a slow line the
     rest would stand in its way); then the rest.

     On a list of words, in Egyptian: the words' recordings, then which
     sentences have theirs, a few at a time in the order they are taught, so
     that no step's texts need wait for that and a stage that is begun
     meanwhile is not kept waiting behind them. */
  function ahead() {
    if (!masriOn()) return;
    const mine = flips;
    const sentences = [...sentenceClips];
    const some = (from) => {
      if (mine !== flips) return;
      if (from >= sentences.length) return learn(wordClips);
      learn(sentences.slice(from, from + 4), { voices: false }).then(() => some(from + 4));
    };
    learn(wordClips, { voices: false }).then(() => some(0));
  }

  /* In a stage: the sentence of the step that shows, then everything the
     stage says. */
  function learnStage(step) {
    const rest = [...plan.flatMap(namesOf), clipOf.which, clipOf.put];
    if (!masriOn() || !step) return learn(rest);
    const mine = flips;
    return learn([clipOf.sentence(step.s)], { voices: false }).then(() => (mine === flips ? learn(rest) : undefined));
  }

  /* ---------- the list of stages ---------- */

  function list() {
    forget();
    hush();
    current = null;
    view('list');
    wonder();
    drawList();
    ahead();
  }

  function drawList() {
    const nav = $('stages');
    nav.classList.toggle('w-hold', unsure(wordClips));
    const next = STAGES.findIndex((_, i) => !kept.done.includes(i));
    write(nav, STAGES.map((st, i) => `<button type="button" class="w-stage-card${kept.done.includes(i) ? ' done' : ''}${i === next ? ' invite' : ''}" data-stage="${i}"><span class="w-stage-words">${st.words.map(chip).join('')}</span></button>`).join(''));
  }

  $('stages').addEventListener('click', (event) => {
    const card = event.target.closest('.w-stage-card');
    if (card) begin(Number(card.dataset.stage));
  });

  /* ---------- playing a stage ---------- */

  function begin(n) {
    stage = n;
    plan = steps(n);
    index = 0;
    saidWhich = false;
    saidPut = false;
    learnStage(plan[0]);
    sound.preloadPrompts(['well-done']);
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
    current = { step, scenes: [], shown: false, answered: false };
    $('view-play').dataset.kind = step.kind;
    write($('head'), '');
    write($('line'), '');
    $('choices').textContent = '';
    $('stage').textContent = '';
    $('head').onclick = null;
    $('line').onclick = null;
    $('again').onclick = null;
    // A play mark where the button moves the thing again, a speaker where it only says.
    write($('again'), step.kind === 'show' ? PLAY_MARK : SPEAKER_MARK);
    $('again').setAttribute('aria-label', step.kind === 'show' ? 'أَعِدْ' : 'اِسْتَمِعْ');
    // Back and forth through the steps, at any time (the father, 2026-11-26).
    $('back').hidden = index === 0;
    $('next').hidden = false;
    $('next').onclick = advance;
    $('next').classList.remove('call');
    ({ show: showStep, fill: fillStep, find: findStep, put: putStep })[step.kind](step);
    wonder();
    dress();
    pack();
    learn(namesOf(step));
  }

  function advance() {
    index++;
    play();
  }

  function retreat() {
    if (index <= 0) return;
    index--;
    play();
  }
  $('back').addEventListener('click', retreat);

  const PLAY_MARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6L19.2 12z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const SPEAKER_MARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.3 6a8.6 8.6 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  /* Runs once a scene's pictures are there, or after PICTURES at the latest
     (the thing then moves unseen and shows when its file comes). */
  function whenDrawn(sc, run) {
    const mine = current;
    let done = false;
    const go = () => {
      if (done || current !== mine) return;
      done = true;
      run();
    };
    sc.ready.then(go);
    later(go, PICTURES);
  }

  /* A box for one scene: the page gives it its size (where.css) and the
     scene fits itself inside. */
  function frame(sc) {
    const box = document.createElement('div');
    box.className = 'w-frame';
    box.append(sc.root);
    current.scenes.push(sc);
    return box;
  }

  /* How several pictures share their room: in the number of columns that
     makes each largest, the last row centered, and drawn close together.
     One picture needs none of this: its box is the room. Whatever is
     written here only says how the room is divided; a picture cannot leave
     the room for it, whatever its size, so a measurement that is out of
     date for a moment can make pictures a little small, never cover a word.
     It is worked out again whenever the room changes its size. */
  function pack() {
    const room = $('room');
    const grid = $('stage');
    const frames = [...grid.children];
    const n = frames.length;
    room.dataset.n = n;
    if (n < 2) {
      grid.style.gridTemplateColumns = '';
      grid.style.maxWidth = '';
      grid.style.maxHeight = '';
      if (n) frames[0].style.gridColumn = '';
      return;
    }
    const width = room.clientWidth;
    const height = room.clientHeight;
    if (!width || !height) return;
    let best = null;
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const w = Math.min((width - GAP * (cols - 1)) / cols, ((height - GAP * (rows - 1)) / rows) * RATIO);
      if (!best || w > best.w + 0.5) best = { cols, rows, w: Math.max(1, w) };
    }
    const { cols, rows, w } = best;
    /* Each picture spans two of twice as many columns, so a last row with
       fewer pictures can stand in the middle. */
    grid.style.gridTemplateColumns = `repeat(${2 * cols}, minmax(0, 1fr))`;
    grid.style.maxWidth = `${Math.ceil(cols * w + GAP * (cols - 1))}px`;
    grid.style.maxHeight = `${Math.ceil((rows * w) / RATIO + GAP * (rows - 1))}px`;
    const last = n % cols;
    frames.forEach((box, i) => {
      box.style.gridColumn = last && i === n - last ? `${1 + cols - last} / span 2` : 'span 2';
    });
  }

  /* Show: the word large in its color, the thing going to its place, then
     the sentence, shown and said. The next arrow breathes when it is said. */
  function showStep(step) {
    const [thing, word, place] = step.s;
    const mine = current;
    const sc = scene(thing, word, place, { hidden: true });
    const box = frame(sc);
    $('stage').append(box);
    const tell = () => say(clipOf.sentence(step.s), () => $('next').classList.add('call'));
    const run = () => {
      hush();
      mine.shown = false;
      dress();
      $('next').classList.remove('call');
      sc.arrive(word, MOVE, () => {
        mine.shown = true;
        dress();
        tell();
      });
    };
    box.addEventListener('click', (event) => { if (sc.inside(event)) run(); });
    $('again').onclick = run;
    $('head').onclick = () => say(clipOf.word(word));
    $('line').onclick = () => { if (mine.shown) tell(); };
    whenDrawn(sc, () => later(run, 350));
  }

  /* Fill: «أَيْنَ الْكُرَةُ؟», the picture, its sentence with the word missing,
     and the words in play to choose from. For a child who cannot read yet:
     after the question is said, each choice lights and is said in turn. A
     tap on a choice at any time stops that, says the word and answers. A
     clip that is not recorded is passed over with no wait, so with nothing
     recorded the choices are simply there. */
  function fillStep(step) {
    const [thing, word, place] = step.s;
    const mine = current;
    const sc = scene(thing, word, place, { hidden: true });
    $('stage').append(frame(sc));
    whenDrawn(sc, () => sc.arrive(word, QUICK));
    const buttons = [];
    const unlight = () => buttons.forEach((b) => b.classList.remove('w-lit'));
    for (const w of step.choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'w-choice';
      b.dataset.w = w;
      b.style.setProperty('--c', words[w].color);
      b.addEventListener('click', () => {
        if (busy || b.classList.contains('tried')) return;
        hush();
        unlight();
        const name = clipOf.word(w);
        if (w !== word) {
          speak(name);
          return no(b);
        }
        busy = true;
        b.classList.add('right');
        mine.answered = true;
        dress();
        sound.chime();
        for (const other of buttons) if (other !== b) other.classList.add('away');
        const on = () => later(advance, AFTER);
        if (heard(name)) say([name, clipOf.sentence(step.s)], on);
        else later(() => say(clipOf.sentence(step.s), on), 500);
      });
      buttons.push(b);
      $('choices').append(b);
    }
    const readOut = () => {
      const voice = speech;
      const next = (i) => {
        unlight();
        if (voice !== speech || busy || i >= buttons.length) return;
        const name = clipOf.word(step.choices[i]);
        if (!heard(name) || buttons[i].classList.contains('tried')) return next(i + 1);
        buttons[i].classList.add('w-lit');
        Promise.resolve(speak(name)).then(() => { if (voice === speech) later(() => next(i + 1), 180); });
      };
      next(0);
    };
    const prompt = () => {
      hush();
      unlight();
      const voice = speech;
      learn(namesOf(step)).then(() => {
        if (voice !== speech || current !== mine) return;
        if (heard(clipOf.ask(thing))) say(clipOf.ask(thing), readOut);
        else readOut();
      });
    };
    $('head').onclick = prompt;
    $('again').onclick = prompt;
    later(prompt, 300);
  }

  /* A wrong answer: it wobbles, the soft buzzer (or a vibration), and it
     stays faded so the child narrows it down. */
  function no(node) {
    node.classList.remove('w-wobble');
    void node.getBoundingClientRect();
    node.classList.add('w-wobble', 'tried');
    sound.wrong();
  }

  /* Find: the sentence is said; two or three pictures, one of them right. */
  function findStep(step) {
    const [thing, word, place] = step.s;
    const grid = $('stage');
    for (const w of step.pictures) {
      const sc = scene(thing, w, place);
      const box = frame(sc);
      box.classList.add('w-pick');
      box.addEventListener('click', (event) => {
        if (busy || box.classList.contains('tried') || !sc.inside(event)) return;
        if (w !== word) return no(box);
        busy = true;
        box.classList.add('right');
        sc.ring(true);
        for (const other of grid.children) if (other !== box) other.classList.add('away');
        sound.chime();
        later(() => say(clipOf.sentence(step.s), () => later(advance, AFTER)), 500);
      });
      grid.append(box);
    }
    const prompt = () => say(clipOf.sentence(step.s));
    $('again').onclick = prompt;
    $('line').onclick = prompt;
    const first = !saidWhich;
    saidWhich = true;
    later(() => say(first ? [clipOf.which, clipOf.sentence(step.s)] : clipOf.sentence(step.s)), 300);
  }

  /* Put: the sentence is said; the thing waits on its tray at the side,
     whole and well inside the picture, a halo breathing behind it, and the
     child drags it. It cannot leave the picture. Let go near a place, it
     settles there: the right one chimes, another buzzes and the thing goes
     back; let go nowhere, or touched without being moved, it goes back.
     «بِجَانِبِ» is right on either side of the landmark. The landmarks stand
     a little to the left here, clear of the tray. */
  function putStep(step) {
    const [thing, word, place] = step.s;
    const sc = scene(thing, word, place, { hidden: true, shift: SHIFT });
    const box = frame(sc);
    $('stage').append(box);
    const t = sc.size;
    const home = { x: 600 - EDGE.right - t.r, y: 400 - EDGE.bottom, layer: 'front' };
    sc.tray(home.x, home.y);
    sc.put(home.x, home.y, home.layer);
    sc.grip();
    sc.waiting(true);
    const places = step.places.map((w) => ({ w, ...sc.spot(w) }));
    if (word === 'beside') places.push({ w: word, ...sc.spot(word, 1) });
    current.places = places;
    const mine = current;
    const keep = (x, y) => [
      Math.max(t.l + EDGE.held, Math.min(600 - t.r - EDGE.held, x)),
      Math.max(t.top + EDGE.held, Math.min(400 - EDGE.held, y)),
    ];
    /* A thing let go in a wrong place goes back after a moment, unless it
       is picked up again first: the timer must not take it out of the
       finger, or back from the right place a quick hand has put it in. */
    let homing = 0;
    const stay = () => {
      clearTimeout(homing);
      timers.delete(homing);
      homing = 0;
    };

    /* The drag is followed on the window, not on the picture: wherever the
       finger goes, and whether or not the browser keeps the pointer captured
       for us (Chrome lets a mouse's capture go when the thing changes its
       layer), every move and the letting go arrive. */
    let hold = null;
    const follow = (event) => {
      if (!hold || event.pointerId !== hold.id) return;
      const q = sc.point(event);
      if (!q) return;
      hold.far = Math.max(hold.far, Math.hypot(q.x - hold.x, q.y - hold.y));
      sc.put(...keep(q.x + hold.dx, q.y + hold.dy));
    };
    const release = (event) => {
      if (!hold || event.pointerId !== hold.id) return;
      const moved = hold.far >= STILL;
      hold = null;
      removeEventListener('pointermove', follow, true);
      removeEventListener('pointerup', release, true);
      removeEventListener('pointercancel', release, true);
      if (current !== mine) return;
      if (!moved) return back();
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
          box.classList.remove('w-wobble');
          void box.getBoundingClientRect();
          box.classList.add('w-wobble');
          homing = later(back, WRONG);
          return;
        }
        busy = true;
        sound.chime();
        box.classList.add('right');
        sc.ring(true);
        sc.tray();
        later(() => say(clipOf.sentence(step.s), () => later(advance, AFTER)), 400);
      });
    };
    sc.piece.addEventListener('pointerdown', (event) => {
      const q = sc.point(event);
      if (busy || !q) return;
      event.preventDefault();
      stay();
      sc.stop();
      sc.waiting(false);
      /* On glass the thing rides above the finger, so the finger does not hide it. */
      const lift = event.pointerType === 'touch' ? RIDE : 0;
      hold = { id: event.pointerId, dx: sc.at.x - q.x, dy: sc.at.y - q.y - lift, x: q.x, y: q.y, far: 0 };
      /* In front of everything while it is carried (where it waits, it is already). */
      const top = sc.piece.parentNode === sc.layer('front') ? undefined : 'drag';
      sc.put(...keep(q.x + hold.dx, q.y + hold.dy), top);
      try {
        sc.root.setPointerCapture(event.pointerId);
      } catch {
        /* the window still hears the finger */
      }
      addEventListener('pointermove', follow, true);
      addEventListener('pointerup', release, true);
      addEventListener('pointercancel', release, true);
    });
    /* The browser is told the touch is ours, as well as by touch-action in
       where.css: a finger that lets go of the thing at speed is otherwise
       taken for a fling of the page, and Chrome then swallows the next taps
       on the words to choose (seen with tools/test-where.js). */
    for (const name of ['touchstart', 'touchmove']) {
      sc.piece.addEventListener(name, (event) => { if (event.cancelable) event.preventDefault(); }, { passive: false });
    }
    function back() {
      stay();
      if (hold || busy || current !== mine) return;
      sc.put(sc.at.x, sc.at.y, 'front');
      sc.go([{ x: home.x, y: home.y, ms: BACKHOME }], () => sc.waiting(true));
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
    wonder();
    drawDone();
    ahead();
    const more = stage + 1 < STAGES.length;
    $('go-on').hidden = !more;
    $('go-on').onclick = () => begin(stage + 1);
    $('to-list').onclick = list;
    sound.chime();
    later(() => say('well-done'), 500);
  }

  function drawDone() {
    const names = STAGES[stage].words.map(clipOf.word);
    $('done-words').classList.toggle('w-hold', unsure(names));
    write($('done-words'), STAGES[stage].words.map(chip).join(''));
  }

  /* A word at the end of a stage says itself when tapped. */
  $('done-words').addEventListener('click', (event) => {
    const word = event.target.closest('[data-w]');
    if (word && screen === 'done') say(clipOf.word(word.dataset.w));
  });

  /* The room for the pictures changes its size whenever anything around it
     does (a sentence appearing, words wrapping, a font arriving, a browser
     bar, the tablet turned): the pictures are shared out again each time. */
  if (typeof ResizeObserver === 'function') new ResizeObserver(pack).observe($('room'));
  addEventListener('resize', pack);
  addEventListener('orientationchange', () => {
    pack();
    setTimeout(pack, 350);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(pack, () => {});

  load();
  list();

  if (LOCAL) {
    window.whereGame = {
      STAGES, THINGS, PLACES, scene, steps, questions, ask,
      begin, list, advance,
      get plan() { return plan; },
      get index() { return index; },
      get step() { return current && current.step; },
      go(i) { index = i; play(); },
      reset() { kept = { v: 1, done: [] }; save(); list(); },
      /* One step by hand: { kind, s, choices | pictures | places }. */
      try(step) {
        plan = [step];
        index = 0;
        view('play');
        $('dots').innerHTML = '<i></i>';
        play();
      },
      /* The end of a stage, by hand. */
      finish(n = stage) {
        forget();
        hush();
        stage = n;
        finish();
      },
      /* The other words that make a sensible picture with a sentence's thing and place. */
      fits: ([thing, word, place]) => Object.keys(words).filter((w) => w !== word && can(thing, w) && supports(place, w, thing)),
      /* The scenes on the screen, each with its thing (piece), where it is (at) and what moves it. */
      scenes: () => (current ? current.scenes : []),
      /* put: the places on offer now, in the scene's lengths, the right one marked. */
      spots() {
        const step = current && current.step;
        if (!step || step.kind !== 'put') return [];
        return current.places.map((pl) => ({ ...pl, right: pl.w === step.s[1], h: current.scenes[0].size.h }));
      },
      /* Resolves when everything asked about the recordings is known and drawn. */
      settled: () => learning,
      /* Resolves when the books' pictures are all there. */
      loaded: () => Promise.all([...clips.values()]),
      get pace() { return debug.pace; },
      set pace(n) { debug.pace = n; },
      get freeze() { return debug.freeze; },
      set freeze(on) { debug.freeze = Boolean(on); },
    };
  }
})();
