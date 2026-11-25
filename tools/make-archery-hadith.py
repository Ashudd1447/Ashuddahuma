"""Writes public/dua/archery.json, the hadith that opens the archery game.

    python tools/make-archery-hadith.py            from the copy kept in docs/sources
    python tools/make-archery-hadith.py --fetch    copies the hadith from sunnah.com again first

Nothing in the hadith is typed by hand:
- docs/sources/bukhari-2899.json is a copy of the Arabic text of Sahih
  al-Bukhari 2899 as printed at sunnah.com, with its address and the day it
  was copied (--fetch writes it);
- the words of the Prophet, peace and blessings be upon him, that the game
  shows are cut out of that text: the script finds where they begin and end by
  their letters alone (START and END below, without any vowel mark) and stops
  if they are not there.

Two kinds of change are made to the copied words, to follow the site's
spelling, and each one is listed in the file it writes, for the parents to
check:
- sunnah.com stores the marks of lam-alif after the alif (the old typesetting
  habit); they are moved onto the lam, as tools/make-riding-dua.py does;
- the site vowels every letter the child reads, and writes the vowel of an
  opening hamzat al-wasl (as in its own buttons); sunnah.com prints that alif
  bare, so the marks in ADDED are put in.
After that every letter left without a mark must be a long vowel or a silent
alif, or the script stops. Standard library only.
"""
import datetime
import io
import json
import os
import re
import sys
import time
import urllib.request
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, '..', 'docs', 'sources', 'bukhari-2899.json')
TARGET = os.path.join(HERE, '..', 'public', 'dua', 'archery.json')
URL = 'https://sunnah.com/bukhari:2899'
REFERENCE = 'Sahih al-Bukhari 2899'

# Where the words shown begin and end, by their letters alone.
START = 'ارموا بني إسماعيل'
END = 'راميا'

LAM, ALIF, WAW, YA, ALIF_MAQSURA = 'ل', 'ا', 'و', 'ي', 'ى'
FATHATAN, FATHA, DAMMA, KASRA, SHADDA, SUKUN = 'ً', 'َ', 'ُ', 'ِ', 'ّ', 'ْ'
MARKS = set('ًٌٍَُِّْٰ')
UNSEEN = set('ـ‎‏‪‫‬‭‮')  # the tatweel and the marks that only set the direction of the line
PUNCTUATION = set('،؛.:!؟')

# The marks the site's full voweling needs and sunnah.com's print lacks: the
# word (counted from 1 in the words shown), its letters, the letter (from 1)
# the mark goes on, the mark, and why.
ADDED = [
    {
        'word': 1,
        'letters': 'ارموا',
        'letter': 1,
        'mark': KASRA,
        'name': 'kasra (U+0650)',
        'why': 'The opening alif is a hamzat al-wasl, printed bare at sunnah.com; the site writes its vowel when it opens what is said. '
               'It is a kasra here: the verb is of the pattern yaf`ilu (yarmi), and the damma on the mim is only for the waw of the plural.',
    },
]


def letters(text):
    """The text without vowel marks and unseen characters, and where each character left came from."""
    kept = []
    places = []
    for i, c in enumerate(text):
        if c in MARKS or c in UNSEEN:
            continue
        kept.append(c)
        places.append(i)
    return ''.join(kept), places


def cut(text):
    """The words from START to END, exactly as the text has them."""
    bare, places = letters(text)
    assert bare.count(START) == 1, 'the opening words must be in the hadith once, found %d times' % bare.count(START)
    first = bare.index(START)
    last = bare.find(END, first + len(START))
    assert last > 0, 'the closing word is not in the hadith after the opening words'
    stop = places[last + len(END) - 1] + 1
    while stop < len(text) and text[stop] in MARKS:  # the marks of the last letter
        stop += 1
    said = text[places[first]:stop]
    assert not (set(said) & UNSEEN), 'an unseen character inside the words shown'
    return said


def modern(word):
    """Lam-alif with its marks after the alif: put them on the lam."""
    return word.replace(LAM + ALIF + SHADDA + FATHA, LAM + SHADDA + FATHA + ALIF).replace(LAM + ALIF + FATHA, LAM + FATHA + ALIF)


def add(word, entry):
    """The word with the mark of one ADDED entry put after its letter."""
    assert letters(word.strip(''.join(PUNCTUATION)))[0] == entry['letters'], 'the word to mark is not the one expected: %r' % word
    seen = 0
    for i, c in enumerate(word):
        if c in MARKS:
            continue
        seen += 1
        if seen == entry['letter']:
            assert i + 1 >= len(word) or word[i + 1] not in MARKS, 'the letter already has a mark: %r' % word
            return word[:i + 1] + entry['mark'] + word[i + 1:]
    raise AssertionError('no such letter in %r' % word)


def bare_letters(word):
    """The letters of a word that carry no mark, each with the letter and the marks before it."""
    out = []
    before, before_marks = '', ''
    i = 0
    while i < len(word):
        c = word[i]
        j = i + 1
        while j < len(word) and word[j] in MARKS:
            j += 1
        if c not in PUNCTUATION:
            if j == i + 1:
                out.append((c, before, before_marks))
            before, before_marks = c, word[i + 1:j]
        i = j
    return out


def fully_voweled(word):
    """Every letter left bare is a long vowel after its own short vowel, or a silent alif."""
    for c, before, marks in bare_letters(word):
        long_vowel = (c == ALIF and FATHA in marks) or (c == WAW and DAMMA in marks) or (c in (YA, ALIF_MAQSURA) and KASRA in marks)
        silent_alif = c == ALIF and ((before == WAW and marks == '') or FATHATAN in marks)
        if not (long_vowel or silent_alif):
            return False
    return True


class Page(HTMLParser):
    """Picks the Arabic text of the hadith out of sunnah.com's page."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.found = []
        self.now = None

    def handle_starttag(self, tag, attrs):
        if tag != 'div':
            return
        if self.now is not None:
            self.depth += 1
        elif 'arabic_hadith_full' in (dict(attrs).get('class') or '').split():
            self.now = []
            self.depth = 1

    def handle_endtag(self, tag):
        if tag != 'div' or self.now is None:
            return
        self.depth -= 1
        if self.depth == 0:
            self.found.append(''.join(self.now))
            self.now = None

    def handle_data(self, data):
        if self.now is not None:
            self.now.append(data)


def fetch():
    """The page, asked for as a browser would; if it is refused, once more after a pause, then no more."""
    request = urllib.request.Request(URL, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.8,ar;q=0.6',
    })
    for attempt in (1, 2):
        try:
            with urllib.request.urlopen(request, timeout=30) as reply:
                return reply.read().decode('utf-8')
        except Exception as error:  # refused, or no network
            if attempt == 2:
                raise SystemExit('sunnah.com did not give the page (%s). Nothing was written.' % error)
            time.sleep(5)


def copy_source():
    page = Page()
    page.feed(fetch())
    assert len(page.found) == 1, 'expected one hadith on the page, found %d' % len(page.found)
    text = re.sub(r'\s+', ' ', page.found[0]).strip()
    cut(text)  # stops here if the words are not in what was copied
    source = {'source_url': URL, 'reference': REFERENCE, 'copied': datetime.date.today().isoformat(), 'hadith': text}
    io.open(SOURCE, 'w', encoding='utf-8', newline='\n').write(json.dumps(source, ensure_ascii=False, indent=2) + '\n')
    print('wrote', os.path.normpath(SOURCE))


def main():
    if '--fetch' in sys.argv[1:] or not os.path.exists(SOURCE):
        copy_source()
    source = json.load(io.open(SOURCE, encoding='utf-8'))
    printed = cut(source['hadith'])
    words = printed.split()
    respelled = []
    for i, word in enumerate(words):
        fixed = modern(word)
        if fixed != word:
            respelled.append({'word': i + 1, 'printed': word, 'shown': fixed})
            words[i] = fixed
    added = []
    for entry in ADDED:
        i = entry['word'] - 1
        marked = add(words[i], entry)
        added.append({'word': entry['word'], 'printed': words[i], 'shown': marked, 'mark': '%s on letter %d' % (entry['name'], entry['letter']), 'why': entry['why']})
        words[i] = marked
    unvoweled = [word for word in words if not fully_voweled(word)]
    assert not unvoweled, 'not fully voweled: %s' % ' '.join(unvoweled)
    assert letters(' '.join(words))[0] == letters(printed)[0], 'a letter changed'
    out = {
        'source': 'Written by tools/make-archery-hadith.py. Never edit by hand.',
        'hadith': '%s (%s), copied %s; the words of the Prophet, peace and blessings be upon him, from their first word to "%s"; words respelled: %d; vowel marks added: %d.'
                  % (source['source_url'], source['reference'], source['copied'], END, len(respelled), len(added)),
        'printed': printed,
        'respelled': respelled,
        'added': added,
        'parts': [{'id': 'said', 'words': words}],
    }
    os.makedirs(os.path.dirname(TARGET), exist_ok=True)
    io.open(TARGET, 'w', encoding='utf-8', newline='\n').write(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
    print('wrote', os.path.normpath(TARGET), 'with', len(words), 'words;', len(respelled), 'respelled;', len(added), 'marks added')


if __name__ == '__main__':
    main()
