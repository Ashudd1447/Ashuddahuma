/* The reciter: the whole surah on top, the ayah being played below, each word
   lit as the recording reaches it. The text is quran/<surah>.json, copied from
   the Quran.com API and never edited. Word timings are audio/<surah>.timings.json,
   made with timing.html; an ayah without timings lights whole while it plays.
   Tapping an ayah plays it and then asks the child to read it. التالي moves
   on; after the last ayah comes the praise. استمع plays the surah through. */
const SURAH = document.body.dataset.surah;
const $ = (id) => document.getElementById(id);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let surah = null;
let timings = {};
let current = 1;
let run = 0;

const clip = (number) => `${SURAH}-${number}`;
const ayahMark = (end) => mushafText(end);

function show(viewId) {
  for (const view of document.querySelectorAll('.view')) view.hidden = view.id !== viewId;
  scrollTo(0, 0);
}

function renderOverview() {
  const list = $('ayat');
  list.innerHTML = '';
  for (const ayah of surah.ayat) {
    const item = document.createElement('li');
    item.className = 'ayah-item';
    item.dataset.n = ayah.number;
    item.innerHTML = `<span class="ayah-text">${mushafText(ayah.text)}</span> <span class="ayah-no">${ayahMark(ayah.end)}</span>`;
    item.addEventListener('click', () => recite(ayah.number));
    list.append(item);
  }
}

function select(number) {
  current = number;
  const ayah = surah.ayat[number - 1];
  for (const item of $('ayat').children) item.classList.toggle('on', Number(item.dataset.n) === number);
  $('focus').innerHTML =
    ayah.words.map((word, i) => `<span class="word-lit" data-i="${i}">${mushafText(word)}</span>`).join(' ') +
    ` <span class="ayah-no">${ayahMark(ayah.end)}</span>`;
  const item = $('ayat').children[number - 1];
  if (item && item.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
}

function hidePrompt() {
  $('turn').hidden = true;
}

/* Plays one ayah and lights its words from the clip's clock. Resolves when the
   clip ends, at once if the recording is missing. */
function playAyah(number, mine) {
  const name = clip(number);
  const words = [...$('focus').querySelectorAll('.word-lit')];
  const given = timings[number];
  const times = Array.isArray(given) && given.length === words.length + 1 ? given : null;
  let ended = false;
  const done = sound.play(name).then(() => { ended = true; });
  const light = (index) => {
    words.forEach((word, i) => word.classList.toggle('on', index === 'all' || i === index));
  };
  const tick = () => {
    if (mine !== run || ended) {
      light(-1);
      return;
    }
    const playing = sound.current();
    if (playing && playing.name === name) {
      let index = 'all';
      if (times) {
        const t = playing.position();
        index = -1;
        if (t >= times[0] && t < times[times.length - 1]) {
          index = 0;
          while (index < words.length - 1 && t >= times[index + 1]) index += 1;
        }
      }
      light(index);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return done;
}

/* Tap flow: hear the ayah, then "now you read it". */
async function recite(number) {
  const mine = ++run;
  show('view-surah');
  hidePrompt();
  select(number);
  await playAyah(number, mine);
  if (mine !== run) return;
  $('turn').hidden = false;
  await sound.play('read-it');
  if (mine !== run) return;
  await sound.play('read-it-home');
}

/* استمع: the whole surah through, with a breath between ayat. */
async function listenAll() {
  const mine = ++run;
  show('view-surah');
  hidePrompt();
  for (const ayah of surah.ayat) {
    select(ayah.number);
    await playAyah(ayah.number, mine);
    if (mine !== run) return;
    await delay(700);
    if (mine !== run) return;
  }
  select(1);
}

function next() {
  if (current < surah.ayat.length) {
    recite(current + 1);
    return;
  }
  run += 1;
  sound.stop();
  show('view-done');
  sound.chime();
  sound.play('well-done');
}

async function init() {
  const [text, times] = await Promise.all([
    fetch(`quran/${SURAH}.json`).then((response) => response.json()),
    fetch(`audio/${SURAH}.timings.json`).then((response) => (response.ok ? response.json() : {})).catch(() => ({})),
  ]);
  surah = text;
  timings = times || {};
  sound.preload([...surah.ayat.map((ayah) => clip(ayah.number)), 'read-it', 'read-it-home', 'well-done']);
  renderOverview();
  select(1);
  $('focus').addEventListener('click', () => recite(current));
  $('again').addEventListener('click', () => recite(current));
  $('next').addEventListener('click', next);
  $('listen').addEventListener('click', listenAll);
  $('view-done').addEventListener('click', () => recite(1));
  /* The clip stops when the page is hidden; the run it belonged to must not
     carry on behind a locked screen. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      run += 1;
      hidePrompt();
    }
  });
}

init();
