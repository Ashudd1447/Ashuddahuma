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

Five raster pictures (recraftv4_1_raster, 3:4, 2 credits each), made on 2026-11-25 after the father sent back two sets drawn in code and showed a picture of hands as they should look: palm on, a warm brown outline, light skin, knuckle and palm lines. His son counts from the thumb, and image models draw the common index-first gestures by habit: asked for a thumb-first one, a model drew the index finger; asked for a thumb-first two, it drew the horn sign (never to be used). What worked was naming a gesture the model knows, or spelling out every finger:

- One: "Thumbs up hand gesture: one human hand made into a fist with the thumb pointing straight up, seen from the front so the four curled fingers face the viewer."
- Two: "One human hand making the letter L sign, palm facing the viewer: the index finger points straight up, the thumb points straight out to the side at a right angle with a wide open space between them, and the middle, ring and little fingers are curled down into the palm."
- Three: "... showing three the German way: the thumb, the index finger and the middle finger are extended and spread apart, while the ring finger and the little finger are curled down into the palm."
- Four (one try in seven was right): "The thumb points out to the side. The index finger, the middle finger and the ring finger point straight up, spread a little apart. The little finger alone is bent down and folded flat onto the palm, its fingertip touching the palm. So exactly three fingers point up, plus the thumb, and one small finger is folded."
- Five: all five fingers extended and spread apart.

Each ends with: "Children's book cartoon, thick warm brown outline, salmon peach skin, a few simple brown lines for knuckles and palm creases, flat colors, wrist ending at the bottom with no sleeve. Exactly one hand. Isolated on a plain white background, no text, no shadow." Count every finger of every try at full size. 20 tries, 48 credits. The kept ones were cut out of their white in the browser (a flood fill from the edges), cropped to 640 pixels high, the L mirrored so every thumb is on our left, and the first two retoned to the others' skin.

