/* Measuring and cutting a take, shared by the recording tool (record.js, for
   each new take) and tools/trim-audio.js (for recordings already written to
   public/audio). In node it is module.exports.

   The father, 2026-11-26: with the first trim on, the start was cut too
   close; with it off, the click of the Stop button was heard at the end. Then,
   the same day, with the second trim: the first letters of التفاحة and the
   last of some words were cut. So:
   - The voice's loud part is found (as IQRA's takeCheck), then walked out at
     both ends over everything that is clearly sound, across silences of up
     to GAP: a word's own closures are silent (the tt of at-tuffaaha, the q of
     -qi at the end of الصندوقِ, a final t), and the sound on their far side is
     speech, however soft. A lone 10 ms blip does not count, nor anything more
     than REACH beyond the loud part. LEAD seconds of room are kept before the
     first sound and TAIL after the last; a take whose voice starts sooner
     than LEAD is given silence in front.
   - Nothing before the voice is silenced: an early start of speech and the
     sound of the Record key cannot be told apart, and speech comes first.
   - The Stop click (mouse or key) is never kept, trimmed or not: from a take
     straight off the microphone (raw) the last STOP seconds go, and a short
     burst that begins in the last CLICK seconds, after a quiet gap, goes with
     it. Speech that close to Stop cannot be told from the click: cut() says
     so (tight), and the recording page asks for a beat before Stop.
   - A short fade at each end, so a cut never pops. */
const takeTrim = (() => {
  const LEAD = 0.2;
  const TAIL = 0.25;
  const STOP = 0.15;
  const CLICK = 0.2;
  const FADE_IN = 0.01;
  const FADE_OUT = 0.03;
  const GAP = 25; // windows of 10 ms: the longest silence inside a word
  const REACH = 60; // windows: the farthest the voice is walked out beyond its loud part

  /* As IQRA's takeCheck: 10 ms RMS windows, an adaptive threshold, peak,
     clipping and the noise floor. */
  function profile(samples, sampleRate) {
    const win = Math.max(1, Math.round(sampleRate * 0.01));
    const n = Math.floor(samples.length / win);
    const rms = new Float64Array(n);
    let peakRms = 0;
    let peakSample = 0;
    let hot = 0;
    for (let w = 0; w < n; w++) {
      let sum = 0;
      for (let i = w * win; i < (w + 1) * win; i++) {
        const v = samples[i];
        sum += v * v;
        const a = Math.abs(v);
        if (a > peakSample) peakSample = a;
        if (a >= 0.999) hot++;
      }
      rms[w] = Math.sqrt(sum / win);
      if (rms[w] > peakRms) peakRms = rms[w];
    }
    const sorted = Float64Array.from(rms).sort();
    const noiseFloor = sorted[Math.floor(sorted.length * 0.15)] || 0;
    /* The room is the 3rd percentile: a long ayah or a take already cut
       close is mostly voice, so its 15th percentile is quiet voice, and a
       threshold from it found no voice at all in three of the Fatihah takes. */
    const room = sorted[Math.floor(sorted.length * 0.03)] || 0;
    const threshold = Math.max(Math.min(noiseFloor, room * 4) * 3.5, peakRms * 0.06, 0.0008);
    /* The soft edge: 40 dB under the loudest window and 15 dB over the room,
       but never above a quarter of the loud threshold. */
    const soft = Math.min(Math.max(room * 6, peakRms * 0.01, 0.00005), threshold / 4);
    return { rms, win, peakRms, peakSample, noiseFloor, clipped: hot > 3, threshold, soft };
  }

  /* Runs of sound above the threshold, in windows, before window `end`;
     blips under 80 ms dropped. */
  function runs(p, end = p.rms.length) {
    const out = [];
    let start = -1;
    for (let w = 0; w <= end; w++) {
      const loud = w < end && p.rms[w] >= p.threshold;
      if (loud && start < 0) start = w;
      if (!loud && start >= 0) {
        if ((w - start) * 0.01 >= 0.08) out.push([start, w]);
        start = -1;
      }
    }
    return out;
  }

  /* Seconds before the voice's loud part begins. The first trim kept 0.12 s
     there, so a recording with less than 0.2 s was cut by it. */
  function voiceStart(p) {
    const found = runs(p);
    return found.length ? found[0][0] * 0.01 : 0;
  }

  /* Where the take ends without its Stop click, in windows: a burst that
     begins in the last CLICK seconds, with at least 50 ms of quiet before
     it. A burst that begins earlier is kept: it is speech (a final release),
     and the click itself comes within a tenth of a second or so of the end. */
  function endWithoutClick(p) {
    const n = p.rms.length;
    const zone = Math.round(CLICK * 100);
    let last = n - 1;
    while (last >= n - zone && last >= 0 && p.rms[last] < p.soft) last--;
    if (last < 0 || last < n - zone) return n;
    let first = last;
    for (let w = last - 1, quiet = 0; w >= 0 && w >= n - zone - 10; w--) {
      if (p.rms[w] >= p.soft) {
        first = w;
        quiet = 0;
      } else if (++quiet >= 5) {
        return first >= n - zone ? Math.max(0, first - 2) : n;
      }
    }
    return n;
  }

  /* From the loud part's edge `from`, outward in direction `dir` (-1 or +1),
     the farthest window that is clearly sound: next to the edge, or one of
     two in a row, across silences of up to GAP, never past `stop` or more
     than REACH beyond `from`. */
  function walkOut(p, from, dir, stop) {
    const rms = p.rms;
    const on = (w) => w >= 0 && w < rms.length && rms[w] >= p.soft;
    let edge = from;
    let quiet = 0;
    for (let w = from + dir; dir < 0 ? w >= stop : w < stop; w += dir) {
      if (Math.abs(w - from) > REACH) break;
      if (on(w) && (quiet === 0 || on(w + dir))) {
        edge = w;
        quiet = 0;
      } else if (++quiet > GAP) break;
    }
    return edge;
  }

  /* The take cut as described at the top. options: trim (cut the silence at
     both ends), raw (straight off the microphone: drop the last STOP
     seconds), profile (already measured). Returns { samples, lead, end, cut,
     tight }: the seconds of silence added in front, where the take now ends
     and how much was cut from its end, for a report, and whether the voice
     ran up to where the Stop click was cut (perhaps cut with it). */
  function cut(samples, sampleRate, options = {}) {
    const p = options.profile || profile(samples, sampleRate);
    const n = p.rms.length;
    // Only a take from the recording page has a Stop click to cut: a phone's
    // recording may end on the word's own last release (أحسنت's t).
    let end = options.raw ? Math.min(endWithoutClick(p), n - Math.round(STOP * 100)) : n;
    end = Math.max(0, end);
    let from = 0;
    let to = Math.min(samples.length, end * p.win);
    let tight = false;
    const found = runs(p, end);
    if (found.length) {
      const a = walkOut(p, found[0][0], -1, 0);
      const b = walkOut(p, found[found.length - 1][1] - 1, 1, end) + 1;
      tight = end - b < 10;
      if (options.trim) {
        from = a * p.win - Math.round(sampleRate * LEAD);
        to = Math.min(to, b * p.win + Math.round(sampleRate * TAIL));
      }
    }
    const pad = Math.max(0, -from);
    from = Math.max(0, from);
    const out = new Float32Array(pad + Math.max(0, to - from));
    out.set(samples.subarray(from, Math.max(from, to)), pad);
    const fadeIn = Math.min(Math.round(sampleRate * FADE_IN), out.length - pad);
    for (let i = 0; i < fadeIn; i++) out[pad + i] *= i / fadeIn;
    const fadeOut = Math.min(Math.round(sampleRate * FADE_OUT), out.length);
    for (let i = 0; i < fadeOut; i++) out[out.length - 1 - i] *= i / fadeOut;
    return { samples: out, lead: pad / sampleRate, end: to / sampleRate, cut: (samples.length - to) / sampleRate, tight };
  }

  return { profile, runs, voiceStart, cut, LEAD, TAIL, STOP };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = takeTrim;
