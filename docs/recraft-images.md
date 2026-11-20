# Making the games' pictures in Recraft

How to make pictures for the site in Recraft (recraft.ai) so they look like one family and follow the site's rules. Start with the clock's "my day" pictures; the same steps serve the other games.

## The rules every picture follows

- **No facial features on any figure.** A plain, smooth face: no eyes, eyebrows, nose or mouth. Hair, ears, hands and clothes are drawn. Recraft often adds a face anyway, so check every picture and erase the face (see step 5) or try again.
- Modest clothes. Women in hijab and abaya; men and boys in thobes, jalabiyas, or shirts with long trousers.
- No text, letters or numbers in the picture (the site writes its own Arabic), no musical instruments, no crosses, churches or other non-Islamic buildings. A masjid in the background is welcome.
- The Quran, if it appears, sits on a stand or in hands, never on the floor.
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

A character description to paste at the start of every scene prompt. Change the clothes if you prefer; just keep the same words in every prompt.

> A 4-year-old boy with short dark brown hair, a smooth plain face with no eyes, no nose and no mouth, light brown skin, wearing a light blue long-sleeved shirt and dark blue trousers. Flat children's book illustration, soft shading, warm colors, simple clean shapes, no text.

## The "my day" scenes

The hours are placeholders: tell Claude the real hour for each scene in his day, and which scenes to keep (the game uses whole hours only for now).

| File | Hour (to set) | Scene to add after the description |
|---|---|---|
| `day-wake.png` | 7 | Waking up in bed, stretching his arms, morning sunlight through a window with an arched frame |
| `day-breakfast.png` | 8 | Sitting at a wooden kitchen table eating breakfast with his right hand: bread, cheese, an egg, a glass of milk |
| `day-quran.png` | 9 | Sitting on a rug for his Quran lesson, the mushaf open on a wooden stand in front of him, a parent beside him (faceless, modestly dressed) |
| `day-play.png` | 10 | Playing with a ball in a sunny courtyard with potted plants and blue tiles |
| `day-lunch.png` | 1 | Eating lunch with his family around a table; everyone faceless, the mother in hijab |
| `day-nap.png` | 2 | Napping on his right side on a bed, a light blanket, curtains half drawn |
| `day-park.png` | 4 | Going down a slide at a park with palm trees, a minaret far in the background |
| `day-dinner.png` | 6 | Eating dinner with his family at sunset, warm lamp light |
| `day-teeth.png` | 7 | Brushing his teeth at a bathroom sink, in pajamas |
| `day-bed.png` | 8 | Sitting on his bed in pajamas, hands raised in du'a before sleep, a night sky with a crescent moon in the window |

## Later: the two heroes (obstacle course, archery)

Only after you decide to use Recraft for the heroes (see `docs/games-plan.md`). The game will need each boy in a few poses (standing, walking, jumping), so ask for a character sheet:

> Character sheet of a 5-year-old boy shown in three poses side by side: standing, walking, jumping. Smooth plain face with no eyes, no nose and no mouth. **Musa:** white thobe and a green kufi, brown sandals. Flat children's game illustration, side view, clean shapes, plain white background, no text.

For Ubai, use the same prompt with: a light blue jalabiya and a white kufi. Export these with a transparent background if Recraft offers it, or on plain white.
