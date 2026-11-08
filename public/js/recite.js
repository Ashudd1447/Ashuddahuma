/* The reciter. Two modes, chosen with the tabs at the top:
   - السورة كاملة: one button plays the surah through, each word lit as the
     recording reaches it, for the daily "listen to the whole surah once".
   - آية آية: each ayah on top carries a play sign; a tap plays it, then the
     prompt "now you read it" shows and sounds, and the child's turn waits
     for أعد الآية or الآية التالية. The last ayah has no "next".
   In both, the whole surah sits on top and the ayah being played shows big
   below. The text is quran/<surah>.json, copied from the Quran.com API and
   never edited. Word timings are audio/<surah>.timings.json, made with
   timing.html; an ayah without timings lights whole while it plays. */
const SURAH = document.body.dataset.surah;
const $ = (id) => document.getElementById(id);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PLAY = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.3v15.4a1 1 0 0 0 1.52.85l12.3-7.7a1 1 0 0 0 0-1.7L8.52 3.45A1 1 0 0 0 7 4.3z"/></svg>';
const STOP = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';

let surah = null;
let timings = {};
let auto = {};
let current = 1;
let run = 0;
let mode = 'surah';
let playingAll = false;

const clip = (number) => `${SURAH}-${number}`;
const onLast = () => current === surah.ayat.length;

function renderOverview() {
  const list = $('ayat');
  list.innerHTML = '';
  for (const ayah of surah.ayat) {
    const item = document.createElement('li');
    item.className = 'ayah-item';
    item.dataset.n = ayah.number;
    item.innerHTML = `<span class="play-mark">${PLAY}</span><span class="ayah-text">${mushafText(ayah.text)}</span> <span class="ayah-no">${mushafText(ayah.end)}</span>`;
    item.addEventListener('click', () => {
      if (mode === 'ayah') recite(ayah.number);
    });
    list.append(item);
  }
}

function select(number) {
  current = number;
  const ayah = surah.ayat[number - 1];
  for (const item of $('ayat').children) item.classList.toggle('on', Number(item.dataset.n) === number);
  $('focus').innerHTML =
    ayah.words.map((word, i) => `<span class="word-lit" data-i="${i}">${mushafText(word)}</span>`).join(' ') +
    ` <span class="ayah-no">${mushafText(ayah.end)}</span>`;
  const item = $('ayat').children[number - 1];
  if (item && item.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
  updateControls();
}

function updateControls() {
  $('next').hidden = onLast();
  $('listen').innerHTML = playingAll ? `${STOP} قِفْ` : `${PLAY} اِسْتَمِعْ`;
  $('listen').classList.toggle('playing', playingAll);
}

function markPlaying(number) {
  for (const item of $('ayat').children) item.classList.toggle('playing', Number(item.dataset.n) === number);
}

function hidePrompt() {
  $('turn').hidden = true;
}

/* Everything stops: the clip, the lights, the prompt, a run in progress. */
function halt() {
  run += 1;
  sound.stop();
  playingAll = false;
  hidePrompt();
  markPlaying(0);
  updateControls();
}

function setMode(next) {
  halt();
  mode = next;
  try {
    localStorage.setItem('reciteMode', next);
  } catch {
    // Private browsing: the mode lasts for this page only.
  }
  document.body.classList.toggle('mode-ayah', mode === 'ayah');
  for (const tab of document.querySelectorAll('.modes button')) {
    const on = tab.dataset.mode === mode;
    tab.classList.toggle('on', on);
    tab.setAttribute('aria-selected', on ? 'true' : 'false');
  }
}

/* Plays one ayah and lights its words from the clip's clock. Resolves when the
   clip ends, at once if the recording is missing. */
/* The word times of an ayah: the parents' tapped timings from the file when
   they exist, else the automatic estimate from the recording. */
function timesFor(number, count) {
  for (const given of [timings[number], auto[number]]) {
    if (Array.isArray(given) && given.length === count + 1) return given;
  }
  return null;
}

/* The automatic timing of an ayah from its recording, computed once the
   clip has decoded (and again after a failed download is retried). */
function estimate(ayah) {
  sound.buffer(clip(ayah.number)).then((decoded) => {
    if (decoded && !auto[ayah.number]) auto[ayah.number] = timing.autoWords(ayah.words, timing.envelope(decoded), { waqf: true });
  });
}

function playAyah(number, mine) {
  const name = clip(number);
  const words = [...$('focus').querySelectorAll('.word-lit')];
  if (!auto[number]) estimate(surah.ayat[number - 1]);
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
      // Read each frame: the estimate may land just as the clip starts.
      const times = timesFor(number, words.length);
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

/* Ayah mode: hear the ayah, then "now you read it". */
async function recite(number) {
  halt();
  const mine = run;
  select(number);
  markPlaying(number);
  await playAyah(number, mine);
  if (mine !== run) return;
  markPlaying(0);
  $('turn').hidden = false;
  await sound.say('read-it');
}

/* Surah mode: the whole surah through, with a breath between ayat. The same
   button stops it. */
async function listenAll() {
  if (playingAll) {
    halt();
    return;
  }
  halt();
  const mine = run;
  playingAll = true;
  updateControls();
  for (const ayah of surah.ayat) {
    select(ayah.number);
    markPlaying(ayah.number);
    await playAyah(ayah.number, mine);
    if (mine !== run) return;
    await delay(700);
    if (mine !== run) return;
  }
  playingAll = false;
  markPlaying(0);
  select(1);
}

function next() {
  if (!onLast()) recite(current + 1);
}

async function init() {
  const [text, times] = await Promise.all([
    fetch(`quran/${SURAH}.json`).then((response) => response.json()),
    fetch(`audio/${SURAH}.timings.json`).then((response) => (response.ok ? response.json() : {})).catch(() => ({})),
  ]);
  surah = text;
  timings = times || {};
  sound.preload(surah.ayat.map((ayah) => clip(ayah.number)));
  sound.preloadPrompts(['read-it']);
  /* Every ayah is timed from its recording as it decodes; timesFor prefers
     a tapped timing from the file when it has the right length. */
  for (const ayah of surah.ayat) estimate(ayah);
  renderOverview();
  select(1);
  let saved = 'surah';
  try {
    saved = localStorage.getItem('reciteMode') === 'ayah' ? 'ayah' : 'surah';
  } catch {
    saved = 'surah';
  }
  setMode(saved);
  for (const tab of document.querySelectorAll('.modes button')) tab.addEventListener('click', () => setMode(tab.dataset.mode));
  $('focus').addEventListener('click', () => {
    if (mode === 'ayah') recite(current);
  });
  $('again').addEventListener('click', () => recite(current));
  $('next').addEventListener('click', next);
  $('listen').addEventListener('click', listenAll);
  /* The clip stops when the page is hidden; the run it belonged to must not
     carry on behind a locked screen. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) halt();
  });
}

init();
