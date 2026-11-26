/* الصَّلَوَاتُ الْخَمْسُ: the five prayers, their names and about when in the
   day each one is, for a child who cannot read yet. The father asked for the
   five names with their approximate times (dawn, midday, afternoon, sunset,
   night) and a picture of how the day looks at each.

   Three parts, each a large card. A part flows into the next by itself when
   it ends, and any part opens from its card, where a star shows once it has
   been finished. Inside a part the ✕ leads back to the cards; from the cards
   it leaves the page.

   الْيَوْمُ وَصَلَوَاتُهُ: the five times in order, one at a time, as a picture
   book. A page shows its picture large, the prayer's name very large and its
   time in a smaller line; the name is said, then the time. Nothing turns a
   page by itself, as in the stories: the large green arrow on the left goes
   forward and breathes when the words have been said, the other arrow goes
   back, the middle button says the page again. The five pictures are the same
   town, so one turns into the next where it stands: only the sky and the light
   change. A row of five small skies shows where he is in the day. After the
   fifth: أحسنت, and the second part comes.

   أَيُّ صَلَاةٍ؟: listening and looking. A prayer's name shows large and is
   said; under it stand three of the five pictures (all five once this part
   has been finished one time), in places chosen at random. He taps the picture
   of that prayer's time. Right: a chime, the picture is ringed, its time shows
   and is said, and the next name comes by itself. Wrong: a soft buzz, a wobble,
   the picture dims and the name is said again; after two wrong tries the right
   one breathes. All five prayers, shuffled, and never the same one twice in a
   row. Then أحسنت, and the third part comes.

   مَاذَا بَعْدُ؟: the quiz the wudu and prayer pages have (salah.js), behaving
   the same way: the time he has reached shows with its name, and he picks the
   picture of the one that comes next, from two (three once this part has been
   finished one time). After Isha comes Fajr again, so five questions close the
   circle of the day. Then أحسنت, and the cards.

   A line of words is marked while its recording plays, so he sees which words
   he hears. Every line has one recording, in Fusha: the salah door has no
   Egyptian (the father, 2026-11-26). The words on screen are always Fusha.

   The page stands on its own: it has the look of the door's other games but
   none of their code. Nothing here waits on a recording without a limit: a
   clip that does not exist yet is simply silent, and the game goes on. */
(() => {
  'use strict';

  const KEY = 'prayers';
  const PARTS = ['day', 'which', 'next']; // the three parts in order, as the save names them
  const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

  /* What the child sees and hears: each prayer's name and its time of day,
     with their recordings. clip is the name's recording, timeClip the
     time's. The parents approve every line. */
  const TIMES = [
    { id: 'fajr', name: 'صَلَاةُ الْفَجْرِ', clip: 'prayer-fajr', time: 'قَبْلَ شُرُوقِ الشَّمْسِ', timeClip: 'time-fajr' },
    { id: 'dhuhr', name: 'صَلَاةُ الظُّهْرِ', clip: 'prayer-dhuhr', time: 'فِي وَسَطِ النَّهَارِ', timeClip: 'time-dhuhr' },
    { id: 'asr', name: 'صَلَاةُ الْعَصْرِ', clip: 'prayer-asr', time: 'بَعْدَ الظُّهْرِ', timeClip: 'time-asr' },
    { id: 'maghrib', name: 'صَلَاةُ الْمَغْرِبِ', clip: 'prayer-maghrib', time: 'عِنْدَ غُرُوبِ الشَّمْسِ', timeClip: 'time-maghrib' },
    { id: 'isha', name: 'صَلَاةُ الْعِشَاءِ', clip: 'prayer-isha', time: 'فِي اللَّيْلِ', timeClip: 'time-isha' },
  ];
  const ASK = { text: 'مَاذَا بَعْدُ؟', clip: 'whats-next' };
  const PRAISE = 'well-done'; // أحسنت itself is written in the page
  /* The day, and Fajr again: what the third part walks through. */
  const ROUND = [...TIMES, TIMES[0]];

  const FETCH_MOST = 4000; // ms to wait for a recording to arrive
  const LOOK_LEAST = 1200; // ms a page of the day shows before the forward arrow breathes, at least
  const HINT_AFTER = 600; // ms after the words end before it breathes
  const PAUSE = 350; // ms between the name and the time
  const TURN_LEAST = 300; // ms between two turns of the page: a double tap turns one page
  const FADE = 900; // ms one picture of the day takes to turn into the next
  const SWIPE = 60; // px a finger must travel across the picture to turn the page
  const TAP_AFTER = 400; // ms the pictures of a question show before a tap counts: a double tap answers nothing
  const SAY_AGAIN = 700; // ms after a wrong answer before the name is said again
  const AFTER_WHICH = 1800; // ms a right answer shows in the second part before the next name, at least
  const AFTER_NEXT = 1300; // and in the third, as in salah.js
  const PRAISE_LEAST = 2000; // ms أحسنت shows, at least
  const PRAISE_MOST = 5000; // and the longest it waits for its recording
  const TILE_MOST = 380; // px: a picture to choose is never larger
  const ROOM = 16; // px kept free around the pictures to choose, for the ring of the right one

  const $ = (id) => document.getElementById(id);
  const root = $('prayers');
  const el = {
    scene: $('day-scene'), dayName: $('day-name'), dayTime: $('day-time'), dayMarks: $('day-marks'),
    back: $('day-back'), again: $('day-again'), forward: $('day-forward'),
    whichName: $('which-name'), whichText: $('which-text'), whichTime: $('which-time'),
    whichChoices: $('which-choices'), whichTiles: $('which-tiles'), whichDots: $('which-dots'),
    nextPic: $('next-pic'), nextName: $('next-name'), nextAsk: $('next-ask'),
    nextChoices: $('next-choices'), nextTiles: $('next-tiles'), nextMarks: $('next-marks'),
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  function shuffle(list) {
    const all = [...list];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  }

  /* The sounds made in code, and stopping a recording. sound.js may be missing
     (a first visit with no network) or an older saved copy: the game then
     plays on in silence. */
  const beep = (name) => {
    if (typeof sound !== 'undefined' && typeof sound[name] === 'function') sound[name]();
  };
  const quiet = () => beep('stop');

  /* Says a recording to its end and tells whether there was one. Fusha only,
     as the whole salah door is (the father, 2026-11-26): <name>-masri is never
     looked for. `prompt` is kept for the callers and changes nothing. still() is
     asked just before the sound starts: a page that has moved on meanwhile
     says nothing, and neither does a hidden one. begin() is called as the
     sound starts. The wait is never longer than the recording and a moment
     more. */
  function hear(name, { prompt = true, still = () => true, begin = null } = {}) {
    if (typeof sound === 'undefined' || !name) return Promise.resolve(false);
    const found = [name].reduce(
      (chain, one) => chain.then((hit) => hit || sound.buffer(one).then((buffer) => (buffer ? { name: one, buffer } : null))),
      Promise.resolve(null),
    );
    /* A recording that cannot be fetched in a few seconds is taken as missing. */
    return Promise.race([found, delay(FETCH_MOST).then(() => null)])
      .then((hit) => {
        if (!hit || !still() || document.hidden) return false;
        if (begin) begin();
        return Promise.race([sound.play(hit.name), delay((hit.buffer.duration + 1.5) * 1000)]).then(() => true);
      })
      .catch(() => false);
  }

  /* Says a line of the page, and marks the line while its recording plays.
     One line is marked at a time: a saying that starts takes the mark from
     the one before, and each saying takes away only its own mark when it ends.
     prompt: kept from when a prompt had an Egyptian twin; it changes nothing. */
  let marked = null; // { line, by }: the line marked now, and the saying that marked it
  function sayLine(line, clip, still, prompt = true) {
    const mine = {};
    const begin = () => {
      if (marked) marked.line.classList.remove('now');
      marked = { line, by: mine };
      line.classList.add('now');
    };
    return hear(clip, { prompt, still, begin }).then((heard) => {
      if (marked && marked.by === mine) {
        line.classList.remove('now');
        marked = null;
      }
      return heard;
    });
  }

  /* Kept on the device: which parts have been finished. A part that has been
     finished once shows its star, and the second and third parts then offer
     more pictures. */
  let done = new Set();
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      done = new Set(saved && saved.v === 1 && Array.isArray(saved.done) ? saved.done.filter((part) => PARTS.includes(part)) : []);
    } catch {
      done = new Set();
    }
  }
  function finish(part) {
    if (!PARTS.includes(part)) return;
    done.add(part);
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, done: PARTS.filter((one) => done.has(one)) }));
    } catch {
      // Private browsing: the stars last for this visit only.
    }
  }
  function stars() {
    for (const card of root.querySelectorAll('.pr-card')) card.querySelector('.pr-star').hidden = !done.has(card.dataset.part);
  }

  /* The small sky of a time of day, drawn once in the page (prayers.html). */
  const sky = (time) => `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><use href="#pr-${time.id}"/></svg>`;

  /* A time's picture in its frame. Under the picture stands the color of that
     sky, which shows while the picture loads; a picture that cannot be fetched
     leaves the sky with its small sun or moon, so the game can still be played. */
  function picture(time) {
    const frame = document.createElement('span');
    frame.className = 'pr-pic';
    frame.dataset.time = time.id;
    frame.innerHTML = `<span class="pr-sky">${sky(time)}</span>`;
    const img = new Image();
    img.alt = '';
    img.draggable = false;
    img.addEventListener('load', () => frame.classList.add('ok'));
    img.addEventListener('error', () => {
      img.remove();
      frame.classList.add('none');
    });
    img.src = `images/salah/time-${time.id}.webp`;
    frame.append(img);
    return frame;
  }

  /* A time written in its line: its small sky, then the words. */
  function timeLine(line, time) {
    line.innerHTML = `<span class="pr-sun">${sky(time)}</span><span></span>`;
    line.lastChild.textContent = time.time;
  }

  /* The five small skies in a row, in the order of the day: the first `passed`
     are lit, and the one at `now` is where he is. */
  function marks(box, passed, now) {
    if (!box.children.length) box.innerHTML = TIMES.map((time) => `<i>${sky(time)}</i>`).join('');
    [...box.children].forEach((one, i) => {
      one.classList.toggle('on', i < passed);
      one.classList.toggle('now', i === now);
    });
  }

  /* Small marks in a row: n of them, the first `on` lit, the next one current. */
  function dots(box, n, on) {
    if (box.children.length !== n) box.replaceChildren(...Array.from({ length: n }, () => document.createElement('i')));
    [...box.children].forEach((dot, i) => {
      dot.classList.toggle('on', i < on);
      dot.classList.toggle('now', i === on);
    });
  }

  /* One of the page's sections shows at a time. (Their ids are the page's
     own: style.css places #view-done for the building game.) */
  function show(name) {
    root.dataset.view = name;
    for (const section of root.querySelectorAll('section[id^="pr-view-"]')) section.hidden = section.id !== `pr-view-${name}`;
  }

  let where = 'parts'; // 'parts', the part being played, or 'done' while أحسنت shows
  let run = 0; // counts whatever starts: what an older one started must not finish
  let hintTimer = 0;

  /* Whatever starts takes the next number, and the forward arrow stops breathing. */
  function step() {
    clearTimeout(hintTimer);
    el.forward.classList.remove('hint');
    run += 1;
    return run;
  }

  /* The pictures to choose from, as buttons. A button is named by its time of
     day, which is what its picture shows. */
  function tiles(box, offered, choose) {
    box.replaceChildren(...offered.map((time, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pr-tile';
      button.setAttribute('aria-label', time.time);
      button.append(picture(time));
      button.addEventListener('click', () => choose(i));
      return button;
    }));
    fit(box.parentElement);
  }

  /* The pictures as large as their box allows: in as many columns as gives
     the largest squares, the last row in the middle. */
  function fit(box) {
    const inner = box.firstElementChild;
    const n = inner.children.length;
    const wide = box.clientWidth - ROOM;
    const high = box.clientHeight - ROOM;
    if (!n || wide <= 0 || high <= 0) return;
    const gap = Math.round(Math.max(10, Math.min(24, Math.min(wide, high) * 0.04)));
    let size = 0;
    let columns = n;
    for (let c = 1; c <= n; c++) {
      const rows = Math.ceil(n / c);
      const side = Math.min((wide - (c - 1) * gap) / c, (high - (rows - 1) * gap) / rows);
      if (side > size + 0.5) {
        size = side;
        columns = c;
      }
    }
    size = Math.max(1, Math.floor(Math.min(size, TILE_MOST)));
    inner.style.setProperty('--tile', `${size}px`);
    inner.style.setProperty('--tile-gap', `${gap}px`);
    inner.style.width = `${columns * size + (columns - 1) * gap + 1}px`;
  }

  /* 1. The day and its prayers. The five pictures lie on one another in the
     frame; the one that shows is laid on top and fades in over the one before,
     so the town stands still while its sky changes. */
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const layers = new Map(TIMES.map((time) => [time, picture(time)]));
  el.scene.append(...layers.values());
  let page = 0;
  let turned = -Infinity; // when the page last turned

  function showScene(time, fade) {
    const layer = layers.get(time);
    if (el.scene.lastElementChild === layer) return;
    el.scene.append(layer);
    if (fade && !calm.matches && typeof layer.animate === 'function') layer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE, easing: 'ease-in-out' });
  }

  function hint() {
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => el.forward.classList.add('hint'), HINT_AFTER);
  }

  /* Says the page: the name, then the time. Then the forward arrow breathes. */
  function readPage() {
    const mine = step();
    const still = () => mine === run;
    const time = TIMES[page];
    quiet();
    const said = sayLine(el.dayName, time.clip, still, false)
      .then((heard) => (heard && still() ? delay(PAUSE) : null))
      .then(() => (still() ? sayLine(el.dayTime, time.timeClip, still) : false));
    Promise.all([delay(LOOK_LEAST), said]).then(() => {
      if (still()) hint();
    });
  }

  /* Says one line of the page alone: a tap on the name, or on the time. */
  function readLine(line, clip, prompt) {
    if (where !== 'day') return;
    const mine = step();
    const still = () => mine === run;
    quiet();
    sayLine(line, clip, still, prompt).then(() => {
      if (still()) hint();
    });
  }

  function openPage(i, fade = true) {
    page = Math.max(0, Math.min(TIMES.length - 1, i));
    const time = TIMES[page];
    showScene(time, fade);
    el.dayName.textContent = time.name;
    timeLine(el.dayTime, time);
    marks(el.dayMarks, page, page);
    el.back.disabled = page === 0;
    readPage();
  }

  /* Forward from the last page ends the part. */
  function turnPage(by) {
    if (where !== 'day' || page + by < 0) return;
    const now = performance.now();
    if (now - turned < TURN_LEAST) return;
    turned = now;
    if (page + by >= TIMES.length) endPart('day');
    else openPage(page + by);
  }

  function startDay() {
    step();
    where = 'day';
    turned = performance.now();
    show('day');
    openPage(0, false);
  }

  el.forward.addEventListener('click', () => turnPage(1));
  el.back.addEventListener('click', () => turnPage(-1));
  el.again.addEventListener('click', () => {
    if (where === 'day') readPage();
  });
  el.dayName.addEventListener('click', () => readLine(el.dayName, TIMES[page].clip, false));
  el.dayTime.addEventListener('click', () => readLine(el.dayTime, TIMES[page].timeClip, true));
  /* The picture: a tap says the page again; a swipe across it turns the page
     as a hand turns an Arabic book's page, from left to right goes forward. */
  let swipe = null;
  el.scene.addEventListener('pointerdown', (event) => {
    if (event.isPrimary && event.button <= 0) swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  el.scene.addEventListener('pointerup', (event) => {
    if (!swipe || swipe.id !== event.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) >= SWIPE && Math.abs(dx) >= 1.5 * Math.abs(dy)) turnPage(dx > 0 ? 1 : -1);
  });
  el.scene.addEventListener('pointercancel', () => {
    swipe = null;
  });
  el.scene.addEventListener('click', () => {
    if (where === 'day' && performance.now() - turned >= TURN_LEAST) readPage();
  });
  /* On a computer: the arrows as in the stories (left goes forward), Space or Enter says the page again. */
  addEventListener('keydown', (event) => {
    if (where !== 'day' || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.key === 'ArrowLeft') turnPage(1);
    else if (event.key === 'ArrowRight') turnPage(-1);
    else if (event.key === ' ' || event.key === 'Enter') {
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
      event.preventDefault();
      readPage();
    }
  });

  /* 2. Which prayer? */
  const which = {
    order: [], // the five prayers, shuffled
    n: 0, // how many have been found
    offered: [], // the pictures offered now, in their places
    wrongs: 0,
    busy: true,
    count: 3, // how many pictures are offered
    last: null, // the prayer asked last, in this round or the one before
    shown: 0, // when the pictures came
    said: Promise.resolve(false), // the name being said
    again: 0, // counts the wrong tries: only the last one has the name said again
  };

  function askWhich() {
    const mine = step();
    const time = which.order[which.n];
    which.last = time;
    which.wrongs = 0;
    which.again += 1;
    const others = shuffle(TIMES.filter((one) => one !== time)).slice(0, which.count - 1);
    which.offered = shuffle([time, ...others]);
    el.whichText.textContent = time.name;
    el.whichName.classList.remove('named');
    el.whichTime.classList.remove('on');
    timeLine(el.whichTime, time);
    tiles(el.whichTiles, which.offered, chooseWhich);
    dots(el.whichDots, which.order.length, which.n);
    which.shown = performance.now();
    which.busy = false;
    which.said = sayLine(el.whichName, time.clip, () => mine === run, false);
  }

  function chooseWhich(i) {
    const time = which.offered[i];
    const button = el.whichTiles.children[i];
    if (where !== 'which' || which.busy || !time || !button || button.disabled || performance.now() - which.shown < TAP_AFTER) return;
    const right = which.order[which.n];
    if (time !== right) {
      which.wrongs += 1;
      beep('wrong');
      button.disabled = true;
      button.classList.add('no');
      if (which.wrongs >= 2) el.whichTiles.children[which.offered.indexOf(right)].classList.add('hint');
      /* He hears the name again, once it is not being said any more. */
      const mine = run;
      const again = ++which.again;
      Promise.all([delay(SAY_AGAIN), which.said]).then(() => {
        if (mine === run && again === which.again) which.said = sayLine(el.whichName, right.clip, () => mine === run, false);
      });
      return;
    }
    which.busy = true;
    const mine = step();
    const still = () => mine === run;
    beep('chime');
    [...el.whichTiles.children].forEach((other) => {
      other.classList.remove('hint');
      other.classList.add(other === button ? 'right' : 'gone');
    });
    el.whichName.classList.add('named');
    el.whichTime.classList.add('on');
    const said = delay(450).then(() => sayLine(el.whichTime, right.timeClip, still));
    Promise.all([delay(AFTER_WHICH), said]).then(() => {
      if (!still()) return;
      which.n += 1;
      if (which.n >= which.order.length) endPart('which');
      else askWhich();
    });
  }

  function startWhich() {
    step();
    where = 'which';
    quiet();
    show('which');
    which.count = done.has('which') ? TIMES.length : 3;
    which.order = shuffle(TIMES);
    if (which.order[0] === which.last) {
      const j = 1 + Math.floor(Math.random() * (which.order.length - 1));
      [which.order[0], which.order[j]] = [which.order[j], which.order[0]];
    }
    which.n = 0;
    askWhich();
  }

  /* A tap on the name says it again. */
  el.whichName.addEventListener('click', () => {
    if (where !== 'which' || which.busy) return;
    const mine = run;
    which.again += 1;
    which.said = sayLine(el.whichName, which.order[which.n].clip, () => mine === run, false);
  });

  /* 3. What comes next? */
  const next = {
    at: 0, // the time reached, in ROUND
    offered: [], // the pictures offered now, in their places
    wrongs: 0,
    busy: true,
    count: 2, // how many pictures are offered
    shown: 0, // when the pictures came
  };

  function showReached() {
    const here = ROUND[next.at];
    el.nextPic.replaceChildren(picture(here));
    el.nextName.textContent = here.name;
    marks(el.nextMarks, next.at, next.at % TIMES.length);
  }

  /* The pictures offered: the time that comes next, and others that are
     neither it nor the time reached. */
  function askNext(speak) {
    const mine = step();
    const right = ROUND[next.at + 1];
    const others = shuffle(TIMES.filter((one) => one !== right && one !== ROUND[next.at])).slice(0, next.count - 1);
    next.wrongs = 0;
    next.offered = shuffle([right, ...others]);
    el.nextAsk.textContent = ASK.text;
    el.nextAsk.classList.remove('named');
    tiles(el.nextTiles, next.offered, chooseNext);
    next.shown = performance.now();
    next.busy = false;
    if (speak) sayLine(el.nextAsk, ASK.clip, () => mine === run);
  }

  function chooseNext(i) {
    const time = next.offered[i];
    const button = el.nextTiles.children[i];
    if (where !== 'next' || next.busy || !time || !button || button.disabled || performance.now() - next.shown < TAP_AFTER) return;
    const right = ROUND[next.at + 1];
    if (time !== right) {
      next.wrongs += 1;
      beep('wrong');
      button.disabled = true;
      button.classList.add('no');
      if (next.wrongs >= 2) el.nextTiles.children[next.offered.indexOf(right)].classList.add('hint');
      return;
    }
    next.busy = true;
    const mine = step();
    const still = () => mine === run;
    beep('chime');
    [...el.nextTiles.children].forEach((other) => {
      other.classList.remove('hint');
      other.classList.add(other === button ? 'right' : 'gone');
    });
    /* Its name shows where the question was, and is said. */
    el.nextAsk.textContent = right.name;
    el.nextAsk.classList.add('named');
    const said = delay(450).then(() => hear(right.clip, { prompt: false, still }));
    Promise.all([delay(AFTER_NEXT), said]).then(() => {
      if (!still()) return;
      next.at += 1;
      showReached();
      if (next.at >= ROUND.length - 1) {
        el.nextTiles.replaceChildren();
        el.nextAsk.textContent = '';
        el.nextAsk.classList.remove('named');
        endPart('next');
      } else askNext(true);
    });
  }

  function startNext() {
    step();
    where = 'next';
    quiet();
    show('next');
    next.count = done.has('next') ? 3 : 2;
    next.at = 0;
    showReached();
    askNext(false);
    /* The name of the first time, then the question. */
    const mine = run;
    const still = () => mine === run;
    sayLine(el.nextName, ROUND[0].clip, still, false).then(() => {
      if (still()) sayLine(el.nextAsk, ASK.clip, still);
    });
  }

  /* A tap on the question says it again; on the name of the time reached, its name. */
  el.nextAsk.addEventListener('click', () => {
    if (where !== 'next' || next.busy) return;
    const mine = run;
    sayLine(el.nextAsk, ASK.clip, () => mine === run);
  });
  el.nextName.addEventListener('click', () => {
    if (where !== 'next' || next.busy) return;
    const mine = run;
    sayLine(el.nextName, ROUND[next.at].clip, () => mine === run, false);
  });

  /* The cards, and moving between the parts. */
  const STARTS = { day: startDay, which: startWhich, next: startNext };

  function cards() {
    step();
    where = 'parts';
    which.busy = true;
    next.busy = true;
    quiet();
    stars();
    show('parts');
    scrollTo(0, 0);
  }

  /* A part is finished: its star is kept, أحسنت shows and is said (never
     waited for longer than PRAISE_MOST), and the next part comes by itself;
     after the last one, the cards. */
  function endPart(part) {
    finish(part);
    const mine = step();
    const still = () => mine === run;
    where = 'done';
    which.busy = true;
    next.busy = true;
    quiet();
    show('done');
    beep('chime');
    const said = Promise.race([delay(350).then(() => hear(PRAISE, { prompt: false, still })), delay(PRAISE_MOST)]);
    Promise.all([delay(PRAISE_LEAST), said]).then(() => {
      if (!still()) return;
      const after = PARTS[PARTS.indexOf(part) + 1];
      if (after) STARTS[after]();
      else cards();
    });
  }

  for (const card of root.querySelectorAll('.pr-card')) {
    card.addEventListener('click', () => {
      if (where === 'parts' && STARTS[card.dataset.part]) STARTS[card.dataset.part]();
    });
  }

  /* The ✕ (app.js builds it): inside a part it leads back to the cards, and
     from the cards to the door. An older saved copy of app.js does not know
     this page, so the way out is set here as well. */
  const exit = $('exit');
  if (exit) exit.href = 'salah.html';
  document.addEventListener('click', (event) => {
    if (where === 'parts' || !(event.target instanceof Element) || !event.target.closest('#exit')) return;
    event.preventDefault();
    cards();
  }, true);
  root.addEventListener('contextmenu', (event) => event.preventDefault());

  /* The pictures to choose are fitted again when their box changes: a turned
     tablet, a resized window. */
  const refit = () => {
    fit(el.whichChoices);
    fit(el.nextChoices);
  };
  if (typeof ResizeObserver === 'function') {
    const watcher = new ResizeObserver(refit);
    watcher.observe(el.whichChoices);
    watcher.observe(el.nextChoices);
  } else addEventListener('resize', refit);

  /* The cards' own pictures: three to choose from, one of them ringed; and a
     time with the question of what follows it. */
  $('art-which').append(...[TIMES[4], TIMES[3], TIMES[1]].map(picture));
  $('art-which').children[1].classList.add('ring');
  $('art-next').append(picture(TIMES[1]));

  load();
  stars();
  /* The recordings are fetched ahead of the first tap. */
  if (typeof sound !== 'undefined') {
    // Fusha only (no dialect switch on the page): preload, not preloadPrompts.
    if (typeof sound.preload === 'function') sound.preload([...TIMES.map((time) => time.timeClip), ASK.clip, ...TIMES.map((time) => time.clip), PRAISE]);
  }

  /* For trying the game by hand on the family's computer. */
  if (LOCAL) {
    window.prayersGame = {
      TIMES,
      start: (part) => STARTS[part](),
      cards,
      show: openPage,
      forward: () => turnPage(1),
      back: () => turnPage(-1),
      read: readPage,
      chooseWhich,
      chooseNext,
      fit: refit,
      get state() {
        const asked = which.order[which.n];
        return {
          where,
          done: PARTS.filter((part) => done.has(part)),
          day: {
            page,
            time: TIMES[page].id,
            top: el.scene.lastElementChild ? el.scene.lastElementChild.dataset.time : null,
            hint: el.forward.classList.contains('hint'),
          },
          which: {
            n: which.n,
            count: which.count,
            wrongs: which.wrongs,
            busy: which.busy,
            order: which.order.map((time) => time.id),
            asked: asked ? asked.id : null,
            offered: which.offered.map((time) => time.id),
            right: which.offered.indexOf(asked),
          },
          next: {
            at: next.at,
            count: next.count,
            wrongs: next.wrongs,
            busy: next.busy,
            reached: ROUND[next.at].id,
            offered: next.offered.map((time) => time.id),
            right: next.offered.indexOf(ROUND[next.at + 1]),
          },
        };
      },
    };
  }
})();
