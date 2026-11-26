/* The reciter. Two modes, chosen with the tabs at the top:
   - السورة كاملة: the surah plays through from the current ayah, each word
     lit as the recording reaches it, for the daily "listen to the whole
     surah once". The arrows beside the play button move between ayat:
     while it plays it jumps there and plays on; paused or stopped, it only
     moves the current ayah.
   - آية آية: each ayah on top carries a play sign; a tap plays it, then,
     a second after it ends, the prompt "now you read it" shows and sounds,
     and the child's turn waits for أعد الآية or الآية التالية. The last ayah
     has no "next".
   In both, the big button plays and pauses (the clip and its lit word hold
   exactly where they are, as the story reader pauses a page) and the square
   one stops: the playing marks go and the current ayah waits to be played
   from its start. The whole surah sits on top and the ayah being played
   shows big below. The text is quran/<surah>.json, copied from the
   Quran.com API and never edited. Word timings are audio/<surah>.timings.json,
   made with timing.html; an ayah without them is timed from its recording
   (timing.autoWords), and lights whole while that is not ready. */
const SURAH = document.body.dataset.surah;
const $ = (id) => document.getElementById(id);
const PLAY = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.3v15.4a1 1 0 0 0 1.52.85l12.3-7.7a1 1 0 0 0 0-1.7L8.52 3.45A1 1 0 0 0 7 4.3z"/></svg>';
const PROMPT = 'الْآنَ اقْرَأْهَا أَنْتَ';
const LABELS = { listen: 'اِسْتَمِعْ', pause: 'تَوَقَّفْ', play: 'تَابِعْ' };
const BREATH = 700; // between ayat in السورة كاملة
const TURN_AFTER = 1000; // from the end of an ayah to "now you read it"

let surah = null;
let timings = {};
let auto = {};
let current = 1;
let run = 0;
let mode = 'surah';
let state = 'idle'; // 'idle', 'playing' or 'paused'

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
  const play = $('play');
  const look = state === 'playing' ? 'pause' : state === 'paused' ? 'play' : 'listen';
  play.dataset.state = look;
  play.setAttribute('aria-label', LABELS[look]);
  $('stop').disabled = state === 'idle';
  $('back').disabled = current === 1;
  $('forward').disabled = onLast();
  $('next').hidden = onLast();
  document.body.classList.toggle('held', state === 'paused');
}

function setState(next) {
  state = next;
  updateControls();
}

function markPlaying(number) {
  for (const item of $('ayat').children) item.classList.toggle('playing', Number(item.dataset.n) === number);
}

/* "Now you read it" shows only after the ayah has been heard, and goes when
   anything stops. sound.caption() keeps it to the site's dialect rule (which
   text stands beside which recording) and follows the switch by itself. */
function showPrompt() {
  const turn = $('turn');
  if (typeof sound.caption === 'function') sound.caption(turn, PROMPT, 'read-it');
  else turn.textContent = PROMPT;
  turn.hidden = false;
}

function hidePrompt() {
  $('turn').hidden = true;
}

/* A wait that stands still while the reciter is paused and ends at once when
   the run it belongs to is stopped. */
function wait(ms, mine) {
  return new Promise((resolve) => {
    let left = ms;
    let last = performance.now();
    const step = () => {
      const now = performance.now();
      if (state !== 'paused') left -= now - last;
      last = now;
      if (mine !== run || left <= 0) resolve();
      else setTimeout(step, 40);
    };
    setTimeout(step, 40);
  });
}

/* Everything stops: the clip, the lights, the prompt, a run in progress. The
   current ayah stays, ready to be played from its start. */
function halt() {
  run += 1;
  sound.stop();
  hidePrompt();
  markPlaying(0);
  setState('idle');
}

/* Holds the clip and its lit word where they are; the waits between clips
   hold too. A clip still loading when the pause came is held as it starts. */
function pause() {
  if (state !== 'playing') return;
  setState('paused');
  const keep = () => {
    if (state !== 'paused') return;
    if (sound.current() && !sound.paused()) sound.pause();
    requestAnimationFrame(keep);
  };
  keep();
}

function resume() {
  if (state !== 'paused') return;
  setState('playing');
  sound.resume();
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
  updateControls();
}

/* The word times of an ayah: the parents' tapped timings from the file when
   they exist, else the automatic estimate from the recording. */
function timesFor(number, count) {
  for (const given of [timings[number], auto[number]]) {
    if (Array.isArray(given) && given.length === count + 1) return given;
  }
  return null;
}

/* The automatic timing of an ayah from its recording, computed once the
   clip has decoded (and again after a failed download is retried). The
   recitation stops at the ayah's end (waqf), and the name of Allah keeps
   the madd it is read with though the Mushaf writes no alif for it. */
function estimate(ayah) {
  sound.buffer(clip(ayah.number)).then((decoded) => {
    if (decoded && !auto[ayah.number]) auto[ayah.number] = timing.autoWords(ayah.words, timing.envelope(decoded), { waqf: true, nameMadd: true });
  });
}

/* Plays one ayah and lights its words from the clip's clock, which stands
   still while the sound is paused. Resolves when the clip ends, at once if
   the recording is missing or the run is stopped. */
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

/* Ayah mode: hear the ayah, a second's quiet, then "now you read it". */
async function recite(number) {
  halt();
  const mine = run;
  select(number);
  setState('playing');
  markPlaying(number);
  await playAyah(number, mine);
  if (mine !== run) return;
  markPlaying(0);
  await wait(TURN_AFTER, mine);
  if (mine !== run) return;
  showPrompt();
  await sound.say('read-it');
  if (mine !== run) return;
  setState('idle');
}

/* Surah mode: from an ayah to the end of the surah, with a breath between
   ayat; at the end the reciter goes back to the first ayah. */
async function listenFrom(start) {
  halt();
  const mine = run;
  setState('playing');
  for (let number = start; number <= surah.ayat.length; number++) {
    select(number);
    markPlaying(number);
    await playAyah(number, mine);
    if (mine !== run) return;
    markPlaying(0);
    await wait(BREATH, mine);
    if (mine !== run) return;
  }
  setState('idle');
  select(1);
}

/* The big button: play the current ayah (and on, in السورة كاملة), pause,
   or carry on from where it was paused. */
function playPause() {
  if (state === 'playing') pause();
  else if (state === 'paused') resume();
  else if (mode === 'surah') listenFrom(current);
  else recite(current);
}

/* The arrows of السورة كاملة. */
function step(by) {
  const target = current + by;
  if (!surah || target < 1 || target > surah.ayat.length) return;
  if (state === 'playing') listenFrom(target);
  else {
    halt();
    select(target);
  }
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
  $('play').addEventListener('click', playPause);
  $('stop').addEventListener('click', halt);
  $('back').addEventListener('click', () => step(-1));
  $('forward').addEventListener('click', () => step(1));
  $('again').addEventListener('click', () => recite(current));
  $('next').addEventListener('click', () => {
    if (!onLast()) recite(current + 1);
  });
  /* The clip stops when the page is hidden; the run it belonged to must not
     carry on behind a locked screen. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) halt();
  });
}

init();
