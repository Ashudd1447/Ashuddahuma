/* Sound for every game. Recordings are fetched and decoded once, ahead of the
   tap, and played through Web Audio, so a tap sounds at once instead of
   waiting on a download. Ported from the IQRA app, where this fixed the same
   lag. Rules kept: a missing clip stays silent, one clip plays at a time,
   chimes for praise and a soft buzzer for errors.
   The dialect setting lives here too: the text the child reads is always
   Fusha, and a spoken prompt may exist twice, as <name> (Fusha) and
   <name>-masri (Egyptian). say() plays the chosen one. */
const sound = (() => {
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const START_LEAD = 0.03;
  const DIALECTS = ['fusha', 'masri'];
  let context = null;
  let keepAlive = null;
  let warmed = false;
  let element = null;
  let active = null;
  let generation = 0;
  let sessionTimer = null;
  const clips = new Map();
  let air = null; // the background sound now playing
  let motor = null; // a vehicle's engine
  let whirr = null; // the power drill

  function ctx() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!context && Context) {
      try {
        context = new Context({ latencyHint: 'interactive' });
      } catch {
        context = null;
      }
    }
    return context;
  }

  /* A context made before the first touch starts suspended, and iPhones and
     iPads leave it interrupted after a call, so it is woken on the first touch
     and again at every play. */
  function wake() {
    const c = ctx();
    if (c && c.state !== 'running') c.resume().catch(() => {});
  }

  /* Chrome parks the speaker after 30 seconds of silence and takes a quarter
     second to restart it. An inaudible constant keeps it open. */
  function keepSinkAwake(c) {
    if (keepAlive) return;
    try {
      const node = c.createConstantSource();
      node.offset.value = 1e-7;
      node.connect(c.destination);
      node.start();
      keepAlive = node;
    } catch {
      // No ConstantSourceNode in this browser.
    }
  }

  function silentWav(seconds) {
    const rate = 8000;
    const bytes = Math.round(rate * seconds) * 2;
    const buffer = new ArrayBuffer(44 + bytes);
    const view = new DataView(buffer);
    const ascii = (offset, text) => {
      for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
    };
    ascii(0, 'RIFF');
    view.setUint32(4, 36 + bytes, true);
    ascii(8, 'WAVE');
    ascii(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    ascii(36, 'data');
    view.setUint32(40, bytes, true);
    let binary = '';
    for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
    return `data:audio/wav;base64,${btoa(binary)}`;
  }
  const SILENCE = silentWav(0.05);

  function media() {
    if (!element) {
      element = new Audio();
      element.preload = 'auto';
    }
    return element;
  }

  /* Called inside the first touch and at every play: wakes the context and,
     once, plays a sliver of silence through a media element so the page may
     play sound later without a touch. */
  function warm() {
    wake();
    const c = ctx();
    if (c) keepSinkAwake(c);
    if (warmed) return;
    warmed = true;
    const a = media();
    a.loop = false;
    a.src = SILENCE;
    const started = a.play();
    if (started) started.catch(() => { warmed = false; });
  }

  /* iPhones and iPads mute Web Audio when the ring switch is on silent. A
     looping silent media element keeps the page in the playback audio
     category while something sounds, which the switch does not mute. */
  function holdSession(on) {
    if (!IOS) return;
    const a = media();
    if (on) {
      clearTimeout(sessionTimer);
      a.loop = true; // also catches the one-shot warm-up sliver still playing
      if (a.paused || a.ended || a.src !== SILENCE) {
        a.src = SILENCE;
        const started = a.play();
        if (started) started.catch(() => {});
      }
    } else if (!active && !air && !motor && !whirr && !Object.keys(flows).length) {
      a.loop = false;
      a.pause();
    }
  }

  function fetchClip(file) {
    return fetch(`audio/${file}`)
      .then((response) => {
        const type = response.headers.get('content-type') || '';
        return response.ok && type.startsWith('audio/') ? response.arrayBuffer() : null;
      })
      .then((bytes) => (bytes && ctx() ? ctx().decodeAudioData(bytes) : null))
      .catch(() => null);
  }

  /* Fetch and decode once; concurrent callers share the promise. A clip that
     failed is forgotten so the next tap tries again. A name without an
     extension is looked for as audio/<name>.m4a (phone recordings), then
     audio/<name>.wav (the recording tool). */
  function load(name) {
    let promise = clips.get(name);
    if (!promise) {
      promise = name.includes('.')
        ? fetchClip(name)
        : fetchClip(`${name}.m4a`).then((buffer) => buffer || fetchClip(`${name}.wav`));
      promise.then((buffer) => { if (!buffer) clips.delete(name); });
      clips.set(name, promise);
    }
    return promise;
  }

  function preload(names) {
    for (const name of names) load(name);
  }

  /* The decoded clip itself, for the automatic word timing; null when missing. */
  function buffer(name) {
    return load(name);
  }

  /* The first of several names that has a recording, with its buffer. */
  function first(names) {
    return names.reduce(
      (chain, name) => chain.then((hit) => hit || load(name).then((buffer) => (buffer ? { name, buffer } : null))),
      Promise.resolve(null),
    );
  }

  function stop() {
    generation += 1;
    if (held) {
      held = false;
      wake();
    }
    if (!active) return;
    const current = active;
    active = null;
    current.stop();
  }

  /* Pausing the recording that plays (the story reader): the whole context
     is held, so the clip and its clock, current().position(), stand still
     together, and resume() goes on from the same point. stop() and play()
     wake it again. */
  let held = false;
  function pause() {
    const c = ctx();
    if (!c || !active || held) return false;
    held = true;
    c.suspend().catch(() => {});
    return true;
  }
  function resume() {
    if (!held) return;
    held = false;
    wake();
  }
  const paused = () => held;

  /* Where the sound is now, in seconds into the clip: the context clock less
     the output latency, capped by the last output timestamp. */
  function heard(c, startedAt) {
    const latency = c.outputLatency || c.baseLatency || 0;
    const byClock = c.currentTime - latency;
    if (c.state !== 'running') return byClock - startedAt;
    let byStamp = Infinity;
    const stamp = typeof c.getOutputTimestamp === 'function' ? c.getOutputTimestamp() : null;
    if (stamp && typeof stamp.contextTime === 'number' && stamp.contextTime > 0) {
      const since = Math.min(0.1, Math.max(0, (performance.now() - stamp.performanceTime) / 1000));
      byStamp = stamp.contextTime + since;
    }
    return Math.min(byClock, byStamp) - startedAt;
  }

  /* Plays a recording by name, or the first that exists of a list of names,
     and resolves when it ends, at once if nothing was found or a newer play
     took over. */
  function play(name) {
    stop();
    warm();
    const mine = generation;
    const names = Array.isArray(name) ? name : [name];
    return new Promise((resolve) => {
      first(names).then((hit) => {
        const c = ctx();
        if (mine !== generation || !hit || !c) return resolve();
        const source = c.createBufferSource();
        source.buffer = hit.buffer;
        source.connect(c.destination);
        const startedAt = c.currentTime + START_LEAD;
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          if (active === playing) active = null;
          holdSession(false);
          resolve();
        };
        const playing = {
          name: hit.name,
          duration: hit.buffer.duration,
          position: () => Math.max(0, heard(c, startedAt)),
          stop: () => {
            source.onended = null;
            try { source.stop(); } catch { /* already stopped */ }
            source.disconnect();
            finish();
          },
        };
        active = playing;
        holdSession(true);
        source.onended = () => { source.disconnect(); finish(); };
        source.start(startedAt);
      });
    });
  }

  function current() {
    return active;
  }

  /* Dialect: 'fusha' (the default) or 'masri', kept on the device. */
  function dialect() {
    try {
      const saved = localStorage.getItem('dialect');
      return DIALECTS.includes(saved) ? saved : 'fusha';
    } catch {
      return 'fusha';
    }
  }

  function setDialect(next) {
    try {
      localStorage.setItem('dialect', DIALECTS.includes(next) ? next : 'fusha');
    } catch {
      // Private browsing: the choice lasts for this page only.
    }
    /* A page that hides its Fusha text while Egyptian is spoken listens for this. */
    try { window.dispatchEvent(new Event('dialectchange')); } catch { /* no events here */ }
  }

  const variants = (name) => (dialect() === 'masri' ? [`${name}-masri`, name] : [name]);

  /* A spoken prompt in the chosen dialect; the Fusha recording plays when the
     Egyptian one does not exist. */
  function say(name) {
    uses(name);
    return play(variants(name));
  }

  /* Whether say(name) speaks Egyptian: the switch is on Egyptian and the
     recording <name>-masri exists. A Promise of true or false. The father's
     rule (2026-11-25): Fusha text is not on the screen while Egyptian is spoken. */
  function masri(name) {
    return dialect() === 'masri' ? load(`${name}-masri`).then(Boolean, () => false) : Promise.resolve(false);
  }

  /* A text on the page that a recording says, kept to the father's rule:
     the words on the screen are the words the voice says. When the Egyptian
     recording is the one that plays (masri(clip)), the Egyptian text shows in
     place of the Fusha (the father, 2026-11-26: a page of speaker marks could
     not be told apart, so "show Egyptian text"); otherwise the Fusha.
     caption(el, text, clip) puts the right one in el and keeps it right: it
     follows the switch ('dialectchange'), and on Egyptian the text waits
     unseen until the answer comes. The Egyptian wording is the recording
     card's, from egyptian.json (written by tools/list-egyptian.js from
     record.js); a clip recorded in Egyptian whose text is missing there is
     hidden, keeping its room, rather than shown in Fusha. A later caption()
     on the same element replaces the earlier one. The clip is announced
     (uses), for the page's dialect switch. Returns a Promise of whether
     Egyptian plays. The fourth argument is kept for older callers. */
  let egyptian = null;
  function egyptianText(clip) {
    if (!egyptian) egyptian = fetch('/egyptian.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    return egyptian.then((all) => all[clip] || '');
  }
  const captions = new Map(); // element -> { text, clip, asked }
  function dress(el, entry) {
    const mine = ++entry.asked;
    const put = (shown, quiet) => {
      if (captions.get(el) !== entry || mine !== entry.asked) return;
      el.classList.remove('caption-wait');
      if (el.textContent !== shown) el.textContent = shown;
      el.classList.toggle('caption-quiet', quiet);
      if (shown === entry.text) el.removeAttribute('lang');
      else el.setAttribute('lang', 'arz');
    };
    if (dialect() === 'masri') el.classList.add('caption-wait');
    else put(entry.text, false);
    return masri(entry.clip)
      .then((yes) => (yes === true ? egyptianText(entry.clip).then((words) => {
        put(words || entry.text, !words);
        return true;
      }) : (put(entry.text, false), false)))
      .catch(() => {
        put(entry.text, false);
        return false;
      });
  }
  function caption(el, text, clip) {
    if (!el) return Promise.resolve(false);
    const entry = { text: String(text), clip, asked: 0 };
    captions.set(el, entry);
    uses(clip);
    return dress(el, entry);
  }
  window.addEventListener('dialectchange', () => {
    for (const [el, entry] of captions) dress(el, entry);
  });

  function preloadPrompts(names) {
    uses(names);
    for (const name of names) for (const variant of variants(name)) load(variant);
  }

  /* Which prompts this page can say, and whether any of them is recorded in
     both dialects: then app.js puts the dialect switch on the page itself,
     beside the menu, from the start of the activity (the father, 2026-11-25).
     A page announces its prompts through preloadPrompts(), say() or uses(); a
     game announces all of them as it opens, so the switch is there from its
     first screen. What is recorded is read from sw.js, whose FILES lists
     every recording, and from the saved copy for a device that is offline:
     nothing is fetched to find out. */
  const announced = new Set();
  let telling = 0;
  function uses(names) {
    let grew = false;
    for (const name of [].concat(names)) {
      if (typeof name !== 'string' || announced.has(name)) continue;
      announced.add(name);
      grew = true;
    }
    if (!grew) return;
    clearTimeout(telling);
    telling = setTimeout(() => {
      try { window.dispatchEvent(new Event('promptsannounced')); } catch { /* no events here */ }
    }, 0);
  }

  let recorded = null;
  function recordings() {
    if (recorded) return recorded;
    const names = (paths) => paths.map((path) => (/\/audio\/([^/.]+)\.(?:m4a|wav|mp3)$/.exec(path) || [])[1]).filter(Boolean);
    const fromFile = fetch('/sw.js').then((r) => r.text()).then((text) => names(text.match(/\/audio\/[^'"\s]+/g) || [])).catch(() => []);
    const fromCopy = (typeof caches === 'undefined' ? Promise.resolve([]) : caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.open(key).then((copy) => copy.keys()))))
      .then((lists) => names(lists.flat().map((request) => new URL(request.url).pathname)))).catch(() => []);
    /* On the admin's own computer a test may name recordings that are not made yet. */
    let pretend = [];
    try {
      if (['localhost', '127.0.0.1'].includes(location.hostname)) pretend = (localStorage.getItem('recordings-test') || '').split(',').filter(Boolean);
    } catch { /* no storage */ }
    recorded = Promise.all([fromFile, fromCopy]).then(([a, b]) => new Set([...a, ...b, ...pretend]));
    return recorded;
  }

  /* A Promise of whether any prompt this page has announced is recorded in
     Fusha and in Egyptian. */
  function twoDialects() {
    return recordings().then((set) => [...announced].some((name) => set.has(name) && set.has(`${name}-masri`)));
  }

  /* Keeps the page's sound session open for a made sound of this many seconds. */
  function hold(seconds) {
    holdSession(true);
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => holdSession(false), seconds * 1000 + 150);
  }

  function tone(frequency, startsIn, length, volume, type = 'sine', slideTo = 0) {
    const c = ctx();
    if (!c) return;
    wake();
    hold(startsIn + length);
    const start = c.currentTime + startsIn;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + length * 0.7);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  function chime() {
    tone(660, 0, 0.45, 0.14);
    tone(880, 0.12, 0.6, 0.12);
  }

  function buzz() {
    tone(150, 0, 0.22, 0.12, 'triangle');
  }

  /* A short, soft tap when a block puzzle piece settles on the board. */
  function tick() {
    tone(700, 0, 0.09, 0.1, 'sine', 260);
  }

  /* The driving game: a seat belt clicking in, and a car's short double horn. */
  function click() {
    tone(2100, 0, 0.035, 0.09, 'square', 1200);
    tone(1300, 0.06, 0.05, 0.08, 'square', 600);
  }

  /* A star picked up on the road; step makes each one in a row a little higher. */
  function pop(step = 0) {
    const pitch = 560 * 2 ** (Math.min(step, 12) / 12);
    tone(pitch, 0, 0.1, 0.08, 'sine', pitch * 1.5);
  }

  function honk() {
    for (const at of [0, 0.17]) {
      tone(415, at, 0.13, 0.07, 'triangle');
      tone(523, at, 0.13, 0.06, 'triangle');
    }
  }

  /* The turn signal's tick and tock. */
  function blink(on) {
    tone(on ? 1500 : 1150, 0, 0.025, 0.035, 'square');
  }

  /* Two seconds of hiss, made once: the river's wind, a saw, a splash. */
  let hissing = null;
  function hiss(c) {
    if (!hissing) {
      hissing = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const data = hissing.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return hissing;
  }

  /* A short rush of hiss through a filter that may slide. */
  function rush(frequency, startsIn, length, volume, q = 1, slideTo = 0) {
    const c = ctx();
    if (!c) return;
    wake();
    hold(startsIn + length);
    const start = c.currentTime + startsIn;
    const source = c.createBufferSource();
    source.buffer = hiss(c);
    source.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = q;
    filter.frequency.setValueAtTime(frequency, start);
    if (slideTo) filter.frequency.exponentialRampToValueAtTime(slideTo, start + length);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.04, length * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    source.connect(filter).connect(gain).connect(c.destination);
    source.start(start, Math.random());
    source.stop(start + length + 0.05);
  }

  /* A bird of prey's cry: a hoarse whistle that rises a little, then falls away. */
  function eagle(volume = 0.03, startsIn = 0) {
    const c = ctx();
    if (!c) return;
    wake();
    const length = 1.05;
    hold(startsIn + length);
    const start = c.currentTime + startsIn;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueCurveAtTime(new Float32Array([2500, 3250, 3150, 2950, 2650, 2300, 2050]), start, length);
    const shake = c.createOscillator();
    shake.frequency.value = 31;
    const depth = c.createGain();
    depth.gain.value = 70;
    shake.connect(depth).connect(osc.frequency);
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2800;
    filter.Q.value = 1.4;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.07);
    gain.gain.setValueAtTime(volume, start + length * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(filter).connect(gain).connect(c.destination);
    for (const node of [osc, shake]) {
      node.start(start);
      node.stop(start + length + 0.05);
    }
  }

  /* The building game's own sounds: a hammer's blow, a screw's turn, a load
     set down, and water under a wheel for the desert. */
  function knock() {
    tone(300, 0, 0.07, 0.12, 'triangle', 150);
    rush(2200, 0, 0.04, 0.05);
  }

  function ratchet() {
    tone(1800, 0, 0.03, 0.045, 'square', 900);
  }

  function thud() {
    tone(140, 0, 0.16, 0.14, 'sine', 70);
    rush(500, 0, 0.08, 0.04);
  }

  function splash() {
    rush(1800, 0, 0.4, 0.05, 0.7, 600);
  }

  /* A machine backing up: one soft beep. */
  function backup() {
    tone(980, 0, 0.2, 0.022);
  }

  /* What sounds now and then in each place. */
  const VOICES = {
    // Small birds: a few short rising whistles.
    birds: () => {
      const notes = 2 + Math.floor(Math.random() * 3);
      const pitch = 2300 + Math.random() * 1500;
      for (let i = 0; i < notes; i++) tone(pitch * (1 + i * 0.04), i * 0.13, 0.1, 0.022, 'sine', pitch * 1.25);
    },
    // The desert: a far eagle, or a lark's quick run of notes.
    wild: () => {
      if (Math.random() < 0.4) {
        eagle(0.014);
        if (Math.random() < 0.5) eagle(0.011, 1.3);
        return;
      }
      const notes = 3 + Math.floor(Math.random() * 4);
      const pitch = 3000 + Math.random() * 900;
      for (let i = 0; i < notes; i++) tone(pitch * (1 + (i % 2) * 0.12), i * 0.09, 0.07, 0.013, 'sine', pitch * 1.1);
    },
    // A building site, far off: a hammer, a saw, a truck backing up, a clank.
    works: () => {
      const pick = Math.random();
      if (pick < 0.4) {
        const blows = 3 + Math.floor(Math.random() * 4);
        const pitch = 440 + Math.random() * 160;
        for (let i = 0; i < blows; i++) tone(pitch, i * 0.27, 0.05, 0.018, 'triangle', pitch / 2);
      } else if (pick < 0.65) {
        for (let i = 0; i < 4; i++) rush(i % 2 ? 1500 : 1900, i * 0.3, 0.24, 0.011, 2.5);
      } else if (pick < 0.85) {
        for (let i = 0; i < 3; i++) tone(980, i * 0.62, 0.28, 0.008);
      } else {
        tone(1500, 0, 0.14, 0.012, 'triangle', 1150);
        tone(2250, 0.01, 0.1, 0.007, 'triangle', 1700);
      }
    },
    // A car factory, far off: a power wrench, a hiss of air, a clank.
    plant: () => {
      const pick = Math.random();
      if (pick < 0.45) {
        for (let i = 0; i < 6; i++) tone(118, i * 0.035, 0.03, 0.012, 'square');
        rush(1900, 0, 0.24, 0.008, 1.2);
      } else if (pick < 0.75) {
        rush(4200, 0, 0.5, 0.008, 0.6, 2600);
      } else {
        tone(1500, 0, 0.14, 0.01, 'triangle', 1150);
        tone(2250, 0.01, 0.1, 0.006, 'triangle', 1700);
      }
    },
  };
  /* Each place: its bed of hiss, if it has one (the filter's pitch, how loud,
     how fast it swells), and what sounds now and then, how often (seconds). */
  const PLACES = {
    town: { voice: 'birds', every: [2, 5.5] },
    river: { bed: [640, 0.02, 0.09], voice: 'birds', every: [2.5, 8.5] },
    desert: { voice: 'wild', every: [5, 13] },
    site: { bed: [230, 0.016, 0.07], voice: 'works', every: [2.2, 5.5] },
    factory: { bed: [300, 0.012, 0.05], voice: 'plant', every: [3, 7] },
  };

  /* Background sound for the games, made here and not recorded. kind is
     'town' (birds), 'river' (wind over water, and birds), 'desert' (an eagle
     and small birds, far off), 'site' (soft building noise) or 'factory' (a
     hum, a power wrench now and then); nothing, or a
     page gone to the background, stops it. */
  function ambience(kind) {
    const c = ctx();
    if (air) {
      const old = air;
      air = null;
      clearTimeout(old.timer);
      if (old.gain) {
        old.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.15);
        setTimeout(() => {
          try {
            old.source.stop();
            old.swell.stop();
          } catch {
            // Already stopped.
          }
        }, 800);
      }
    }
    const place = PLACES[kind];
    if (!place || !c) {
      holdSession(false);
      return;
    }
    wake();
    const mine = { timer: null };
    if (place.bed) {
      const [pitch, level, pace] = place.bed;
      const source = c.createBufferSource();
      source.buffer = hiss(c);
      source.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = pitch;
      filter.Q.value = 0.6;
      const gain = c.createGain();
      gain.gain.value = 0.0001;
      gain.gain.setTargetAtTime(level, c.currentTime, 0.8);
      const swell = c.createOscillator();
      swell.frequency.value = pace;
      const depth = c.createGain();
      depth.gain.value = level * 0.6;
      swell.connect(depth).connect(gain.gain);
      source.connect(filter).connect(gain).connect(c.destination);
      source.start();
      swell.start();
      Object.assign(mine, { source, gain, swell });
    }
    air = mine;
    holdSession(true);
    const [least, most] = place.every;
    const sing = () => {
      if (air !== mine) return;
      VOICES[place.voice]();
      mine.timer = setTimeout(sing, (least + Math.random() * (most - least)) * 1000);
    };
    mine.timer = setTimeout(sing, 1500);
  }

  /* A light motor for the desert bike: level, 0 to 1, is how loud, and pitch
     how fast it turns. It starts at the first call above zero. */
  function engine(level, pitch = 0) {
    const c = ctx();
    if (!c || (!motor && level <= 0)) return;
    if (!motor) {
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 480;
      const gain = c.createGain();
      gain.gain.value = 0.0001;
      osc.connect(filter).connect(gain).connect(c.destination);
      osc.start();
      motor = { osc, gain };
      holdSession(true);
    }
    motor.osc.frequency.setTargetAtTime(46 + 44 * pitch, c.currentTime, 0.08);
    motor.gain.gain.setTargetAtTime(Math.max(0.0001, level * 0.06), c.currentTime, 0.12);
  }

  function engineOff() {
    if (!motor) return;
    const old = motor;
    motor = null;
    old.gain.gain.setTargetAtTime(0.0001, ctx().currentTime, 0.1);
    setTimeout(() => {
      try {
        old.osc.stop();
      } catch {
        // Already stopped.
      }
    }, 600);
    holdSession(false);
  }

  /* The power drill. A level above zero runs it: the motor whines up to speed,
     and falls away when the level goes back to zero. load, 0 to 1, is the bit
     cutting: the motor drops a little and a rough hiss joins it. An earlier
     drill, a low saw wave through a filter, sounded like a buzzer. */
  const DRILL = 430; // the motor's note at full speed
  function drill(level, load = 0) {
    const c = ctx();
    if (!c || (!whirr && level <= 0)) return;
    const now = c.currentTime;
    if (level <= 0) {
      const old = whirr;
      whirr = null;
      for (const [osc, ratio] of old.oscs) osc.frequency.setTargetAtTime(DRILL * 0.3 * ratio, now, 0.09);
      old.gain.gain.setTargetAtTime(0.0001, now + 0.04, 0.08);
      setTimeout(() => {
        for (const node of old.nodes) {
          try {
            node.stop();
          } catch {
            // Already stopped.
          }
        }
      }, 700);
      holdSession(false);
      return;
    }
    if (!whirr) {
      wake();
      const gain = c.createGain();
      gain.gain.value = 0.0001;
      gain.connect(c.destination);
      // The whine: three voices through a band that keeps the motor's song
      // and drops its buzz, over a little of the lowest voice for body.
      const band = c.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 2300;
      band.Q.value = 0.8;
      const body = c.createBiquadFilter();
      body.type = 'lowpass';
      body.frequency.value = 700;
      const low = c.createGain();
      low.gain.value = 0.12;
      const voice = c.createGain();
      voice.gain.value = 0.8;
      band.connect(voice);
      body.connect(low).connect(voice);
      voice.connect(gain);
      const oscs = [['sawtooth', 1], ['square', 2.02], ['sawtooth', 3.03]].map(([type, ratio]) => {
        const osc = c.createOscillator();
        osc.type = type;
        osc.frequency.value = DRILL * 0.3 * ratio;
        osc.connect(band);
        if (ratio === 1) osc.connect(body);
        osc.start();
        return [osc, ratio];
      });
      // The gears' rattle: the whine wavers quickly.
      const rattle = c.createOscillator();
      rattle.frequency.value = 37;
      const depth = c.createGain();
      depth.gain.value = 0.16;
      rattle.connect(depth).connect(voice.gain);
      rattle.start();
      // The bit in the wood: hiss, let in by the load.
      const source = c.createBufferSource();
      source.buffer = hiss(c);
      source.loop = true;
      const cut = c.createBiquadFilter();
      cut.type = 'bandpass';
      cut.frequency.value = 3400;
      cut.Q.value = 0.6;
      const bite = c.createGain();
      bite.gain.value = 0;
      source.connect(cut).connect(bite).connect(gain);
      source.start();
      whirr = { gain, oscs, bite, nodes: [...oscs.map(([osc]) => osc), rattle, source] };
      holdSession(true);
    }
    const speed = DRILL * (1 - 0.18 * clampUnit(load));
    for (const [osc, ratio] of whirr.oscs) osc.frequency.setTargetAtTime(speed * ratio, now, 0.07);
    whirr.bite.gain.setTargetAtTime(0.5 * clampUnit(load), now, 0.05);
    whirr.gain.gain.setTargetAtTime(0.05 * clampUnit(level), now, 0.04);
  }
  const clampUnit = (value) => Math.max(0, Math.min(1, value || 0));

  /* Rushes of hiss that last while their level is above zero: paint from a
     spray gun, concrete down a chute. */
  const flows = {};
  function flow(name, level, pitch, q, loud, wobble) {
    const c = ctx();
    if (!c || (!flows[name] && level <= 0)) return;
    const now = c.currentTime;
    if (level <= 0) {
      const old = flows[name];
      delete flows[name];
      old.gain.gain.setTargetAtTime(0.0001, now, 0.08);
      setTimeout(() => {
        for (const node of old.nodes) {
          try {
            node.stop();
          } catch {
            // Already stopped.
          }
        }
      }, 500);
      holdSession(false);
      return;
    }
    if (!flows[name]) {
      wake();
      const source = c.createBufferSource();
      source.buffer = hiss(c);
      source.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = pitch;
      filter.Q.value = q;
      const gain = c.createGain();
      gain.gain.value = 0.0001;
      source.connect(filter).connect(gain).connect(c.destination);
      source.start(0, Math.random());
      const nodes = [source];
      if (wobble) {
        const swell = c.createOscillator();
        swell.frequency.value = wobble;
        const depth = c.createGain();
        depth.gain.value = loud * 0.45;
        swell.connect(depth).connect(gain.gain);
        swell.start();
        nodes.push(swell);
      }
      flows[name] = { gain, nodes };
      holdSession(true);
    }
    flows[name].gain.gain.setTargetAtTime(loud * clampUnit(level), now, 0.06);
  }
  const spray = (level) => flow('spray', level, 5200, 0.5, 0.035, 0);
  const pour = (level) => flow('pour', level, 420, 0.7, 0.07, 3.1);

  /* A car's engine revved: the note climbs and falls back, `count` times.
     Returns how long it lasts, in seconds. */
  function rev(count = 1) {
    const c = ctx();
    if (!c) return 0;
    wake();
    const each = 1.05;
    hold(count * each + 0.3);
    for (let i = 0; i < count; i++) {
      const start = c.currentTime + 0.05 + i * each;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 2;
      filter.frequency.setValueAtTime(320, start);
      filter.frequency.exponentialRampToValueAtTime(1500, start + 0.32);
      filter.frequency.exponentialRampToValueAtTime(360, start + 0.9);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.05, start + 0.85);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1);
      filter.connect(gain).connect(c.destination);
      for (const [type, ratio] of [['sawtooth', 1], ['square', 0.5]]) {
        const osc = c.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(58 * ratio, start);
        osc.frequency.exponentialRampToValueAtTime(196 * ratio, start + 0.32);
        osc.frequency.exponentialRampToValueAtTime(64 * ratio, start + 0.9);
        osc.connect(filter);
        osc.start(start);
        osc.stop(start + 1.05);
      }
    }
    return count * each;
  }

  /* The factory's own: a power wrench's short burst, and a welder's crackle. */
  function zip() {
    for (let i = 0; i < 7; i++) tone(118, i * 0.035, 0.03, 0.06, 'square');
    rush(1900, 0, 0.26, 0.035, 1.2);
  }

  function spark() {
    for (let i = 0; i < 4; i++) rush(5200 + Math.random() * 2500, i * 0.04 + Math.random() * 0.02, 0.03, 0.03, 0.8);
  }

  /* Wrong answers vibrate on touch devices that support it (not iPhone or
     iPad) and otherwise play the buzzer. */
  function wrong() {
    const canVibrate = 'vibrate' in navigator && matchMedia('(pointer: coarse)').matches;
    if (canVibrate && navigator.vibrate(160)) return;
    buzz();
  }

  addEventListener('pointerdown', warm, { capture: true, once: true });
  addEventListener('keydown', warm, { capture: true, once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
      ambience(null);
      engineOff();
      drill(0);
      spray(0);
      pour(0);
    }
    else wake();
  });

  return {
    preload, preloadPrompts, buffer, play, say, stop, pause, resume, paused, current, dialect, setDialect, masri, caption, uses, twoDialects, unlock: warm,
    chime, buzz, tick, click, honk, pop, blink, eagle, knock, ratchet, thud, splash, backup, drill, spray, pour, rev, zip, spark, ambience, engine, engineOff, wrong,
    /* The two building blocks, for a game that makes a sound of its own in its own file:
       tone(frequency, startsIn, length, volume, type, slideTo) and rush(frequency, startsIn, length, volume, q, slideTo). */
    tone, rush,
  };
})();
