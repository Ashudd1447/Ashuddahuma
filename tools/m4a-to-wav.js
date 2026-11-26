/* Cuts the parents' phone recordings (public/audio/<name>.m4a) the way the
   recording page cuts a take (public/js/trim.js) and writes them as WAV, so
   every recording on the site has the same room before and after the voice.
   Made on 2026-11-26: the old أحسنت had 1.1 s of silence before the word, and
   the clock, which says the next hour soon after the praise, cut its end off.

     node tools/m4a-to-wav.js well-done lion rabbit ...

   A headless Chrome decodes each file (tools/browser.js; nothing to install),
   at 22,050 Hz mono, as record.js writes. Each original is first copied, once,
   to ../audio-raw/ (beside the repo), and every run starts from that copy.
   The new <name>.wav is written to public/audio and <name>.m4a is removed
   from there: the site looks for .m4a first, so the two cannot stand side by
   side. Update FILES in public/sw.js to the .wav names. The local site must
   be running (firebase serve --only hosting --port 5000). */
const fs = require('fs');
const path = require('path');
const { open } = require('./browser.js');
const takeTrim = require('../public/js/trim.js');

const RATE = 22050;
const AUDIO = path.join(__dirname, '..', 'public', 'audio');
const RAW = path.join(__dirname, '..', '..', 'audio-raw');

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

(async () => {
  const names = process.argv.slice(2).map((n) => n.replace(/\.m4a$/, ''));
  if (!names.length) {
    console.log('Usage: node tools/m4a-to-wav.js <name> [<name> ...]');
    process.exit(1);
  }
  fs.mkdirSync(RAW, { recursive: true });
  const page = await open('http://localhost:5000/404.html');
  let failed = 0;
  for (const name of names) {
    const live = path.join(AUDIO, `${name}.m4a`);
    const kept = path.join(RAW, `${name}.m4a`);
    try {
      if (!fs.existsSync(kept)) fs.copyFileSync(live, kept);
      const data = `data:audio/mp4;base64,${fs.readFileSync(kept).toString('base64')}`;
      await page.eval(`window.__src = ${JSON.stringify(data)}`);
      const pcm = await page.eval(`(async () => {
        const bytes = await (await fetch(window.__src)).arrayBuffer();
        const decoded = await new OfflineAudioContext(1, 1, ${RATE}).decodeAudioData(bytes);
        const n = decoded.length;
        const mono = new Float32Array(n);
        for (let c = 0; c < decoded.numberOfChannels; c++) {
          const d = decoded.getChannelData(c);
          for (let i = 0; i < n; i++) mono[i] += d[i] / decoded.numberOfChannels;
        }
        const out = new Int16Array(n);
        for (let i = 0; i < n; i++) out[i] = Math.max(-32768, Math.min(32767, Math.round(mono[i] * 32767)));
        let s = '';
        const u = new Uint8Array(out.buffer);
        for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
        return btoa(s);
      })()`);
      const raw = Buffer.from(pcm, 'base64');
      const samples = new Float32Array(raw.length / 2);
      for (let i = 0; i < samples.length; i++) samples[i] = raw.readInt16LE(i * 2) / 32768;
      if (process.env.DUMP) writeWav(path.join(process.env.DUMP, `${name}.wav`), samples, RATE); // the whole decoded clip, to compare
      const p = takeTrim.profile(samples, RATE);
      const out = takeTrim.cut(samples, RATE, { trim: true, raw: false, profile: p });
      writeWav(path.join(AUDIO, `${name}.wav`), out.samples, RATE);
      if (fs.existsSync(live)) fs.unlinkSync(live);
      console.log(`${name.padEnd(12)} ${(samples.length / RATE).toFixed(2)} s -> ${(out.samples.length / RATE).toFixed(2)} s  voice began at ${takeTrim.voiceStart(p).toFixed(2)} s`);
    } catch (error) {
      failed++;
      console.log(`${name}: ${error.message}`);
    }
  }
  await page.close();
  process.exit(failed ? 1 : 0);
})();
