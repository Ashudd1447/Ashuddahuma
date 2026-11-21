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

It cuts the drawing out of its background, fills what Recraft leaves unpainted (white walls, a thobe, a sail) so nothing is see-through, drops the embedded metadata, and crops to the drawing. A fourth argument drops the tiniest shapes of a heavy drawing. A new sprite also needs its width-to-height ratio in `SPRITES` and its height in `SIZE` in `js/drive.js`, and a line in `FILES` in `sw.js`.
