/* أَيْنَ؟, the words of where a thing is: everything the game says and shows,
   in one place, read by the game (where.js) and by the recording page
   (record.js), which makes a card for every clip from it. Fusha is what the
   child reads; the Egyptian is spoken only, when the dialect switch says so.
   All of it is Claude's draft until the parents approve it, the Egyptian
   above all.

   A sentence is a thing (nominative), a word of place, and a landmark
   (genitive, after the word): الْكُرَةُ فِي الصُّنْدُوقِ. Strictly only فِي and
   عَلَى are prepositions (حُرُوفُ الْجَرِّ); the others are adverbs of place
   (ظُرُوفُ الْمَكَانِ), which take the genitive after them the same way. */
window.WHERE_WORDS = {
  /* The words of place, in the order they are taught, each with its color
     (the same everywhere in the game) and how Egyptian says it. */
  words: {
    in: { text: 'فِي', masri: 'جوّه', color: '#7A4FB3' },
    on: { text: 'عَلَى', masri: 'على', color: '#13867A' },
    under: { text: 'تَحْتَ', masri: 'تحت', color: '#D46A14' },
    above: { text: 'فَوْقَ', masri: 'فوق', color: '#2B78C2' },
    front: { text: 'أَمَامَ', masri: 'قدّام', color: '#C23F78' },
    behind: { text: 'خَلْفَ', masri: 'ورا', color: '#8A5A2B' },
    beside: { text: 'بِجَانِبِ', masri: 'جنب', color: '#4F8A16' },
    between: { text: 'بَيْنَ', masri: 'بين', color: '#B07D06' },
  },
  /* The things that move. */
  things: {
    ball: { text: 'الْكُرَةُ', masri: 'الكورة' },
    apple: { text: 'التُّفَّاحَةُ', masri: 'التفاحة' },
    car: { text: 'السَّيَّارَةُ', masri: 'العربية' },
    gift: { text: 'الْهَدِيَّةُ', masri: 'الهدية' },
    cat: { text: 'الْقِطَّةُ', masri: 'القطة' },
    bird: { text: 'الْعُصْفُورُ', masri: 'العصفورة' },
    balloon: { text: 'الْبَالُونُ', masri: 'البلونة' },
    plane: { text: 'الطَّائِرَةُ', masri: 'الطيارة' },
  },
  /* The landmarks, after the word (genitive), one and two of them. */
  places: {
    box: { text: 'الصُّنْدُوقِ', two: 'الصُّنْدُوقَيْنِ', masri: 'الصندوق', masriTwo: 'الصندوقين' },
    basket: { text: 'السَّلَّةِ', two: 'السَّلَّتَيْنِ', masri: 'السَّبَت', masriTwo: 'السبتين' },
    table: { text: 'الطَّاوِلَةِ', two: 'الطَّاوِلَتَيْنِ', masri: 'الترابيزة', masriTwo: 'الترابيزتين' },
    chair: { text: 'الْكُرْسِيِّ', two: 'الْكُرْسِيَّيْنِ', masri: 'الكرسي', masriTwo: 'الكرسيين' },
    tree: { text: 'الشَّجَرَةِ', two: 'الشَّجَرَتَيْنِ', masri: 'الشجرة', masriTwo: 'الشجرتين' },
    house: { text: 'الْبَيْتِ', two: 'الْبَيْتَيْنِ', masri: 'البيت', masriTwo: 'البيتين' },
  },
  /* Every sentence that is recorded: [thing, word, place]. With بَيْنَ the
     place is two of it. The first two of each word are the ones shown when
     the word is taught; the third is kept for the questions, so that the
     child meets the word in a picture he has not seen. */
  sentences: [
    ['ball', 'in', 'box'], ['apple', 'in', 'basket'], ['cat', 'in', 'box'],
    ['apple', 'on', 'table'], ['cat', 'on', 'chair'], ['bird', 'on', 'tree'],
    ['ball', 'under', 'table'], ['cat', 'under', 'chair'], ['apple', 'under', 'tree'],
    ['balloon', 'above', 'table'], ['plane', 'above', 'house'], ['bird', 'above', 'tree'],
    ['car', 'front', 'house'], ['ball', 'front', 'box'], ['cat', 'front', 'basket'],
    ['cat', 'behind', 'box'], ['car', 'behind', 'house'], ['ball', 'behind', 'basket'],
    ['ball', 'beside', 'box'], ['cat', 'beside', 'basket'], ['car', 'beside', 'house'],
    ['ball', 'between', 'box'], ['cat', 'between', 'chair'], ['car', 'between', 'tree'],
  ],
  /* What is said at the top of a question. */
  asks: {
    which: { text: 'أَيُّ صُورَةٍ؟', masri: 'أنهي صورة؟' },
    put: { text: 'اِسْمَعْ وَحَرِّكْ', masri: 'اسمع وحرّك' },
  },
  where: { text: 'أَيْنَ', masri: 'فين' },
};

/* Clip names and texts, shared by the game and the recording page. */
window.WHERE_WORDS.clip = {
  sentence: ([thing, word, place]) => `where-${thing}-${word}-${place}`,
  word: (word) => `where-word-${word}`,
  ask: (thing) => `where-q-${thing}`,
  which: 'where-which',
  put: 'where-put',
};

window.WHERE_WORDS.say = (([thing, word, place], masri) => {
  const w = window.WHERE_WORDS;
  const p = w.places[place];
  const where = word === 'between' ? (masri ? p.masriTwo : p.two) : masri ? p.masri : p.text;
  return `${masri ? w.things[thing].masri : w.things[thing].text} ${masri ? w.words[word].masri : w.words[word].text} ${where}`;
});
