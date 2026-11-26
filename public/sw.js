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
const CACHE = 'ashudd-2026-11-26T16:37Z'; // the version: the time of the deploy, stamped by tools/prepare-deploy.py; the home page shows it as a date
const FILES = [
  '/',
  '/arabic.html',
  '/reading.html',
  '/where.html',
  '/js/where.js',
  '/js/where-words.js',
  '/css/where.css',
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
  '/images/reading/lion.webp',
  '/images/reading/rabbit.webp',
  '/images/reading/door.webp',
  '/images/reading/house.webp',
  '/images/reading/mosque.webp',
  '/images/reading/kaaba.webp',
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
  '/audio/fatihah-1.wav',
  '/audio/fatihah-2.wav',
  '/audio/fatihah-3.wav',
  '/audio/fatihah-4.wav',
  '/audio/fatihah-5.wav',
  '/audio/fatihah-6.wav',
  '/audio/fatihah-7.wav',
  '/audio/read-it.wav',
  '/audio/read-it-masri.wav',
  '/audio/fusha.wav',
  '/audio/masri.wav',
  '/audio/mashaallah.wav',
  '/audio/count-1.wav',
  '/audio/count-1-masri.wav',
  '/audio/count-2.wav',
  '/audio/count-2-masri.wav',
  '/audio/count-3.wav',
  '/audio/count-3-masri.wav',
  '/audio/count-4.wav',
  '/audio/count-4-masri.wav',
  '/audio/count-5.wav',
  '/audio/count-5-masri.wav',
  '/audio/count-6.wav',
  '/audio/count-6-masri.wav',
  '/audio/count-7.wav',
  '/audio/count-7-masri.wav',
  '/audio/count-8.wav',
  '/audio/count-8-masri.wav',
  '/audio/count-9.wav',
  '/audio/count-9-masri.wav',
  '/audio/count-10.wav',
  '/audio/count-10-masri.wav',
  '/audio/hour-1.wav',
  '/audio/hour-1-masri.wav',
  '/audio/hour-2.wav',
  '/audio/hour-2-masri.wav',
  '/audio/hour-3.wav',
  '/audio/hour-3-masri.wav',
  '/audio/hour-4.wav',
  '/audio/hour-4-masri.wav',
  '/audio/hour-5.wav',
  '/audio/hour-5-masri.wav',
  '/audio/hour-6.wav',
  '/audio/hour-6-masri.wav',
  '/audio/hour-7.wav',
  '/audio/hour-7-masri.wav',
  '/audio/hour-8.wav',
  '/audio/hour-8-masri.wav',
  '/audio/hour-9.wav',
  '/audio/hour-9-masri.wav',
  '/audio/hour-10.wav',
  '/audio/hour-10-masri.wav',
  '/audio/hour-11.wav',
  '/audio/hour-11-masri.wav',
  '/audio/hour-12.wav',
  '/audio/hour-12-masri.wav',
  '/audio/where-apple-in-basket.wav',
  '/audio/where-apple-in-basket-masri.wav',
  '/audio/where-apple-on-table.wav',
  '/audio/where-apple-on-table-masri.wav',
  '/audio/where-apple-under-tree.wav',
  '/audio/where-apple-under-tree-masri.wav',
  '/audio/where-ball-behind-basket.wav',
  '/audio/where-ball-behind-basket-masri.wav',
  '/audio/where-ball-beside-box.wav',
  '/audio/where-ball-beside-box-masri.wav',
  '/audio/where-ball-between-box.wav',
  '/audio/where-ball-between-box-masri.wav',
  '/audio/where-ball-front-box.wav',
  '/audio/where-ball-front-box-masri.wav',
  '/audio/where-ball-in-box.wav',
  '/audio/where-ball-in-box-masri.wav',
  '/audio/where-ball-under-table.wav',
  '/audio/where-ball-under-table-masri.wav',
  '/audio/where-balloon-above-table.wav',
  '/audio/where-balloon-above-table-masri.wav',
  '/audio/where-bird-above-tree.wav',
  '/audio/where-bird-above-tree-masri.wav',
  '/audio/where-bird-on-tree.wav',
  '/audio/where-bird-on-tree-masri.wav',
  '/audio/where-car-behind-house.wav',
  '/audio/where-car-behind-house-masri.wav',
  '/audio/where-car-beside-house.wav',
  '/audio/where-car-beside-house-masri.wav',
  '/audio/where-car-between-tree.wav',
  '/audio/where-car-between-tree-masri.wav',
  '/audio/where-car-front-house.wav',
  '/audio/where-car-front-house-masri.wav',
  '/audio/where-cat-behind-box.wav',
  '/audio/where-cat-behind-box-masri.wav',
  '/audio/where-cat-beside-basket.wav',
  '/audio/where-cat-beside-basket-masri.wav',
  '/audio/where-cat-between-chair.wav',
  '/audio/where-cat-between-chair-masri.wav',
  '/audio/where-cat-front-basket.wav',
  '/audio/where-cat-front-basket-masri.wav',
  '/audio/where-cat-in-box.wav',
  '/audio/where-cat-in-box-masri.wav',
  '/audio/where-cat-on-chair.wav',
  '/audio/where-cat-on-chair-masri.wav',
  '/audio/where-cat-under-chair.wav',
  '/audio/where-cat-under-chair-masri.wav',
  '/audio/where-plane-above-house.wav',
  '/audio/where-plane-above-house-masri.wav',
  '/audio/where-put.wav',
  '/audio/where-put-masri.wav',
  '/audio/where-q-apple.wav',
  '/audio/where-q-apple-masri.wav',
  '/audio/where-q-ball.wav',
  '/audio/where-q-ball-masri.wav',
  '/audio/where-q-balloon.wav',
  '/audio/where-q-balloon-masri.wav',
  '/audio/where-q-bird.wav',
  '/audio/where-q-bird-masri.wav',
  '/audio/where-q-car.wav',
  '/audio/where-q-car-masri.wav',
  '/audio/where-q-cat.wav',
  '/audio/where-q-cat-masri.wav',
  '/audio/where-q-gift.wav',
  '/audio/where-q-gift-masri.wav',
  '/audio/where-q-plane.wav',
  '/audio/where-q-plane-masri.wav',
  '/audio/where-which.wav',
  '/audio/where-which-masri.wav',
  '/audio/where-word-above.wav',
  '/audio/where-word-above-masri.wav',
  '/audio/where-word-behind.wav',
  '/audio/where-word-behind-masri.wav',
  '/audio/where-word-beside.wav',
  '/audio/where-word-beside-masri.wav',
  '/audio/where-word-between.wav',
  '/audio/where-word-between-masri.wav',
  '/audio/where-word-front.wav',
  '/audio/where-word-front-masri.wav',
  '/audio/where-word-in.wav',
  '/audio/where-word-in-masri.wav',
  '/audio/where-word-on.wav',
  '/audio/where-word-on-masri.wav',
  '/audio/where-word-under.wav',
  '/audio/where-word-under-masri.wav',
  '/archery.html',
  '/css/archery.css',
  '/css/light.css',
  '/css/prayers.css',
  '/css/salah.css',
  '/css/sheets.css',
  '/dua/archery.json',
  '/images/doors/microscope.webp',
  '/images/doors/numbers.webp',
  '/images/doors/think.webp',
  '/images/mazes/balloon.png',
  '/images/mazes/bike.png',
  '/images/mazes/bus.png',
  '/images/mazes/car.png',
  '/images/mazes/cloud.png',
  '/images/mazes/house.png',
  '/images/mazes/masjid.png',
  '/images/mazes/plane.png',
  '/images/mazes/sun.png',
  '/images/mazes/tree.png',
  '/images/salah/itidal.webp',
  '/images/salah/julus.webp',
  '/images/salah/qiyam.webp',
  '/images/salah/ruku.webp',
  '/images/salah/salam-left.webp',
  '/images/salah/salam-right.webp',
  '/images/salah/sujud.webp',
  '/images/salah/takbir.webp',
  '/images/salah/tashahhud.webp',
  '/images/salah/time-asr.webp',
  '/images/salah/time-dhuhr.webp',
  '/images/salah/time-fajr.webp',
  '/images/salah/time-isha.webp',
  '/images/salah/time-maghrib.webp',
  '/images/salah/wudu-arm-left.webp',
  '/images/salah/wudu-arm-right.webp',
  '/images/salah/wudu-bismillah.webp',
  '/images/salah/wudu-ears.webp',
  '/images/salah/wudu-face.webp',
  '/images/salah/wudu-foot-left.webp',
  '/images/salah/wudu-foot-right.webp',
  '/images/salah/wudu-hands.webp',
  '/images/salah/wudu-head.webp',
  '/images/salah/wudu-mouth.webp',
  '/images/salah/wudu-nose.webp',
  '/images/sports/archer.webp',
  '/js/archery.js',
  '/js/light.js',
  '/js/pray.js',
  '/js/prayers.js',
  '/js/qibla.js',
  '/js/salah.js',
  '/js/sheets.js',
  '/js/wudu.js',
  '/lab.html',
  '/light.html',
  '/numbers.html',
  '/match.html',
  '/js/match.js',
  '/images/hands/hand-1.webp',
  '/images/hands/hand-2.webp',
  '/images/hands/hand-3.webp',
  '/images/hands/hand-4.webp',
  '/images/hands/hand-5.webp',
  '/css/match.css',
  '/pray.html',
  '/prayers.html',
  '/qibla.html',
  '/salah.html',
  '/salah/azkar.json',
  '/sheet.html',
  '/sheets/img/apple-brown.png',
  '/sheets/img/apple-green.png',
  '/sheets/img/apple-red.png',
  '/sheets/img/apple-shadow.png',
  '/sheets/img/ball.png',
  '/sheets/img/balloon-green.png',
  '/sheets/img/balloon-purple.png',
  '/sheets/img/balloon-red.png',
  '/sheets/img/balloon-shadow.png',
  '/sheets/img/banana-shadow.png',
  '/sheets/img/banana.png',
  '/sheets/img/bicycle-shadow.png',
  '/sheets/img/bicycle.png',
  '/sheets/img/boat-shadow.png',
  '/sheets/img/boat.png',
  '/sheets/img/bus-shadow.png',
  '/sheets/img/bus.png',
  '/sheets/img/car-blue.png',
  '/sheets/img/car-purple.png',
  '/sheets/img/car-red.png',
  '/sheets/img/car-shadow.png',
  '/sheets/img/cloud.png',
  '/sheets/img/cup-blue.png',
  '/sheets/img/cup-pink.png',
  '/sheets/img/cup-shadow.png',
  '/sheets/img/cupcake-blue.png',
  '/sheets/img/cupcake-green.png',
  '/sheets/img/cupcake-pink.png',
  '/sheets/img/flower.png',
  '/sheets/img/gift.png',
  '/sheets/img/grapes.png',
  '/sheets/img/house-shadow.png',
  '/sheets/img/house.png',
  '/sheets/img/ice-cream-shadow.png',
  '/sheets/img/ice-cream.png',
  '/sheets/img/kite-shadow.png',
  '/sheets/img/kite.png',
  '/sheets/img/lantern-shadow.png',
  '/sheets/img/lantern.png',
  '/sheets/img/moon-shadow.png',
  '/sheets/img/moon.png',
  '/sheets/img/mosque-shadow.png',
  '/sheets/img/mosque.png',
  '/sheets/img/mushaf.png',
  '/sheets/img/orange.png',
  '/sheets/img/pear.png',
  '/sheets/img/plane-shadow.png',
  '/sheets/img/plane.png',
  '/sheets/img/pot-shadow.png',
  '/sheets/img/pot.png',
  '/sheets/img/prayer-rug.png',
  '/sheets/img/star-shadow.png',
  '/sheets/img/star.png',
  '/sheets/img/strawberry-shadow.png',
  '/sheets/img/strawberry.png',
  '/sheets/img/suitcase.png',
  '/sheets/img/sun.png',
  '/sheets/img/teapot-blue.png',
  '/sheets/img/teapot-green.png',
  '/sheets/img/teapot-pink.png',
  '/sheets/img/teapot-shadow.png',
  '/sheets/img/tree.png',
  '/sheets/img/umbrella-blue.png',
  '/sheets/img/umbrella-green.png',
  '/sheets/img/umbrella-purple.png',
  '/sheets/img/umbrella-shadow.png',
  '/sheets/sheets.json',
  '/sports.html',
  '/think.html',
  '/wudu.html',
  '/404.html',
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

/* The home page asks which version this device runs, to show it at its foot. */
self.addEventListener('message', (event) => {
  if (event.data === 'version' && event.source) event.source.postMessage({ version: CACHE });
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
