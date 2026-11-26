/* Quran text is stored exactly as the Quran.com API gives it. The Mushaf font
   draws the sukoon on U+06E1 and the silent-letter circle on U+0652, so the
   two are swapped for display only, never in the stored text. Its digits
   already sit inside the ayah ornament, so the end-of-ayah sign U+06DD is
   dropped before them. */
function mushafText(text) {
  return text
    .replace(/۝(?=[٠-٩])/g, '')
    .replace(/[ْ۟]/g, (mark) => (mark === 'ْ' ? 'ۡ' : 'ْ'));
}

for (const element of document.querySelectorAll('.quran')) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) node.data = mushafText(node.data);
}

/* Keep the screen on while the site is in use. After 5 minutes with no touch,
   click or key press, let go so the device sleeps on its own schedule.
   Browsers without the Wake Lock API, and installed iPhone/iPad apps before
   iOS 18.4, simply skip this. */
const IDLE_LIMIT = 5 * 60 * 1000;
let screenLock = null;
let asking = false;
let idleTimer = null;

async function keepScreenOn() {
  if (screenLock || asking || !('wakeLock' in navigator) || document.hidden) return;
  asking = true;
  try {
    screenLock = await navigator.wakeLock.request('screen');
    screenLock.addEventListener('release', () => { screenLock = null; });
  } catch {
    // Refused, for example in battery saver. The next touch tries again.
  }
  asking = false;
}

function letScreenSleep() {
  if (screenLock) screenLock.release();
}

function onActivity() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(letScreenSleep, IDLE_LIMIT);
  keepScreenOn();
}

addEventListener('pointerdown', onActivity, { capture: true, passive: true });
addEventListener('keydown', onActivity, { capture: true, passive: true });
/* The browser drops the lock when the page is hidden; coming back counts as activity. */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) onActivity();
});
onActivity();

/* Offline copy, see sw.js. The browser is asked to keep it even when the
   device runs short of space (Android) or the site goes unused for a while:
   Chrome, Edge and Safari decide by themselves, without asking anyone;
   Firefox would show a question, so it is not asked there. */
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
if (navigator.storage && navigator.storage.persist && !/Firefox\//.test(navigator.userAgent)) {
  navigator.storage.persisted().then((kept) => kept || navigator.storage.persist()).catch(() => {});
}

/* The version this device runs, at the foot of the home page, so the family
   can tell which one they have: the time of the deploy (CACHE in sw.js,
   stamped by tools/prepare-deploy.py), shown as a date and an hour in the
   device's own time zone; the father asked for a date, not a number. It is
   asked of the service worker that serves the page; before one answers (a
   first visit, or an older one that does not answer yet), it is read from
   sw.js itself. An older copy still named by a number shows that number. */
const MONTHS = ['يَنَايِر', 'فِبْرَايِر', 'مَارِس', 'أَبْرِيل', 'مَايُو', 'يُونْيُو', 'يُولْيُو', 'أَغُسْطُس', 'سِبْتَمْبِر', 'أُكْتُوبَر', 'نُوفَمْبِر', 'دِيسَمْبِر'];
const arabicDigits = (text) => String(text).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
const versionLine = document.getElementById('version');
if (versionLine) {
  let shown = false;
  const showVersion = (name) => {
    if (shown || !name) return;
    const at = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})Z$/.exec(name);
    const n = /v(\d+)$/.exec(name);
    if (!at && !n) return;
    shown = true;
    if (!at) {
      versionLine.textContent = 'الْإِصْدَارُ ' + arabicDigits(n[1]);
      return;
    }
    const when = new Date(Date.UTC(+at[1], at[2] - 1, +at[3], +at[4], +at[5]));
    const hour = `${when.getHours()}:${String(when.getMinutes()).padStart(2, '0')}`;
    versionLine.textContent = `الْإِصْدَارُ: ${arabicDigits(when.getDate())} ${MONTHS[when.getMonth()]} ${arabicDigits(when.getFullYear())}، ${arabicDigits(hour)}`;
  };
  const fromFile = () => fetch('/sw.js').then((r) => r.text()).then((text) => showVersion((/CACHE = '([^']+)'/.exec(text) || [])[1])).catch(() => {});
  const worker = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
  if (worker) {
    navigator.serviceWorker.addEventListener('message', (event) => { if (event.data && event.data.version) showVersion(event.data.version); });
    worker.postMessage('version');
    setTimeout(() => { if (!shown) fromFile(); }, 1500);
  } else fromFile();
}

/* Install button on the home page. Android, and Chrome or Edge on computers,
   offer installing; iPhone and iPad add the app from Safari's Share menu. */
const installButton = document.getElementById('install');
let installPrompt = null;

addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  if (installButton) installButton.hidden = false;
});

addEventListener('appinstalled', () => {
  installPrompt = null;
  if (installButton) installButton.hidden = true;
});

if (installButton) {
  installButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    installButton.hidden = true;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
  });
}

/* The ☰ menu, top right on every page the child sees: the dialect switch for
   the spoken prompts (the text is always Fusha). */
const MENU_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const FLAG = '<svg class="flag" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#CE1126"/><rect y="13.33" width="60" height="13.34" fill="#FFFFFF"/><rect y="26.67" width="60" height="13.33" fill="#000000"/><g fill="#C09300" transform="translate(30 19.6)"><path d="M-2.2 -1.2 C-5 -4.4 -8.4 -3.6 -8.6 -1.4 C-7.6 0.6 -5 1.9 -2.6 2.2 Z"/><path d="M2.2 -1.2 C5 -4.4 8.4 -3.6 8.6 -1.4 C7.6 0.6 5 1.9 2.6 2.2 Z"/><ellipse cx="0" cy="0.6" rx="2.3" ry="3.6"/><circle cx="0" cy="-3.8" r="1.35"/><path d="M-1.1 -4.1 L-2.9 -3.5 L-1.2 -2.9 Z"/><path d="M-1.6 4 H1.6 L2.3 5.8 H-2.3 Z"/><rect x="-3.4" y="5.9" width="6.8" height="1.1" rx="0.4"/><rect x="-1.1" y="-0.6" width="2.2" height="3" rx="0.4" fill="#FFFFFF"/></g></svg>';

function buildMenu() {
  if (document.documentElement.lang !== 'ar') return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'menu-button';
  button.setAttribute('aria-label', 'الْقَائِمَةُ');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = MENU_ICON;
  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.hidden = true;
  menu.innerHTML = `<p class="menu-label" id="dialect-label">لَهْجَةُ التَّعْلِيمَاتِ</p>
    <button class="dialect" id="dialect" type="button" aria-describedby="dialect-label"></button>`;
  document.body.append(button, menu);
  const dialectButton = menu.querySelector('#dialect');
  const renderDialect = () => {
    const masri = typeof sound !== 'undefined' && sound.dialect() === 'masri';
    dialectButton.innerHTML = masri ? FLAG : '<span>فُصْحَى</span>';
    dialectButton.setAttribute('aria-label', masri ? 'مِصْرِي' : 'فُصْحَى');
  };
  const open = (on) => {
    menu.hidden = !on;
    button.setAttribute('aria-expanded', String(on));
    if (on) renderDialect();
  };
  button.addEventListener('click', () => open(menu.hidden));
  dialectButton.addEventListener('click', () => {
    if (typeof sound === 'undefined') return;
    const next = sound.dialect() === 'masri' ? 'fusha' : 'masri';
    sound.setDialect(next);
    renderDialect();
    sound.play(next);
  });
  document.addEventListener('pointerdown', (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) open(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') open(false);
  });
}

buildMenu();

/* The ✕ at the top of every page but the home page leaves it: a game for the
   games hub (the building game and the car factory for their own door, and
   that door for the hub), a game behind one of the home page's own doors
   (Arabic, prayer, numbers, the lab, sports) for that door, a story for the shelf of
   stories, anything else, those doors too, for the home page. A page may take
   the click first: the driving games leave a drive before they leave the page. */
function buildExit() {
  if (document.documentElement.lang !== 'ar') return;
  const page = location.pathname.split('/').pop().replace(/\.html$/, '');
  if (!page || page === 'index') return;
  const link = document.createElement('a');
  link.className = 'exit-button';
  link.id = 'exit';
  const hub = 'games.html';
  link.href = {
    blocks: hub, clock: hub, drive: hub, making: hub, mazes: hub, typing: hub, think: hub,
    build: 'making.html', factory: 'making.html', light: 'lab.html', archery: 'sports.html', qibla: 'salah.html', wudu: 'salah.html', pray: 'salah.html', prayers: 'salah.html',
    /* A worksheet game belongs to one of two doors; sheets.js points this at the right one once it knows the game. */
    sheet: 'numbers.html', match: 'numbers.html',
    reading: 'arabic.html', where: 'arabic.html',
    story: 'stories.html',
  }[page] || '/';
  link.setAttribute('aria-label', 'خُرُوجٌ');
  link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>';
  document.body.append(link);
}

buildExit();
