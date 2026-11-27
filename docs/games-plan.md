# أَلْعَاب: design plan for the games

Draft 2, 2026-11-19. Kareem answered draft 1's questions the same night; his answers are under **Decided** in each game. Everything else is still a proposal: every name, phrase, picture and sound the child would see or hear is for the parents to approve, change or drop. Open questions come last in each game, my recommendation first.

The block puzzle (`الْمُكَعَّبَاتُ`), the clock (`السَّاعَةُ`), the driving games (`قِيَادَةُ الْمَرْكَبَاتِ`: two roads, each also seen from behind for comparison, and the ride to the oasis), the building game (`بِنَاءُ الْمَسْجِدِ`, section 5) and the car factory (`مَصْنَعُ السَّيَّارَاتِ`, section 6) are built and described in `CLAUDE.md`. The last two sit behind one door on the hub, `الْبِنَاءُ وَالتَّصْنِيعُ`. Pictures are made in Recraft following `docs/recraft-images.md`.

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

## 2. The driving games: `قِيَادَةُ الْمَرْكَبَاتِ` (built)

**What was built** (`drive.html`, `js/drive.js`, 2026-11-21; reworked the same day after Kareem tried it). Two roads: `الْحَيُّ` (two red lights, to the masjid) and `كُورْنِيشُ النِّيلِ` (two crossings and a red light, to the grandmother's house). Before every drive the child drags the seat belt to the buckle (an empty seat, no figure) and sees the du'a of riding; then he drives. The road is seen straight from above. Steering is by turning the tablet like a wheel, level always straight; a finger or the arrow keys steer where there is no sensor. Two pedals, either one. Stars lie on the road to drive over. The car follows traffic by itself, a touch is a soft bump and a horn, and it stops itself at a red light and for people crossing, the pedals turning red with a raised hand. At the end the car turns into a side street and stops at the door; the place's name shows; at the masjid the opening of the adhan plays, and at her house the grandmother comes out and waves. A ✕ button leaves the drive.

**Decided** (2026-11-21, after trying it)
1. The du'a is `بِسْمِ اللَّهِ` and then the verses, nothing else.
2. A way out of the game from inside it.
3. The tilted view made him dizzy: the road is now flat, from above, at one size.
4. A faster car, and traffic there is always a way past.
5. Reward and thrill come from the road (stars to drive over), not from stopping at a red light.
6. Arriving means pulling off the road to the place itself, with its name written.
7. At the masjid, only `اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ` of the adhan, three recordings in turn. He likes Ali Mulla's and al-Surayhi's and the Egyptian adhan; none of those is free to use, so three free recordings stand in until he says otherwise.
8. At the grandmother's house she walks out and waves.

**Decided** (2026-11-22)
1. The set is named `قِيَادَةُ الْمَرْكَبَاتِ`. Of the three adhan recordings only the third (KLCC) is kept. The grandmother is `أنَّه` in the family's Egyptian.
2. A ✕ leaves every game and section of the site, not only this one.
3. A third vehicle game, `الصَّحْرَاءُ`: an all-terrain bike in a mountainous desert, the sand not flat, little flights over inclines, mountains as the obstacles, daylight with the sun behind moving clouds, the takbir going up a hill and the tasbih coming down (he will record both), a light motor sound, and background sound for all three drives (wind, birds), made in code.
4. Built as a side view, Claude's choice, since hills, flights and sky need one; pedal only, no steering. Still to hear from him whether that is what he pictured.

**Decided** (2026-11-21, after trying the three drives; built the same day, not yet seen by him)
1. Sounds: the wind is kept for the corniche only, where it sounds like waves. The neighborhood has birds alone. The desert has an eagle's cry and small birds now and then, and animals in the picture.
2. A right turn signal as the car nears its destination, so the child knows the stop is coming.
3. Stars are never behind slow traffic: he should never have to slow down behind a car to collect them.
4. Every star hung over a jump must be within reach of the jump.
5. The desert ride is named `الْوَاحَةُ`. The child steers it right and left, so it is seen from above like the roads (the view from behind is the tilted one that made him dizzy, and no way to steer was found for the side view). The course is never the same twice: the stretches are shuffled for every ride and the time of day changes.

**Decided** (2026-11-22, after the tablet; built the same day, not yet seen by him)
1. The two roads still make him a little dizzy. A motorcycle game seen from the rider's seat does not (he sent a picture and a video): its horizon and sky never move, its camera never turns, a third of the screen is fixed to it, and only the road flows, out of one point. The two roads are cloned and shown that way, from low behind the car: `الْحَيُّ الْجَدِيدُ` and `الْكُورْنِيشُ الْجَدِيدُ`. Four road games for now; he compares and the losers are deleted.
2. The oasis ride "doesn't work at all" from above: the inclines do not show and the bike crosses water by magic. It is rebuilt seen from just behind the bike, from the back left, with hills that show, dust on the slopes, rocks and wells as obstacles, no road (flags, old tire tracks and the stars show the way), no water to cross and no stopping for camels, and better graphics.

**Decided** (2026-11-22, later that night, after he tried the roads from behind and the new oasis ride on the PC; rebuilt and reviewed the same night, not yet seen by him)
1. The roads from behind cure the dizziness. What he sent back, all changed: the car looked "way too slow" (the road is now drawn two and a half times longer, so the same speed covers the ground fast); "way too much traffic", cars too close and see-through (one car to a row, rows far apart, every car solid); a car beside him vanished when he steered into it (a car alongside is now a wall); the stars piled up on each other (further apart, smaller, facing the camera); no side road, and the grandmother small in the distance (a side street now leaves the right lane and ends at the place itself, big, with the grandmother beside the car).
2. The oasis ride is "doing better". The bike looked as if it pointed left while it went straight: it is now a drawing seen from straight behind, in the middle of the picture. It "simply jumps": it now leaves the ground only off a jump ramp, a real rise in the sand with two posts at its lip.

**Decided** (2026-11-23, after trying them on the PC; done the same day)
1. The roads from behind were still too slow, "I want this to be exciting. He needs to feel some rush steering as well. Quicker and narrower swerves", with traffic between the two extremes. Top speed 15 lanes a second there (12 on the roads seen from above, which he asked to change the same way), steering a lane in about a sixth of a second, traffic a little denser and moving, now and then two cars side by side.
2. The ping for every star was annoying: stars are taken silently, on all five rides.
3. The car on the two cards did not look like a car: it is drawn as a car's back (cabin, rear window, lights, plate, bumper, tires).
4. On the oasis ride `اللَّهُ أَكْبَرُ` and `سُبْحَانَ اللَّهِ` came at the wrong times: they now show on every climb and every descent, only while on it.

**For the parents to check after trying them** (the reviewers' questions)
1. The roads from behind: is the speed right, and is it still easy on the eyes (lamps pass the screen's edges about twice a second, and at the end the picture slides sideways onto the side street)? Are the stars too small? One number each: `STRETCH`, `SLIP`, `STAR.r`.
2. A car he has just passed holds its lane against him for about half a second, with a horn, so his car is never hidden behind it. Sticky?
3. Up a ramp the motor takes the bike to one speed by itself, pedal or not, so that every flight reaches its stars. Wanted, or should only a bike with the pedal held fly?
4. The ramp is a dark band with a bright lip and two posts: clear enough from far away? The three stars of a flight hang over the middle of the way, so a bike that takes off near the edge misses them.

**For the parents to check**
1. The three adhan recordings: listen to each on arriving at the masjid, and say if one is not good enough or its cut is wrong.
2. The verses are shown in the Mushaf's spelling (the site's rule for Quran text); the hadith page prints them in ordinary spelling. Keep the Mushaf spelling?
3. New words: `السَّيَّارَةُ`, `الْحَيُّ`, `كُورْنِيشُ النِّيلِ`, `اِرْبِطْ حِزَامَ الْأَمَانِ` (Egyptian for the recording: `اربط حزام الأمان`), `الْمَسْجِدُ`, `بَيْتُ جَدَّتِي` (Egyptian for the recording: `بيت تيتة`), `الْحَمْدُ لِلَّهِ` on arriving.
4. The drawings (three houses, a tower, a bakery, two masajid, trees, a lamp, a fruit cart, a felucca, a man, a woman, a boy) and the cars drawn in code.
5. Turn on the tablet's rotation lock before he plays, or a big turn of the wheel makes the picture rotate.

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

**Built on my recommendation, yours to change:** the seat-belt scene has no figure, and the neighborhood drive ends at the masjid.

**Next for this game:** the other three roads (desert highway, city at night, road to Makkah), the school zone with its slow sign, and a horn the child can sound if you want one.

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

## 5. Building the masjid: `بِنَاءُ الْمَسْجِدِ` (built)

**What he asked for** (2026-11-21). A game about construction and tools: the child drives construction machines one at a time (dig with a bulldozer, lift with a forklift, lift with a crane), moving from one to the next by itself rather than as separate small games; he puts on his protective gear first (a helmet, gloves), the way the seat belt is fastened; the site is where a masjid is being built (dome, minaret, walls), and the game is done when the masjid is; hand tools somewhere, used to get something done (a power drill, a screwdriver, a hammer); perhaps levels that build on each other; soft construction noise behind; `اللَّهُ أَكْبَرُ` at the end. He left the rest to Claude.

**What was built** (`build.html`, `js/build.js`, the same day). The gear: a helmet, a vest and gloves dragged onto a boy with a plain face. Then the site, seen from the side, four stages in a row: the bulldozer clears three mounds in three passes and the foundation is laid; the forklift lifts three pallets of stone, each a course higher; the hammer, the screwdriver and the drill fix the door (nails, screws, the handle's holes); the crane lifts the minaret's shaft, its top and the dome. Two buttons drive, two lift; the helpful one breathes. The names of the machines, the tools and the parts show and are said. At the end `اللَّهُ أَكْبَرُ`, then the opening of the adhan. The masjid is kept between visits.

**For the parents to check**
1. The words, all drafts: `بِنَاءُ الْمَسْجِدِ`, `اِلْبَسْ مُعَدَّاتِ السَّلَامَةِ`, `الْجَرَّافَةُ`, `الرَّافِعَةُ الشَّوْكِيَّةُ`, `الرَّافِعَةُ`, `الْمِطْرَقَةُ`, `الْمِفَكُّ`, `الْمِثْقَابُ`, `الْأَسَاسُ`, `الْجُدْرَانُ`, `الْبَابُ`, `الْمِئْذَنَةُ`, `الْقُبَّةُ`, `مَسْجِدٌ جَدِيدٌ` (in the menu). Egyptian for the recordings, also drafts: `البس لبس الأمان`, `البلدوزر`, `الكلارك`, `الونش`, `الشاكوش`, `الشنيور`, `الحيطان`, `المدنة`.
2. Whether the names should show at all, or only some of them: they add twenty recordings.
3. The boy in the gear scene and the workers in the machines: plain faces, drawn in code. The child is shown as the one at the controls, as he asked.
4. The adhan's opening after `اللَّهُ أَكْبَرُ` at the end: keep it, or the takbir alone?
5. `بِسْمِ اللَّهِ` before the work starts, shown and said after the gear: wanted?
6. The sounds, all made in code and none heard by anyone yet: the site noise, the hammer, the screwdriver, the drill, a load set down, the beep of a machine backing up.

**Decided** (2026-11-22, after his son played it on the tablet and loved it)
1. The blade must be real, up and down: a curved plate hollow toward the earth, lowered to cut and raised to back up.
2. The base must be built, not appear: the bulldozer digs the pit, and a concrete mixer pours it (the mixer and the worker who smooths the concrete are Claude's answer; the word `خَلَّاطَةُ الْخَرَسَانَةِ` is a draft).
3. The hand tools must point the real way and the nails and screws must look real: the door now lies flat on sawhorses and the tools work downward. A glow shows only when the right tool comes near the right thing.
4. The drill must not buzz: its sound is remade as a motor that whines up to speed.
5. The gloves are a right one and a left one, the right first, with `اِبْدَأْ بِالْيَمِينِ`.
6. `بِسْمِ اللَّهِ` before the gear: he asked for it in the car factory; the building game shares the scene and has it too, unless he says otherwise.

**Decided** (2026-11-22, later that night, after trying the second round; rebuilt and reviewed the same night, not yet seen by him)
1. `بِسْمِ اللَّهِ` showed twice in a row: after the tap the words now stay where they are while they are said.
2. The gloves were mixed up: "Thumb is away from the body if palm is facing forward". The boy's hands now have fingers, and on hands and gloves alike the thumb is on the outer side.
3. The minaret stood apart from the masjid: it now stands against the hall's end wall.
4. The stone "just appear from thin air": a flatbed truck with a loading arm brings the pallets, and (the reviewer's addition, the same complaint waiting to happen) the same truck brings the minaret's shaft, its top and the dome for the crane.
5. "The cement base still shows when the Masjid is complete": once the foundation has set, the bulldozer pushes the spoil heap back in and the cut in the ground closes for good.
6. "you don't simply pour cement from a mixer into a pit": the foundation is now laid as it really is: steel mesh, a concrete pump fed by the mixer, the hose moved along the pit, the heaps struck level with a board, a float, and time to set.

**For the parents to check after trying it**
1. The new words, all drafts: `الشَّاحِنَةُ` (Egyptian for the recording: `عربية النقل`), `مِضَخَّةُ الْخَرَسَانَةِ`, `حَدِيدُ التَّسْلِيحِ` (the last two the same in Egyptian: one recording each, or two?).
2. The bulldozer pushing earth along the front of the fresh foundation: does it read as closing the ground, or as burying the concrete?
3. One pallet still becomes a whole course of stone. The first eleven seconds of the foundation stage are watched (steel, pump, mixer arriving) with the drive buttons showing. The picture slides left for the two trucks and back. Any of these to change?
4. `اِبْدَأْ بِالْيَمِينِ` stays on screen while the left glove goes on; the gloves are drawn large so the thumbs show. Keep both?

**Ideas for later:** a cement mixer pouring the foundation, a dump truck taking the earth away, painting the walls, a second building (a school, a house), a tool bench of its own.

## 6. The car factory: `مَصْنَعُ السَّيَّارَاتِ` (built)

**What he asked for** (2026-11-22). A game in a car factory, assembling parts with the tools used for it that a toddler can understand; the wheels as the hand tool part, their bolts put on with the L-shaped wrench; the engine, the chassis, the seats, the doors, the wheels; `بِسْمِ اللَّهِ` before beginning and before the gear; protective gear first; a blue sport SUV like a Porsche Cayenne with no brand or logo, shown from several angles as it is completed; three engine revs when it is done, then `الْحَمْدُ لِلَّهِ`. Both building games under one door, `الْبِنَاءُ وَالتَّصْنِيعُ`.

**What was built** (`factory.html`, `js/factory.js`, the same day). Ten jobs in a row: the chassis on the line, the engine by the hoist, the seats from above, the body sprayed blue, the body lowered on, the doors and wheels of one side, the car turned, the doors and wheels of the other side, the headlights from the front; then the car turns through its views, revs three times, and `الْحَمْدُ لِلَّهِ`.

**For the parents to check**
1. The words, all drafts: `مَصْنَعُ السَّيَّارَاتِ`, `الْبِنَاءُ وَالتَّصْنِيعُ`, `الْهَيْكَلُ`, `الْمُحَرِّكُ`, `الْمَقَاعِدُ`, `الطِّلَاءُ`, `جِسْمُ السَّيَّارَةِ`, `الْأَبْوَابُ`, `الْعَجَلَاتُ`, `مِفْتَاحُ الْعَجَلَاتِ`, `الْمَصَابِيحُ`, `سَيَّارَةٌ جَدِيدَةٌ` (in the menu), `اِبْدَأْ بِالْيَمِينِ`. Egyptian for the recordings, also drafts: `الشاسيه`, `الموتور`, `الكراسي`, `الدهان`, `جسم العربية`, `البيبان`, `العجل`, `مفتاح العجل`, `الفوانيس`.
2. Twenty wheel bolts in all (five a wheel, about a second each): too many for him? The second side can be shortened.
3. The car's turn on the table was a flip between drawn views; he found it funny, and it is now a turn (see below).
4. The sounds, made in code and unheard: the paint gun, the wheel wrench's clicks, the three revs, the factory hum.

**Decided** (2026-11-22, later that night, after trying it; rebuilt and reviewed the same night, not yet seen by him)
1. "the rotation looks very funny. Fix somehow so it's real": the car now turns on a round plate as one solid thing, the two faces that show drawn at every angle, a half turn in about four seconds.
2. On the second side the wrench "turns in a spot away from the actual bolt": the bolts were drawn mirrored and worked on unmirrored. One function now places each bolt for the drawing, the glow and the wrench.
3. The reviewer also found that a finished car was thrown away if the page was left during the ending: it now opens on the ending.

**For the parents to check after trying it**
1. During the turn the wheels stand on the plate's far edge, because the hall is seen exactly side on. Does it read as a car on a turntable?
2. Loose wheels already show their five bolts before they are hung; the hoist's trolley, the wrench mats and the paint gun are simply there when their job starts. Bring them in by something, as with the stone?

## 7. The mazes: `الْمَتَاهَاتُ` (built)

**What he asked for** (2026-11-22, late). A maze game from the seven mazes made for paper printing in another chat, used as they are; mistakes allowed, but at a dead end a vibration and a buzz and he starts over; a chime at the exit; in the mazes with hidden pictures, the child's uneven line straightened at the end, morphing into the picture, with the picture's name, which he will record.

**What was built** (`mazes.html`, `js/mazes.js`, `tools/make-mazes.py`, the same night). The walls are read out of the PDF's own drawing by a script, so the mazes are exactly the printed ones: 6 by 7, 11 by 13, and five of 16 by 16, each with one way through. The child draws his line with a finger; it never crosses a wall, un-draws when he goes back, and is lost only at the very end of a dead end. In mazes 3 to 7 the walls fade, `مَاذَا رَسَمْتَ؟` is asked, his line morphs into a clean outline, and the name shows. Finished mazes show on their cards; there is no star counter.

**For the parents to check**
1. The pictures' names. Nobody could see the chat that made the mazes, so these are Claude's reading of the shapes: 3 `مُثَلَّجَات` (a scoop on a cone; `بُوظَة`? Egyptian for the recording: `آيس كريم`), 4 `تُفَّاحَة`, 5 `فَانُوس` (a pointed cap, a glass, a base; it could also be read as a house on a boat), 6 `هِلَال`, 7 `مَسْجِد`.
2. The dead end: it counts once the finger is 0.3 of a cell into the last cell of a dead end. Too soon, too late? One number (`MIDDLE`).
3. The five 16 by 16 mazes have cells of about 7 mm on the tablet, narrower than a fingertip: the walls hold the line, but it is dense. Enough for him, or only for later?
4. The colors (his line blue, the picture a deeper blue), the tablet's back button leaving the page from inside a maze, and whether a menu entry should clear the finished marks.
5. The recordings: `maze-draw`, `maze-find`, `maze-what` and the four names (cards are on the Record page).

## 8. Touch typing: `الطِّبَاعَةُ` (built)

**What he asked for** (2026-11-22, before going to bed). A touch-typing game that also trains quick reflexes ("the kid quickly taps the button when he sees the letter"); like keybr.com, whose order of letters and combinations made him proficient in under a month; "Research which letters are tapped together/successively frequently and build the algorithm accordingly"; for a kid and for adults; "Use the Arabic 102 keyboard format"; tablets and PCs; a keyboard on screen with the next key lit; on tablets, tap the lit key; diacritics on PC; a choice of "all the very popular Arabic keyboards" with the algorithm adjusted for each; and his questions: a version for small screens with a few options, what size, one app or two? "Give me your suggestions. Build what you are confident is a good idea, and I can adjust later."

**What the research found** (three researchers, 2026-11-23; their sources are in `docs/sources/typing/`).
- His computer has Windows Arabic (102), not the default (101), so 102 is the default here. The two differ in four characters: ذ, shadda, kasra, kasratan.
- The commonest letters: ا 14.3%, ل 11.2%, ي 7.9%, م 6.1%, ن 5.9%, و 4.9%, ت 4.5%, ر 4.5%, ب 3.4%; ا then ل is 7.2% of all pairs, five times the next. On the Arabic PC keyboards the home row holds seven of the nine commonest letters, so keybr's order (commonest first) and a school's order (home row first) nearly agree for Arabic.
- keybr teaches six letters at once, measures each key's speed, and unlocks the next when all are fast enough; it does not teach ة ى أ إ آ ؤ ئ, the lam-alef key or the marks in Arabic. A 4-year-old cannot touch type with ten fingers; what he can learn is which letter is which, where its key lives, and to be quick.
- A web page cannot ask the system which Arabic keyboard is active, and Chrome on Windows misreports some Arabic keys, so the game reads keys by their place and lets the user choose the keyboard (and changes it by itself when the presses show another).

**What was built** (`typing.html`, `js/typing.js`, `js/typing-engine.js`). His questions answered by doing: one app; three ways to play that the page picks by itself (real keys with the drawn keyboard as a guide; tapping the drawn keyboard from 760 by 500 CSS pixels, and from 1000 wide for the child; below that a small version that says it is the small version and shows the target's key with its real neighbors); a child's way (one letter at a time, no numbers) and a grown-up's way (real words, a mistake stops the line, speed in characters a minute); the order of teaching worked out for each keyboard from letter frequency and key effort; the lam-alef keys; the marks as a switch on real keys. The builders were cut off by server failures in the night; the page was written and tested by one agent and looked over by Claude, and the engine was reviewed and repaired by another (a simulated child had been stuck at four letters).

**For the parents to check**
1. Is a letter-and-reflex game the right aim for him now, with ten-finger typing for older children and adults?
2. His letters follow the keyboard (ا ل ي ن م ت و ع ب ...). Would you rather they follow his reading lessons (أ ب م خ)? The child's course also has the Shift letters (أ is 17th), which are two taps on glass.
3. The practice words: 3,840 common words found in Wikipedia, film subtitles and news, read twice by Claude's agents, never by a parent. Held back on purpose: the name of Allah, the Quran, the prophets' names, death, music and film words. Left in: words such as النار, الدم, الجيش, الحب, حفل, and adjectives that are also among the names of Allah (الكريم, العزيز). `docs/sources/typing/blocked-words.txt` is yours to add to.
4. The marks: words show only the marks learned so far, so they look partly voweled at first; the 495 voweled words come from classical books (some readings are not the modern sense). Keep, or wait for a better source?
5. The pace: a new letter at the latest every ten rounds for a grown-up (six for the child), two new letters a day for the child, a beginner's target of 120 characters a minute.
6. On his tablet: is the page 1000 CSS pixels wide in landscape? If not, he gets the six-key version unless `لَمْسُ الشَّاشَةِ` is chosen for him in the settings.
7. The wording, all drafts: the game's name, `مَنْ يَلْعَبُ؟`, `طِفْل` / `كَبِير`, the settings' words, the keyboards' names, the small version's notice, `حَرْفًا فِي الدَّقِيقَةِ`, `الدِّقَّةُ`, `حَرْفٌ جَدِيدٌ`, `حَرَكَةٌ جَدِيدَةٌ`, `مِفْتَاحٌ جَدِيدٌ`, the fresh start's two questions.
8. Would you record the letters' names for the child's way (28 or more clips)? Digits and punctuation later?

## 9. The round of 2026-11-24/25: doors on the home page, the books' games, light, archery, prayer

**What he asked for.** In one message: fix the red lights on `الْحَيُّ الْجَدِيدُ`; take the mazes not yet in the app, the number games and the thinking games out of his two printed books («مُوسَى الطَّيَّارُ», not the coloring or the writing pages), adjusting the instructions from paper to screen; a door `الْمُخْتَبَرُ` with a game about light reflecting; a door `الصَّلَاةُ` that teaches wudu and the prayer by trial and error with the books' boy as hero, with a qibla game; a door `الرِّيَاضَةُ` with archery (aim left and right, up and down, the tension, a projected path on the first levels only, a choice of places to stand). Later that night: the five prayers with their times and a picture of the sky at each; a two-rak'ah prayer; and the four doors on the home page, not inside the games.

**What was built** is described in `CLAUDE.md`. The archery follows section 3 above (the hadith first, no living or food targets, a real arrow).

**Decided** (2026-11-25, after the father tried it in his laptop's browser; he had not yet tried a phone or the tablet): every door stays where it is, `فَكِّرْ` inside `أَلْعَاب` and the other four on the home page; the books and their pictures were made with the family's Recraft plan, so their clip art may be on the site; the three calls in the prayer quiz that touch fiqh are fine; the archery game "still needs improvement" but may be played meanwhile; minor edits are to come. So points 1 and 2 below, and the first part of 5, are settled.

**For the parents to check**
1. `فَكِّرْ` is a door inside `أَلْعَاب`; the father named four doors for the home page and not this one. Move it too? And its name: `فَكِّرْ` is the books' own heading; `فَكِّرْ وَلَاحِظْ` or `أَلْعَابُ الذَّكَاءِ` would also fit.
2. The books' clip art (66 pictures in the number and thinking games, 10 at the ends of the help mazes, the two door pictures): it was made in the family's other chat. The site's rule is pictures from the paid Recraft plan or approved by a parent: say that they may be on the site, and whether they need a credit.
3. The mazes' new hidden pictures: `بَيْت`, `شَجَرَة` (a balloon or a light bulb is possible), `طَائِرَة`, `قَارِب`, `سَيَّارَة` (first read as a boy), `مِظَلَّة`, `كُوب`. The new mazes are titled by number (`الْمَتَاهَةُ ٨` and on) while the first seven keep their words.
4. The driving games after the fix: the car now brakes hard by itself from full speed (comfortable for his eyes?); a standing car can still be slid sideways by tilting; seen from above the amber is never on screen.
5. Prayer: three calls in the quiz that touch fiqh (after the tashahhud neither the standing nor raised hands is ever offered as the wrong picture, because either would be right in a longer prayer; after the standing, raised hands are never the wrong picture, and after the bowing, the standing never is; the sitting and the tashahhud are never shown side by side); where the hands rest in qiyam (drawn on the chest, right over left); the words of the bowing and the prostration once, not three times; no `آمِين` and no surah after Al-Fatihah; the tashahhud shown as two lines with the remark to the companions left out, then the prayer on the Prophet ﷺ; the stations' names (`تَكْبِيرَةُ الْإِحْرَامِ`, `الْقِيَامُ`, `الرُّكُوعُ`, `الرَّفْعُ مِنَ الرُّكُوعِ`, `السُّجُودُ`, `الْجُلُوسُ بَيْنَ السَّجْدَتَيْنِ`, `التَّشَهُّدُ`, `التَّسْلِيمُ`); the wudu sentences (`أَغْسِلُ كَفَّيَّ`, `أَتَمَضْمَضُ`, `أَسْتَنْشِقُ` and so on); the left-foot picture, which is the right-foot one mirrored.
6. The five prayers: the wording of the times (`قَبْلَ شُرُوقِ الشَّمْسِ`, `فِي وَسَطِ النَّهَارِ`, `بَعْدَ الظُّهْرِ`, `عِنْدَ غُرُوبِ الشَّمْسِ`, `فِي اللَّيْلِ`); Asr's names another prayer rather than a look of the day.
7. The qibla at home: a green arrow on the floor with a small Kaaba on it, as in a hotel room; he faces the way it points.
8. Light and mirrors: near its pivot a mirror turns less than the finger does, so that a small hand can aim (not one to one as the clock's hands); mirror stands do not stop the beam; the word `اِنْعِكَاسٌ` shows every time level 1 is played.
9. Archery, after its overhaul (seen over his right shoulder): with the bow turned more than about 15 degrees to the left, the bow and both hands are behind his head, as they truly are from there (no level needs more than 12; the limit could be narrowed); the eye is beside the arrow, so on the levels with no dotted path a near target is hit a little to the left of the sight and a far one a little to the right; from a blocked place the target still shows beside the palm, though the arrow's line meets the trunk; the ring trails the pulling finger a little (a full draw is one and a half times the nock's travel). Also the sounds (the string, the whoosh, the jar, the soft pat and tock), the arrow's speed starting at a quarter of full speed so that a short pull still flies, the sandbag that never stops swinging, the line `قَالَ النَّبِيُّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ:` above the hadith.
10. Every Arabic line of these games and every Egyptian wording in their cards is a draft.

**Claude's suggestions for the prayer door, asked for and not built:** the number of rak'at of each prayer (a counting game: 2, 4, 4, 3, 4); "hear it, find it" once he knows what is said (a zikr plays, he touches its posture); the adhan as the call that opens each prayer's time; what comes before the prayer (clean clothes and place, wudu, the time, the qibla) as a short checklist game; the du'a after wudu and the surah after Al-Fatihah when the parents choose them.

## 10. Two games for `فَكِّرْ` (2026-11-26): the color board and `اِجْمَعْ وَعُدَّ`

**What he asked for.** With a photo of the family's wooden toy (a LiKee color slide puzzle: a ring binder of cards above a board of four columns of colored discs): "Make me a game like this. 33 cards. Ascending difficulty. Appropriate for a 4 year old. House under ألعاب > فكر", the voice saying `رتب الدوائر كما في الصورة` and `رتب الدوائر زي الصورة`. And: "a game which combines maths, shapes, and colors in ascending difficulty. Start by collect/select three circles, then advance to four red squares, etc. Use your intelligence to design the game, the progression, etc. This also goes under فكر."

**What was built** is described in `CLAUDE.md` (`circles.html`, `collect.html`). Both stand first on the `فَكِّرْ` door, before the books' games. Nothing was committed or deployed.

**The color board, Claude's choices**
- The board works as the toy does: a column holds five discs, the fifth in the lane across the top, and a disc resting in the lane closes the way past its column. On the screen the board stands up, so a disc falls to the bottom of its column. A move can be dragged (the disc follows the finger inside the grooves, never through another disc) or tapped (tap a column, its top disc rises; tap another, it slides there; a blocked way gives a knock and the disc comes back).
- Each card starts from a mixed board a known number of moves away: one move for cards 1 to 4, two for 5 to 8, and so on to nine for card 33 (`tools/make-circles.js` finds them with a full search, three boards per card, one picked at random). The toy instead starts each card from the board the last card left; that cannot be kept easy at the start. The cards: whole columns (the photo's card first), rows, squares, blocks, L, T and S shapes, slanted stripes, then patterns where each color is scattered.
- The light bulb shows the next move of a shortest way (a dotted path and a ring), and breathes after 25 seconds without a move. The card's number shows small in its corner, for the parents. `مِنَ الْبِدَايَةِ` in the ☰ menu starts over; the card reached is kept.

**`اِجْمَعْ وَعُدَّ`, Claude's design.** Eight stages of five rounds. A tap on a shape that is asked for sends it to the tray and says its number; any other wobbles with the buzzer. There are always one to three more of the shapes asked for than asked, so he must count and stop.
1. A shape, all one color (three circles first, as he said): circle, square, triangle; one to three; the tray's places show the shape's outline.
2. A shape in four colors (the color does not matter); two to five; outlines.
3. A color, any shape (`ثَلَاثَةَ أَشْكَالٍ حَمْرَاءَ`); the places show the color.
4. A shape and a color (his `أَرْبَعَةَ مُرَبَّعَاتٍ حَمْرَاءَ` first); empty places.
5. New shapes and colors: star, heart, crescent, rectangle, orange, purple; up to six; the places show the new shape, the color is only heard.
6. No places: he collects and presses ✓ when he thinks he has enough; too few or too many gives the buzzer and the tray is counted aloud; a tap on a shape in the tray puts it back. Up to eight.
7. Two kinds at once (`دَائِرَتَيْنِ حَمْرَاوَيْنِ وَمُرَبَّعًا أَزْرَقَ`).
8. `كَمْ …؟`: a tap marks each one with its number; then he presses the number among three.

**For the parents to check**
1. The color board: starting each card from a mixed board a few moves away (Claude's choice) or, as with the toy, from the last card's board; whether nine moves is too hard for the last cards, or too easy; the hint bulb; drag and tap both.
2. The two titles on the door: `رَتِّبِ الدَّوَائِرَ` and `اِجْمَعْ وَعُدَّ`.
3. Every sentence of `اِجْمَعْ وَعُدَّ` (40, listed in `docs/egyptian-names.md` beside the Egyptian, and on the Record page). Two grammar points: a color after a plural of things is written feminine singular (`مُرَبَّعَاتٍ حَمْرَاءَ`; `مُرَبَّعَاتٍ حُمْرٍ` is also correct), and the star is `نَجْم` / `نُجُوم` in Fusha (masculine, so `ثَلَاثَةَ نُجُومٍ`) and `نجمة` / `نجوم` in Egyptian.
4. The Egyptian verb: `لِمّ` (collect) for `اِجْمَعْ`; `هات` (bring) would also fit.
5. (Replaced by round two below.) The stages, five rounds each.
6. (Replaced by round two below.) Recordings.

**His second round, the same night** (after playing the color board past half way, on the laptop): "The circle board game is too easy … He has to dig it up and move things around"; the hint only after 10 wrong moves, gone again after it is used, pulsing three times and then still; adaptive ("skip a level when the user gets it right away", faster in the early stages, "Still don't start with 1 move … Maybe start with 3"), 50 boards with most of the additions at the hard end; arrows between boards and replaying a board. For `اِجْمَعْ وَعُدَّ`: the tray's outlines gave the answer away ("You ask for 5 red squares and the empty slots … are all square-shaped") or looked as if they did (dotted circles that took triangles): only the number of places; "boringly easy", so the same skipping and harder rounds; "3 large red circles"; "put 3 purple squares under the table"; "Almost change the tested subject every card"; drag as well as tap; and the Egyptian text of every instruction.

**What changed** (described in `CLAUDE.md`): the color board has 50 new boards (3 to 20 moves, each chosen for the most digging there is at its length), skipping ahead (3 boards at a time among the first ten when solved with at most about one wrong move in seven and no hint, 2 among the next fifteen, 1 after), the bulb earned by ten wrong moves (a wrong move: one after which the fewest moves left are not fewer), and the bar of arrows under the paper. `اِجْمَعْ وَعُدَّ` was redone as 60 rounds of four kinds that take turns (collect, put in a scene, count, compare), with sizes and negations; plain places; drag or tap; the same skipping and arrows; every sentence written in both dialects by the same grammar tables. Nothing was committed or deployed.

**For the parents to check, round two**
1. The color board: whether board 1 (3 moves, 1 of them digging) is a good start, and whether the jumps (3, then 2, then 1) suit him. A wrong move is one that does not bring the board nearer its card.
2. `اِجْمَعْ وَعُدَّ`: the 60 sentences (`docs/egyptian-names.md`, or the Record page). Grammar to confirm: `ثَلَاثَ دَوَائِرَ لَيْسَتْ حَمْرَاءَ`, `أَرْبَعَةَ أَشْكَالٍ لَيْسَتْ دَوَائِرَ`, `ثَلَاثَ دَوَائِرَ كَبِيرَةٍ حَمْرَاءَ` (size before color), `أَيُّهُمَا أَكْثَرُ: الْأَشْكَالُ الْحَمْرَاءُ أَمِ الزَّرْقَاءُ؟`. Egyptian: `لِمّ`, `حُطّ`, `جوّه السبت` (as in `أَيْنَ؟`), `كبار` / `صغيرين` after two, `مين أكتر … ولا …؟`.
3. The places: on and under the table, in the box, in the basket. «بَيْنَ» and «بِجَانِبِ» were left out: on a phone the gap between two things is too small to drop several shapes into, and «بِجَانِبِ» has two sides.
4. A round with no places at all (he says when he has enough, with ✓) was in the first version; it was left out of this one, as the father wants the number of places shown. It can come back as one kind among the others.
5. Recordings: `circles-line` and the 60 sentences, each in both dialects (122 cards).

**His third round, the same night.** The color board: "good. No comments/edits." `اِجْمَعْ وَعُدَّ`: a screenshot of «ثَلَاثَةَ مُثَلَّثَاتٍ كَبِيرَةٍ صَفْرَاءَ» with no small triangle on the screen ("the prompt is confusing/redundant. Fix systematically"); and "now more difficult but it's not fun … trying to make it difficult without it being mentally stimulating. Three non-red circles for example. Don't like that patterns. Make it more fun for a 4 year old. I struggle to keep him away from video game style games. Boring educational games don't help … Edit as you see best." He will review this round before anything is deployed.

**What changed** (described in `CLAUDE.md`): the rounds are five little games that take turns, each with something that moves and answers back: a train that rolls in, is loaded and whistles away; counting under a twinkling night sky; bubbles to pop as they rise, their shapes dropping into a jar; pictures to build from shapes (tree, house, car, ice cream, boat, rocket, lantern, masjid) that come alive when whole; comparing under the night sky. The negations are gone, and so are the table, box and basket rounds (the least game-like). Every trait a sentence names has look-alikes on the screen that differ in just that. 50 rounds, 48 sentences to record.

**For the parents to check, round three**
1. Is it fun now? Which of the five does he like, and which would he skip? More of one kind is easy to give.
2. The pictures and how they come alive; the bubbles' pace (tier by tier, 9 s, 7.5 s, 6 s to cross the screen).
3. The words: `اِلْتَقِطْ` (catch) / `امسك`, `اِبْنِ` (build) / `ابني`, the pictures' names (`الْمُثَلَّجَاتِ` / `الآيس كريم`, `الْقَارِبَ` / `المركب`, `الْفَانُوسَ`, `الْمَسْجِدَ` / `المسجد`).
4. Places («تَحْتَ الطَّاوِلَةِ») could come back inside the building rounds ("put the triangle on the square") if he wants them.
5. Recordings: `circles-line` and 48 sentences, each in both dialects (98 cards).

## 11. The lab's water and weight games (2026-11-27): first `الْمِيزَانُ`

**What he asked for.** The draft "Ashuddahuma — Water & Weight Game Ideas" (made with Claude in chat on 2026-11-26, kept outside the repo beside it) describes three games under `الْمُخْتَبَرُ`: the balance, the water wheel, loading a boat. "ONE GAME AT A TIME", in both dialects, pictures from Recraft, not too easy (with skipping ahead as in the color board), and levels he can move back and forth through himself. He chose: the ayah Ar-Rahman 55:9 opens the game (read by a parent); the balance stands on a lab bench.

**The first version was sent back the same day** (after five or six rounds): glasses of different shapes holding the same water, half glasses, pouring until the sides equalize, a big glass worth two small ones mixed in early ("He can't predict that, and doesn't learn anything from it. Units must be equal"); the clay jug and qulla, a painted room with objects beside the pans, curved pans holding flat cups; guessing which side is heavier ("The goal of EVERY game/level here is to achieve balance"); moves allowed in some rounds and not others; an empty cup told from a full one by color; pouring out into a basin ("unnecessary for this game"). He asked for an outline first, then said "Build".

**The second version** (described in `CLAUDE.md`): a modern classroom pan balance (Recraft, 5 credits) with flat trays on posts; every cup the same and always full; a double cup only from level 29, the same cup exactly twice as tall with a line round its middle; every level is to balance; any cup from anywhere to anywhere; every cup moves the beam; a number on each tray, seen only. Two lines to record instead of sixteen.

**For him to check**
1. Is the double cup crystal clear (same width, twice as tall, a white line where one cup's worth ends, the tray's number counting it as two)? It starts at level 29, alone against single cups.
2. Any way that balances counts. In level 3 (two cups against none) he can add two or move one; both are right. Skipping ahead needs a solve within one move of the fewest.
3. A tap only makes a cup hop; every move is a drag. A tap that sends a cup somewhere would be quicker for small fingers, but it would have to guess where.
4. On a phone held upright the balance is small (the cups about 20 pixels wide); on the tablet they are about 55.
5. The words: `اِجْعَلِ الْكِفَّتَيْنِ مُتَسَاوِيَتَيْنِ` / `خلّي الكفتين متساويين`, and `تَسَاوَتِ الْكِفَّتَانِ` / `الكفتين اتساووا`.
6. Pouring puzzles, his question: the measuring jugs (3 and 5 make 4) he set aside as too advanced at 4; the water-sort puzzle (colored water poured between tubes until each holds one color) is Claude's suggestion for a game of its own later.

**Still to come**: the water wheel and the boat, one at a time, when he says.

## What the stars are for (open, 2026-11-22)

The father: the counter never ends ("If he plays this long enough, it will be a million? He's not really winning anything"), and should there be some competing, and some losing? Ideas were given, and no code changes until he chooses:
1. Stars for a round, not for ever: what he caught against what was there, and one to three big stars for the round; the lifetime counter goes.
2. Something to finish: stars fill a picture tile by tile; a finished picture goes on a shelf and a new one starts. The mazes already work this way in small: seven cards, each showing its picture once found.
3. Stakes without a game over: things he can miss (a star for stopping at the red light by himself, for a ride with no bumps, for the right tool at the first try). Firmer: a bump drops one of the round's stars. The mazes are the first game with a real setback; see how he takes it.
4. Competing: against himself first ("your best on this road"), then turns with a parent; no boards.
5. A jar for the day that fills and is then full: a natural stopping point.
Claude's suggestion: 1, 2 and the mild form of 3; "beat your best" later; no game over at four.

## Order and size

| Game | Size | Waits on |
|---|---|---|
| Telling the time | Built; "my day" next | Recordings of the hours; the "my day" pictures and hours |
| Driving | Built: two roads and the ride to the oasis; more roads later | The parents' check of the du'a wording and the art; the recordings; a try on the real tablet |
| Obstacle course | Large: the hero, a course's art, the ending scene | The hero, the first course's art, more rounds of design |
| Archery | Medium: reuses the hero and the engine | The hero |
| Building the masjid | Built; second round built | The parents' check of the words, the sounds and the play; the recordings |
| The car factory | Built | The same |
| The mazes | Built | The parents' check of the pictures' names; a try on the tablet; the recordings |
| Touch typing | Built | A try at the computer and on the tablet; the parents' check of the words and the wording |

Next: the obstacle course's first playable version with simple shapes, then archery once the hero exists.
