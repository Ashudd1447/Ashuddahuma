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
- Quran text is copied from a verified source, never typed by hand, and never altered. Ayah 18:82 comes from the `text_uthmani` field of the Quran.com API, with the word `أشدهما` in gold.

## Code

Plain HTML, CSS, and JavaScript in `public/`, with no build step and nothing to install.

- `index.html`: logo, ayah 18:82, and a card for each game
- `reading.html`, `js/reading.js`: the reading game (picture grid, practice, matching, praise)
- `credits.html`: `المصادر`, the required photo credits. Update it whenever a photo changes.
- `audio/<name>.m4a`: the parents' own recordings. The game plays them by file name, and a missing clip stays silent.
- `images/<name>.jpg`: Wikimedia Commons photos, cropped to square by CSS
- `fonts/`: Scheherazade New for Quran text, Noto Naskh Arabic for everything else (both SIL Open Font License)

Pages must work at phone, tablet, and computer sizes, right to left. Wrong matches vibrate on touch devices that support it (not iPhone or iPad) and otherwise play the buzzer.

## Planned

- Add the audio intake system built for the parents earlier.
- Later games and the rest of the curriculum, following the outline.
