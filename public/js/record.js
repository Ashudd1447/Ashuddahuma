/* The parents' recording tool. Ported from the IQRA app's intake page: the
   microphone is captured raw (no echo cancellation, noise suppression or
   automatic gain, which cannot be undone later), through an AudioWorklet, and
   written as 16-bit mono WAV. From IQRA's intake too: the meter with the
   loudest point held, a take player that pauses and stops, the keys R,
   Space, N and P, the level advice, the warning when the microphone changes,
   and the takes kept on the computer (IndexedDB) with the folder remembered.
   The room check is this site's own: three seconds of silence, measured and
   not saved (IQRA records its room tone as a file for later analysis, which
   this site has no use for). */
const $ = (id) => document.getElementById(id);

/* Every clip the site plays, by file name. Quran text comes from the surah
   file; the rest is the parents' own wording. A prompt the child hears in
   either dialect has two cards: <name> is Fusha and <name>-masri is
   Egyptian, which is spoken only and never shown to the child, so its text
   here is just for reading aloud. */
const COUNT_FUSHA = ['وَاحِد', 'اِثْنَان', 'ثَلَاثَة', 'أَرْبَعَة', 'خَمْسَة', 'سِتَّة', 'سَبْعَة'];
const COUNT_MASRI = ['واحد', 'اتنين', 'تلاتة', 'أربعة', 'خمسة', 'ستة', 'سبعة'];
const HOURS_FUSHA = [
  'السَّاعَةُ الْوَاحِدَةُ', 'السَّاعَةُ الثَّانِيَةُ', 'السَّاعَةُ الثَّالِثَةُ', 'السَّاعَةُ الرَّابِعَةُ',
  'السَّاعَةُ الْخَامِسَةُ', 'السَّاعَةُ السَّادِسَةُ', 'السَّاعَةُ السَّابِعَةُ', 'السَّاعَةُ الثَّامِنَةُ',
  'السَّاعَةُ التَّاسِعَةُ', 'السَّاعَةُ الْعَاشِرَةُ', 'السَّاعَةُ الْحَادِيَةَ عَشْرَةَ', 'السَّاعَةُ الثَّانِيَةَ عَشْرَةَ',
];
const HOURS_MASRI = [
  'الساعة واحدة', 'الساعة اتنين', 'الساعة تلاتة', 'الساعة أربعة', 'الساعة خمسة', 'الساعة ستة',
  'الساعة سبعة', 'الساعة تمانية', 'الساعة تسعة', 'الساعة عشرة', 'الساعة حداشر', 'الساعة اتناشر',
];
const STATIC_SLOTS = [
  { group: 'Reciter prompts', file: 'read-it', text: 'الْآنَ اقْرَأْهَا أَنْتَ', note: 'After an ayah: now you read it (Fusha)' },
  { group: 'Reciter prompts', file: 'read-it-masri', text: 'دلوقتي اقراها أنت', note: 'After an ayah: now you read it (Egyptian, spoken only)' },
  { group: 'Dialect switch', file: 'fusha', text: 'فُصْحَى', note: 'Said when the switch in the menu is set to Fusha' },
  { group: 'Dialect switch', file: 'masri', text: 'مِصْرِي', note: 'Said when the switch in the menu is set to Egyptian' },
  { group: 'Movement activity', file: 'jump', text: 'اقْفِزْ سَبْعَ مَرَّاتٍ!', note: 'Jump seven times (Fusha)' },
  { group: 'Movement activity', file: 'jump-masri', text: 'نط سبع مرات!', note: 'Jump seven times (Egyptian, spoken only)' },
  ...COUNT_FUSHA.flatMap((word, i) => [
    { group: 'Movement activity', file: `count-${i + 1}`, text: word, note: `Counting ${i + 1} (Fusha)` },
    { group: 'Movement activity', file: `count-${i + 1}-masri`, text: COUNT_MASRI[i], note: `Counting ${i + 1} (Egyptian, spoken only)` },
  ]),
  { group: 'Reading cards, unit 1', file: 'father', text: 'أَبْ', note: 'Unit 1 word' },
  { group: 'Reading cards, unit 1', file: 'mother', text: 'أُمّ', note: 'Unit 1 word' },
  { group: 'Reading cards, unit 1', file: 'brother', text: 'أَخْ', note: 'Unit 1 word' },
  { group: 'Reading cards, unit 1', file: 'alif-name', text: 'أَلِف', note: 'The letter name, as in "its name is alif"' },
  { group: 'Reading cards, unit 1', file: 'alif-sound', text: 'أَ', note: 'The letter sound, as in "and its sound is a"' },
  { group: 'Reading game', file: 'lion', text: 'أَسَد', note: 'Reading game (an .m4a exists)' },
  { group: 'Reading game', file: 'rabbit', text: 'أَرْنَب', note: 'Reading game (an .m4a exists)' },
  { group: 'Reading game', file: 'door', text: 'بَاب', note: 'Reading game (an .m4a exists)' },
  { group: 'Reading game', file: 'house', text: 'بَيْت', note: 'Reading game (an .m4a exists)' },
  { group: 'Reading game', file: 'mosque', text: 'مَسْجِد', note: 'Reading game (an .m4a exists)' },
  { group: 'Reading game', file: 'kaaba', text: 'كَعْبَة', note: 'Reading game (an .m4a exists)' },
  { group: 'Reading game', file: 'read', text: 'اقرأ', note: 'Reading game prompt (an .m4a exists)' },
  { group: 'Reading game', file: 'match', text: 'اسحب كل صورة إلى كلمتها', note: 'Matching prompt (an .m4a exists)' },
  { group: 'Reading game', file: 'well-done', text: 'أحسنت', note: 'Praise, said with a sukoon on the ت; the games use it too (an .m4a exists)' },
  { group: 'Block puzzle', file: 'mashaallah', text: 'مَا شَاءَ اللَّهُ', note: 'Praise for two lines or more at once, and for a cleared board (one line plays well-done)' },
  ...HOURS_FUSHA.flatMap((text, i) => [
    { group: 'Clock', file: `hour-${i + 1}`, text, note: `${i + 1} o'clock (Fusha)` },
    { group: 'Clock', file: `hour-${i + 1}-masri`, text: HOURS_MASRI[i], note: `${i + 1} o'clock (Egyptian, spoken only)` },
  ]),
  { group: 'Driving game', file: 'belt', text: 'اِرْبِطْ حِزَامَ الْأَمَانِ', note: 'Before every drive: fasten the seat belt (Fusha)' },
  { group: 'Driving game', file: 'belt-masri', text: 'اربط حزام الأمان', note: 'Fasten the seat belt (Egyptian, spoken only)' },
  { group: 'Driving game', file: 'place-masjid', text: 'الْمَسْجِدُ', note: 'Said on arriving at the masjid (Fusha)' },
  { group: 'Driving game', file: 'place-masjid-masri', text: 'المسجد', note: 'The masjid (Egyptian, spoken only)' },
  { group: 'Driving game', file: 'place-grandma', text: 'بَيْتُ جَدَّتِي', note: "Said on arriving at the grandmother's house (Fusha)" },
  { group: 'Driving game', file: 'place-grandma-masri', text: 'بيت أنَّه', note: "Grandmother's house (Egyptian, spoken only)" },
  { group: 'Driving game', file: 'place-oasis', text: 'الْوَاحَةُ', note: 'Said on arriving at the oasis, at the end of the ride that carries its name (Fusha)' },
  { group: 'Driving game', file: 'place-oasis-masri', text: 'الواحة', note: 'The oasis (Egyptian, spoken only)' },
  { group: 'Driving game', file: 'allahu-akbar', text: 'اللَّهُ أَكْبَرُ', note: 'Said going up a mountain on the ride to the oasis, and when the masjid is finished in the building game. One recording for both dialect settings' },
  { group: 'Driving game', file: 'subhanallah', text: 'سُبْحَانَ اللَّهِ', note: 'Said coming down a mountain on the ride to the oasis. One recording for both dialect settings' },
  { group: 'Driving game', file: 'alhamdulillah', text: 'الْحَمْدُ لِلَّهِ', note: 'Said on arriving, and when the car is finished in the car factory. One recording for both dialect settings' },
  { group: 'Building game', file: 'bismillah', text: 'بِسْمِ اللَّهِ', note: 'Said before the safety gear, in the building game and the car factory. One recording for both dialect settings' },
  { group: 'Building game', file: 'gear', text: 'اِلْبَسْ مُعَدَّاتِ السَّلَامَةِ', note: 'Before building: put on the safety gear (Fusha); the car factory uses it too' },
  { group: 'Building game', file: 'gear-masri', text: 'البس لبس الأمان', note: 'Put on the safety gear (Egyptian, spoken only)' },
  { group: 'Building game', file: 'start-right', text: 'اِبْدَأْ بِالْيَمِينِ', note: 'The gloves: start with the right hand (Fusha)' },
  { group: 'Building game', file: 'start-right-masri', text: 'ابدأ باليمين', note: 'Start with the right hand (Egyptian, spoken only)' },
  { group: 'Building game', file: 'dozer', text: 'الْجَرَّافَةُ', note: 'Said when the bulldozer drives in (Fusha)' },
  { group: 'Building game', file: 'dozer-masri', text: 'البلدوزر', note: 'The bulldozer (Egyptian, spoken only)' },
  { group: 'Building game', file: 'part-steel', text: 'حَدِيدُ التَّسْلِيحِ', note: 'Said when the workers carry the steel mesh into the pit (Fusha)' },
  { group: 'Building game', file: 'part-steel-masri', text: 'حديد التسليح', note: 'The reinforcing steel (Egyptian, spoken only)' },
  { group: 'Building game', file: 'pump', text: 'مِضَخَّةُ الْخَرَسَانَةِ', note: 'Said when the concrete pump drives in (Fusha)' },
  { group: 'Building game', file: 'pump-masri', text: 'مضخة الخرسانة', note: 'The concrete pump (Egyptian, spoken only)' },
  { group: 'Building game', file: 'mixer', text: 'خَلَّاطَةُ الْخَرَسَانَةِ', note: 'Said when the concrete mixer comes (Fusha)' },
  { group: 'Building game', file: 'mixer-masri', text: 'خلاطة الخرسانة', note: 'The concrete mixer (Egyptian, spoken only)' },
  { group: 'Building game', file: 'truck', text: 'الشَّاحِنَةُ', note: 'Said when the truck drives in with the stone (Fusha)' },
  { group: 'Building game', file: 'truck-masri', text: 'عربية النقل', note: 'The truck (Egyptian, spoken only)' },
  { group: 'Building game', file: 'forklift', text: 'الرَّافِعَةُ الشَّوْكِيَّةُ', note: 'Said when the forklift drives in (Fusha)' },
  { group: 'Building game', file: 'forklift-masri', text: 'الكلارك', note: 'The forklift (Egyptian, spoken only)' },
  { group: 'Building game', file: 'crane', text: 'الرَّافِعَةُ', note: 'Said when the crane starts work (Fusha)' },
  { group: 'Building game', file: 'crane-masri', text: 'الونش', note: 'The crane (Egyptian, spoken only)' },
  { group: 'Building game', file: 'tool-hammer', text: 'الْمِطْرَقَةُ', note: 'Said when the hammer is picked up (Fusha)' },
  { group: 'Building game', file: 'tool-hammer-masri', text: 'الشاكوش', note: 'The hammer (Egyptian, spoken only)' },
  { group: 'Building game', file: 'tool-screwdriver', text: 'الْمِفَكُّ', note: 'Said when the screwdriver is picked up. One recording for both dialect settings' },
  { group: 'Building game', file: 'tool-drill', text: 'الْمِثْقَابُ', note: 'Said when the drill is picked up (Fusha)' },
  { group: 'Building game', file: 'tool-drill-masri', text: 'الشنيور', note: 'The drill (Egyptian, spoken only)' },
  { group: 'Building game', file: 'part-foundation', text: 'الْأَسَاسُ', note: 'Said when the poured concrete has set and the foundation is laid. One recording for both dialect settings' },
  { group: 'Building game', file: 'part-walls', text: 'الْجُدْرَانُ', note: 'Said when the walls are up (Fusha)' },
  { group: 'Building game', file: 'part-walls-masri', text: 'الحيطان', note: 'The walls (Egyptian, spoken only)' },
  { group: 'Building game', file: 'part-door', text: 'الْبَابُ', note: 'Said when the door is fixed in place. One recording for both dialect settings' },
  { group: 'Building game', file: 'part-minaret', text: 'الْمِئْذَنَةُ', note: 'Said when the minaret is finished (Fusha)' },
  { group: 'Building game', file: 'part-minaret-masri', text: 'المدنة', note: 'The minaret (Egyptian, spoken only)' },
  { group: 'Building game', file: 'part-dome', text: 'الْقُبَّةُ', note: 'Said when the dome is set on the masjid. One recording for both dialect settings' },
  { group: 'Car factory', file: 'car-chassis', text: 'الْهَيْكَلُ', note: 'Said when the chassis rides in (Fusha)' },
  { group: 'Car factory', file: 'car-chassis-masri', text: 'الشاسيه', note: 'The same, Egyptian, spoken only' },
  { group: 'Car factory', file: 'car-engine', text: 'الْمُحَرِّكُ', note: 'Said when the engine comes on its dolly (Fusha)' },
  { group: 'Car factory', file: 'car-engine-masri', text: 'الموتور', note: 'The same, Egyptian, spoken only' },
  { group: 'Car factory', file: 'car-seats', text: 'الْمَقَاعِدُ', note: 'Said when the seats come on their cart (Fusha)' },
  { group: 'Car factory', file: 'car-seats-masri', text: 'الكراسي', note: 'The same, Egyptian, spoken only' },
  { group: 'Car factory', file: 'car-paint', text: 'الطِّلَاءُ', note: 'Said when the paint booth opens (Fusha)' },
  { group: 'Car factory', file: 'car-paint-masri', text: 'الدهان', note: 'The same, Egyptian, spoken only' },
  { group: 'Car factory', file: 'car-body', text: 'جِسْمُ السَّيَّارَةِ', note: 'Said when the painted body comes in on the hoist (Fusha)' },
  { group: 'Car factory', file: 'car-body-masri', text: 'جسم العربية', note: 'The same, Egyptian, spoken only' },
  { group: 'Car factory', file: 'car-doors', text: 'الْأَبْوَابُ', note: 'Said when the doors come on their rack (Fusha)' },
  { group: 'Car factory', file: 'car-doors-masri', text: 'البيبان', note: 'The same, Egyptian, spoken only' },
  { group: 'Car factory', file: 'car-wheels', text: 'الْعَجَلَاتُ', note: 'Said when the wheels come on their cart (Fusha)' },
  { group: 'Car factory', file: 'car-wheels-masri', text: 'العجل', note: 'The same, Egyptian, spoken only' },
  { group: 'Car factory', file: 'tool-wrench', text: 'مِفْتَاحُ الْعَجَلَاتِ', note: 'Said when the wheel wrench is picked up (Fusha)' },
  { group: 'Car factory', file: 'tool-wrench-masri', text: 'مفتاح العجل', note: 'The same, Egyptian, spoken only' },
  { group: 'Car factory', file: 'car-lights', text: 'الْمَصَابِيحُ', note: 'Said when the headlights come on their cart (Fusha)' },
  { group: 'Car factory', file: 'car-lights-masri', text: 'الفوانيس', note: 'The same, Egyptian, spoken only' },
  { group: 'Mazes', file: 'maze-draw', text: 'اِرْسُمْ خَطًّا مِنَ الْبِدَايَةِ إِلَى النِّهَايَةِ', note: 'Said when the first or the second maze opens (Fusha)' },
  { group: 'Mazes', file: 'maze-draw-masri', text: 'ارسم خط من البداية للنهاية', note: 'Draw a line from the start to the end (Egyptian, spoken only)' },
  { group: 'Mazes', file: 'maze-find', text: 'اِتَّبِعِ الطَّرِيقَ وَاكْتَشِفِ الرَّسْمَ الْمَخْفِيَّ', note: 'Said when a maze with a hidden picture opens, mazes 3 to 7 (Fusha)' },
  { group: 'Mazes', file: 'maze-find-masri', text: 'امشي مع الطريق واكتشف الرسمة المستخبية', note: 'Follow the way and find the hidden picture (Egyptian, spoken only)' },
  { group: 'Mazes', file: 'maze-what', text: 'مَاذَا رَسَمْتَ؟', note: 'Asked at the end of a picture maze, before its picture comes clear (Fusha)' },
  { group: 'Mazes', file: 'maze-what-masri', text: 'رسمت إيه؟', note: 'What did you draw? (Egyptian, spoken only)' },
  { group: 'Mazes', file: 'maze-icecream', text: 'مُثَلَّجَات', note: 'The hidden picture of maze 3 (Fusha)' },
  { group: 'Mazes', file: 'maze-icecream-masri', text: 'آيس كريم', note: 'Ice cream (Egyptian, spoken only)' },
  { group: 'Mazes', file: 'maze-apple', text: 'تُفَّاحَة', note: 'The hidden picture of maze 4. One recording for both dialect settings' },
  { group: 'Mazes', file: 'maze-lantern', text: 'فَانُوس', note: 'The hidden picture of maze 5. One recording for both dialect settings' },
  { group: 'Mazes', file: 'maze-crescent', text: 'هِلَال', note: 'The hidden picture of maze 6. One recording for both dialect settings. Maze 7 says the reading game\'s mosque' },
  { group: 'Obstacle course', file: 'masjid-dua', text: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', note: "The du'a for entering the masjid (Sahih Muslim 713), at the end of the walk to the masjid. One recording for both dialect settings" },
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
let lastMic = ''; // the microphone of the take before, to warn when it changes
const takes = new Map(); // file: [take], every take of this computer's sittings
const kept = new Map(); // file: the number of the take to write

/* Kept on this computer between visits, as IQRA's intake keeps its session:
   every take (its WAV and its check), which take is kept for each card, and
   the folder last written to. A reload or a crash loses nothing; "Discard
   saved takes" empties it. */
const store = (() => {
  let opened = null;
  const open = () => opened || (opened = new Promise((resolve, reject) => {
    const request = indexedDB.open('ashudd-record', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('takes');
      request.result.createObjectStore('meta');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
  const run = async (name, mode, work) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, mode);
      const request = work(tx.objectStore(name));
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = () => reject(tx.error);
    });
  };
  return {
    putTake: (file, take) => run('takes', 'readwrite', (s) => s.put({ ...take, file }, `${file}:${take.no}`)),
    allTakes: () => run('takes', 'readonly', (s) => s.getAll()),
    get: (key) => run('meta', 'readonly', (s) => s.get(key)),
    put: (key, value) => run('meta', 'readwrite', (s) => s.put(value, key)),
    clear: async () => { await run('takes', 'readwrite', (s) => s.clear()); await run('meta', 'readwrite', (s) => s.delete('kept')); },
  };
})();
const saveKept = () => store.put('kept', [...kept]).catch(() => {});

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

/* A microphone's name without what Windows adds around it, as IQRA's micName. */
const micName = (label) => (label || '').replace(/^(Default|Communications) - /, '').replace(/^\d+- /, '').replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, '').trim();

/* IQRA's level advice: from the loudest point of every kept take, once there
   are two, whether the input level suits the voice. */
function levelAdvice() {
  const peaks = slots.map((slot) => (takes.get(slot.file) || []).find((t) => t.no === kept.get(slot.file))).filter(Boolean).map((t) => t.peak).sort((a, b) => a - b);
  const box = $('advice');
  if (peaks.length < 2) { box.hidden = true; return; }
  const median = peaks[Math.floor(peaks.length / 2)];
  let text = '';
  let level = 'good';
  if (median > -1) { text = `Too loud: the kept takes peak around ${median.toFixed(0)} dBFS and may be clipped. Move back from the microphone or lower the Windows input level.`; level = 'bad'; }
  else if (median < -30) { text = `Very quiet: the kept takes peak around ${median.toFixed(0)} dBFS. Raise the Windows input level by about ${Math.round(-12 - median)} dB, or come closer.`; level = 'bad'; }
  else if (median < -18) { text = `Usable but quiet: the kept takes peak around ${median.toFixed(0)} dBFS. Raise the Windows input level by about ${Math.round(-12 - median)} dB for the next ones.`; level = 'warn'; }
  box.hidden = !text;
  box.className = `note ${level}`;
  box.textContent = text;
}

/* The room check: three seconds of silence, before a sitting, to hear how
   noisy the room is. Nothing is saved. The click of the button and of the
   end are left out (half a second at each end). */
const ROOM_SECONDS = 3;
async function roomCheck() {
  if (recorder || starting) return;
  stopPlayback();
  const button = $('room');
  let handle;
  starting = true;
  try {
    handle = await startRecording($('mic').value);
  } catch (error) {
    setStatus(`Microphone not available: ${error.message}`);
    return;
  } finally {
    starting = false;
  }
  recorder = handle;
  button.disabled = true;
  $('room-result').textContent = '';
  setStatus('Room check: stay quiet for three seconds…');
  watchMeter();
  await new Promise((resolve) => setTimeout(resolve, ROOM_SECONDS * 1000 + 300));
  recorder = null;
  const { samples, sampleRate } = await handle.stop();
  button.disabled = false;
  const edge = Math.round(sampleRate * 0.5);
  const quiet = samples.length > 4 * edge ? samples.slice(edge, samples.length - edge) : samples;
  const p = profile(quiet, sampleRate);
  const sorted = Float64Array.from(p.rms).sort();
  const room = dbfs(sorted[Math.floor(sorted.length / 2)] || 0);
  let text;
  let level = 'good';
  if (p.peakSample > 0.05) { text = `Something loud was heard (peak ${dbfs(p.peakSample).toFixed(0)} dBFS): a voice, a door? Try again when it is quiet.`; level = 'bad'; }
  else if (room > -50) { text = `The room is noisy (${room.toFixed(0)} dBFS). The noise will be under every take: wait for a quieter moment or close the door.`; level = 'warn'; }
  else if (room > -60) text = `The room is fine (${room.toFixed(0)} dBFS).`;
  else text = `The room is quiet (${room.toFixed(0)} dBFS). Good.`;
  $('room-result').className = `note ${level}`;
  $('room-result').textContent = text;
  setStatus(text);
}

/* Takes */
async function stopRecording(slot) {
  const handle = recorder;
  recorder = null;
  recordingSlot = null;
  const { samples, sampleRate, device } = await handle.stop();
  $('meter-fill').style.width = '0';
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
    recordedAt: new Date().toISOString(),
  };
  /* IQRA's wrong-microphone warning: a take from another microphone than the
     one before sounds different beside the others. */
  const mic = micName(device);
  if (lastMic && mic && mic !== lastMic) {
    take.check.notes.push(`recorded with ${mic}, not ${lastMic} as the take before`);
    if (take.check.level === 'good') take.check.level = 'warn';
  }
  if (mic) lastMic = mic;
  list.push(take);
  takes.set(slot.file, list);
  kept.set(slot.file, take.no);
  store.putTake(slot.file, take).catch(() => setStatus('This take could not be kept on the computer: write it to the folder before closing the page.'));
  saveKept();
  render();
  levelAdvice();
  setStatus(`Take ${take.no} of ${slot.file}: ${duration.toFixed(2)} s, peak ${take.peak.toFixed(1)} dBFS${take.check.notes.length ? ', ' + take.check.notes.join(', ') : ''}.`);
}

/* IQRA's meter: the loudest sample of the latest chunk, on a scale of −60 to
   0 dBFS, with the loudest point of the take held as a mark. The shaded band
   (−18 to −6) is where the voice should peak; above −1 the bar turns red. */
const meterAt = (db) => `${Math.max(0, Math.min(100, ((db + 60) / 60) * 100))}%`;
function watchMeter() {
  const meter = $('meter');
  const fill = $('meter-fill');
  const hold = $('meter-hold');
  let held = -Infinity;
  meter.classList.remove('hot');
  hold.hidden = true;
  $('meter-text').textContent = 'Listening…';
  const loop = () => {
    if (!recorder) {
      fill.style.width = '0';
      if (held > -Infinity) $('meter-text').textContent = `The loudest point was ${held.toFixed(1)} dBFS.`;
      return;
    }
    const db = dbfs(recorder.level());
    fill.style.width = meterAt(db);
    if (db > held) {
      held = db;
      hold.hidden = false;
      hold.style.left = meterAt(held);
      meter.classList.toggle('hot', held > -1);
      $('meter-text').textContent = `Loudest so far ${held.toFixed(1)} dBFS`;
    }
    requestAnimationFrame(loop);
  };
  loop();
}

async function toggleRecording(slot) {
  if (starting) return;
  if (recorder && !recordingSlot) return; // the room check is listening
  if (recorder) {
    // Whatever card was clicked, the take belongs to the card being recorded.
    const recording = recordingSlot;
    const button = document.querySelector(`[data-rec="${recording.file}"]`);
    if (button) { button.textContent = 'Record'; button.classList.remove('rec'); }
    await stopRecording(recording);
    return;
  }
  select(slot);
  stopPlayback();
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
  if (button) { button.textContent = 'Stop'; button.classList.add('rec'); }
  if ($('mic').length === 1) listMicrophones(); // the names show once the microphone is allowed
  watchMeter();
  setStatus(`Recording ${slot.file}. Wait a beat, say it, then Stop (R).`);
}

/* Listening back, as IQRA's take player: one take at a time, which can be
   paused and resumed, or stopped, so a long passage need not play to the
   end. Recording, or moving to another card, stops it. */
let player = null;
let playing = null; // {file, no, url}
function showPlayback() {
  for (const button of document.querySelectorAll('[data-play]')) {
    const card = button.closest('.slot');
    const on = playing && card && card.dataset.file === playing.file && Number(button.dataset.play) === playing.no;
    button.textContent = on && !player.paused ? 'Pause' : on ? 'Resume' : 'Play';
    const stop = button.nextElementSibling;
    if (stop && stop.dataset.stop) stop.hidden = !on;
  }
}
function stopPlayback() {
  if (!player || !playing) return;
  player.pause();
  URL.revokeObjectURL(playing.url);
  playing = null;
  showPlayback();
}
function togglePlay(slot, take) {
  if (!take) return;
  if (!player) {
    player = new Audio();
    player.addEventListener('ended', stopPlayback);
    player.addEventListener('play', showPlayback);
    player.addEventListener('pause', showPlayback);
  }
  if (playing && playing.file === slot.file && playing.no === take.no) {
    if (player.paused) player.play().catch(() => {});
    else player.pause();
    return;
  }
  stopPlayback();
  playing = { file: slot.file, no: take.no, url: URL.createObjectURL(take.blob) };
  player.src = playing.url;
  player.play().catch(() => {});
  showPlayback();
}
const keptTake = (slot) => (takes.get(slot.file) || []).find((t) => t.no === kept.get(slot.file));

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
  const dir = await folder(false);
  if (!dir) return;
  const written = [];
  const replaced = [];
  for (const slot of slots) {
    const take = keptTake(slot);
    if (!take) continue;
    const name = `${slot.file}.wav`;
    const there = await dir.getFileHandle(name).then(() => true, () => false);
    const handle = await dir.getFileHandle(name, { create: true });
    const stream = await handle.createWritable();
    await stream.write(take.blob);
    await stream.close();
    written.push(name);
    if (there) replaced.push(name);
  }
  $('written').textContent = written.length ? `Written: ${written.join(', ')}${replaced.length ? `. Replaced: ${replaced.join(', ')}` : ''}` : 'Nothing to write yet.';
  setStatus(written.length ? `Wrote ${written.length} file(s) into ${dir.name}${replaced.length ? `, ${replaced.length} of them replacing a file already there` : ''}.` : 'No kept takes to write.');
}

/* The folder to write into: the one used last time, asked for again only
   when the browser has forgotten the permission, or a new one when asked.
   The site plays recordings from public/audio, so a folder with another name
   is questioned. */
async function folder(choose) {
  let dir = choose ? null : await store.get('dir').catch(() => null);
  if (dir) {
    const mode = { mode: 'readwrite' };
    const allowed = (await dir.queryPermission(mode)) === 'granted' || (await dir.requestPermission(mode).catch(() => 'denied')) === 'granted';
    if (!allowed) dir = null;
  }
  if (!dir) {
    try {
      dir = await window.showDirectoryPicker({ id: 'ashudd-audio', mode: 'readwrite' });
    } catch {
      return null;
    }
    if (dir.name !== 'audio' && !confirm(`This folder is called "${dir.name}". The site's recordings go in public\\audio inside the project. Use "${dir.name}" anyway?`)) return null;
    await store.put('dir', dir).catch(() => {});
  }
  $('folder').textContent = `Folder: ${dir.name}`;
  return dir;
}

/* Page */
function select(slot) {
  if (selected !== slot) stopPlayback();
  selected = slot;
  for (const card of document.querySelectorAll('.slot')) card.classList.toggle('selected', card.dataset.file === slot.file);
}

/* N and P, as IQRA: the next or the previous card on the page (with the
   filter on, the next one still to record), brought to the middle. */
function move(step) {
  const shown = [...document.querySelectorAll('.slot')].filter((card) => card.offsetParent !== null);
  if (!shown.length) return;
  const at = selected ? shown.findIndex((card) => card.dataset.file === selected.file) : -1;
  const next = shown[at < 0 ? 0 : Math.max(0, Math.min(shown.length - 1, at + step))];
  select(slots.find((slot) => slot.file === next.dataset.file));
  next.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
      if (slots.filter((other) => other.group === group).every((other) => other.have)) h.className = 'have';
      root.append(h);
    }
    const card = document.createElement('section');
    card.className = `slot${selected && selected.file === slot.file ? ' selected' : ''}${slot.have ? ' have' : ''}`;
    card.dataset.file = slot.file;
    const list = takes.get(slot.file) || [];
    card.innerHTML = `
      <p class="text${slot.quran ? ' quran' : ''}" lang="ar">${slot.quran ? mushafText(slot.text) : slot.text}</p>
      <p class="note">${slot.note} · audio/${slot.file}.wav</p>
      <div class="row"><button type="button" data-rec="${slot.file}">Record</button></div>
      <ul class="takes">${list.map((take) => `
        <li data-take="${take.no}">
          <b class="badge ${take.check.level}" title="${take.check.level}">${{ good: '✓', warn: '!', bad: '✗' }[take.check.level] || '·'}</b>
          <span class="${take.no === kept.get(slot.file) ? 'kept' : ''}">Take ${take.no}${take.no === kept.get(slot.file) ? ' (kept)' : ''}</span>
          <span>${take.duration.toFixed(2)} s · peak ${take.peak.toFixed(1)} dBFS</span>
          <span class="${take.check.level}">${take.check.notes.join(', ') || 'clean'}</span>
          <button type="button" class="quiet" data-play="${take.no}">Play</button><button type="button" class="quiet" data-stop="${take.no}" hidden>Stop</button>
          <button type="button" class="quiet" data-keep="${take.no}">Keep this</button>
          <button type="button" class="quiet" data-download="${take.no}">Download</button>
        </li>`).join('')}</ul>`;
    card.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      select(slot);
      if (!button) return;
      button.blur(); // so Space and R stay with the page, not with the button
      const take = (n) => list.find((t) => t.no === Number(n));
      if (button.dataset.rec) toggleRecording(slot);
      else if (button.dataset.play) togglePlay(slot, take(button.dataset.play));
      else if (button.dataset.stop) stopPlayback();
      else if (button.dataset.keep) { kept.set(slot.file, Number(button.dataset.keep)); saveKept(); render(); levelAdvice(); }
      else if (button.dataset.download) downloadTake(slot, take(button.dataset.download));
    });
    root.append(card);
  }
  showPlayback();
}

async function listMicrophones() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter((d) => d.kind === 'audioinput' && d.label);
    const picker = $('mic');
    const chosen = picker.value;
    picker.length = 1; // keeps "Default"
    for (const mic of mics) {
      const option = document.createElement('option');
      option.value = mic.deviceId;
      option.textContent = micName(mic.label) || mic.label;
      picker.append(option);
    }
    if (mics.some((mic) => mic.deviceId === chosen)) picker.value = chosen;
  } catch {
    // Names show after the first recording grants permission.
  }
}

/* Which clips already have a recording on the site, so the page can show
   only what is still to be recorded. Asked once, when the page opens. */
async function markRecorded() {
  await Promise.all(slots.map(async (slot) => {
    const found = await Promise.all(['m4a', 'wav'].map((ext) => fetch(`audio/${slot.file}.${ext}`, { method: 'HEAD' })
      .then((response) => response.ok && (response.headers.get('content-type') || '').startsWith('audio/'))
      .catch(() => false)));
    slot.have = found.some(Boolean);
  }));
  const left = slots.filter((slot) => !slot.have).length;
  $('todo-count').textContent = `${left} of ${slots.length} clips are still to record`;
  render();
}

async function init() {
  const surah = await fetch('quran/fatihah.json').then((response) => response.json());
  slots = [
    ...surah.ayat.map((ayah) => ({ file: `fatihah-${ayah.number}`, text: ayah.text, note: `Al-Fatihah, ayah ${ayah.number}`, quran: true, group: 'Al-Fatihah' })),
    ...STATIC_SLOTS,
  ];
  // The du'a of riding is read from its own file, like the Quran text: never typed here.
  const riding = await fetch('dua/riding.json').then((response) => response.json()).catch(() => null);
  if (riding) {
    const text = riding.parts.map((part) => {
      const words = part.words.join(' ');
      return (part.quran ? `<span class="quran">${mushafText(words)}</span>` : words) + (part.times > 1 ? ` <small dir="ltr">×${part.times}</small>` : '');
    }).join('<br>');
    const at = slots.findIndex((slot) => slot.file === 'alhamdulillah');
    slots.splice(at, 0, {
      group: 'Driving game', file: 'riding-dua', text,
      note: "The du'a of riding in one recording: the bismillah, then the verses (from Sunan Abi Dawud 2602). Pause briefly between the two lines so the words light up in step. One recording for both dialect settings",
    });
  }
  // A story's text is read from its own file too, so the card says exactly the words on screen.
  const zamzam = await fetch('stories/zamzam.json').then((response) => response.json()).catch(() => null);
  if (zamzam) {
    const note = 'Fusha only: the words on screen light up as they are spoken, so read exactly these words, slowly and warmly, with a short breath at each comma and full stop';
    slots.push(
      { group: 'Story: Ismail and Zamzam', file: zamzam.clip, text: zamzam.title, note: `The title page. ${note}` },
      ...zamzam.pages.map((page, i) => ({ group: 'Story: Ismail and Zamzam', file: page.clip, text: page.text, note: `Page ${i + 1} of ${zamzam.pages.length}. ${note}` })),
    );
  }
  await restore();
  render();
  levelAdvice();
  markRecorded();
  $('todo').addEventListener('change', () => $('slots').classList.toggle('only-todo', $('todo').checked));
  listMicrophones();
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) navigator.mediaDevices.addEventListener('devicechange', listMicrophones);
  $('write').addEventListener('click', writeAll);
  $('choose').addEventListener('click', () => folder(true));
  $('room').addEventListener('click', roomCheck);
  $('discard').addEventListener('click', discard);
  store.get('dir').then((dir) => { if (dir) $('folder').textContent = `Folder: ${dir.name}`; }).catch(() => {});
  /* IQRA's keys: R records or stops; Space plays or pauses the card's kept
     take; N and P go to the next and the previous card; Escape stops playing. */
  addEventListener('keydown', (event) => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if (/input|select|textarea/i.test(event.target.tagName)) return;
    if (event.code === 'KeyR') {
      event.preventDefault();
      if (recorder && recordingSlot) toggleRecording(recordingSlot);
      else if (selected) toggleRecording(selected);
    } else if (event.code === 'Space') {
      event.preventDefault();
      if (selected) togglePlay(selected, keptTake(selected));
    } else if (event.code === 'KeyN') {
      event.preventDefault();
      move(1);
    } else if (event.code === 'KeyP') {
      event.preventDefault();
      move(-1);
    } else if (event.code === 'Escape') stopPlayback();
  });
}

/* The takes kept on this computer, back on their cards. */
async function restore() {
  try {
    const saved = await store.allTakes();
    const known = new Set(slots.map((slot) => slot.file));
    for (const take of saved.sort((a, b) => a.no - b.no)) {
      if (!known.has(take.file)) continue;
      const list = takes.get(take.file) || [];
      list.push(take);
      takes.set(take.file, list);
    }
    for (const [file, no] of (await store.get('kept')) || []) if (takes.has(file)) kept.set(file, no);
    const count = [...takes.values()].reduce((n, list) => n + list.length, 0);
    if (count) setStatus(`${count} take(s) from earlier sittings are back on their cards. Write the kept ones to the folder, or discard them.`);
  } catch {
    setStatus('Takes cannot be kept on this computer in this browser: write them to the folder before closing the page.');
  }
}

async function discard() {
  const count = [...takes.values()].reduce((n, list) => n + list.length, 0);
  if (!count) { setStatus('There are no saved takes.'); return; }
  if (!confirm(`Discard all ${count} take(s) kept on this computer? Files already written to the folder stay.`)) return;
  stopPlayback();
  await store.clear().catch(() => {});
  takes.clear();
  kept.clear();
  render();
  levelAdvice();
  setStatus('Saved takes discarded.');
}

init();
