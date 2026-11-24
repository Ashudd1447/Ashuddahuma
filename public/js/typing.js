/* The typing game's page. The engine (js/typing-engine.js) decides everything:
   which letters are in play, what a round holds, whether a press was right.
   This file draws what it says, hands it the key presses and the taps with
   their times, plays the sounds, and keeps the state on the device.

   There are three ways to play, and the engine names the one in effect:
   'keys' (a real keyboard: the drawn one is a guide), 'touch' (the drawn
   keyboard is tapped) and 'small' (six large keys, a window on the keyboard,
   with a small map that shows where the window sits). Two players, kept
   apart: the child gets one letter at a time on a large card, the grown-up a
   line of words, the next character alone on a card, and numbers at the end
   of a round.

   Nothing here waits for an animation: time comes from the events and from
   performance.now(), and waits from setTimeout. The drawn keyboard is built
   once for a keyboard, a way and a player; a key press only moves classes.
   Every word on screen is in TEXT or in typing.html, and all are drafts for
   the parents. */
const typing = (() => {
  const STORE = 'typing'; // the localStorage key
  const ERRORS = 'typing-errors'; // the last things that went wrong on this device, listed on the admin page
  const BACKUP = 'typing-backup'; // a record this page could not use, kept before starting over
  const KEY_MAX = {keys: 66, touch: 118, small: 128}; // px: the largest a drawn key grows, by way
  const KEY_MIN = 14; // px: the smallest
  const TALL = 1.25; // the child's keys on glass are this much taller than wide
  const FLASH = 450; // ms a wrong key shows
  const SPARK = 650; // ms a sparkle or a right tap shows
  const NOTE = 6000; // ms the line about a changed keyboard stays
  const GUARD = 700; // ms after a round in which Space does not yet begin the next one
  const PALM = 1.7; // a touch wider than this many keys is a resting palm
  const DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const ZWJ = '‍'; // keeps a letter in its joined shape at the edge of its own element
  const RING = '◌'; // the dotted circle a mark is drawn on
  const GREY = '#D9D0C2'; // a key nobody has typed yet

  const TEXT = {
    changed: 'تَغَيَّرَتْ لَوْحَةُ الْمَفَاتِيحِ',
    speed: 'حَرْفًا فِي الدَّقِيقَةِ',
    accuracy: 'الدِّقَّةُ',
    fresh: {letter: 'حَرْفٌ جَدِيدٌ', mark: 'حَرَكَةٌ جَدِيدَةٌ', key: 'مِفْتَاحٌ جَدِيدٌ'},
    praise: {'well-done': 'أحسنت', mashaallah: 'مَا شَاءَ اللَّهُ'},
    next: 'الْجَوْلَةُ التَّالِيَةُ',
    leave: 'أَلْعَاب',
    settings: 'الْإِعْدَادَاتُ',
    player: 'اللَّاعِبُ',
    players: {child: 'طِفْل', grown: 'كَبِير'},
    keyboard: 'لَوْحَةُ الْمَفَاتِيحِ',
    way: 'طَرِيقَةُ اللَّعِبِ',
    ways: {auto: 'تِلْقَائِيٌّ', keys: 'مَفَاتِيحُ حَقِيقِيَّةٌ', touch: 'لَمْسُ الشَّاشَةِ', small: 'النُّسْخَةُ الصَّغِيرَةُ'},
    target: 'السُّرْعَةُ الْمَطْلُوبَةُ',
    targets: ['مُبْتَدِئ', 'مُتَوَسِّط', 'سَرِيع'],
    marks: 'التَّشْكِيلُ',
    all: 'كُلُّ الْحُرُوفِ',
    reset: 'بِدَايَةٌ جَدِيدَةٌ',
    ask: ['هَلْ تُرِيدُ بِدَايَةً جَدِيدَةً؟', 'سَيُمْحَى كُلُّ مَا تَعَلَّمَهُ هَذَا اللَّاعِبُ. هَلْ أَنْتَ مُتَأَكِّدٌ؟'],
    yes: 'نَعَمْ',
    no: 'لَا',
    done: 'تَمَّ'
  };
  const SHIFT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l8 9h-4.5v7h-7v-7H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  const NEXT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 5.5L4.5 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const HUB_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>';
  const STAR_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="currentColor"/></svg>';

  const $ = (id) => document.getElementById(id);
  const root = $('typing');
  const el = {who: $('view-who'), play: $('view-play'), small: $('small'), more: $('small-more'), turn: $('small-turn'), note: $('note'),
    top: $('top'), card: $('card'), line: $('line'), mini: $('mini'), result: $('result'), board: $('board'), kbd: $('kbd'),
    letters: $('letters'), gear: $('gear'), scrim: $('scrim'), panel: $('panel')};

  let game = null;
  let files = null; // the three data files, as read
  let view = 'load';
  /* What the hands are on: 'keys' where there is a mouse, and from the moment
     a real letter key is pressed; 'glass' from a touch on a drawn key. */
  let hands = matchMedia('(hover: hover) and (pointer: fine)').matches ? 'keys' : 'glass';
  let board = null; // the engine's picture of the keyboard in use
  let byCode = {}; // its keys by code
  let keyEls = {}; // the drawn keys by code
  let miniEls = {}; // the small map's keys by code
  let geo = {minX: 0, cols: 15, rows: [1, 2, 3, 4], tall: 1, unit: 40}; // where the drawn keys sit
  let built = ''; // what the drawn keyboard was built for
  let frame = ''; // the small version's window as drawn
  let lit = [];
  let held = [];
  let fresh = null; // the key of a character just earned
  let pieces = []; // the line of words, letter by letter
  let chEls = [];
  let at = 0; // the piece being typed
  let row = 0; // where its line starts in the box of words
  let gapTimer = 0;
  let noteTimer = 0;
  let fitTimer = 0;
  let endedAt = -1e9; // when the last round ended, on the events' clock
  let told = false; // the small version has said what it is
  let dirty = false; // a setting was changed while the panel was open
  let asking = 0; // how far the fresh start has been confirmed
  let rescued = false; // something went wrong on this visit, so on glass the small version is used until the page is opened again

  const beep = (name, ...values) => {
    if (name && typeof sound !== 'undefined' && typeof sound[name] === 'function') sound[name](...values);
  };
  const num = (n) => String(Math.abs(Math.round(n))).replace(/\d/g, (d) => DIGITS[d]);
  const isMark = (s) => s.length === 1 && s >= 'ً' && s <= 'ْ';
  /* A character as it is shown alone: a mark on its dotted circle, a space as a bar. */
  const face = (s) => (s === ' ' ? '<i class="type-bar"></i>' : isMark(s) ? RING + s : s);
  const today = () => {
    const d = new Date();
    return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
  };
  const saved = () => {
    try { return localStorage.getItem(STORE); } catch (e) { return null; }
  };
  const save = () => {
    try { localStorage.setItem(STORE, JSON.stringify(game.state())); } catch (e) { /* a private window keeps nothing */ }
  };
  /* What went wrong, written down on the device with what the page knew at
     the time, so the admin page can show it: the family's tablet once showed
     the child a blank page that no emulated screen would. */
  const remember = (err) => {
    try {
      let s = null;
      try { s = game && game.settings(); } catch (e) { /* the game itself may be what broke */ }
      const list = JSON.parse(localStorage.getItem(ERRORS) || '[]').slice(-4);
      list.push({at: new Date().toISOString(), message: String((err && err.message) || err), stack: String((err && err.stack) || '').split('\n').slice(0, 6).join('\n'),
        player: s && s.player, way: s && s.playing.way, chosen: s && s.way, layout: s && s.playing.layout, view: view, rescued: rescued,
        screen: innerWidth + 'x' + innerHeight + ' at ' + devicePixelRatio, hands: hands, fine: matchMedia('(hover: hover) and (pointer: fine)').matches, agent: navigator.userAgent});
      localStorage.setItem(ERRORS, JSON.stringify(list));
    } catch (e) { /* nothing more can be done */ }
  };
  /* The engine gives no new letter while the character just earned still
     waits for its own round. A mark earned and then switched off never gets
     that round, and would hold every letter back, so with the marks off its
     claim is dropped from the state before the engine reads it. */
  const mend = (state) => {
    const grown = state && !state.marks && state.stats && state.stats.grown;
    Object.keys(grown || {}).forEach((w) => Object.keys(grown[w] || {}).forEach((id) => {
      const p = grown[w][id];
      if (p && typeof p.fresh === 'string' && isMark(p.fresh)) p.fresh = '';
    }));
    return state;
  };
  const engine = (state, w) => typingEngine.start({layouts: files[0], stats: files[1], words: files[2], saved: mend(state), way: w});
  const child = () => game.settings().player === 'child';
  const way = () => game.settings().playing.way;
  /* From weak (red) through amber to known (green). */
  const hue = (k) => Math.round(8 + 122 * Math.max(0, Math.min(1, k)));

  const show = (name) => {
    view = name;
    root.dataset.view = name;
    el.who.hidden = name !== 'who';
    el.play.hidden = name !== 'play';
    el.gear.hidden = name !== 'play';
  };
  const note = (text) => {
    el.note.textContent = text;
    el.note.hidden = false;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { el.note.hidden = true; }, NOTE);
  };

  /* ---------- The drawn keyboard ---------- */

  const makeKey = (k, x, y) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.tabIndex = -1;
    b.className = 'key ' + k.kind;
    b.dataset.code = k.code;
    b.style.setProperty('--x', x);
    b.style.setProperty('--y', y);
    b.style.setProperty('--w', k.w);
    if (k.kind !== 'quiet') b.dataset.zone = k.finger === 'thumb' ? 'thumb' : child() || !k.finger ? k.hand : k.hand + '-' + k.finger;
    b.innerHTML = (k.kind === 'shift' ? SHIFT_ICON : '') + (k.base ? `<span class="kb">${face(k.base)}</span>` : '')
      + (k.shift ? `<span class="ks">${face(k.shift)}</span>` : '') + (k.bump ? '<i class="bump"></i>' : '');
    return b;
  };
  const place = () => {
    el.kbd.style.setProperty('--cols', geo.cols);
    el.kbd.style.setProperty('--rows', geo.rows.length);
    el.kbd.style.setProperty('--tall', geo.tall);
  };
  /* Whether a Shift character is in play: until one is, the child's keyboard
     on glass leaves the two Shift keys out, as the engine's touches do. */
  const shifty = () => board.keys.some((k) => k.kind === 'key' && k.shift && game.know(k.shift).play);
  const signature = () => {
    const s = game.settings();
    return [s.player, s.playing.way, s.playing.layout, s.playing.way === 'touch' && s.player === 'child' && shifty()].join();
  };
  /* The whole keyboard. When it is tapped, the quiet keys are left out to
     give the letters room, and so are the keys the child never uses. */
  const drawBoard = () => {
    const tapped = way() === 'touch';
    const small = tapped && child();
    const shifts = !small || shifty();
    const drawn = board.keys.filter((k) => !(tapped && k.kind === 'quiet') && !(k.kind === 'shift' && !shifts) && !(k.kind === 'space' && small));
    const rows = board.rows.filter((r) => drawn.some((k) => k.row === r));
    const minX = Math.min(...drawn.map((k) => k.x));
    geo = {minX: minX, cols: Math.max(...drawn.map((k) => k.x + k.w)) - minX, rows: rows, tall: small ? TALL : 1, unit: geo.unit};
    el.kbd.textContent = '';
    keyEls = {};
    drawn.forEach((k) => {
      keyEls[k.code] = makeKey(k, k.x - minX, rows.indexOf(k.row));
      el.kbd.append(keyEls[k.code]);
    });
    place();
  };
  /* The small version's map of the whole keyboard. */
  const drawMini = () => {
    const keys = board.keys.filter((k) => k.kind === 'key' || k.kind === 'space');
    const minX = Math.min(...keys.map((k) => k.x));
    el.mini.innerHTML = keys.map((k) => `<i data-code="${k.code}" style="--x:${k.x - minX};--y:${board.rows.indexOf(k.row)};--w:${k.w}"></i>`).join('');
    el.mini.style.setProperty('--cols', Math.max(...keys.map((k) => k.x + k.w)) - minX);
    el.mini.style.setProperty('--rows', board.rows.length);
    miniEls = {};
    el.mini.querySelectorAll('i').forEach((i) => { miniEls[i.dataset.code] = i; });
  };
  /* The small version's six keys, in their real places beside each other,
     and for the grown-up the space bar under them. */
  const drawWindow = () => {
    const win = game.window();
    if (!win) return;
    const six = win.rows[0].concat(win.rows[1]);
    const name = six.map((k) => k.code + k.char + (k.live ? 1 : 0)).join();
    if (name === frame) return;
    frame = name;
    const minX = Math.min(...six.map((k) => k.x));
    const cols = Math.max(...six.map((k) => k.x + 1)) - minX;
    el.kbd.textContent = '';
    keyEls = {};
    win.rows.forEach((keys, y) => keys.forEach((k) => {
      const real = byCode[k.code] || {};
      const b = makeKey({code: k.code, kind: 'key', w: 1, base: k.char, shift: '', hand: real.hand, finger: real.finger, bump: real.bump}, k.x - minX, y);
      b.classList.toggle('off', !k.live);
      keyEls[k.code] = b;
      el.kbd.append(b);
    }));
    if (!child()) {
      keyEls.Space = makeKey({code: 'Space', kind: 'space', w: cols, base: '', shift: '', hand: 'both', finger: 'thumb'}, 0, 2);
      el.kbd.append(keyEls.Space);
    }
    geo = {minX: minX, cols: cols, rows: child() ? [0, 1] : [0, 1, 2], tall: 1, unit: geo.unit};
    place();
    Object.keys(miniEls).forEach((code) => miniEls[code].classList.toggle('in', six.some((k) => k.code === code)));
    fit();
  };
  /* How well each key is known: a bar under its letter, grey until it has
     been typed, then from red to green. Keys not in play are faint. */
  const tint = () => {
    if (way() === 'small') return;
    board.keys.forEach((k) => {
      const b = keyEls[k.code];
      if (!b || k.kind === 'quiet' || k.kind === 'shift') return;
      const base = k.kind === 'space' ? game.know(' ') : k.base ? game.know(k.base) : null;
      const up = k.shift ? game.know(k.shift) : null;
      const seen = base && base.play ? base : up && up.play ? up : null;
      b.classList.toggle('off', !seen);
      b.style.setProperty('--know', seen && seen.n ? `hsl(${hue(seen.k)} 62% 48%)` : GREY);
      const corner = b.querySelector('.ks');
      if (corner) corner.classList.toggle('off', !(up && up.play));
    });
  };
  /* The strip of letters in the order they come: the ones in play, the one
     the round is about, and for the child each letter he knows, glazed. */
  const drawLetters = () => {
    el.letters.innerHTML = game.strip().map((x) => `<i class="${x.play ? 'in' : ''}${x.focus ? ' aim' : ''}${x.ok ? ' ok' : ''}"`
      + `${x.k > 0 ? ` style="--know:hsl(${hue(x.k)} 70% 86%)"` : ''}>${face(x.item)}</i>`).join('');
    /* Where the strip is one sliding row, the round's letter is brought to the middle. */
    const aim = el.letters.querySelector('.aim');
    el.letters.scrollLeft = aim && el.letters.scrollWidth > el.letters.clientWidth ? aim.offsetLeft - (el.letters.clientWidth - aim.offsetWidth) / 2 : 0;
  };

  /* The size of a key: as large as the room under the words allows. */
  const fit = () => {
    if (view !== 'play' || !game) return;
    const s = game.settings();
    const small = s.playing.way === 'small';
    const turn = small && typingEngine.turnHelps({player: s.player, width: innerWidth, height: innerHeight});
    el.small.hidden = !small;
    el.more.hidden = told || turn;
    el.turn.hidden = told || !turn;
    const unit = Math.max(KEY_MIN, Math.min(el.board.clientWidth / geo.cols, el.board.clientHeight / (geo.rows.length * geo.tall), KEY_MAX[s.playing.way]));
    geo.unit = unit;
    el.kbd.style.setProperty('--u', unit.toFixed(2) + 'px');
    /* The box of words shows whole lines only. */
    const high = parseFloat(getComputedStyle(el.line).lineHeight);
    if (high > 0) el.line.style.maxHeight = Math.max(1, Math.floor((el.top.clientHeight + 1) / high)) * high + 'px';
  };
  const build = () => {
    board = game.board();
    byCode = {};
    board.keys.forEach((k) => { byCode[k.code] = k; });
    root.dataset.way = way();
    root.dataset.player = game.settings().player;
    built = signature();
    frame = '';
    lit = [];
    held = [];
    fresh = null;
    el.mini.hidden = way() !== 'small';
    if (way() === 'small') {
      drawMini();
      el.kbd.textContent = '';
      keyEls = {};
    } else drawBoard();
    tint();
    fit();
  };

  /* ---------- What to press ---------- */

  const light = (g) => {
    if (g && way() === 'small') drawWindow();
    lit.forEach((code) => keyEls[code] && keyEls[code].classList.remove('lit', 'hard'));
    held.forEach((code) => keyEls[code] && keyEls[code].classList.remove('held'));
    lit.forEach((code) => miniEls[code] && miniEls[code].classList.remove('at'));
    lit = g ? g.light.slice() : [];
    held = g ? g.held.slice() : [];
    lit.forEach((code) => keyEls[code] && keyEls[code].classList.add('lit'));
    held.forEach((code) => keyEls[code] && keyEls[code].classList.add('held'));
    if (way() === 'small') lit.forEach((code) => miniEls[code] && miniEls[code].classList.add('at'));
    el.card.innerHTML = g ? face(g.char) : '';
  };
  /* A class on a key for a moment. */
  const flash = (code, name, ms) => {
    const b = keyEls[code];
    if (!b) return;
    b.classList.add(name);
    setTimeout(() => b.classList.remove(name), ms);
  };
  const sparkle = (code) => {
    const b = keyEls[code];
    if (!b) return;
    const star = document.createElement('i');
    star.className = 'type-spark';
    star.innerHTML = STAR_ICON;
    b.append(star);
    setTimeout(() => star.remove(), SPARK);
  };

  /* ---------- The line of words ---------- */

  /* Each letter sits in its own element, so that it can be colored alone; a
     zero-width joiner on each side that joins keeps its shape as in the
     whole word. A word never breaks across lines. */
  const drawLine = (text) => {
    pieces = typingEngine.pieces(text);
    let html = '';
    let open = false;
    pieces.forEach((p) => {
      if (p.space) {
        html += (open ? '</span>' : '') + '<span class="ch sp"></span>';
        open = false;
        return;
      }
      html += (open ? '' : '<span class="wd">') + `<span class="ch">${p.before ? ZWJ : ''}${p.s}${p.after ? ZWJ : ''}</span>`;
      open = true;
    });
    el.line.innerHTML = html + (open ? '</span>' : '');
    chEls = Array.from(el.line.querySelectorAll('.ch'));
    at = 0;
    row = 0;
    el.line.scrollTop = 0;
    if (chEls[0]) chEls[0].classList.add('cur');
  };
  /* Moves the mark to the character at pos; when its line is out of sight,
     that line goes to the top of the box. */
  const mark = (pos) => {
    if (!chEls[at]) return;
    chEls[at].classList.remove('cur', 'bad');
    while (at < pieces.length - 1 && pieces[at].at + pieces[at].size <= pos) {
      chEls[at].classList.add('done');
      at += 1;
    }
    const cur = chEls[at];
    cur.classList.add('cur');
    const box = cur.classList.contains('sp') ? cur : cur.parentNode;
    if (box.offsetTop === row) return;
    row = box.offsetTop;
    if (row + box.offsetHeight > el.line.scrollTop + el.line.clientHeight + 2 || row < el.line.scrollTop) el.line.scrollTop = row;
  };

  /* ---------- A round ---------- */

  /* The way in effect: the family's choice, or what the hands and the
     screen allow. Answers whether it changed. */
  const reway = () => {
    const s = game.settings();
    const next = rescued && hands !== 'keys' ? 'small' : typingEngine.wayFor({choice: s.way === 'auto' ? '' : s.way, fine: hands === 'keys', width: innerWidth, height: innerHeight, player: s.player});
    if (next === s.playing.way) return false;
    game.setWay(next);
    return true;
  };
  /* A round, and if it cannot begin, the way out: the error is written down,
     the small version (which needs the least) is tried, and if even that
     fails this player starts afresh, the old record kept aside. */
  const begin = () => {
    for (let tries = 0; tries < 3; tries++) {
      try {
        beginRound();
        return;
      } catch (err) {
        remember(err);
        built = '';
        if (tries === 0) rescued = true;
        else {
          try { localStorage.setItem(BACKUP, saved() || ''); } catch (e) { /* keeps nothing */ }
          game.reset();
          save();
        }
      }
    }
  };
  /* Right after a round begins on glass, the drawn keyboard must be on the
     screen with room for a finger; if it is not, that is written down too
     and the small version takes over. */
  const looked = () => {
    if (view !== 'play' || rescued || way() !== 'touch') return;
    const box = el.kbd.getBoundingClientRect();
    if (box.width >= 120 && box.height >= 40 && box.top >= 0 && box.bottom <= innerHeight + 2) return;
    remember(`the keyboard is not in view: ${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.width)}x${Math.round(box.height)}`);
    rescued = true;
    begin();
  };
  const beginRound = () => {
    clearTimeout(gapTimer);
    reway();
    if (signature() !== built) build();
    const round = game.round({day: today(), time: performance.now()});
    if (!round) return;
    delete root.dataset.end;
    el.result.hidden = true;
    el.result.textContent = '';
    if (fresh) fresh.classList.remove('fresh');
    fresh = null;
    if (round.kind === 'words') drawLine(round.text);
    else el.line.textContent = '';
    drawLetters();
    light(round.guide);
    fit();
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    setTimeout(looked, 800);
  };

  const change = (d) => (d > 0 ? `<i class="up">▲ ${num(d)}</i>` : d < 0 ? `<i>▼ ${num(d)}</i>` : '<i></i>');
  const figure = (value, name, d) => `<div class="type-num"><b>${value}</b><span>${name}</span>${change(d)}</div>`;
  /* The end of a round. The child: the praise, shown and said, and the
     letter he earned; after three rounds, the way out beside the way on.
     The grown-up: speed and accuracy, each against his own average. */
  const finish = (end, time) => {
    endedAt = time;
    told = true;
    save();
    light(null);
    tint();
    drawLetters();
    const won = end.unlocked;
    const next = `<button class="round type-next" id="next" type="button" aria-label="${TEXT.next}">${NEXT_ICON}</button>`;
    if (child()) {
      const praise = TEXT.praise[end.praise] ? end.praise : 'well-done';
      el.result.innerHTML = `<p class="praise type-praise">${TEXT.praise[praise]}</p>` + (won ? `<b class="type-big">${face(won.item)}</b>` : '')
        + (end.rest ? `<a class="round type-leave" href="games.html" aria-label="${TEXT.leave}">${HUB_ICON}</a>` : '') + next;
      beep('chime');
      beep('say', praise);
    } else {
      el.result.innerHTML = figure(num(end.cpm), TEXT.speed, end.cpmDiff) + figure(num(end.accuracy) + '٪', TEXT.accuracy, end.accuracyDiff)
        + (won ? `<div class="type-new"><span>${TEXT.fresh[won.kind] || TEXT.fresh.letter}</span><b>${face(won.item)}</b></div>` : '') + next;
      if (won) beep('chime');
    }
    root.dataset.end = '1';
    el.result.hidden = false;
    if (won && keyEls[won.code]) {
      fresh = keyEls[won.code];
      fresh.classList.add('fresh');
    }
    fit();
  };

  /* What the engine answered to a press or a tap. */
  const after = (out, time) => {
    if (out.result === 'layout') {
      const name = game.layouts().filter((l) => l.id === out.layout)[0];
      note(TEXT.changed + (name ? ': ' + name.name : ''));
      save();
      begin();
      return;
    }
    if (out.result === 'shift') {
      light(out.guide);
      return;
    }
    if (out.result === 'wrong') {
      beep(out.sound);
      if (child()) {
        flash(out.code, 'dip', FLASH);
        lit.forEach((code) => keyEls[code] && keyEls[code].classList.add('hard'));
      } else {
        flash(out.code, 'bad', FLASH);
        if (chEls[at]) chEls[at].classList.add('bad');
      }
      return;
    }
    if (out.result !== 'right') return;
    beep(out.sound);
    if (child()) {
      if (out.quick) sparkle(out.code);
      flash(out.code, 'good', SPARK);
    }
    if (out.end) {
      if (chEls[at]) chEls[at].classList.remove('cur', 'bad');
      finish(out.end, time);
      return;
    }
    if (child()) {
      /* The quiet gap: the card and the keys go dark, then the next letter lights. */
      light(null);
      clearTimeout(gapTimer);
      gapTimer = setTimeout(() => light(game.guide()), out.wait);
      return;
    }
    mark(out.guide.pos);
    light(out.guide);
  };

  /* ---------- Keys and taps ---------- */

  const onKey = (e) => {
    if (!game) return;
    if (!el.scrim.hidden) {
      if (e.key === 'Escape') closePanel();
      return;
    }
    if (view !== 'play') return;
    /* A key held down types nothing, and must not scroll the page or open a browser's search either. */
    if (e.repeat && !e.ctrlKey && !e.metaKey && (e.code === 'Space' || game.typesLetter(e.code))) {
      e.preventDefault();
      return;
    }
    const plain = !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat;
    if (!game.active() && (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter')) {
      if (!plain) return;
      e.preventDefault();
      if (e.timeStamp - endedAt > GUARD) begin();
      return;
    }
    const s = game.settings();
    if (s.playing.way !== 'keys' && s.way === 'auto' && plain && game.typesLetter(e.code)) {
      /* A real keyboard has turned up: the round starts over on it. */
      hands = 'keys';
      e.preventDefault();
      begin();
      return;
    }
    const out = game.press({code: e.code, key: e.key, shift: e.shiftKey, altgr: !!(e.getModifierState && e.getModifierState('AltGraph')),
      alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey, repeat: e.repeat, time: e.timeStamp});
    if (out.used) e.preventDefault();
    after(out, e.timeStamp);
  };

  /* A touch on the drawn keyboard: the key under it, or else the live key
     nearest to it. */
  const onTap = (e) => {
    if (!game || view !== 'play') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const s = game.settings();
    const finger = e.pointerType === 'touch' || e.pointerType === 'pen';
    if (s.playing.way === 'keys' && finger && s.way === 'auto') {
      hands = 'glass';
      begin();
      return;
    }
    if (!game.active()) return;
    if (e.pointerType === 'touch' && Math.max(e.width || 0, e.height || 0) > PALM * geo.unit) return;
    const hit = e.target.closest ? e.target.closest('.key') : null;
    let code = hit && !hit.classList.contains('off') && !hit.classList.contains('quiet') ? hit.dataset.code : '';
    if (!code && s.playing.way !== 'small') {
      const box = el.kbd.getBoundingClientRect();
      code = game.nearest((e.clientX - box.left) / geo.unit + geo.minX, (e.clientY - box.top) / (geo.unit * geo.tall) + geo.rows[0]);
    }
    if (!code) return;
    after(game.tap({code: code, time: e.timeStamp}), e.timeStamp);
  };

  /* ---------- The settings ---------- */

  const options = (name, list, on) => `<div class="type-opts">${list.map((o) => `<button class="type-opt${o.v === on ? ' on' : ''}" type="button"`
    + ` data-set="${name}" data-value="${o.v}">${o.t}${o.more ? `<small>${o.more}</small>` : ''}</button>`).join('')}</div>`;
  const toggle = (name, text, on) => `<button class="type-switch${on ? ' on' : ''}" type="button" role="switch" aria-checked="${on}"`
    + ` data-set="${name}" data-value="${!on}"><span>${text}</span><i></i></button>`;
  const drawPanel = () => {
    const s = game.settings();
    const grown = s.player === 'grown';
    const speeds = typingEngine.constants.TARGETS[s.playing.way === 'keys' ? 'keys' : 'glass'];
    let html = `<h2>${TEXT.settings}</h2><h3>${TEXT.player}</h3>` + options('player', ['child', 'grown'].map((p) => ({v: p, t: TEXT.players[p]})), s.player)
      + `<h3>${TEXT.keyboard}</h3>` + options('layout', game.layouts().map((l) => ({v: l.id, t: l.name})), s.playing.layout)
      + `<h3>${TEXT.way}</h3>` + options('way', ['auto', 'keys', 'touch', 'small'].map((w) => ({v: w, t: TEXT.ways[w]})), s.way);
    if (grown) {
      html += `<h3>${TEXT.target}</h3>` + options('target', TEXT.targets.map((t, i) => ({v: String(i), t: t, more: num(speeds[i])})), String(s.target))
        + '<div class="type-opts">' + (s.playing.way === 'keys' ? toggle('marks', TEXT.marks, s.marks) : '') + toggle('all', TEXT.all, s.all) + '</div>';
    }
    html += '<hr class="menu-rule">';
    if (!asking) html += `<div class="type-opts"><button class="type-opt" type="button" data-ask="1">${TEXT.reset}</button></div>`;
    else {
      html += `<p class="type-ask">${TEXT.ask[asking - 1]}</p><div class="type-opts"><button class="type-opt" type="button" data-ask="${asking + 1}">${TEXT.yes}</button>`
        + `<button class="type-opt on" type="button" data-ask="0">${TEXT.no}</button></div>`;
    }
    el.panel.innerHTML = html + `<button class="button type-done" type="button" data-close>${TEXT.done}</button>`;
  };
  const openPanel = () => {
    asking = 0;
    dirty = false;
    drawPanel();
    el.scrim.hidden = false;
  };
  /* A change of setting drops the round under way, so a round begins when
     the panel closes; with nothing changed, the round goes on. */
  function closePanel() {
    el.scrim.hidden = true;
    if (dirty) begin();
    else if (document.activeElement) document.activeElement.blur();
  }
  const onPanel = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if ('close' in b.dataset) {
      closePanel();
      return;
    }
    if (b.dataset.ask) {
      asking = Number(b.dataset.ask);
      if (asking > TEXT.ask.length) {
        game.reset();
        save();
        asking = 0;
        dirty = true;
        built = '';
      }
      drawPanel();
      return;
    }
    const name = b.dataset.set;
    if (!name) return;
    const value = b.dataset.value;
    game.set({[name]: name === 'target' ? Number(value) : name === 'marks' || name === 'all' ? value === 'true' : value});
    if (name === 'marks' && value !== 'true') game = engine(game.state(), way());
    reway();
    save();
    dirty = true;
    asking = 0;
    built = '';
    drawPanel();
  };

  /* ---------- The start ---------- */

  const choose = (e) => {
    const b = e.target.closest('[data-player]');
    if (!b || !game) return;
    game.set({player: b.dataset.player});
    save();
    show('play');
    begin();
  };
  const start = (read) => {
    files = read;
    let state = null;
    try { state = JSON.parse(saved()); } catch (e) { /* a damaged state is a fresh start */ }
    try {
      game = engine(state, 'keys');
    } catch (err) {
      /* A record the engine cannot read: kept aside, and a fresh start. */
      remember(err);
      try { localStorage.setItem(BACKUP, saved() || ''); } catch (e) { /* keeps nothing */ }
      game = engine(null, 'keys');
    }
    beep('preloadPrompts', ['well-done', 'mashaallah']);
    if (!game.settings().player) {
      show('who');
      return;
    }
    show('play');
    begin();
  };

  addEventListener('keydown', onKey);
  el.kbd.addEventListener('pointerdown', onTap);
  el.kbd.addEventListener('contextmenu', (e) => e.preventDefault());
  el.who.addEventListener('click', choose);
  el.gear.addEventListener('click', openPanel);
  el.panel.addEventListener('click', onPanel);
  el.scrim.addEventListener('pointerdown', (e) => { if (e.target === el.scrim) closePanel(); });
  el.result.addEventListener('click', (e) => { if (e.target.closest('#next')) begin(); });
  /* A turned or resized screen may change the way to play; otherwise the keys only change size. */
  addEventListener('resize', () => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(() => {
      if (view !== 'play') return;
      if (reway()) begin();
      else fit();
    }, 150);
  });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => fit()).observe(el.board);
  /* Anything else that goes wrong on this page is written down as well. */
  addEventListener('error', (e) => remember(e.error || e.message));
  addEventListener('unhandledrejection', (e) => remember(e.reason));

  Promise.all(['layouts', 'stats', 'words'].map((name) => fetch('typing/' + name + '.json').then((r) => r.json()))).then(start).catch(remember);

  /* For testing by hand on the family's own computer. */
  const hook = {game: () => game, begin: begin, build: build, fit: fit, state: () => ({view: view, hands: hands, geo: geo, lit: lit, held: held, at: at})};
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') window.typingGame = hook;
  return hook;
})();
