/* Tests for the typing game's engine (public/js/typing-engine.js).
   Run: node tools/test-typing-engine.js
   It reads the three data files of public/typing, prints the order of
   introduction for every keyboard, plays simulated learners for some hundreds
   of rounds each, and checks the rules of the design along the way. The
   random numbers are seeded, so every run prints the same. */
const path = require('path');
const pub = path.join(__dirname, '..', 'public');
const engine = require(path.join(pub, 'js', 'typing-engine.js'));
const data = {
  layouts: require(path.join(pub, 'typing', 'layouts.json')),
  stats: require(path.join(pub, 'typing', 'stats.json')),
  words: require(path.join(pub, 'typing', 'words.json'))
};
const C = engine.constants;
const REAL = ['win-102', 'win-101', 'win-102-azerty', 'mac-arabic', 'mac-arabic-pc', 'linux-ara'];
const MARKS = Object.keys(data.stats.markChars).map((name) => data.stats.markChars[name]);
const isMark = (c) => MARKS.indexOf(c) >= 0;
const wordSet = new Set(data.words.words);

let failed = 0;
let passed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; return; }
  failed += 1;
  console.log('  FAILED: ' + name + (detail ? ' (' + detail + ')' : ''));
};
const seeded = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const show = (s) => s.split('').map((c) => (isMark(c) ? '◌' + c : c)).join('');
const begin = (o) => engine.start(Object.assign({}, data, o));

/* ---------- The order of introduction ---------- */

console.log('THE ORDER OF INTRODUCTION (letters | marks | two-letter keys)');
const orders = {};
REAL.concat(['android-phone']).forEach((id) => {
  const o = engine.order(data, id, 'grown');
  orders[id] = o;
  console.log('  ' + id.padEnd(15) + o.letters.join(' ') + ' | ' + o.marks.map(show).join(' ') + ' | ' + o.twos.join(' '));
});
check('the child gets the same letters and no marks', engine.order(data, 'win-102', 'child').letters.join('') === orders['win-102'].letters.join('')
  && !engine.order(data, 'win-102', 'child').marks.length);
check('101 and 102 differ', orders['win-101'].letters.join('') !== orders['win-102'].letters.join(''));
check('102 and its AZERTY twin agree', orders['win-102'].letters.join('') === orders['win-102-azerty'].letters.join(''));
check('the Mac keyboard has its own order', orders['mac-arabic'].letters.join('') !== orders['win-102'].letters.join(''));
check('the Mac keyboard has no lam-alef key', orders['mac-arabic'].twos.length === 0 && orders['win-102'].twos.length === 4);
REAL.forEach((id) => {
  const o = orders[id];
  check(id + ' teaches 36 letters and 8 marks', o.letters.length === 36 && o.marks.length === 8);
  const board = begin({way: 'keys', saved: {v: 1, player: 'grown', layout: id === 'linux-ara' ? 'win-101' : id}}).board();
  const shifted = {};
  board.keys.forEach((k) => { if (k.shift.length === 1) shifted[k.shift] = true; });
  const base = {};
  board.keys.forEach((k) => { if (k.base.length === 1) base[k.base] = true; });
  const early = o.letters.slice(0, C.SHIFT_AFTER).filter((c) => !base[c]);
  check(id + ' has no Shift letter among the first twelve', early.length === 0, early.join(' '));
  const home = {};
  board.keys.forEach((k) => { if (k.row === 2 && k.base.length === 1) home[k.base] = true; });
  if (id !== 'linux-ara') check(id + ' starts with six letters of the home row', o.letters.slice(0, C.START.grown).every((c) => home[c]), o.letters.slice(0, 6).join(' '));
  const late = o.letters.slice(-7);
  check(id + ' does not leave the letters of the commonest words for the end', 'ىذه'.split('').every((c) => late.indexOf(c) < 0), late.join(' '));
});

/* ---------- Every word can be typed on every real keyboard ---------- */

REAL.forEach((id) => {
  const can = new Set(orders[id].letters.concat(orders[id].marks));
  const bad = data.words.words.concat(data.words.voweled).filter((w) => w.split('').some((c) => !can.has(c)));
  check('every practice word can be typed on ' + id, bad.length === 0, bad.slice(0, 5).join(' '));
});

/* ---------- The board, the window of six, the pieces, the way ---------- */

REAL.slice(0, 5).concat(['android-phone']).forEach((id) => {
  const game = begin({way: 'small', saved: {v: 1, player: 'grown', layout: id, all: true}});
  const board = game.board();
  const codes = new Set(board.keys.map((k) => k.code));
  check(id + ' draws the number row only when it holds a letter', (board.rows[0] === 0) === (id === 'win-101' || id === 'mac-arabic-pc'));
  check(id + ' fits its width', board.keys.every((k) => k.x >= 0 && k.x + k.w <= board.width + 1e-9));
  let windows = 0;
  for (let i = 0; i < 12; i++) {
    const round = game.round({day: 1, time: 0});
    let time = 0;
    while (game.active()) {
      const w = game.window();
      const flat = w.rows[0].concat(w.rows[1]);
      const g = game.guide();
      windows += 1;
      if (w.rows.length !== 2 || flat.length !== 6 || !flat.every((k) => codes.has(k.code)) || w.rows[0][0].row >= w.rows[1][0].row
        || (!w.space && flat.filter((k) => k.target && k.code === g.code && k.char === g.char).length !== 1)) {
        check(id + ' window around ' + g.code, false, JSON.stringify(w));
        break;
      }
      time += 400;
      const out = game.tap({code: g.code, time: time});
      if (out.result !== 'right') { check(id + ' small version: the lit key is right', false, g.code + ' ' + out.result); break; }
    }
    check(id + ' round ' + i + ' is not empty', round.text.length > 0);
  }
  check(id + ' showed windows', windows > 100);
});
{
  const p = engine.pieces('الَّتِي لا');
  check('pieces keep a letter with its marks', p.map((x) => x.s).join('|') === 'ا|لَّ|تِ|ي| |لا' && p[1].at === 1 && p[1].size === 3);
  check('pieces know what joins', !p[0].after && p[1].after && p[2].before && p[2].after && !p[3].after && !p[5].after);
  check('a lam and its alef stay one piece, so the ligature holds', p[5].s === 'لا' && p[5].size === 2
    && engine.pieces('ملايين لأن').map((x) => x.s).join('|') === 'م|لا|ي|ي|ن| |لأ|ن');
  check('a mouse means real keys', engine.wayFor({fine: true, width: 300, height: 300, player: 'child'}) === 'keys');
  check('a tablet gives the grown-up the drawn keyboard', engine.wayFor({width: 1024, height: 700, player: 'grown'}) === 'touch'
    && engine.wayFor({width: 760, height: 500, player: 'grown'}) === 'touch' && engine.wayFor({width: 759, height: 900, player: 'grown'}) === 'small');
  check('the child needs a wider page', engine.wayFor({width: 999, height: 700, player: 'child'}) === 'small' && engine.wayFor({width: 1000, height: 700, player: 'child'}) === 'touch');
  check('a phone on its side is small', engine.wayFor({width: 900, height: 400, player: 'grown'}) === 'small');
  check('turning helps when only the width is short', engine.turnHelps({width: 600, height: 960, player: 'grown'}) && !engine.turnHelps({width: 400, height: 800, player: 'grown'}));
  check('a choice wins', engine.wayFor({choice: 'small', fine: true, width: 2000, height: 1000}) === 'small');
}

/* ---------- Simulated learners ---------- */

/* One learner: ms(n) is the time for a key pressed n times before, right the
   chance of the right key. Plays up to `rounds` rounds, `daily` a day, and
   checks every round's text. */
const play = (o) => {
  const random = seeded(o.seed || 1);
  const game = begin({way: o.way, random: random, saved: Object.assign({v: 1, player: o.player, layout: o.layout}, o.settings)});
  const board = game.board();
  const presses = {};
  const log = {game: game, unlocks: [], rounds: 0, samples: [], repeats: 0, thrice: 0, stuck: 0, ends: [], away: 0};
  let time = 1000;
  const hit = (code, shift) => (o.way === 'keys' ? game.press({code: code, shift: shift, time: time}) : game.tap({code: code, time: time}));
  for (let n = 0; n < o.rounds; n++) {
    const day = 100 + Math.floor(n / o.daily);
    const round = game.round({day: day, time: time});
    if (!round || !round.text) { log.stuck += 1; break; }
    const text = round.text;
    if (n < 3 || n % 97 === 0) log.samples.push('round ' + (n + 1) + ' [' + show(round.focus) + ']: ' + show(text));
    const strange = text.split('').filter((c) => !game.know(c).play);
    check(o.name + ': round ' + (n + 1) + ' uses only characters in play', strange.length === 0, strange.join(' '));
    if (o.player === 'child') {
      check(o.name + ': ten targets', text.length === C.CHILD_TARGETS);
      check(o.name + ': never three running', !/(.)\1\1/.test(text), text);
    } else {
      const parts = text.split(' ');
      const opening = round.fresh ? C.MEET_ALONE : 0;
      const count = {};
      parts.forEach((w, i) => {
        count[w] = (count[w] || 0) + 1;
        if (i >= opening && w === parts[i - 1]) { if (w.length > 2) log.repeats += 1; else log.away += 1; }
      });
      log.thrice += Object.keys(count).filter((w) => w.length > 2 && wordSet.has(w) && count[w] > C.TWICE).length;
      check(o.name + ': the round fits its length', text.length <= C.LENGTH && text.length >= 20, String(text.length));
    }
    let guard = 0;
    while (game.active() && guard++ < 2000) {
      const g = game.guide();
      const key = g.code + (g.shift ? '+' : '');
      const many = presses[key] = (presses[key] || 0) + 1;
      time += (g.wait || 0) + o.ms(many) * (0.85 + 0.3 * random());
      let out;
      if (random() > (o.weak && o.weak.code === g.code ? o.weak.right : o.right)) {
        const others = board.keys.filter((k) => k.kind === 'key' && k.base.length === 1 && k.code !== g.code && k.base !== text[g.pos]
          && (o.player !== 'child' || game.know(k.base).play));
        if (others.length) { hit(others[Math.floor(random() * others.length)].code, false); time += o.ms(many) * 0.8; }
      }
      if (o.way === 'touch' && g.shift) { out = game.tap({code: g.shiftKey, time: time}); time += 250; }
      out = o.split && g.two ? hit('KeyG', false) : hit(g.code, g.shift);
      if (out.result !== 'right') { check(o.name + ': the lit key is right', false, key + ' gave ' + out.result); break; }
      if (out.end) {
        log.ends.push(out.end);
        if (out.end.unlocked) log.unlocks.push({item: out.end.unlocked.item, round: n + 1, day: day});
      }
    }
    check(o.name + ': the round ends', !game.active());
    log.rounds = n + 1;
    if (o.until && o.until(game)) break;
  }
  check(o.name + ': never without a round', log.stuck === 0);
  check(o.name + ': no word twice running', log.repeats === 0, String(log.repeats));
  check(o.name + ': no word more than twice in a round', log.thrice === 0, String(log.thrice));
  return log;
};
const report = (name, log) => {
  const inPlay = log.game.strip().filter((x) => x.play);
  const mean = (list, f) => (list.length ? Math.round(list.reduce((s, x) => s + f(x), 0) / list.length) : 0);
  const tail = log.ends.slice(-20);
  console.log('\n' + name + ': ' + log.rounds + ' rounds, ' + inPlay.length + ' characters in play, last rounds ' + mean(tail, (e) => e.cpm)
    + ' a minute at ' + mean(tail, (e) => e.accuracy) + '%');
  console.log('  earned (character@round): ' + (log.unlocks.map((u) => show(u.item) + '@' + u.round).join(' ') || 'nothing'));
  log.samples.slice(0, 4).forEach((s) => console.log('  ' + s));
};
const done = (game) => game.strip().every((x) => x.play);

console.log('\nSIMULATED LEARNERS');
const steady = play({name: 'steady', player: 'grown', way: 'keys', layout: 'win-102', ms: () => 300, right: 0.97, rounds: 600, daily: 10, seed: 11, until: done});
report('Steady grown-up (300 ms a key, 97% right, Arabic 102, real keys)', steady);
check('the steady learner earns every letter and lam-alef key', done(steady.game), steady.game.strip().filter((x) => !x.play).map((x) => x.item).join(' '));

const slow = play({name: 'slow', player: 'grown', way: 'keys', layout: 'win-101', ms: (n) => 380 + 800 * Math.exp(-n / 60), right: 0.99, rounds: 600, daily: 8, seed: 12, until: done});
report('Slow and careful (1.2 s a key falling to 0.38 s with practice, 99% right, Arabic 101)', slow);
check('the slow careful learner gets there', slow.unlocks.length >= 30, String(slow.unlocks.length));

const usual = play({name: 'usual', player: 'grown', way: 'keys', layout: 'win-102', ms: () => 350, right: 0.95, rounds: 400, daily: 10, seed: 13, until: done});
report('Usual learner (350 ms a key, 95% right)', usual);

const careless = play({name: 'careless', player: 'grown', way: 'keys', layout: 'win-102', ms: () => 300, right: 0.8, rounds: 300, daily: 10, seed: 14});
report('Careless (300 ms a key, 80% right)', careless);
check('the careless learner is held back, and still moves', careless.unlocks.length >= 300 / C.LEARN.grown.patience - 2
  && careless.unlocks.length <= 300 / C.LEARN.grown.patience, String(careless.unlocks.length));
{
  const gaps = careless.unlocks.map((u, i) => u.round - (i ? careless.unlocks[i - 1].round : 0));
  check('nobody waits longer than the patience for a character', Math.max.apply(null, gaps) <= C.LEARN.grown.patience + 1, gaps.join(' '));
}

const lapse = play({name: 'one weak letter', player: 'grown', way: 'keys', layout: 'win-102', ms: () => 300, right: 0.97, weak: {code: 'KeyK', right: 0.6}, rounds: 150, daily: 10, seed: 23});
report('Fast, but wrong on one letter (noon) four times in ten', lapse);
check('one weak letter slows the course and does not stop it', lapse.unlocks.length >= 150 / C.LEARN.grown.patience - 1, String(lapse.unlocks.length));

const mac = play({name: 'mac', player: 'grown', way: 'keys', layout: 'mac-arabic', ms: () => 300, right: 0.97, rounds: 600, daily: 10, seed: 15, until: done});
report('Steady grown-up on the Mac keyboard', mac);
check('the Mac learner earns every letter', done(mac.game));

const glass = play({name: 'glass', player: 'grown', way: 'touch', layout: 'android-phone', ms: () => 550, right: 0.97, rounds: 600, daily: 10, seed: 16, until: done});
report('Grown-up tapping the Android keyboard (550 ms a key, 97% right)', glass);
check('the tapping learner earns every letter the keyboard has', done(glass.game));

const tapper = play({name: 'tapper', player: 'grown', way: 'touch', layout: 'win-102', ms: () => 500, right: 0.97, rounds: 600, daily: 10, seed: 17, until: done});
report('Grown-up tapping the drawn Arabic 102 (Shift is two taps)', tapper);
check('the tapper earns every letter', done(tapper.game));

const kid = play({name: 'child', player: 'child', way: 'touch', layout: 'win-102', ms: () => 2500, right: 0.9, rounds: 300, daily: 6, seed: 18, until: done});
report('Child (2.5 s a key, 90% right, six rounds a day, tapping)', kid);
{
  const perDay = {};
  kid.unlocks.forEach((u) => { perDay[u.day] = (perDay[u.day] || 0) + 1; });
  check('the child earns letters', kid.unlocks.length >= 20, String(kid.unlocks.length));
  check('the child who knows his letters earns two on most days', kid.unlocks.length >= 1.5 * Math.ceil(kid.rounds / 6) - 2, kid.unlocks.length + ' in ' + kid.rounds + ' rounds');
  check('the child earns at most two letters a day', Object.keys(perDay).every((d) => perDay[d] <= C.CHILD_NEW));
  check('the child is praised after every round', kid.ends.every((e) => e.praise === (e.unlocked ? 'mashaallah' : 'well-done')));
  check('the child rests after three rounds', kid.ends.slice(0, 6).map((e) => e.rest).join() === 'false,false,true,false,false,true');
  check('the child starts with two letters', kid.unlocks[0].item === orders['win-102'].letters[2]);
}
const little = play({name: 'small child', player: 'child', way: 'small', layout: 'win-102', ms: () => 3200, right: 0.75, rounds: 120, daily: 6, seed: 19});
report('Child on the small version (3.2 s a key, 75% right)', little);
check('a slow, careless child still earns letters', little.unlocks.length >= 120 / C.LEARN.child.patience - 2, String(little.unlocks.length));
const fourSeconds = play({name: 'four-second child', player: 'child', way: 'touch', layout: 'win-102', ms: () => 4000, right: 0.9, rounds: 60, daily: 6, seed: 24});
report('Child who needs four seconds a key (90% right)', fourSeconds);
check('a child slower than the target still earns letters', fourSeconds.unlocks.length >= 60 / C.LEARN.child.patience - 1, String(fourSeconds.unlocks.length));

const knows = play({name: 'all letters', player: 'grown', way: 'keys', layout: 'win-102', ms: () => 280, right: 0.97, rounds: 80, daily: 10, seed: 20, settings: {all: true}});
report('Grown-up who already types (all letters at once)', knows);
check('all letters are in play from the first round', knows.game.strip().every((x) => x.play));
check('pairs become the focus when the letters are known', knows.samples.length > 0 && knows.game.strip().filter((x) => x.kind === 'letter' && x.k >= 0.6).length >= 30);

const marker = play({name: 'marks', player: 'grown', way: 'keys', layout: 'win-102', ms: () => 300, right: 0.97, rounds: 500, daily: 10, seed: 21, settings: {marks: true}, until: done});
report('Steady grown-up with the marks on', marker);
check('the marks learner earns every mark', marker.game.strip().filter((x) => x.kind === 'mark').every((x) => x.play));
check('the first mark comes at once', marker.samples[0].indexOf('َ') >= 0 && !/[ً-ٍُ-ْ]/.test(marker.samples[0]), marker.samples[0]);

const splitter = play({name: 'two keys for lam-alef', player: 'grown', way: 'keys', layout: 'win-102', ms: () => 300, right: 0.97, rounds: 600, daily: 10, seed: 22, split: true, until: done});
report('Steady grown-up who never uses the lam-alef key', splitter);
check('typing lam then alef apart never blocks the course', done(splitter.game));

/* ---------- The lam-alef key ---------- */

{
  /* Each of the four keys: where it is, and the key of its second letter. */
  const TWO = {'لا': ['KeyB', false, 'KeyH', false], 'لأ': ['KeyG', true, 'KeyH', true], 'لإ': ['KeyT', true, 'KeyY', true], 'لآ': ['KeyB', true, 'KeyN', true]};
  const game = begin({way: 'keys', random: seeded(5), saved: steady.game.state()});
  let seen = 0;
  const kinds = {};
  for (let n = 0; n < 20 && seen < 6; n++) {
    game.round({day: 500, time: 0});
    let time = 0;
    while (game.active()) {
      const g = game.guide();
      time += 300;
      if (g.two) {
        const key = TWO[g.char];
        seen += 1;
        kinds[g.char] = true;
        check('the guide lights the lam-alef key', g.code === key[0] && g.shift === key[1], g.char);
        if (seen % 2) {
          const out = game.press({code: key[0], shift: key[1], time: time});
          check('the lam-alef key types two letters', out.result === 'right' && out.advanced === 2);
        } else {
          const one = game.press({code: 'KeyG', time: time});
          const two = game.active() ? game.press({code: key[2], shift: key[3], time: time + 300}) : one;
          check('lam then alef apart is accepted', one.result === 'right' && one.advanced === 1 && two.result === 'right', g.char);
        }
      } else game.press({code: g.code, shift: g.shift, time: time});
    }
  }
  check('rounds hold lam-alef', seen >= 6 && kinds['لا'], seen + ' ' + Object.keys(kinds).join(' '));
  const early = begin({way: 'keys', random: seeded(6), saved: {v: 1, player: 'grown', layout: 'win-102'}});
  early.round({day: 1, time: 0});
  let lit = false;
  while (early.active()) { const g = early.guide(); lit = lit || g.two; early.press({code: g.code, shift: g.shift, time: g.pos * 300}); }
  check('the lam-alef key is not lit before it is taught', !lit);
  const firstTwo = steady.unlocks.filter((u) => u.item.length === 2).map((u) => u.item);
  check('the plain lam-alef key comes first of the four', firstTwo[0] === 'لا' && firstTwo.length === 4, firstTwo.join(' '));
}

/* ---------- The marks ---------- */

{
  const o = orders['win-102'];
  const saved = {v: 1, player: 'grown', layout: 'win-102', marks: true, all: true, stats: {grown: {keys: {'win-102': {have: o.letters.concat(o.marks), chars: {}}}}}};
  const game = begin({way: 'keys', random: seeded(7), saved: saved});
  let swapped = 0;
  let both = 0;
  for (let n = 0; n < 8; n++) {
    const round = game.round({day: 1, time: 0});
    check('with every mark in play the words are voweled', /[ً-ْ]/.test(round.text));
    let time = 0;
    while (game.active()) {
      const g = game.guide();
      const next = round.text[g.pos + 1] || '';
      time += 300;
      if (isMark(g.char) && isMark(next) && next !== g.char) {
        if (swapped <= both) {
          const way = orders['win-102'].marks.indexOf(next) >= 0 && game.board().keys.filter((k) => k.shift === next)[0];
          const one = game.press({code: way.code, shift: true, time: time});
          const g2 = game.guide();
          check('two marks on one letter come in either order', one.result === 'right' && one.advanced === 1 && g2.char === g.char && g2.pos === g.pos + 1);
          swapped += 1;
        } else {
          const pair = g.char + next;
          const key = data.layouts.layouts.filter((l) => l.id === 'win-102')[0].rows.reduce((a, r) => a.concat(r), []).filter((k) => k.altgr === pair || k.altgr === next + g.char)[0];
          if (key) {
            const out = game.press({code: key.code, altgr: true, ctrl: true, alt: true, time: time});
            check('the AltGr key of 102 types a shadda and its vowel', out.result === 'right' && out.advanced === 2);
            both += 1;
            continue;
          }
        }
      }
      const g3 = game.guide();
      game.press({code: g3.code, shift: g3.shift, time: time});
    }
  }
  check('rounds hold a shadda with a vowel', swapped > 0 && both > 0, swapped + ' ' + both);
  const glassGame = begin({way: 'touch', random: seeded(8), saved: saved});
  check('no marks when tapping', !glassGame.settings().marksOn && !/[ً-ْ]/.test(glassGame.round({day: 1, time: 0}).text));
  const childGame = begin({way: 'keys', random: seeded(8), saved: Object.assign({}, saved, {player: 'child'})});
  check('no marks for the child', !childGame.settings().marksOn);
}

/* ---------- Presses ---------- */

{
  const game = begin({way: 'keys', random: seeded(9), saved: {v: 1, player: 'grown', layout: 'win-102'}});
  const round = game.round({day: 1, time: 0});
  const g = game.guide();
  check('a repeat is ignored', game.press({code: g.code, repeat: true, time: 10}).result === 'ignored');
  check('a shortcut is left to the browser', game.press({code: g.code, ctrl: true, time: 10}).used === false && game.press({code: 'KeyR', meta: true, time: 10}).used === false);
  check('a key off the board is ignored', game.press({code: 'F5', time: 10}).used === false);
  const wrong = game.press({code: g.code === 'KeyK' ? 'KeyL' : 'KeyK', time: 20});
  check('a wrong key stops the line', wrong.result === 'wrong' && wrong.used && game.guide().pos === 0 && wrong.guide.code === g.code);
  check('a sign key is wrong too', game.press({code: 'KeyP', shift: true, time: 30}).result === 'wrong');
  const right = game.press({code: g.code, time: 40});
  check('the right key moves on', right.result === 'right' && right.advanced === 1 && right.guide.pos === 1 && right.used);
  while (game.active()) { const x = game.guide(); game.press({code: x.code, shift: x.shift, time: 100 + x.pos * 300}); }
  const end = game.last();
  check('the first key was wrong once: accuracy under 100', end.accuracy < 100 && end.mistakes === 1 && end.chars === round.text.length);
  check('speed is characters a minute', Math.abs(end.cpm - 200) <= 6, String(end.cpm));
  check('the first round has no average to compare with', end.cpmDiff === null);
  game.round({day: 1, time: 0});
  let t = 0;
  while (game.active()) { const x = game.guide(); t += x.pos === 5 ? 60000 : 200; game.press({code: x.code, shift: x.shift, time: t}); }
  check('a long pause is taken out of the speed', Math.abs(game.last().cpm - 300) <= 12, String(game.last().cpm));
  check('the second round is compared with the first', game.last().cpmDiff === game.last().cpm - end.cpm);
  check('between rounds a key is idle', game.press({code: 'KeyK', time: 1}).result === 'idle');

  /* The keyboard changes when the keys pressed belong to another one. */
  const sniff = begin({way: 'keys', saved: {v: 1, player: 'grown', layout: 'win-102'}});
  sniff.round({day: 1, time: 0});
  for (let i = 0; i < 5; i++) sniff.press({code: 'KeyG', shift: true, key: 'ل', time: i});
  for (let i = 0; i < 5; i++) sniff.press({code: 'KeyB', key: 'Unidentified', time: i});
  for (let i = 0; i < 5; i++) sniff.press({code: 'KeyK', key: 'n', time: i});
  check('a browser that reports the plain letter for a Shift key changes nothing', sniff.settings().layout === 'win-102');
  const one = sniff.press({code: 'Backquote', key: 'ذ', time: 10});
  const two = sniff.press({code: 'Backquote', key: 'ذ', time: 20});
  check('two presses of thal on the 101 key switch to 101', one.result !== 'layout' && two.result === 'layout' && two.layout === 'win-101' && sniff.settings().layout === 'win-101' && !sniff.active());
  sniff.round({day: 1, time: 0});
  sniff.press({code: 'KeyN', key: 'ر', time: 1});
  check('two presses of the Mac keys switch to the Mac keyboard', sniff.press({code: 'KeyM', key: 'و', time: 2}).layout === 'mac-arabic');
  sniff.round({day: 1, time: 0});
  sniff.press({code: 'KeyC', shift: true, key: 'ِ', time: 1});
  sniff.press({code: 'KeyC', shift: true, key: 'ِ', time: 2});
  check('the kasra of 102 switches from the Mac keyboard to 102', sniff.settings().layout === 'win-102');

  /* The drawn keyboard: Shift is a tap of its own and stays for one key. */
  const o = orders['win-102'];
  const drawn = begin({way: 'touch', random: seeded(10), saved: {v: 1, player: 'grown', layout: 'win-102', all: true}});
  let shifts = 0;
  for (let n = 0; n < 30 && shifts < 3; n++) {
    drawn.round({day: 1, time: 0});
    let time = 0;
    while (drawn.active()) {
      const x = drawn.guide();
      time += 400;
      if (x.shift) {
        shifts += 1;
        check('the Shift of the other hand lights first', x.light.length === 1 && x.light[0] === x.shiftKey && x.shiftKey === (x.hand === 'left' ? 'ShiftRight' : 'ShiftLeft'));
        const s = drawn.tap({code: x.shiftKey, time: time});
        check('then the key lights and Shift is held', s.result === 'shift' && s.guide.light[0] === x.code && s.guide.held[0] === x.shiftKey);
      }
      const out = drawn.tap({code: x.code, time: time + 100});
      if (out.result !== 'right') { check('tapping the lit key is right', false, x.code); break; }
      if (out.guide) check('Shift lets go after one key', out.guide.held.length === 0);
    }
  }
  check('rounds hold Shift letters', shifts >= 3, o.letters.length + ' ' + shifts);
  check('a touch between keys goes to the nearest one', drawn.nearest(2.0, 1.5) === 'KeyQ' && drawn.nearest(1.6, 2.5) === 'KeyA' && drawn.nearest(7.2, 4.5) === 'Space');
  check('a touch nearer the left Shift than the first home key goes to Shift', drawn.nearest(1.6, 2.98) === 'ShiftLeft');
  check('a touch far from any key goes nowhere', drawn.nearest(14.9, 0.2) === '' || drawn.board().rows[0] === 0);

  /* The child: dead keys, the quiet gap, the soft sound. */
  const kidGame = begin({way: 'touch', random: seeded(11), saved: {v: 1, player: 'child', layout: 'win-102'}});
  const first = kidGame.round({day: 1, time: 1000});
  const k = kidGame.guide();
  const board = kidGame.board();
  const codeOf = (c) => board.keys.filter((x) => x.base === c)[0].code;
  check('the child starts with two letters and no space', first.text.length === 10 && new Set(first.text.split('')).size === 2);
  check('a key not in play does nothing', kidGame.tap({code: codeOf(o.letters[5]), time: 1500}).result === 'ignored' && kidGame.tap({code: 'Space', time: 1500}).result === 'ignored');
  check('only keys in play catch a touch', kidGame.nearest(13.2, 1.5) === '' && kidGame.nearest(7.2, 4.5) === '');
  const other = o.letters.slice(0, 2).filter((c) => c !== k.char)[0];
  const miss = kidGame.tap({code: codeOf(other), time: 1600});
  check('the other letter is wrong, with the soft sound', miss.result === 'wrong' && miss.sound === 'wrong');
  const good = kidGame.tap({code: k.code, time: 2000});
  check('the right tap gives a gap before the next light', good.result === 'right' && good.wait >= C.GAP_MIN && good.wait <= C.GAP_MAX);
  const next = kidGame.guide();
  check('a tap before the light is ignored', kidGame.tap({code: next.code, time: 2000 + good.wait - 1}).result === 'ignored');
  const fast = kidGame.tap({code: next.code, time: 2000 + good.wait + 900});
  check('a quick tap earns a sparkle', fast.result === 'right' && fast.quick === true);
  const third = kidGame.guide();
  const slowTap = kidGame.tap({code: third.code, time: 2000 + good.wait + 900 + fast.wait + 2500});
  check('a slow tap earns none', slowTap.result === 'right' && slowTap.quick === false);
  /* A wrong tap at a letter just given makes no sound the first time. */
  const fresh = begin({way: 'touch', random: seeded(12), saved: kid.game.state()});
  let quiet = null;
  for (let n = 0; n < 200 && quiet === null; n++) {
    const r = fresh.round({day: 900 + n, time: 0});
    let time = 0;
    while (fresh.active()) {
      const x = fresh.guide();
      time += x.wait + 1500;
      if (r.fresh && x.char === r.fresh && quiet === null) {
        const wrongKey = fresh.board().keys.filter((y) => y.base.length === 1 && y.code !== x.code && fresh.know(y.base).play)[0];
        quiet = fresh.tap({code: wrongKey.code, time: time}).sound;
        time += 500;
      }
      if (x.shift) { fresh.tap({code: x.shiftKey, time: time}); time += 200; }
      fresh.tap({code: x.code, time: time});
    }
  }
  check('no sound for the first wrong tap at a letter just given', quiet === '', String(quiet));
}

/* ---------- The marks switched off again ---------- */

/* Plays whole rounds with the lit keys, a fixed time apart. */
const type = (game, rounds, day, ms) => {
  const ends = [];
  let time = 0;
  for (let n = 0; n < rounds; n++) {
    const round = game.round({day: day, time: time});
    while (game.active()) {
      const g = game.guide();
      time += ms || 300;
      const out = game.press({code: g.code, shift: g.shift, time: time});
      if (out.result !== 'right') { check('typing the lit key', false, g.code); return ends; }
      if (out.end) ends.push({end: out.end, round: round});
    }
  }
  return ends;
};
{
  const game = begin({way: 'keys', random: seeded(31), saved: {v: 1, player: 'grown', layout: 'win-102'}});
  type(game, 2, 1);
  game.set({marks: true});
  const first = game.round({day: 1, time: 0});
  check('switching the marks on brings the first mark', isMark(first.focus) && first.fresh === first.focus);
  game.press({code: game.guide().code, shift: game.guide().shift, time: 300});
  game.set({marks: false});
  check('switching the marks off in the middle of a round drops it', !game.active() && !game.settings().marksOn);
  const ends = type(game, 12, 1);
  const earned = ends.filter((x) => x.end.unlocked).map((x) => x.end.unlocked.item);
  check('a mark left waiting does not hold the letters back', earned.length >= 4 && earned.every((c) => !isMark(c)), earned.join(' '));
  check('with the marks off no round holds a mark', ends.every((x) => !/[ً-ْ]/.test(x.round.text)));
  game.set({marks: true});
  const again = game.round({day: 1, time: 0});
  check('switched on again, the marks come back', /[ً-ْ]/.test(again.text) && again.text.split('').every((c) => game.know(c).play));
  const between = begin({way: 'keys', random: seeded(32), saved: {v: 1, player: 'grown', layout: 'win-102'}});
  let stuck = 0;
  for (let n = 0; n < 30; n++) {
    between.set({marks: n % 2 === 0});
    const got = type(between, 1, 1);
    if (!got.length || got[0].round.text.split('').some((c) => !between.know(c).play)) stuck += 1;
  }
  check('marks on and off between rounds: every round plays, with characters in play only', stuck === 0, String(stuck));
  check('and the learner still earns characters', between.strip().filter((x) => x.play).length > 14, String(between.strip().filter((x) => x.play).length));
  const all = begin({way: 'keys', random: seeded(33), saved: {v: 1, player: 'grown', layout: 'win-102'}});
  type(all, 3, 1);
  const before = all.strip().filter((x) => x.play).length;
  all.set({all: true});
  check('all letters on: every letter and lam-alef key is in play', all.strip().every((x) => x.play));
  type(all, 3, 1);
  all.set({all: false});
  check('all letters off again: back to the letters earned', all.strip().filter((x) => x.play).length === before);
  check('and the course goes on from there', type(all, 6, 1).some((x) => x.end.unlocked));
}

/* ---------- A pair as the focus ---------- */

{
  const o = orders['win-102'];
  const known = (list) => {
    const chars = {' ': [60, 250, 1, 1, 1]};
    list.forEach((c) => { chars[c] = [60, 250, 1, 1, 1]; });
    return chars;
  };
  /* Six letters, all known: the round is about a pair, and reads like practice. */
  const six = o.letters.slice(0, 6);
  let pairs = 0;
  for (let seed = 41; seed < 53; seed++) {
    const game = begin({way: 'keys', random: seeded(seed), saved: {v: 1, player: 'grown', layout: 'win-102',
      stats: {grown: {keys: {'win-102': {have: six, chars: known(six), pairs: seed % 2 ? {'ال': [9, 250], 'لم': [9, 250]} : {}, played: 30}}}}}});
    const round = game.round({day: 1, time: 0});
    if (round.focus.length !== 2 || round.fresh) continue;
    const parts = round.text.split(' ');
    const alone = parts.filter((w) => w === round.focus).length;
    const strange = parts.filter((w) => w !== round.focus && !wordSet.has(w));
    const runs = parts.filter((w, i) => i && w === parts[i - 1]).length;
    const holding = parts.filter((w) => w.indexOf(round.focus) >= 0).length;
    pairs += 1;
    if (seed < 43) console.log('  a round for the pair ' + round.focus + ': ' + round.text);
    check('a pair comes alone twice in its round at most', alone <= (wordSet.has(round.focus) ? C.TWICE : C.PAIR_ALONE), round.text);
    check('a pair\'s round is real words', strange.length === 0, strange.join(' '));
    check('a pair\'s round does not say one thing twice running', runs === 0, round.text);
    check('a pair\'s round is varied', new Set(parts).size >= 7, round.text);
    check('a pair\'s round holds the pair in some of its words', holding >= 3, round.text);
  }
  check('with every letter known a pair becomes the focus', pairs === 12, String(pairs));
  /* With the lam-alef key in play, lam then alef is its key's business, not a pair to drill. */
  const whole = begin({way: 'keys', random: seeded(42), saved: {v: 1, player: 'grown', layout: 'win-102',
    stats: {grown: {keys: {'win-102': {have: o.letters.concat(o.twos), chars: known(o.letters.concat(o.twos)), played: 300}}}}}});
  const aims = [];
  for (let n = 0; n < 25; n++) {
    const round = whole.round({day: 1, time: 0});
    aims.push(round.focus);
    let time = 0;
    while (whole.active()) { const g = whole.guide(); time += 250; whole.press({code: g.code, shift: g.shift, time: time}); }
  }
  check('a pair that has a key of its own is never the pair to drill', aims.every((f) => o.twos.indexOf(f) < 0), aims.join(' '));
  check('the pair to drill changes as pairs are learned', new Set(aims).size >= 15, aims.join(' '));
}

/* ---------- A change of keyboard ---------- */

{
  const saved = steady.game.state();
  const text = JSON.stringify(saved);
  const game = begin({way: 'keys', random: seeded(51), saved: JSON.parse(text)});
  const inPlay = () => game.strip().filter((x) => x.play).map((x) => x.item);
  const on102 = inPlay();
  const k102 = game.know('ب');
  game.set({layout: 'win-101'});
  const on101 = inPlay();
  const moved = on102.filter((c) => on101.indexOf(c) < 0);
  check('from 102 to 101 only thal starts again', moved.join('') === 'ذ' && on101.length === on102.length - 1, moved.join(' '));
  check('what did not move keeps its numbers', game.know('ب').k === k102.k && game.know('ب').n === k102.n && game.know('ب').ok && game.know(' ').n > 0);
  check('what moved has none', game.know('ذ').n === 0 && !game.know('ذ').play);
  check('the other keyboard\'s record is untouched, and nothing is kept before a round is played', JSON.stringify(game.state().stats) === JSON.stringify(saved.stats));
  const ends = type(game, 3, 200);
  check('thal is the next letter on the other keyboard', ends.some((x) => x.end.unlocked && x.end.unlocked.item === 'ذ'), ends.map((x) => x.end.unlocked && x.end.unlocked.item).join(' '));
  const after = game.state().stats.grown.keys;
  check('a round played there gives that keyboard its own record', !!after['win-101'] && after['win-101'].played === 3
    && JSON.stringify(after['win-102']) === JSON.stringify(saved.stats.grown.keys['win-102']));
  game.set({layout: 'mac-arabic'});
  const onMac = inPlay();
  const here = begin({way: 'keys', saved: {v: 1, player: 'grown', layout: 'mac-arabic'}}).board().keys;
  const there = begin({way: 'keys', saved: {v: 1, player: 'grown', layout: 'win-102'}}).board().keys;
  const seat = (keys, c) => keys.filter((k) => k.base === c || k.shift === c).map((k) => k.code + (k.shift === c ? '+' : ''))[0];
  check('on the Mac keyboard the letters that sit where they did stay in play', onMac.length >= 20 && onMac.every((c) => seat(here, c) === seat(there, c))
    && on102.filter((c) => c.length === 1 && seat(here, c) === seat(there, c)).every((c) => onMac.indexOf(c) >= 0), onMac.join(' '));
  check('and the ones that moved are met again', !game.know('و').play && game.know('و').n === 0 && game.know('ا').ok);
  /* The engine's own change of keyboard, after two presses that fit another one. */
  const sniff = begin({way: 'keys', random: seeded(52), saved: JSON.parse(text)});
  sniff.round({day: 200, time: 0});
  sniff.press({code: 'Backquote', key: 'ذ', time: 10});
  const out = sniff.press({code: 'Backquote', key: 'ذ', time: 20});
  check('the engine\'s own change of keyboard keeps the record too', out.result === 'layout' && sniff.strip().filter((x) => x.play).length === on102.length - 1);
  /* A keyboard chosen by mistake and left again takes its start from the record as it is later. */
  const back = begin({way: 'keys', random: seeded(53), saved: {v: 1, player: 'grown', layout: 'win-102'}});
  back.set({layout: 'win-101'});
  back.strip();
  back.set({layout: 'win-102'});
  type(back, 8, 1);
  const grown = back.strip().filter((x) => x.play).length;
  back.set({layout: 'win-101'});
  check('a keyboard looked at and left takes the later record', grown > C.START.grown && back.strip().filter((x) => x.play).length === grown);
  /* The child, and the drawn keyboards. */
  const small = begin({way: 'touch', random: seeded(54), saved: kid.game.state()});
  const had = small.strip().filter((x) => x.play).length;
  small.set({layout: 'android-phone'});
  const glassy = small.strip().filter((x) => x.play).map((x) => x.item);
  check('the child keeps the top and home rows on the Android keyboard', glassy.length >= 20 && glassy.length < had && glassy.indexOf('ا') >= 0 && glassy.indexOf('ق') >= 0
    && glassy.indexOf('و') < 0, glassy.join(' '));
}

/* ---------- A pause, and a long absence ---------- */

{
  const game = begin({way: 'keys', random: seeded(61), saved: {v: 1, player: 'grown', layout: 'win-102'}});
  type(game, 4, 1);
  const before = JSON.stringify(game.state().stats);
  const round = game.round({day: 1, time: 0});
  let time = 0;
  let paused = '';
  while (game.active()) {
    const g = game.guide();
    if (g.pos === 9) { paused = g.char; time += 60000; } else time += 300;
    game.press({code: g.code, shift: g.shift, time: time});
  }
  const steadyGame = begin({way: 'keys', random: seeded(61), saved: {v: 1, player: 'grown', layout: 'win-102'}});
  type(steadyGame, 5, 1);
  check('a minute\'s pause in a round costs nothing', before !== JSON.stringify(game.state().stats) && game.last().accuracy === 100 && Math.abs(game.last().cpm - 200) <= 8
    && game.know(paused).k >= steadyGame.know(paused).k - 0.1, game.last().cpm + ' ' + round.text.length);
  const gone = begin({way: 'keys', random: seeded(62), saved: steady.game.state()});
  const k = gone.strip().map((x) => x.k).join();
  const warm = gone.round({day: 100 + 60 + 14, time: 0});
  check('two weeks away: a warm-up, and nothing forgotten for him', warm.warm && warm.focus === '' && gone.strip().map((x) => x.k).join() === k
    && gone.strip().every((x) => x.play));
  while (gone.active()) { const g = gone.guide(); gone.press({code: g.code, shift: g.shift, time: g.pos * 300}); }
  check('after the warm-up the rounds have a focus again', !gone.round({day: 100 + 60 + 14, time: 0}).warm);
}

/* ---------- Saving ---------- */

{
  [steady, kid, marker, glass].forEach((log) => {
    const saved = log.game.state();
    const text = JSON.stringify(saved);
    const again = begin({way: 'keys', saved: JSON.parse(text)}).state();
    check('a saved state loads back the same', JSON.stringify(again) === text);
    check('JSON text loads too', JSON.stringify(begin({way: 'keys', saved: text}).state()) === text);
  });
  const text = JSON.stringify(steady.game.state());
  console.log('\nSAVING: the steady learner\'s whole state is ' + text.length + ' characters; '
    + Object.keys(steady.game.state().stats.grown.keys['win-102'].pairs).length + ' pairs kept');
  check('the saved state is small', text.length < 30000, String(text.length));
  /* The most one family keeps: a grown-up's whole course with the marks, two hundred rounds, a second keyboard, and the child. */
  const full = begin({way: 'keys', random: seeded(71), saved: marker.game.state()});
  type(full, 150, 300);
  full.set({layout: 'mac-arabic'});
  type(full, 3, 300);
  const family = full.state();
  family.stats.child = kid.game.state().stats.child;
  const size = JSON.stringify(begin({way: 'keys', saved: family}).state()).length;
  console.log('  the whole state of a family (marks, two keyboards, the child, ' + family.rounds.length + ' rounds kept): ' + size + ' characters');
  check('the whole state of a family stays under 30,000 characters', size < 30000 && family.rounds.length === C.ROUNDS_KEPT, String(size));
  const bad = [undefined, null, 7, 'nonsense', '{"v":', [], {}, {v: 0}, {v: 1, player: 'cat', layout: 5, way: {}, target: 'x', marks: 1, all: 'yes', stats: 3, rounds: 'no'},
    {v: 1, player: 'grown', stats: {grown: {keys: {'win-102': {have: 'abc', chars: {'ا': 'x', 'ل': [1, -5, 2], 'ZZ': [1, 2, 3]}, pairs: [1], fresh: 9}, nowhere: {}}, mud: 4}, child: null}, rounds: [1, [], ['grown', 'keys', 'win-102', 1, NaN, 2], null]},
    {v: 1, player: 'grown', stats: {grown: {keys: {'win-102': {have: ['ا', 'ل', 'ي', 'ن', 'م', 'ت', 'و'], fresh: 'و', chars: {'ا': [20, 300, 0.97, 1, 5]}, pairs: {'ال': [9, 280]}, day: 5}}}}},
    {v: 1, player: 'grown', marks: true, stats: {grown: {keys: {'win-102': {have: ['ا', 'ل'], fresh: 'َ', since: -4, played: 'many', newDay: {}, chars: null, pairs: 7}}}}},
    {v: 1, player: 'child', layout: 'android-phone', way: 'small', stats: {child: {small: {'android-phone': {have: ['أ', 'ا', 'ا', ' ', 'لا', 5, null], chars: {' ': [1, 1, 1, 1, 1]}}}}}}];
  bad.forEach((saved, i) => {
    let ok = true;
    try {
      ['keys', 'touch', 'small'].forEach((way) => {
        const game = begin({way: way, random: seeded(i + 1), saved: saved});
        if (!game.settings().player) game.set({player: i % 2 ? 'child' : 'grown'});
        const round = game.round({day: 1, time: 0});
        game.strip(); game.board(); game.window(); game.state();
        let time = 0;
        while (game.active()) { const g = game.guide(); time += 800; if (way === 'touch' && g.shift) game.tap({code: g.shiftKey, time: time}); if (way === 'keys') game.press({code: g.code, shift: g.shift, time: time + 1}); else game.tap({code: g.code, time: time + 1}); }
        ok = ok && round.text.length > 0 && !!game.last();
      });
    } catch (e) { ok = false; console.log('    ' + e.stack.split('\n').slice(0, 3).join(' / ')); }
    check('a damaged state does not throw (' + i + ')', ok);
  });
  const game = begin({way: 'keys', saved: steady.game.state()});
  game.set({player: 'child'});
  check('the players are kept apart', game.strip().filter((x) => x.play).length === C.START.child);
  game.set({player: 'grown'});
  game.reset();
  check('a fresh start clears the player', game.strip().filter((x) => x.play).length === C.START.grown && !game.state().stats.grown && game.state().rounds.length === 0);
  check('the keyboards offered', game.layouts().map((l) => l.id).join() === 'win-102,win-101,win-102-azerty,mac-arabic,mac-arabic-pc' && begin({way: 'touch'}).layouts().length === 6);
  const speeds = begin({way: 'keys', saved: {v: 1, player: 'grown', target: 2}});
  check('three target speeds for keys and for glass', speeds.settings().cpm === 250 && speeds.set({target: 1}).cpm === 175 && speeds.set({target: 0}).cpm === 120
    && (speeds.setWay('touch'), speeds.settings().cpm) === 80 && speeds.set({target: 2}).cpm === 175);
  const away = begin({way: 'keys', random: seeded(3), saved: steady.game.state()});
  check('after a week away the first round is a warm-up', away.round({day: 100000, time: 0}).warm === true && away.round({day: 100000, time: 0}).focus === '');
}

console.log('\nCONSTANTS');
console.log('  ' + JSON.stringify(C));
console.log('\n' + passed + ' checks passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
