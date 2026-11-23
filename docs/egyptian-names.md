# The Egyptian wording, for review

Every prompt the site can say in Egyptian: 51 of them. On screen the text is always Fusha; the Egyptian line is only read aloud when recording, and played when the ☰ menu's switch is on Egyptian. All of the Egyptian lines are Claude's drafts until a parent corrects them.

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
| Counting 1 | وَاحِد | واحد | `count-1-masri` |
| Counting 2 | اِثْنَان | اتنين | `count-2-masri` |
| Counting 3 | ثَلَاثَة | تلاتة | `count-3-masri` |
| Counting 4 | أَرْبَعَة | أربعة | `count-4-masri` |
| Counting 5 | خَمْسَة | خمسة | `count-5-masri` |
| Counting 6 | سِتَّة | ستة | `count-6-masri` |
| Counting 7 | سَبْعَة | سبعة | `count-7-masri` |

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
| Said when the first or the second maze opens | اِرْسُمْ خَطًّا مِنَ الْبِدَايَةِ إِلَى النِّهَايَةِ | ارسم خط من البداية للنهاية | `maze-draw-masri` |
| Said when a maze with a hidden picture opens, mazes 3 to 7 | اِتَّبِعِ الطَّرِيقَ وَاكْتَشِفِ الرَّسْمَ الْمَخْفِيَّ | امشي مع الطريق واكتشف الرسمة المستخبية | `maze-find-masri` |
| Asked at the end of a picture maze, before its picture comes clear | مَاذَا رَسَمْتَ؟ | رسمت إيه؟ | `maze-what-masri` |
| The hidden picture of maze 3 | مُثَلَّجَات | آيس كريم | `maze-icecream-masri` |
