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

/* Offline copy, see sw.js. */
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
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
