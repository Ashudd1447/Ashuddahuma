/* The typing game's engine: everything that decides, and nothing that draws.
   It has no page, no clock and no storage of its own: the page hands it the
   three data files, the saved state, the times of the presses and a source of
   random numbers, so a test can play a whole learner in a moment
   (tools/test-typing-engine.js). In node it is module.exports.

   THE FACE

   const game = typingEngine.start({
     layouts, stats, words,     the three files of public/typing, parsed
     saved,                     what game.state() gave last time (an object or its JSON), or nothing
     way,                       'keys' (a real keyboard), 'touch' (the drawn keyboard, tapped) or 'small' (the window of six)
     random                     a function like Math.random (optional)
   });

   Settings
     game.settings()            {player, layout, way, target, marks, all, playing: {way, layout}, cpm, marksOn}
                                player is '' until the family has chosen 'child' or 'grown'; way is the saved choice
                                ('auto' or one of the three); playing is what is in effect.
     game.set({player, layout, way, target, marks, all})   any of them; the round under way is dropped.
                                Each player, way and keyboard has its own record; a keyboard not played yet
                                starts from the record of the one played most, keeping what sits on the same keys.
     game.setWay(way)           the way in effect (typingEngine.wayFor chooses it; a real key pressed makes it 'keys')
     game.layouts()             the keyboards to offer: [{id, name, glass}]; glass ones only when tapping
     game.reset()               a fresh start for the current player
     game.state()               the whole state, a plain object {v: 1, ...} to keep in localStorage

   What to draw
     game.board()               {id, touch, width, rows, keys}: every key with its place in key widths
                                (row, x, w), what it types (base, shift: letters, marks and lam-alef only),
                                its hand and finger, bump, and kind: 'key', 'space', 'shift' or 'quiet'
     game.know(item)            {play, k, n, ok}: is this character in play, and how well is it known (k from 0 to 1)
     game.strip()               the characters in the order they come: [{item, kind, play, focus, k, ok}]
     game.guide()               the key to press: {pos, char, code, shift, altgr, shiftKey, hand, finger,
                                two, light: [codes], held: [codes], wait}; null between rounds
     game.window()              the small version's six keys: {rows: [[{code, char, live, target, row, x}]], shift, space}
     game.nearest(x, y)         the live key nearest a touch (x in key widths, y in rows), or ''
     game.typesLetter(code)     whether this key types a letter on the keyboard in use

   A round
     game.round({day, time})    begins one: {kind: 'words' or 'targets', text, focus, fresh, warm, guide}.
                                day is today's number (whole days, local time); time is the time now.
     game.press({code, key, shift, altgr, alt, ctrl, meta, repeat, time})   a real key went down
     game.tap({code, time})     a drawn key was tapped ('ShiftLeft' and 'ShiftRight' too), or one of the six
     Both answer {result, used, code, typed, advanced, quick, sound, wait, guide, end, layout}:
       result   'right', 'wrong', 'shift' (a tapped Shift now waits for its key), 'ignored' (a repeat, a
                shortcut, a key that is not in play for the child, a tap before the light), 'idle' (no
                round under way) or 'layout' (the keys pressed belong to another keyboard: the engine has
                switched to `layout`, the round is dropped, the page says so and begins a round)
       used     the page should call preventDefault
       advanced how many characters of the text were finished: 1, or 2 for a lam-alef key
       quick    the child was fast: a sparkle
       sound    'tick', 'wrong' or '' (the page plays it through its guarded helper)
       wait     the child's quiet gap in ms before the next key lights; the engine ignores taps until then
       end      when the round is over: {cpm, accuracy, cpmDiff, accuracyDiff, chars, mistakes, ms,
                unlocked: {item, kind, code, shift} or null, praise, rest, focus}
     game.active()              whether a round is under way
     game.last()                the last round's end

   One round, on real keys:
     let round = game.round({day: today, time: performance.now()});
     show(round.text); light(round.guide.light);
     onkeydown = (e) => {
       const out = game.press({code: e.code, key: e.key, shift: e.shiftKey, altgr: e.getModifierState('AltGraph'),
         alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey, repeat: e.repeat, time: e.timeStamp});
       if (out.used) e.preventDefault();
       if (out.result === 'right') { color(out.guide ? out.guide.pos : round.text.length); }
       if (out.result === 'wrong') { mark(out.code); }
       if (out.end) { save(game.state()); report(out.end); } else if (out.guide) { light(out.guide.light); }
     };

   Without a game: typingEngine.order(data, layoutId, player), typingEngine.wayFor({...}),
   typingEngine.turnHelps({...}), typingEngine.pieces(text), typingEngine.constants. */
const typingEngine = (() => {
  const VERSION = 1;
  const PLAYERS = ['child', 'grown'];
  const WAYS = ['keys', 'touch', 'small'];
  const DEFAULT_LAYOUT = 'win-102'; // what this family's computer has
  /* The keyboards offered, in the order of the picker. The names are drafts
     for the parents. A glass one is offered only when tapping. */
  const OFFERED = [
    {id: 'win-102', name: 'عَرَبِيٌّ ١٠٢'},
    {id: 'win-101', name: 'عَرَبِيٌّ ١٠١'},
    {id: 'win-102-azerty', name: 'عَرَبِيٌّ ١٠٢ أَزِرْتِي'},
    {id: 'mac-arabic', name: 'مَاك'},
    {id: 'mac-arabic-pc', name: 'مَاك بِتَرْتِيبِ وِينْدُوز'},
    {id: 'android-phone', name: 'لَوْحَةُ أَنْدْرُويْد', glass: true}
  ];

  /* How hard a key is to reach. The order of teaching is each letter's share
     of the language divided by this, so it follows whichever keyboard is chosen. */
  const ROW_EFFORT = [2.2, 1.3, 1.0, 1.6]; // the number row, the top row, the home row, the bottom row
  const FINGER_EFFORT = {index: 1, middle: 1, ring: 1.15, little: 1.3, thumb: 1};
  const REACH_INNER = 1.1; // the index finger's inner column
  const REACH_OUTER = 1.5; // beyond the little finger's own column
  const SHIFT_EFFORT = 2;
  const ALTGR_EFFORT = 3;
  const CHOICE = 3; // among this many of the highest, the letter that opens the most practice comes first
  const SHIFT_AFTER = 12; // no Shift letter before this many letters are in play
  const START = {grown: 6, child: 2}; // letters in play on the first day; the first six come by priority alone
  const CHILD_NEW = 2; // the child's new letters in one day, at most

  /* Measuring. alpha smooths the time of a key and alphaA its accuracy; a wait
     longer than pause is a rest, not a slow key; a key is known when it is fast
     (the target), accurate (from aLow, nothing, to aHigh, full) and has been
     timed nMin times; pass is the accuracy a round needs to earn a character;
     after patience rounds with nothing earned the next character comes
     whatever the numbers say, so a slow or careless learner is never stuck. */
  const LEARN = {
    grown: {alpha: 0.1, alphaA: 0.1, pause: 5000, aLow: 0.8, aHigh: 0.95, nMin: 12, pass: 0.9, patience: 10},
    child: {alpha: 0.2, alphaA: 0.2, pause: 15000, aLow: 0.5, aHigh: 0.8, nMin: 5, pass: 0.7, patience: 6}
  };
  const DT_MIN = 40; // ms; anything quicker is two keys struck together
  const CLIP_AFTER = 8; // from this many samples, one slow press counts as at most CLIP times the usual
  const CLIP = 3;
  const PAIR_ALPHA = 0.1; // the smoothing of a pair's time
  const PAIR_MIN = 5; // samples before a pair's time is believed
  const GUARD = 0.6; // no new character while one in play is below this
  const KNOWN = 0.999; // a confidence of one, allowing for rounding
  const TARGETS = {keys: [120, 175, 250], glass: [80, 120, 175]}; // characters a minute: beginner, practiced, fast
  const CHILD_TIME = {keys: 4000, glass: 3000}; // ms: the child knows a key when he finds it this fast

  /* A grown-up's round. */
  const LENGTH_FIRST = 60; // characters, while only the first letters are in play
  const LENGTH = 100;
  const FEW_WORDS = 15; // with fewer words that hold the focus, the letter alone and its pairs take part of the round,
  const DRILL_SHARE = 0.3; // this part at most; other words in play fill the rest
  const PAIR_SHARE = 0.1; // a pair that is the focus comes alone this seldom,
  const PAIR_ALONE = 2; // and this often in a round at most: its round is words that hold it
  const TWICE = 2; // a word comes at most this often in a round
  const MEET_ALONE = 4; // a new letter opens its first round alone this many times,
  const MEET_PAIRS = 3; // then in this many of its commonest pairs,
  const MEET_TIMES = 2; // each this many times
  const DRILL_PAIRS = 6; // the pairs of a letter that come when its words are few
  const RANK_SOFT = 10; // a word's weight is one over the root of its rank plus this
  const AWAY = 7; // after this many days away the first round is a warm-up with no focus

  /* The child's round. */
  const CHILD_TARGETS = 10;
  const CHILD_FOCUS = 4; // of them, the focus letter
  const GAP_MIN = 300; // ms of quiet before the next key lights,
  const GAP_MAX = 700; // varied, so that he reacts and does not drum
  const QUICK = 1500; // ms: a right tap this fast earns a sparkle
  const REST_AFTER = 3; // rounds, then a quiet stopping point

  const AVERAGE_OVER = 20; // a round is compared with the mean of this many before it
  const ROUNDS_KEPT = 200;
  const EVIDENCE = 2; // presses that fit another keyboard before the engine switches to it
  const NEAR = 0.75; // key widths: how far a touch may fall from a live key
  const SIZE = {width: 760, height: 500, child: 1000}; // CSS pixels: the smallest page for the drawn keyboard

  /* The American key shape, fifteen key widths across: where each row's first
     key starts. The key beside the left Shift of European boards is not drawn. */
  const ROW_X = [0, 1.5, 1.75, 2.25];
  const QUIET = [
    {code: 'Backspace', row: 0, x: 13, w: 2},
    {code: 'Tab', row: 1, x: 0, w: 1.5},
    {code: 'CapsLock', row: 2, x: 0, w: 1.75},
    {code: 'Enter', row: 2, x: 12.75, w: 2.25}
  ];
  const SHIFTS = [
    {code: 'ShiftLeft', row: 3, x: 0, w: 2.25, hand: 'left'},
    {code: 'ShiftRight', row: 3, x: 12.25, w: 2.75, hand: 'right'}
  ];
  /* The ten-finger assignment, by the key's place. */
  const FINGER_KEYS = {
    'left little': 'Backquote Digit1 KeyQ KeyA KeyZ IntlBackslash',
    'left ring': 'Digit2 KeyW KeyS KeyX',
    'left middle': 'Digit3 KeyE KeyD KeyC',
    'left index': 'Digit4 Digit5 KeyR KeyT KeyF KeyG KeyV KeyB',
    'right index': 'Digit6 Digit7 KeyY KeyU KeyH KeyJ KeyN KeyM',
    'right middle': 'Digit8 KeyI KeyK Comma',
    'right ring': 'Digit9 KeyO KeyL Period',
    'right little': 'Digit0 Minus Equal KeyP BracketLeft BracketRight Backslash Semicolon Quote Slash'
  };
  const INNER = 'Digit5 Digit6 KeyT KeyY KeyG KeyH KeyB KeyN';
  const OUTER = 'Backquote Minus Equal BracketLeft BracketRight Backslash Quote IntlBackslash';
  /* The keys of a real keyboard that the three rows of a touch keyboard
     stand over, so a record can follow its learner from one to the other. */
  const GLASS_SEATS = ['KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP BracketLeft', 'KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon Quote',
    'KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash'].map((row) => row.split(' '));
  const TWOS = ['لا', 'لأ', 'لإ', 'لآ']; // the keys that type two letters at once
  const ENDS = 'ةى'; // letters that only end a word, so no pair begins with them
  const NO_JOIN = 'اأإآدذرزوؤةىء'; // letters that do not join to the one after them

  /* A learner's record of one character is [n, t, a, ok, day]: timed presses,
     smoothed time in ms, smoothed accuracy, known once, the last day practiced.
     Of a pair it is [n, t]. A record on one keyboard also keeps `played`, the
     rounds finished on it, and `since`, the rounds since a character was earned. */
  const N = 0;
  const TIME = 1;
  const ACC = 2;
  const OK = 3;
  const DAY = 4;

  const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
  const whole = (x) => (typeof x === 'number' && isFinite(x) && x > 0 ? Math.floor(x) : 0);
  const listed = (text) => { const set = {}; text.split(' ').forEach((s) => { set[s] = true; }); return set; };
  const inner = listed(INNER);
  const outer = listed(OUTER);
  const fingerOf = {};
  Object.keys(FINGER_KEYS).forEach((f) => FINGER_KEYS[f].split(' ').forEach((code) => { fingerOf[code] = f; }));

  const effort = (key, level) => (key.row > 3 ? 1 : ROW_EFFORT[key.row] * FINGER_EFFORT[key.finger]
    * (inner[key.code] ? REACH_INNER : outer[key.code] ? REACH_OUTER : 1))
    * (level & 1 ? SHIFT_EFFORT : 1) * (level & 2 ? ALTGR_EFFORT : 1);

  /* ---------- The data, read once ---------- */

  let book = null;
  const read = (data) => {
    if (book && book.from.layouts === data.layouts && book.from.stats === data.stats && book.from.words === data.words) return book;
    const stats = data.stats;
    const letter = stats.letters; // each letter's share
    const mark = {}; // each mark's share of the marks
    const markName = {};
    Object.keys(stats.markChars).forEach((name) => { mark[stats.markChars[name]] = stats.marks[name]; markName[stats.markChars[name]] = name; });
    const useful = (s) => !!s && s.split('').every((c) => c in letter || c in mark);
    const pairList = Object.keys(stats.pairs).sort((a, b) => stats.pairs[b] - stats.pairs[a]);
    const words = data.words.words;
    const wordLetters = words.map((w) => w.split('').filter((c, i, all) => all.indexOf(c) === i));
    const wordWeight = words.map((w, i) => 1 / Math.sqrt(i + RANK_SOFT)); // a commoner word counts for more
    const wordsWith = {};
    wordLetters.forEach((list, i) => list.forEach((c) => { (wordsWith[c] = wordsWith[c] || []).push(i); }));
    const voweled = data.words.voweled.map((s) => ({s: s, letters: s.split('').filter((c) => !(c in mark))}));

    const finish = (raw, keys, extra, touch) => {
      const lay = {id: raw.id, touch: touch, option: raw.platform === 'macos', width: touch ? 11 : 15, keys: keys, byCode: {}, extra: extra, ways: {}};
      keys.forEach((k) => { lay.byCode[k.code] = k; });
      keys.forEach((k) => k.levels.forEach((s, level) => {
        if (!s) return;
        const e = touch ? 1 : effort(k, level);
        if (!lay.ways[s] || e < lay.ways[s].effort) lay.ways[s] = {code: k.code, shift: !!(level & 1), altgr: !!(level & 2), effort: e, seat: (k.seat || k.code) + level};
      }));
      const priority = (shares) => (a, b) => shares[b] / lay.ways[b].effort - shares[a] / lay.ways[a].effort;
      lay.letters = Object.keys(letter).filter((c) => lay.ways[c]).sort(priority(letter));
      lay.marks = touch ? [] : Object.keys(mark).filter((c) => lay.ways[c]).sort(priority(mark));
      lay.twos = TWOS.filter((t) => lay.ways[t]);
      lay.numberRow = keys.some((k) => k.row === 0 && (k.levels[0] || k.levels[1]));
      lay.orders = {};
      return lay;
    };
    /* A real keyboard: the four rows of the file on the American key shape. */
    const physical = (raw) => {
      const keys = [];
      const extra = {};
      raw.rows.slice(0, 4).forEach((row, r) => {
        let x = ROW_X[r];
        row.forEach((k) => {
          const place = (fingerOf[k.code] || 'right little').split(' ');
          const key = {code: k.code, row: r, x: x, w: k.code === 'Backslash' ? 1.5 : 1, hand: place[0], finger: place[1],
            levels: [k.base, k.shift, k.altgr, k.altgrShift].map((s) => (useful(s) ? s : ''))};
          if (k.code === 'IntlBackslash') { extra[k.code] = key; return; }
          keys.push(key);
          x += key.w;
        });
      });
      keys.push({code: 'Space', row: 4, x: 3.75, w: 6.25, hand: 'both', finger: 'thumb', levels: [' ', ' ', '', '']});
      return finish(raw, keys, extra, false);
    };
    /* A keyboard of a touch screen: three rows of letters, each centered, and
       no Shift. Its keys are named by their place. */
    const glass = (raw) => {
      const keys = [];
      raw.rows.forEach((row, r) => row.forEach((k, i) => {
        if (k.base === ' ') { keys.push({code: 'Space', row: 4, x: 2.5, w: 6, hand: 'both', finger: 'thumb', levels: [' ', '', '', '']}); return; }
        if (!useful(k.base)) return;
        const x = (11 - row.length) / 2 + i;
        keys.push({code: 'T' + (r + 1) + '_' + i, seat: (GLASS_SEATS[r] || [])[i] || '', row: r + 1, x: x, w: 1, hand: x + 0.5 < 5.5 ? 'left' : 'right', finger: '',
          levels: [k.base, '', '', '']});
      }));
      return finish(raw, keys, {}, true);
    };
    const layouts = {};
    data.layouts.layouts.forEach((raw) => { layouts[raw.id] = raw.kind === 'touch' ? glass(raw) : physical(raw); });
    book = {from: data, letter: letter, mark: mark, markName: markName, markLetters: stats.markLetters, pairs: stats.pairs, pairList: pairList,
      pairTop: stats.pairs[pairList[0]], spaceShare: 1 / (stats.wordLength + 1), words: words, wordLetters: wordLetters, wordWeight: wordWeight, wordsWith: wordsWith,
      voweled: voweled, layouts: layouts};
    return book;
  };

  const typed = (lay, code, shift, altgr) => {
    const key = lay.byCode[code] || lay.extra[code];
    return key ? key.levels[(altgr ? 2 : 0) + (shift ? 1 : 0)] : '';
  };

  /* The letter that comes after these, on this keyboard. The first six are
     the six of highest priority, which are the commonest letters of the home
     row. After them comes, of the three with the highest priority, the one
     that opens the most practice: the words it makes typeable, a common word
     counting for more than a rare one. */
  const nextLetter = (B, lay, have) => {
    const name = have.join('');
    if (name in lay.orders) return lay.orders[name];
    const had = {};
    have.forEach((c) => { had[c] = true; });
    const rest = lay.letters.filter((c) => !had[c]);
    let open = rest.filter((c) => have.length >= SHIFT_AFTER || !(lay.ways[c].shift || lay.ways[c].altgr));
    if (!open.length) open = rest;
    let best = '';
    let most = -1;
    open.slice(0, have.length < START.grown ? 1 : CHOICE).forEach((c) => {
      had[c] = true;
      let gain = 0;
      (B.wordsWith[c] || []).forEach((i) => { if (B.wordLetters[i].every((l) => had[l])) gain += B.wordWeight[i]; });
      had[c] = false;
      if (gain > most) { most = gain; best = c; }
    });
    lay.orders[name] = best;
    return best;
  };
  const lettersAfter = (B, lay, have) => {
    const all = have.slice();
    for (let c = nextLetter(B, lay, all); c; c = nextLetter(B, lay, all)) all.push(c);
    return all.slice(have.length);
  };
  /* The order of introduction on a keyboard: the letters for everyone; the
     marks and the lam-alef keys for the grown-up. */
  const order = (data, id, player) => {
    const B = read(data);
    const lay = B.layouts[id];
    if (!lay) return null;
    return {letters: lettersAfter(B, lay, []), marks: player === 'child' ? [] : lay.marks.slice(), twos: player === 'child' ? [] : lay.twos.slice()};
  };

  /* How well a character is known, from 0 to 1: fast, accurate and seen enough. */
  const conf = (rec, L, T) => {
    if (!rec || !rec[N]) return 0;
    return Math.min(1, T / rec[TIME]) * clamp((rec[ACC] - L.aLow) / (L.aHigh - L.aLow), 0, 1) * Math.min(1, rec[N] / L.nMin);
  };
  const sample = (rec, dt, alpha) => {
    const x = rec[N] >= CLIP_AFTER ? Math.min(dt, CLIP * rec[TIME]) : dt;
    rec[TIME] += Math.max(alpha, 1 / (rec[N] + 1)) * (x - rec[TIME]);
    rec[N] += 1;
  };

  /* ---------- The saved state ---------- */

  const blank = () => ({v: VERSION, player: '', layout: DEFAULT_LAYOUT, way: 'auto', target: 0, marks: false, all: false, stats: {}, rounds: []});
  const emptyProfile = () => ({have: [], fresh: '', chars: {}, pairs: {}, day: 0, newDay: 0, newCount: 0, since: 0, played: 0});
  const cleanProfile = (B, lay, raw) => {
    const p = emptyProfile();
    if (!raw || typeof raw !== 'object') return p;
    if (Array.isArray(raw.have)) raw.have.forEach((c) => { if (typeof c === 'string' && c !== ' ' && lay.ways[c] && c.length <= 2 && p.have.indexOf(c) < 0 && (c.length === 1 || TWOS.indexOf(c) >= 0)) p.have.push(c); });
    if (raw.chars && typeof raw.chars === 'object') {
      Object.keys(raw.chars).forEach((c) => {
        const r = raw.chars[c];
        if (!lay.ways[c] || !Array.isArray(r) || !(r[TIME] > 0) || !isFinite(r[TIME]) || !(r[ACC] >= 0 && r[ACC] <= 1)) return;
        p.chars[c] = [whole(r[N]), r[TIME], r[ACC], r[OK] ? 1 : 0, whole(r[DAY])];
      });
    }
    if (raw.pairs && typeof raw.pairs === 'object') {
      Object.keys(raw.pairs).forEach((pair) => {
        const r = raw.pairs[pair];
        if (B.pairs[pair] && Array.isArray(r) && r[TIME] > 0 && isFinite(r[TIME]) && whole(r[N])) p.pairs[pair] = [whole(r[N]), r[TIME]];
      });
    }
    if (typeof raw.fresh === 'string' && p.have.indexOf(raw.fresh) >= 0) p.fresh = raw.fresh;
    p.day = whole(raw.day);
    p.newDay = whole(raw.newDay);
    p.newCount = whole(raw.newCount);
    p.since = whole(raw.since);
    p.played = whole(raw.played) || 1; // what was saved is the learner's own
    return p;
  };
  /* Whatever was saved, made safe: a missing, old or damaged state gives a
     fresh one, and a damaged part is dropped without the rest. */
  const load = (B, saved) => {
    const state = blank();
    let s = saved;
    if (typeof s === 'string') { try { s = JSON.parse(s); } catch (e) { s = null; } }
    if (!s || typeof s !== 'object' || s.v !== VERSION) return state;
    if (PLAYERS.indexOf(s.player) >= 0) state.player = s.player;
    if (typeof s.layout === 'string' && OFFERED.some((o) => o.id === s.layout) && B.layouts[s.layout]) state.layout = s.layout;
    if (WAYS.indexOf(s.way) >= 0) state.way = s.way;
    if (s.target === 1 || s.target === 2) state.target = s.target;
    state.marks = s.marks === true;
    state.all = s.all === true;
    const stats = s.stats && typeof s.stats === 'object' ? s.stats : {};
    PLAYERS.forEach((player) => WAYS.forEach((way) => {
      const set = stats[player] && typeof stats[player] === 'object' && stats[player][way];
      if (!set || typeof set !== 'object') return;
      Object.keys(set).forEach((id) => {
        if (!B.layouts[id]) return;
        const p = cleanProfile(B, B.layouts[id], set[id]);
        if (!p.have.length && !Object.keys(p.chars).length) return;
        state.stats[player] = state.stats[player] || {};
        state.stats[player][way] = state.stats[player][way] || {};
        state.stats[player][way][id] = p;
      });
    }));
    if (Array.isArray(s.rounds)) {
      s.rounds.forEach((r) => {
        if (Array.isArray(r) && PLAYERS.indexOf(r[0]) >= 0 && WAYS.indexOf(r[1]) >= 0 && B.layouts[r[2]] && isFinite(r[4]) && isFinite(r[5])) {
          state.rounds.push([r[0], r[1], r[2], whole(r[3]), whole(r[4]), clamp(whole(r[5]), 0, 100)]);
        }
      });
      state.rounds = state.rounds.slice(-ROUNDS_KEPT);
    }
    return state;
  };
  const snapshot = (state) => {
    const out = {v: VERSION, player: state.player, layout: state.layout, way: state.way, target: state.target, marks: state.marks, all: state.all, stats: {}, rounds: state.rounds.map((r) => r.slice())};
    Object.keys(state.stats).forEach((player) => Object.keys(state.stats[player]).forEach((way) => Object.keys(state.stats[player][way]).forEach((id) => {
      const p = state.stats[player][way][id];
      if (!p.played) return;
      const copy = {have: p.have.slice(), fresh: p.fresh, chars: {}, pairs: {}, day: p.day, newDay: p.newDay, newCount: p.newCount, since: p.since, played: p.played};
      Object.keys(p.chars).forEach((c) => { const r = p.chars[c]; copy.chars[c] = [r[N], Math.max(1, Math.round(r[TIME])), Math.round(r[ACC] * 1000) / 1000, r[OK], r[DAY]]; });
      Object.keys(p.pairs).forEach((c) => { copy.pairs[c] = [p.pairs[c][N], Math.max(1, Math.round(p.pairs[c][TIME]))]; });
      out.stats[player] = out.stats[player] || {};
      out.stats[player][way] = out.stats[player][way] || {};
      out.stats[player][way][id] = copy;
    })));
    return out;
  };

  /* ---------- A game ---------- */

  const start = (opts) => {
    const B = read(opts);
    const random = opts.random || Math.random;
    let state = load(B, opts.saved);
    let way = WAYS.indexOf(opts.way) >= 0 ? opts.way : 'keys';
    let run = null; // the round under way
    let last = null; // the last round's end
    let armed = ''; // the Shift that was tapped and waits for its key
    let sitting = 0; // rounds finished since the page opened
    let evidence = {}; // presses that fit another keyboard, by keyboard
    let frame = null; // the small version's last window

    const child = () => state.player === 'child';
    const rules = () => (child() ? LEARN.child : LEARN.grown);
    const glassy = () => way !== 'keys';
    const layout = () => {
      const lay = B.layouts[state.layout] || B.layouts[DEFAULT_LAYOUT];
      return lay.touch && way === 'keys' ? B.layouts[DEFAULT_LAYOUT] : lay;
    };
    const targetCpm = () => TARGETS[glassy() ? 'glass' : 'keys'][state.target];
    const targetTime = () => (child() ? CHILD_TIME[glassy() ? 'glass' : 'keys'] : 60000 / targetCpm());
    const marksOn = () => !child() && way === 'keys' && state.marks && layout().marks.length > 0;
    const isLetter = (c) => c in B.letter;
    const isMark = (c) => c in B.mark;
    const kindOf = (item) => (item.length === 2 ? 'key' : isMark(item) ? 'mark' : 'letter');
    const shareOf = (c) => (c === ' ' ? B.spaceShare : isMark(c) ? B.mark[c] : B.letter[c] || 0);

    /* A keyboard with no record of its own starts from the record of the
       keyboard this player has practiced most in the same way: every
       character and pair whose keys sit in the same place on both is kept,
       so only what moved is learned again. The other record is not touched. */
    const adopt = (set, lay) => {
      const p = emptyProfile();
      let from = '';
      Object.keys(set).forEach((id) => { if (id !== lay.id && B.layouts[id] && set[id].played > (from ? set[from].played : 0)) from = id; });
      if (!from) return p;
      const old = set[from];
      const there = B.layouts[from].ways;
      const same = (c) => !!lay.ways[c] && !!there[c] && lay.ways[c].seat === there[c].seat;
      p.have = old.have.filter(same);
      Object.keys(old.chars).forEach((c) => { if (same(c)) p.chars[c] = old.chars[c].slice(); });
      Object.keys(old.pairs).forEach((pair) => { if (same(pair[0]) && same(pair[1])) p.pairs[pair] = old.pairs[pair].slice(); });
      if (p.have.indexOf(old.fresh) >= 0) p.fresh = old.fresh;
      p.day = old.day;
      p.newDay = old.newDay;
      p.newCount = old.newCount;
      p.since = old.since;
      return p;
    };
    /* The current learner's record on the current keyboard and way, with the
       first letters in play. */
    const profile = () => {
      const player = state.player || 'grown';
      const lay = layout();
      const ways = state.stats[player] = state.stats[player] || {};
      const set = ways[way] = ways[way] || {};
      const p = set[lay.id] = set[lay.id] || adopt(set, lay);
      for (let n = p.have.filter(isLetter).length; n < START[player]; n++) {
        const c = nextLetter(B, lay, p.have.filter(isLetter));
        if (!c) break;
        p.have.push(c);
      }
      return p;
    };
    /* What is in play: the letters, the marks and the two-letter keys, and a
       set of every single character a round may hold. */
    const playing = (p) => {
      const lay = layout();
      const had = p.have.filter(isLetter);
      const letters = !child() && state.all ? had.concat(lettersAfter(B, lay, had)) : had;
      const marks = marksOn() ? p.have.filter(isMark) : [];
      const twos = child() ? [] : state.all ? lay.twos.slice() : p.have.filter((c) => c.length === 2);
      const set = {};
      letters.concat(marks).forEach((c) => { set[c] = true; });
      const twoSet = {};
      twos.forEach((c) => { twoSet[c] = true; });
      return {letters: letters, marks: marks, twos: twos, set: set, twoSet: twoSet};
    };
    const stat = (p, item) => (p.chars[item] = p.chars[item] || [0, targetTime(), 1, 0, 0]);
    const kOf = (p, item) => conf(p.chars[item], rules(), targetTime());
    const pairScore = (p, pair) => {
      const rec = p.pairs[pair];
      const slow = rec && rec[N] >= PAIR_MIN ? Math.max(0, rec[TIME] / targetTime() - 1) : 1;
      return B.pairs[pair] / B.pairTop * slow;
    };
    /* What the round is about: the character just earned; or the weakest one
       in play, the commoner on a tie; or, when all are known, the common pair
       that is still slow. */
    const chooseFocus = (p, play, warm) => {
      if (warm) return '';
      if (p.fresh && (play.set[p.fresh] || play.twoSet[p.fresh])) return p.fresh;
      let low = '';
      let lowK = 2;
      play.letters.concat(child() ? [] : [' '], play.marks).forEach((c) => {
        const k = kOf(p, c);
        if (k < lowK - 1e-9 || (Math.abs(k - lowK) <= 1e-9 && shareOf(c) > shareOf(low))) { low = c; lowK = k; }
      });
      if (lowK < KNOWN) return low;
      if (child()) return '';
      let best = '';
      let most = 0;
      B.pairList.forEach((pair) => {
        if (!play.set[pair[0]] || !play.set[pair[1]] || play.twoSet[pair]) return; // a pair with a key of its own is not timed as a pair
        const score = pairScore(p, pair);
        if (score > most + 1e-9) { most = score; best = pair; }
      });
      return best;
    };

    /* The pairs of a letter among the letters in play, commonest first. */
    const pairsOf = (c, play) => B.pairList.filter((pair) => pair.indexOf(c) >= 0 && play.set[pair[0]] && play.set[pair[1]]
      && isLetter(pair[0]) && isLetter(pair[1]) && ENDS.indexOf(pair[0]) < 0);
    /* The letters in play that carry a mark, the commonest carrier first. */
    const carriers = (m, play) => {
      const shares = B.markLetters[B.markName[m]] || {};
      const list = Object.keys(shares).filter((l) => play.set[l]).sort((a, b) => shares[b] - shares[a]);
      return list.length ? list : play.letters.slice(0, 4);
    };
    /* How a character just earned opens its first round: alone four times,
       then in its three commonest pairs, twice each. A mark sits on the
       letters that carry it most. */
    const opening = (item, play) => {
      const out = [];
      const rest = isMark(item) ? carriers(item, play).map((l) => l + item) : item.length === 1 ? pairsOf(item, play) : [];
      const alone = isMark(item) ? rest.shift() : item;
      for (let i = 0; i < MEET_ALONE; i++) out.push(alone);
      for (let t = 0; t < MEET_TIMES; t++) rest.slice(0, MEET_PAIRS).forEach((s) => out.push(s));
      return out;
    };
    /* What comes beside the words when few words hold the focus: the letter
       alone and its commonest pairs; no invented words. */
    const drillsFor = (focus, play) => {
      if (isMark(focus)) return carriers(focus, play).slice(0, DRILL_PAIRS).map((l, i) => ({s: l + focus, w: 1 / (i + 1)}));
      if (focus.length === 2) return [{s: focus, w: 1}];
      const pairs = pairsOf(focus, play).slice(0, DRILL_PAIRS).map((pair) => ({s: pair, w: B.pairs[pair]}));
      return [{s: focus, w: pairs.length ? 2 * pairs[0].w : 1}].concat(pairs);
    };
    const pick = (list, ok) => {
      let total = 0;
      list.forEach((c) => { if (ok(c)) total += c.w; });
      if (!(total > 0)) return null;
      let x = random() * total;
      let found = null;
      for (let i = 0; i < list.length; i++) {
        if (!ok(list[i])) continue;
        found = list[i];
        x -= found.w;
        if (x <= 0) break;
      }
      return found;
    };

    /* A grown-up's round: real words whose letters are all in play, drawn by
       weight (commoner words, weak letters, weak common pairs). Words that
       hold the focus come first; when they are few, the letter alone and its
       pairs take a part of the round and other words in play fill the rest.
       A pair that is the focus is practiced inside words, and alone only
       once or twice. */
    const compose = (p, play, focus, fresh) => {
      const L = rules();
      const T = targetTime();
      const known = {};
      const k = (c) => (c in known ? known[c] : (known[c] = conf(p.chars[c], L, T)));
      const pairK = (pair) => { const rec = p.pairs[pair]; return rec ? Math.min(1, T / rec[TIME]) * Math.min(1, rec[N] / PAIR_MIN) : 0; };
      const weigh = (s, f) => {
        let lack = 0;
        let count = 0;
        let pairLack = 0;
        let pairCount = 0;
        for (let i = 0; i < s.length; i++) {
          lack += 1 - k(s[i]);
          count += 1;
          const pair = i ? s[i - 1] + s[i] : '';
          if (pair && play.twoSet[pair]) { lack += 1 - k(pair); count += 1; } else if (pair && B.pairs[pair]) { pairLack += B.pairs[pair] / B.pairTop * (1 - pairK(pair)); pairCount += 1; }
        }
        return f * (1 + 2 * lack / count + (pairCount ? 2 * pairLack / pairCount : 0));
      };
      const cands = [];
      const seen = {};
      const add = (s, i) => { if (!seen[s]) { seen[s] = true; cands.push({s: s, w: weigh(s, 1 / Math.sqrt(i + RANK_SOFT))}); } };
      if (play.marks.length) {
        B.voweled.forEach((v, i) => {
          if (v.letters.every((c) => play.set[c])) add(v.s.split('').filter((c) => !isMark(c) || play.set[c]).join(''), i);
        });
      }
      if (cands.length < FEW_WORDS) B.words.forEach((w, i) => { if (B.wordLetters[i].every((c) => play.set[c])) add(w, i); });
      const need = focus === ' ' ? '' : focus;
      const pairAim = need.length === 2 && need !== fresh; // two letters in a row, not a key of two letters just earned
      let pool = need ? cands.filter((c) => c.s.indexOf(need) >= 0) : cands;
      let drills = pairAim ? (seen[need] ? [] : [{s: need, w: 1}]) : need && pool.length < FEW_WORDS ? drillsFor(need, play) : []; // a pair that is a word comes as that word
      if (!pool.length && !drills.length) pool = cands;
      if (!pool.length && !drills.length) drills = [{s: play.letters[0], w: 1}];
      const limit = play.letters.length <= START.grown ? LENGTH_FIRST : LENGTH;
      const parts = [];
      const used = {};
      let size = 0;
      let prev = '';
      const room = (s) => size + (parts.length ? 1 : 0) + s.length <= limit;
      const put = (s) => { size += (parts.length ? 1 : 0) + s.length; parts.push(s); used[s] = (used[s] || 0) + 1; prev = s; };
      if (fresh) opening(fresh, play).forEach((s) => { if (room(s)) put(s); });
      Object.keys(used).forEach((s) => { used[s] = 0; });
      const share = pairAim ? PAIR_SHARE : cands.length ? Math.min(DRILL_SHARE, 1 - pool.length / FEW_WORDS) : 1;
      let alone = pairAim ? PAIR_ALONE : 200; // how often a drill may still come
      const free = (c) => c.s !== prev && (used[c.s] || 0) < TWICE;
      const word = () => pick(pool, free) || pick(cands, free);
      const drill = () => (alone > 0 ? pick(drills, (c) => c.s !== prev && (!seen[c.s] || (used[c.s] || 0) < TWICE)) : null); // a pair that is a word keeps to a word's limit
      for (let misses = 0; misses < 6 && parts.length < 200;) {
        let item = drills.length && random() < share ? drill() || word() : word() || drill();
        if (!item) item = pick(cands, (c) => c.s !== prev) || pick(drills, () => true) || pick(cands, () => true);
        if (!item) break;
        if (!room(item.s)) { misses += 1; continue; }
        if (drills.indexOf(item) >= 0) alone -= 1;
        put(item.s);
        misses = 0;
      }
      if (!parts.length) put((pool[0] || drills[0]).s);
      return parts.join(' ');
    };

    /* The child's round: ten letters, one at a time; the focus letter four
       times, the rest by weakness, and never one letter three times running. */
    const targets = (p, play, focus) => {
      const others = play.letters.filter((c) => c !== focus).map((c) => ({s: c, w: 1 + 2 * (1 - kOf(p, c))}));
      const bag = [];
      for (let i = 0; focus && i < CHILD_FOCUS; i++) bag.push(focus);
      while (bag.length < CHILD_TARGETS) bag.push((pick(others, () => true) || {s: play.letters[0]}).s);
      const runs = () => bag.some((c, i) => i > 1 && c === bag[i - 1] && c === bag[i - 2]);
      for (let tries = 0; tries < 30; tries++) {
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          const held = bag[i];
          bag[i] = bag[j];
          bag[j] = held;
        }
        if (!runs()) break;
      }
      for (let i = 2; i < bag.length; i++) {
        if (bag[i] !== bag[i - 1] || bag[i] !== bag[i - 2]) continue;
        const other = play.letters.filter((c) => c !== bag[i])[0];
        if (other) bag[i] = other;
      }
      return bag.join('');
    };

    /* ---------- What to light ---------- */

    const guide = () => {
      if (!run) return null;
      const lay = layout();
      const c = run.chars[run.pos];
      const next = run.chars[run.pos + 1] || '';
      const item = run.twos[c + next] ? c + next : c;
      const how = lay.ways[item];
      const key = lay.byCode[how.code];
      const shiftKey = how.shift && !lay.touch ? (key.hand === 'left' ? 'ShiftRight' : 'ShiftLeft') : '';
      let light = [how.code];
      if (shiftKey && way === 'keys') light = [how.code, shiftKey];
      if (shiftKey && way === 'touch' && !armed) light = [shiftKey];
      return {pos: run.pos, char: item, code: how.code, shift: how.shift, altgr: how.altgr, shiftKey: shiftKey, hand: key.hand, finger: key.finger,
        two: item.length === 2, light: light, held: armed ? [armed] : [], wait: run.wait};
    };

    /* The small version's window: the target's key between its two neighbors
       in its row, and the three keys of the row beside it that sit nearest,
       so the six are in their real places. A space keeps the last window. */
    const windowOf = () => {
      const g = guide();
      if (!g) return null;
      const lay = layout();
      const key = lay.byCode[g.code];
      const level = g.shift ? 1 : 0;
      if (key.code === 'Space' && frame) return {rows: frame.rows.map((row) => row.map((k) => Object.assign({}, k, {target: false}))), shift: false, space: true};
      const rowOf = (r) => lay.keys.filter((k) => k.row === r && k.row < 4);
      const mine = rowOf(key.row);
      const at = clamp(mine.indexOf(key) - 1, 0, Math.max(0, mine.length - 3));
      const trio = mine.slice(at, at + 3);
      const middle = (list) => (list[0].x + list[list.length - 1].x + list[list.length - 1].w) / 2;
      const beside = rowOf(key.row === 3 ? 2 : key.row === 2 ? 1 : key.row + 1);
      let near = beside.slice(0, 3);
      for (let i = 0; i + 3 <= beside.length; i++) {
        if (Math.abs(middle(beside.slice(i, i + 3)) - middle(trio)) < Math.abs(middle(near) - middle(trio))) near = beside.slice(i, i + 3);
      }
      const show = (k) => {
        const s = k.levels[level];
        return {code: k.code, char: s, live: !!s && (!child() || !!run.live[s]), target: k === key, row: k.row, x: k.x};
      };
      const rows = (trio[0].row < near[0].row ? [trio, near] : [near, trio]).map((row) => row.map(show));
      frame = {rows: rows};
      return {rows: rows, shift: g.shift, space: false};
    };

    /* The key nearest a touch: x in key widths from the left edge, y in rows
       from the top of the number row. For the child only keys in play count. */
    const nearest = (x, y) => {
      const lay = layout();
      const play = playing(profile());
      const alive = (k) => k.levels.some((s) => s && (!child() || play.set[s]));
      const shifty = !lay.touch && way === 'touch' && (!child() || play.letters.some((c) => lay.ways[c].shift));
      let best = '';
      let least = NEAR;
      lay.keys.filter(alive).concat(shifty ? SHIFTS : []).forEach((k) => {
        const d = Math.hypot(Math.max(k.x - x, 0, x - k.x - k.w), Math.max(k.row - y, 0, y - k.row - 1));
        if (d <= least) { least = d; best = k.code; }
      });
      return best;
    };

    /* ---------- The end of a round ---------- */

    /* After enough rounds with nothing earned the gates open by themselves. */
    const patient = (p) => p.since >= rules().patience;
    const gate = (p, items, accuracy) => patient(p) || (accuracy >= rules().pass
      && items.every((c) => p.chars[c] && p.chars[c][OK] && kOf(p, c) >= GUARD));
    /* Whether a two-letter key can be taught: its two letters are known, and
       for the plain one a key of the same row under the index finger is in
       play; the Shift ones follow the plain one. */
    const twoReady = (p, play, item) => {
      const lay = layout();
      const how = lay.ways[item];
      const ok = (c) => play.set[c] && (patient(p) || (p.chars[c] && p.chars[c][OK]));
      if (!how || play.twoSet[item] || !ok(item[0]) || !ok(item[1])) return false;
      if (how.shift) return lay.twos[0] === item || !!play.twoSet[lay.twos[0]];
      const key = lay.byCode[how.code];
      return lay.keys.some((k) => k !== key && k.row === key.row && k.finger === 'index' && play.set[k.levels[0]]);
    };
    /* The character earned by this round, if any: one at most, and for the
       child two in a day at most. */
    const earn = (p, accuracy, day) => {
      const lay = layout();
      const play = playing(p);
      const had = p.have.filter(isLetter);
      if (child()) {
        const today = day && p.newDay === day ? p.newCount : 0;
        if (today >= CHILD_NEW || !gate(p, play.letters, accuracy)) return '';
        const c = nextLetter(B, lay, had);
        if (c) { p.newDay = day; p.newCount = today + 1; }
        return c;
      }
      if (accuracy < rules().pass && !patient(p)) return '';
      const two = state.all ? '' : lay.twos.filter((t) => twoReady(p, play, t))[0];
      if (two) return two;
      if (marksOn() && gate(p, play.marks, accuracy)) {
        const m = lay.marks.filter((c) => !play.set[c])[0];
        if (m) return m;
      }
      if (!state.all && gate(p, play.letters.concat([' ']), accuracy)) return nextLetter(B, lay, had);
      return '';
    };
    const finish = () => {
      const r = run;
      const p = r.profile;
      const id = layout().id;
      const accuracy = r.total ? r.clean / r.total : 1;
      const cpm = r.active > 0 ? Math.round((r.total - r.firstAdvance) * 60000 / r.active) : 0;
      const percent = Math.round(accuracy * 100);
      const before = state.rounds.filter((x) => x[0] === state.player && x[1] === way && x[2] === id).slice(-AVERAGE_OVER);
      const mean = (i) => before.reduce((sum, x) => sum + x[i], 0) / before.length;
      state.rounds.push([state.player, way, id, r.day, cpm, percent]);
      state.rounds = state.rounds.slice(-ROUNDS_KEPT);
      if (r.fresh && p.fresh === r.fresh) p.fresh = '';
      if (r.day) p.day = r.day;
      p.played += 1;
      p.since += 1;
      /* A character just earned waits for its own round before the next is
         earned; one that is out of play (a mark, with the marks off) does not. */
      const play = playing(p);
      const waits = !!p.fresh && !!(play.set[p.fresh] || play.twoSet[p.fresh]);
      const item = waits ? '' : earn(p, accuracy, r.day);
      if (item) { p.have.push(item); p.fresh = item; p.since = 0; }
      sitting += 1;
      run = null;
      armed = '';
      const how = item ? layout().ways[item] : null;
      last = {
        cpm: cpm, accuracy: percent,
        cpmDiff: before.length ? Math.round(cpm - mean(4)) : null,
        accuracyDiff: before.length ? Math.round(percent - mean(5)) : null,
        chars: r.total, mistakes: r.total - r.clean, ms: Math.round(r.active),
        unlocked: item ? {item: item, kind: kindOf(item), code: how.code, shift: how.shift} : null,
        praise: child() ? (item ? 'mashaallah' : 'well-done') : '',
        rest: child() && sitting % REST_AFTER === 0,
        focus: chooseFocus(p, playing(p), false)
      };
      return last;
    };

    /* ---------- A press ---------- */

    const ignored = (used) => ({result: 'ignored', used: !!used, guide: guide()});
    /* One key's worth of typing, s, against the text: the expected character;
       a two-letter key against the next two; two marks on one letter in
       either order. Times the press and keeps the learner's record. */
    const strike = (code, s, time) => {
      const r = run;
      const L = rules();
      const p = r.profile;
      const small = child();
      if (small && time < r.litAt) return ignored(true);
      if (small && !r.live[s]) return ignored(true);
      const g = guide();
      const exp = r.chars[r.pos];
      const next = r.chars[r.pos + 1] || '';
      let advance = 0;
      if (s.length === 2 && (s === exp + next || (isMark(exp) && isMark(next) && s === next + exp))) advance = 2;
      else if (s && s === exp) advance = 1;
      else if (s && s === next && isMark(s) && isMark(exp)) { r.chars[r.pos + 1] = exp; r.chars[r.pos] = s; advance = 1; }
      if (r.lastKey !== null && time - r.lastKey <= L.pause && time >= r.lastKey) r.active += time - r.lastKey;
      r.lastKey = time;
      if (!advance) {
        const quiet = small && r.fresh === exp && !r.met;
        if (r.first) { r.first = false; const st = stat(p, g.char); st[ACC] += L.alphaA * (0 - st[ACC]); }
        return {result: 'wrong', used: true, code: code, typed: s, advanced: 0, sound: quiet ? '' : 'wrong', guide: g};
      }
      const dt = time - (small ? r.litAt : r.doneAt);
      const timed = r.pos > 0 && r.prevFirst && r.first && dt >= DT_MIN && dt <= L.pause;
      const items = advance === 2 && TWOS.indexOf(s) < 0 ? [r.chars[r.pos], r.chars[r.pos + 1]] : [advance === 2 ? s : r.chars[r.pos]];
      items.forEach((item) => {
        const st = stat(p, item);
        if (r.first) st[ACC] += L.alphaA * (1 - st[ACC]);
        if (timed && items.length === 1) sample(st, dt, L.alpha);
        st[DAY] = r.day || st[DAY];
        if (conf(st, L, targetTime()) >= KNOWN) st[OK] = 1;
      });
      const pair = r.pos > 0 && advance === 1 ? r.chars[r.pos - 1] + r.chars[r.pos] : '';
      if (timed && pair && B.pairs[pair]) sample(p.pairs[pair] = p.pairs[pair] || [0, dt], dt, PAIR_ALPHA);
      const quick = small && r.first && dt < QUICK;
      if (r.pos === 0) r.firstAdvance = advance;
      if (r.first) r.clean += advance;
      r.total += advance;
      if (r.fresh && items[0] === r.fresh) r.met = true;
      r.prevFirst = r.first;
      r.first = true;
      r.pos += advance;
      r.doneAt = time;
      r.wait = small ? Math.round(GAP_MIN + random() * (GAP_MAX - GAP_MIN)) : 0;
      r.litAt = time + r.wait;
      const out = {result: 'right', used: true, code: code, typed: s, advanced: advance, quick: quick, sound: 'tick', wait: r.wait};
      if (r.pos >= r.chars.length) { out.end = finish(); out.guide = null; } else out.guide = guide();
      return out;
    };

    /* What the key event's own character says about the keyboard. When it is
       an Arabic character that the chosen keyboard does not have on this key
       at all, and another keyboard has it exactly here, that keyboard gains a
       point; at two the engine switches. (A browser that reports the plain
       letter for a Shift key gives no point: that letter is on this key.) */
    const witness = (e, s, altgr) => {
      const lay = layout();
      const k = e.key;
      if (lay.touch || typeof k !== 'string' || k.length !== 1 || !(isLetter(k) || isMark(k)) || k === s) return '';
      const here = lay.byCode[e.code] || lay.extra[e.code];
      if (here && here.levels.some((x) => x.indexOf(k) >= 0)) return '';
      let found = '';
      OFFERED.forEach((o) => {
        const other = B.layouts[o.id];
        if (found || !other || other === lay || other.touch || typed(other, e.code, e.shift, altgr) !== k) return;
        evidence[o.id] = (evidence[o.id] || 0) + 1;
        if (evidence[o.id] >= EVIDENCE) found = o.id;
      });
      return found;
    };
    const press = (e) => {
      const lay = layout();
      const altgr = !!e.altgr || (lay.option && !!e.alt && !e.ctrl);
      if (e.repeat || e.meta || ((e.ctrl || e.alt) && !altgr) || e.key === 'Dead' || e.key === 'Process') return ignored(false);
      if (!lay.byCode[e.code] && !lay.extra[e.code]) return ignored(false);
      const s = typed(lay, e.code, e.shift, altgr);
      const other = witness(e, s, altgr);
      if (other) {
        state.layout = other;
        drop();
        return {result: 'layout', used: true, layout: other, guide: null};
      }
      if (!run) return {result: 'idle', used: true, guide: null};
      return strike(e.code, s, e.time);
    };
    const tap = (e) => {
      const lay = layout();
      if (!run) return {result: 'idle', used: true, guide: null};
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (lay.touch || way !== 'touch') return ignored(true);
        armed = armed === e.code ? '' : e.code;
        return {result: 'shift', used: true, code: e.code, guide: guide()};
      }
      if (!lay.byCode[e.code]) return ignored(true);
      const g = guide();
      const shift = way === 'small' ? g.shift : !!armed;
      armed = '';
      return strike(e.code, typed(lay, e.code, shift, false), e.time);
    };

    /* ---------- Beginning a round ---------- */

    const round = (o) => {
      if (!state.player) return null;
      const day = whole(o && o.day);
      const time = o && isFinite(o.time) ? o.time : 0;
      const p = profile();
      const lay = layout();
      if (marksOn() && !p.have.some(isMark)) { p.have.push(lay.marks[0]); p.fresh = lay.marks[0]; }
      const play = playing(p);
      const warm = !!(p.day && day && day - p.day >= AWAY);
      const focus = chooseFocus(p, play, warm);
      const fresh = !warm && p.fresh && focus === p.fresh ? p.fresh : '';
      const text = child() ? targets(p, play, focus) : compose(p, play, focus, fresh);
      const live = {};
      play.letters.forEach((c) => { live[c] = true; });
      run = {profile: p, chars: text.split(''), pos: 0, day: day, focus: focus, fresh: fresh, met: false, twos: lay.touch ? {} : play.twoSet, live: live,
        first: true, prevFirst: true, clean: 0, total: 0, firstAdvance: 0, active: 0, lastKey: null, doneAt: time, litAt: time, wait: 0};
      armed = '';
      frame = null;
      return {kind: child() ? 'targets' : 'words', text: text, focus: focus, fresh: fresh, warm: warm, guide: guide()};
    };

    /* ---------- For the page ---------- */

    const board = () => {
      const lay = layout();
      const keys = lay.keys.filter((k) => k.row > 0 || lay.numberRow).map((k) => ({code: k.code, row: k.row, x: k.x, w: k.w,
        base: k.levels[0] === ' ' ? '' : k.levels[0], shift: k.levels[1] === ' ' ? '' : k.levels[1], hand: k.hand, finger: k.finger,
        bump: k.code === 'KeyF' || k.code === 'KeyJ', kind: k.code === 'Space' ? 'space' : 'key'}));
      if (!lay.touch) {
        SHIFTS.forEach((k) => keys.push({code: k.code, row: k.row, x: k.x, w: k.w, base: '', shift: '', hand: k.hand, finger: 'little', bump: false, kind: 'shift'}));
        QUIET.filter((k) => k.row > 0 || lay.numberRow).forEach((k) => keys.push({code: k.code, row: k.row, x: k.x, w: k.w, base: '', shift: '', hand: k.x ? 'right' : 'left', finger: 'little', bump: false, kind: 'quiet'}));
      }
      return {id: lay.id, touch: lay.touch, width: lay.width, rows: lay.numberRow ? [0, 1, 2, 3, 4] : [1, 2, 3, 4], keys: keys};
    };
    const know = (item) => {
      const p = profile();
      const play = playing(p);
      const rec = p.chars[item];
      return {play: item === ' ' ? !child() : !!(play.set[item] || play.twoSet[item]), k: kOf(p, item), n: rec ? rec[N] : 0, ok: !!(rec && rec[OK])};
    };
    const strip = () => {
      const p = profile();
      const lay = layout();
      const play = playing(p);
      const focus = run ? run.focus : chooseFocus(p, play, false);
      const had = p.have.filter(isLetter);
      let items = had.concat(lettersAfter(B, lay, had));
      if (marksOn()) items = items.concat(p.have.filter(isMark), lay.marks.filter((c) => p.have.indexOf(c) < 0));
      if (!child()) items = items.concat(p.have.filter((c) => c.length === 2), lay.twos.filter((c) => p.have.indexOf(c) < 0));
      return items.map((item) => {
        const rec = p.chars[item];
        return {item: item, kind: kindOf(item), play: !!(play.set[item] || play.twoSet[item]), focus: item === focus, k: kOf(p, item), ok: !!(rec && rec[OK])};
      });
    };
    const settings = () => ({player: state.player, layout: state.layout, way: state.way, target: state.target, marks: state.marks, all: state.all,
      playing: {way: way, layout: layout().id}, cpm: targetCpm(), marksOn: marksOn()});
    /* A change of setting ends the round under way. A record with no round
       played holds nothing of its own, and goes too, so that its keyboard
       starts from the newest record when it is next chosen. */
    function drop() {
      run = null;
      armed = '';
      evidence = {};
      frame = null;
      Object.keys(state.stats).forEach((player) => Object.keys(state.stats[player]).forEach((w) => {
        const set = state.stats[player][w];
        Object.keys(set).forEach((id) => { if (!set[id].played) delete set[id]; });
      }));
    }
    const set = (changes) => {
      const c = changes || {};
      if (PLAYERS.indexOf(c.player) >= 0) state.player = c.player;
      if (typeof c.layout === 'string' && OFFERED.some((o) => o.id === c.layout) && B.layouts[c.layout]) state.layout = c.layout;
      if (c.way === 'auto' || WAYS.indexOf(c.way) >= 0) state.way = c.way;
      if (c.target === 0 || c.target === 1 || c.target === 2) state.target = c.target;
      if (typeof c.marks === 'boolean') state.marks = c.marks;
      if (typeof c.all === 'boolean') state.all = c.all;
      drop();
      return settings();
    };
    const setWay = (w) => {
      if (WAYS.indexOf(w) >= 0 && w !== way) { way = w; drop(); }
      return way;
    };
    const reset = () => {
      delete state.stats[state.player];
      state.rounds = state.rounds.filter((r) => r[0] !== state.player);
      sitting = 0;
      last = null;
      drop();
    };
    const typesLetter = (code) => {
      const key = layout().byCode[code];
      return !!key && key.levels.some((s) => s && s !== ' ');
    };

    return {
      settings: settings, set: set, setWay: setWay, reset: reset, state: () => snapshot(state),
      layouts: () => OFFERED.filter((o) => B.layouts[o.id] && (!o.glass || glassy())).map((o) => ({id: o.id, name: o.name, glass: !!o.glass})),
      board: board, know: know, strip: strip, guide: guide, window: windowOf, nearest: nearest, typesLetter: typesLetter,
      round: round, press: press, tap: tap, active: () => !!run, last: () => last
    };
  };

  /* Which way to play: the family's choice if they made one; real keys where
     there is a mouse; the drawn keyboard where the page is large enough for
     the player's finger; the small version anywhere else. */
  const wayFor = (o) => {
    if (WAYS.indexOf(o.choice) >= 0) return o.choice;
    if (o.fine) return 'keys';
    return o.width >= (o.player === 'child' ? SIZE.child : SIZE.width) && o.height >= SIZE.height ? 'touch' : 'small';
  };
  /* Whether turning the device would give the drawn keyboard its room. */
  const turnHelps = (o) => wayFor({player: o.player, width: o.width, height: o.height}) === 'small'
    && wayFor({player: o.player, width: o.height, height: o.width}) === 'touch';

  /* A line of text cut into letters, each with the marks it carries, for a
     page that colors them one by one: at is where the piece starts in the
     text, size how many characters it holds, before and after whether it
     joins its neighbors (the page then adds a zero-width joiner on that side).
     A lam and the alef after it stay one piece: split apart they lose the
     لا ligature and show as a lam and an alef side by side. */
  const pieces = (text) => {
    const marked = (c) => c >= 'ً' && c <= 'ْ';
    const out = [];
    text.split('').forEach((c, i) => {
      const last = out[out.length - 1];
      if (marked(c) && last) { last.s += c; last.size += 1; return; }
      if ('اأإآ'.indexOf(c) >= 0 && last && last.s[0] === 'ل') { last.s += c; last.size += 1; return; }
      out.push({s: c, at: i, size: 1, space: c === ' ', before: false, after: false});
    });
    const ends = (piece) => piece.s.replace(/[ً-ْ]/g, '').slice(-1);
    out.forEach((piece, i) => {
      const next = out[i + 1];
      const joins = !!next && !piece.space && !next.space && NO_JOIN.indexOf(ends(piece)) < 0 && next.s[0] !== 'ء';
      piece.after = joins;
      if (next) next.before = joins;
    });
    return out;
  };

  const constants = {VERSION: VERSION, DEFAULT_LAYOUT: DEFAULT_LAYOUT, ROW_EFFORT: ROW_EFFORT, FINGER_EFFORT: FINGER_EFFORT, REACH_INNER: REACH_INNER,
    REACH_OUTER: REACH_OUTER, SHIFT_EFFORT: SHIFT_EFFORT, ALTGR_EFFORT: ALTGR_EFFORT, CHOICE: CHOICE, SHIFT_AFTER: SHIFT_AFTER, START: START,
    CHILD_NEW: CHILD_NEW, LEARN: LEARN, DT_MIN: DT_MIN, CLIP_AFTER: CLIP_AFTER, CLIP: CLIP, PAIR_ALPHA: PAIR_ALPHA, PAIR_MIN: PAIR_MIN, GUARD: GUARD,
    TARGETS: TARGETS, CHILD_TIME: CHILD_TIME, LENGTH_FIRST: LENGTH_FIRST, LENGTH: LENGTH, FEW_WORDS: FEW_WORDS, TWICE: TWICE, MEET_ALONE: MEET_ALONE,
    MEET_PAIRS: MEET_PAIRS, MEET_TIMES: MEET_TIMES, DRILL_PAIRS: DRILL_PAIRS, RANK_SOFT: RANK_SOFT, AWAY: AWAY, CHILD_TARGETS: CHILD_TARGETS,
    CHILD_FOCUS: CHILD_FOCUS, DRILL_SHARE: DRILL_SHARE, PAIR_SHARE: PAIR_SHARE, PAIR_ALONE: PAIR_ALONE, GAP_MIN: GAP_MIN, GAP_MAX: GAP_MAX, QUICK: QUICK, REST_AFTER: REST_AFTER, AVERAGE_OVER: AVERAGE_OVER,
    ROUNDS_KEPT: ROUNDS_KEPT, EVIDENCE: EVIDENCE, NEAR: NEAR, SIZE: SIZE};

  return {start: start, order: order, wayFor: wayFor, turnHelps: turnHelps, pieces: pieces, constants: constants, offered: OFFERED};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = typingEngine;
