"""Writes public/typing/stats.json and public/typing/words.json, the letter
statistics and the practice words of the typing game.

    python tools/make-typing-data.py            writes the two files
    python tools/make-typing-data.py --report   also prints the tables
    python tools/make-typing-data.py --candidates N
                                                prints the first N words before
                                                the blocklist, for a parent or
                                                Claude to read through

Nothing here is typed by hand or taken from memory: every number is counted
from a source, and every word, bare or voweled, is copied from one.

Sources kept in docs/sources/typing (each may be redistributed):
- arwiki-2022-08-29-top100k.txt: the first 100,000 lines of the Arabic
  Wikipedia word-frequency list in IlyaSemenov/wikipedia-word-frequency
  (results/arwiki-2022-08-29.txt, MIT license). The whole list has 789,639
  lines; the first 100,000 hold 95% of its words, and the letter shares
  differ from the whole list's by at most 0.22 of a percentage point.
- ar_50k.txt: the 50,000 commonest words of Arabic film and television
  subtitles (OpenSubtitles 2018), from hermitdave/FrequencyWords
  (content/2018/ar/ar_50k.txt; the content is CC BY-SA 4.0).
- quran-simple-clean.txt and quran-simple.txt: the Quran in simple spelling,
  without and with marks, from tanzil.net (Tanzil Project, CC BY 3.0, verbatim
  copies only, with their notice). Used for counting only, for comparison;
  no word of them goes into the game.
- blocked-words.txt: the words kept out of the practice list, written for
  this site. The parents may add and remove lines.
- words-sources.txt: where each file came from, when, and its license.

Sources too large to keep, downloaded once into docs/sources/typing/cache
(which git ignores):
- ara_news_2020_100K.tar.gz: 100,000 sentences from Arabic news sites of 2020,
  Leipzig Corpora Collection (downloads.wortschatz-leipzig.de, CC BY 4.0).
  The one source here that is running text, so the one that gives the pairs
  across a space. It is read inside the archive; nothing is unpacked.
- tashkeela-fadel-train.txt: 50,000 lines of fully voweled Arabic, the
  training part of the Tashkeela benchmark of Fadel and others
  (AliOsm/arabic-text-diacritization, dataset/train.txt, MIT license), which
  is a cleaned extract of Zerrouki's Tashkeela corpus (GPL version 2): almost
  all of it classical books that are printed fully voweled, a small part
  modern text. It gives the shares of the marks and the voweled practice
  words.

How the practice words are chosen is written above pick_words(), and how a
voweled form is trusted above voweled_ok(). Standard library only.
"""
import collections
import io
import json
import math
import os
import re
import sys
import tarfile
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCES = os.path.join(HERE, '..', 'docs', 'sources', 'typing')
CACHE = os.path.join(SOURCES, 'cache')
TARGET = os.path.join(HERE, '..', 'public', 'typing')
RETRIEVED = '2026-11-23'

WIKI = 'arwiki-2022-08-29-top100k.txt'
WIKI_URL = 'https://raw.githubusercontent.com/IlyaSemenov/wikipedia-word-frequency/master/results/arwiki-2022-08-29.txt'
WIKI_LINES = 100000  # only the head of the list is read
SUBS = 'ar_50k.txt'
SUBS_URL = 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ar/ar_50k.txt'
QURAN = 'quran-simple-clean.txt'
QURAN_URL = 'https://tanzil.net/pub/download/index.php?quranType=simple-clean&outType=txt-2&agree=true'
QURAN_MARKED = 'quran-simple.txt'
QURAN_MARKED_URL = 'https://tanzil.net/pub/download/index.php?quranType=simple&outType=txt-2&agree=true'
BLOCKED = 'blocked-words.txt'
NEWS = 'ara_news_2020_100K.tar.gz'
NEWS_URL = 'https://downloads.wortschatz-leipzig.de/corpora/ara_news_2020_100K.tar.gz'
VOWELED = 'tashkeela-fadel-train.txt'
VOWELED_URL = 'https://raw.githubusercontent.com/AliOsm/arabic-text-diacritization/master/dataset/train.txt'

# The 36 characters typed as letters: U+0621 to U+063A and U+0641 to U+064A.
# Each form of alef and hamza, the taa marbuta and the alef maqsura count on
# their own, because each is its own key.
LETTERS = ''.join(chr(c) for c in list(range(0x621, 0x63B)) + list(range(0x641, 0x64B)))
LETTER_SET = set(LETTERS)


def span(first, last):
    """The characters from one code point to another. Marks and invisible
    characters are written here by number, never as themselves."""
    return ''.join(chr(c) for c in range(first, last + 1))


# The eight marks, U+064B to U+0652, in the order Unicode gives them.
FATHATAN, DAMMATAN, KASRATAN, FATHA, DAMMA, KASRA, SHADDA, SUKUN = span(0x64B, 0x652)
MARKS = collections.OrderedDict([
    ('fatha', FATHA), ('damma', DAMMA), ('kasra', KASRA), ('sukun', SUKUN), ('shadda', SHADDA),
    ('fathatan', FATHATAN), ('dammatan', DAMMATAN), ('kasratan', KASRATAN)])
MARK_SET = set(MARKS.values())
TANWIN = FATHATAN + DAMMATAN + KASRATAN
# Tatweel (U+0640); every Arabic mark (U+064B to U+065F, the dagger alef
# U+0670, the Quranic signs U+06D6 to U+06ED); the invisible direction and
# joining characters (U+200B to U+200F, U+202A to U+202E, U+FEFF).
TATWEEL = chr(0x640)
ALL_MARKS = span(0x64B, 0x65F) + chr(0x670) + span(0x6D6, 0x6ED)
UNSEEN = span(0x200B, 0x200F) + span(0x202A, 0x202E) + chr(0xFEFF)
STRIP = re.compile('[%s]' % re.escape(TATWEEL + ALL_MARKS + UNSEEN))
INVISIBLE = re.compile('[%s]' % re.escape(TATWEEL + UNSEEN))
BASMALA = 'بسم الله الرحمن الرحيم'

PAIRS_KEPT = 400
ACROSS_KEPT = 150
# Every practice word was read by a person before it went in. The reading
# stopped at this word of the candidates (about the 4,130th): nothing after it
# is taken, so a word blocked later makes the list shorter instead of letting
# in one that nobody has read. To make the list longer, read on from here
# (--candidates N lists them) and move this word forward.
READ_UNTIL = 'الأوامر'
# 495: the voweled words that were read one by one.
VOWELED_KEPT = 495
SHORTEST, LONGEST = 2, 7
UNLOCK_WINDOW = 5


def bare(token):
    """A token without tatweel or marks."""
    return STRIP.sub('', token)


def is_word(word):
    """Only the 36 letters. A lone letter is a leftover of the lists' word
    splitting, except the conjunction waw, which some writers set apart."""
    return bool(word) and all(c in LETTER_SET for c in word) and (len(word) > 1 or word == 'و')


def cached(name, url, lines=None):
    """The path of a raw source in the cache, fetched first if it is not
    there. The raw word lists and the Quran files are kept out of the
    repository: they are large, and the subtitles list holds words that do
    not belong in it. With `lines`, only the head of the file is kept."""
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        if not os.path.isdir(CACHE):
            os.makedirs(CACHE)
            with io.open(os.path.join(CACHE, '.gitignore'), 'w', encoding='utf-8', newline='\n') as out:
                out.write('*\n!.gitignore\n')
        sys.stderr.write('downloading %s\n' % url)
        request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        data = urllib.request.urlopen(request, timeout=600).read()
        if lines:
            data = b''.join(data.splitlines(True)[:lines])
        with open(path, 'wb') as out:
            out.write(data)
    return path


class Tally(object):
    """Counts of letters, of pairs inside words, of first and last letters and
    of pairs across a space, each word weighted by how often it occurs."""

    def __init__(self):
        self.words = collections.Counter()
        self.letters = collections.Counter()
        self.pairs = collections.Counter()
        self.first = collections.Counter()
        self.last = collections.Counter()
        self.across = collections.Counter()
        self.seen = 0
        self.dropped = 0

    def add(self, word, times=1):
        self.words[word] += times

    def finish(self):
        for word, times in self.words.items():
            for c in word:
                self.letters[c] += times
            for a, b in zip(word, word[1:]):
                self.pairs[a + b] += times
            self.first[word[0]] += times
            self.last[word[-1]] += times
        self.tokens = sum(self.words.values())
        return self

    def per_million(self, word):
        return self.words.get(word, 0) * 1e6 / self.tokens


def tally_list(name):
    """A list of lines 'word count'."""
    tally = Tally()
    for line in io.open(name, encoding='utf-8'):
        parts = line.split()
        if len(parts) != 2:
            continue
        word, times = bare(parts[0]), int(parts[1])
        tally.seen += times
        if is_word(word):
            tally.add(word, times)
        else:
            tally.dropped += times
    return tally.finish()


def tally_text(lines, tally=None):
    """Running text. A pair across a space is counted only between two good
    words with nothing but the space between them."""
    tally = tally or Tally()
    for line in lines:
        before = None
        for chunk in INVISIBLE.sub('', line).split():
            start = 0
            while start < len(chunk) and chunk[start] not in LETTER_SET and chunk[start] not in MARK_SET:
                start += 1
            end = len(chunk)
            while end > start and chunk[end - 1] not in LETTER_SET and chunk[end - 1] not in MARK_SET:
                end -= 1
            if start == end:
                # Punctuation or a number standing alone.
                before = None
                continue
            word = bare(chunk[start:end])
            tally.seen += 1
            if not is_word(word):
                tally.dropped += 1
                before = None
                continue
            tally.add(word)
            if before and start == 0:
                tally.across[before[-1] + word[0]] += 1
            before = word if end == len(chunk) else None
    return tally


def news_lines():
    """The sentences of the Leipzig archive, read without unpacking it."""
    archive = tarfile.open(cached(NEWS, NEWS_URL))
    for member in archive.getmembers():
        if member.name.endswith('-sentences.txt'):
            for raw in io.TextIOWrapper(archive.extractfile(member), encoding='utf-8'):
                yield raw.split('\t', 1)[-1]


def quran_lines(name):
    """The ayat of a Tanzil file. Tanzil writes the basmala in front of the
    first ayah of each surah but the first and the ninth; it is counted once,
    where it is an ayah, and left out of the other 112."""
    for raw in io.open(name, encoding='utf-8'):
        raw = raw.strip()
        if not raw or raw.startswith('#'):
            continue
        surah, ayah, text = raw.split('|', 2)
        if ayah == '1' and surah != '1':
            words = text.split()
            if ' '.join(bare(w) for w in words[:4]) == BASMALA:
                text = ' '.join(words[4:])
        yield text


def shares(counter, keep=None):
    """Counts as fractions of their total, the largest first."""
    total = float(sum(counter.values()))
    rows = sorted(counter.items(), key=lambda row: (-row[1], row[0]))[:keep]
    return collections.OrderedDict((key, count / total) for key, count in rows)


def mean_shares(tables, keep=None):
    """The plain mean of several tables of shares: each source counts the same."""
    keys = set().union(*tables)
    mean = {key: sum(table.get(key, 0.0) for table in tables) / len(tables) for key in keys}
    rows = sorted(mean.items(), key=lambda row: (-row[1], row[0]))[:keep]
    return collections.OrderedDict(rows)


def rounded(table, digits=6):
    return collections.OrderedDict((key, round(value, digits)) for key, value in table.items())


def split_marks(form):
    """A voweled word as a list of [letter, its marks]; None when something
    else is in it or it starts with a mark."""
    cells = []
    for c in form:
        if c in LETTER_SET:
            cells.append([c, ''])
        elif c in MARK_SET and cells:
            cells[-1][1] += c
        else:
            return None
    return cells


def voweled_ok(cells):
    """Is every letter that should carry a mark carrying one, and only one?

    A letter may stand bare only where full voweling leaves it bare: an alef,
    an alef maqsura, a waw after a damma or a yaa after a kasra (the long
    vowels), and the lam of the article before a doubled sun letter. A shadda
    comes with its vowel, a tanween only at the end of the word (or before a
    final alef or alef maqsura), and no word begins with a sukun or a shadda.
    """
    last = len(cells) - 1
    for i, (letter, marks) in enumerate(cells):
        vowels = [m for m in marks if m != SHADDA]
        if len(vowels) > 1 or marks.count(SHADDA) > 1:
            return False
        if SHADDA in marks and (not vowels or vowels[0] == SUKUN or i == 0):
            return False
        if i == 0 and SUKUN in marks:
            return False
        if vowels and vowels[0] in TANWIN and i != last:
            if not (i == last - 1 and cells[last][0] in 'اى' and not cells[last][1]):
                return False
        if marks:
            # An alef carries a short vowel only when it opens the word.
            if letter == 'ا' and i and vowels[0] not in TANWIN:
                return False
            continue
        if letter in 'اىآ':
            continue
        if i and letter == 'و' and DAMMA in cells[i - 1][1]:
            continue
        if i and letter == 'ي' and KASRA in cells[i - 1][1]:
            continue
        if i and i < last and letter == 'ل' and cells[i - 1][0] in 'ال' and SHADDA in cells[i + 1][1]:
            continue
        return False
    return True


def tally_marks(lines):
    """From voweled text: how often each mark occurs, which letters carry it,
    and the voweled forms seen of each bare word."""
    marks = collections.Counter()
    carriers = {mark: collections.Counter() for mark in MARK_SET}
    forms = collections.defaultdict(collections.Counter)
    letters = 0
    for line in lines:
        for chunk in INVISIBLE.sub('', line).split():
            chunk = chunk.strip('.,:;!?()[]{}«»"\'،؛؟-–—…/\\*')
            cells = split_marks(chunk)
            if not cells or not is_word(''.join(c[0] for c in cells)):
                continue
            letters += len(cells)
            for letter, on in cells:
                for mark in on:
                    marks[mark] += 1
                    carriers[mark][letter] += 1
            forms[''.join(c[0] for c in cells)][chunk] += 1
    return marks, carriers, forms, letters


def mark_tables(marks, carriers, letters):
    total = float(sum(marks.values()))
    share = collections.OrderedDict((name, marks[mark] / total) for name, mark in MARKS.items())
    on = collections.OrderedDict(
        (name, rounded(shares(carriers[mark], 10), 4)) for name, mark in MARKS.items())
    return rounded(share), on, round(total / letters, 4)


def blocked_words():
    """The blocklist: whole words; stems (the lines that start with *), which
    block every word that contains them; and words that stay in the list but
    are not shown voweled (the lines that start with ~). A line starting with
    # is a note."""
    words, stems, plain = set(), [], set()
    path = os.path.join(SOURCES, BLOCKED)
    if os.path.exists(path):
        for line in io.open(path, encoding='utf-8'):
            line = line.split('#')[0].strip()
            if line.startswith('*'):
                stems.append(bare(line[1:]))
            elif line.startswith('~'):
                plain.add(bare(line[1:]))
            elif line:
                words.add(bare(line))
    return words, stems, plain


def misspelled(word, score):
    """Common misspellings are as frequent as real words, so the lists are full
    of them: an alef without its hamza (ان for أن, الامر for الأمر), a final
    yaa for an alef maqsura or the other way (الي, فى), a final haa for a taa
    marbuta (مدرسه). A word is dropped when the same word with the other
    letter is at least three times as common. This also drops a few real
    words that look like a commoner one (سال beside سأل), which costs nothing."""
    others = set()
    ends = [word]
    if word[-1] == 'ي':
        ends.append(word[:-1] + 'ى')
    if word[-1] == 'ى':
        ends.append(word[:-1] + 'ي')
    if word[-1] == 'ه':
        ends.append(word[:-1] + 'ة')
    for form in ends:
        others.add(form)
        for i, c in enumerate(form):
            if c == 'ا':
                others.update(form[:i] + h + form[i + 1:] for h in 'أإآ')
    others.discard(word)
    return any(score.get(other, 0) >= 3 * score[word] for other in others)


def pick_words(wiki, subs, news):
    """The practice words, the commonest first, before the blocklist.

    A word is taken when it has 2 to 7 letters and stands in all three modern
    sources: among Wikipedia's first 100,000 lines, among the subtitles' 50,000
    words, and at least three times in the news sentences. Three independent
    sources agreeing is the check that it is a real, current word and not one
    list's noise. Words are ordered by the geometric mean of their three
    frequencies per million, so a word must be common everywhere to rank high.
    Misspellings (see misspelled()) and letters repeated three times running
    are dropped.
    """
    score = {}
    for word in wiki.words:
        if word in subs.words and news.words.get(word, 0) >= 3:
            score[word] = (wiki.per_million(word) * subs.per_million(word) * news.per_million(word)) ** (1 / 3.0)
    picked = []
    for word in sorted(score, key=lambda w: (-score[w], w)):
        if not SHORTEST <= len(word) <= LONGEST:
            continue
        if re.search(r'(.)\1\1', word) or misspelled(word, score):
            continue
        picked.append(word)
    return picked


def pick_voweled(words, forms, plain):
    """For each practice word, its commonest voweled form in the voweled text,
    when that form is fully voweled (voweled_ok) and was printed at least ten
    times: a slip of one editor does not repeat ten times. Case endings are as
    the text had them, so the list has words in every case."""
    picked = []
    for word in words:
        seen = forms.get(word)
        if not seen or word in plain:
            continue
        form, times = sorted(seen.items(), key=lambda row: (-row[1], row[0]))[0]
        if times >= 10 and voweled_ok(split_marks(form)):
            picked.append(form)
        if len(picked) == VOWELED_KEPT:
            break
    return picked


def unlock_order(words, letters):
    """An order of introducing letters that stays near the order of their
    shares and has words to type as early as it can: after the two commonest
    letters, each new letter is the one, of the five commonest not yet in,
    that makes the most new practice words typable (ties: the commoner).
    Returns the letters and, for each count of letters, the typable words."""
    order = list(letters)[:2]
    rest = list(letters)[2:]
    sets = [set(w) for w in words]
    typable = lambda have: sum(1 for s in sets if s <= have)
    counts = [typable(set(order[:1])), typable(set(order))]
    while rest:
        have = set(order)
        best = max(rest[:UNLOCK_WINDOW], key=lambda c: (typable(have | {c}), -rest.index(c)))
        order.append(best)
        rest.remove(best)
        counts.append(typable(set(order)))
    return order, counts


def table(rows, per_line=6):
    lines = []
    for i in range(0, len(rows), per_line):
        lines.append('   '.join(rows[i:i + per_line]))
    return '\n'.join(lines)


def main():
    wiki = tally_list(cached(WIKI, WIKI_URL, WIKI_LINES))
    subs = tally_list(cached(SUBS, SUBS_URL))
    news = tally_text(news_lines()).finish()
    quran = tally_text(quran_lines(cached(QURAN, QURAN_URL))).finish()
    modern = [('wikipedia', wiki), ('subtitles', subs), ('news', news)]

    letters = mean_shares([shares(t.letters) for _, t in modern])
    pairs_all = mean_shares([shares(t.pairs) for _, t in modern])
    pairs = collections.OrderedDict(list(pairs_all.items())[:PAIRS_KEPT])
    first = mean_shares([shares(t.first) for _, t in modern])
    last = mean_shares([shares(t.last) for _, t in modern])
    across_all = shares(news.across)
    across = collections.OrderedDict(list(across_all.items())[:ACROSS_KEPT])

    marks, carriers, forms, marked_letters = tally_marks(io.open(cached(VOWELED, VOWELED_URL), encoding='utf-8'))
    mark_share, mark_letters, marks_per_letter = mark_tables(marks, carriers, marked_letters)
    q_marks, q_carriers, _, q_letters = tally_marks(quran_lines(cached(QURAN_MARKED, QURAN_MARKED_URL)))
    q_mark_share, q_mark_letters, q_marks_per_letter = mark_tables(q_marks, q_carriers, q_letters)

    candidates = pick_words(wiki, subs, news)
    if '--candidates' in sys.argv:
        count = int(sys.argv[sys.argv.index('--candidates') + 1])
        sys.stdout.write(table(candidates[:count], 12) + '\n')
        return
    blocked, stems, plain = blocked_words()
    read = candidates[:candidates.index(READ_UNTIL) + 1]
    words = [w for w in read if w not in blocked and not any(stem in w for stem in stems)]
    voweled = pick_voweled(words, forms, plain)
    order, counts = unlock_order(words, list(letters))

    def source(name, url, license, what, tally=None):
        row = collections.OrderedDict([('name', name), ('url', url), ('license', license),
                                       ('retrieved', RETRIEVED), ('use', what)])
        if tally:
            row['words'] = tally.tokens
        return row

    stats = collections.OrderedDict([
        ('note', 'Written by tools/make-typing-data.py. Shares are fractions of all letters, of all pairs '
                 'inside words, of all words (first, last) and of all marks. letters, pairs, first and last '
                 'are the mean of three modern sources (Wikipedia, subtitles, news); across is from the news '
                 'text alone. pairs holds the %d commonest pairs, which sum to pairsShare; across the %d '
                 'commonest, which sum to acrossShare.' % (PAIRS_KEPT, ACROSS_KEPT)),
        ('letters', rounded(letters)),
        ('pairs', rounded(pairs)),
        ('pairsShare', round(sum(pairs.values()), 4)),
        ('first', rounded(first)),
        ('last', rounded(last)),
        ('across', rounded(across)),
        ('acrossShare', round(sum(across.values()), 4)),
        ('wordLength', round(sum(sum(t.letters.values()) / float(t.tokens) for _, t in modern) / 3, 3)),
        ('marks', mark_share),
        ('markLetters', mark_letters),
        ('marksPerLetter', marks_per_letter),
        ('markChars', MARKS),
        ('bySource', collections.OrderedDict((name, collections.OrderedDict([
            ('letters', rounded(shares(t.letters))),
            ('wordLength', round(sum(t.letters.values()) / float(t.tokens), 3))])) for name, t in modern)),
        ('quran', collections.OrderedDict([
            ('letters', rounded(shares(quran.letters))),
            ('pairs', rounded(shares(quran.pairs, 100))),
            ('first', rounded(shares(quran.first))),
            ('last', rounded(shares(quran.last))),
            ('wordLength', round(sum(quran.letters.values()) / float(quran.tokens), 3)),
            ('marks', q_mark_share),
            ('marksPerLetter', q_marks_per_letter)])),
        ('unlockOrder', ''.join(order)),
        ('unlockWords', counts),
        ('sources', [
            source('Arabic Wikipedia word frequencies, 2022-08-29, first 100,000 lines',
                   'https://github.com/IlyaSemenov/wikipedia-word-frequency/blob/master/results/arwiki-2022-08-29.txt',
                   'MIT', 'letters, pairs, first, last, words', wiki),
            source('OpenSubtitles 2018 Arabic, 50,000 commonest words (hermitdave/FrequencyWords)',
                   'https://github.com/hermitdave/FrequencyWords/blob/master/content/2018/ar/ar_50k.txt',
                   'CC BY-SA 4.0', 'letters, pairs, first, last, words', subs),
            source('Leipzig Corpora Collection, ara_news_2020_100K', NEWS_URL,
                   'CC BY 4.0', 'letters, pairs, first, last, across, words', news),
            source('Tashkeela benchmark of Fadel et al., dataset/train.txt (from Zerrouki\'s Tashkeela, GPL-2.0)',
                   VOWELED_URL, 'MIT', 'marks, markLetters, voweled words'),
            source('Tanzil Quran text, simple-clean and simple, version 1.1', 'https://tanzil.net/download/',
                   'CC BY 3.0, verbatim copies only', 'quran (counting only)', quran),
        ]),
    ])
    if not os.path.isdir(TARGET):
        os.makedirs(TARGET)
    for name, data in (('stats.json', stats),
                       ('words.json', collections.OrderedDict([('words', words), ('voweled', voweled)]))):
        with io.open(os.path.join(TARGET, name), 'w', encoding='utf-8', newline='\n') as out:
            out.write(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
        sys.stderr.write('%s: %d bytes\n' % (name, os.path.getsize(os.path.join(TARGET, name))))
    sys.stderr.write('%d words (%d candidates, %d blocked lines), %d voweled\n'
                     % (len(words), len(candidates), len(blocked) + len(stems) + len(plain), len(voweled)))

    if '--report' in sys.argv:
        report(modern, quran, letters, pairs_all, first, last, across_all, mark_share, mark_letters,
               marks_per_letter, q_mark_share, q_marks_per_letter, words, voweled, order, counts)


def report(modern, quran, letters, pairs, first, last, across, mark_share, mark_letters,
           marks_per_letter, q_mark_share, q_marks_per_letter, words, voweled, order, counts):
    out = sys.stdout.write
    pct = lambda x: '%.2f' % (100 * x)
    per = [shares(t.letters) for _, t in modern]
    q = shares(quran.letters)
    for name, t in modern + [('quran', quran)]:
        out('%s: %d words counted, %d dropped of %d, mean length %.2f\n'
            % (name, t.tokens, t.dropped, t.seen, sum(t.letters.values()) / float(t.tokens)))
    out('\nLETTERS  rank letter mean | wikipedia subtitles news | quran (quran rank)\n')
    q_rank = {c: i + 1 for i, c in enumerate(q)}
    for i, c in enumerate(letters):
        out('%2d %s %s | %s %s %s | %s (%d)\n' % (i + 1, c, pct(letters[c]), pct(per[0].get(c, 0)),
            pct(per[1].get(c, 0)), pct(per[2].get(c, 0)), pct(q.get(c, 0)), q_rank.get(c, 0)))
    for name, t in modern:
        out('order %s: %s\n' % (name, ' '.join(shares(t.letters))))
    out('order quran: %s\n' % ' '.join(q))
    out('\nPAIRS, the 60 commonest (first letter typed first), mean of three sources, percent\n')
    out(table(['%s+%s %s' % (p[0], p[1], pct(v)) for p, v in list(pairs.items())[:60]]) + '\n')
    out('the 400 commonest pairs cover %s%%, of %d pairs seen\n' % (pct(sum(list(pairs.values())[:400])), len(pairs)))
    for name, t in modern + [('quran', quran)]:
        out('pairs %s: %s\n' % (name, ' '.join('%s+%s' % (p[0], p[1]) for p in list(shares(t.pairs, 30)))))
    out('\nNEIGHBORS  letter (starts a word, ends a word, percent of its own count): '
        'before it | after it (percent of its pairs)\n')
    starts = mean_shares([{c: t.first[c] / float(t.letters[c]) for c in t.letters} for _, t in modern])
    ends = mean_shares([{c: t.last[c] / float(t.letters[c]) for c in t.letters} for _, t in modern])
    for c in letters:
        before = collections.Counter({p[0]: v for p, v in pairs.items() if p[1] == c})
        after = collections.Counter({p[1]: v for p, v in pairs.items() if p[0] == c})
        tb, ta = sum(before.values()) or 1, sum(after.values()) or 1
        out('%s (%d, %d): %s | %s\n' % (
            c, round(100 * starts[c]), round(100 * ends[c]),
            ' '.join('%s %d' % (k, round(100 * v / tb)) for k, v in before.most_common(3)),
            ' '.join('%s %d' % (k, round(100 * v / ta)) for k, v in after.most_common(3))))
    top = lambda t, n: '  '.join('%s %s' % (c, pct(v)) for c, v in list(t.items())[:n])
    out('\nFIRST letters, percent: %s\n' % top(first, 20))
    out('LAST letters, percent: %s\n' % top(last, 20))
    out('QURAN first, percent: %s\n' % top(shares(quran.first), 12))
    out('QURAN last, percent: %s\n' % top(shares(quran.last), 12))
    out('ACROSS a space (news), last+first, percent: %s\n'
        % '  '.join('%s+%s %s' % (p[0], p[1], pct(v)) for p, v in list(across.items())[:30]))
    out('\nMARKS, percent (Tashkeela benchmark), %.3f marks a letter: %s\n' % (marks_per_letter, top(mark_share, 8)))
    out('MARKS, percent (Quran, simple), %.3f marks a letter: %s\n' % (q_marks_per_letter, top(q_mark_share, 8)))
    for name, on in mark_letters.items():
        out('%s on: %s\n' % (name, '  '.join('%s %s' % (c, pct(v)) for c, v in list(on.items())[:8])))
    out('\nWORDS typable with the commonest k letters (by share)\n')
    by_share = list(letters)
    for k in (4, 5, 6, 8, 10, 12, 16, 20, 24, 28, 36):
        have = set(by_share[:k])
        fit = [w for w in words if set(w) <= have]
        out('%2d %s: %d words; %s\n' % (k, ''.join(by_share[:k]), len(fit), ' '.join(fit[:25])))
    out('\nUNLOCK order (each new letter is the one of the five commonest left that makes the most words typable)\n')
    for k in (2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20):
        have = set(order[:k])
        fit = [w for w in words if set(w) <= have]
        out('%2d %s: %d words; %s\n' % (k, ' '.join(order[:k]), counts[k - 1], ' '.join(fit[:30])))
    out('full unlock order: %s\n' % ' '.join(order))
    out('typable words after each letter: %s\n' % counts)
    out('\nword lengths: %s\n' % dict(sorted(collections.Counter(len(w) for w in words).items())))
    out('voweled (%d): %s\n' % (len(voweled), ' '.join(voweled)))


if __name__ == '__main__':
    main()
