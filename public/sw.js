/* Offline copy of the site. Pages open from the saved copy at once, and each
   visit quietly saves newer files for next time, so a deploy shows up on the
   second launch. The data files (.json: a story's text, the surah, the
   mazes, the typing words) are the exception: they come from the network
   first when there is one, so a story's words always match its newest
   recordings (once its new recordings played while the saved text was the
   old one). On localhost the newest files come first, so edits show on
   reload.
   Every page, photo, recording and font the pages use belongs in FILES. One
   that is missing still gets saved the first time it is used.
   A new version downloads only what changed: each file already saved is
   offered to the server with its version tag (ETag), and a file the server
   says is unchanged (304) is copied over from the old copy, so a deploy
   costs a quick question per file rather than the whole site again.
   A page asked for with a query (story.html?s=<id>) is found offline even if
   it was never opened online: the saved page without the query is used. */
const CACHE = 'ashudd-v19';
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
  '/stories.html',
  '/story.html',
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
  '/js/story.js',
  '/quran/fatihah.json',
  '/dua/riding.json',
  '/mazes/mazes.json',
  '/typing/layouts.json',
  '/typing/stats.json',
  '/typing/words.json',
  '/stories/zamzam.json',
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
  '/images/stories/zamzam/cover.webp',
  '/images/stories/zamzam/1.webp',
  '/images/stories/zamzam/2.webp',
  '/images/stories/zamzam/3.webp',
  '/images/stories/zamzam/4.webp',
  '/images/stories/zamzam/5.webp',
  '/images/stories/zamzam/6.webp',
  '/images/stories/zamzam/7.webp',
  '/images/stories/zamzam/8.webp',
  '/images/stories/zamzam/9.webp',
  '/images/stories/zamzam/10.webp',
  '/images/stories/zamzam/11.webp',
  '/images/stories/zamzam/12.webp',
  '/images/stories/zamzam/13.webp',
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
  '/audio/zamzam-title.wav',
  '/audio/zamzam-1.wav',
  '/audio/zamzam-2.wav',
  '/audio/zamzam-3.wav',
  '/audio/zamzam-4.wav',
  '/audio/zamzam-5.wav',
  '/audio/zamzam-6.wav',
  '/audio/zamzam-7.wav',
  '/audio/zamzam-8.wav',
  '/audio/zamzam-9.wav',
  '/audio/zamzam-10.wav',
  '/audio/zamzam-11.wav',
  '/audio/zamzam-12.wav',
  '/audio/zamzam-13.wav',
];
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const DATA = /\.json$/; // read from the network first
const WAIT = 3000; // ms the network has before the saved data file is used

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(FILES.map((file) => fill(cache, file))))
      .then(() => self.skipWaiting()),
  );
});

/* One file into the new copy: kept from the old copy when the server says it
   has not changed since, downloaded afresh otherwise. */
async function fill(cache, file) {
  const old = await caches.match(file, { ignoreVary: true });
  const tag = old && old.headers.get('ETag');
  if (tag) {
    try {
      const response = await fetch(file, { cache: 'no-store', headers: { 'If-None-Match': tag } });
      if (response.status === 304) return cache.put(file, old);
      if (response.ok) return cache.put(file, response);
    } catch {
      return cache.put(file, old); // offline while updating: keep what there is
    }
  }
  return cache.add(new Request(file, { cache: 'reload' }));
}

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
  const cached = await cache.match(request, { ignoreVary: true })
    || (request.mode === 'navigate' ? await cache.match(request, { ignoreVary: true, ignoreSearch: true }) : undefined);
  const fresh = save(cache, request.url);
  event.waitUntil(fresh.catch(() => {}));
  const data = DATA.test(new URL(request.url).pathname);
  if (cached && data) {
    const response = await Promise.race([fresh.catch(() => null), new Promise((resolve) => setTimeout(resolve, WAIT, null))]);
    return response && response.ok ? response : answer(request, cached);
  }
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
