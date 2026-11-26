/* Measuring and cutting a take, shared by the recording tool (record.js, for
   each new take) and tools/trim-audio.js (for recordings already written to
   public/audio). In node it is module.exports.

   The father, 2026-11-26: with the trim on, the start was cut too close; with
   it off, the click of the Stop button was heard at the end. So:
   - The voice's edges are found twice: its loud part (as IQRA's takeCheck),
     then walked out over the soft edges (a breathy start, a plosive's quiet
     build-up, the fall of a held letter) while the sound stays clearly above
     the room, gaps under 30 ms bridged. LEAD seconds of room are kept before
     the first sound and TAIL after the last; a take whose voice starts sooner
     than LEAD is given silence in front.
   - The Stop click (mouse or key) is never kept, trimmed or not: a short burst
     alone at the very end, after a quiet gap, is cut with what follows it,
     and from a take straight off the microphone (raw) the last STOP seconds
     go in any case, since the click can follow a breath with no gap.
   - From a raw take, the sound of the Record key or button being let go, as
     the microphone opens, is silenced too, when it stands apart from the
     voice.
   - A short fade at each end, so a cut never pops. */
const takeTrim = (() => {
  const LEAD = 0.2;
  const TAIL = 0.3;
  const STOP = 0.15;
  const FADE_IN = 0.01;
  const FADE_OUT = 0.03;
  const BRIDGE = 3; // windows of 10 ms

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

  /* The runs that are voice: a record click in the first 0.3 s, well apart
     from the voice, is dropped. */
  function voice(p, end = p.rms.length) {
    const found = runs(p, end);
    if (found.length > 1 && found[0][1] * 0.01 <= 0.3 && (found[1][0] - found[0][1]) * 0.01 > 0.25) return found.slice(1);
    return found;
  }

  /* Seconds before the voice's loud part begins. The old trim kept 0.12 s
     there, so a recording with less than 0.2 s was cut by it. */
  function voiceStart(p) {
    const found = voice(p);
    return found.length ? found[0][0] * 0.01 : 0;
  }

  /* Where the take ends without its Stop click, in windows: a burst of sound
     in the last 0.3 s with at least 50 ms of quiet before it, which began in
     the last 0.4 s, is the click (a voice runs longer, or has no such gap). */
  function endWithoutClick(p) {
    const n = p.rms.length;
    let last = n - 1;
    while (last >= 0 && last >= n - 30 && p.rms[last] < p.soft) last--;
    if (last < 0 || last < n - 30) return n;
    let first = last;
    let quiet = 0;
    for (let w = last - 1; w >= 0 && w >= n - 40; w--) {
      if (p.rms[w] >= p.soft) {
        first = w;
        quiet = 0;
      } else if (++quiet >= 5) {
        return Math.max(0, first - 2);
      }
    }
    return n;
  }

  /* The sound of the Record key or button being let go, caught as the
     microphone opens: in a raw take, a burst that begins within 0.15 s of
     the recorder's first sound (it starts with exact zeros), lasts at most
     0.25 s and is followed by 50 ms of quiet before the voice. Returns the
     window where it ends (0 when there is none), never closer than 0.1 s to
     the voice's loud part, so a soft start is never touched. */
  function startClick(p, loud) {
    let w = 0;
    while (w < loud && p.rms[w] === 0) w++;
    const first = w;
    const edge = p.soft * 2;
    while (w < loud && w < first + 15 && p.rms[w] < edge) w++;
    if (w >= loud || w >= first + 15) return 0;
    let last = w;
    let quiet = 0;
    for (let v = w + 1; v < loud && v <= w + 25 + 5; v++) {
      if (p.rms[v] >= edge) {
        if (v - w > 25) return 0;
        last = v;
        quiet = 0;
      } else if (++quiet >= 5) {
        return Math.max(0, Math.min(last + 1, loud - 10));
      }
    }
    return 0;
  }

  /* The take cut as described at the top. options: trim (cut the silence at
     both ends), raw (straight off the microphone: drop the last STOP seconds
     and silence the Record click), profile (already measured). Returns
     { samples, lead, end, cut }: the seconds of silence added in front,
     where the take now ends and how much was cut from its end, for a report. */
  function cut(samples, sampleRate, options = {}) {
    const p = options.profile || profile(samples, sampleRate);
    const n = p.rms.length;
    let end = endWithoutClick(p);
    if (options.raw) end = Math.min(end, n - Math.round(STOP * 100));
    end = Math.max(0, end);
    let from = 0;
    let to = Math.min(samples.length, end * p.win);
    const found = voice(p, end);
    const mute = options.raw ? startClick(p, found.length ? found[0][0] : end) : 0;
    if (options.trim && found.length) {
      let a = found[0][0];
      for (let w = a - 1, quiet = 0; w >= mute; w--) {
        if (p.rms[w] >= p.soft) {
          a = w;
          quiet = 0;
        } else if (++quiet > BRIDGE) break;
      }
      let b = found[found.length - 1][1];
      for (let w = b, quiet = 0; w < end; w++) {
        if (p.rms[w] >= p.soft) {
          b = w + 1;
          quiet = 0;
        } else if (++quiet > BRIDGE) break;
      }
      from = a * p.win - Math.round(sampleRate * LEAD);
      to = Math.min(to, b * p.win + Math.round(sampleRate * TAIL));
    }
    const pad = Math.max(0, -from);
    from = Math.max(0, from);
    const out = new Float32Array(pad + Math.max(0, to - from));
    out.set(samples.subarray(from, Math.max(from, to)), pad);
    // Silence before the voice is silence: the Record click, if any, goes.
    const quietTo = Math.min(out.length, pad + Math.max(0, mute * p.win - from));
    out.fill(0, pad, quietTo);
    const fadeIn = Math.min(Math.round(sampleRate * FADE_IN), out.length - quietTo);
    for (let i = 0; i < fadeIn; i++) out[quietTo + i] *= i / fadeIn;
    const fadeOut = Math.min(Math.round(sampleRate * FADE_OUT), out.length);
    for (let i = 0; i < fadeOut; i++) out[out.length - 1 - i] *= i / fadeOut;
    return { samples: out, lead: pad / sampleRate, end: to / sampleRate, cut: (samples.length - to) / sampleRate, click: mute * p.win / sampleRate };
  }

  return { profile, runs, voiceStart, cut, LEAD, TAIL, STOP };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = takeTrim;
