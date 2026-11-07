# Ashuddahuma

An Islamic homeschool site for a 4-year-old, built by his parents. The curriculum is in `Ashuddahuma Homeschool — Curriculum Outline (Age 4) V2.pdf`, one folder above this repo.

- Live site: https://ashudd.web.app
- Firebase project: `ashudd-1b0dc`, hosting site `ashudd`
- GitHub: `Ashudd1447/Ashuddahuma` (public)
- Deploy: `firebase deploy --only hosting` from this folder

## Working with the parents

- Run all content past them before creating it: photos, wording, voweling, audio. This must not feel like AI-generated content.
- Ask clarifying questions and consult often. Bring options with a recommendation.
- Do not commit, push, or deploy without their go-ahead.

## Content rules

- No music. Chimes for praise and a soft buzzer for errors are approved.
- Use real photographs. Photos of people and animals may show faces. Graphics must not show facial features. Do not use AI-generated images.
- No churches or other non-Islamic religious buildings in photos. Check the source file name and page, not just the picture.
- Everything the child sees is in Arabic, with no English. The `المصادر` page is the one exception: names and license codes may stay in Latin letters.
- Modern Standard Arabic spelling everywhere except Quran ayat: the circular sukoon, no dagger alif, and so on. Words the child reads are fully voweled.
- Exceptions in the reading game: `أحسنت` is displayed with no vowel marks and recorded with a sukoon on the ت, so it is gender neutral. The prompts `اقرأ` and `اسحب كل صورة إلى كلمتها` and the title `معلم القراءة` appear exactly as the parents wrote them.
- The installed app is named `أَشُدَّهُمَا`. The home page tab title stays `معلم القراءة`.
- Quran text is copied from a verified source, never typed by hand, and never altered. Ayah 18:82 comes from the `text_uthmani` field of the Quran.com API, with the word `أشدهما` in gold.
- The Mushaf font draws the khaa-head sukoon on U+06E1 and the silent-letter circle on U+0652, while the Quran.com text writes the sukoon as U+0652; its digits already sit inside the ayah ornament, so U+06DD before a number draws a second, empty one. `mushafText()` in `app.js` swaps and drops these for display only. The stored text and the HTML keep the API's characters. Ayah numbers in the Mushaf font are the bare Arabic-Indic digits.

## Code

Plain HTML, CSS, and JavaScript in `public/`, with no build step and nothing to install.

- `index.html`: logo, ayah 18:82, a card for each game, and the install button
- `reading.html`, `js/reading.js`: the reading game (picture grid, practice, matching, praise)
- `fatihah.html`, `js/recite.js`: the reciter. The whole surah on top, the ayah being played below with each word lit from the recording's clock. Tapping an ayah plays it, then shows and plays the prompt `الآن اقرأها أنت` / `دلوقتي اقراها أنت`; `التالي` moves on and the last ayah ends in the praise; `استمع` plays the surah through. The page reads `quran/<surah>.json` and `audio/<surah>.timings.json`.
- `quran/<surah>.json`: the surah text, written by a script from the Quran.com API (`text_uthmani`, word by word). Never edit it by hand.
- `audio/<surah>.timings.json`: per ayah, the second at which each word begins plus the end of the clip (words + 1 numbers), made with `timing.html`. An ayah without timings lights whole. The same shape, with one number per letter, will serve letter-by-letter highlighting later.
- `js/sound.js`: all sound. Recordings are fetched and decoded ahead of the tap and played through Web Audio, which is what cured the tap-to-sound lag (ported from IQRA). A name without an extension is looked for as `.m4a` then `.wav`. One clip plays at a time; a missing clip stays silent. `sound.current().position()` is the clock the highlighting runs on.
- `js/app.js`: loaded by every page. `mushafText()` prepares Quran text for the Mushaf font (see Content rules). Keeps the screen on and lets it sleep after 5 minutes without a touch (installed iPhone/iPad apps need iOS 18.4). Registers the offline copy. Shows the `تَثْبِيتُ التَّطْبِيقِ` button on the home page when the browser offers installing: Android, and Chrome or Edge on computers, never iPhone or iPad.
- `record.html`, `js/record.js`: the parents' recording tool, not linked from the site. One card per clip the site plays, raw microphone capture (no echo cancellation, noise suppression or auto gain), silence trimmed, written as 16-bit mono WAV into `public/audio` through the folder picker (Chrome or Edge on a computer) or downloaded. Add a card for every new clip.
- `timing.html`: the parents' word-timing tool, not linked. Play an ayah and tap at each word; download the timings file.
- `sw.js`: the offline copy. Add every new page, photo, recording, or font to `FILES`. Saved files open first and update in the background, so a deploy shows up on the second launch. On localhost the newest files come first.
- `manifest.webmanifest`, `icons/`: the installed app's name, colors, and icons, made from `images/logo.webp`. iPhone and iPad cache icons hard, so a replaced icon needs a new file name.
- `credits.html`: `المصادر`, the required photo credits. Update it whenever a photo changes.
- `audio/<name>.m4a` or `.wav`: the parents' own recordings (`.m4a` from a phone, `.wav` from `record.html`). The games play them by name, and a missing clip stays silent. Add every new clip to `FILES` in `sw.js`. Clip names so far: the six words, `read`, `match`, `well-done`; `fatihah-1` to `fatihah-7`; `read-it` and `read-it-home` (the reciter prompts, not yet recorded).
- `images/<name>.jpg`: Wikimedia Commons photos, cropped to square by CSS
- `fonts/`: KFGQPC Uthmanic Script HAFS (`UthmanicHafs1-Ver09.otf`) for Quran text, the `.quran` class. Its license allows copying and serving the original file but forbids changing it: never subset it or convert it to WOFF2, and keep `KFGQPC-LICENSE.txt` beside it. Noto Naskh Arabic for everything else, Scheherazade New as the Quran fallback (both SIL Open Font License).

Pages must work at phone, tablet, and computer sizes, right to left. Wrong matches vibrate on touch devices that support it (not iPhone or iPad) and otherwise play the buzzer.

The parents work on Windows and Mac. `.gitattributes` keeps LF line endings everywhere. Keep file names lowercase: both computers ignore case, but the live server does not.

The IQRA app (`C:\Claude Projects\Arabic App\1447 H` on Kareem's PC, React + TypeScript) is the source of the sound, highlighting, recording and tracing designs. Port ideas and data shapes from it; never copy its React code.

## Planned

- Record the Fatihah ayat and the reciter prompts with `record.html`, then time the words with `timing.html`.
- The movement activity (`اقفز سبع مرات!` / `نط سبع مرات`, a jumping figure, counting), the reading-card routine with on-screen tracing (ported from IQRA's lesson 30: strokes must be authored for the Naskh face), and the rest of the curriculum, following the outline.
