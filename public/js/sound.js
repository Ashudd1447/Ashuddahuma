/* Sound for every game. Recordings are fetched and decoded once, ahead of the
   tap, and played through Web Audio, so a tap sounds at once instead of
   waiting on a download. Ported from the IQRA app, where this fixed the same
   lag. Rules kept: a missing clip stays silent, one clip plays at a time,
   chimes for praise and a soft buzzer for errors. */
const sound = (() => {
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const START_LEAD = 0.03;
  let context = null;
  let keepAlive = null;
  let warmed = false;
  let element = null;
  let active = null;
  let generation = 0;
  let sessionTimer = null;
  const clips = new Map();

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
     looping silent media element keeps the page's audio in the playback
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
    } else if (!active) {
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

  /* Plays a recording by name and resolves when it ends, at once if the clip
     is missing or a newer play took over. */
  function play(name) {
    stop();
    warm();
    const mine = generation;
    return new Promise((resolve) => {
      load(name).then((buffer) => {
        const c = ctx();
        if (mine !== generation || !buffer || !c) return resolve();
        const source = c.createBufferSource();
        source.buffer = buffer;
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
          name,
          duration: buffer.duration,
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

  function tone(frequency, startsIn, length, volume, type = 'sine') {
    const c = ctx();
    if (!c) return;
    wake();
    holdSession(true);
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => holdSession(false), (startsIn + length) * 1000 + 150);
    const start = c.currentTime + startsIn;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
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
    if (document.hidden) stop();
    else wake();
  });

  return { preload, play, stop, current, unlock: warm, chime, buzz, wrong };
})();
