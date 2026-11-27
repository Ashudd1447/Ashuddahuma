/* Writes public/circles/cards.json: the 50 boards of «رَتِّبِ الدَّوَائِرَ»
   (circles.html), each a card and the board it starts from.

       node --max-old-space-size=4096 tools/make-circles.js

   The board is the family's wooden toy (the father's photo, 2026-11-26):
   four columns of colored discs, four of each color, sixteen in all. A
   column holds five; its fifth place is in the lane across the top, the
   only way from one column to another, so a disc resting there blocks the
   way past that column. A card shows the sixteen discs in the columns' four
   lower places. A move takes the top disc of one column, up its column,
   along the lane and down another column: it needs room in the other
   column, and no disc in the lane above the columns between.

   How hard a board is. The father's second round (2026-11-26): the first
   boards were too easy, "he has to dig it up and move things around". So a
   board is chosen by two numbers:
   - moves: the fewest moves from the board to its card (MOVES: 3 for the
     first board, 20 for the last; most boards are in the upper half, so a
     child who skips ahead still has boards to play);
   - dig: of those fewest moves, how many must park a disc somewhere it does
     not stay (to free one under it, or to make way), counted on the
     shortest way that parks least. A board where every disc goes straight
     to its place has dig 0; those are never chosen.
   Every board of a card's search layer `moves` away is scored, and the
   board is picked, by a fixed seed, from the ones that dig most, with no
   more than one disc in the lane and as many discs out of place as can be.

   A move can always be taken back, so a breadth-first search out from the
   card finds every board a given number of moves away, and none nearer (a
   card has about 880,000 boards, none more than 26 moves away). Each chosen
   board is checked again by a search from both ends. Nothing here is typed
   by hand but the cards' patterns (CARDS) and the climb (MOVES). */
const fs = require('fs');
const path = require('path');

const COLS = 4;
const CAP = 5; // four places and the lane

/* The cards, each as seen: four rows from the top, the columns from left
   to right. g green, r red, y yellow, b blue, as on the toy. In the order of
   the game: whole columns (the card in the photo first), rows, squares,
   then blocks, L, T and S shapes, slanted stripes and checks, then patterns
   where every color stands in four places. */
const CARDS = [
  // 1-10
  ['gryb', 'gryb', 'gryb', 'gryb'], // the card in the photo: green, red, yellow, blue
  ['byrg', 'byrg', 'byrg', 'byrg'],
  ['bbbb', 'yyyy', 'rrrr', 'gggg'],
  ['rbgy', 'rbgy', 'rbgy', 'rbgy'],
  ['gggg', 'rrrr', 'yyyy', 'bbbb'],
  ['ygbr', 'ygbr', 'ygbr', 'ygbr'],
  ['ggrr', 'ggrr', 'yybb', 'yybb'],
  ['rrrr', 'bbbb', 'gggg', 'yyyy'],
  ['bbyy', 'bbyy', 'rrgg', 'rrgg'],
  ['yygg', 'yygg', 'bbrr', 'bbrr'],
  // 11-25
  ['gryy', 'gryy', 'grbb', 'grbb'],
  ['bbbb', 'rryy', 'rryy', 'gggg'],
  ['grby', 'grby', 'rgyb', 'rgyb'],
  ['ggyy', 'rrbb', 'rrbb', 'ggyy'],
  ['gggr', 'gyyr', 'yyrr', 'bbbb'],
  ['ggrr', 'gybr', 'gybr', 'yybb'],
  ['bbyy', 'brgy', 'brgy', 'rrgg'],
  ['rrrg', 'brgg', 'bbyg', 'byyy'],
  ['yyyb', 'gybb', 'ggrb', 'grrr'],
  ['ggrr', 'yggr', 'yybr', 'ybbb'],
  ['gggy', 'brry', 'brry', 'bbgy'],
  ['grgr', 'ybyb', 'grgr', 'ybyb'],
  ['gygy', 'rbrb', 'gygy', 'rbrb'],
  ['gryb', 'ybgr', 'gryb', 'ybgr'],
  ['ggrr', 'yybb', 'rrgg', 'bbyy'],
  // 26-50
  ['gryb', 'rybg', 'ybgr', 'bgry'],
  ['gryb', 'bgry', 'ybgr', 'rybg'],
  ['byrg', 'yrgb', 'rgby', 'gbyr'],
  ['grrg', 'ybby', 'ybby', 'grrg'],
  ['byyb', 'rggr', 'rggr', 'byyb'],
  ['yggy', 'gbbg', 'rbbr', 'yrry'],
  ['bggb', 'grrg', 'yrry', 'byyb'],
  ['rbbr', 'gyyg', 'gyyg', 'rbbr'],
  ['gryb', 'bygr', 'gryb', 'bygr'],
  ['grby', 'bygr', 'rgyb', 'ybrg'],
  ['rygb', 'gbry', 'bryg', 'ygbr'],
  ['rgby', 'byrg', 'gryb', 'ybgr'],
  ['ybrg', 'rgyb', 'bygr', 'grby'],
  ['bgyr', 'yrbg', 'gbry', 'rygb'],
  ['grby', 'rbyg', 'bygr', 'ygrb'],
  ['yrbg', 'bgyr', 'rygb', 'gbry'],
  ['grrb', 'ygby', 'byrg', 'rbgy'],
  ['rygb', 'byrg', 'grby', 'ygbr'],
  ['bbgy', 'ryrg', 'gybr', 'yrgb'],
  ['ygry', 'brgb', 'rybg', 'gbry'],
  ['grgy', 'byrb', 'ybgr', 'rygb'],
  ['rrby', 'gybg', 'bygr', 'ygbr'],
  ['yrbg', 'gbyy', 'rgbr', 'bryg'],
  ['bgrb', 'ryyg', 'gbry', 'yrgb'],
  ['gyyr', 'rbgb', 'ygrb', 'bgry'],
];

/* The fewest moves from each board to its card: ten boards from 3 to 8,
   fifteen from 9 to 13, twenty-five from 14 to 20. */
const MOVES = [
  3, 4, 5, 5, 6, 6, 7, 7, 8, 8,
  9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12, 13, 13, 13,
  14, 14, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 19, 19, 19, 20, 20, 20,
];

const key = (cols) => cols.join('|');
const columns = (rows) => Array.from({ length: COLS }, (_, c) => rows.map((row) => row[c]).reverse().join(''));

function* moves(cols) {
  for (let a = 0; a < COLS; a++) {
    if (!cols[a].length) continue;
    for (let b = 0; b < COLS; b++) {
      if (b === a || cols[b].length >= CAP) continue;
      let open = true;
      for (let c = Math.min(a, b) + 1; c < Math.max(a, b); c++) if (cols[c].length >= CAP) open = false;
      if (!open) continue;
      const next = cols.slice();
      next[b] = cols[b] + cols[a].slice(-1);
      next[a] = cols[a].slice(0, -1);
      yield { a, b, next };
    }
  }
}

/* Whether moving column a's top disc to column b puts it in its place for
   good: on the card's color at that height, over a column already right. */
const final = (cols, a, b, card) => {
  const r = cols[b].length;
  return r < 4 && card[b][r] === cols[a][cols[a].length - 1] && cols[b] === card[b].slice(0, r);
};

/* The search out from the card to `depth`: every board's distance, and
   each layer's boards; then, layer by layer, the least digging on a
   shortest way from each board to the card. */
function search(card, depth) {
  const dist = new Map([[key(card), 0]]);
  const layers = [[card]];
  for (let d = 1; d <= depth; d++) {
    const next = [];
    for (const cols of layers[d - 1]) {
      for (const { next: m } of moves(cols)) {
        const k = key(m);
        if (dist.has(k)) continue;
        dist.set(k, d);
        next.push(m);
      }
    }
    layers.push(next);
  }
  const dig = new Map([[key(card), 0]]);
  for (let d = 1; d <= depth; d++) {
    for (const cols of layers[d]) {
      let best = Infinity;
      for (const { a, b, next } of moves(cols)) {
        const k = key(next);
        if (dist.get(k) !== d - 1) continue;
        best = Math.min(best, dig.get(k) + (final(cols, a, b, card) ? 0 : 1));
      }
      dig.set(key(cols), best);
    }
  }
  return { layers, dig, size: dist.size };
}

/* The fewest moves between two boards, by a search from both ends. */
function distance(from, to) {
  if (key(from) === key(to)) return 0;
  const sides = [new Map([[key(from), 0]]), new Map([[key(to), 0]])];
  const edges = [[from], [to]];
  for (;;) {
    const s = sides[0].size <= sides[1].size ? 0 : 1;
    const mine = sides[s];
    const other = sides[1 - s];
    const next = [];
    let found = Infinity;
    for (const cols of edges[s]) {
      const d = mine.get(key(cols)) + 1;
      for (const { next: m } of moves(cols)) {
        const k = key(m);
        if (other.has(k)) found = Math.min(found, d + other.get(k));
        if (mine.has(k)) continue;
        mine.set(k, d);
        next.push(m);
      }
    }
    if (found < Infinity) return found;
    if (!next.length) return Infinity;
    edges[s] = next;
  }
}

/* A small fixed random sequence (mulberry32), so the file never changes by chance. */
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const inLane = (cols) => cols.filter((c) => c.length === CAP).length;
const off = (cols, card) => {
  let n = 0;
  cols.forEach((col, c) => {
    for (let r = 0; r < CAP; r++) if (col[r] !== card[c][r]) n += 1;
  });
  return n;
};

if (CARDS.length !== MOVES.length) throw new Error(`${CARDS.length} cards, ${MOVES.length} climbs`);
const out = [];
const began = Date.now();
CARDS.forEach((rows, i) => {
  if (rows.length !== 4 || rows.some((row) => row.length !== COLS || /[^grby]/.test(row))) throw new Error(`card ${i + 1}: four rows of four of g r y b`);
  for (const color of 'grby') {
    const n = rows.join('').split(color).length - 1;
    if (n !== 4) throw new Error(`card ${i + 1}: ${n} of ${color}, not four`);
  }
  const twin = CARDS.findIndex((other) => other.join() === rows.join());
  if (twin !== i) throw new Error(`card ${i + 1} is card ${twin + 1} again`);
  const card = columns(rows);
  const depth = MOVES[i];
  const { layers, dig, size } = search(card, depth);
  let pool = layers[depth];
  const calm = pool.filter((cols) => inLane(cols) <= 1);
  if (calm.length >= 20) pool = calm;
  const scored = pool.map((cols) => ({ cols, dig: dig.get(key(cols)), off: off(cols, card) }));
  const most = Math.max(...scored.map((b) => b.dig));
  // The boards that dig most, and of those the most mixed up.
  let best = scored.filter((b) => b.dig === most).sort((p, q) => q.off - p.off || (key(p.cols) < key(q.cols) ? -1 : 1));
  best = best.slice(0, Math.max(6, Math.ceil(best.length / 4)));
  const picked = best[Math.floor(random(1447 + i * 7919)() * best.length)];
  if (!picked || picked.dig === 0) throw new Error(`card ${i + 1}: no board that needs digging`);
  const check = distance(picked.cols, card);
  if (check !== depth) throw new Error(`card ${i + 1}: the board is ${check} moves away, not ${depth}`);
  console.log(`board ${String(i + 1).padStart(2)}: ${depth} moves, ${picked.dig} of them parking (the most there is), ${picked.off} places off; ${layers[depth].length} boards that far, ${size} searched, ${((Date.now() - began) / 1000).toFixed(0)} s`);
  out.push({ card, moves: depth, dig: picked.dig, start: picked.cols });
});

const file = path.join(__dirname, '..', 'public', 'circles', 'cards.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
const lines = out.map((b) => `  ${JSON.stringify(b)}`);
fs.writeFileSync(file, `{ "about": "Written by tools/make-circles.js; never edit by hand. Each card and start is four columns, from left to right, each read from the bottom up (g green, r red, y yellow, b blue); a fifth disc in a column rests in the lane across the top. moves: the fewest moves from start to card; dig: how many of them must park a disc.",\n"cards": [\n${lines.join(',\n')}\n] }\n`);
console.log(`wrote ${path.relative(path.join(__dirname, '..'), file)}`);
