/* Offline copy of the site. Pages open from the saved copy at once, and each
   visit quietly saves newer files for next time, so a deploy shows up on the
   second launch. On localhost the newest files come first, so edits show on
   reload.
   Every page, photo, recording and font the pages use belongs in FILES. One
   that is missing still gets saved the first time it is used. */
const CACHE = 'ashudd-v1';
const FILES = [
  '/',
  '/reading.html',
  '/credits.html',
  '/404.html',
  '/css/style.css',
  '/js/app.js',
  '/js/reading.js',
  '/fonts/NotoNaskhArabic.woff2',
  '/fonts/ScheherazadeNew.woff2',
  '/images/logo.webp',
  '/images/lion.jpg',
  '/images/rabbit.jpg',
  '/images/door.jpg',
  '/images/house.jpg',
  '/images/mosque.jpg',
  '/images/kaaba.jpg',
  '/audio/lion.m4a',
  '/audio/rabbit.m4a',
  '/audio/door.m4a',
  '/audio/house.m4a',
  '/audio/mosque.m4a',
  '/audio/kaaba.m4a',
  '/audio/read.m4a',
  '/audio/match.m4a',
  '/audio/well-done.m4a',
];
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(FILES.map((file) => cache.add(new Request(file, { cache: 'reload' })))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith(respond(event));
});

async function respond(event) {
  const { request } = event;
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  const fresh = save(cache, request.url);
  event.waitUntil(fresh.catch(() => {}));
  if (cached && !LOCAL) return answer(request, cached);
  try {
    return await (request.headers.has('range') ? fetch(request) : fresh);
  } catch (error) {
    if (cached) return answer(request, cached);
    if (request.mode === 'navigate') return cache.match('/404.html');
    throw error;
  }
}

async function save(cache, url) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (response.ok) await cache.put(url, response.clone());
  return response;
}

/* Audio is fetched in byte ranges, and iPhone and iPad play it only from a
   206 reply, so a saved recording is cut to the range asked for. */
async function answer(request, response) {
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  if (!range) return response;
  const blob = await response.blob();
  const start = range[1] ? Number(range[1]) : Math.max(blob.size - Number(range[2]), 0);
  const end = range[1] && range[2] ? Math.min(Number(range[2]), blob.size - 1) : blob.size - 1;
  if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${blob.size}`,
      'Content-Length': String(end - start + 1),
    },
  });
}
