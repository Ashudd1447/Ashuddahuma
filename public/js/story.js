/* The story reader. A story is a data file, stories/<id>.json: a title page
   and pages, each with its text, its picture and the name of its recording.
   story.html?s=<id> opens it at the title page.

   Following the words: every word of a page is on screen from the start and
   none of them moves. While a page is read aloud, the words wait in a soft
   grey and each one turns to full ink as it is spoken, and stays inked: the
   parents' choice ("ink filling in"). The times come from the recording
   itself (timing.autoWords), as the du'a of riding does in drive.js. A page
   with no recording yet shows all its words inked and plays nothing.

   Browsers play sound only after a tap, so the title page waits with its
   play button breathing; from then on each page reads itself when it opens.
   Nothing turns a page by itself: the arrows, a swipe or the arrow keys do. */
const story = (() => {
  const SWIPE = 60; // px a finger must travel across the page to turn it
  const HINT_AFTER = 700; // ms after a page ends before the next arrow breathes
  const $ = (id) => document.getElementById(id);
  const root = $('story');
  const el = {picture: $('picture'), text: $('text'), prev: $('prev'), next: $('next'), again: $('again'), dots: $('dots'), book: $('book')};

  let book = null;
  let at = 0; // 0 is the title page; 1 … n are the pages
  let run = 0; // counts page shows, so an old page's narration stops lighting words
  let heard = false; // the family has tapped once, so sound may play
  let words = [];
  let hintTimer = 0;
  const known = {}; // clip name: true when a recording exists, false when it does not

  const page = (i) => (i === 0 ? {text: book.title, picture: book.picture, clip: book.clip, title: true} : book.pages[i - 1]);
  const last = () => book.pages.length;

  /* The words as the timing reads them: the marks and letters only, and the
     bare alif that opens a word (always a hamzat wasl in this spelling)
     written as a wasla, which is silent, as drive.js does for the du'a. */
  const forTiming = (word) => word.replace(/[^ء-ْٰٱ]/g, '').replace(/^([فوبلك][َِ])?ا/, '$1ٱ');

  const draw = (p) => {
    el.text.textContent = '';
    el.text.classList.toggle('title', !!p.title);
    words = p.text.split(/\s+/).filter(Boolean).map((w, i, all) => {
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = w;
      el.text.append(span, i < all.length - 1 ? ' ' : '');
      return span;
    });
  };
  const inkAll = () => {
    el.text.classList.add('still');
    words.forEach((w) => w.classList.add('ink'));
  };
  const dots = () => {
    el.dots.textContent = '';
    for (let i = 0; i <= last(); i++) {
      const dot = document.createElement('i');
      dot.classList.toggle('on', i === at);
      el.dots.append(dot);
    }
  };
  const hint = (on) => {
    clearTimeout(hintTimer);
    el.next.classList.remove('hint');
    el.again.classList.remove('hint');
    if (!on) return;
    hintTimer = setTimeout(() => (heard ? el.next : el.again).classList.add('hint'), heard ? HINT_AFTER : 0);
  };

  /* Reads the page aloud, inking each word as it is spoken. */
  const read = () => {
    const mine = run;
    const p = page(at);
    hint(false);
    if (!heard || known[p.clip] === false) {
      inkAll();
      hint(true);
      return;
    }
    /* With a recording known to exist, the words wait in grey at once; while
       it is still being looked for, they stay inked. */
    if (known[p.clip]) {
      el.text.classList.remove('still');
      words.forEach((w) => w.classList.remove('ink'));
    } else inkAll();
    sound.buffer(p.clip).then((decoded) => {
      if (mine !== run) return;
      known[p.clip] = !!decoded;
      if (!decoded) {
        inkAll();
        hint(true);
        return;
      }
      el.text.classList.remove('still');
      words.forEach((w) => w.classList.remove('ink'));
      /* A reader pauses at the punctuation, so a pause the timing hears is
         matched to a comma or a full stop before anywhere else. */
      const breaks = new Set();
      words.forEach((w, i) => { if (/[،,.:؛!؟?»…]$/.test(w.textContent)) breaks.add(i + 1); });
      const times = timing.autoWords(words.map((w) => forTiming(w.textContent)), timing.envelope(decoded), {waqf: true, breaks: breaks});
      let ended = false;
      sound.play(p.clip).then(() => {
        if (mine !== run) return;
        ended = true;
        inkAll();
        hint(true);
      });
      const tick = () => {
        if (mine !== run || ended) return;
        const playing = sound.current();
        if (playing && playing.name === p.clip && times.length === words.length + 1) {
          const t = playing.position();
          words.forEach((w, i) => { if (t >= times[i]) w.classList.add('ink'); });
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };

  const show = (i) => {
    at = Math.max(0, Math.min(last(), i));
    run += 1;
    sound.stop();
    const p = page(at);
    root.dataset.page = at === 0 ? 'title' : at === last() ? 'last' : 'page';
    el.picture.src = p.picture;
    draw(p);
    dots();
    el.prev.disabled = at === 0;
    read();
  };

  /* The first tap anywhere opens the sound; a tap on a button does its own work too. */
  const wake = () => {
    if (heard) return;
    heard = true;
    if (sound.unlock) sound.unlock();
  };
  const turn = (step) => {
    wake();
    if (step > 0 && at === last()) {
      location.href = 'stories.html';
      return;
    }
    show(at + step);
  };

  el.next.addEventListener('click', () => turn(1));
  el.prev.addEventListener('click', () => turn(-1));
  el.again.addEventListener('click', () => {
    wake();
    run += 1;
    read();
  });
  /* A swipe across the page turns it as a hand turns an Arabic book's page:
     from left to right goes forward. */
  let from = null;
  el.book.addEventListener('pointerdown', (e) => { from = {x: e.clientX, y: e.clientY}; });
  el.book.addEventListener('pointerup', (e) => {
    if (!from) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    from = null;
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < 1.5 * Math.abs(dy)) return;
    turn(dx > 0 ? 1 : -1);
  });
  el.book.addEventListener('pointercancel', () => { from = null; });
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.key === 'ArrowLeft') turn(1);
    else if (e.key === 'ArrowRight') turn(-1);
    else if (e.key === ' ' || e.key === 'Enter') {
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
      e.preventDefault();
      el.again.click();
    }
  });

  const id = new URLSearchParams(location.search).get('s') || 'zamzam';
  fetch(`stories/${encodeURIComponent(id)}.json`).then((r) => r.json()).then((data) => {
    book = data;
    document.title = book.title;
    /* Every recording is fetched ahead, and whether it exists is noted. */
    [book.clip].concat(book.pages.map((p) => p.clip)).forEach((clip) => sound.buffer(clip).then((b) => { known[clip] = !!b; }));
    /* The next pictures are fetched ahead, so a page turns without a wait. */
    book.pages.forEach((p) => { const img = new Image(); img.src = p.picture; });
    show(0);
  }).catch(() => { location.href = 'stories.html'; });

  /* For testing by hand on the family's own computer. */
  const hook = {show: show, at: () => at, words: () => words.map((w) => w.classList.contains('ink')), heard: () => heard};
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') window.storyBook = hook;
  return hook;
})();
