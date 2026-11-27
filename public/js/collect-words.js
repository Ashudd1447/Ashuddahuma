/* «اِجْمَعْ وَعُدَّ» (collect.html): its rounds and every sentence it says, in
   Fusha and in Egyptian. collect.js plays them; record.html loads this file
   too, to make a recording card for each sentence (each + -masri), and
   tools/list-egyptian.js reads it for the Egyptian text.

   The father's requests (2026-11-26): a game that joins numbers, shapes and
   colors, from easy to hard, starting with "collect three circles", then
   "four red squares"; then harder ("three large red circles"); then, the
   same night: "it's not fun … Make it more fun for a 4 year old. I struggle
   to keep him away from video game style games", no more rounds like
   "three non-red circles", and no attribute named that nothing on the
   screen differs in. So the rounds are five little games that take turns,
   each with something that moves and answers back:
   - train:   «اِجْمَعْ …»: the shapes asked for are loaded on a train's
              wagons; when it is full it whistles and leaves;
   - count:   «كَمْ …؟» under a night sky: a tap lights each one with its
              number, then the number among three;
   - catch:   «اِلْتَقِطْ …»: shapes rise in bubbles; a tap on a right one pops
              it and its shape drops into the jar;
   - build:   «اِبْنِ …»: a picture drawn in dashed outlines is built from
              shapes of the right kind and size; when it is whole it comes
              alive (the car drives off, the rocket flies);
   - compare: «أَيُّهُمَا أَكْثَرُ: …؟» (or أَقَلُّ) under the night sky.
   All the wording is Claude's draft until the parents approve it.

   A group: { n, shape, color, size }; shape 'shape' is any shape.

   The sentences are put together here by the rules of Arabic numbers:
   after three to ten the number takes the other gender from the thing
   counted (ثَلَاثَ دَوَائِرَ, ثَلَاثَةَ مُرَبَّعَاتٍ), the thing counted is a
   plural in the genitive, and an adjective after a plural of things is
   feminine and singular (مُرَبَّعَاتٍ صَغِيرَةٍ حَمْرَاءَ); one and two follow
   their noun (مُرَبَّعًا وَاحِدًا, دَائِرَتَيْنِ كَبِيرَتَيْنِ حَمْرَاوَيْنِ); كَمْ
   takes a singular in the accusative (كَمْ مُرَبَّعًا أَحْمَرَ؟); a size comes
   before a color. */
window.COLLECT_WORDS = (() => {
  /* Each shape. Fusha: one (accusative), two (accusative), many (genitive
     plural, after a number), the (definite plural, nominative), and its
     gender; then the Egyptian. */
  const SHAPES = {
    circle: { fem: true, one: 'دَائِرَةً', two: 'دَائِرَتَيْنِ', many: 'دَوَائِرَ', the: 'الدَّوَائِرُ', masri: { fem: true, one: 'دايرة', two: 'دايرتين', many: 'دواير', the: 'الدواير' } },
    square: { fem: false, one: 'مُرَبَّعًا', two: 'مُرَبَّعَيْنِ', many: 'مُرَبَّعَاتٍ', the: 'الْمُرَبَّعَاتُ', masri: { fem: false, one: 'مربع', two: 'مربعين', many: 'مربعات', the: 'المربعات' } },
    triangle: { fem: false, one: 'مُثَلَّثًا', two: 'مُثَلَّثَيْنِ', many: 'مُثَلَّثَاتٍ', the: 'الْمُثَلَّثَاتُ', masri: { fem: false, one: 'مثلث', two: 'مثلثين', many: 'مثلثات', the: 'المثلثات' } },
    star: { fem: false, one: 'نَجْمًا', two: 'نَجْمَيْنِ', many: 'نُجُومٍ', the: 'النُّجُومُ', masri: { fem: true, one: 'نجمة', two: 'نجمتين', many: 'نجوم', the: 'النجوم' } },
    heart: { fem: false, one: 'قَلْبًا', two: 'قَلْبَيْنِ', many: 'قُلُوبٍ', the: 'الْقُلُوبُ', masri: { fem: false, one: 'قلب', two: 'قلبين', many: 'قلوب', the: 'القلوب' } },
    crescent: { fem: false, one: 'هِلَالًا', two: 'هِلَالَيْنِ', many: 'أَهِلَّةٍ', the: 'الْأَهِلَّةُ', masri: { fem: false, one: 'هلال', two: 'هلالين', many: 'أهلّة', the: 'الأهلّة' } },
    rectangle: { fem: false, one: 'مُسْتَطِيلًا', two: 'مُسْتَطِيلَيْنِ', many: 'مُسْتَطِيلَاتٍ', the: 'الْمُسْتَطِيلَاتُ', masri: { fem: false, one: 'مستطيل', two: 'مستطيلين', many: 'مستطيلات', the: 'المستطيلات' } },
    // Any shape.
    shape: { fem: false, one: 'شَكْلًا', two: 'شَكْلَيْنِ', many: 'أَشْكَالٍ', the: 'الْأَشْكَالُ', masri: { fem: false, one: 'شكل', two: 'شكلين', many: 'أشكال', the: 'الأشكال' } },
  };

  /* Each adjective. Fusha: after one (accusative, masculine m1 and feminine
     f1), after two (m2, f2), after many (genitive, feminine singular), and
     the (definite, nominative, feminine). Egyptian: after one (m1, f1),
     after two, after many, the. */
  const COLORS = {
    red: { m1: 'أَحْمَرَ', f1: 'حَمْرَاءَ', m2: 'أَحْمَرَيْنِ', f2: 'حَمْرَاوَيْنِ', many: 'حَمْرَاءَ', the: 'الْحَمْرَاءُ', masri: { m1: 'أحمر', f1: 'حمرا', two: 'حُمر', many: 'حمرا', the: 'الحمرا' }, fill: '#E5484D', edge: '#A8282C' },
    blue: { m1: 'أَزْرَقَ', f1: 'زَرْقَاءَ', m2: 'أَزْرَقَيْنِ', f2: 'زَرْقَاوَيْنِ', many: 'زَرْقَاءَ', the: 'الزَّرْقَاءُ', masri: { m1: 'أزرق', f1: 'زرقا', two: 'زُرق', many: 'زرقا', the: 'الزرقا' }, fill: '#3B7DDD', edge: '#22519A' },
    yellow: { m1: 'أَصْفَرَ', f1: 'صَفْرَاءَ', m2: 'أَصْفَرَيْنِ', f2: 'صَفْرَاوَيْنِ', many: 'صَفْرَاءَ', the: 'الصَّفْرَاءُ', masri: { m1: 'أصفر', f1: 'صفرا', two: 'صُفر', many: 'صفرا', the: 'الصفرا' }, fill: '#F7C833', edge: '#B48A08' },
    green: { m1: 'أَخْضَرَ', f1: 'خَضْرَاءَ', m2: 'أَخْضَرَيْنِ', f2: 'خَضْرَاوَيْنِ', many: 'خَضْرَاءَ', the: 'الْخَضْرَاءُ', masri: { m1: 'أخضر', f1: 'خضرا', two: 'خُضر', many: 'خضرا', the: 'الخضرا' }, fill: '#3DAE5C', edge: '#24793A' },
    orange: { m1: 'بُرْتُقَالِيًّا', f1: 'بُرْتُقَالِيَّةً', m2: 'بُرْتُقَالِيَّيْنِ', f2: 'بُرْتُقَالِيَّتَيْنِ', many: 'بُرْتُقَالِيَّةٍ', the: 'الْبُرْتُقَالِيَّةُ', masri: { m1: 'برتقاني', f1: 'برتقاني', two: 'برتقاني', many: 'برتقاني', the: 'البرتقاني' }, fill: '#F58A2B', edge: '#B0560F' },
    purple: { m1: 'بَنَفْسَجِيًّا', f1: 'بَنَفْسَجِيَّةً', m2: 'بَنَفْسَجِيَّيْنِ', f2: 'بَنَفْسَجِيَّتَيْنِ', many: 'بَنَفْسَجِيَّةٍ', the: 'الْبَنَفْسَجِيَّةُ', masri: { m1: 'بنفسجي', f1: 'بنفسجي', two: 'بنفسجي', many: 'بنفسجي', the: 'البنفسجي' }, fill: '#9B5BD3', edge: '#653197' },
  };
  const SIZES = {
    large: { m1: 'كَبِيرًا', f1: 'كَبِيرَةً', m2: 'كَبِيرَيْنِ', f2: 'كَبِيرَتَيْنِ', many: 'كَبِيرَةٍ', the: 'الْكَبِيرَةُ', masri: { m1: 'كبير', f1: 'كبيرة', two: 'كبار', many: 'كبيرة', the: 'الكبيرة' } },
    small: { m1: 'صَغِيرًا', f1: 'صَغِيرَةً', m2: 'صَغِيرَيْنِ', f2: 'صَغِيرَتَيْنِ', many: 'صَغِيرَةٍ', the: 'الصَّغِيرَةُ', masri: { m1: 'صغير', f1: 'صغيرة', two: 'صغيرين', many: 'صغيرة', the: 'الصغيرة' } },
  };

  /* The pictures to build, as objects of «اِبْنِ». */
  const PICTURES = {
    tree: { text: 'الشَّجَرَةَ', masri: 'الشجرة' },
    house: { text: 'الْبَيْتَ', masri: 'البيت' },
    car: { text: 'السَّيَّارَةَ', masri: 'العربية' },
    icecream: { text: 'الْمُثَلَّجَاتِ', masri: 'الآيس كريم' },
    boat: { text: 'الْقَارِبَ', masri: 'المركب' },
    rocket: { text: 'الصَّارُوخَ', masri: 'الصاروخ' },
    lantern: { text: 'الْفَانُوسَ', masri: 'الفانوس' },
    masjid: { text: 'الْمَسْجِدَ', masri: 'المسجد' },
  };

  /* Three to ten as the object of the verb: for a masculine thing, then for
     a feminine one; and the Egyptian, the same for both. */
  const MANY_M = { 3: 'ثَلَاثَةَ', 4: 'أَرْبَعَةَ', 5: 'خَمْسَةَ', 6: 'سِتَّةَ', 7: 'سَبْعَةَ', 8: 'ثَمَانِيَةَ', 9: 'تِسْعَةَ', 10: 'عَشَرَةَ' };
  const MANY_F = { 3: 'ثَلَاثَ', 4: 'أَرْبَعَ', 5: 'خَمْسَ', 6: 'سِتَّ', 7: 'سَبْعَ', 8: 'ثَمَانِيَ', 9: 'تِسْعَ', 10: 'عَشْرَ' };
  const MANY_MASRI = { 3: 'تلات', 4: 'أربع', 5: 'خمس', 6: 'ست', 7: 'سبع', 8: 'تمن', 9: 'تسع', 10: 'عشر' };

  const VERBS = {
    train: { text: 'اِجْمَعْ', masri: 'لِمّ' },
    catch: { text: 'اِلْتَقِطْ', masri: 'امسك' },
    build: { text: 'اِبْنِ', masri: 'ابني' },
  };

  /* One group, as the object of the verb. */
  function phrase(part, masri) {
    const s = SHAPES[part.shape];
    const adjs = [part.size && SIZES[part.size], part.color && COLORS[part.color]].filter(Boolean);
    if (masri) {
      const m = s.masri;
      const one = (a) => (m.fem ? a.masri.f1 : a.masri.m1);
      if (part.n === 1) return adjs.length ? [m.one, ...adjs.map(one)].join(' ') : `${m.one} ${m.fem ? 'واحدة' : 'واحد'}`;
      if (part.n === 2) return [m.two, ...adjs.map((a) => a.masri.two)].join(' ');
      return [MANY_MASRI[part.n], m.many, ...adjs.map((a) => a.masri.many)].join(' ');
    }
    const one = (a) => (s.fem ? a.f1 : a.m1);
    if (part.n === 1) return adjs.length ? [s.one, ...adjs.map(one)].join(' ') : `${s.one} ${s.fem ? 'وَاحِدَةً' : 'وَاحِدًا'}`;
    if (part.n === 2) return [s.two, ...adjs.map((a) => (s.fem ? a.f2 : a.m2))].join(' ');
    return [(s.fem ? MANY_F : MANY_M)[part.n], s.many, ...adjs.map((a) => a.many)].join(' ');
  }

  /* A group of a comparison, definite: «الدَّوَائِرُ», «الْأَشْكَالُ الْحَمْرَاءُ»;
     the second one leaves «الْأَشْكَالُ» out (أَمِ الزَّرْقَاءُ). */
  function group(g, masri, second) {
    const [k, v] = Object.entries(g)[0];
    if (k === 'shape') return masri ? SHAPES[v].masri.the : SHAPES[v].the;
    const a = (k === 'color' ? COLORS : SIZES)[v];
    if (second) return masri ? a.masri.the : a.the;
    return masri ? `${SHAPES.shape.masri.the} ${a.masri.the}` : `${SHAPES.shape.the} ${a.the}`;
  }

  /* What a round says. */
  function say(round, masri) {
    const pick = masri ? 'masri' : 'text';
    if (round.kind === 'build') return `${VERBS.build[pick]} ${PICTURES[round.picture][pick]}`;
    if (round.kind === 'count') {
      const part = round.parts[0];
      const s = SHAPES[part.shape];
      const adjs = [part.size && SIZES[part.size], part.color && COLORS[part.color]].filter(Boolean);
      if (masri) return `كام ${[s.masri.one, ...adjs.map((a) => (s.masri.fem ? a.masri.f1 : a.masri.m1))].join(' ')}؟`;
      return `كَمْ ${[s.one, ...adjs.map((a) => (s.fem ? a.f1 : a.m1))].join(' ')}؟`;
    }
    if (round.kind === 'compare') {
      const which = round.more ? (masri ? 'أكتر' : 'أَكْثَرُ') : (masri ? 'أقل' : 'أَقَلُّ');
      const [a, b] = round.groups;
      return masri
        ? `مين ${which}: ${group(a, true)} ولا ${group(b, true, true)}؟`
        : `أَيُّهُمَا ${which}: ${group(a, false)} أَمِ ${group(b, false, true)}؟`;
    }
    return `${VERBS[round.kind][pick]} ${round.parts.map((part) => phrase(part, masri)).join(masri ? ' و' : ' وَ')}`;
  }

  const partId = (p) => [p.n, p.shape, p.size, p.color].filter(Boolean).join('-');
  const kindId = (p) => [p.shape !== 'shape' && p.shape, p.size, p.color].filter(Boolean).join('-') || 'shape';
  function clip(round) {
    if (round.kind === 'build') return `build-${round.picture}`;
    if (round.kind === 'count') return `howmany-${kindId(round.parts[0])}`;
    if (round.kind === 'compare') return `${round.more ? 'more' : 'fewer'}-${round.groups.map((g) => Object.values(g)[0]).join('-')}`;
    return `${round.kind === 'train' ? 'collect' : 'catch'}-${round.parts.map(partId).join('-and-')}`;
  }

  /* The rounds, easy to hard, in turns of five: train, count, catch, build,
     compare. A child who gets a round right at once skips ahead
     (collect.js): three rounds at a time among the first fifteen, two
     among the next fifteen, one after that; five turns of kinds and jumps
     of three or two still come round to every kind. build: the picture, and
     plain (its outlines grey, so the colors no longer help). counts: how many
     of each group a comparison shows. */
  const g = (n, shape, more = {}) => ({ n, shape, ...more });
  const RAW = [
    // 1-15
    ['train', [g(3, 'circle')]],
    ['count', [g(4, 'triangle')]],
    ['catch', [g(3, 'star')]],
    ['build', { picture: 'tree' }],
    ['compare', { more: true, groups: [{ shape: 'circle' }, { shape: 'square' }], counts: [5, 3] }],
    ['train', [g(4, 'square', { color: 'red' })]],
    ['count', [g(5, 'star', { color: 'yellow' })]],
    ['catch', [g(4, 'heart', { color: 'red' })]],
    ['build', { picture: 'house' }],
    ['compare', { more: false, groups: [{ shape: 'star' }, { shape: 'crescent' }], counts: [4, 6] }],
    ['train', [g(3, 'triangle', { size: 'large' })]],
    ['count', [g(6, 'circle', { size: 'small' })]],
    ['catch', [g(5, 'shape', { color: 'blue' })]],
    ['build', { picture: 'car' }],
    ['compare', { more: true, groups: [{ color: 'red' }, { color: 'blue' }], counts: [6, 4] }],
    // 16-30
    ['train', [g(2, 'circle', { color: 'red' }), g(1, 'square', { color: 'blue' })]],
    ['count', [g(5, 'heart', { size: 'large' })]],
    ['catch', [g(4, 'star', { size: 'small' })]],
    ['build', { picture: 'icecream' }],
    ['compare', { more: true, groups: [{ size: 'large' }, { size: 'small' }], counts: [7, 5] }],
    ['train', [g(3, 'circle', { size: 'large', color: 'red' })]], // the father's example
    ['count', [g(7, 'square', { color: 'blue' })]],
    ['catch', [g(5, 'crescent', { color: 'yellow' })]],
    ['build', { picture: 'boat' }],
    ['compare', { more: false, groups: [{ shape: 'triangle' }, { shape: 'square' }], counts: [5, 7] }],
    ['train', [g(3, 'star', { size: 'small' }), g(2, 'heart', { size: 'large' })]],
    ['count', [g(6, 'star', { size: 'large', color: 'yellow' })]],
    ['catch', [g(6, 'shape', { size: 'small', color: 'red' })]],
    ['build', { picture: 'rocket' }],
    ['compare', { more: false, groups: [{ color: 'green' }, { color: 'yellow' }], counts: [5, 7] }],
    // 31-50
    ['train', [g(6, 'rectangle', { color: 'orange' })]],
    ['count', [g(8, 'triangle', { color: 'blue' })]],
    ['catch', [g(5, 'circle', { size: 'large', color: 'green' })]],
    ['build', { picture: 'lantern' }],
    ['compare', { more: true, groups: [{ shape: 'heart' }, { shape: 'crescent' }], counts: [6, 5] }],
    ['train', [g(4, 'square', { color: 'red' }), g(3, 'triangle', { color: 'green' })]],
    ['count', [g(7, 'heart', { size: 'small', color: 'purple' })]],
    ['catch', [g(6, 'star', { size: 'large', color: 'purple' })]],
    ['build', { picture: 'masjid' }],
    ['compare', { more: false, groups: [{ size: 'large' }, { size: 'small' }], counts: [6, 7] }],
    ['train', [g(2, 'circle', { size: 'large', color: 'blue' }), g(1, 'triangle', { size: 'small', color: 'red' })]],
    ['count', [g(9, 'rectangle', { color: 'orange' })]],
    ['catch', [g(7, 'heart', { color: 'red' })]],
    ['build', { picture: 'car', plain: true }],
    ['compare', { more: true, groups: [{ shape: 'triangle' }, { shape: 'rectangle' }], counts: [7, 6] }],
    ['train', [g(1, 'circle', { color: 'red' }), g(2, 'square', { color: 'blue' }), g(3, 'star', { color: 'yellow' })]],
    ['count', [g(8, 'circle', { size: 'small', color: 'red' })]],
    ['catch', [g(8, 'shape', { size: 'large' })]],
    ['build', { picture: 'masjid', plain: true }],
    ['compare', { more: true, groups: [{ color: 'red' }, { color: 'purple' }], counts: [7, 6] }],
  ];

  const rounds = RAW.map(([kind, data], index) => {
    const round = kind === 'compare' || kind === 'build' ? { kind, ...data } : { kind, parts: data };
    round.index = index;
    round.tier = index < 15 ? 0 : index < 30 ? 1 : 2;
    round.clip = clip(round);
    round.text = say(round, false);
    round.masri = say(round, true);
    return round;
  });

  return { SHAPES, COLORS, SIZES, PICTURES, rounds, say, title: 'اِجْمَعْ وَعُدَّ' };
})();
