const WORDS = [
  { id: 'lion', word: 'أَسَد' },
  { id: 'rabbit', word: 'أَرْنَب' },
  { id: 'door', word: 'بَاب' },
  { id: 'house', word: 'بَيْت' },
  { id: 'mosque', word: 'مَسْجِد' },
  { id: 'kaaba', word: 'كَعْبَة' },
];

const $ = (id) => document.getElementById(id);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function show(viewId) {
  for (const view of document.querySelectorAll('.view')) view.hidden = view.id !== viewId;
  scrollTo(0, 0);
}

/* Sound. One audio element is reused so phones keep allowing it after the first tap.
   A clip that has not been recorded yet simply stays silent. */
const player = new Audio();
let finishClip = null;

function play(name) {
  if (finishClip) finishClip();
  return new Promise((resolve) => {
    finishClip = resolve;
    player.onended = resolve;
    player.onerror = resolve;
    player.src = `audio/${name}.m4a`;
    const started = player.play();
    if (started) started.catch(resolve);
  });
}

let audioContext = null;
function tone(frequency, startsIn, length, volume, type = 'sine') {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') audioContext.resume();
  const start = audioContext.currentTime + startsIn;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(audioContext.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

function chime() {
  tone(660, 0, 0.45, 0.14);
  tone(880, 0.12, 0.6, 0.12);
}

function wrongFeedback() {
  const canVibrate = 'vibrate' in navigator && matchMedia('(pointer: coarse)').matches;
  if (canVibrate && navigator.vibrate(160)) return;
  tone(150, 0, 0.22, 0.12, 'triangle');
}

/* Step 1: picture grid */
let bigCard = null;

function shrinkCard() {
  if (!bigCard) return;
  bigCard.classList.remove('big');
  bigCard.style.transform = '';
  bigCard = null;
  $('scrim').classList.remove('on');
}

async function growCard(card, entry) {
  shrinkCard();
  const rect = card.getBoundingClientRect();
  const scale = Math.max(1.15, Math.min((innerWidth - 32) / rect.width, (innerHeight - 32) / rect.height, 2.2));
  const moveX = innerWidth / 2 - (rect.left + rect.width / 2);
  const moveY = innerHeight / 2 - (rect.top + rect.height / 2);
  card.style.transform = `translate(${moveX}px, ${moveY}px) scale(${scale})`;
  card.classList.add('big');
  $('scrim').classList.add('on');
  bigCard = card;
  await Promise.all([play(entry.id), delay(1500)]);
  if (bigCard === card) shrinkCard();
}

for (const entry of WORDS) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'card';
  card.innerHTML = `<img src="images/${entry.id}.jpg" alt=""><span class="word">${entry.word}</span>`;
  card.addEventListener('click', () => growCard(card, entry));
  $('grid').append(card);
}

/* Step 2: reading practice */
let practiceIndex = 0;
let reading = false;

function showPicture() {
  const entry = WORDS[practiceIndex];
  reading = false;
  $('solo').classList.remove('reading');
  $('read-prompt').hidden = true;
  $('solo-img').src = `images/${entry.id}.jpg`;
  $('solo-word').textContent = entry.word;
  $('dots').innerHTML = WORDS.map((_, i) => `<i class="${i <= practiceIndex ? 'on' : ''}"></i>`).join('');
  play(entry.id);
}

$('practice').addEventListener('click', () => {
  shrinkCard();
  practiceIndex = 0;
  show('view-practice');
  showPicture();
});

$('next').addEventListener('click', () => {
  if (!reading) {
    reading = true;
    $('solo').classList.add('reading');
    $('read-prompt').hidden = false;
    play('read');
    return;
  }
  practiceIndex += 1;
  if (practiceIndex < WORDS.length) showPicture();
  else startMatching();
});

/* Step 3: drag each name to its picture, or each picture to its name */
let matched = 0;

function startMatching() {
  const board = $('board');
  board.innerHTML = '';
  matched = 0;
  const pictures = shuffle(WORDS);
  let names;
  do {
    names = shuffle(WORDS);
  } while (names.some((entry, row) => entry === pictures[row]));

  names.forEach((entry, row) => {
    board.append(makeItem(entry, 'name', 1, row + 1, `<span class="word">${entry.word}</span>`));
  });
  pictures.forEach((entry, row) => {
    board.append(makeItem(entry, 'picture', 2, row + 1, `<img src="images/${entry.id}.jpg" alt="" draggable="false">`));
  });
  show('view-match');
  play('match');
}

function makeItem(entry, kind, column, row, content) {
  const item = document.createElement('div');
  item.className = 'item';
  item.dataset.id = entry.id;
  item.dataset.kind = kind;
  item.style.gridColumn = column;
  item.style.gridRow = row;
  item.innerHTML = content;
  item.addEventListener('pointerdown', (event) => startDrag(event, item));
  return item;
}

function targetAt(x, y, source) {
  for (const item of $('board').children) {
    if (item.dataset.kind === source.dataset.kind || item.classList.contains('done')) continue;
    const rect = item.getBoundingClientRect();
    if (x >= rect.left - 8 && x <= rect.right + 8 && y >= rect.top - 4 && y <= rect.bottom + 4) return item;
  }
  return null;
}

function startDrag(event, item) {
  if (item.classList.contains('done') || document.querySelector('.ghost')) return;
  event.preventDefault();
  chimeReady();
  const rect = item.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  const ghost = item.cloneNode(true);
  ghost.classList.add('ghost');
  ghost.style.cssText = `left:0;top:0;width:${rect.width}px;height:${rect.height}px`;
  const place = (x, y) => {
    ghost.style.transform = `translate(${x - offsetX}px, ${y - offsetY}px)`;
  };
  place(event.clientX, event.clientY);
  document.body.append(ghost);
  item.classList.add('lifted');
  item.setPointerCapture(event.pointerId);
  let hovered = null;

  const onMove = (moveEvent) => {
    place(moveEvent.clientX, moveEvent.clientY);
    const target = targetAt(moveEvent.clientX, moveEvent.clientY, item);
    if (target === hovered) return;
    if (hovered) hovered.classList.remove('over');
    if (target) target.classList.add('over');
    hovered = target;
  };

  const onEnd = async (endEvent) => {
    item.removeEventListener('pointermove', onMove);
    item.removeEventListener('pointerup', onEnd);
    item.removeEventListener('pointercancel', onEnd);
    if (hovered) hovered.classList.remove('over');
    const target = endEvent.type === 'pointerup' ? targetAt(endEvent.clientX, endEvent.clientY, item) : null;

    if (target && target.dataset.id === item.dataset.id) {
      ghost.remove();
      item.classList.remove('lifted');
      lockPair(item, target);
      return;
    }
    if (target) {
      wrongFeedback();
      shake(item);
      shake(target);
    }
    const back = ghost.animate(
      [{ transform: ghost.style.transform }, { transform: `translate(${rect.left}px, ${rect.top}px)` }],
      { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
    await Promise.race([back.finished.catch(() => {}), delay(320)]);
    ghost.remove();
    item.classList.remove('lifted');
  };

  item.addEventListener('pointermove', onMove);
  item.addEventListener('pointerup', onEnd);
  item.addEventListener('pointercancel', onEnd);
}

function chimeReady() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') audioContext.resume();
}

function shake(item) {
  item.animate(
    [0, -7, 7, -5, 5, 0].map((x) => ({ transform: `translateX(${x}px)` })),
    { duration: 360, easing: 'ease-in-out' },
  );
}

async function lockPair(first, second) {
  const name = first.dataset.kind === 'name' ? first : second;
  const picture = name === first ? second : first;
  moveNameBeside(name, picture);
  name.classList.add('done');
  picture.classList.add('done');
  matched += 1;
  chime();
  const finished = matched === WORDS.length;
  await delay(220);
  await Promise.all([play(name.dataset.id), delay(finished ? 1000 : 0)]);
  if (finished) {
    show('view-done');
    chime();
    play('well-done');
  }
}

function moveNameBeside(name, picture) {
  const row = picture.style.gridRow;
  const other = [...$('board').children].find((item) => item.dataset.kind === 'name' && item.style.gridRow === row);
  if (other === name) return;
  const moved = [name, other].map((item) => [item, item.getBoundingClientRect()]);
  other.style.gridRow = name.style.gridRow;
  name.style.gridRow = row;
  for (const [item, before] of moved) {
    const after = item.getBoundingClientRect();
    item.animate(
      [{ transform: `translate(${before.left - after.left}px, ${before.top - after.top}px)` }, { transform: 'none' }],
      { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
  }
}
