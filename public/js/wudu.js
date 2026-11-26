/* الْوُضُوءُ: two parts, each a large card (salah.js keeps the cards, the
   quiz and the praise).

   أَتَوَضَّأُ: the child does the wudu with the boy, station by station, in
   order: eleven stations, from the bismillah to the left foot. A station
   shows its picture, its words under it, and says them. He does the washing
   himself: he rubs or taps the picture, and each rub is one washing: water
   sounds, a few drops fall over the picture, and one of the station's drops
   fills. A station done three times has three drops, numbered ١ ٢ ٣; one done
   once has one. Wiping the head and the ears is done with wet hands, so its
   water is quieter. The first station is words alone, the bismillah: it has
   a round mark and no water, and a tap fills it. When the marks are full a
   chime plays and the next station comes by itself. After the last, the left
   foot: أحسنت, and the quiz begins.

   مَاذَا بَعْدُ؟: the quiz, in salah.js. */
const $ = (id) => document.getElementById(id);
const { WUDU } = salah;

const RUB = 0.45; // of the picture's width: how far a finger rubs for one washing
const RUB_LEAST = 70; // px, on a small screen
const GAP = 480; // ms between two washings of one long rub
const AFTER = 1250; // ms a finished station shows before the next, at least
const DROP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2C12 2.2 4.6 10.4 4.6 15.2a7.4 7.4 0 0 0 14.8 0C19.4 10.4 12 2.2 12 2.2z"/></svg>';
const SAID = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.6"/><path class="tick" d="M7.4 12.4l3.2 3.2 6-6.6"/></svg>';

const root = $('salah');
const pic = $('pic');
const splashBox = $('splash');
const marks = $('marks');
const label = $('label');

let at = 0; // the station
let washed = 0; // how many times it has been done
let busy = true; // between two stations, and outside this part
let turn = 0; // counts stations and visits: what an older one started must not finish
let press = null; // the finger on the picture
let lastWash = 0;
let spoken = Promise.resolve(); // the station's words being said

/* Water: a soft splash that falls away, its hiss, and two drips. Wet hands
   wiping are quieter and have no drips. */
function water(soft) {
  const loud = soft ? 0.5 : 1;
  salah.beep('rush', 1500, 0, 0.42, 0.03 * loud, 0.7, 700);
  salah.beep('rush', 3600, 0.02, 0.2, 0.014 * loud, 1.4, 2400);
  if (soft) return;
  const drip = 520 + Math.random() * 260;
  salah.beep('tone', drip, 0.16, 0.07, 0.02, 'sine', drip * 1.7);
  salah.beep('tone', drip * 1.25, 0.3, 0.06, 0.014, 'sine', drip * 2);
}

/* A few drops over the picture, around the finger, for a moment. */
function splash(x, y, count) {
  const box = pic.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const drop = document.createElement('i');
    drop.className = 'w-drop';
    const size = Math.max(10, box.width * (0.03 + Math.random() * 0.035));
    const left = Math.min(box.width - size, Math.max(size, x - box.left + (Math.random() - 0.5) * box.width * 0.4));
    const top = Math.min(box.height * 0.82, Math.max(size, y - box.top + (Math.random() - 0.5) * box.height * 0.24));
    drop.style.cssText = `left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;animation-delay:${(Math.random() * 0.14).toFixed(2)}s`;
    splashBox.append(drop);
    setTimeout(() => drop.remove(), 1000);
  }
}

function openStation(i) {
  const mine = ++turn;
  at = i;
  washed = 0;
  press = null;
  const station = WUDU[at];
  sound.stop();
  const old = pic.querySelector('.s-pic');
  if (old) old.remove();
  pic.prepend(salah.picture(station));
  pic.classList.remove('next');
  void pic.offsetWidth; // restart the arrival
  pic.classList.add('next');
  pic.setAttribute('aria-label', station.label);
  label.textContent = station.label;
  marks.replaceChildren(...Array.from({ length: station.times }, (_, n) => {
    const mark = document.createElement('span');
    mark.className = station.kind === 'say' ? 'w-mark said' : 'w-mark';
    mark.innerHTML = station.kind === 'say' ? SAID : `${DROP}<b>${salah.arabic(n + 1)}</b>`;
    return mark;
  }));
  salah.dots($('dots'), WUDU.length, at);
  busy = false;
  spoken = salah.hear(station.clip, { prompt: true, still: () => mine === turn });
}

/* One washing, where the finger is. The last one of a station chimes, and
   when its words have been said the next station comes. */
function wash(x, y) {
  if (busy) return;
  const station = WUDU[at];
  lastWash = performance.now();
  marks.children[washed].classList.add('on');
  washed += 1;
  if (station.kind === 'say') salah.beep('tick');
  else {
    water(station.kind === 'wipe');
    splash(x, y, station.kind === 'wipe' ? 4 : 7);
  }
  if (washed < station.times) return;
  busy = true;
  const mine = turn;
  salah.delay(380).then(() => {
    if (mine === turn) salah.beep('chime');
  });
  Promise.all([salah.delay(AFTER), spoken]).then(() => {
    if (mine !== turn) return;
    if (at + 1 < WUDU.length) openStation(at + 1);
    else page.endDo();
  });
}

function middle() {
  const box = pic.getBoundingClientRect();
  return [box.left + box.width / 2, box.top + box.height / 2];
}

/* The finger on the picture. A rub across it is a washing, and a long rub
   goes on to the next one; a tap is a washing too. */
pic.addEventListener('pointerdown', (event) => {
  if (event.button > 0 || (press && !event.isPrimary)) return;
  event.preventDefault();
  press = { id: event.pointerId, x: event.clientX, y: event.clientY, travel: 0, washes: 0 };
  try {
    pic.setPointerCapture(event.pointerId);
  } catch {
    // A pointer that is already gone cannot be held.
  }
});
pic.addEventListener('pointermove', (event) => {
  if (!press || event.pointerId !== press.id) return;
  press.travel += Math.hypot(event.clientX - press.x, event.clientY - press.y);
  press.x = event.clientX;
  press.y = event.clientY;
  if (press.travel < Math.max(RUB_LEAST, pic.clientWidth * RUB) || performance.now() - lastWash < GAP) return;
  press.travel = 0;
  press.washes += 1;
  wash(press.x, press.y);
});
function lift(event) {
  if (!press || event.pointerId !== press.id) return;
  const { washes, x, y } = press;
  press = null;
  if (event.type === 'pointerup' && !washes) wash(x, y);
}
pic.addEventListener('pointerup', lift);
pic.addEventListener('pointercancel', lift);
pic.addEventListener('lostpointercapture', lift);
root.addEventListener('contextmenu', (event) => event.preventDefault());

/* A tap on the words says them again. */
label.addEventListener('click', () => {
  if (busy) return;
  const mine = turn;
  spoken = salah.hear(WUDU[at].clip, { prompt: true, still: () => mine === turn });
});

/* On a computer, Enter or Space is a washing. */
addEventListener('keydown', (event) => {
  if (page.where !== 'do' || event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
  /* A key pressed on the ✕, the menu or the words belongs to that button. */
  if (document.activeElement && ['BUTTON', 'A'].includes(document.activeElement.tagName)) return;
  event.preventDefault();
  wash(...middle());
});

function leave() {
  turn += 1;
  busy = true;
  press = null;
  splashBox.replaceChildren();
}

const page = salah.twoParts({ root, names: ['wudu', 'wudu-quiz'], stations: WUDU, begin: () => openStation(0), leave });

$('art-do').append(salah.picture(WUDU[1]));
$('art-quiz').append(salah.quizArt(WUDU[4]));
salah.preload(WUDU);
// Fusha only, as the whole salah door: preload, not preloadPrompts, so no dialect switch shows.
sound.preload([...WUDU.map((station) => station.clip), salah.TEXT.next.clip]);
sound.preload([salah.TEXT.praise.clip]);

/* For trying the game by hand on the family's computer. */
if (salah.LOCAL) {
  window.wuduGame = {
    page,
    open: openStation,
    wash: () => wash(...middle()),
    get state() {
      return { where: page.where, at, washed, busy, times: WUDU[at].times, quiz: page.quiz.state };
    },
  };
}
