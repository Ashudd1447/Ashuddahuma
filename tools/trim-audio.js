/* Cuts recordings already in public/audio the way the recording tool now
   cuts a new take (public/js/trim.js): the Stop click at the end goes, 0.2 s
   of room is kept before the voice and 0.3 s after it, with a short fade at
   each end. Made on 2026-11-26 for the father's first big sitting, recorded
   partly with the old trim (cut too close at the start) and partly without
   it (the click heard at the end).

     node tools/trim-audio.js name.wav [name.wav ...]
     node tools/trim-audio.js --check name.wav ...   (report only, write nothing)

   Each original is first copied, once, to ../audio-raw/ (one level above this
   repo, as the Recraft and adhan raw files are), and every run starts from
   that copy, so running it again gives the same result and nothing is lost.
   A take straight off the microphone begins with 10 to 40 ms of exact zeros
   (the recorder starting); one cut by the old trim begins in the room's
   noise. That one is given room in front, and its end is only cut at a click
   standing alone, as it has no Stop click. 16-bit PCM mono WAV only, as record.js writes. Nothing to install. */
const fs = require('fs');
const path = require('path');
const takeTrim = require('../public/js/trim.js');

const AUDIO = path.join(__dirname, '..', 'public', 'audio');
const RAW = path.join(__dirname, '..', '..', 'audio-raw');

function readWav(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAV file');
  let at = 12;
  let fmt = null;
  while (at + 8 <= buf.length) {
    const id = buf.toString('ascii', at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    const body = at + 8;
    if (id === 'fmt ') {
      fmt = { format: buf.readUInt16LE(body), channels: buf.readUInt16LE(body + 2), rate: buf.readUInt32LE(body + 4), bits: buf.readUInt16LE(body + 14) };
    } else if (id === 'data') {
      if (!fmt || fmt.format !== 1 || fmt.channels !== 1 || fmt.bits !== 16) throw new Error('not 16-bit PCM mono');
      const n = Math.floor(Math.min(size, buf.length - body) / 2);
      const samples = new Float32Array(n);
      for (let i = 0; i < n; i++) samples[i] = buf.readInt16LE(body + i * 2) / 32768;
      return { samples, rate: fmt.rate };
    }
    at = body + size + (size % 2);
  }
  throw new Error('no data chunk');
}

function writeWav(file, samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v < 0 ? v * 32768 : v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(file, buf);
}

const args = process.argv.slice(2);
const check = args.includes('--check');
const names = args.filter((a) => a !== '--check').map((a) => path.basename(a));
if (!names.length) {
  console.log('Usage: node tools/trim-audio.js [--check] name.wav ...');
  process.exit(1);
}
if (!check) fs.mkdirSync(RAW, { recursive: true });
let failed = 0;
for (const name of names) {
  const live = path.join(AUDIO, name);
  const kept = path.join(RAW, name);
  try {
    if (!check && !fs.existsSync(kept)) fs.copyFileSync(live, kept);
    const source = fs.existsSync(kept) ? kept : live;
    const { samples, rate } = readWav(source);
    const p = takeTrim.profile(samples, rate);
    const lead = takeTrim.voiceStart(p);
    let zeros = 0;
    while (zeros < samples.length && samples[zeros] === 0) zeros++;
    const raw = zeros >= rate * 0.005;
    const out = takeTrim.cut(samples, rate, { trim: true, raw, profile: p });
    const was = samples.length / rate;
    const now = out.samples.length / rate;
    const note = raw ? '' : '  (cut before: room added in front)';
    console.log(`${name.padEnd(38)} ${was.toFixed(2)} s -> ${now.toFixed(2)} s  voice began at ${lead.toFixed(2)} s, end cut ${out.cut.toFixed(2)} s${out.lead ? `, ${out.lead.toFixed(2)} s added` : ''}${out.click ? `, Record click silenced to ${out.click.toFixed(2)} s` : ''}${note}`);
    if (!check) writeWav(live, out.samples, rate);
  } catch (error) {
    failed++;
    console.log(`${name}: ${error.message}`);
  }
}
if (failed) process.exit(1);
