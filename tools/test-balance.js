/* Checks the balance game's levels (public/js/balance-engine.js):

     node tools/test-balance.js

   - no level starts balanced, every level can be balanced, and no tray
     ever holds more than its ten places;
   - the tilt grows with every cup of difference and never passes its stop;
   - the beam settles on its spring;
   - skipping ahead never passes the end.
   Prints each level with its fewest moves. Exits with 1 on the first failure. */
const engine = require('../public/js/balance-engine.js');

const fail = (message) => {
  console.error(`FAIL ${message}`);
  process.exit(1);
};
const show = (cups) => (cups.length ? cups.join(' ') : '-');

for (const level of engine.LEVELS) {
  const n = level.index + 1;
  if (engine.balanced(level.left, level.right)) fail(`level ${n} starts balanced`);
  if (level.left.length > engine.SLOTS || level.right.length > engine.SLOTS) fail(`level ${n}: a tray is too full`);
  if (!Number.isFinite(level.fewest)) fail(`level ${n} cannot be balanced`);
  const stage = engine.STAGES.filter((first) => first <= level.index).length;
  console.log(String(n).padStart(2), `stage ${stage}`, `${show(level.left)} | ${show(level.right)} | shelf ${show(level.shelf)}`.padEnd(52), `${engine.weight(level.left)} : ${engine.weight(level.right)}`.padEnd(8), `fewest ${level.fewest}`);
}

// Every cup of difference moves the beam, up to the largest difference a level can make.
let last = 0;
for (let d = 1; d <= 20; d++) {
  const a = engine.tilt(d);
  if (a <= last && a < engine.MAX - 1e-9) fail(`a difference of ${d} does not move the beam further`);
  if (a > engine.MAX + 1e-9) fail('the beam passes its stop');
  last = a;
}
// The most one tray can weigh in a level: its ten places filled with the level's heaviest cups.
const heaviest = (level) => level.left.concat(level.right, level.shelf).map((cup) => engine.CUPS[cup].weight).sort((a, b) => b - a).slice(0, engine.SLOTS).reduce((a, b) => a + b, 0);
const most = Math.max(...engine.LEVELS.map(heaviest));
for (let d = 1; d <= most; d++) if (engine.tilt(d) <= engine.tilt(d - 1)) fail(`the beam rests at its stop at a difference of ${d}`);

const beam = { a: engine.MAX, v: 0 };
for (let t = 0; t < 3; t += 1 / 60) engine.swing(beam, 0, 1 / 60);
if (Math.abs(beam.a) > 0.002 || Math.abs(beam.v) > 0.01) fail(`the beam does not settle: ${beam.a} ${beam.v}`);

let at = 0;
let steps = 0;
while (at < engine.LEVELS.length - 1) {
  at = engine.nextAfter(at, true);
  steps += 1;
}
console.log(`ok: ${engine.LEVELS.length} levels; a child who solves each at once plays ${steps + 1}; the largest difference a level can make is ${most}`);
