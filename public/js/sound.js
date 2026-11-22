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
    } else if (!active && !air && !motor && !whirr) {
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
    if (!active) return;
    const current = active;
    active = null;
    current.stop();
  }

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
  }

  const variants = (name) => (dialect() === 'masri' ? [`${name}-masri`, name] : [name]);

  /* A spoken prompt in the chosen dialect; the Fusha recording plays when the
     Egyptian one does not exist. */
  function say(name) {
    return play(variants(name));
  }

  function preloadPrompts(names) {
    for (const name of names) for (const variant of variants(name)) load(variant);
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
  };
  /* Each place: its bed of hiss, if it has one (the filter's pitch, how loud,
     how fast it swells), and what sounds now and then, how often (seconds). */
  const PLACES = {
    town: { voice: 'birds', every: [2, 5.5] },
    river: { bed: [640, 0.02, 0.09], voice: 'birds', every: [2.5, 8.5] },
    desert: { voice: 'wild', every: [5, 13] },
    site: { bed: [230, 0.016, 0.07], voice: 'works', every: [2.2, 5.5] },
  };

  /* Background sound for the games, made here and not recorded. kind is
     'town' (birds), 'river' (wind over water, and birds), 'desert' (an eagle
     and small birds, far off) or 'site' (soft building noise); nothing, or a
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

  /* The power drill: a whirr while level is above zero. */
  function drill(level) {
    const c = ctx();
    if (!c || (!whirr && level <= 0)) return;
    if (level <= 0) {
      const old = whirr;
      whirr = null;
      old.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.05);
      setTimeout(() => {
        try {
          old.osc.stop();
          old.source.stop();
        } catch {
          // Already stopped.
        }
      }, 400);
      holdSession(false);
      return;
    }
    if (!whirr) {
      wake();
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      const source = c.createBufferSource();
      source.buffer = hiss(c);
      source.loop = true;
      const grit = c.createGain();
      grit.gain.value = 0.25;
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 1.2;
      const gain = c.createGain();
      gain.gain.value = 0.0001;
      osc.connect(filter);
      source.connect(grit).connect(filter);
      filter.connect(gain).connect(c.destination);
      osc.start();
      source.start();
      whirr = { osc, source, gain };
      holdSession(true);
    }
    whirr.osc.frequency.setTargetAtTime(150 + 90 * level, c.currentTime, 0.06);
    whirr.gain.gain.setTargetAtTime(0.05 * level, c.currentTime, 0.05);
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
    }
    else wake();
  });

  return {
    preload, preloadPrompts, buffer, play, say, stop, current, dialect, setDialect, unlock: warm,
    chime, buzz, tick, click, honk, pop, blink, eagle, knock, ratchet, thud, splash, backup, drill, ambience, engine, engineOff, wrong,
  };
})();
