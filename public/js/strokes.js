/* Admin: draw the strokes the child will trace, on the Naskh glyph itself.
   Pick a letter (or type any text), then draw each stroke in the order and
   direction the child should follow: a drag is a stroke, a tap is a dot. The
   strokes are saved in board units (0 to 1 of the square) together with the
   glyph's ink box, in tracing/strokes.json, which the tracing lesson reads
   and fits to its own board. The layout rule is in tracing.js. */
const $ = (id) => document.getElementById(id);
const LETTERS = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي', 'ء', 'أ', 'إ', 'آ', 'ة', 'ى'];
const GLYPH = '#D9CBB5';
const DONE = '#C98A45';
const LIVE = '#A9603A';
const START = '#2E8B57';

const canvas = $('board');
const ctx = canvas.getContext('2d');
let data = { font: tracing.FONT, fit: tracing.FIT, letters: {} };
let text = 'أ';
let strokes = [];
let live = null;
let box = [0, 0, 1, 1];
let size = 300;
let replay = 0;

const round = (n) => Math.round(n * 1000) / 1000;
const status = (message) => { $('status').textContent = message; };

function pathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return total;
}

function distanceToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/* Fewer points, same shape (Ramer-Douglas-Peucker). */
function simplify(points, epsilon) {
  if (points.length < 3) return points;
  const a = points[0];
  const b = points[points.length - 1];
  let far = 0;
  let at = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = distanceToSegment(points[i], a, b);
    if (d > far) {
      far = d;
      at = i;
    }
  }
  if (far <= epsilon) return [a, b];
  return [...simplify(points.slice(0, at + 1), epsilon).slice(0, -1), ...simplify(points.slice(at), epsilon)];
}

/* The first `fraction` of a stroke's length, for the replay. */
function cut(stroke, fraction) {
  if (stroke.length < 2) return stroke;
  let want = pathLength(stroke) * fraction;
  const out = [stroke[0]];
  for (let i = 1; i < stroke.length; i++) {
    const seg = Math.hypot(stroke[i][0] - stroke[i - 1][0], stroke[i][1] - stroke[i - 1][1]);
    if (seg <= want) {
      out.push(stroke[i]);
      want -= seg;
    } else {
      const f = seg ? want / seg : 0;
      out.push([stroke[i - 1][0] + (stroke[i][0] - stroke[i - 1][0]) * f, stroke[i - 1][1] + (stroke[i][1] - stroke[i - 1][1]) * f]);
      break;
    }
  }
  return out;
}

/* Sizes the canvas to its CSS box, sharp on high-density screens. */
function fit() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  size = Math.round(rect.width);
  const dpr = devicePixelRatio || 1;
  canvas.width = Math.round(size * dpr);
  canvas.height = canvas.width;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function drawBase() {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  box = tracing.drawGlyph(ctx, text, size, GLYPH);
}

function draw() {
  drawBase();
  strokes.forEach((stroke, i) => drawStroke(stroke, i, DONE));
  if (live) drawStroke(live, strokes.length, LIVE, false);
}

/* An arrowhead at the end of a stroke, pointing where the finger went. */
function arrow(pts, color) {
  const end = pts[pts.length - 1];
  let from = pts[pts.length - 2];
  for (let i = pts.length - 2; i >= 0; i--) {
    from = pts[i];
    if (Math.hypot(end[0] - from[0], end[1] - from[1]) > size * 0.03) break;
  }
  const angle = Math.atan2(end[1] - from[1], end[0] - from[0]);
  const length = size * 0.045;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(end[0] + Math.cos(angle) * length * 0.6, end[1] + Math.sin(angle) * length * 0.6);
  ctx.lineTo(end[0] + Math.cos(angle + 2.5) * length, end[1] + Math.sin(angle + 2.5) * length);
  ctx.lineTo(end[0] + Math.cos(angle - 2.5) * length, end[1] + Math.sin(angle - 2.5) * length);
  ctx.closePath();
  ctx.fill();
}

function drawStroke(stroke, index, color, head = true) {
  const pts = stroke.map(([x, y]) => [x * size, y * size]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (pts.length > 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.02;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
    ctx.stroke();
    if (head) arrow(pts, color);
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], size * 0.022, 0, Math.PI * 2);
    ctx.fill();
  }
  // The start dot with the stroke's number, green like the printable's start dot.
  ctx.fillStyle = START;
  ctx.beginPath();
  ctx.arc(pts[0][0], pts[0][1], size * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${size * 0.032}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'ltr';
  ctx.fillText(String(index + 1), pts[0][0], pts[0][1]);
}

/* Drawing */
function point(event) {
  const rect = canvas.getBoundingClientRect();
  return [round((event.clientX - rect.left) / rect.width), round((event.clientY - rect.top) / rect.height)];
}

function endStroke() {
  if (!live) return;
  const stroke = pathLength(live) < 0.02 ? [live[0]] : simplify(live, 0.0025);
  live = null;
  strokes.push(stroke);
  store();
  draw();
  status(`${strokes.length} stroke${strokes.length === 1 ? '' : 's'} for ${text}. Draw the next one, or Replay.`);
}

canvas.addEventListener('pointerdown', (event) => {
  stopReplay();
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  live = [point(event)];
  draw();
});
canvas.addEventListener('pointermove', (event) => {
  if (!live) return;
  const p = point(event);
  const last = live[live.length - 1];
  if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.003) return;
  live.push(p);
  draw();
});
canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);

/* Replay: a pen runs along the strokes in order, at the child's pace. */
function startReplay() {
  stopReplay();
  if (!strokes.length) return;
  const speed = 0.4;
  const plan = [];
  let at = 0;
  for (const stroke of strokes) {
    const seconds = Math.max(pathLength(stroke), 0.06) / speed;
    plan.push({ stroke, start: at, end: at + seconds });
    at += seconds + 0.35;
  }
  const t0 = performance.now();
  const frame = (now) => {
    const t = (now - t0) / 1000;
    drawBase();
    plan.forEach(({ stroke, start, end }, i) => {
      if (t >= end) drawStroke(stroke, i, DONE);
      else if (t >= start) drawStroke(cut(stroke, (t - start) / (end - start)), i, LIVE, false);
    });
    if (t < at) replay = requestAnimationFrame(frame);
    else {
      replay = 0;
      draw();
    }
  };
  replay = requestAnimationFrame(frame);
}

function stopReplay() {
  if (replay) cancelAnimationFrame(replay);
  replay = 0;
}

/* The file */
function serialize() {
  const letters = Object.keys(data.letters).map((key) => `    ${JSON.stringify(key)}: ${JSON.stringify(data.letters[key])}`);
  return `{\n  "font": ${JSON.stringify(data.font)},\n  "fit": ${data.fit},\n  "letters": {\n${letters.join(',\n')}\n  }\n}\n`;
}

function store() {
  if (strokes.length) data.letters[text] = { box: box.map(round), strokes };
  else delete data.letters[text];
  renderChips();
  $('out').value = serialize();
}

async function load() {
  try {
    const response = await fetch('tracing/strokes.json', { cache: 'no-cache' });
    if (!response.ok) return;
    const file = await response.json();
    if (file && file.letters) data.letters = file.letters;
  } catch {
    // No file yet.
  }
}

async function writeFile() {
  if (typeof window.showDirectoryPicker !== 'function') {
    status('Writing into a folder needs Chrome or Edge on a computer. Use Download instead.');
    return;
  }
  try {
    const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
    const handle = await dir.getFileHandle('strokes.json', { create: true });
    const writable = await handle.createWritable();
    await writable.write(serialize());
    await writable.close();
    status(`Written as ${dir.name}/strokes.json. It belongs at public/tracing/strokes.json.`);
  } catch (error) {
    if (error.name !== 'AbortError') status(`Could not write: ${error.message}`);
  }
}

function download() {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([serialize()], { type: 'application/json' }));
  link.download = 'strokes.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 30000);
}

/* Letters */
function chip(letter) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `chip${letter === text ? ' on' : ''}${data.letters[letter] ? ' done' : ''}`;
  button.textContent = letter;
  button.addEventListener('click', () => pick(letter));
  return button;
}

function renderChips() {
  const list = $('letters');
  list.innerHTML = '';
  const extra = Object.keys(data.letters).filter((key) => !LETTERS.includes(key));
  if (!LETTERS.includes(text) && !extra.includes(text)) extra.push(text);
  for (const letter of [...LETTERS, ...extra]) list.append(chip(letter));
}

async function pick(next) {
  stopReplay();
  live = null;
  text = next;
  await tracing.ready(text);
  strokes = data.letters[text] ? data.letters[text].strokes.map((stroke) => stroke.map((p) => [...p])) : [];
  renderChips();
  draw();
  status(strokes.length ? `${strokes.length} stroke${strokes.length === 1 ? '' : 's'} saved for ${text}.` : `Draw the strokes of ${text} in order.`);
}

async function init() {
  await load();
  $('undo').addEventListener('click', () => {
    stopReplay();
    strokes.pop();
    store();
    draw();
  });
  $('clear').addEventListener('click', () => {
    stopReplay();
    strokes = [];
    store();
    draw();
  });
  $('replay').addEventListener('click', startReplay);
  $('write').addEventListener('click', writeFile);
  $('download').addEventListener('click', download);
  $('use').addEventListener('click', () => {
    const value = $('custom').value.trim();
    if (value) pick(value);
  });
  $('custom').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      $('use').click();
    }
  });
  // The page starts hidden behind the PIN, so the board is sized once it is laid out, and again on resize.
  new ResizeObserver(fit).observe(canvas);
  fit();
  await pick(text);
  $('out').value = serialize();
}

init();
