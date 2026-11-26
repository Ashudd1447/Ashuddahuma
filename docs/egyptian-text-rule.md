# Egyptian recordings and the text on screen

**Status, 2026-11-26:** done everywhere, at the father's word ("Apply the Egyptian rule to the other 11 pages now"). The reciter and the clock have their own code; the books' games, the mazes, light, archery, the driving games, the safety gear, the building game and the car factory go through `sound.caption()` in `sound.js`: a label is hidden keeping its room, and a line that is a button or an instruction that stays up becomes a speaker mark that says it again when tapped (his open question about a stand-in for the plain instruction lines, answered by Claude's default: the mark). The salah door (wudu, the prayer, the five prayers, the qibla, the quiz) is no longer in this list: the father took Egyptian out of it altogether the same day, so its sections below are history. The rest of this file is the survey as it was written on 2026-11-25.

Written 2026-11-25, for the father to decide from. Nothing in the games listed here has been changed yet.

## The rule

The father, 2026-11-25:

> Ok to stick to the rule that the app only displays fusha text. However, if I will play the Egyptian dialect recording, the fusha text must disappear to avoid confusion. The text can't read أمام while the voice says قدام.

Until now the site showed the Fusha text always, and the dialect switch in the ☰ menu only chose which recording plays: `sound.say(name)` plays `<name>-masri` when the switch is on Egyptian and that recording exists, and `<name>` otherwise.

## How it is built

Two additions to `public/js/sound.js`, made on 2026-11-25:

- `sound.masri(name)`: a Promise of `true` when the switch is on Egyptian **and** the recording `<name>-masri` exists. A page asks it before it shows a text; on `true` it hides the text and plays the Egyptian recording, on `false` it shows the Fusha text and plays the Fusha recording.
- The event `dialectchange` on `window`, sent when the switch is tapped, so a text already on screen can go or come back at once (the ☰ menu is on every page, so the switch can be tapped in the middle of a game).

In this round they are used in two games only: `أَيْنَ؟` (`where.html`) and the number matching game (`match.html`). Every other game is listed below and waits for the father's decision.

**2026-11-26:** the father recorded `read-it` and the twelve hours in both dialects, so the reciter and the clock follow the rule now (their sections below say how). The count at the end is what is left: 78 texts in 11 pages, 59 of them with other words.

## The switch on the page

Added the same day, at the father's word: "Where there is both Egyptian and Fusha recordings, there should be something to signal that you should toggle." He chose a switch on the page over a pop-up: a small two-sided switch (`فُصْحَى` and the flag) beside the ✕ and ☰, in the top left corner on a phone, which breathes twice as the page opens and then rests. `app.js` shows it when `sound.twoDialects()` says that anything the open activity can say is recorded in both dialects. For that, a game must announce all its prompts as it opens (`sound.preloadPrompts()` or `sound.uses(names)`); a game that only calls `sound.say()` when a line is first needed shows the switch late. Two things for the later round, game by game: announce every prompt at the start, and check that the page's top row leaves the switch its place (the clock, the driving games, the building game and the car factory keep their star counter in the top left corner, where the switch goes on a phone).

## Four things to know first

1. **Recordings come clip by clip.** On 2026-11-25 no `-masri` file existed; on 2026-11-26 the counting words, the hours, `read-it`, `masri` and `أَيْنَ؟`'s were recorded. The rule takes effect clip by clip, as each Egyptian card is recorded.
2. **Nothing is painted.** Every text that an Egyptian recording speaks is put in the page as ordinary text (DOM), never drawn on a canvas, in every game, the driving and building games included. (The only painted words on the site are the mazes' `اِبْدَأْ هُنَا` and `النِّهَايَةُ`, which no recording says.) So hiding is the same small job everywhere: hide one element.
3. **Three files do not use `sound.say()`.** `salah.js` (wudu, the prayer, the qibla) and `prayers.js` have their own `hear()` that looks for `<name>-masri` by itself. They need `sound.masri()` too, or their own answer about which recording was found.
4. **Most instruction lines stay on screen for the whole round**, long after the voice has ended. If the line is hidden, the child has nothing to remind him what to do. Where the line is already a button that says it again (the books' games, the salah quiz, the qibla, the five prayers, the clock card), a speaker mark in its place does the job. Where it is plain text (the mazes, light, archery, the seat belt, the safety gear, the reciter), hiding it leaves nothing; a small speaker button that says the line again would be new there, and is the father's call.

In the tables, "differ" says how far the Egyptian wording is from the text:

- **words**: at least one word is another word (as `أَمَامَ` and `قدّام`). Showing the Fusha text here is what the father objected to.
- **small**: the same words, said the Egyptian way: endings dropped, a letter changed (`الظُّهْرِ` / `الضهر`), a short preposition (`إِلَى` / `لـ`), or the word's Egyptian form (`طَائِرَة` / `طيارة`).

The order of the games is Claude's guess at what is played most; the father knows better.

## The reciter (`fatihah.html`): done 2026-11-26

`showPrompt()` in `js/recite.js` leaves `#turn` hidden when `sound.masri('read-it')` is true, and follows `dialectchange`.


Text: `fatihah.html` line 27 (`#turn`), shown by `js/recite.js` line 158. In the page (DOM). Not tapped; the buttons `أَعِدِ الْآيَةَ` and `الْآيَةُ التَّالِيَةُ` under it do the work, so the game goes on without it.
How to hide: leave `#turn` hidden when `sound.masri('read-it')` is true. Nothing else is needed.

| Clip | On screen (Fusha) | Egyptian | Differ |
|---|---|---|---|
| `read-it` | الْآنَ اقْرَأْهَا أَنْتَ | دلوقتي اقراها أنت | words |

## The clock (`clock.html`): done 2026-11-26

`showTargetText()` in `js/clock.js` hides `#target-text` when `sound.masri('hour-N')` is true (on Egyptian it waits unseen for the answer) and follows `dialectchange`; the card keeps its speaker mark. On a phone the star counter steps down under the switch (`style.css`).


Text: `js/clock.js` line 327 (`#target-text`, inside the card `#target`). In the page (DOM). The card **is tapped** to hear the hour again, and it is how the child knows which hour to make. It already carries a speaker icon beside the words, and in "my day" a picture.
How to hide: empty or hide `#target-text` when `sound.masri('hour-N')` is true; the speaker icon stays, so the card is still a button. In the hours mode the child then knows the hour by ear only.

| Clip | On screen (Fusha) | Egyptian | Differ |
|---|---|---|---|
| `hour-1` | السَّاعَةُ الْوَاحِدَةُ | الساعة واحدة | small |
| `hour-2` | السَّاعَةُ الثَّانِيَةُ | الساعة اتنين | words |
| `hour-3` | السَّاعَةُ الثَّالِثَةُ | الساعة تلاتة | words |
| `hour-4` | السَّاعَةُ الرَّابِعَةُ | الساعة أربعة | words |
| `hour-5` | السَّاعَةُ الْخَامِسَةُ | الساعة خمسة | words |
| `hour-6` | السَّاعَةُ السَّادِسَةُ | الساعة ستة | words |
| `hour-7` | السَّاعَةُ السَّابِعَةُ | الساعة سبعة | words |
| `hour-8` | السَّاعَةُ الثَّامِنَةُ | الساعة تمانية | words |
| `hour-9` | السَّاعَةُ التَّاسِعَةُ | الساعة تسعة | words |
| `hour-10` | السَّاعَةُ الْعَاشِرَةُ | الساعة عشرة | words |
| `hour-11` | السَّاعَةُ الْحَادِيَةَ عَشْرَةَ | الساعة حداشر | words |
| `hour-12` | السَّاعَةُ الثَّانِيَةَ عَشْرَةَ | الساعة اتناشر | words |

Fusha counts the hours as "the second, the third"; Egyptian says "two, three". That is why eleven of the twelve differ in words.

## The driving games (`drive.html`: the four roads and the oasis)

Two places, both in the page (DOM), neither tapped:

- The seat belt: `drive.html` line 27 (`#belt-prompt`), said by `js/drive.js` line 1453. The oasis ride has no seat belt.
- The place reached: `js/drive.js` line 1315 (`#arrived-name`), said at line 1322. The roads seen from behind (`chase.js`) and the oasis (`desert.js`) use the same arrival screen.

How to hide: hide the element when `sound.masri()` is true for its clip. The belt picture and the arrival picture carry the meaning.

| Clip | On screen (Fusha) | Egyptian | Differ |
|---|---|---|---|
| `belt` | اِرْبِطْ حِزَامَ الْأَمَانِ | اربط حزام الأمان | small |
| `place-masjid` | الْمَسْجِدُ | المسجد | small |
| `place-grandma` | بَيْتُ جَدَّتِي | بيت أنَّه | words |
| `place-oasis` | الْوَاحَةُ | الواحة | small |

`الْوَاحَةُ` also stands on the oasis card in the list of roads (`ROADS` in `drive.js` line 98). Nothing is said there, so it can stay.

## The safety gear (`js/gear.js`: the building game and the car factory)

Text: `js/gear.js` lines 31 and 32 (`#gear-prompt`, `#gear-hint`), said at lines 214 and 112. In the page (DOM), not tapped. Changing `gear.js` once covers both games.
How to hide: hide each `<p>` when `sound.masri()` is true for its clip. The pegs and the breathing glove show what to do.

| Clip | On screen (Fusha) | Egyptian | Differ |
|---|---|---|---|
| `gear` | اِلْبَسْ مُعَدَّاتِ السَّلَامَةِ | البس لبس الأمان | words |
| `start-right` | اِبْدَأْ بِالْيَمِينِ | ابدأ باليمين | small |

## The building game (`build.html`)

Text: `js/build.js` line 272, in `word()`: the pill `#word` at the top of the site, shown for 2.6 seconds while the name is said (line 276). In the page (DOM), not tapped, and the game does not need it: it is a label.
How to hide: in `word()`, do not show the pill when `sound.masri(entry.clip)` is true. One change covers all eleven. The four words with one recording (`الْمِفَكُّ`, `الْأَسَاسُ`, `الْبَابُ`, `الْقُبَّةُ`) are not touched.

| Clip | On screen (Fusha) | Egyptian | Differ |
|---|---|---|---|
| `dozer` | الْجَرَّافَةُ | البلدوزر | words |
| `part-steel` | حَدِيدُ التَّسْلِيحِ | حديد التسليح | small |
| `pump` | مِضَخَّةُ الْخَرَسَانَةِ | مضخة الخرسانة | small |
| `mixer` | خَلَّاطَةُ الْخَرَسَانَةِ | خلاطة الخرسانة | small |
| `truck` | الشَّاحِنَةُ | عربية النقل | words |
| `forklift` | الرَّافِعَةُ الشَّوْكِيَّةُ | الكلارك | words |
| `crane` | الرَّافِعَةُ | الونش | words |
| `tool-hammer` | الْمِطْرَقَةُ | الشاكوش | words |
| `tool-drill` | الْمِثْقَابُ | الشنيور | words |
| `part-walls` | الْجُدْرَانُ | الحيطان | words |
| `part-minaret` | الْمِئْذَنَةُ | المدنة | small |

## The car factory (`factory.html`)

Text: `js/factory.js` line 230, in `word()`: the same pill as the building game, said at line 234. In the page (DOM), not tapped, a label only.
How to hide: the same one change in `word()`.

| Clip | On screen (Fusha) | Egyptian | Differ |
|---|---|---|---|
| `car-chassis` | الْهَيْكَلُ | الشاسيه | words |
| `car-engine` | الْمُحَرِّكُ | الموتور | words |
| `car-seats` | الْمَقَاعِدُ | الكراسي | words |
| `car-paint` | الطِّلَاءُ | الدهان | words |
| `car-body` | جِسْمُ السَّيَّارَةِ | جسم العربية | words |
| `car-doors` | الْأَبْوَابُ | البيبان | words |
| `car-wheels` | الْعَجَلَاتُ | العجل | small |
| `tool-wrench` | مِفْتَاحُ الْعَجَلَاتِ | مفتاح العجل | small |
| `car-lights` | الْمَصَابِيحُ | الفوانيس | words |

## The mazes (`mazes.html`)

Three places, all in the page (DOM), none tapped:

- The instruction above the maze: `js/mazes.js` line 889 (`#line`), said when the maze opens. It stays up while the child draws. The five `سَاعِدْ` lines come from `mazes/mazes.json` (written by `tools/make-mazes.py`; the text itself must not be edited by hand, but hiding it is done in `mazes.js`).
- The question at the end of a picture maze: line 454 (the same `#line`).
- The hidden picture's name: line 557 (`#name`), said at line 558. The same name is then kept on the maze's card in the list (line 839), where nothing is said.

How to hide: hide `#line` or `#name` when `sound.masri()` is true for the clip. The instruction is the hard one of the three: it is plain text, so once hidden there is no way to hear it again; a speaker mark that repeats it would be new. The name on the finished card in the list is the father's call (no voice plays there, but it is the same word).

| Clip | On screen (Fusha) | Egyptian | Differ |
|---|---|---|---|
| `maze-draw` | اِرْسُمْ خَطًّا مِنَ الْبِدَايَةِ إِلَى النِّهَايَةِ | ارسم خط من البداية للنهاية | small |
| `maze-find` | اِتَّبِعِ الطَّرِيقَ وَاكْتَشِفِ الرَّسْمَ الْمَخْفِيَّ | امشي مع الطريق واكتشف الرسمة المستخبية | words |
| `maze-what` | مَاذَا رَسَمْتَ؟ | رسمت إيه؟ | words |
| `maze-help-car` | سَاعِدِ السَّيَّارَةَ لِتَصِلَ إِلَى الْبَيْتِ | ساعد العربية توصل البيت | words |
| `maze-help-plane` | سَاعِدِ الطَّائِرَةَ لِتَصِلَ إِلَى السَّحَابَةِ | ساعد الطيارة توصل للسحابة | small |
| `maze-help-bus` | سَاعِدِ الْحَافِلَةَ لِتَصِلَ إِلَى الْمَسْجِدِ | ساعد الأتوبيس يوصل الجامع | words |
| `maze-help-bike` | سَاعِدِ الدَّرَّاجَةَ لِتَصِلَ إِلَى الشَّجَرَةِ | ساعد العجلة توصل للشجرة | words |
| `maze-help-balloon` | سَاعِدِ الْبَالُونَ لِيَصِلَ إِلَى الشَّمْسِ | ساعد البالونة توصل للشمس | small |
| `maze-icecream` | مُثَلَّجَات | آيس كريم | words |
| `maze-plane` | طَائِرَة | طيارة | small |
| `maze-boat` | قَارِب | مركب | words |
| `maze-car` | سَيَّارَة | عربية | words |
| `maze-umbrella` | مِظَلَّة | شمسية | words |
| `maze-cup` | كُوب | كوباية | small |

## The books' games (`sheet.html`: ten number games and seven thinking games)

Text: `js/sheets.js` line 1638 (`#line`, the bar at the top of the game), said at line 1639 when the game opens and whenever the line changes. In the page (DOM). It **is tapped**: a tap says it again (line 1754).
How to hide: one change in `openRound()` covers all eighteen: when `sound.masri(now.clip)` is true, put a speaker mark in the button instead of the words. The button must stay, or the child cannot hear the line again.

| Clip | On screen (Fusha) | Egyptian | Differ |
|---|---|---|---|
| `sheet-count` | عُدَّ، ثُمَّ اضْغَطْ عَلَى الْعَدَدِ | عِد، وبعدين دوس على العدد | words |
| `sheet-color-count` | لَوِّنْ بِعَدَدِ الرَّقْمِ | لوِّن على قد الرقم | words |
| `sheet-match-number` | صِلْ كُلَّ مَجْمُوعَةٍ بِعَدَدِهَا | وصَّل كل مجموعة بعددها | words |
| `sheet-dots` | صِلِ النِّقَاطَ بِالتَّرْتِيبِ | وصَّل النقط بالترتيب | words |
| `sheet-more` | اِضْغَطْ عَلَى الْأَكْثَرِ | دوس على الأكتر | words |
| `sheet-bigger` | اِضْغَطْ عَلَى الْأَكْبَرِ | دوس على الأكبر | words |
| `sheet-smaller` | اِضْغَطْ عَلَى الْأَصْغَرِ | دوس على الأصغر | words |
| `sheet-missing` | مَا الْعَدَدُ النَّاقِصُ؟ | إيه العدد الناقص؟ | words |
| `sheet-shapes` | لَوِّنِ الْأَشْكَالَ كَمَا فِي الْمِثَالِ | لوِّن الأشكال زي المثال | words |
| `sheet-add` | عُدَّ الْكُلَّ، ثُمَّ اضْغَطْ عَلَى الْجَوَابِ | عِد الكل، وبعدين دوس على الإجابة | words |
| `sheet-color-number` | لَوِّنْ كُلَّ رَقْمٍ بِلَوْنِهِ | لوِّن كل رقم بلونه | small |
| `sheet-shadow` | صِلْ كُلَّ صُورَةٍ بِظِلِّهَا | وصَّل كل صورة بضلها | words |
| `sheet-different` | اِضْغَطْ عَلَى الْمُخْتَلِفِ | دوس على المختلف | words |
| `sheet-similar` | اِضْغَطْ عَلَى الصُّورَتَيْنِ الْمُتَشَابِهَتَيْنِ | دوس على الصورتين اللي زي بعض | words |
| `sheet-next` | مَاذَا يَأْتِي بَعْدُ؟ | إيه اللي ييجي بعد كده؟ | words |
| `sheet-letter` | لَوِّنْ كُلَّ حَرْفٍ مِثْلَ هَذَا | لوِّن كل حرف زي ده | words |
| `sheet-differences` | اِبْحَثْ عَنْ ٣ اخْتِلَافَاتٍ | دوَّر على تلات اختلافات | words |
| `sheet-complete` | أَكْمِلِ الرَّسْمَ | كمِّل الرسمة | words |

For the father to decide: seven of these lines are also the game's **title** on its card in `numbers.html` and `think.html` (`sheets.js` line 1583): `لَوِّنْ بِعَدَدِ الرَّقْمِ`, `صِلْ كُلَّ مَجْمُوعَةٍ بِعَدَدِهَا`, `صِلِ النِّقَاطَ بِالتَّرْتِيبِ`, `لَوِّنْ كُلَّ رَقْمٍ بِلَوْنِهِ`, `صِلْ كُلَّ صُورَةٍ بِظِلِّهَا`, `مَاذَا يَأْتِي بَعْدُ؟`, `أَكْمِلِ الرَّسْمَ`. No recording plays on the hubs, so by the rule's wording they may stay.

## The "what comes next" quiz (`wudu.html`, `pray.html`, `prayers.html`)

Text, in the page (DOM) in both files, and **tapped** in both to hear the question again:

- Wudu and the prayer: `js/salah.js` line 384 (`#q-ask`, a button), said at lines 397 and 460 through the file's own `hear()`; the tap is at line 436.
- The five prayers: `js/prayers.js` line 522 (`#next-ask`, a button), said at line 527; the tap is at line 586.

How to hide: a speaker mark in the button instead of the words. Both files find the Egyptian recording by themselves, so both need the new check added (see "Four things to know first").

| Clip | On screen (Fusha) | Egyptian | Differ |
|---|---|---|---|
| `whats-next` | مَاذَا بَعْدُ؟ | إيه اللي بعد كده؟ | words |

`مَاذَا بَعْدُ؟` is also the name on the quiz's card on the three pages (`wudu.html` line 29, `pray.html` line 29, `prayers.html` line 102). Nothing is said there; the father decides whether it stays.

## The five prayers (`prayers.html`)

Text: `js/prayers.js` line 209, in `timeLine()`: the time of day under a prayer's name, each with its small sky drawn beside it. In the page (DOM). It is put in two places: `#day-time` (line 341), a button that **is tapped** to hear it again (line 371), and `#which-time` (line 428), plain text that appears as the answer. Said at lines 319 and 465 through the file's own `hear()`.
How to hide: leave the second `<span>` of the line empty when the Egyptian recording is the one found; the small sky stays as the stand-in, so `#day-time` is still a button. The prayers' names (`صَلَاةُ الْفَجْرِ` ...) have one recording and are not touched.

| Clip | On screen (Fusha) | Egyptian | Differ |
|---|---|---|---|
| `time-fajr` | قَبْلَ شُرُوقِ الشَّمْسِ | قبل طلوع الشمس | words |
| `time-dhuhr` | فِي وَسَطِ النَّهَارِ | في نص النهار | words |
| `time-asr` | بَعْدَ الظُّهْرِ | بعد الضهر | small |
| `time-maghrib` | عِنْدَ غُرُوبِ الشَّمْسِ | وقت غروب الشمس | words |
| `time-isha` | فِي اللَّيْلِ | بالليل | small |

## The qibla (`qibla.html`)

Text: `js/qibla.js` line 717 (`#ask`) and line 716 (`#place`), both inside the bar `#bar`, a button that **is tapped** to hear the instruction again (line 830). In the page (DOM). Said at line 722 through `salah.hear()`.
How to hide: hide `#ask` (and `#place` for the masjid) when the Egyptian recording is the one found, with a speaker mark in the bar so it is still a button.

| Clip | On screen (Fusha) | Egyptian | Differ |
|---|---|---|---|
| `qibla-kaaba` | اِتَّجِهْ نَحْوَ الْكَعْبَةِ | اتَّجه ناحية الكعبة | words |
| `qibla-mihrab` | اِتَّجِهْ نَحْوَ الْمِحْرَابِ | اتَّجه ناحية المحراب | words |
| `qibla-sign` | اِتَّجِهْ نَحْوَ الْقِبْلَةِ | اتَّجه ناحية القبلة | words |
| `place-masjid` (again) | الْمَسْجِدُ | المسجد | small |

`place-masjid` is the driving game's clip, used here too for the second place's name; it is counted once, under the driving games. The other two places (`مَكَّةُ الْمُكَرَّمَةُ`, `الْبَيْتُ`) have one recording.

## Light and mirrors (`light.html`)

Text: `js/light.js` line 601 (`#line`, a `<p>` above the room), said when a level opens. In the page (DOM), not tapped. It stays up for the whole level.
How to hide: hide `#line` when `sound.masri()` is true for the level's clip. As in the mazes, nothing is left to remind the child afterward unless a speaker mark is added. `اِنْعِكَاسٌ` has one recording and is not touched.

| Clip | On screen (Fusha) | Egyptian | Differ |
|---|---|---|---|
| `light-turn` | أَدِرِ الْمِرْآةَ لِيَصِلَ الضَّوْءُ إِلَى الْفَانُوسِ | لِف المراية عشان النور يوصل للفانوس | words |
| `light-flower` | أَوْصِلِ الضَّوْءَ إِلَى الزَّهْرَةِ | وصَّل النور للوردة | words |
| `light-panel` | أَوْصِلِ الضَّوْءَ إِلَى اللَّوْحِ الشَّمْسِيِّ | وصَّل النور للوح الشمسي | words |
| `light-crystal` | أَوْصِلِ الضَّوْءَ إِلَى الْبِلَّوْرَةِ | وصَّل النور للبلورة | words |
| `light-mirrors` | الضَّوْءُ يَنْعَكِسُ مِنْ مِرْآةٍ إِلَى مِرْآةٍ | النور بينعكس من مراية لمراية | words |
| `light-slide` | حَرِّكِ الْمِرْآةَ وَأَدِرْهَا | حرَّك المراية ولِفَّها | words |

## Archery (`archery.html`)

Text: `js/archery.js` line 1989 (`#line`, a `<p>`), said at line 1993 when a level opens. In the page (DOM), not tapped. It stays up for the whole level.
How to hide: hide `#line` when `sound.masri()` is true for the level's clip; the same question of a speaker mark as in light and the mazes.

| Clip | On screen (Fusha) | Egyptian | Differ |
|---|---|---|---|
| `archery-pull` | اِسْحَبِ السَّهْمَ ثُمَّ أَطْلِقْهُ | اسحب السهم وسيبه | words |
| `archery-aim` | صَوِّبْ نَحْوَ الْهَدَفِ | نشِّن على الهدف | words |
| `archery-wait` | اِنْتَظِرِ اللَّحْظَةَ الْمُنَاسِبَةَ | استنى اللحظة المناسبة | words |
| `archery-pots` | أَصِبِ الْجِرَارَ الثَّلَاثَ | صيب التلات قلل | words |
| `archery-place` | اِخْتَرْ مَكَانَ الْوُقُوفِ | اختار مكان الوقوف | small |

## Egyptian recordings that need nothing

| Clips | Why |
|---|---|
| `count-1-masri` to `count-10-masri` | In the books' games (`sheets.js` lines 423 and 846) the number is said while a badge shows it as a digit (`٣`), which reads the same in both. The number matching game also says them, and is being done in this round. |
| `jump-masri` | The movement activity is not built yet; no page plays it or shows `اقْفِزْ سَبْعَ مَرَّاتٍ!`. When it is built, it follows the rule from the start. |
| `masri` | The switch's own word, `مِصْرِي`; the switch shows the flag, not a word. Not an Egyptian twin of a Fusha text. |

## The count

Outside `أَيْنَ؟` and the number matching game there are **102** Egyptian recordings (145 in all, less 42 for `أَيْنَ؟` and 1 for the matching game).

- **11 need nothing** (the ten counting words and `jump`).
- **91 speak a text that is on screen**, in 13 pages (the safety gear is shared by two of them, the quiz by three):

| Game | Texts | Differ in words | Small | One change covers it | Needs a stand-in |
|---|---|---|---|---|---|
| The books' games | 18 | 17 | 1 | yes | yes (the line is a button) |
| The mazes | 14 | 9 | 5 | three places | the instruction has none today |
| ~~The clock~~ (done) | ~~12~~ | ~~11~~ | ~~1~~ | | |
| The building game | 11 | 7 | 4 | yes | no |
| The car factory | 9 | 7 | 2 | yes | no |
| Light and mirrors | 6 | 6 | 0 | yes | none today |
| Archery | 5 | 4 | 1 | yes | none today |
| The five prayers | 5 | 3 | 2 | yes | no (the small sky stays) |
| The driving games | 4 | 1 | 3 | two places | no |
| The qibla | 3 | 3 | 0 | yes | yes (the bar is a button) |
| The safety gear | 2 | 1 | 1 | two lines | no |
| ~~The reciter~~ (done) | ~~1~~ | ~~1~~ | ~~0~~ | | |
| The "what comes next" quiz | 1 | 1 | 0 | two files, three pages | yes (the question is a button) |
| **Left** | **78** | **59** | **19** | | |

71 of the 91 differ in words, the case the father named. The other 20 read the same words the Egyptian way; whether those are hidden too is his to decide (the rule as he wrote it hides every text whose Egyptian recording plays).

## Things noticed on the way, for the parents

- `maze-help-bus-masri` says `الجامع` for the masjid, while `place-masjid-masri` says `المسجد`. One of the two is probably not what the family says.
- The balloon is `البالونة` in the mazes' Egyptian line and `البلونة` in `أَيْنَ؟`.
- `place-grandma-masri` is `بيت أنَّه`: a family word for the grandmother, far from the `بَيْتُ جَدَّتِي` on screen.
- `sheet-differences`: the screen shows the digit (`اِبْحَثْ عَنْ ٣ اخْتِلَافَاتٍ`) while the Fusha card to record reads `اِبْحَثْ عَنْ ثَلَاثَةِ اخْتِلَافَاتٍ`. This is on purpose (the card's note says so).
- In `record.js` the card for `place-masjid` says it is the driving game's; the qibla game says it too. The card for `whats-next` sits in the group "Salah: wudu" though the prayer and the five prayers say it as well. Both are notes only; nothing plays wrongly.
- `salah.js` asks for an Egyptian twin of every clip it plays in a row (`hearAll()`, line 128), the stations' and the rak'ahs' names included, which have none. It falls back to the one recording, so nothing is heard wrongly; it is one wasted lookup per name while the switch is on Egyptian.
