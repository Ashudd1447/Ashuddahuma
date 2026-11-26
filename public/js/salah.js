/* الصَّلَاةُ: what the door's games share (salah.html, wudu.html, pray.html,
   qibla.html): the words, the stations of wudu and of the prayer, the
   pictures with their stand-in, what is kept on the device, the rak'ah's
   badge, and the quiz "what comes next?".

   The words said in the prayer are never typed: they come from
   salah/azkar.json (tools/make-salah.py cuts them from the hadiths as printed
   at sunnah.com), and Al-Fatihah from quran/fatihah.json. The labels are the
   parents' wording, to be reviewed.

   Nothing here waits on a recording without a limit: a clip that does not
   exist yet is simply silent, and the games go on. */
const salah = (() => {
  const KEY = 'salah';
  const VERSION = 2; // of what is kept: 2 since the quiz of the prayer walks both rak'at
  const PARTS = ['wudu', 'wudu-quiz', 'qibla', 'pray', 'pray-quiz'];
  const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
  const DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';

  const arabic = (n) => String(n).replace(/\d/g, (d) => DIGITS[d]);
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  /* A copy of a list in a new order. */
  const shuffled = (list) => {
    const all = [...list];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  };

  /* What the child sees and hears. The parents approve every line. */
  const TEXT = {
    praise: { text: 'أحسنت', clip: 'well-done' },
    next: { text: 'مَاذَا بَعْدُ؟', clip: 'whats-next' },
    takbir: { text: 'اللَّهُ أَكْبَرُ', clip: 'allahu-akbar' },
    /* The two rak'at by name: written on the badge of the station reached, and said when each begins. */
    rakah: {
      1: { text: 'الرَّكْعَةُ الْأُولَى', clip: 'rakah-1' },
      2: { text: 'الرَّكْعَةُ الثَّانِيَةُ', clip: 'rakah-2' },
    },
  };

  /* Wudu, in order, from the bismillah to the left foot. times: how often it
     is done. kind: what the child's hand does on the picture: 'wash' is water,
     'wipe' wet hands, 'say' words alone. twin: the other side of a pair, which
     the quiz likes to offer beside it. */
  const WUDU = [
    { id: 'bismillah', picture: 'wudu-bismillah', label: 'بِسْمِ اللَّهِ', clip: 'bismillah', times: 1, kind: 'say' },
    { id: 'hands', picture: 'wudu-hands', label: 'أَغْسِلُ كَفَّيَّ', clip: 'wudu-hands', times: 3, kind: 'wash' },
    { id: 'mouth', picture: 'wudu-mouth', label: 'أَتَمَضْمَضُ', clip: 'wudu-mouth', times: 3, kind: 'wash' },
    { id: 'nose', picture: 'wudu-nose', label: 'أَسْتَنْشِقُ', clip: 'wudu-nose', times: 3, kind: 'wash' },
    { id: 'face', picture: 'wudu-face', label: 'أَغْسِلُ وَجْهِي', clip: 'wudu-face', times: 3, kind: 'wash' },
    { id: 'arm-right', picture: 'wudu-arm-right', label: 'أَغْسِلُ يَدِيَ الْيُمْنَى إِلَى الْمِرْفَقِ', clip: 'wudu-arm-right', times: 3, kind: 'wash', twin: 'wudu-arm-left' },
    { id: 'arm-left', picture: 'wudu-arm-left', label: 'أَغْسِلُ يَدِيَ الْيُسْرَى إِلَى الْمِرْفَقِ', clip: 'wudu-arm-left', times: 3, kind: 'wash', twin: 'wudu-arm-right' },
    { id: 'head', picture: 'wudu-head', label: 'أَمْسَحُ رَأْسِي', clip: 'wudu-head', times: 1, kind: 'wipe' },
    { id: 'ears', picture: 'wudu-ears', label: 'أَمْسَحُ أُذُنَيَّ', clip: 'wudu-ears', times: 1, kind: 'wipe' },
    { id: 'foot-right', picture: 'wudu-foot-right', label: 'أَغْسِلُ رِجْلِيَ الْيُمْنَى إِلَى الْكَعْبَيْنِ', clip: 'wudu-foot-right', times: 3, kind: 'wash', twin: 'wudu-foot-left' },
    { id: 'foot-left', picture: 'wudu-foot-left', label: 'أَغْسِلُ رِجْلِيَ الْيُسْرَى إِلَى الْكَعْبَيْنِ', clip: 'wudu-foot-left', times: 3, kind: 'wash', twin: 'wudu-foot-right' },
  ];

  /* The stations of the prayer: the picture, the name, the name's recording,
     and what is said there: the ids of its words in azkar.json, each with its
     recording. The standing is Al-Fatihah; the first takbir is written here.
     look: what the picture looks like, where two stations look alike. Rising
     from the bowing has the first takbir's picture, the hands raised beside
     the ears; the tashahhud's picture differs from the sitting's by one
     finger. The quiz knows a picture by its look.
     also: the stations (by id) that may come after it at that point of a real
     prayer besides what these two rak'at show: the hands are raised again
     before the bowing where they are raised after it; after the bowing he
     stands; after the tashahhud of a longer prayer he stands up, and may raise
     his hands. Never offered as a wrong answer there. */
  const STATIONS = {
    takbir: { id: 'takbir', picture: 'takbir', look: 'raised', label: 'تَكْبِيرَةُ الْإِحْرَامِ', clip: 'station-takbir', said: [{ text: TEXT.takbir.text, clip: TEXT.takbir.clip, prompt: true }] },
    qiyam: { id: 'qiyam', picture: 'qiyam', label: 'الْقِيَامُ', clip: 'station-qiyam', also: ['takbir'], said: 'fatihah' },
    ruku: { id: 'ruku', picture: 'ruku', label: 'الرُّكُوعُ', clip: 'station-ruku', also: ['qiyam'], said: [{ zikr: 'ruku', clip: 'salah-ruku' }] },
    itidal: { id: 'itidal', picture: 'itidal', look: 'raised', label: 'الرَّفْعُ مِنَ الرُّكُوعِ', clip: 'station-itidal', said: [{ zikr: 'sami', clip: 'salah-sami' }, { zikr: 'rabbana', clip: 'salah-rabbana' }] },
    sujud: { id: 'sujud', picture: 'sujud', label: 'السُّجُودُ', clip: 'station-sujud', said: [{ zikr: 'sujud', clip: 'salah-sujud' }] },
    julus: { id: 'julus', picture: 'julus', look: 'sitting', label: 'الْجُلُوسُ بَيْنَ السَّجْدَتَيْنِ', clip: 'station-julus', said: [{ zikr: 'julus', clip: 'salah-julus' }] },
    tashahhud: { id: 'tashahhud', picture: 'tashahhud', look: 'sitting', label: 'التَّشَهُّدُ', clip: 'station-tashahhud', also: ['qiyam', 'takbir'], said: [{ zikr: 'tashahhud', clip: 'salah-tashahhud' }, { zikr: 'ibrahimiyya', clip: 'salah-ibrahimiyya' }] },
    'salam-right': { id: 'salam-right', picture: 'salam-right', label: 'التَّسْلِيمُ', clip: 'station-salam', twin: 'salam-left', said: [{ zikr: 'salam', clip: 'salah-salam' }] },
    'salam-left': { id: 'salam-left', picture: 'salam-left', label: 'التَّسْلِيمُ', clip: 'station-salam', twin: 'salam-right', said: [{ zikr: 'salam', clip: 'salah-salam' }] },
  };
  /* Every station has a look: its own picture, unless it is given one above. */
  for (const station of [...WUDU, ...Object.values(STATIONS)]) station.look = station.look || station.picture;

  /* Two rak'at, as Fajr: the station, its rak'ah, and whether «اللَّهُ أَكْبَرُ»
     is said on the way into it. Rising from the bowing has its own words; the
     hands come down from the first takbir without one; the salam has none.
     The walk-through and the quiz both follow this order, station by station. */
  const PRAYER = [
    ['takbir', 1, false], ['qiyam', 1, false], ['ruku', 1, true], ['itidal', 1, false], ['sujud', 1, true], ['julus', 1, true], ['sujud', 1, true],
    ['qiyam', 2, true], ['ruku', 2, true], ['itidal', 2, false], ['sujud', 2, true], ['julus', 2, true], ['sujud', 2, true],
    ['tashahhud', 2, true], ['salam-right', 2, false], ['salam-left', 2, false],
  ].map(([id, rakah, takbir]) => ({ station: STATIONS[id], rakah, takbir }));

  /* The sounds made in code. An older saved copy of sound.js may lack one. */
  const beep = (name, ...values) => {
    if (typeof sound !== 'undefined' && typeof sound[name] === 'function') sound[name](...values);
  };

  const FETCH_MOST = 4000; // ms to wait for a recording to arrive
  /* Plays a recording to its end and tells whether there was one. The salah
     door is Fusha only, whatever the dialect switch says (the father,
     2026-11-26: "Remove Egyptian text/recording from the Salah activity
     altogether"), so <name>-masri is never looked for, even for a clip that
     has one elsewhere (the qibla's place-masjid is the driving game's).
     `prompt` is kept for the callers and changes nothing. still() is asked just before
     the sound starts: a page that has moved on meanwhile plays nothing, and
     neither does a hidden one. The wait is never longer than the recording
     itself. */
  function hear(name, { prompt = false, still = () => true } = {}) {
    if (typeof sound === 'undefined' || !name) return Promise.resolve(false);
    const found = [name].reduce(
      (chain, one) => chain.then((hit) => hit || sound.buffer(one).then((buffer) => (buffer ? { name: one, buffer } : null))),
      Promise.resolve(null),
    );
    /* A recording that cannot be fetched in a few seconds is taken as missing. */
    return Promise.race([found, delay(FETCH_MOST).then(() => null)])
      .then((hit) => {
        if (!hit || !still() || document.hidden) return false;
        return Promise.race([sound.play(hit.name), delay((hit.buffer.duration + 1.5) * 1000)]).then(() => true);
      })
      .catch(() => false);
  }

  /* Several prompts, one after another, for as long as still() holds; a name
     that is empty is passed over. Each is bounded as hear() is. */
  function hearAll(names, still = () => true) {
    return names
      .filter(Boolean)
      .reduce((chain, name) => chain.then(() => (still() ? hear(name, { prompt: true, still }) : false)), Promise.resolve(false));
  }

  /* The words of the prayer: azkar.json and Al-Fatihah, fetched once. What
     cannot be fetched stays empty, and the page shows its pictures and labels. */
  let fetched = null;
  function data() {
    if (!fetched) {
      const get = (file) => fetch(file).then((response) => (response.ok ? response.json() : null)).catch(() => null);
      fetched = Promise.all([get('salah/azkar.json'), get('quran/fatihah.json')]).then(([azkar, fatihah]) => {
        const words = (azkar && azkar.azkar) || {};
        const lines = (id) => (words[id] && Array.isArray(words[id].lines) ? words[id].lines : []);
        return { lines, ayat: fatihah && Array.isArray(fatihah.ayat) ? fatihah.ayat : [] };
      });
    }
    return fetched;
  }

  /* What a station of the prayer says, as parts shown one at a time: the
     lines of each (Al-Fatihah's are its ayat, for the Mushaf font) and its
     recording. */
  function sayings(station, words) {
    if (station.said === 'fatihah') {
      return words.ayat.map((ayah) => ({ quran: ayah, clip: `fatihah-${ayah.number}` }));
    }
    return station.said
      .map((part) => ({ lines: part.text ? [part.text] : words.lines(part.zikr), clip: part.clip, prompt: !!part.prompt }))
      .filter((part) => part.lines.length);
  }

  /* Kept on the device: which parts have been finished, as { v: 2, done }. A
     quiz that has been finished once offers three pictures from then on.
     A save of version 1 is from before the quiz of the prayer walked both
     rak'at: that quiz is to be finished anew, and the other parts carry over
     (a wudu finished then had one station more after the same eleven). Any
     other shape is read as nothing finished. */
  let done = new Set();
  function load() {
    done = new Set();
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!saved || typeof saved !== 'object' || !Array.isArray(saved.done)) return;
      const kept = saved.done.filter((part) => PARTS.includes(part));
      if (saved.v === VERSION) done = new Set(kept);
      else if (saved.v === 1) done = new Set(kept.filter((part) => part !== 'pray-quiz'));
    } catch {
      done = new Set();
    }
  }
  function finish(part) {
    if (!PARTS.includes(part)) return;
    done.add(part);
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: VERSION, done: PARTS.filter((one) => done.has(one)) }));
    } catch {
      // Private browsing: the stars last for this visit only.
    }
  }
  /* The five prayers (prayers.js) keep a save of their own, { v: 1, done }
     under 'prayers': their card on the hub has its star when all three of
     their parts are in it. Read only, and anything else is no star. */
  const PRAYERS = { key: 'prayers', v: 1, parts: ['day', 'which', 'next'] };
  function prayersDone() {
    try {
      const saved = JSON.parse(localStorage.getItem(PRAYERS.key) || 'null');
      return !!saved && saved.v === PRAYERS.v && Array.isArray(saved.done) && PRAYERS.parts.every((part) => saved.done.includes(part));
    } catch {
      return false;
    }
  }
  const isDone = (part) => (part === 'prayers' ? prayersDone() : done.has(part));

  /* A station's picture in its frame. Under the picture stands a warm card
     with a pale arch, which shows while the picture loads; when there is no
     picture the station's name is written on it, and it stays. */
  function picture(station) {
    const frame = document.createElement('span');
    frame.className = 's-pic';
    frame.innerHTML = '<span class="s-standin"><i class="s-arch"></i><b></b></span>';
    frame.querySelector('b').textContent = station.label;
    const img = new Image();
    img.alt = '';
    img.draggable = false;
    img.addEventListener('load', () => frame.classList.add('ok'));
    img.addEventListener('error', () => {
      img.remove();
      frame.classList.add('none');
    });
    img.src = `images/salah/${station.picture}.webp`;
    frame.append(img);
    return frame;
  }

  /* Fetches pictures ahead, so a station changes without a wait. */
  function preload(stations) {
    for (const name of new Set(stations.map((station) => station.picture))) new Image().src = `images/salah/${name}.webp`;
  }

  /* One of the page's sections shows at a time. */
  function show(root, name) {
    root.dataset.view = name;
    for (const section of root.querySelectorAll('section[id^="view-"]')) section.hidden = section.id !== `view-${name}`;
  }

  /* Small marks in a row: n of them, the first `on` lit, the next one current. */
  function dots(box, n, on) {
    if (box.children.length !== n) box.replaceChildren(...Array.from({ length: n }, () => document.createElement('i')));
    [...box.children].forEach((dot, i) => {
      dot.classList.toggle('on', i < on);
      dot.classList.toggle('now', i === on);
    });
  }

  /* The rak'ah's badge, on the station reached: two marks, the first lit or
     both, and the rak'ah's name. With `began` the rak'ah has just begun and
     the badge stirs for a moment. A game without rak'at (n is 0) has no badge. */
  function rakah(box, n, began = false) {
    const name = TEXT.rakah[n];
    box.hidden = !name;
    box.classList.remove('began');
    if (!name) return;
    if (!box.firstChild) box.innerHTML = '<span class="s-rakah-marks" aria-hidden="true"><i></i><i></i></span><b></b>';
    box.dataset.rakah = n;
    [...box.querySelectorAll('i')].forEach((mark, i) => mark.classList.toggle('on', i < n));
    box.querySelector('b').textContent = name.text;
    if (began) {
      void box.offsetWidth; // restart the stir
      box.classList.add('began');
    }
  }

  /* A star for each finished part on the cards that name their parts. */
  function stars(scope = document) {
    for (const card of scope.querySelectorAll('[data-parts]')) {
      let box = card.querySelector('.s-stars');
      if (!box) {
        box = document.createElement('span');
        box.className = 's-stars';
        box.setAttribute('aria-hidden', 'true');
        card.append(box);
      }
      box.innerHTML = card.dataset.parts.split(' ').filter(isDone).map(() => STAR).join('');
    }
  }

  /* أحسنت, shown and said (the chime has already played, for what earned it).
     Resolves when it has been said, never later than PRAISE_MOST after it
     shows. (Its section is view-praise: style.css places #view-done for the
     building game.) */
  const PRAISE_LEAST = 2000;
  const PRAISE_MOST = 5000;
  function praise(root, still = () => true) {
    show(root, 'praise');
    return Promise.all([delay(PRAISE_LEAST), Promise.race([delay(350).then(() => hear(TEXT.praise.clip, { still })), delay(PRAISE_MOST)])]);
  }

  /* The quiz. The station reached shows at the top with its name, and in the
     prayer with its rak'ah's badge; under it the question and pictures to
     choose from: the station that comes next and one other, or two others
     once the quiz has been finished one time. A right choice chimes, its name
     shows and is said, it becomes the station reached and the next question
     comes; when it opens the second rak'ah, the badge changes, stirs, and is
     said before the question. A wrong one buzzes softly, wobbles and dims;
     after two the right one breathes. From the first station to the last;
     then whenDone() is called.

     box is the section the quiz builds itself in; stations is the order, in
     which a station may stand several times; rakat, for the prayer, is the
     rak'ah of each place in that order. */
  const AFTER_RIGHT = 1300; // ms a right answer shows before the next question, at least
  function quiz({ box, stations, rakat = null, part, whenDone }) {
    box.innerHTML = `
      <div class="q-now"><button class="s-rakah" id="q-rakah" type="button" hidden></button><span class="q-now-pic" id="q-now"></span><p class="q-label" id="q-label"></p></div>
      <button class="q-ask" id="q-ask" type="button"></button>
      <div class="q-choices" id="q-choices"></div>
      <div class="s-dots" id="q-dots" aria-hidden="true"></div>`;
    const el = {
      rakah: box.querySelector('#q-rakah'), now: box.querySelector('#q-now'), label: box.querySelector('#q-label'),
      ask: box.querySelector('#q-ask'), choices: box.querySelector('#q-choices'), dots: box.querySelector('#q-dots'),
    };
    let at = 0; // the place reached in the order
    let offered = []; // the stations offered now, in their places
    let wrongs = 0;
    let busy = true;
    let turn = 0; // counts questions and visits: what an older one started must not finish
    let count = 2;

    /* The rak'ah of a place in the order (0 where there are none), and its name's recording. */
    const rakahOf = (i) => (rakat ? rakat[i] : 0);
    const rakahClip = (i) => (TEXT.rakah[rakahOf(i)] ? TEXT.rakah[rakahOf(i)].clip : '');
    /* The places where the same station stands in the same rak'ah: the prostration stands twice in each. */
    const places = (i) => stations.map((one, j) => j).filter((j) => stations[j] === stations[i] && rakahOf(j) === rakahOf(i));

    /* The pictures offered: the right one, and others that could not be
       right. A picture is known by its look, and no two offered share one.
       Never offered as the wrong answer: the look of the right one; the look
       of the station reached; whatever follows that look anywhere in the
       order (after a prostration comes the sitting, the standing or the
       tashahhud: none is offered as the wrong answer for another; the raised
       hands are the first takbir's and the rising's, so what follows either
       is left out after both); and what the station reached names as
       following it in a real prayer (`also`). The two sides of a pair, which
       mirror each other, are never both among the wrong ones. */
    function offer() {
      const right = stations[at + 1];
      const here = stations[at];
      const out = new Set([right.look, here.look]);
      stations.forEach((one, i) => {
        if (i > 0 && stations[i - 1].look === here.look) out.add(one.look);
      });
      for (const id of here.also || []) {
        const named = stations.find((one) => one.id === id);
        if (named) out.add(named.look);
      }
      const pool = [];
      for (const one of stations) {
        if (!out.has(one.look) && !pool.some((other) => other.look === one.look)) pool.push(one);
      }
      const others = [];
      const twin = pool.find((one) => one.picture === right.twin);
      if (twin && Math.random() < 0.6) others.push(twin);
      for (const one of shuffled(pool)) {
        if (others.length >= count - 1) break;
        if (!others.includes(one) && !others.some((other) => other.twin === one.picture)) others.push(one);
      }
      return shuffled([right, ...others]);
    }

    /* A station that stands twice in its rak'ah carries its number: the second prostration is 2. */
    function number(frame, i) {
      const same = places(i);
      if (same.length < 2) return;
      const mark = document.createElement('span');
      mark.className = 'q-nth';
      mark.textContent = arabic(same.indexOf(i) + 1);
      frame.append(mark);
    }

    function showReached(began = false) {
      const here = stations[at];
      const frame = picture(here);
      number(frame, at);
      el.now.replaceChildren(frame);
      el.label.textContent = here.label;
      rakah(el.rakah, rakahOf(at), began);
      dots(el.dots, stations.length, at + 1);
    }

    /* The question and its pictures. `began`: the station reached opens a rak'ah, whose name is said first. */
    function ask(speak, began = false) {
      const mine = ++turn;
      wrongs = 0;
      offered = offer();
      el.ask.textContent = TEXT.next.text;
      el.ask.classList.remove('named');
      el.choices.dataset.count = offered.length;
      el.choices.replaceChildren(...offered.map((station, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'q-choice';
        button.setAttribute('aria-label', station.label);
        button.append(picture(station));
        button.addEventListener('click', () => choose(i));
        return button;
      }));
      busy = false;
      if (speak) hearAll([began ? rakahClip(at) : '', TEXT.next.clip], () => mine === turn);
    }

    function choose(i) {
      const station = offered[i];
      const button = el.choices.children[i];
      if (busy || !station || !button || button.disabled) return;
      if (station !== stations[at + 1]) {
        wrongs += 1;
        beep('wrong');
        button.disabled = true;
        button.classList.add('no');
        if (wrongs >= 2) el.choices.children[offered.indexOf(stations[at + 1])].classList.add('hint');
        return;
      }
      busy = true;
      const mine = ++turn;
      beep('chime');
      [...el.choices.children].forEach((other) => {
        other.classList.remove('hint');
        other.classList.add(other === button ? 'right' : 'gone');
      });
      el.ask.textContent = station.label;
      el.ask.classList.add('named');
      const said = delay(450).then(() => hear(station.clip, { prompt: true, still: () => mine === turn }));
      Promise.all([delay(AFTER_RIGHT), said]).then(() => {
        if (mine !== turn) return;
        at += 1;
        const began = rakahOf(at) !== rakahOf(at - 1);
        showReached(began);
        if (at === stations.length - 1) {
          el.choices.replaceChildren();
          el.ask.textContent = '';
          whenDone();
        } else ask(true, began);
      });
    }

    /* A tap on the question says it again; on the name reached, its name; on the badge, the rak'ah's. */
    el.ask.addEventListener('click', () => {
      if (busy) return;
      const mine = turn;
      hear(TEXT.next.clip, { prompt: true, still: () => mine === turn });
    });
    el.label.addEventListener('click', () => {
      if (busy) return;
      const mine = turn;
      hear(stations[at].clip, { prompt: true, still: () => mine === turn });
    });
    el.rakah.addEventListener('click', () => {
      if (busy) return;
      const mine = turn;
      hear(rakahClip(at), { prompt: true, still: () => mine === turn });
    });

    return {
      start() {
        count = isDone(part) ? 3 : 2;
        at = 0;
        showReached();
        ask(false);
        /* The first rak'ah's name where there are rak'at, the first station's name, then the question. */
        const mine = turn;
        hearAll([rakahClip(0), stations[0].clip, TEXT.next.clip], () => mine === turn);
      },
      stop() {
        turn += 1;
        busy = true;
      },
      choose,
      get state() {
        return {
          at, count, wrongs, busy,
          here: stations[at].id, rakah: rakahOf(at), badge: el.rakah.hidden ? '' : el.rakah.textContent,
          offered: offered.map((station) => station.picture), looks: offered.map((station) => station.look),
          right: offered.indexOf(stations[at + 1]),
        };
      },
    };
  }

  /* The picture on a quiz's card: a station, an arrow, and the one to find. */
  function quizArt(station) {
    const art = document.createElement('span');
    art.className = 'q-art';
    art.append(picture(station));
    art.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 5.5L4.5 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><b>؟</b>');
    return art;
  }

  /* A game in two parts, each a large card: doing it with the boy, then the
     quiz. The first flows into the second by itself when it ends; the quiz
     ends on the cards, where its star shows. Inside a part the ✕ leads back
     to the cards; from the cards it leaves the page.

     names: what the two parts are called in the save. stations and rakat are
     the quiz's (see quiz()). begin() starts the first part and leave() stops
     it; the page calls endDo() when the child has finished it. ready: what
     the cards wait for before they open (the prayer waits for its words). */
  function twoParts({ root, names: [first, second], stations, rakat = null, begin, leave, ready = Promise.resolve() }) {
    let where = 'parts';
    let turn = 0; // counts moves between the views: what an older view started must not finish
    const game = quiz({
      box: root.querySelector('#view-quiz'),
      stations,
      rakat,
      part: second,
      whenDone() {
        finish(second);
        const mine = ++turn;
        where = 'done';
        praise(root, () => mine === turn).then(() => {
          if (mine === turn) cards();
        });
      },
    });
    function cards() {
      turn += 1;
      where = 'parts';
      leave();
      game.stop();
      sound.stop();
      stars(root);
      show(root, 'parts');
      scrollTo(0, 0);
    }
    function startDo() {
      turn += 1;
      where = 'do';
      game.stop();
      show(root, 'do');
      begin();
    }
    function startQuiz() {
      turn += 1;
      where = 'quiz';
      leave();
      sound.stop();
      show(root, 'quiz');
      game.start();
    }
    function endDo() {
      finish(first);
      leave();
      const mine = ++turn;
      where = 'done';
      praise(root, () => mine === turn).then(() => {
        if (mine === turn) startQuiz();
      });
    }
    ready.then(() => {
      root.querySelector('#part-do').addEventListener('click', startDo);
      root.querySelector('#part-quiz').addEventListener('click', startQuiz);
    });
    document.addEventListener('click', (event) => {
      if (where === 'parts' || !event.target.closest('#exit')) return;
      event.preventDefault();
      cards();
    }, true);
    stars(root);
    return { cards, startDo, startQuiz, endDo, quiz: game, get where() { return where; } };
  }

  load();
  /* The hub: its stars, and a stand-in for a card's picture that is not there. */
  stars();
  for (const img of document.querySelectorAll('img.art[data-name]')) {
    const standIn = () => {
      const frame = document.createElement('span');
      frame.className = 'art s-pic none';
      frame.innerHTML = '<span class="s-standin"><i class="s-arch"></i><b></b></span>';
      frame.querySelector('b').textContent = img.dataset.name;
      img.replaceWith(frame);
    };
    if (img.complete && !img.naturalWidth) standIn();
    else img.addEventListener('error', standIn);
  }
  /* A page the back button brings back as it was left shows the stars earned since. */
  addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    load();
    stars();
  });

  return { LOCAL, TEXT, WUDU, STATIONS, PRAYER, STAR, arabic, delay, beep, hear, data, sayings, finish, isDone, picture, preload, show, dots, rakah, stars, praise, quiz, quizArt, twoParts };
})();
