# The Egyptian wording, for review

Every prompt the site can say in Egyptian: 136 of them. When the switch is on Egyptian and a line's Egyptian recording exists, that recording plays and its Egyptian text, exactly as on the card, shows in place of the Fusha (the father, 2026-11-26): record each line as the card reads, or change the card first. The salah door is Fusha only. All of the Egyptian lines are Claude's drafts until a parent corrects them.

Where they live: the recording cards in `public/js/record.js` (each `-masri` card, and the lists `COUNT_MASRI` and `HOURS_MASRI` at its top), shown on the Record page (`/admin` → Record audio) beside their Fusha cards. Tell Claude what to change, or change the card; then `node tools/list-egyptian.js` writes this list again.

A prompt with no Egyptian card is said the same way in both settings (one recording).

## Reciter prompts

| Said when | On screen (Fusha) | Egyptian, to say | Clip |
|---|---|---|---|
| After an ayah: now you read it | الْآنَ اقْرَأْهَا أَنْتَ | دلوقتي اقراها أنت | `read-it-masri` |

## Movement activity

| Said when | On screen (Fusha) | Egyptian, to say | Clip |
|---|---|---|---|
| Jump seven times | اقْفِزْ سَبْعَ مَرَّاتٍ! | نط سبع مرات! | `jump-masri` |
| Counting 1 (Fusha); the number games say it too, when a picture or a dot is counted | وَاحِد | واحد | `count-1-masri` |
| Counting 2 (Fusha); the number games say it too, when a picture or a dot is counted | اِثْنَان | اتنين | `count-2-masri` |
| Counting 3 (Fusha); the number games say it too, when a picture or a dot is counted | ثَلَاثَة | تلاتة | `count-3-masri` |
| Counting 4 (Fusha); the number games say it too, when a picture or a dot is counted | أَرْبَعَة | أربعة | `count-4-masri` |
| Counting 5 (Fusha); the number games say it too, when a picture or a dot is counted | خَمْسَة | خمسة | `count-5-masri` |
| Counting 6 (Fusha); the number games say it too, when a picture or a dot is counted | سِتَّة | ستة | `count-6-masri` |
| Counting 7 (Fusha); the number games say it too, when a picture or a dot is counted | سَبْعَة | سبعة | `count-7-masri` |
| Counting 8 (Fusha); the number games say it too, when a picture or a dot is counted | ثَمَانِيَة | تمانية | `count-8-masri` |
| Counting 9 (Fusha); the number games say it too, when a picture or a dot is counted | تِسْعَة | تسعة | `count-9-masri` |
| Counting 10 (Fusha); the number games say it too, when a picture or a dot is counted | عَشَرَة | عشرة | `count-10-masri` |

## Clock

| Said when | On screen (Fusha) | Egyptian, to say | Clip |
|---|---|---|---|
| 1 o'clock | السَّاعَةُ الْوَاحِدَةُ | الساعة واحدة | `hour-1-masri` |
| 2 o'clock | السَّاعَةُ الثَّانِيَةُ | الساعة اتنين | `hour-2-masri` |
| 3 o'clock | السَّاعَةُ الثَّالِثَةُ | الساعة تلاتة | `hour-3-masri` |
| 4 o'clock | السَّاعَةُ الرَّابِعَةُ | الساعة أربعة | `hour-4-masri` |
| 5 o'clock | السَّاعَةُ الْخَامِسَةُ | الساعة خمسة | `hour-5-masri` |
| 6 o'clock | السَّاعَةُ السَّادِسَةُ | الساعة ستة | `hour-6-masri` |
| 7 o'clock | السَّاعَةُ السَّابِعَةُ | الساعة سبعة | `hour-7-masri` |
| 8 o'clock | السَّاعَةُ الثَّامِنَةُ | الساعة تمانية | `hour-8-masri` |
| 9 o'clock | السَّاعَةُ التَّاسِعَةُ | الساعة تسعة | `hour-9-masri` |
| 10 o'clock | السَّاعَةُ الْعَاشِرَةُ | الساعة عشرة | `hour-10-masri` |
| 11 o'clock | السَّاعَةُ الْحَادِيَةَ عَشْرَةَ | الساعة حداشر | `hour-11-masri` |
| 12 o'clock | السَّاعَةُ الثَّانِيَةَ عَشْرَةَ | الساعة اتناشر | `hour-12-masri` |

## Driving game

| Said when | On screen (Fusha) | Egyptian, to say | Clip |
|---|---|---|---|
| Before every drive: fasten the seat belt | اِرْبِطْ حِزَامَ الْأَمَانِ | اربط حزام الأمان | `belt-masri` |
| Said on arriving at the masjid | الْمَسْجِدُ | المسجد | `place-masjid-masri` |
| Said on arriving at the grandmother's house | بَيْتُ جَدَّتِي | بيت أنَّه | `place-grandma-masri` |
| Said on arriving at the oasis, at the end of the ride that carries its name | الْوَاحَةُ | الواحة | `place-oasis-masri` |

## Building game

| Said when | On screen (Fusha) | Egyptian, to say | Clip |
|---|---|---|---|
| Before building: put on the safety gear (Fusha); the car factory uses it too | اِلْبَسْ مُعَدَّاتِ السَّلَامَةِ | البس لبس الأمان | `gear-masri` |
| The gloves: start with the right hand | اِبْدَأْ بِالْيَمِينِ | ابدأ باليمين | `start-right-masri` |
| Said when the bulldozer drives in | الْجَرَّافَةُ | البلدوزر | `dozer-masri` |
| Said when the workers carry the steel mesh into the pit | حَدِيدُ التَّسْلِيحِ | حديد التسليح | `part-steel-masri` |
| Said when the concrete pump drives in | مِضَخَّةُ الْخَرَسَانَةِ | مضخة الخرسانة | `pump-masri` |
| Said when the concrete mixer comes | خَلَّاطَةُ الْخَرَسَانَةِ | خلاطة الخرسانة | `mixer-masri` |
| Said when the truck drives in with the stone | الشَّاحِنَةُ | عربية النقل | `truck-masri` |
| Said when the forklift drives in | الرَّافِعَةُ الشَّوْكِيَّةُ | الكلارك | `forklift-masri` |
| Said when the crane starts work | الرَّافِعَةُ | الونش | `crane-masri` |
| Said when the hammer is picked up | الْمِطْرَقَةُ | الشاكوش | `tool-hammer-masri` |
| Said when the drill is picked up | الْمِثْقَابُ | الشنيور | `tool-drill-masri` |
| Said when the walls are up | الْجُدْرَانُ | الحيطان | `part-walls-masri` |
| Said when the minaret is finished | الْمِئْذَنَةُ | المدنة | `part-minaret-masri` |

## Car factory

| Said when | On screen (Fusha) | Egyptian, to say | Clip |
|---|---|---|---|
| Said when the chassis rides in | الْهَيْكَلُ | الشاسيه | `car-chassis-masri` |
| Said when the engine comes on its dolly | الْمُحَرِّكُ | الموتور | `car-engine-masri` |
| Said when the seats come on their cart | الْمَقَاعِدُ | الكراسي | `car-seats-masri` |
| Said when the paint booth opens | الطِّلَاءُ | الدهان | `car-paint-masri` |
| Said when the painted body comes in on the hoist | جِسْمُ السَّيَّارَةِ | جسم العربية | `car-body-masri` |
| Said when the doors come on their rack | الْأَبْوَابُ | البيبان | `car-doors-masri` |
| Said when the wheels come on their cart | الْعَجَلَاتُ | العجل | `car-wheels-masri` |
| Said when the wheel wrench is picked up | مِفْتَاحُ الْعَجَلَاتِ | مفتاح العجل | `tool-wrench-masri` |
| Said when the headlights come on their cart | الْمَصَابِيحُ | الفوانيس | `car-lights-masri` |

## Mazes

| Said when | On screen (Fusha) | Egyptian, to say | Clip |
|---|---|---|---|
| Said when a maze without a picture opens | اِرْسُمْ خَطًّا مِنَ الْبِدَايَةِ إِلَى النِّهَايَةِ | ارسم خط من البداية للنهاية | `maze-draw-masri` |
| Said when a maze with a hidden picture opens | اِتَّبِعِ الطَّرِيقَ وَاكْتَشِفِ الرَّسْمَ الْمَخْفِيَّ | امشي مع الطريق واكتشف الرسمة المستخبية | `maze-find-masri` |
| Asked at the end of a picture maze, before its picture comes clear | مَاذَا رَسَمْتَ؟ | رسمت إيه؟ | `maze-what-masri` |
| The hidden picture of maze 3 | مُثَلَّجَات | آيس كريم | `maze-icecream-masri` |
| Said when the maze with the car and the house opens | سَاعِدِ السَّيَّارَةَ لِتَصِلَ إِلَى الْبَيْتِ | ساعد العربية توصل البيت | `maze-help-car-masri` |
| Said when the maze with the airplane and the cloud opens | سَاعِدِ الطَّائِرَةَ لِتَصِلَ إِلَى السَّحَابَةِ | ساعد الطيارة توصل للسحابة | `maze-help-plane-masri` |
| Said when the maze with the bus and the masjid opens | سَاعِدِ الْحَافِلَةَ لِتَصِلَ إِلَى الْمَسْجِدِ | ساعد الأتوبيس يوصل المسجد | `maze-help-bus-masri` |
| Said when the maze with the bicycle and the tree opens | سَاعِدِ الدَّرَّاجَةَ لِتَصِلَ إِلَى الشَّجَرَةِ | ساعد العجلة توصل للشجرة | `maze-help-bike-masri` |
| Said when the maze with the balloon and the sun opens | سَاعِدِ الْبَالُونَ لِيَصِلَ إِلَى الشَّمْسِ | ساعد البالونة توصل للشمس | `maze-help-balloon-masri` |
| A hidden picture from the books: an airplane seen from above | طَائِرَة | طيارة | `maze-plane-masri` |
| A hidden picture from the books: a sailboat | قَارِب | مركب | `maze-boat-masri` |
| A hidden picture from the books: a car seen from the side, its roof on top and its two wheels below. Confirm the reading before recording | سَيَّارَة | عربية | `maze-car-masri` |
| A hidden picture from the books: an umbrella | مِظَلَّة | شمسية | `maze-umbrella-masri` |
| A hidden picture from the books: a mug with a handle | كُوب | كوباية | `maze-cup-masri` |

## Numbers and thinking games

| Said when | On screen (Fusha) | Egyptian, to say | Clip |
|---|---|---|---|
| Counting game: count, then press the number | عُدَّ، ثُمَّ اضْغَطْ عَلَى الْعَدَدِ | عِد، وبعدين دوس على العدد | `sheet-count-masri` |
| Color as many shapes as the number says | لَوِّنْ بِعَدَدِ الرَّقْمِ | لوِّن على قد الرقم | `sheet-color-count-masri` |
| Join each group to its number | صِلْ كُلَّ مَجْمُوعَةٍ بِعَدَدِهَا | وصَّل كل مجموعة بعددها | `sheet-match-number-masri` |
| Join the dots in order | صِلِ النِّقَاطَ بِالتَّرْتِيبِ | وصَّل النقط بالترتيب | `sheet-dots-masri` |
| Press the box that holds more | اِضْغَطْ عَلَى الْأَكْثَرِ | دوس على الأكتر | `sheet-more-masri` |
| Press the biggest | اِضْغَطْ عَلَى الْأَكْبَرِ | دوس على الأكبر | `sheet-bigger-masri` |
| Press the smallest | اِضْغَطْ عَلَى الْأَصْغَرِ | دوس على الأصغر | `sheet-smaller-masri` |
| Which number is missing? | مَا الْعَدَدُ النَّاقِصُ؟ | إيه العدد الناقص؟ | `sheet-missing-masri` |
| Color the shapes as in the example | لَوِّنِ الْأَشْكَالَ كَمَا فِي الْمِثَالِ | لوِّن الأشكال زي المثال | `sheet-shapes-masri` |
| Adding with pictures: count them all, then press the answer | عُدَّ الْكُلَّ، ثُمَّ اضْغَطْ عَلَى الْجَوَابِ | عِد الكل، وبعدين دوس على الإجابة | `sheet-add-masri` |
| Color each number with its color | لَوِّنْ كُلَّ رَقْمٍ بِلَوْنِهِ | لوِّن كل رقم بلونه | `sheet-color-number-masri` |
| Join each picture to its shadow | صِلْ كُلَّ صُورَةٍ بِظِلِّهَا | وصَّل كل صورة بضلها | `sheet-shadow-masri` |
| Press the one that does not belong | اِضْغَطْ عَلَى الْمُخْتَلِفِ | دوس على المختلف | `sheet-different-masri` |
| Press the two pictures that are the same | اِضْغَطْ عَلَى الصُّورَتَيْنِ الْمُتَشَابِهَتَيْنِ | دوس على الصورتين اللي زي بعض | `sheet-similar-masri` |
| What comes next in the row? | مَاذَا يَأْتِي بَعْدُ؟ | إيه اللي ييجي بعد كده؟ | `sheet-next-masri` |
| Color every letter like this one | لَوِّنْ كُلَّ حَرْفٍ مِثْلَ هَذَا | لوِّن كل حرف زي ده | `sheet-letter-masri` |
| Find three differences; the screen shows the number as a digit | اِبْحَثْ عَنْ ثَلَاثَةِ اخْتِلَافَاتٍ | دوَّر على تلات اختلافات | `sheet-differences-masri` |
| Finish the drawing | أَكْمِلِ الرَّسْمَ | كمِّل الرسمة | `sheet-complete-masri` |

## Lab: light and mirrors

| Said when | On screen (Fusha) | Egyptian, to say | Clip |
|---|---|---|---|
| Turn the mirror so the light reaches the lantern | أَدِرِ الْمِرْآةَ لِيَصِلَ الضَّوْءُ إِلَى الْفَانُوسِ | لِف المراية عشان النور يوصل للفانوس | `light-turn-masri` |
| Bring the light to the flower | أَوْصِلِ الضَّوْءَ إِلَى الزَّهْرَةِ | وصَّل النور للوردة | `light-flower-masri` |
| Bring the light to the solar panel | أَوْصِلِ الضَّوْءَ إِلَى اللَّوْحِ الشَّمْسِيِّ | وصَّل النور للوح الشمسي | `light-panel-masri` |
| Bring the light to the crystal | أَوْصِلِ الضَّوْءَ إِلَى الْبِلَّوْرَةِ | وصَّل النور للبلورة | `light-crystal-masri` |
| Light bounces from mirror to mirror | الضَّوْءُ يَنْعَكِسُ مِنْ مِرْآةٍ إِلَى مِرْآةٍ | النور بينعكس من مراية لمراية | `light-mirrors-masri` |
| Move the mirror and turn it | حَرِّكِ الْمِرْآةَ وَأَدِرْهَا | حرَّك المراية ولِفَّها | `light-slide-masri` |

## Archery

| Said when | On screen (Fusha) | Egyptian, to say | Clip |
|---|---|---|---|
| Pull the arrow, then let it go | اِسْحَبِ السَّهْمَ ثُمَّ أَطْلِقْهُ | اسحب السهم بعدين سيبه | `archery-pull-masri` |
| Aim at the target | صَوِّبْ نَحْوَ الْهَدَفِ | نشِّن على الهدف | `archery-aim-masri` |
| The swinging sandbag: wait for the right moment | اِنْتَظِرِ اللَّحْظَةَ الْمُنَاسِبَةَ | استنى اللحظة المناسبة | `archery-wait-masri` |
| Hit the three clay pots | أَصِبِ الْجِرَارَ الثَّلَاثَ | اضرب التلات قلل | `archery-pots-masri` |
| Choose where to stand | اِخْتَرْ مَكَانَ الْوُقُوفِ | اختار مكان الوقوف | `archery-place-masri` |

## Numbers: صِلْ كُلَّ رَقْمٍ

| Said when | On screen (Fusha) | Egyptian, to say | Clip |
|---|---|---|---|
| The name of the game, said at the start: join each number to its picture | صِلْ كُلَّ رَقْمٍ بِالصُّورَةِ الْمُنَاسِبَةِ لَهُ | وصّل كل رقم بالصورة المناسبة ليه | `numbers-match-masri` |

## Arabic: أَيْنَ؟

| Said when | On screen (Fusha) | Egyptian, to say | Clip |
|---|---|---|---|
| Sentence: ball in box | الْكُرَةُ فِي الصُّنْدُوقِ | الكورة جوّه الصندوق | `where-ball-in-box-masri` |
| Sentence: apple in basket | التُّفَّاحَةُ فِي السَّلَّةِ | التفاحة جوّه السَّبَت | `where-apple-in-basket-masri` |
| Sentence: cat in box | الْقِطَّةُ فِي الصُّنْدُوقِ | القطة جوّه الصندوق | `where-cat-in-box-masri` |
| Sentence: apple on table | التُّفَّاحَةُ عَلَى الطَّاوِلَةِ | التفاحة على الترابيزة | `where-apple-on-table-masri` |
| Sentence: cat on chair | الْقِطَّةُ عَلَى الْكُرْسِيِّ | القطة على الكرسي | `where-cat-on-chair-masri` |
| Sentence: bird on tree | الْعُصْفُورُ عَلَى الشَّجَرَةِ | العصفورة على الشجرة | `where-bird-on-tree-masri` |
| Sentence: ball under table | الْكُرَةُ تَحْتَ الطَّاوِلَةِ | الكورة تحت الترابيزة | `where-ball-under-table-masri` |
| Sentence: cat under chair | الْقِطَّةُ تَحْتَ الْكُرْسِيِّ | القطة تحت الكرسي | `where-cat-under-chair-masri` |
| Sentence: apple under tree | التُّفَّاحَةُ تَحْتَ الشَّجَرَةِ | التفاحة تحت الشجرة | `where-apple-under-tree-masri` |
| Sentence: balloon above table | الْبَالُونُ فَوْقَ الطَّاوِلَةِ | البلونة فوق الترابيزة | `where-balloon-above-table-masri` |
| Sentence: plane above house | الطَّائِرَةُ فَوْقَ الْبَيْتِ | الطيارة فوق البيت | `where-plane-above-house-masri` |
| Sentence: bird above tree | الْعُصْفُورُ فَوْقَ الشَّجَرَةِ | العصفورة فوق الشجرة | `where-bird-above-tree-masri` |
| Sentence: car front house | السَّيَّارَةُ أَمَامَ الْبَيْتِ | العربية قدّام البيت | `where-car-front-house-masri` |
| Sentence: ball front box | الْكُرَةُ أَمَامَ الصُّنْدُوقِ | الكورة قدّام الصندوق | `where-ball-front-box-masri` |
| Sentence: cat front basket | الْقِطَّةُ أَمَامَ السَّلَّةِ | القطة قدّام السَّبَت | `where-cat-front-basket-masri` |
| Sentence: cat behind box | الْقِطَّةُ خَلْفَ الصُّنْدُوقِ | القطة ورا الصندوق | `where-cat-behind-box-masri` |
| Sentence: car behind house | السَّيَّارَةُ خَلْفَ الْبَيْتِ | العربية ورا البيت | `where-car-behind-house-masri` |
| Sentence: ball behind basket | الْكُرَةُ خَلْفَ السَّلَّةِ | الكورة ورا السَّبَت | `where-ball-behind-basket-masri` |
| Sentence: ball beside box | الْكُرَةُ بِجَانِبِ الصُّنْدُوقِ | الكورة جنب الصندوق | `where-ball-beside-box-masri` |
| Sentence: cat beside basket | الْقِطَّةُ بِجَانِبِ السَّلَّةِ | القطة جنب السَّبَت | `where-cat-beside-basket-masri` |
| Sentence: car beside house | السَّيَّارَةُ بِجَانِبِ الْبَيْتِ | العربية جنب البيت | `where-car-beside-house-masri` |
| Sentence: ball between box | الْكُرَةُ بَيْنَ الصُّنْدُوقَيْنِ | الكورة بين الصندوقين | `where-ball-between-box-masri` |
| Sentence: cat between chair | الْقِطَّةُ بَيْنَ الْكُرْسِيَّيْنِ | القطة بين الكرسيين | `where-cat-between-chair-masri` |
| Sentence: car between tree | السَّيَّارَةُ بَيْنَ الشَّجَرَتَيْنِ | العربية بين الشجرتين | `where-car-between-tree-masri` |
| The word alone, said when he taps it (in) | فِي | جوّه | `where-word-in-masri` |
| The word alone, said when he taps it (on) | عَلَى | على | `where-word-on-masri` |
| The word alone, said when he taps it (under) | تَحْتَ | تحت | `where-word-under-masri` |
| The word alone, said when he taps it (above) | فَوْقَ | فوق | `where-word-above-masri` |
| The word alone, said when he taps it (front) | أَمَامَ | قدّام | `where-word-front-masri` |
| The word alone, said when he taps it (behind) | خَلْفَ | ورا | `where-word-behind-masri` |
| The word alone, said when he taps it (beside) | بِجَانِبِ | جنب | `where-word-beside-masri` |
| The word alone, said when he taps it (between) | بَيْنَ | بين | `where-word-between-masri` |
| Question: where is the ball? | أَيْنَ الْكُرَةُ؟ | فين الكورة؟ | `where-q-ball-masri` |
| Question: where is the apple? | أَيْنَ التُّفَّاحَةُ؟ | فين التفاحة؟ | `where-q-apple-masri` |
| Question: where is the car? | أَيْنَ السَّيَّارَةُ؟ | فين العربية؟ | `where-q-car-masri` |
| Question: where is the gift? | أَيْنَ الْهَدِيَّةُ؟ | فين الهدية؟ | `where-q-gift-masri` |
| Question: where is the cat? | أَيْنَ الْقِطَّةُ؟ | فين القطة؟ | `where-q-cat-masri` |
| Question: where is the bird? | أَيْنَ الْعُصْفُورُ؟ | فين العصفورة؟ | `where-q-bird-masri` |
| Question: where is the balloon? | أَيْنَ الْبَالُونُ؟ | فين البلونة؟ | `where-q-balloon-masri` |
| Question: where is the plane? | أَيْنَ الطَّائِرَةُ؟ | فين الطيارة؟ | `where-q-plane-masri` |
| Question: which picture? | أَيُّ صُورَةٍ؟ | أنهي صورة؟ | `where-which-masri` |
| Question: listen and move it | اِسْمَعْ وَحَرِّكْ | اسمع وحرّك | `where-put-masri` |
