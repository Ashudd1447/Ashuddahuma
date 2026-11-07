# Ashuddahuma

An Islamic homeschool site for a 4-year-old, built by his parents. The curriculum is in `Ashuddahuma Homeschool — Curriculum Outline (Age 4) V2.pdf`, one folder above this repo.

- Live site: https://ashudd.web.app
- Firebase project: `ashudd-1b0dc`, hosting site `ashudd`
- GitHub: `Ashudd1447/Ashuddahuma` (public)
- Deploy: `firebase deploy --only hosting` from this folder

## Working with the parents

- Run all content past them before it goes in: photos, wording, voweling, audio. The parents give the outline and structure; content may be drafted or generated with AI tools, then a parent reviews and approves it. Nothing the child sees goes in on Claude's own initiative.
- Ask clarifying questions and consult often. Bring options with a recommendation.
- Do not commit, push, or deploy without their go-ahead.

## Content rules

- No music. Chimes for praise and a soft buzzer for errors are approved.
- Photos of people and animals may show faces. Graphics (figures, icons) must not show facial features: a plain face, with hands, clothes and other details drawn. Images may be photographs or made with AI tools (ChatGPT, Recraft) once a parent approves them. Wikimedia photos need a credit on `المصادر`; generated ones do not.
- No churches or other non-Islamic religious buildings in photos. Check the source file name and page, not just the picture.
- Everything the child sees is in Arabic, with no English. Two exceptions: the `المصادر` page, where names and license codes may stay in Latin letters, and the admin pages, which are in English.
- Modern Standard Arabic spelling everywhere except Quran text: the circular sukoon, no dagger alif, and so on. Words the child reads are fully voweled, buttons and menu labels included (`اِسْتَمِعْ`, `أَعِدِ الْآيَةَ`, `الْآيَةُ التَّالِيَةُ`, `فُصْحَى`).
- Exceptions in the reading game: `أحسنت` is displayed with no vowel marks and recorded with a sukoon on the ت, so it is gender neutral. The prompts `اقرأ` and `اسحب كل صورة إلى كلمتها` and the title `معلم القراءة` appear exactly as the parents wrote them.
- Two dialects, one text. On-screen text is always Fusha. A spoken prompt may exist in Fusha (`audio/<name>`) and Egyptian (`audio/<name>-masri`); the dialect switch in the ☰ menu (showing `فُصْحَى` or the Egyptian flag, and saying `فصحى` / `مصري` when tapped) picks which one plays, and `sound.say(name)` falls back to Fusha when the Egyptian clip is missing. Egyptian text appears only in `record.html`, to be read aloud. Counting and every other spoken prompt follow this rule unless the parents specify one dialect.
- The installed app is named `أَشُدَّهُمَا`. The home page tab title stays `معلم القراءة`.
- Quran text is copied from a verified source, never typed by hand, and never altered. Ayah 18:82 comes from the `text_uthmani` field of the Quran.com API, with the word `أشدهما` in gold. Surah titles are the one piece of Quranic-style text typed by hand, in Uthmani spelling and the Mushaf font: `سُورَةُ ٱلْفَاتِحَةِ`.
- The Mushaf font draws the khaa-head sukoon on U+06E1 and the silent-letter circle on U+0652, while the Quran.com text writes the sukoon as U+0652; its digits already sit inside the ayah ornament, so U+06DD before a number draws a second, empty one. `mushafText()` in `app.js` swaps and drops these for display only. The stored text and the HTML keep the API's characters. Ayah numbers in the Mushaf font are the bare Arabic-Indic digits.

## Code

Plain HTML, CSS, and JavaScript in `public/`, with no build step and nothing to install.

- `index.html`: logo, ayah 18:82, a card for each game, and the install button
- `reading.html`, `js/reading.js`: the reading game (picture grid, practice, matching, praise)
- `fatihah.html`, `js/recite.js`: the reciter, with two modes chosen by the tabs at the top and remembered on the device. `السُّورَةُ كَامِلَةً`: one button (`اِسْتَمِعْ` / `قِفْ`) plays the surah through. `آيَةً آيَةً`: each ayah in the list carries a play sign; a tap plays it, then the prompt `الْآنَ اقْرَأْهَا أَنْتَ` shows and is spoken (`sound.say('read-it')`), and `أَعِدِ الْآيَةَ` / `الْآيَةُ التَّالِيَةُ` move on; the last ayah has no "next" and there is no praise screen. In both modes the whole surah sits on top and the ayah being played shows big below with each word lit from the recording's clock. The page reads `quran/<surah>.json` and `audio/<surah>.timings.json`.
- `quran/<surah>.json`: the surah text, written by a script from the Quran.com API (`text_uthmani`, word by word). Never edit it by hand.
- `audio/<surah>.timings.json`: per ayah, the second at which each word begins plus the end of the clip (words + 1 numbers), made with `timing.html`. An ayah without timings lights whole. The same shape, with one number per letter, will serve letter-by-letter highlighting later.
- `js/sound.js`: all sound. Recordings are fetched and decoded ahead of the tap and played through Web Audio, which is what cured the tap-to-sound lag (ported from IQRA). A name without an extension is looked for as `.m4a` then `.wav`. One clip plays at a time; a missing clip stays silent. `sound.current().position()` is the clock the highlighting runs on. The dialect setting (`sound.dialect()`, `setDialect()`, `say()`, `preloadPrompts()`) lives here too, in `localStorage`.
- `js/app.js`: loaded by every page. `mushafText()` prepares Quran text for the Mushaf font (see Content rules). Keeps the screen on and lets it sleep after 5 minutes without a touch (installed iPhone/iPad apps need iOS 18.4). Registers the offline copy. Shows the `تَثْبِيتُ التَّطْبِيقِ` button on the home page when the browser offers installing: Android, and Chrome or Edge on computers, never iPhone or iPad. Builds the ☰ menu at the top right of every Arabic page (the dialect switch and the lock to the admin pages) and holds `gate()`, the PIN sheet.
- Admin pages, English, not linked from the site, behind the PIN: `admin.html` (also served at `/admin` by a hosting rewrite in `firebase.json`), `js/admin.js` (the guard, unlocked per browser session), `css/admin.css`. The PIN's SHA-256 is `ADMIN_PIN_HASH` in `app.js`; the admin page can set a per-browser PIN in `localStorage`. Nothing on the server is behind the PIN: the tools only write files on the admin's computer. These pages are not precached by `sw.js`.
- `record.html`, `js/record.js`: the recording tool. One card per clip the site plays (Egyptian cards next to their Fusha ones), raw microphone capture (no echo cancellation, noise suppression or auto gain), silence trimmed, written as 16-bit mono WAV at 22,050 Hz into `public/audio` through the folder picker (Chrome or Edge on a computer) or downloaded. Add a card for every new clip.
- `timing.html`: the word-timing tool. Play an ayah and tap at each word; download the timings file.
- `strokes.html`, `js/strokes.js`, `js/tracing.js`: the stroke editor for the tracing lesson. The admin draws each letter's strokes, in order and direction, on the Noto Naskh glyph (a drag is a stroke, a tap is a dot; the hamza is drawn, not tapped) and writes `tracing/strokes.json`: strokes in board units (0 to 1 of the square) plus the glyph's ink box. `tracing.js` holds the layout rule (ink box fills at most 0.72 of the board, centered) that the lesson must share so the strokes land on the same glyph.
- `sw.js`: the offline copy. Add every new page, photo, recording, or font to `FILES`. Saved files open first and update in the background, so a deploy shows up on the second launch. On localhost the newest files come first.
- `manifest.webmanifest`, `icons/`: the installed app's name, colors, and icons, made from `images/logo.webp`. iPhone and iPad cache icons hard, so a replaced icon needs a new file name.
- `credits.html`: `المصادر`, the required photo credits. Update it whenever a photo changes.
- `audio/<name>.m4a` or `.wav`: the parents' own recordings (`.m4a` from a phone, `.wav` from `record.html`). The games play them by name, and a missing clip stays silent. Add every new clip to `FILES` in `sw.js`. Clip names so far: the six words, `read`, `match`, `well-done`; `fatihah-1` to `fatihah-7`; `read-it` / `read-it-masri`; `fusha` / `masri`; `jump` / `jump-masri`, `count-1` to `count-7` (+ `-masri`); `father`, `mother`, `brother`, `alif-name`, `alif-sound`. Only the first nine exist; the rest are cards waiting to be recorded.
- `images/<name>.jpg`: Wikimedia Commons photos, cropped to square by CSS. To be replaced by approved generated images; the Kaaba and the Prophet's mosque are the ones most likely to stay real.
- `fonts/`: KFGQPC Uthmanic Script HAFS (`UthmanicHafs1-Ver09.otf`) for Quran text, the `.quran` class. Its license allows copying and serving the original file but forbids changing it: never subset it or convert it to WOFF2, and keep `KFGQPC-LICENSE.txt` beside it. Noto Naskh Arabic for everything else (the parents' choice), Scheherazade New as the Quran fallback (both SIL Open Font License).

Pages must work at phone, tablet, and computer sizes, right to left. Wrong matches vibrate on touch devices that support it (not iPhone or iPad) and otherwise play the buzzer.

The parents work on Windows and Mac. `.gitattributes` keeps LF line endings everywhere. Keep file names lowercase: both computers ignore case, but the live server does not.

The IQRA app (`C:\Claude Projects\Arabic App\1447 H` on Kareem's PC, React + TypeScript) is the source of the sound, highlighting, recording and tracing designs. Port ideas and data shapes from it; never copy its React code.

## Planned

- Record the Fatihah ayat, the prompts and the counting with `record.html`, then time the words with `timing.html`; draw the letter strokes with `strokes.html`.
- The movement activity: `اقْفِزْ سَبْعَ مَرَّاتٍ!` on screen, the order and the counting spoken in the chosen dialect, a faceless boy figure (Recraft, three poses) animated in code so each jump lands on the count, the number shown on screen.
- The reading-card routine for unit 1 (`أَبْ`, `أُمّ`, `أَخْ`, with generic images): look and say, fade, name to sound, tap and say with letter highlighting, trace on screen with the strokes file (the geometry ported from IQRA's lesson 30), then a prompt to trace in the salt tray.
- Replace the Wikimedia photos with approved generated images and drop their credits, then the rest of the curriculum, following the outline.
