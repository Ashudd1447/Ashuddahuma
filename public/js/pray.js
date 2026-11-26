/* صَلَاتِي: two parts, each a large card (salah.js keeps the cards, the quiz
   and the praise).

   أُصَلِّي: the child prays two rak'at with the boy, as Fajr. A station shows
   its picture, its name small, and what is said there, large and in full; its
   recording plays. Nothing moves on by itself from one station to the next,
   as in the stories: the large green arrow goes forward, and breathes when
   the words have been said; the other arrow goes back; the middle button says
   the station again. A station with several things to say (the seven ayat of
   Al-Fatihah, the two phrases on rising from the bowing, the tashahhud and
   the prayer on the Prophet, peace and blessings be upon him) shows them one
   at a time: with a recording, the next one follows it by itself, as one
   recitation; without one, the arrow shows it. On the way into a station a
   real prayer says «اللَّهُ أَكْبَرُ» (salah.js knows where): it shows small on
   the picture and is said first. The rak'ah is always in sight: above the
   picture stands its badge, «الرَّكْعَةُ الْأُولَى» or «الرَّكْعَةُ الثَّانِيَةُ» with
   two marks, the first lit or both; when a rak'ah begins its name is said
   before anything else, and when the second begins the badge stirs. A row of
   marks shows the two rak'at and where he is. After the second salam: أحسنت,
   and the quiz begins.

   The words come from salah/azkar.json and quran/fatihah.json, never from
   here. Al-Fatihah is in the Mushaf font, as recite.js shows it.

   مَاذَا بَعْدُ؟: the quiz, in salah.js, over the whole prayer: the same
   sixteen stations in the same order, with the same badge. */
const $ = (id) => document.getElementById(id);
const { PRAYER, TEXT } = salah;
const ORDER = PRAYER.map((one) => one.station); // the prayer, station by station
const RAKAT = PRAYER.map((one) => one.rakah); // and the rak'ah of each

const HINT_AFTER = 600; // ms after the words end before the forward arrow breathes
const BREATH = 600; // ms between two things said one after the other in one station
const TAKBIR_LEAST = 1100; // ms «اللَّهُ أَكْبَرُ» shows on the way into a station, at least
const SMALLEST = 12; // px: the words are never written smaller
const LARGEST = 76;

const root = $('salah');
const pic = $('pic');
const badge = $('rakah');
const pill = $('takbir');
const textBox = $('text');
const fitBox = $('fit');
const marksBox = $('marks');
const nextButton = $('next');
const prevButton = $('prev');

let words = { lines: () => [], ayat: [] }; // what is said, once fetched
let step = 0; // where in the prayer
let part = 0; // which of the station's sayings shows
let parts = [];
let run = 0; // counts what is shown: an older one's recording must not move the page
let hintTimer = 0;

/* The two rak'at as two groups of marks, one for each station. */
function drawMarks() {
  if (!marksBox.children.length) {
    for (const rakah of [1, 2]) {
      const group = document.createElement('span');
      group.className = 'p-rakah';
      group.innerHTML = `<b>${salah.arabic(rakah)}</b>${PRAYER.filter((one) => one.rakah === rakah).map(() => '<i></i>').join('')}`;
      marksBox.append(group);
    }
  }
  [...marksBox.children].forEach((group, n) => group.classList.toggle('here', PRAYER[step].rakah === n + 1));
  [...marksBox.querySelectorAll('i')].forEach((mark, n) => {
    mark.classList.toggle('on', n < step);
    mark.classList.toggle('now', n === step);
  });
}

/* What is said, written large: an ayah in the Mushaf font with its number,
   or the lines of the words. */
function write(saying) {
  fitBox.replaceChildren();
  if (!saying) return;
  if (saying.quran) {
    const line = document.createElement('p');
    line.className = 'quran';
    line.textContent = `${mushafText(saying.quran.text)} `;
    const number = document.createElement('span');
    number.className = 'ayah-no';
    number.textContent = mushafText(saying.quran.end);
    line.append(number);
    fitBox.append(line);
    return;
  }
  for (const text of saying.lines) {
    const line = document.createElement('p');
    line.textContent = text;
    fitBox.append(line);
  }
}

/* The words as large as their box allows, and never cut off. */
function fit() {
  const high = textBox.clientHeight;
  const wide = textBox.clientWidth;
  if (!high || !wide || !fitBox.firstChild) return;
  const fits = (size) => {
    fitBox.style.fontSize = `${size}px`;
    return fitBox.offsetHeight <= high && fitBox.scrollWidth <= wide;
  };
  let low = SMALLEST;
  let top = Math.max(low, Math.min(LARGEST, wide * 0.16, high * 0.42));
  if (fits(top)) return;
  for (let n = 0; n < 7; n++) {
    const mid = (low + top) / 2;
    if (fits(mid)) low = mid;
    else top = mid;
  }
  fits(low);
}

function hint(on) {
  clearTimeout(hintTimer);
  nextButton.classList.remove('hint');
  if (on) hintTimer = setTimeout(() => nextButton.classList.add('hint'), HINT_AFTER);
}

/* «اللَّهُ أَكْبَرُ» on the way into a station: shown small on the picture and said. */
function sayTakbir(still) {
  pill.textContent = TEXT.takbir.text;
  pill.hidden = false;
  return Promise.all([salah.delay(TAKBIR_LEAST), salah.hear(TEXT.takbir.clip, { prompt: true, still })]).then(() => {
    if (still()) pill.hidden = true;
  });
}

/* One of the station's sayings: written, then said. With a recording, the
   next saying of the station follows by itself; at the last one, or without
   a recording, the forward arrow breathes. A station that opens a rak'ah
   says the rak'ah's name before anything else (withRakah). */
function showPart(k, withTakbir = false, withRakah = false) {
  const mine = ++run;
  const still = () => mine === run;
  part = k;
  sound.stop();
  hint(false);
  pill.hidden = true;
  write(parts[part]);
  fit();
  salah.dots($('parts'), parts.length > 1 ? parts.length : 0, part);
  prevButton.disabled = step === 0 && part === 0;
  (withRakah ? salah.hear(TEXT.rakah[PRAYER[step].rakah].clip, { prompt: true, still }) : Promise.resolve())
    .then(() => (still() && withTakbir ? sayTakbir(still) : false))
    .then(() => (still() && parts[part] ? salah.hear(parts[part].clip, { prompt: parts[part].prompt, still }) : false))
    .then((heard) => {
      if (!still()) return;
      if (!heard || part >= parts.length - 1) {
        hint(true);
        return;
      }
      salah.delay(BREATH).then(() => {
        if (still()) showPart(part + 1);
      });
    });
}

/* A station of the prayer. forward: he came to it by the forward arrow (or
   the prayer has just begun), so what is said on the way in is said: the
   rak'ah's name where the station opens one, then «اللَّهُ أَكْبَرُ» where the
   prayer says it. Going back says neither. */
function showStation(i, forward = false) {
  step = Math.max(0, Math.min(PRAYER.length - 1, i));
  const { station, takbir, rakah } = PRAYER[step];
  const opens = forward && (step === 0 || PRAYER[step - 1].rakah !== rakah);
  parts = salah.sayings(station, words);
  const old = pic.querySelector('.s-pic');
  if (old) old.remove();
  pic.prepend(salah.picture(station));
  pic.classList.remove('next');
  void pic.offsetWidth; // restart the arrival
  pic.classList.add('next');
  $('label').textContent = station.label;
  salah.rakah(badge, rakah, opens && step > 0); // the badge stirs when it changes, not when the prayer opens
  drawMarks();
  showPart(0, forward && takbir, opens);
}

function goForward() {
  if (page.where !== 'do') return;
  if (part < parts.length - 1) showPart(part + 1);
  else if (step < PRAYER.length - 1) showStation(step + 1, true);
  else {
    salah.beep('chime');
    page.endDo();
  }
}

function goBack() {
  if (page.where !== 'do') return;
  if (part > 0) showPart(part - 1);
  else if (step > 0) showStation(step - 1);
}

nextButton.addEventListener('click', goForward);
prevButton.addEventListener('click', goBack);
$('again').addEventListener('click', () => {
  if (page.where === 'do') showPart(0);
});
/* A tap on the station's name says the name; on the badge, the rak'ah's. */
function sayName(clip) {
  if (page.where !== 'do') return;
  const mine = ++run;
  const still = () => mine === run;
  sound.stop();
  hint(false);
  pill.hidden = true;
  salah.hear(clip, { prompt: true, still }).then(() => {
    if (still()) hint(true);
  });
}
$('label').addEventListener('click', () => sayName(PRAYER[step].station.clip));
badge.addEventListener('click', () => sayName(TEXT.rakah[PRAYER[step].rakah].clip));
/* On a computer: the arrows as in the stories (left goes forward), Space or Enter says the station again. */
addEventListener('keydown', (event) => {
  if (page.where !== 'do' || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  if (event.key === 'ArrowLeft') goForward();
  else if (event.key === 'ArrowRight') goBack();
  else if (event.key === ' ' || event.key === 'Enter') {
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
    event.preventDefault();
    showPart(0);
  }
});
root.addEventListener('contextmenu', (event) => event.preventDefault());

function leave() {
  run += 1;
  hint(false);
  pill.hidden = true;
}

/* A recording stops when the page is hidden; the recitation it belonged to
   must not carry on behind a locked screen. */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden || page.where !== 'do') return;
  run += 1;
  pill.hidden = true;
  hint(true);
});
addEventListener('resize', fit);
if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(textBox);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit, () => {});

/* The cards open once the words have been fetched (or have failed to be). */
const page = salah.twoParts({ root, names: ['pray', 'pray-quiz'], stations: ORDER, rakat: RAKAT, begin: () => showStation(0, true), leave, ready: salah.data() });

salah.data().then((fetched) => {
  words = fetched;
});
$('art-do').append(salah.picture(salah.STATIONS.qiyam));
$('art-quiz').append(salah.quizArt(salah.STATIONS.ruku));
salah.preload(ORDER);
// Fusha only, as the whole salah door: preload, not preloadPrompts, so no dialect switch shows.
sound.preload([TEXT.takbir.clip, TEXT.next.clip, TEXT.rakah[1].clip, TEXT.rakah[2].clip, ...new Set(ORDER.map((station) => station.clip))]);
sound.preload([1, 2, 3, 4, 5, 6, 7].map((n) => `fatihah-${n}`).concat(
  ['salah-ruku', 'salah-sami', 'salah-rabbana', 'salah-sujud', 'salah-julus', 'salah-tashahhud', 'salah-ibrahimiyya', 'salah-salam', TEXT.praise.clip],
));

/* For trying the game by hand on the family's computer. */
if (salah.LOCAL) {
  window.prayGame = {
    page,
    show: showStation,
    forward: goForward,
    back: goBack,
    fit,
    get state() {
      return {
        where: page.where,
        step,
        part,
        parts: parts.length,
        station: PRAYER[step].station.id,
        rakah: PRAYER[step].rakah,
        badge: badge.hidden ? '' : badge.textContent,
        stirs: badge.classList.contains('began'),
        text: fitBox.textContent,
        size: parseFloat(fitBox.style.fontSize) || 0,
        fits: fitBox.offsetHeight <= textBox.clientHeight && fitBox.scrollWidth <= textBox.clientWidth,
        takbir: !pill.hidden,
        hint: nextButton.classList.contains('hint'),
        quiz: page.quiz.state,
      };
    },
  };
}
