# Making the games' pictures in Recraft

How to make pictures for the site in Recraft (recraft.ai) so they look like one family and follow the site's rules. Start with the clock's "my day" pictures; the same steps serve the other games.

## The rules every picture follows

- **No facial features on any figure.** A plain, smooth face: no eyes, eyebrows, nose or mouth. Hair, ears, hands and clothes are drawn. Recraft often adds a face anyway, so check every picture and erase the face (see step 5) or try again.
- Modest clothes. Women in hijab and abaya; men and boys in thobes, jalabiyas, or shirts with long trousers.
- No text, letters or numbers in the picture (the site writes its own Arabic), no musical instruments, no crosses, churches or other non-Islamic buildings. A masjid in the background is welcome.
- The Quran, if it appears, sits on a stand or in hands, never on the floor.
- **The right hand** for eating, drinking and brushing teeth, for everyone in the picture. Image models often get this wrong, so check every hand. For a figure facing us, his right hand is on the left side of the picture; say so in the prompt.
- **Nobody sleeps on the tummy.** Sleep on the right side (for a figure facing us, the head is on the left of the picture), with the blanket up to the shoulders and over the feet.
- **Only the paid plan.** Make every picture for the site while signed in to the family's paid Recraft plan (Basic, from 2026-11-19). Free-plan pictures are public and Recraft owns them, and they stay Recraft's after an upgrade. Check the plan at recraft.ai/profile/subscription before starting.
- Square pictures (1:1). The site shows them in square cards.
- Pictures made in Recraft need no credit on `المصادر`.

## Step by step

1. **Pick one style and keep it.** Choose an illustration style (a flat digital illustration with soft shading suits a 4-year-old) and use the same one for every picture in a game. Once one picture is right, use Recraft's option to create a custom style from it, so the rest match.
2. **Set the colors** to the site's palette where Recraft lets you choose colors: cream `#FEF9EF`, terracotta `#A9603A`, gold `#C98A45`, teal `#2A9D8F`, cobalt blue `#3E76C2`, sand `#D7B98F`, dark brown `#4A3424`.
3. **Make the boy first** (the character prompt below). Generate a few, pick the best, and keep it as the reference for every scene, describing him with the same words each time.
4. **Make each scene** with the scene prompts below: the character description first, then the scene.
5. **Fix what is wrong** with Recraft's edit tools: select the area (a face that crept in, a stray letter) and erase or regenerate just that part.
6. **Export as PNG at 1024 × 1024** and name each file exactly as in the table (lowercase, no spaces).
7. **Save them outside the repo**, in `C:\Claude Projects\Ashudd1447\recraft\`, and tell Claude they are there. Claude makes small WebP copies for the site and adds them once you both approve them. Nothing goes live before that.

## The boy for "my day"

The parents chose the flat style with clean outlines (boy 2 of the first four, 2026-11-19).

A character description to paste at the start of every scene prompt. Change the clothes if you prefer; just keep the same words in every prompt.

> A 4-year-old boy with short dark brown hair, a smooth plain face with no eyes, no nose and no mouth, light brown skin, wearing a light blue long-sleeved shirt and dark blue trousers. Flat children's book illustration, soft shading, warm colors, simple clean shapes, no text.

## The "my day" scenes

The hours are placeholders: tell Claude the real hour for each scene in his day, and which scenes to keep (the game uses whole hours only for now).

| File | Hour (to set) | Scene to add after the description |
|---|---|---|
| `day-wake.png` | 7 | Waking up in bed, stretching his arms, morning sunlight through a window with an arched frame |
| `day-breakfast.png` | 8 | Sitting at a wooden kitchen table eating breakfast with his right hand (on the left of the picture): bread, cheese, an egg, a glass of milk |
| `day-quran.png` | 9 | Sitting on a rug for his Quran lesson, the mushaf open on a wooden stand in front of him, a parent beside him (faceless, modestly dressed) |
| `day-play.png` | 10 | Playing with a ball in a sunny courtyard with potted plants and blue tiles |
| `day-lunch.png` | 1 | Eating lunch with his family around a table, everyone eating with the right hand; everyone faceless, the mother in hijab |
| `day-nap.png` | 2 | Asleep on his right side (head on the left of the picture), hand under his cheek, the blanket from his shoulders to past his feet so no feet show, curtains half drawn |
| `day-park.png` | 4 | Going down a slide at a park with palm trees, a minaret far in the background |
| `day-dinner.png` | 6 | Eating dinner with his family at sunset, warm lamp light, everyone eating with the right hand |
| `day-teeth.png` | 7 | Brushing his teeth at a bathroom sink, in pajamas, the toothbrush in his right hand (on the left of the picture) |
| `day-bed.png` | 8 | Sitting on his bed in pajamas, hands raised in du'a before sleep, a night sky with a crescent moon in the window (Recraft once refused the word "du'a"; "a quiet prayer of supplication" works) |

## Later: the two heroes (obstacle course, archery)

Only after you decide to use Recraft for the heroes (see `docs/games-plan.md`). The game will need each boy in a few poses (standing, walking, jumping), so ask for a character sheet:

> Character sheet of a 5-year-old boy shown in three poses side by side: standing, walking, jumping. Smooth plain face with no eyes, no nose and no mouth. **Musa:** white thobe and a green kufi, brown sandals. Flat children's game illustration, side view, clean shapes, plain white background, no text.

For Ubai, use the same prompt with: a light blue jalabiya and a white kufi. Export these with a transparent background if Recraft offers it, or on plain white.

## Sprites for the driving game (vector)

The buildings, trees, boat and people beside the road are Recraft vector drawings (SVG), so they stay sharp at any size and weigh little. They were made through Claude's Recraft connector with the saved vector style "Ashuddahuma flat outlined (vector)" (`99df65a5-6781-44cb-8f0f-02a4127320d0`), one object per picture, with a prompt of this shape:

> A single game sprite: *the object, its colors and details*, seen straight from the front, flat elevation view. No people, no text, no letters. Isolated object centered on a plain solid white background, no ground, no shadow, no scenery.

People are made the same way, "seen from the side, walking", always with: "His face is completely blank and smooth: no eyes, no eyebrows, no nose, no mouth."

Each raw file is then run through `clean-svg.py` (in the `recraft` folder, beside the raw files in `recraft/drive-raw/`):

    python clean-svg.py drive-raw/palm.svg ../Ashuddahuma/public/images/drive/palm.svg

The desert's drawings (a camel, a gazelle, a fox, an eagle seen from above, an acacia, a boulder, a tent, a shrub) were made the same way on 2026-11-21, 4 credits each, with their raw files in `recraft/desert-raw/`. Animals are asked for "seen exactly from the side, facing right", always with: "Its head is completely plain and smooth: no eye, no nostril, no mouth." All eight came back without faces at the first try. Their heights are set in `js/desert.js`, not in `SIZE`. For the view from behind (2026-11-22) three more were made, 16 credits in all: `atv` (the bike and its rider "seen from behind and slightly from the left side (rear three-quarter view, the way a chase camera behind a vehicle sees it)"; the drawing came out seen from behind-right, so the game mirrored it; `atv-alt.svg` in the raw folder is the one not used), `well` and `rocks`. That three-quarter bike looked as if it pointed left while it rode straight, so later the same day it was replaced (8 credits for two tries, 851 left): `atv-rear.svg` in the raw folder, cleaned into `images/drive/atv.svg`, asked for as "seen from directly behind, straight on, a symmetrical rear view: the two big rear wheels side by side ... The rider sits upright with his back to the viewer ... Only his back shows, no face at all". The three-quarter drawing stays in the raw folder as `atv.svg`.

It cuts the drawing out of its background, fills what Recraft leaves unpainted (white walls, a thobe, a sail) so nothing is see-through, drops the embedded metadata, and crops to the drawing. A fourth argument drops the tiniest shapes of a heavy drawing. A new sprite also needs its width-to-height ratio in `SPRITES` and its height in `SIZE` in `js/drive.js`, and a line in `FILES` in `sw.js`.

## The stories' pictures

The stories are illustrated with full scenes, not sprites. They are raster pictures in the private style "Ashuddahuma stories (Basic)" (`aa69f6e4-9747-4e1f-b208-43a1000b618c`), made on 2026-11-24 from the Zamzam story's cover. Each one is asked for at 4:3, which gives 1216 by 896 WebP, used as Recraft makes it (`public/images/stories/<id>/`, raw copies in `recraft/stories-raw/<id>/`). The "flat outlined" style of the clock drew bare scenes with no sky, so the stories have their own.

A prophet's story shows no figure at all, so every prompt ends with "No people, no human figures, no hands, no buildings, no text, no letters, no signature". Name every object, and nothing that would not have been there: the father sent back a wooden cradle in the desert. A scene of today with writing in it (the kiswa's band, signs) is asked for with "plain ... geometric patterns, no calligraphy", so no garbled verse appears. "A bird circles" drew a ring in the sky; "one small bird flying" did not. Recraft sometimes leaves a tiny signature-like squiggle in a corner, so check the corners. See `docs/stories-plan.md` for each picture.

## The wudu and prayer pictures (the boy of «مُوسَى الطَّيَّارُ»)

Made on 2026-11-24 and 25 through Claude's Recraft connector, with the father watching and correcting each one; his rules for these pictures are in `CLAUDE.md` under Content rules. The hero is the boy on the cover of the family's printed books (black hair with a tuft, plain face, navy sweater, red scarf, dark trousers). No style or prompt of his was saved, so the cover was cut out of the PDF and used as a reference picture (`recraft/salah-raw/reference-boy.png`); the look of the tile (a warm orange rounded square with a pale arch, a red prayer rug) comes from a picture the father sent as the model.

- **The tool.** `image_edit` with an outside model, not Recraft's own: `nano_banana_2` (11 credits a picture) for most, `nano_banana_2_lite` (7) for small corrections, `gpt_image_2_medium` (about 10) when a pose must follow a guide exactly (it drew the front views of the two salams; it refuses archery), `nano_banana_pro` (20) for the archer. Each call is given one or two pictures already approved as the reference for the boy and the style.
- **One base picture per scene, then "change only the arms".** The standing postures were all made from one standing picture, the sitting ones from one sitting picture, the wudu stations from one picture of him at the tap. A picture that is wrong must never be passed as a reference: the model copies it back.
- **Right and left.** The model takes the far arm for every action and extends the far leg. So the wudu scene was drawn seen from his right and mirrored when saved (`node save-picture.js salah <name> <url> 768 flip`): seen from his left, the far arm is his right arm, which is the one that must work. The left arm was made from the picture with both hands under the tap (the right hand moved onto the left elbow). The left foot would not come out by any prompt or pose guide: it is the mirror image of the right-foot picture, so in that one picture he faces the other way. Name a hand by where it is in the picture (the one on the tap, the lower left one), never as near or far.
- **Pose guides.** A stick figure drawn in SVG and uploaded (`request_upload_url`, then a PUT of the file) helps with a posture the model resists.
- **What to check, at full size, before keeping a picture:** two hands and two feet, five fingers; which hand and which foot; the face plain; nothing wet before its turn; the scarf the same; he stands at the end of the rug and faces along it.
- **Files.** `recraft/save-picture.js` keeps the picture as Recraft gave it in `recraft/salah-raw/` and writes a 768 px WebP into `public/images/salah/` (through `tools/to-webp.js`, a headless Chrome's canvas: nothing to install). The archer for the sports door and the microscope for the lab door were made the same way (`recraft/sports-raw/`, `recraft/doors-raw/`).
- **The five skies** (`time-fajr` to `time-isha`): one picture of a small town at midday from Recraft's own model in the stories' style (2 credits), then four edits of it (dawn, afternoon, sunset, night), so the town is the same in all five. The dawn's crescent has its bright edge toward the coming sun.
- **Cost.** About 620 credits went on the first evening for 21 station pictures, the skies and the archer, most of it on corrections; the father added 800 on 2026-11-25.

## The counting hands (number matching game)

Five hands, `public/images/hands/hand-1.webp` to `hand-5.webp`, counted from the index finger: the father, 2026-11-25, "Index alone is number one." One is the index finger up with the other three folded under the thumb; two adds the middle finger (a V); three adds the ring finger, the thumb holding the little finger down; four is the four fingers with the thumb across the palm; five is the open hand. Every hand is upright, the palm toward us, the wrist at the bottom, the thumb side on our right. This is the fourth set made for him: two drawn in code were sent back ("very strange and confusing", "look very bad"), and a first set of pictures counted from the thumb, so its one was a thumbs-up (its raw files are in `recraft/hands-raw/thumb-first/`).

**One sheet, so one family.** A hand asked for alone comes in its own skin tone and line weight, and the first set had to be retoned. This set is one picture of five hands in a row (recraftv4_1_raster, 2:1, 2 credits a sheet), so the skin, the outline, the creases, the wrist and the size are the same by construction. The prompt that worked:

> Children's educational counting chart: five cartoon hands side by side in one horizontal row, evenly spaced, not touching each other, all exactly the same size and the same drawing style. Each is the same right hand held upright with the palm facing the viewer, the wrist at the bottom and the thumb on the right side of the hand. They count 1, 2, 3, 4, 5 on the fingers from left to right. First hand: pointing up, only the index finger raised, the other three fingers folded down under the thumb. Second hand: peace sign, the index finger and the middle finger raised in a V, the ring and little fingers folded down under the thumb. Third hand: the Scout sign, the three-finger salute: the index finger, the middle finger and the ring finger are raised straight up side by side, three tall fingers next to each other, and the thumb is folded across the palm holding down the tip of the little finger, the only finger that is bent. Fourth hand: the four fingers raised, only the thumb folded across the palm. Fifth hand: an open hand, all four fingers and the thumb spread apart. Simple children's book cartoon, thick warm brown outline, flat light peach skin, a few short brown lines for the finger creases and the palm creases, flat colors, no shading. Each wrist ends flat at the bottom with no sleeve. Plain white background, no numbers, no letters, no text, no shadow.

**What the model does.** It draws the common gestures by habit, which now helps: one, two, four and five came out right in almost every sheet. Three is the hard one. In nine sheets (three wordings, three sheets each) the third hand was a four, a second V, a V with both other fingers folded, the index, middle and little fingers with the ring finger folded (a strange sign, never to be used), and once three raised fingers with two folded ones beside them: six digits. Naming the gesture ("the Scout sign, the three-finger salute") is what got three fingers raised at all. "Like the letter W" did not. The open hand often comes with its thumb on the other side from the rest; that is mended by mirroring it.

**The one edit.** The best sheet (`sheet-c3.webp`) had four hands right and the six-digit three. It was mended with `image_edit` (model nano_banana_2, an outside model reached through the family's Recraft plan; 11 credits a call, so use it once, on a sheet that is otherwise right): "Edit only the third hand from the left ... it wrongly has TWO bent fingers on its left side under the thumb, which makes six digits. Redraw that hand so it has exactly five digits ... only ONE bent finger (the little finger) ... Do not change the other four hands at all." It mended the hand and redrew the whole sheet a little, with a slightly thinner line and at 1440 by 720 (`sheet-c3-edit.jpg`), so all five hands are taken from the edited sheet, never some from one sheet and some from the other.

**Check, at full size, every hand of every sheet:** count the digits one by one, the folded ones by their knuckles and their nails (raised + folded + thumb = five); which fingers are up; nothing fused or bent backwards; no hand that reads as a rude or strange sign (a lone middle finger, the index with the little finger, a fist with a thumb).

**Made sharp.** The edited sheet's hands are about 485 pixels tall, less than the 640 the site keeps, so its line came out soft. `crisp_upscale` (Recraft's own, 1 credit) made the same sheet 4096 by 2048 (`sheet-c3-edit-up.webp`) without redrawing anything: checked hand by hand against the sheet it came from. The site's copies are cut from that one and scaled down, which keeps the line crisp. The upscale leaves two things to clean, both handled by the cutting script: the white at the bottom of the narrow gap between two fingers turns cream, and a faint peach line runs just outside the outline in a few places.

**Cutting them out.** `recraft/hands-raw/cut-hands.js` (Node, through `tools/browser.js`; it serves the sheet to the browser itself, so the site need not be running) does it in the browser: the white joined to the picture's edge is the background; each joined piece left is a hand; at the rim, where the outline's brown is mixed with the white behind it, the pixel keeps the brown and becomes as see-through as it was white (measured on red, so the peach halo counts as white), so no white fringe shows on the game's card color. The same is done to the pale pixels deep in the gap between two fingers, which the first search cannot reach: left alone they are white needles and specks on a dark color. Every hand is cut at the same wrist line and scaled by the same number (the tallest hand is 640 pixels less a little clear space, the shorter ones keep more above), with two clear pixels kept on the left, the right and the top so that the outline's soft outer pixel is never cut by the picture's edge; the open hand is mirrored so its thumb is on our right like the others, and each is saved as WebP with its own width. It prints what it cleaned and the fingertips it finds, from which `HANDS` in `public/js/match.js` is written (the light sits a little below each tip). After any new cut, look at the five on the card color and on a dark color at full size, then draw the lights over every hand from one to ten and look.

**For the father to know.** All five hands are from the sheet as mended by the outside model and then upscaled by Recraft, both on the family's plan: he asked for Recraft and approves how pictures are made, so he is to be told. Hand 3 was kept as it is: its thumb lies across the little finger's middle, so that finger's nail shows below it, and its index finger is the shortest of the three raised (as it is in hands 2 and 4). A second edit would have redrawn all five hands again for that.

**Cost.** 30 credits on 2026-11-25: nine sheets (18), the one edit (11) and the upscale (1).

## The reading game's pictures

Six square pictures, `public/images/reading/<id>.webp` (768 px), made on 2026-11-25 when the father had the six Wikimedia photographs replaced. He chose the painted look of the Zamzam story ("like the Kaaba"), so the Kaaba is cut square from the story's page 13 and the other five are new: `generate_image` with the stories' style id (`aa69f6e4-9747-4e1f-b208-43a1000b618c`), 1:1, no model and no `input_style`, 2 credits each.

- **The animals** are side views with plain faces. They were first made seen from behind, which the father sent back: "I don't like the lion and rabbit from the back. Do front or side views with no facial features. Also, the rabbit can't look 'fatter/bigger' than the lion." What worked: "A big male lion standing on flat dry cracked earth with a few small stones, seen exactly from the side, facing right, filling most of the picture from edge to edge: a large chestnut-brown mane around his head and neck, a strong golden-tan body, four legs, a long tail with a dark tuft. His face is completely blank and smooth, a plain tan shape inside the mane: no eyes, no eyebrows, no nose, no nostrils, no mouth, no whiskers." and "A small slim brown rabbit sitting in a little patch of green grass with a few tiny flowers, seen exactly from the side, facing right. The rabbit is small in the picture, only about a third of its width, low in the frame ... Its face is completely blank and smooth: no eyes, no nose, no mouth, no whiskers." The style obeys the blank face. Size is then set by the cut: the lion fills about 85% of his square, the rabbit about 40% of hers.
- **This style paints any large flat surface as sky**, so a wall must be "built of big sandstone blocks, every block drawn, from edge to edge". It also adds a pool of water to open ground, and "no water" does not stop it: make another try, or mend it in the cut (`sand` in `cut-squares.js`).
- **Windows**: ask for arched windows with wooden shutters or diamond lattice; the first masjid came with window bars that made a cross and was dropped.
- `recraft/reading-raw/cut-squares.js` cuts each square (the cut of each picture is in its table) and keeps the picture as Recraft made it beside it; every try is in `recraft/reading-raw/tries/`. Cost: 32 credits for the first set, 20 for a second lion and door, 12 for the side views.

