# أَلْعَاب: design plan for the games

Draft 2, 2026-11-19. Kareem answered draft 1's questions the same night; his answers are under **Decided** in each game. Everything else is still a proposal: every name, phrase, picture and sound the child would see or hear is for the parents to approve, change or drop. Open questions come last in each game, my recommendation first.

The block puzzle (`الْمُكَعَّبَاتُ`) and the clock (`السَّاعَةُ`) are built and described in `CLAUDE.md`. Pictures are made in Recraft following `docs/recraft-images.md`.

## Rules that apply to every game

- No music, no ads, no purchases, no timers that punish. Nothing is ever lost: no lives, no game over, no "try again" screens. A mistake slows things down or bounces gently, then play goes on.
- Praise is a chime plus a spoken phrase in the parents' voices, in Fusha or Egyptian by the ☰ switch. Errors are the soft buzzer or a vibration, as in the reading game. Any other sound (a jump, a horn, an arrow) needs approval first.
- Figures and icons have plain faces: no eyes, nose or mouth, but hands, clothes and other details drawn. Backgrounds show masajid, never other religious buildings. People in the backgrounds dress modestly: thobes, jalabiyas, kufis, hijabs, abayas.
- No living creature is ever a target or an obstacle to be hit. Animals can appear as friends in the scenery.
- The Quran and its pages never appear on the ground, as something to jump over, or as a collectible. Quran text comes from the Quran.com API and shows in the Mushaf font; hadith and du'a text is copied from a verified source (sunnah.com) and checked by the parents.
- Arabic-Indic digits everywhere (٠١٢٣٤٥٦٧٨٩). Everything fully voweled.
- Phone, tablet and computer, right to left. Big touch targets. Every game works offline once installed.

### Shared pieces to build once

- **The hero.** One faceless Muslim boy, drawn as a jointed figure (head, body, arms, legs as separate pieces) so the code can make him run, jump, draw a bow and wave without a separate picture for every frame. The same figure serves the obstacle course, archery and the planned movement activity. Made in Recraft as parts, or drawn by me in SVG for the first prototype and replaced later.
- **Hero choice.** The first time any game needs a hero, the child picks `مُوسَى` or `أُبَيّ` from two big cards; the choice is kept on the device and can be changed from the ☰ menu.
- **A small canvas engine** (`js/stage.js`): the drawing loop, screen sizes and sharp drawing on high-resolution screens, pausing when the tab is hidden, and layered backgrounds that scroll at different speeds.

## 1. The obstacle course

**The idea.** The hero walks through a Muslim neighborhood, jumping over small obstacles and picking up good things along the way. Each course is a short trip with a purpose, and what he picks up is used at the end, so collecting means something beyond a number.

**How it plays.**
- The hero moves forward on his own at a gentle walk. One control: tap anywhere to jump. That is all a 4-year-old needs at first; a second control (hold to jump higher) can come later.
- Missing a jump is not a failure: he bumps, wobbles, climbs over slowly, and carries on. No lives, no restart.
- Things to pick up float at jump height or sit on the path. Each one is named aloud the first time it is picked up (`تَمْرَة`, `مِسْوَاك`), so the game teaches words too. A small basket in the corner counts them in Arabic-Indic digits.
- A course takes 1 to 2 minutes. At the end there is a short scene where the collected things are used.

**Proposed courses** (build one first, then add):

| Course | Setting | Picked up | Obstacles | Ending |
|---|---|---|---|---|
| `إِلَى الْمَسْجِدِ` Friday morning walk to the masjid | Street with houses, a market corner, the minaret growing closer | Miswak, a small bottle of perfume, clean socks | Puddle, a ball, a sleeping cat (walk around, never jump on it), a cart | He reaches the masjid door, puts his shoes on the rack, steps in with the right foot. The du'a for entering is heard, in the parents' voices |
| `الْإِفْطَارُ` Ramadan sunset | Lanterns on strings, a crescent over the domes, people carrying food | Dates and cups of water | Boxes, a bicycle, a fountain edge | He reaches the iftar table and hands a date and water to each person waiting |
| `السُّوقُ` The market | Stalls with awnings, palm trees | The fruits named in the Quran: dates, figs, olives, grapes, pomegranates | Crates, baskets, a donkey cart parked | His basket goes to his mother's kitchen; each fruit is named once more |
| `الْعِيدُ` Eid morning | Balloons, the musalla in an open field, takbeer banners | Sweets to share (kahk, ma'moul) | Prayer mats being carried, chairs | He gives the sweets to other children after the Eid prayer |
| `الْبُسْتَانُ` The garden | Trees, a well, a thirsty dog and a cat in the shade | Buckets of water | Roots, stones, a wheelbarrow | He waters the trees and gives the thirsty dog a drink (the hadith of the man and the thirsty dog, told in one line) |

**Look.** Warm and sunlit rather than neon: sandstone and whitewash walls, turquoise and cobalt tiles, mashrabiya windows, arches, palm trees, domes and minarets in the far layer, a crescent at dusk. Three or four background layers scrolling at different speeds give depth. People in the backgrounds go about their day (a man carrying bread, a woman with a basket, an old man on a bench) and are faceless like the hero.

**Build plan.** A first playable course with simple shapes for art, to tune the speed and the jump with the child, then the Recraft art for that course, then the next course. Courses are data (where each obstacle and item sits, which background), so adding one is mostly art.

**Decided** (2026-11-19)
1. The first course is `إِلَى الْمَسْجِدِ`.
2. Musa and Ubai are two generic boys, told apart by their clothes: Musa in a white thobe with a green kufi, Ubai in a light blue jalabiya with a white kufi.
3. The ending scene uses what he collected.
4. Sounds: a soft jump sound and a pop when an item is picked up, plus the chimes.
5. The ending has the du'a for entering the masjid, `اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ` (Sahih Muslim 713), in the parents' voice. Its card (`masjid-dua`) is in `record.html`; one recording serves both dialect settings.
6. Women appear in the backgrounds, in hijab and abaya, faceless like everyone else.

**Questions**
1. The things picked up on the way to the masjid: miswak, a small bottle of perfume, clean socks. Keep, change or add (a kufi, a prayer mat)?
2. The hero art: Recraft (`docs/recraft-images.md` has the prompt for the two boys) or a simple figure drawn in code for the first playable version? I recommend code first to tune the jump with him, then Recraft.

## 2. The driving game

**The idea.** The child drives the family car along a road to a destination, steering by tilting the tablet like a steering wheel and holding a pedal to go faster. Before every drive he buckles the seat belt and hears the du'a of riding. Traffic and crossings teach patience and road manners.

**How it plays.**
- **Before the drive:** the car door closes, the seat belt hangs ready, and the child drags the strap across until it clicks. On iPhone and iPad that same touch is when the tablet asks to read the tilt: Safari shows its own Allow box, which it only shows after a touch, and a parent taps Allow. Android tablets and computers do not ask. Then the du'a of riding is shown and played, each word lit as it is spoken, as in the Fatihah reciter.
- **Steering:** turn the tablet like a steering wheel. Straight is straight: the game reads the tablet's angle against gravity, so level is straight however he happened to be holding it when the drive began, and leaning it back or forward does not steer. A small dead zone around level and smoothing keep a shaky hand driving straight. On a computer, the arrow keys; and for a child who finds tilting hard, an option to steer by dragging a finger.
- **Speed:** one big pedal button on the right, under the thumb. Hold to speed up, let go to slow down to a crawl (never a full stop unless something is ahead).
- **Traffic:** slower cars in the lanes ahead. Getting too close makes them flash their brake lights and the car slows gently; touching one is a soft bump that slows you, never a crash. No damage, no restart.
- **Road manners** (one at a time, introduced over several roads): a red light, where he lets go of the pedal and waits for green; a crossing where people walk across and he waits; a school zone with a slow sign.
- **The destination** shows as a picture at the end of a progress bar along the top. On arrival the car parks itself and `الْحَمْدُ لِلَّهِ` is said.

**View.** Seen from above with a slight tilt, three lanes, the car near the bottom. This is the easiest view for a young child to read; a "behind the car" view is more exciting but harder to judge. No accessorizing the car: one family car, always the same.

**Proposed roads:**

| Road | Scenery | To |
|---|---|---|
| The neighborhood | Houses, a small masjid on the corner, a bakery | The masjid for Dhuhr |
| The Nile corniche | The river with feluccas, palm trees, a long bridge | Grandparents' house |
| The desert highway | Dunes, camels walking by the road, a rest stop with a musalla | A trip |
| The city at night | Lit minarets, lanterns, tall buildings | Home after Taraweeh |
| The road to Makkah | Mountains, then the clock tower and minarets far ahead (the Haram itself is never part of play) | The miqat sign, where the drive ends |

**The du'a.** The full du'a of riding, from Ali ibn Abi Talib (Sunan Abi Dawud 2602, Jami' at-Tirmidhi 3446): `بِسْمِ اللَّهِ`, then `الْحَمْدُ لِلَّهِ`, then the verses `سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ` (Az-Zukhruf 43:13–14), then `الْحَمْدُ لِلَّهِ` three times, `اللَّهُ أَكْبَرُ` three times, and `سُبْحَانَكَ إِنِّي ظَلَمْتُ نَفْسِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ`. The verses come from the Quran.com API in the Mushaf font, never typed; the rest is copied from sunnah.com, in Naskh, and checked by the parents before it goes in. The text above is a reading aid for planning, not the source. The longer travel du'a (Sahih Muslim 1342) could come later for the long roads.

**Decided** (2026-11-19)
1. The full du'a of riding, not only the verses.
2. The child drags the seat belt strap across.
3. The cars may honk, and the seat belt clicks.
4. Roads in the order proposed: the neighborhood first, then the Nile corniche.
5. Nobody is named as the driver, and no wording says who drives; seen from above, no driver shows. If the seat-belt scene needs a figure, it is an adult, faceless.
6. Straight is straight (see Steering above), never the angle at the start.

**Questions**
1. The seat-belt scene: just the seat, the strap and the buckle seen from inside the car (no figure), or the faceless adult buckling up? I recommend no figure: the child's own drag is the action.
2. Where does the neighborhood drive end? I proposed the masjid for Dhuhr; the bakery or the park would also work.

## 3. Archery

**The idea.** `الرِّمَايَةُ`: archery is a sport the Prophet ﷺ encouraged ("Shoot, children of Isma'il, for your father was an archer", Sahih al-Bukhari 2899). The hero stands in an open field and shoots at targets. It trains aim and patience, and later counting with the scores.

**How it plays.**
- Touch anywhere, pull back, and the bow draws; a dotted line shows where the arrow will fly. Let go to shoot. On a computer, the same with the mouse.
- Early levels: the whole flight path is shown and the target is large and close. Later the dotted line gets shorter, the target moves (swinging on a rope, sliding on a rail), and a flag shows the wind.
- A hit chimes and the rings score 1 to 5, counted in Arabic-Indic digits. A miss just lands in the grass. Ten arrows a round, and the round ends with the total.
- **Targets are never living things, and never food.** The Prophet ﷺ forbade taking anything with a soul as a target (Sahih Muslim 1958). Targets are round boards on hay bales, clay pots and hanging lanterns.

**Look.** An open field at the edge of a town, a tent with rugs, a horse grazing (scenery only), the town's minarets behind, warm late-afternoon light. The hero in side view, faceless, drawing his bow. The arrow looks real: wooden shaft, fletching, a metal point.

**Decided** (2026-11-19)
1. The game opens with the hadith, read aloud by a parent; the text is copied from sunnah.com and checked first.
2. No food as targets: no dates, no fruit.
3. A real-looking arrow.

**Questions**
1. A sound when the arrow hits the board (a soft thud)? It is a new sound, so it needs your yes.

## 4. Telling the time: `السَّاعَةُ` (built)

**What was built** (`clock.html`, `js/clock.js`, 2026-11-19). One screen, no modes. A big clock the child turns by either hand; the hands move together as on a real clock, so the long hand going round once moves the short hand one hour. Let go and the clock settles on the nearest whole hour and says it (`السَّاعَةُ الثَّالِثَةُ`); a tap on the clock says it again. A card above the clock shows an hour; a tap on it says it. When the clock settles on that hour, the hour is said, then a chime, a star flies to the counter and `أحسنت` plays, and a new hour comes. An hour that is not the one on the card is simply said, with no buzzer. Behind the clock the sky follows the time of day: the sun crosses it from right to left by day, the moon and stars come out at night, and the windows of a small town with a masjid light up. The clock opens at the real time, rounded to the hour. The dial has ١ to ١٢, a short thick terracotta hour hand and a long thin teal minute hand. Stars are kept on the device.

**Decided** (2026-11-19)
1. No prayer times in this game. The prayers get a game of their own later.
2. The hours are spoken as written, in both dialects: `السَّاعَةُ الْوَاحِدَةُ` to `السَّاعَةُ الثَّانِيَةَ عَشْرَةَ` in Fusha, `الساعة واحدة` to `الساعة اتناشر` in Egyptian. The 24 cards (`hour-1` to `hour-12`, each with `-masri`) are in `record.html`.
3. Pictures are made in Recraft (`docs/recraft-images.md`).

**My day** (built 2026-11-19, not yet deployed). Two round buttons above the card switch between the hours and "my day": the card shows a picture of his day with its hour (`السَّاعَةُ السَّابِعَةُ`), in the order of the day, and the child sets the clock to match; the sky then turns to that time of day. No captions yet. The pictures were made on Recraft Basic in the flat outlined style the parents chose, with everyone eating and brushing teeth with the right hand and the nap on the right side, blanket over the feet. The hours are my placeholders: wake 7, breakfast 8, Quran 9, play 10, lunch 1, nap 2, park 4, dinner 6, teeth 7, bed 8. Proposed scenes, without the prayers: waking up, breakfast, Quran lesson, playing outside, lunch, nap, the park, dinner, brushing teeth, bedtime with the du'a before sleep. The prompts are in `docs/recraft-images.md`.

**Later:** half past (`وَالنِّصْفُ`), the digital clock beside the dial, and a quarter past.

**Questions**
1. Which scenes, and at which hour does each happen in his day? The game can only use whole hours for now.
2. A caption under each picture (`أَسْتَيْقِظُ`, `أُفْطِرُ`) to read, or the picture alone with its name spoken? Captions need recordings too.

## Order and size

| Game | Size | Waits on |
|---|---|---|
| Telling the time | Built; "my day" next | Recordings of the hours; the "my day" pictures and hours |
| Driving | Medium: road scenery per road, traffic, tilt | The du'a text checked against sunnah.com, the car and scenery art |
| Obstacle course | Large: the hero, a course's art, the ending scene | The hero, the first course's art, more rounds of design |
| Archery | Medium: reuses the hero and the engine | The hero |

I suggest the driving game next: its questions are almost all answered and it needs no hero. Then the obstacle course's first playable version with simple shapes, then archery once the hero exists.
