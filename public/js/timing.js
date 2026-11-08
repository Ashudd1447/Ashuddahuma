/* Automatic word timing, ported from the IQRA app's timing engine.
   The text is split into letter clusters (a base letter with its marks),
   each audible cluster gets a weight in harakat from tajweed duration rules
   (a short vowel 1, a sukoon 1.2, a natural madd 2, muttasil 4, lazim 6,
   shadda +0.8, ghunna +0.9 ...), and the detected speech span of the clip is
   shared out in proportion. Word boundaries are the sums per word; when
   the recording pauses between words, each voiced stretch is shared among
   the words it holds instead, so the pauses never shift the words. IQRA measured the letter-level estimate at about +/-0.45 s;
   words, being sums, come out closer, and timing.html lets the parents tap
   the ones that are off. The same functions give per-letter boundaries for
   the lesson that will light letters.
   Codepoints follow the Quran.com text: sukoon U+0652 (the Mushaf font's
   U+06E1 is accepted too), round zero U+06DF, rectangular zero U+06E0. */
const timing = (() => {
  const MARK_RE = /[ً-ٰٟۖ-ۜ۟-۪ۨ-ࣰۭ-ࣲ]/;
  const HAMZA_MARK_RE = /[ٕٔ]/;
  const TATWEEL = 'ـ';
  const LAM = 'ل';
  const NOON = 'ن';
  const MEEM = 'م';
  const BAA = 'ب';
  const ALIFS = new Set(['ا', 'أ', 'إ', 'آ']);
  const FATHA = 'َ';
  const DAMMA = 'ُ';
  const KASRA = 'ِ';
  const SHADDA = 'ّ';
  const SUKOONS = ['ْ', 'ۡ'];
  const ROUND_ZERO = '۟';
  const RECT_ZERO = '۠';
  const ALIF_WASLA = 'ٱ';
  const DAGGER_ALIF = 'ٰ';
  const MADDAH = 'ٓ';
  const SMALL_WAW = 'ۥ';
  const SMALL_YEH = 'ۦ';
  const SMALL_HIGH_MEEM = 'ۢ';
  const SMALL_LOW_MEEM = 'ۭ';
  const TANWEEN = ['ً', 'ٌ', 'ٍ', 'ࣰ', 'ࣱ', 'ࣲ'];
  const FATHATAN = ['ً', 'ࣰ'];
  const HAMZAS = new Set(['ء', 'أ', 'إ', 'ؤ', 'ئ', 'آ']);
  const MADD_NATURAL = 2;
  const MADD_MUTTASIL = 4;
  const MADD_LAZIM = 6;
  const MADD_AT_WAQF = 4;
  const GHUNNA_WEIGHT = 0.9;
  const TANWEEN_WEIGHT = 0.5;
  const QALQALAH = new Set('قطبجد');
  const QALQALAH_WEIGHT = 0.25;
  const IKHFA = new Set('تثجدذزسشصضطظفقك');
  const IDGHAM_GHUNNA = new Set('ينمو');
  const IZHAR = new Set('ءأإآهعحغخ');
  const WINDOW = 0.01;
  const MIN_GAP = 0.12;
  const PAUSE_UNITS = 2;
  const MIN_RUN = 0.05;
  const MIN_STEP = 0.04;

  /* Clusters */
  function baseChar(text) {
    for (const ch of text) if (!MARK_RE.test(ch) && ch !== TATWEEL) return ch;
    return '';
  }

  function marksOf(text) {
    return [...text].filter((ch) => MARK_RE.test(ch));
  }

  /* Grapheme clusters by Intl.Segmenter, or by hand where it is missing:
     a base character followed by its marks. */
  function graphemes(text) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      return [...new Intl.Segmenter('ar', { granularity: 'grapheme' }).segment(text)].map((seg) => ({ text: seg.segment, index: seg.index }));
    }
    const out = [];
    let at = 0;
    for (const ch of text) {
      const last = out[out.length - 1];
      if (last && MARK_RE.test(ch)) last.text += ch;
      else out.push({ text: ch, index: at });
      at += ch.length;
    }
    return out;
  }

  /* One cluster per letter: tatweel and stray marks join the letter before,
     lam + alif make one ligature cluster, spaces are dropped. Offsets are
     UTF-16 positions in the text. */
  function splitClusters(text) {
    const clusters = [];
    for (const seg of graphemes(text)) {
      const base = baseChar(seg.text);
      const prev = clusters[clusters.length - 1];
      if (prev && (base === TATWEEL || base === '') && !HAMZA_MARK_RE.test(seg.text)) {
        prev.text += seg.text;
        prev.end = seg.index + seg.text.length;
        continue;
      }
      if (prev && ALIFS.has(base) && baseChar(prev.text) === LAM && prev.end === seg.index) {
        prev.ligatureTailBare = marksOf(seg.text).length === 0;
        prev.text += seg.text;
        prev.end = seg.index + seg.text.length;
        prev.ligature = true;
        continue;
      }
      if (seg.text.trim() === '') continue;
      clusters.push({ text: seg.text, start: seg.index, end: seg.index + seg.text.length });
    }
    return clusters;
  }

  const hasVowel = (marks) => marks.some((m) => m === FATHA || m === DAMMA || m === KASRA || TANWEEN.includes(m));
  const hasSukoon = (marks) => marks.some((m) => SUKOONS.includes(m));
  const isSaakin = (marks) => hasSukoon(marks) || !hasVowel(marks);
  const isTanwin = (marks) => TANWEEN.some((t) => marks.includes(t)) || marks.includes(SMALL_HIGH_MEEM) || marks.includes(SMALL_LOW_MEEM);
  const isHamza = (c) => !!c && (HAMZAS.has(baseChar(c.text)) || HAMZA_MARK_RE.test(c.text));

  /* The alif (or yeh) the Mushaf writes after a tanween fath: silent when
     the reading carries on. */
  function isTanwinAlif(clusters, i) {
    const c = clusters[i];
    const prev = clusters[i - 1];
    if (!c || !prev) return false;
    const base = baseChar(c.text);
    if ((base !== 'ا' && base !== 'ى') || marksOf(c.text).length) return false;
    return FATHATAN.some((t) => prev.text.includes(t)) || (prev.text.includes(FATHA) && prev.text.includes(SMALL_HIGH_MEEM));
  }

  /* Letters written but not voiced: a round zero; a rectangular zero or a
     tanween alif when the reading carries on; a hamzat wasl after another
     word; the lam of a sun lam; the article's lam after the preposition li. */
  function derivedSilent(clusters, text) {
    const out = new Set();
    clusters.forEach((cluster, i) => {
      if (cluster.text.includes(ROUND_ZERO)) out.add(i);
      if (cluster.text.includes(RECT_ZERO) && i < clusters.length - 1) out.add(i);
      if (isTanwinAlif(clusters, i) && i < clusters.length - 1) out.add(i);
      const prev = clusters[i - 1];
      const next = clusters[i + 1];
      if (
        prev && next &&
        baseChar(cluster.text) === LAM && marksOf(cluster.text).length === 0 &&
        baseChar(prev.text) === LAM && (prev.start === 0 || text[prev.start - 1] === ' ') &&
        next.text.includes(SHADDA)
      ) out.add(i);
      if (baseChar(cluster.text) !== ALIF_WASLA) return;
      if (i > 0) out.add(i);
      const lam = clusters[i + 1];
      const after = clusters[i + 2];
      if (lam && baseChar(lam.text) === LAM && after && after.text.includes(SHADDA)) out.add(i + 1);
    });
    return [...out].sort((a, b) => a - b);
  }

  function audibleIndices(clusters, silent) {
    const skip = new Set(silent || []);
    return clusters.map((_, i) => i).filter((i) => !skip.has(i));
  }

  /* Weights */
  function isMaddLetter(cluster, prev) {
    const base = baseChar(cluster.text);
    const marks = marksOf(cluster.text);
    if (base === ALIF_WASLA) return false;
    if (hasVowel(marks) || hasSukoon(marks) || marks.includes(SHADDA)) return false;
    const prevMarks = prev ? marksOf(prev.text) : [];
    if (base === 'آ') return true;
    if (base === 'ا' || base === 'ى') return !!prev;
    if (base === 'و') return prevMarks.includes(DAMMA);
    if (base === 'ي') return prevMarks.includes(KASRA);
    return false;
  }

  function maddLength(cluster, next) {
    const marks = marksOf(cluster.text);
    const nextMarks = next ? marksOf(next.text) : [];
    if (next && (nextMarks.includes(SHADDA) || hasSukoon(nextMarks))) return MADD_LAZIM;
    if (isHamza(next)) return MADD_MUTTASIL;
    if (marks.includes(MADDAH)) return next ? MADD_MUTTASIL : MADD_NATURAL;
    return MADD_NATURAL;
  }

  /* Does the hum of a noon sakin, tanween or meem sakin carry into this letter? */
  function ghunnaInto(from, into) {
    const base = baseChar(from.text);
    const marks = marksOf(from.text);
    const intoBase = baseChar(into.text);
    if (!intoBase) return false;
    if ((base === NOON && isSaakin(marks) && !marks.includes(SHADDA)) || isTanwin(marks)) {
      if (IZHAR.has(intoBase)) return false;
      return IKHFA.has(intoBase) || IDGHAM_GHUNNA.has(intoBase) || intoBase === BAA;
    }
    if (base === MEEM && isSaakin(marks) && !marks.includes(SHADDA)) return intoBase === BAA || intoBase === MEEM;
    return false;
  }

  function handedOver(from) {
    const marks = marksOf(from.text);
    if (isTanwin(marks)) return TANWEEN_WEIGHT;
    return hasSukoon(marks) ? 1.2 : 1.0;
  }

  /* A letter's weight in harakat, and how much of it is the hum it opens with. */
  function clusterParts(cluster, prev, next) {
    const base = baseChar(cluster.text);
    const marks = marksOf(cluster.text);
    const prevMarks = prev ? marksOf(prev.text) : [];
    const bare = marks.length === 0;
    let w = 1.0;
    let ghunna = 0;
    let maddCounted = false;

    if (base === ALIF_WASLA || (bare && base === 'ا' && !prev)) {
      w = 0.9;
    } else if (isMaddLetter(cluster, prev)) {
      w = maddLength(cluster, next);
      maddCounted = true;
    } else if (hasSukoon(marks)) {
      const leen = (base === 'و' || base === 'ي') && prevMarks.includes(FATHA);
      w = leen ? 1.3 : 1.2;
    } else if (marks.includes(MADDAH) && !hasVowel(marks)) {
      w = MADD_LAZIM;
    }

    if ((marks.includes(SMALL_WAW) || marks.includes(SMALL_YEH)) && !maddCounted) {
      w += isHamza(next) || (marks.includes(MADDAH) && next) ? MADD_MUTTASIL : MADD_NATURAL;
      maddCounted = true;
    }
    if (marks.includes(SHADDA)) w += 0.8;
    if (marks.includes(DAGGER_ALIF) && !maddCounted) w += maddLength(cluster, next);
    if (isTanwin(marks) && !(hasSukoon(marks) || !hasVowel(marks))) w += TANWEEN_WEIGHT;
    if (marks.includes(SHADDA) && (base === NOON || base === MEEM)) {
      w += GHUNNA_WEIGHT;
      ghunna = GHUNNA_WEIGHT + 0.8;
    } else if (prev && ghunnaInto(prev, cluster)) {
      ghunna = GHUNNA_WEIGHT + handedOver(prev);
      w += ghunna;
    }
    if (next && ghunnaInto(cluster, next)) w -= handedOver(cluster);
    if (QALQALAH.has(base) && hasSukoon(marks)) w += QALQALAH_WEIGHT;
    if (cluster.ligature) {
      const tanwinTail = cluster.ligatureTailBare && isTanwin(marks) && !!next;
      w += tanwinTail ? 0 : cluster.ligatureTailBare ? maddLength(cluster, next) : 1.0;
    }
    return { weight: w, ghunna };
  }

  /* The written neighbours a rule sees, looking past a tanween alif. */
  function readNeighbours(clusters, idx) {
    let p = idx - 1;
    if (isTanwinAlif(clusters, p)) p -= 1;
    let n = idx + 1;
    if (isTanwinAlif(clusters, n) && n < clusters.length - 1) n += 1;
    return { prev: clusters[p], next: clusters[n] };
  }

  /* At a stop the last vowel drops and a madd before it is held longer. */
  function applyWaqf(weights, clusters, held) {
    const n = clusters.length;
    if (!n) return;
    const last = clusters[n - 1];
    const prev = clusters[n - 2];
    const lastMarks = marksOf(last.text);
    if (hasVowel(lastMarks) && !isMaddLetter(last, prev)) {
      weights[n - 1] = 1.2 + (lastMarks.includes(SHADDA) ? 0.8 : 0);
      if (FATHATAN.some((t) => lastMarks.includes(t))) weights[n - 1] += MADD_NATURAL;
    }
    if (!prev) return;
    const before = clusters[n - 3];
    const prevBase = baseChar(prev.text);
    const prevMarks = marksOf(prev.text);
    const beforeMarks = before ? marksOf(before.text) : [];
    const leen = hasSukoon(prevMarks) && (prevBase === 'و' || prevBase === 'ي') && beforeMarks.includes(FATHA);
    const natural = isMaddLetter(prev, before) && maddLength(prev, last) === MADD_NATURAL;
    if (natural || leen) weights[n - 2] = held;
  }

  /* Weights of the audible clusters of a text, in order. */
  function audibleWeights(text, opts = {}) {
    const clusters = splitClusters(text);
    const silent = derivedSilent(clusters, text);
    const audible = audibleIndices(clusters, silent);
    const weights = audible.map((idx) => {
      const { prev, next } = readNeighbours(clusters, idx);
      return clusterParts(clusters[idx], prev, next).weight;
    });
    if (opts.waqf) applyWaqf(weights, audible.map((i) => clusters[i]), opts.waqfMadd || MADD_AT_WAQF);
    return { clusters, silent, audible, weights };
  }

  function spread(start, end, weights) {
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const span = end - start;
    const out = [start];
    let acc = 0;
    for (const w of weights) {
      acc += w;
      out.push(start + (span * acc) / total);
    }
    return out;
  }

  /* Per-letter boundaries (audible clusters + 1) across a speech span. */
  function autoBoundaries(text, start, end, opts = {}) {
    return spread(start, end, audibleWeights(text, opts).weights);
  }

  /* The cluster each word begins at, over the words joined by spaces. */
  function wordStarts(words) {
    const out = [];
    let at = 0;
    for (const word of words) {
      out.push(at);
      at += splitClusters(word).length;
    }
    return out;
  }

  /* One weight per word: the sum of its audible letters'. */
  function wordWeights(words, opts = {}) {
    const { audible, weights } = audibleWeights(words.join(' '), opts);
    const starts = wordStarts(words);
    const per = words.map(() => 0);
    audible.forEach((idx, n) => {
      let w = 0;
      while (w + 1 < starts.length && idx >= starts[w + 1]) w += 1;
      per[w] += weights[n];
    });
    return per.map((w) => (w > 0 ? w : 0.5));
  }

  /* Audio */

  /* Loudness of a decoded clip in 10 ms steps. */
  function envelope(buffer) {
    const data = buffer.getChannelData(0);
    const win = Math.max(1, Math.round(buffer.sampleRate * WINDOW));
    const n = Math.floor(data.length / win);
    const rms = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = i * win; j < (i + 1) * win; j++) sum += data[j] * data[j];
      rms[i] = Math.sqrt(sum / win);
    }
    return { rms, step: win / buffer.sampleRate, duration: buffer.duration };
  }

  function threshold(env) {
    let peak = 0;
    for (const r of env.rms) if (r > peak) peak = r;
    return Math.max(0.008, peak * 0.06);
  }

  /* Where the voice starts and ends, with a little lead and tail. */
  function speechBounds(env) {
    const limit = threshold(env);
    const n = env.rms.length;
    let first = 0;
    while (first < n && env.rms[first] < limit) first += 1;
    let last = n - 1;
    while (last > first && env.rms[last] < limit) last -= 1;
    return {
      start: Math.max(0, first * env.step - 0.03),
      end: Math.min(env.duration, (last + 1) * env.step + 0.05),
    };
  }

  /* The level below which the clip is quiet rather than voiced, as IQRA's
     alignment script sets it: well above the room's noise floor (the 15th
     percentile) yet low enough that a whispered consonant such as a sukoon
     ح still counts as voice, which the 6% speech threshold does not. */
  function quietLevel(env) {
    let peak = 0;
    for (const r of env.rms) if (r > peak) peak = r;
    const sorted = Float32Array.from(env.rms).sort();
    const floor = sorted[Math.floor(sorted.length * 0.15)] || 0;
    return Math.max(floor * 3.5, peak * 0.03, 0.0008);
  }

  /* Voiced stretches of the clip inside the speech span: loud windows, with
     quiet breaks shorter than minGap bridged (the closure of a stop
     consonant, a whispered letter) and slivers shorter than MIN_RUN dropped.
     A break of minGap or more is a pause between words. */
  function runs(env, start, end, minGap = MIN_GAP) {
    const limit = quietLevel(env);
    const a = Math.max(0, Math.floor(start / env.step));
    const b = Math.min(env.rms.length, Math.ceil(end / env.step));
    const out = [];
    let from = -1;
    for (let i = a; i <= b; i++) {
      const loud = i < b && env.rms[i] >= limit;
      if (loud && from < 0) from = i;
      if (!loud && from >= 0) {
        const last = out[out.length - 1];
        const s = from * env.step;
        const e = i * env.step;
        if (last && s - last.end < minGap) last.end = e;
        else out.push({ start: s, end: e });
        from = -1;
      }
    }
    return out.filter((run) => run.end - run.start >= MIN_RUN);
  }

  /* Pauses between words, judged against the recording's own pace: a quiet
     break counts only when it lasts PAUSE_UNITS harakat at this reciter's
     speed, longer than any one quiet letter inside a word. */
  function pauses(env, start, end, totalWeight) {
    const voiced = runs(env, start, end).reduce((a, run) => a + run.end - run.start, 0);
    const unit = voiced / (totalWeight || 1);
    return runs(env, start, end, Math.max(MIN_GAP, PAUSE_UNITS * unit));
  }

  /* Which words sound in which stretch: words in order, stretches in order,
     each stretch holding a run of words (or none, for a breath or a click),
     chosen so that each stretch's length best matches its words' weights.
     Returns [from, to) word ranges, one per stretch. */
  function assign(weights, stretches) {
    const W = weights.length;
    const R = stretches.length;
    const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
    const voiced = stretches.reduce((a, run) => a + run.end - run.start, 0);
    const perUnit = voiced / totalWeight;
    const prefix = [0];
    for (const w of weights) prefix.push(prefix[prefix.length - 1] + w);
    const cost = (r, from, to) => {
      const expected = (prefix[to] - prefix[from]) * perUnit;
      return (stretches[r].end - stretches[r].start - expected) ** 2;
    };
    const best = Array.from({ length: R + 1 }, () => new Array(W + 1).fill(Infinity));
    const choice = Array.from({ length: R + 1 }, () => new Array(W + 1).fill(0));
    best[0][0] = 0;
    for (let r = 1; r <= R; r++) {
      for (let w = 0; w <= W; w++) {
        for (let k = 0; k <= w; k++) {
          const c = best[r - 1][k] + cost(r - 1, k, w);
          if (c < best[r][w]) {
            best[r][w] = c;
            choice[r][w] = k;
          }
        }
      }
    }
    const groups = new Array(R);
    let w = W;
    for (let r = R; r >= 1; r--) {
      const k = choice[r][w];
      groups[r - 1] = [k, w];
      w = k;
    }
    return groups;
  }

  /* Word boundaries (words + 1) for a recording of these words: the speech
     span shared by weight, or, when the recording pauses between words, each
     voiced stretch shared among the words it holds, so a word before a pause
     stays lit until the next one sounds. */
  function autoWords(words, env, opts = {}) {
    const { start, end } = speechBounds(env);
    const weights = wordWeights(words, opts);
    const out = spread(start, end, weights);
    const stretches = pauses(env, start, end, weights.reduce((a, b) => a + b, 0));
    if (stretches.length > 1) {
      assign(weights, stretches).forEach(([from, to], r) => {
        if (to <= from) return;
        const run = stretches[r];
        const part = spread(Math.max(start, run.start - 0.03), run.end, weights.slice(from, to));
        for (let i = from; i < to; i++) out[i] = part[i - from];
      });
      out[0] = start;
      out[words.length] = end;
    }
    for (let i = 1; i < out.length; i++) {
      if (out[i] <= out[i - 1] + MIN_STEP) out[i] = out[i - 1] + MIN_STEP;
    }
    return out.map((t) => Math.round(t * 1000) / 1000);
  }

  return { splitClusters, derivedSilent, audibleIndices, audibleWeights, autoBoundaries, wordWeights, envelope, speechBounds, runs, pauses, autoWords };
})();

if (typeof module !== 'undefined') module.exports = timing;
