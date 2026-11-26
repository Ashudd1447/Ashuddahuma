/* السَّاعَةُ: telling the time. One big clock whose hands the child turns.
   The hands move together as on a real clock: the long hand going round once
   moves the short hand one hour. Let go and the clock settles on the nearest
   whole hour and says it. The card above the clock shows an hour; when the
   clock settles on it, the hour is said, then a chime, a star and أحسنت, and
   a new hour comes. Any other hour is simply said: nothing is ever wrong.
   Behind the clock the sky follows the time of day.
   Two ways to play, picked by the two round buttons and remembered on the
   device: the hours, in any order, or "my day", where the card shows a
   picture of his day with its hour, in the order of the day. */
const $ = (id) => document.getElementById(id);

const KEY = 'clock';
const HOURS = [
  'السَّاعَةُ الْوَاحِدَةُ',
  'السَّاعَةُ الثَّانِيَةُ',
  'السَّاعَةُ الثَّالِثَةُ',
  'السَّاعَةُ الرَّابِعَةُ',
  'السَّاعَةُ الْخَامِسَةُ',
  'السَّاعَةُ السَّادِسَةُ',
  'السَّاعَةُ السَّابِعَةُ',
  'السَّاعَةُ الثَّامِنَةُ',
  'السَّاعَةُ التَّاسِعَةُ',
  'السَّاعَةُ الْعَاشِرَةُ',
  'السَّاعَةُ الْحَادِيَةَ عَشْرَةَ',
  'السَّاعَةُ الثَّانِيَةَ عَشْرَةَ',
];
const clip = (hour) => `hour-${hour}`;
/* His day, in order: the picture (images/day/<name>.webp) and its hour on a
   24-hour clock, so the sky can follow. The hours are placeholders until the
   parents give the real ones. */
const DAY = [
  { name: 'wake', hour: 7 },
  { name: 'breakfast', hour: 8 },
  { name: 'quran', hour: 9 },
  { name: 'play', hour: 10 },
  { name: 'lunch', hour: 13 },
  { name: 'nap', hour: 14 },
  { name: 'park', hour: 16 },
  { name: 'dinner', hour: 18 },
  { name: 'teeth', hour: 19 },
  { name: 'bed', hour: 20 },
];
const MODES = ['hours', 'day'];
const twelve = (hour) => mod(hour - 1, 12) + 1;
const PRAISE = 'well-done';
const DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arabic = (n) => String(n).replace(/\d/g, (d) => DIGITS[d]);
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
const SETTLE_MS = 420;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const mod = (n, m) => ((n % m) + m) % m;

/* The sky through the day: hour, top of the sky, horizon, the town's
   silhouette. Colors in between are blended. */
const SKY = [
  [0, '#121C3A', '#2A3864', '#211C33'],
  [4.5, '#18254C', '#38457A', '#28223D'],
  [5.75, '#45508A', '#E59A6E', '#5B4754'],
  [6.75, '#7DB5E2', '#F6D7A4', '#B4977A'],
  [9, '#5CABE4', '#CDE8F8', '#D7B98F'],
  [15, '#5CABE4', '#D3EAF6', '#D7B98F'],
  [17.25, '#78A3D4', '#F2D19A', '#C7A07D'],
  [18.25, '#5A4A85', '#EC9263', '#7A5859'],
  [19.25, '#26315E', '#57497C', '#382D44'],
  [21, '#121C3A', '#2A3864', '#211C33'],
  [24, '#121C3A', '#2A3864', '#211C33'],
];
const WINDOW_DAY = '#AE8D67';
const WINDOW_NIGHT = '#F4C35E';

const root = $('clock-game');
const dial = $('dial');
const sky = $('sky');
const card = $('target');

let minutes = 0; // minutes since midnight; runs past a day either way as the hands turn
let target = 1;
let stars = 0;
let shown = 0;
let grab = null;
let settleTimer = null;
let busy = false; // during the praise, the clock rests
let mode = 'hours';
let scene = 0; // the picture shown in "my day"

/* Drawing the dial: ticks, the numbers ١ to ١٢, the two hands. In the SVG,
   0 0 is the center and the face has a radius of 92. */
function buildDial() {
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0;
    ticks += `<line class="tick${big ? ' big' : ''}" x1="0" y1="${big ? -80 : -83}" x2="0" y2="-87" transform="rotate(${i * 6})"/>`;
  }
  let numbers = '';
  for (let h = 1; h <= 12; h++) {
    const a = (h * 30 * Math.PI) / 180;
    numbers += `<text x="${(Math.sin(a) * 66).toFixed(2)}" y="${(-Math.cos(a) * 66).toFixed(2)}">${arabic(h)}</text>`;
  }
  dial.innerHTML = `
    <circle class="rim" r="98"/>
    <circle class="face" r="92"/>
    ${ticks}
    <g class="numbers">${numbers}</g>
    <g class="hand hour" id="hour-hand"><path d="M-6.5 11 L-5.5 -34 L0 -48 L5.5 -34 L6.5 11 Z"/></g>
    <g class="hand minute" id="minute-hand"><path d="M-3.6 13 L-2.6 -66 L0 -78 L2.6 -66 L3.6 13 Z"/></g>
    <circle class="cap" r="7.5"/>
    <circle class="pin" r="2.6"/>`;
}

const hourOf = (m) => mod(Math.round(m / 60) - 1, 12) + 1;

function render() {
  $('hour-hand').style.transform = `rotate(${minutes * 0.5}deg)`;
  $('minute-hand').style.transform = `rotate(${minutes * 6}deg)`;
  paintSky();
}

/* The sky */
function rgb(color) {
  const n = parseInt(color.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  const x = rgb(a);
  const y = rgb(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
}

function paintSky() {
  const h = mod(minutes, 1440) / 60;
  let i = 0;
  while (h > SKY[i + 1][0]) i++;
  const [h0, ...from] = SKY[i];
  const [h1, ...to] = SKY[i + 1];
  const t = (h - h0) / (h1 - h0);
  const night = h < 5 ? 1 : h < 6.5 ? (6.5 - h) / 1.5 : h < 18 ? 0 : h < 19.5 ? (h - 18) / 1.5 : 1;
  const style = sky.style;
  style.setProperty('--sky-top', mix(from[0], to[0], t));
  style.setProperty('--sky-bottom', mix(from[1], to[1], t));
  style.setProperty('--land', mix(from[2], to[2], t));
  style.setProperty('--glow', mix(WINDOW_DAY, WINDOW_NIGHT, night));
  style.setProperty('--night', night.toFixed(3));
  // The sun rises on the right and sets on the left; the moon follows it at night.
  const width = sky.clientWidth;
  const height = sky.clientHeight;
  const arc = (f, top) => {
    const shown = f > -0.06 && f < 1.06;
    const x = width * (0.92 - 0.84 * f);
    const y = shown ? height * (0.8 - Math.sin(Math.PI * Math.min(Math.max(f, 0), 1)) * top) : height * 1.3;
    return `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
  };
  $('sun').style.transform = arc((h - 6) / 12, 0.52);
  $('moon').style.transform = arc(mod(h - 18.5, 24) / 11.5, 0.5);
}

function scatterStars() {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const box = $('stars');
  for (let i = 0; i < 34; i++) {
    const star = document.createElement('i');
    star.style.left = `${(random() * 100).toFixed(1)}%`;
    star.style.top = `${(random() * 62).toFixed(1)}%`;
    const size = 2 + random() * 2.5;
    star.style.width = `${size.toFixed(1)}px`;
    star.style.height = `${size.toFixed(1)}px`;
    box.append(star);
  }
}

/* Turning the hands. A touch picks the hand nearest to it: near the middle,
   the short hand; further out, the long one. Angles are in degrees,
   clockwise from twelve. */
function polar(event) {
  const box = dial.getBoundingClientRect();
  const dx = event.clientX - (box.left + box.width / 2);
  const dy = event.clientY - (box.top + box.height / 2);
  const radius = (box.width / 2) * (92 / 100);
  return { angle: mod((Math.atan2(dx, -dy) * 180) / Math.PI, 360), r: Math.hypot(dx, dy) / radius };
}

const gap = (a, b) => {
  const d = mod(a - b, 360);
  return Math.min(d, 360 - d);
};

function pickHand(p) {
  const toHour = gap(p.angle, mod(minutes * 0.5, 360));
  const toMinute = gap(p.angle, mod(minutes * 6, 360));
  if (p.r < 0.62 && toHour < 35) return 'hour';
  if (toMinute < 35) return 'minute';
  if (toHour < 35) return 'hour';
  return toHour < toMinute ? 'hour' : 'minute';
}

function stopSettling() {
  if (!settleTimer) return;
  clearTimeout(settleTimer);
  settleTimer = null;
  dial.classList.remove('settling');
}

dial.addEventListener('pointerdown', (event) => {
  if (grab || busy || event.button > 0) return;
  stopSettling();
  const p = polar(event);
  grab = { id: event.pointerId, hand: pickHand(p), angle: p.angle, x: event.clientX, y: event.clientY, moved: false };
  dial.setPointerCapture(event.pointerId);
  event.preventDefault();
});

dial.addEventListener('pointermove', (event) => {
  if (!grab || event.pointerId !== grab.id) return;
  if (!grab.moved) {
    if (Math.hypot(event.clientX - grab.x, event.clientY - grab.y) < 8) return;
    grab.moved = true;
    $(`${grab.hand}-hand`).classList.add('held');
  }
  const p = polar(event);
  if (p.r < 0.12) return; // too near the middle for a steady angle
  let turn = mod(p.angle - grab.angle, 360);
  if (turn > 180) turn -= 360;
  grab.angle = p.angle;
  minutes += grab.hand === 'minute' ? turn / 6 : turn * 2;
  render();
});

function letGo(event) {
  if (!grab || event.pointerId !== grab.id) return;
  const { moved, hand } = grab;
  grab = null;
  $(`${hand}-hand`).classList.remove('held');
  if (moved) settle();
  else if (event.type === 'pointerup') sayTime();
}

dial.addEventListener('pointerup', letGo);
dial.addEventListener('pointercancel', letGo);
dial.addEventListener('lostpointercapture', letGo);

/* On a computer: the arrow keys move an hour, Enter or Space says the time. */
dial.addEventListener('keydown', (event) => {
  if (busy) return;
  const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[event.key];
  if (step) {
    event.preventDefault();
    stopSettling();
    minutes = Math.round(minutes / 60) * 60 + step * 60;
    settle();
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    sayTime();
  }
});

/* The hands spring onto the nearest whole hour, then the hour is said. */
function settle() {
  minutes = Math.round(minutes / 60) * 60;
  dial.classList.add('settling');
  render();
  settleTimer = setTimeout(() => {
    settleTimer = null;
    dial.classList.remove('settling');
    settled();
  }, SETTLE_MS);
}

function sayTime() {
  sound.say(clip(hourOf(minutes)));
}

function settled() {
  const hour = hourOf(minutes);
  const said = sound.say(clip(hour));
  if (hour !== target) return;
  busy = true;
  card.classList.remove('invite');
  card.classList.add('won');
  stars += 1;
  save();
  flyStar();
  if (mode === 'day') showSceneSky();
  // A missing or stalled clip never holds up the praise for long.
  Promise.race([said, delay(4000)]).then(praise);
}

async function praise() {
  sound.chime();
  await delay(350);
  sound.play(PRAISE);
  await delay(1900);
  nextTarget(true);
  busy = false;
}

/* In "my day", once the clock shows the picture's hour, the sky turns to
   that time of day: morning or evening at seven. The hands do not move,
   since twelve hours is a whole turn of both. */
function showSceneSky() {
  const wanted = DAY[scene].hour * 60;
  const off = wanted - mod(minutes, 1440);
  if (mod(off, 720) !== 0) return;
  minutes += off;
  render();
}

function nextTarget(speak) {
  if (mode === 'day') {
    scene = (scene + 1) % DAY.length;
    target = twelve(DAY[scene].hour);
  } else {
    const now = hourOf(minutes);
    const choices = [];
    for (let h = 1; h <= 12; h++) if (h !== now && h !== target) choices.push(h);
    target = choices[Math.floor(Math.random() * choices.length)];
  }
  showTarget();
  if (speak) sound.say(clip(target));
}

/* The hour's words on the card show only when its Fusha recording is the
   one that plays. The father's rule (2026-11-25): Fusha text never stands on
   the screen while the Egyptian voice says it in other words (Fusha says
   "the second hour", Egyptian "two o'clock"). The speaker mark stays, so the
   card is still the button that says the hour, and in "my day" the picture
   stays too. On Egyptian the words wait unseen until sound.masri() answers;
   the switch sends 'dialectchange', followed at once. */
let textAsked = 0;
function showTargetText() {
  const text = $('target-text');
  const mine = ++textAsked;
  text.textContent = HOURS[target - 1];
  if (typeof sound.masri !== 'function') {
    text.hidden = false;
    return;
  }
  if (sound.dialect() === 'masri') text.hidden = true;
  Promise.resolve()
    .then(() => sound.masri(clip(target)))
    .then((yes) => yes === true, () => false)
    .then((yes) => {
      if (mine === textAsked) text.hidden = yes;
    });
}
addEventListener('dialectchange', () => {
  if (target) showTargetText();
});

function showTarget() {
  showTargetText();
  const picture = $('target-img');
  picture.hidden = mode !== 'day';
  if (mode === 'day') picture.src = `images/day/${DAY[scene].name}.webp`;
  card.classList.toggle('day', mode === 'day');
  card.classList.remove('won', 'new');
  void card.offsetWidth; // restart the arrival animation
  card.classList.add('new');
  setTimeout(() => card.classList.remove('new'), 500);
}

/* The two ways to play. "My day" starts at the next picture after the time
   now, so at four in the afternoon it is the park. */
function setMode(next, speak) {
  mode = MODES.includes(next) ? next : 'hours';
  for (const button of document.querySelectorAll('[data-mode]')) {
    const on = button.dataset.mode === mode;
    button.classList.toggle('on', on);
    button.setAttribute('aria-pressed', String(on));
  }
  if (mode === 'day') {
    const hour = new Date().getHours();
    const next = DAY.findIndex((item) => item.hour > hour);
    scene = mod((next === -1 ? 0 : next) - 1, DAY.length);
  }
  nextTarget(speak);
}

for (const button of document.querySelectorAll('[data-mode]')) {
  button.addEventListener('click', () => {
    if (busy || button.dataset.mode === mode) return;
    card.classList.remove('invite');
    setMode(button.dataset.mode, true);
    save();
  });
}

card.addEventListener('click', () => {
  if (busy) return;
  card.classList.remove('invite');
  sound.say(clip(target));
});

/* Stars */
function showCount() {
  $('count').textContent = arabic(shown);
}

function flyStar() {
  const from = card.getBoundingClientRect();
  const to = $('score-star').getBoundingClientRect();
  const x = from.left + from.width / 2;
  const y = from.top + from.height / 2;
  const tx = to.left + to.width / 2;
  const ty = to.top + to.height / 2;
  const size = Math.max(40, from.height);
  const star = document.createElement('div');
  star.className = 'fly-star';
  star.style.width = `${size}px`;
  star.style.height = `${size}px`;
  star.innerHTML = STAR;
  root.append(star);
  let counted = false;
  const count = () => {
    if (counted) return;
    counted = true;
    star.remove();
    shown = stars;
    showCount();
    $('score').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 280 });
  };
  star.animate(
    [
      { transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(.2)`, opacity: 0 },
      { transform: `translate(${x}px, ${y - size * 0.8}px) translate(-50%, -50%) scale(1.3)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${tx}px, ${ty}px) translate(-50%, -50%) scale(.45)`, opacity: 1 },
    ],
    { duration: 900, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'backwards' },
  ).finished.then(count, count);
  setTimeout(count, 1200); // in case the animation never runs
}

/* Saved on the device: the stars and the way to play. The clock itself opens
   at the real time. */
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ stars, mode }));
  } catch {
    // Private browsing: the stars last for this visit only.
  }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && Number.isInteger(saved.stars) && saved.stars >= 0) stars = saved.stars;
    if (saved && MODES.includes(saved.mode)) mode = saved.mode;
  } catch {
    stars = 0;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && grab) {
    $(`${grab.hand}-hand`).classList.remove('held');
    grab = null;
    settle();
  }
});
addEventListener('resize', paintSky);

/* Start */
buildDial();
scatterStars();
load();
shown = stars;
showCount();
const now = new Date();
minutes = Math.round((now.getHours() * 60 + now.getMinutes()) / 60) * 60;
render();
setMode(mode, false);
card.classList.add('invite');
sound.preloadPrompts(HOURS.map((_, i) => clip(i + 1)));
sound.preload([PRAISE]);
