/* الْمِيزَانُ, the balance (balance.html): its engine, with no page in it, so
   that node can load it (node tools/test-balance.js checks every level).
   js/balance.js draws, listens and saves.

   The father's rules, after the first version (2026-11-27), which used
   glasses of different shapes, half glasses, a jug and a basin, guesses,
   and moves that some rounds allowed and others did not:
   - Units are equal. Every cup is the same cup, always full. One cup on one
     side balances one cup on the other. Later a double cup comes: the same
     cup exactly twice as tall, which weighs two.
   - The goal of every level is to make the two sides balance.
   - The same moves in every level: a cup goes from anywhere to anywhere (the
     shelf of spare cups, the right tray, the left tray).
   - Every cup put on or taken off moves the beam: the tilt grows by the same
     step for each cup of difference (smaller steps past eight, so it never
     rests at a stop), and the beam glides there.
   - Each tray shows how many cups it holds (a double counts two), seen and
     not said.
   A level is balanced when both trays hold cups and weigh the same. */
const balanceEngine = (() => {
  /* The cups: c the cup, d the double cup. Widths and heights in cup widths. */
  const CUPS = {
    c: { weight: 1, h: 1.15 },
    d: { weight: 2, h: 2.3 },
  };
  const PER_ROW = 5; // a tray holds two rows of five
  const ROWS = 2;
  const SLOTS = PER_ROW * ROWS;

  /* The beam: 2.2 degrees for each cup of difference up to six, then 0.85
     a cup, so that even sixteen cups of difference (the most a level can
     make) still moves it; 22 at most. Positive turns the right arm down. */
  const DEG = Math.PI / 180;
  const STEP = 2.2 * DEG;
  const LATER = 0.85 * DEG;
  const MAX = 22 * DEG;
  function tilt(diff) {
    const d = Math.abs(diff);
    const a = d <= 6 ? d * STEP : 6 * STEP + (d - 6) * LATER;
    return Math.sign(diff) * Math.min(MAX, a);
  }
  /* One step of the beam's spring: beam = { a, v }; it glides to the goal
     with a small settle. */
  function swing(beam, goal, dt, stiff = 4.6, damp = 0.62) {
    const steps = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const acc = -stiff * stiff * (beam.a - goal) - 2 * damp * stiff * beam.v;
      beam.v += acc * h;
      beam.a += beam.v * h;
    }
    return beam;
  }

  const weight = (cups) => cups.reduce((sum, cup) => sum + CUPS[cup].weight, 0);
  const balanced = (left, right) => left.length > 0 && right.length > 0 && weight(left) === weight(right);

  /* Where the cups on a tray stand, in cup widths from the tray's middle:
     the front row first, read from the right as the site's other counting
     rows are, then the row behind. A row is centered; the row behind stands
     in the gaps of the row in front when its count lets it (an odd count is
     moved half a place). */
  const GAP = 0.14;
  const PLACE = 1 + GAP;
  function arrange(count) {
    const front = Math.min(count, PER_ROW);
    const back = Math.max(0, count - PER_ROW);
    const at = (n, k) => ((n - 1) / 2 - k) * PLACE;
    const spots = [];
    for (let k = 0; k < front; k++) spots.push({ x: at(front, k), row: 0 });
    const shift = back % 2 && back < PER_ROW ? PLACE / 2 : 0;
    for (let k = 0; k < back; k++) spots.push({ x: at(back, k) + shift, row: 1 });
    return spots;
  }

  /* The levels: forty, in six stages.
     1. One for one (1 to 8): a few cups against fewer, spare cups on the shelf.
     2. To ten (9 to 14): both trays hold cups; which one needs more?
     3. Too many (15 to 18): no spare cups; the difference is odd, so some
        cups must come off onto the shelf.
     4. Sharing (19 to 24): no spare cups; the difference is even: cups go
        from one tray to the other.
     5. Mixed (25 to 28): one or two spare cups, not enough on their own.
     6. The double cup (29 to 40): first alone against single cups, then mixed in.
     Any way that balances is right; the fewest moves (worked out below)
     only decide how far a solve skips ahead. */
  const RAW = [
    // 1. One for one
    ['c', '', 'c c c'],
    ['c c', 'c', 'c c c'],
    ['c c', '', 'c c c c'],
    ['c c c', 'c', 'c c c c'],
    ['c c c', '', 'c c c c c'],
    ['c', 'c c c c', 'c c c c c'],
    ['c c c c', 'c c', 'c c c c'],
    ['c c c c c', 'c', 'c c c c c c'],
    // 2. To ten
    ['c c c c c', 'c c c', 'c c c c c'],
    ['c c', 'c c c c c c', 'c c c c c c'],
    ['c c c c c c c', 'c c c c', 'c c c c c'],
    ['c c c', 'c c c c c c c c', 'c c c c c c c'],
    ['c c c c c c', 'c c c c c c c c c', 'c c c c c'],
    ['c c c c c c c c c c', 'c c c c c c', 'c c c c c c'],
    // 3. Too many
    ['c c c c', 'c c c', ''],
    ['c c c c c', 'c c', ''],
    ['c c c', 'c c c c c c c c', ''],
    ['c c c c c c c c c', 'c c c c', ''],
    // 4. Sharing
    ['c c c c', '', ''],
    ['c c', 'c c c c c c', ''],
    ['c c c c c c', '', ''],
    ['c', 'c c c c c c c c c', ''],
    ['c c c c c c c c', 'c c', ''],
    ['c c c c c c c c c c', '', ''],
    // 5. Mixed
    ['c c c c c c c', 'c c', 'c'],
    ['c', 'c c c c c c c c', 'c'],
    ['c c c c c c c c c', 'c c', 'c c'],
    ['c c c', 'c c c c c c c c c c', 'c'],
    // 6. The double cup
    ['d', '', 'c c c c'],
    ['c c', '', 'd c c'],
    ['d d', 'c c', 'c c c c'],
    ['d c', 'c', 'd c c'],
    ['d d d', 'c c c', 'c c c'],
    ['d d', 'c c c c c c', ''],
    ['d d d d', '', ''],
    ['d c c c', 'd', 'd'],
    ['d d d c', 'c', ''],
    ['c c c c c c c c c', 'd', ''],
    ['d d d d d', 'c c c', 'd'],
    ['c', 'd d d d d d', ''],
  ];
  const STAGES = [0, 8, 14, 18, 24, 28];
  const list = (text) => (text ? text.split(/\s+/).filter(Boolean) : []);
  const LEVELS = RAW.map(([left, right, shelf], index) => ({ index, left: list(left), right: list(right), shelf: list(shelf) }));

  /* The fewest moves that balance a level: a breadth-first search over how
     many cups and double cups are in each of the three places. */
  function fewest(level) {
    const count = (cups, kind) => cups.filter((cup) => cup === kind).length;
    const start = [count(level.left, 'c'), count(level.left, 'd'), count(level.right, 'c'), count(level.right, 'd'), count(level.shelf, 'c'), count(level.shelf, 'd')];
    const done = (s) => s[0] + s[1] > 0 && s[2] + s[3] > 0 && s[0] + 2 * s[1] === s[2] + 2 * s[3];
    const fits = (s) => s[0] + s[1] <= SLOTS && s[2] + s[3] <= SLOTS;
    const seen = new Set([start.join()]);
    let frontier = [start];
    for (let moves = 0; frontier.length; moves++) {
      if (frontier.some(done)) return moves;
      const next = [];
      for (const s of frontier) {
        for (const kind of [0, 1]) {
          for (const from of [0, 2, 4]) {
            if (!s[from + kind]) continue;
            for (const to of [0, 2, 4]) {
              if (to === from) continue;
              const t = s.slice();
              t[from + kind] -= 1;
              t[to + kind] += 1;
              const key = t.join();
              if (seen.has(key) || !fits(t)) continue;
              seen.add(key);
              next.push(t);
            }
          }
        }
      }
      frontier = next;
    }
    return Infinity;
  }
  for (const level of LEVELS) level.fewest = fewest(level);

  /* Skipping ahead, as in the color board: a level balanced in at most one
     move more than the fewest moves three levels on among the first fifteen,
     two among the next fifteen, one after that; any other, one. */
  const JUMP = [3, 2, 1];
  const tierOf = (i) => (i < 15 ? 0 : i < 30 ? 1 : 2);
  const clean = (level, moves) => moves <= level.fewest + 1;
  const nextAfter = (i, wasClean) => Math.min(LEVELS.length - 1, i + (wasClean ? JUMP[tierOf(i)] : 1));

  return { CUPS, PER_ROW, ROWS, SLOTS, GAP, MAX, tilt, swing, weight, balanced, arrange, LEVELS, STAGES, fewest, clean, nextAfter, JUMP, tierOf };
})();

if (typeof module !== 'undefined') module.exports = balanceEngine;
