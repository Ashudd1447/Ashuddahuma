/* Offline copy of the site. Pages open from the saved copy at once, and each
   visit quietly saves newer files for next time, so a deploy shows up on the
   second launch. On localhost the newest files come first, so edits show on
   reload.
   Every page, photo, recording and font the pages use belongs in FILES. One
   that is missing still gets saved the first time it is used. */
const CACHE = 'ashudd-v14';
const FILES = [
  '/',
  '/reading.html',
  '/fatihah.html',
  '/games.html',
  '/blocks.html',
  '/clock.html',
  '/drive.html',
  '/build.html',
  '/making.html',
  '/factory.html',
  '/mazes.html',
  '/typing.html',
  '/credits.html',
  '/404.html',
  '/css/style.css',
  '/js/app.js',
  '/js/sound.js',
  '/js/reading.js',
  '/js/recite.js',
  '/js/timing.js',
  '/js/account.js',
  '/js/blocks.js',
  '/js/clock.js',
  '/js/drive.js',
  '/js/desert.js',
  '/js/build.js',
  '/js/chase.js',
  '/js/gear.js',
  '/js/factory.js',
  '/js/mazes.js',
  '/js/typing-engine.js',
  '/js/typing.js',
  '/quran/fatihah.json',
  '/dua/riding.json',
  '/mazes/mazes.json',
  '/typing/layouts.json',
  '/typing/stats.json',
  '/typing/words.json',
  '/audio/fatihah.timings.json',
  '/fonts/NotoNaskhArabic.woff2',
  '/fonts/ScheherazadeNew.woff2',
  '/fonts/UthmanicHafs1-Ver09.otf',
  '/images/logo.webp',
  '/images/lion.jpg',
  '/images/rabbit.jpg',
  '/images/door.jpg',
  '/images/house.jpg',
  '/images/mosque.jpg',
  '/images/kaaba.jpg',
  '/images/drive/acacia.svg',
  '/images/drive/atv.svg',
  '/images/drive/bakery.svg',
  '/images/drive/boulder.svg',
  '/images/drive/boy.svg',
  '/images/drive/camel.svg',
  '/images/drive/cart.svg',
  '/images/drive/eagle.svg',
  '/images/drive/felucca.svg',
  '/images/drive/fox.svg',
  '/images/drive/gazelle.svg',
  '/images/drive/grand-house.svg',
  '/images/drive/grandma.svg',
  '/images/drive/house-a.svg',
  '/images/drive/house-b.svg',
  '/images/drive/house-c.svg',
  '/images/drive/lamp.svg',
  '/images/drive/man.svg',
  '/images/drive/masjid.svg',
  '/images/drive/masjid-big.svg',
  '/images/drive/palm.svg',
  '/images/drive/rocks.svg',
  '/images/drive/shrub.svg',
  '/images/drive/tent.svg',
  '/images/drive/tower.svg',
  '/images/drive/tree.svg',
  '/images/drive/well.svg',
  '/images/drive/woman.svg',
  '/images/day/boy.webp',
  '/images/day/wake.webp',
  '/images/day/breakfast.webp',
  '/images/day/quran.webp',
  '/images/day/play.webp',
  '/images/day/lunch.webp',
  '/images/day/nap.webp',
  '/images/day/park.webp',
  '/images/day/dinner.webp',
  '/images/day/teeth.webp',
  '/images/day/bed.webp',
  '/audio/lion.m4a',
  '/audio/rabbit.m4a',
  '/audio/door.m4a',
  '/audio/house.m4a',
  '/audio/mosque.m4a',
  '/audio/kaaba.m4a',
  '/audio/read.m4a',
  '/audio/match.m4a',
  '/audio/well-done.m4a',
  '/audio/adhan-1.mp3',
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
