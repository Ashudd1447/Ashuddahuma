/* The parents' recording tool. Ported from the IQRA app's intake page: the
   microphone is captured raw (no echo cancellation, noise suppression or
   automatic gain, which cannot be undone later), through an AudioWorklet, and
   written as 16-bit mono WAV. Takes stay in memory until written or
   downloaded, so finish a sitting before closing the page. */
const $ = (id) => document.getElementById(id);

/* Every clip the site plays, by file name. Quran text comes from the surah
   file; the rest is the parents' own wording. */
const STATIC_SLOTS = [
  { file: 'read-it', text: 'الآن اقرأها أنت', note: 'After an ayah: now you read it (Fusha)' },
  { file: 'read-it-home', text: 'دلوقتي اقراها أنت', note: 'After an ayah: now you read it (home talk)' },
  { file: 'lion', text: 'أَسَد', note: 'Reading game (an .m4a exists)' },
  { file: 'rabbit', text: 'أَرْنَب', note: 'Reading game (an .m4a exists)' },
  { file: 'door', text: 'بَاب', note: 'Reading game (an .m4a exists)' },
  { file: 'house', text: 'بَيْت', note: 'Reading game (an .m4a exists)' },
  { file: 'mosque', text: 'مَسْجِد', note: 'Reading game (an .m4a exists)' },
  { file: 'kaaba', text: 'كَعْبَة', note: 'Reading game (an .m4a exists)' },
  { file: 'read', text: 'اقرأ', note: 'Reading game prompt (an .m4a exists)' },
  { file: 'match', text: 'اسحب كل صورة إلى كلمتها', note: 'Matching prompt (an .m4a exists)' },
  { file: 'well-done', text: 'أحسنت', note: 'Praise, said with a sukoon on the ت (an .m4a exists)' },
];

const WORKLET_SOURCE = `
class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(4096);
    this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i];
      if (this.n === this.buf.length) {
        this.port.postMessage(this.buf.slice(0));
        this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor('capture', Capture);
`;
// The processor also answers a 'flush' message with what its buffer holds, so
// the last few milliseconds of a take are not lost at stop.
const FLUSHING_WORKLET = WORKLET_SOURCE.replace(
  '    this.n = 0;\n  }\n  process',
  "    this.n = 0;\n    this.port.onmessage = () => { this.port.postMessage(this.buf.slice(0, this.n)); this.n = 0; };\n  }\n  process",
);

let slots = [];
let selected = null;
let recorder = null;
let recordingSlot = null;
let starting = false;
let workletUrl = null;
const takes = new Map();
const kept = new Map();

/* Capture */
async function startRecording(deviceId) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    },
  });
  const ctx = new AudioContext();
  if (!workletUrl) workletUrl = URL.createObjectURL(new Blob([FLUSHING_WORKLET], { type: 'text/javascript' }));
  await ctx.audioWorklet.addModule(workletUrl);
  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'capture');
  const mute = ctx.createGain();
  mute.gain.value = 0;
  const chunks = [];
  let peak = 0;
  node.port.onmessage = (event) => {
    const chunk = event.data;
    chunks.push(chunk);
    let p = 0;
    for (let i = 0; i < chunk.length; i++) p = Math.max(p, Math.abs(chunk[i]));
    peak = p;
  };
  source.connect(node).connect(mute).connect(ctx.destination);
  const release = () => {
    node.port.onmessage = null;
    for (const track of stream.getTracks()) track.stop();
    ctx.close();
  };
  return {
    level: () => peak,
    stop: async () => {
      const sampleRate = ctx.sampleRate;
      const device = (stream.getAudioTracks()[0] || {}).label || '';
      // Ask for the partial buffer, waiting a moment at most.
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 200);
        const previous = node.port.onmessage;
        node.port.onmessage = (event) => { previous(event); clearTimeout(timer); resolve(); };
        node.port.postMessage('flush');
      });
      release();
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const samples = new Float32Array(total);
      let at = 0;
      for (const c of chunks) { samples.set(c, at); at += c.length; }
      return { samples, sampleRate, device };
    },
    cancel: release,
  };
}

/* Measurement, as IQRA's takeCheck: 10 ms RMS windows, an adaptive threshold,
   peak, clipping, noise floor and signal-to-noise. */
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
  return { rms, win, peakRms, peakSample, noiseFloor, clipped: hot > 3, threshold: Math.max(noiseFloor * 3.5, peakRms * 0.06, 0.0008) };
}

/* Runs of sound above the threshold, in windows; blips under 80 ms dropped. */
function runs(p) {
  const out = [];
  let start = -1;
  for (let w = 0; w <= p.rms.length; w++) {
    const loud = w < p.rms.length && p.rms[w] >= p.threshold;
    if (loud && start < 0) start = w;
    if (!loud && start >= 0) {
      if ((w - start) * 0.01 >= 0.08) out.push([start, w]);
      start = -1;
    }
  }
  return out;
}

/* Cut to the spoken part with 120 ms of room on each side. A record click in
   the first 0.3 s, well apart from the voice, is dropped. */
function trim(samples, sampleRate, p) {
  let found = runs(p);
  if (found.length > 1 && found[0][1] * 0.01 <= 0.3 && (found[1][0] - found[0][1]) * 0.01 > 0.25) found = found.slice(1);
  if (!found.length) return samples;
  const pad = Math.round(sampleRate * 0.12);
  const from = Math.max(0, found[0][0] * p.win - pad);
  const to = Math.min(samples.length, found[found.length - 1][1] * p.win + pad);
  return samples.slice(from, to);
}

async function resample(samples, from, to) {
  if (from === to) return samples;
  const ctx = new OfflineAudioContext(1, Math.ceil((samples.length * to) / from), to);
  const buffer = ctx.createBuffer(1, samples.length, from);
  buffer.copyToChannel(samples, 0);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  const rendered = await ctx.startRendering();
  return rendered.getChannelData(0);
}

function encodeWav(samples, sampleRate) {
  const bytes = samples.length * 2;
  const out = new ArrayBuffer(44 + bytes);
  const view = new DataView(out);
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
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, bytes, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }
  return new Blob([out], { type: 'audio/wav' });
}

const dbfs = (peak) => 20 * Math.log10(peak || 1e-9);

function verdict(p, duration) {
  const notes = [];
  let level = 'good';
  if (p.clipped) { notes.push('too loud, clipped'); level = 'bad'; }
  else if (p.peakSample < 0.012) { notes.push('very quiet'); level = 'warn'; }
  const snr = 20 * Math.log10((p.peakRms || 1e-9) / (p.noiseFloor || 1e-9));
  if (snr < 30) { notes.push(`only ${snr.toFixed(0)} dB above the room`); if (level === 'good') level = 'warn'; }
  if (duration < 0.3) { notes.push('nothing recorded'); level = 'bad'; }
  return { level, notes, snr };
}

/* Takes */
async function stopRecording(slot) {
  const handle = recorder;
  recorder = null;
  recordingSlot = null;
  const { samples, sampleRate, device } = await handle.stop();
  $('meter').firstElementChild.style.width = '0';
  if (samples.length < sampleRate * 0.1) {
    setStatus('Nothing recorded. Press Record, wait a beat, say it, then Stop.');
    return;
  }
  const p = profile(samples, sampleRate);
  const cut = $('trim').checked ? trim(samples, sampleRate, p) : samples;
  const target = Number($('rate').value);
  const final = await resample(cut, sampleRate, target);
  const duration = final.length / target;
  const list = takes.get(slot.file) || [];
  const take = {
    no: list.length + 1,
    blob: encodeWav(final, target),
    duration,
    peak: dbfs(p.peakSample),
    device,
    check: verdict(p, duration),
  };
  list.push(take);
  takes.set(slot.file, list);
  kept.set(slot.file, take.no);
  render();
  setStatus(`Take ${take.no} of ${slot.file}: ${duration.toFixed(2)} s, peak ${take.peak.toFixed(1)} dBFS${take.check.notes.length ? ', ' + take.check.notes.join(', ') : ''}.`);
}

async function toggleRecording(slot) {
  if (starting) return;
  if (recorder) {
    // Whatever card was clicked, the take belongs to the card being recorded.
    const recording = recordingSlot;
    const button = document.querySelector(`[data-rec="${recording.file}"]`);
    if (button) { button.textContent = 'Record'; button.classList.remove('rec'); }
    await stopRecording(recording);
    return;
  }
  select(slot);
  starting = true;
  try {
    recorder = await startRecording($('mic').value);
    recordingSlot = slot;
  } catch (error) {
    setStatus(`Microphone not available: ${error.message}`);
    return;
  } finally {
    starting = false;
  }
  const button = document.querySelector(`[data-rec="${slot.file}"]`);
  button.textContent = 'Stop';
  button.classList.add('rec');
  const meter = $('meter').firstElementChild;
  const loop = () => {
    if (!recorder) return;
    const db = dbfs(recorder.level());
    meter.style.width = `${Math.max(0, Math.min(100, ((db + 60) / 60) * 100))}%`;
    requestAnimationFrame(loop);
  };
  loop();
  setStatus(`Recording ${slot.file}. Wait a beat, say it, then Stop.`);
}

let player = null;
function playTake(take) {
  if (!player) player = new Audio();
  player.pause();
  player.src = URL.createObjectURL(take.blob);
  player.play().catch(() => {});
}

function downloadTake(slot, take) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(take.blob);
  link.download = `${slot.file}.wav`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 30000);
}

/* Writing into public/audio with the File System Access API (Chrome, Edge). */
async function writeAll() {
  if (typeof window.showDirectoryPicker !== 'function') {
    setStatus('This browser cannot write into a folder. Use Chrome or Edge on a computer, or download each take.');
    return;
  }
  let dir;
  try {
    dir = await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch {
    return;
  }
  const written = [];
  for (const slot of slots) {
    const take = (takes.get(slot.file) || []).find((t) => t.no === kept.get(slot.file));
    if (!take) continue;
    const handle = await dir.getFileHandle(`${slot.file}.wav`, { create: true });
    const stream = await handle.createWritable();
    await stream.write(take.blob);
    await stream.close();
    written.push(`${slot.file}.wav`);
  }
  $('written').textContent = written.length ? `Written: ${written.join(', ')}` : 'Nothing to write yet.';
  setStatus(written.length ? `Wrote ${written.length} file(s) into ${dir.name}.` : 'No kept takes to write.');
}

/* Page */
function select(slot) {
  selected = slot;
  for (const card of document.querySelectorAll('.slot')) card.classList.toggle('selected', card.dataset.file === slot.file);
}

function setStatus(text) {
  $('status').textContent = text;
}

function render() {
  const root = $('slots');
  root.innerHTML = '';
  let group = '';
  for (const slot of slots) {
    if (slot.group !== group) {
      group = slot.group;
      const h = document.createElement('h2');
      h.textContent = group;
      root.append(h);
    }
    const card = document.createElement('section');
    card.className = `slot${selected && selected.file === slot.file ? ' selected' : ''}`;
    card.dataset.file = slot.file;
    const list = takes.get(slot.file) || [];
    card.innerHTML = `
      <p class="text${slot.quran ? ' quran' : ''}" lang="ar">${slot.quran ? mushafText(slot.text) : slot.text}</p>
      <p class="note">${slot.note} · audio/${slot.file}.wav</p>
      <div class="row"><button type="button" data-rec="${slot.file}">Record</button></div>
      <ul class="takes">${list.map((take) => `
        <li data-take="${take.no}">
          <span class="${take.no === kept.get(slot.file) ? 'kept' : ''}">Take ${take.no}${take.no === kept.get(slot.file) ? ' (kept)' : ''}</span>
          <span>${take.duration.toFixed(2)} s · peak ${take.peak.toFixed(1)} dBFS</span>
          <span class="${take.check.level}">${take.check.notes.join(', ')}</span>
          <button type="button" class="quiet" data-play="${take.no}">Play</button>
          <button type="button" class="quiet" data-keep="${take.no}">Keep this</button>
          <button type="button" class="quiet" data-download="${take.no}">Download</button>
        </li>`).join('')}</ul>`;
    card.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      select(slot);
      if (!button) return;
      const take = (n) => list.find((t) => t.no === Number(n));
      if (button.dataset.rec) toggleRecording(slot);
      else if (button.dataset.play) playTake(take(button.dataset.play));
      else if (button.dataset.keep) { kept.set(slot.file, Number(button.dataset.keep)); render(); }
      else if (button.dataset.download) downloadTake(slot, take(button.dataset.download));
    });
    root.append(card);
  }
}

async function listMicrophones() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter((d) => d.kind === 'audioinput' && d.label);
    for (const mic of mics) {
      const option = document.createElement('option');
      option.value = mic.deviceId;
      option.textContent = mic.label;
      $('mic').append(option);
    }
  } catch {
    // Names show after the first recording grants permission.
  }
}

async function init() {
  const surah = await fetch('quran/fatihah.json').then((response) => response.json());
  slots = [
    ...surah.ayat.map((ayah) => ({ file: `fatihah-${ayah.number}`, text: ayah.text, note: `Al-Fatihah, ayah ${ayah.number}`, quran: true, group: 'Al-Fatihah' })),
    ...STATIC_SLOTS.map((slot) => ({ ...slot, group: slot.file.startsWith('read-it') ? 'Reciter prompts' : 'Reading game' })),
  ];
  render();
  listMicrophones();
  $('write').addEventListener('click', writeAll);
  addEventListener('keydown', (event) => {
    if (event.code === 'KeyR' && !event.repeat && selected && !/input|select|textarea/i.test(event.target.tagName)) {
      event.preventDefault();
      toggleRecording(selected);
    }
  });
}

init();
