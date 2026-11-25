/* The red lights and the crossings of the driving games, tried by script.

     node tools/test-drive-stops.js

   The local site must be running (firebase serve --only hosting --port 5000).
   Every street of drive.html (not the desert ride) is driven from its start
   to its end many times, in the ways a child might drive: the pedal held,
   tapped, let go or pressed at the worst moment before a stop; in each lane,
   weaving through traffic, changing lanes at the line; with traffic and on
   an empty road; with a light that is red from far away; with slow frames.
   The drive is stepped by hand through window.driveGame, so a whole drive
   takes a moment and the same deal of traffic comes every time.

   It fails, with exit code 1 and the drive's name, when the child's car
   - has its nose over the line of a red light or of a crossing with people on it,
   - or stands still for good, or never arrives,
   - or meets a stop that never turned, or that it never stood at,
   - or stands at a stop with no red hand on the pedals (or shows one with nothing to wait for),
   - or when any car is where a person is walking. */
const { open } = require('./browser.js');

const PAGE = 'http://localhost:5000/drive.html';

/* One whole drive, run inside the page. Returns what went wrong, as a list of sentences. */
function drive(o) {
  const game = window.driveGame;
  game.road = o.road;
  game.startTrip(o.deal);
  game.hold();
  const trip = game.trip;
  const keys = game.keys;
  const spare = { ...trip.cars[0] }; // a car of the traffic, to copy
  if (!o.traffic) trip.cars.length = 0;
  let seed = o.deal * 7919 + 13;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const holds = (stop) => stop.state === 'red' || stop.state === 'walk';
  const hand = () => document.getElementById('drive').classList.contains('wait');
  const wrong = [];
  const said = new Set();
  const say = (text, more = '') => said.has(text) || (said.add(text), wrong.push(text + more)); // each thing once, as it first happened
  const tap = { on: false, until: 0 };
  let mine = 1; // the lane a weaving driver is in: 0, 1 or 2
  let time = 0;
  let still = 0;

  while (!trip.done && time < 600 && still < 40) {
    const nose = trip.y + trip.l / 2;
    const next = trip.stops.find((stop) => stop.state !== 'done' && stop.y > nose - 0.3);
    const away = next ? next.y - nose : Infinity;

    // The pedal: held, tapped on and off, let go before a stop, or pressed before one after crawling up to it.
    if (o.pedal === 'taps' && trip.t >= tap.until) {
      tap.on = !tap.on;
      tap.until = trip.t + (tap.on ? 0.3 + random() * 2.2 : 0.2 + random() * 1.2);
    }
    keys.gas = o.pedal === 'held' || (o.pedal === 'taps' && tap.on)
      || (o.letGoAt !== undefined && away > o.letGoAt) || (o.pressAt !== undefined && (away < o.pressAt || away > 60));

    // The steering: to one place across the road, around the traffic, or full lock left and right near a stop.
    let to = typeof o.steer === 'number' ? o.steer : null;
    if (o.steer === 'weave') {
      const room = [0, 1, 2].map((lane) => Math.min(...trip.cars.filter((car) => car.lane === lane && car.y > trip.y - 0.5).map((car) => car.y - trip.y), 999));
      const best = room.indexOf(Math.max(...room));
      if (room[mine] < 14 && room[best] > room[mine] + 3) mine = best;
      to = mine - 1;
    }
    keys.left = to !== null && trip.x > to + 0.06;
    keys.right = to !== null && trip.x < to - 0.06;
    if (o.steer === 'swing' && away < 16) keys[Math.floor(trip.t * 2) % 2 ? 'left' : 'right'] = true;

    // A light that is red long before the car comes to it.
    if (o.redFrom && next && next.kind === 'light' && next.state === 'open' && away < o.redFrom) {
      next.state = 'red';
      next.clock = 0;
    }

    game.update(o.frame);
    time += o.frame;
    still = trip.phase === 'drive' && trip.v < 0.01 ? still + o.frame : 0;

    const front = trip.y + trip.l / 2;
    for (const stop of trip.stops) {
      if (!holds(stop)) continue;
      const what = stop.kind === 'light' ? `the red light at ${stop.y}` : `the people crossing at ${stop.y}`;
      // A car of the traffic with its nose right at the line as the people step out: too late to stop there, it drives on.
      if (o.late !== undefined && stop.kind === 'crossing' && stop.clock === 0) trip.cars.push({ ...spare, lane: 0, x: -1, y: stop.y + o.late - spare.l / 2, v: spare.cruise });
      if (front > stop.y) say(`passed ${what}`, ` at ${trip.v.toFixed(1)} lanes a second`);
      if (still > 0.3 && stop.y > front && stop.y - front < 12 && !hand()) say(`stood at ${what} with no red hand on the pedals`);
      for (const walker of stop.people) {
        if (Math.abs(walker.x) > 1.5) continue; // still on the walk
        const under = (car, x, wide) => Math.abs(walker.x - x) < wide && car.y + car.l / 2 > stop.y + walker.at - 0.1 && car.y - car.l / 2 < stop.y + walker.at + 0.1;
        if (under(trip, trip.x, 0.5) || trip.cars.some((car) => under(car, car.x, 0.45))) say(`a car was where a person walks at ${stop.y}`);
      }
    }
    if (hand() && !trip.stops.some(holds)) say('showed the red hand with nothing to wait for');
  }

  keys.gas = keys.left = keys.right = false;
  if (!trip.done) say(still >= 40 ? `stood still for good ${trip.y.toFixed(0)} lanes along` : `had not arrived after ${time.toFixed(0)} seconds (${trip.y.toFixed(0)} lanes along)`);
  for (const stop of trip.stops) {
    if (stop.state !== 'done') say(`the ${stop.kind} at ${stop.y} never held the road and cleared`);
    else if (!o.redFrom && !stop.waited) say(`never stood at the ${stop.kind} at ${stop.y}`);
  }
  return wrong;
}

/* The drives tried on every street. */
function drives() {
  const list = [];
  const add = (name, o) => list.push({ name, deal: 1, frame: 1 / 60, traffic: true, ...o });
  for (const traffic of [true, false]) {
    const cars = traffic ? 'with traffic' : 'on an empty road';
    for (const [lane, x] of [['left', -1], ['middle', 0], ['right', 1]]) add(`pedal held, ${lane} lane, ${cars}`, { pedal: 'held', steer: x, traffic });
    for (const deal of [1, 2, 3]) add(`pedal tapped, weaving, ${cars}, deal ${deal}`, { pedal: 'taps', steer: 'weave', traffic, deal });
    for (const pedal of ['held', 'taps']) add(`changing lanes at the line, pedal ${pedal}, ${cars}`, { pedal, steer: 'swing', traffic });
  }
  for (const deal of [1, 2, 3]) add(`pedal held, weaving through traffic, deal ${deal}`, { pedal: 'held', steer: 'weave', deal });
  // The worst moments. Before the fix of 2026-11-24 the car passed a stop when the pedal was let go
  // 7 to 14 lanes before it, and a light when the pedal was pressed 21 to 25 lanes before it.
  for (let at = 2; at <= 20; at += 1) add(`pedal let go ${at} lanes before each stop`, { letGoAt: at, traffic: false });
  for (let at = 14; at <= 30; at += 1) add(`pedal pressed ${at} lanes before each stop, from a crawl`, { pressAt: at, traffic: false });
  for (const pedal of ['held', 'up']) add(`lights red from 100 lanes away, pedal ${pedal}`, { pedal, redFrom: 100 });
  for (const late of [-0.1, 0, 0.1, 0.2]) add(`a car's nose ${late} lanes past the line as the people step out`, { pedal: 'held', steer: 1, late, traffic: false });
  for (const pedal of ['held', 'taps']) add(`slow frames, weaving, pedal ${pedal}`, { pedal, steer: 'weave', frame: 0.05 });
  return list;
}

(async () => {
  const page = await open(PAGE, { width: 1024, height: 768, touch: true });
  await page.until('window.driveGame && window.driveGame.chase');
  const streets = await page.eval('driveGame.streets');
  let failed = 0;
  for (const road of streets) {
    const bad = [];
    const list = drives();
    for (const item of list) {
      const wrong = await page.eval(`(${drive})(${JSON.stringify({ road, ...item })})`);
      if (wrong.length) bad.push(`${item.name}: ${wrong.join('; ')}`);
    }
    console.log(`${road}: ${list.length} drives, ${bad.length ? `${bad.length} FAILED` : 'every stop kept'}`);
    for (const line of bad) console.log(`  ${line}`);
    failed += bad.length;
  }
  if (page.errors.length) {
    console.log('Errors on the page:', page.errors);
    failed += page.errors.length;
  }
  await page.close();
  if (failed) {
    console.error(`FAILED: ${failed} ${failed === 1 ? 'drive' : 'drives'} went wrong.`);
    process.exit(1);
  }
  console.log('The car stopped at every red light and every crossing, and arrived every time.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
