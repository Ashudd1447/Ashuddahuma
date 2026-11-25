"""Writes public/salah/azkar.json, the words said in the prayer, for the door
الصَّلَاةُ (salah.js, pray.js).

    python tools/make-salah.py            reads docs/sources/salah-azkar.json, writes public/salah/azkar.json
    python tools/make-salah.py --fetch    first copies the hadiths from sunnah.com again into the source file

A hadith or a phrase taken off the lists below leaves the source file on the
next plain run, by the script and with nothing asked of the site: what the
file still holds is never fetched again without --fetch.

Nothing that is said is typed by hand:
- docs/sources/salah-azkar.json holds the Arabic text of each hadith as printed
  at sunnah.com, with its address and the day it was copied (--fetch writes it:
  one request at a time, three seconds apart, and it stops at the first page
  the site refuses);
- each phrase is cut out of that text. What is typed below is only where to
  cut: the words a phrase opens and closes with and the words it stands
  between, without their marks. The script finds them, checks that they are
  there exactly once and that the cut is whole, and takes the printed words
  with their marks as they are.

Three kinds of change are made to the printed words, to follow the site's
Modern Standard Arabic spelling, and every changed word is listed in the
output, one by one, for the parents to check:
- lam-alif: sunnah.com stores the marks of lam-alif after the alif (the old
  typesetting habit); they are moved onto the lam;
- dotless yeh: sunnah.com prints ى for a ي that carries a mark; it gets its dots;
- sukoon: the lam of the article before a hamza is printed bare (الأَعْلَى); the
  site's full voweling writes its sukoon (الْأَعْلَى).
The letters and the reading are the same. After these, every word is checked
for a letter left without a mark that the site's voweling would give one; the
script stops if it finds any. Standard library only.
"""
import datetime
import html
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, '..', 'docs', 'sources', 'salah-azkar.json')
TARGET = os.path.join(HERE, '..', 'public', 'salah', 'azkar.json')

AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
PAUSE = 3  # seconds between two requests

# The hadiths, in the order the prayer meets them: id, the reference as the
# page itself prints it, the page.
HADITHS = [
    ('muslim-772', 'Sahih Muslim 772', 'https://sunnah.com/muslim:772'),
    ('bukhari-732', 'Sahih al-Bukhari 732', 'https://sunnah.com/bukhari:732'),
    ('abudawud-874', 'Sunan Abi Dawud 874', 'https://sunnah.com/abudawud:874'),
    ('bukhari-831', 'Sahih al-Bukhari 831', 'https://sunnah.com/bukhari:831'),
    ('bukhari-3370', 'Sahih al-Bukhari 3370', 'https://sunnah.com/bukhari:3370'),
    ('abudawud-996', 'Sunan Abi Dawud 996', 'https://sunnah.com/abudawud:996'),
]

# Where to cut. Words here are without marks and only find the place: the
# words a phrase opens with, the words it closes with, the words printed just
# before it and just after it ('' after: it is the last words of the hadith),
# and how many words it must have. A phrase of several cuts is shown as
# several lines.
CUTS = [
    # The bowing and the prostration.
    ('ruku', 'muslim-772', [('سبحان ربي العظيم', 'سبحان ربي العظيم', 'فجعل يقول', 'فكان ركوعه', 3)]),
    ('sujud', 'muslim-772', [('سبحان ربي الأعلى', 'سبحان ربي الأعلى', 'سجد فقال', 'فكان سجوده', 3)]),
    # Rising from the bowing.
    ('sami', 'bukhari-732', [('سمع الله', 'لمن حمده', 'وإذا قال', 'فقولوا', 4)]),
    ('rabbana', 'bukhari-732', [('ربنا ولك', 'ولك الحمد', 'فقولوا', '', 3)]),
    # Between the two prostrations: the hadith says it twice; the parents asked for it once.
    ('julus', 'abudawud-874', [('رب اغفر لي', 'رب اغفر لي', 'وكان يقول', 'رب اغفر لي', 3)]),
    # The tashahhud. In the middle of it the hadith holds a remark of the
    # Prophet's, peace and blessings be upon him, to his companions ("when you
    # say this it reaches every righteous servant..."), which is not said in
    # the prayer: the tashahhud is the words before it and the words after it.
    ('tashahhud', 'bukhari-831', [
        ('التحيات لله', 'الله الصالحين', 'فليقل', 'فإنكم إذا', 17),
        ('أشهد أن لا إله إلا الله', 'عبده ورسوله', 'في السماء والأرض', '', 11),
    ]),
    # The prayer on the Prophet, peace and blessings be upon him, to the end of the hadith.
    ('ibrahimiyya', 'bukhari-3370', [('اللهم صل على محمد', 'إنك حميد مجيد', 'قولوا', '', 34)]),
    # The salam: the hadith gives it twice, once to each side.
    ('salam', 'abudawud-996', [('السلام عليكم', 'ورحمة الله', 'بياض خده', 'السلام عليكم', 4)]),
]

LAM, ALIF, YEH, DOTLESS = 'ل', 'ا', 'ي', 'ى'
FATHA, DAMMA, KASRA, SHADDA, SUKOON, FATHATAN = 'َ', 'ُ', 'ِ', 'ّ', 'ْ', 'ً'
MARKS = 'ًٌٍَُِّْ'
LETTER = re.compile('[ء-غف-ي]')
COMMA = '،'
HAMZA_ALIFS = 'أإآ'


def bare(text):
    """The letters alone: no marks, no punctuation."""
    return ''.join(LETTER.findall(text))


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': AGENT, 'Accept': 'text/html'})
    with urllib.request.urlopen(request, timeout=40) as response:
        return response.read().decode('utf-8')


def printed(page, reference, url):
    """The hadith's Arabic text as the page prints it, and a check that the page is the hadith asked for."""
    named = re.search(r'<b>Reference</b></td><td>&nbsp;:&nbsp;<a href="[^"]*">([^<]*)</a>', page)
    if not named or named.group(1).strip() != reference:
        sys.exit('%s does not say it is %s (it says: %s)' % (url, reference, named.group(1) if named else 'nothing'))
    blocks = re.findall(r'<div class="arabic_hadith_full arabic">(.*?)</div>', page, re.S)
    if len(blocks) != 1:
        sys.exit('%s: expected one Arabic text, found %d' % (url, len(blocks)))
    text = html.unescape(re.sub(r'<[^>]+>', '', blocks[0]))
    return re.sub(r'\s+', ' ', text).strip()


def copy_sources():
    today = datetime.date.today().isoformat()
    hadiths = []
    for n, (name, reference, url) in enumerate(HADITHS):
        if n:
            time.sleep(PAUSE)
        try:
            page = fetch(url)
        except (urllib.error.URLError, OSError) as error:
            sys.exit('sunnah.com refused %s (%s): stopped, nothing written' % (url, error))
        hadiths.append({'id': name, 'reference': reference, 'source_url': url, 'copied': today, 'hadith': printed(page, reference, url)})
        print('copied', reference)
    source = {
        'about': 'The Arabic text of each hadith as printed at sunnah.com, copied by tools/make-salah.py --fetch, '
                 'and under it the phrases the script cut from it, as printed. Never edit by hand.',
        'hadiths': hadiths,
    }
    for hadith in hadiths:
        hadith['phrases'] = [
            {'id': name, 'text': line}
            for name, where, pieces in CUTS if where == hadith['id']
            for line in (cut(hadith['hadith'], piece, name) for piece in pieces)
        ]
    write(SOURCE, source)


def keep_listed(source):
    """The source file without what the lists above no longer name. A hadith taken off HADITHS and a phrase taken off
    CUTS are dropped from the file here, by the script; nothing is asked of the site. A hadith that is listed and not
    in the file can only come from the site."""
    listed = [name for name, _, _ in HADITHS]
    held = [hadith['id'] for hadith in source['hadiths']]
    missing = [name for name in listed if name not in held]
    if missing:
        sys.exit('docs/sources/salah-azkar.json does not hold %s: run with --fetch' % ', '.join(missing))
    hadiths = []
    dropped = []
    for hadith in source['hadiths']:
        if hadith['id'] not in listed:
            dropped.append(hadith['reference'])
            continue
        cut_here = [name for name, where, _ in CUTS if where == hadith['id']]
        phrases = [phrase for phrase in hadith['phrases'] if phrase['id'] in cut_here]
        dropped += ['%s (%s)' % (phrase['id'], hadith['reference']) for phrase in hadith['phrases'] if phrase['id'] not in cut_here]
        hadiths.append(dict(hadith, phrases=phrases))
    if dropped:
        source = dict(source, hadiths=hadiths)
        write(SOURCE, source)
        print('dropped from', os.path.normpath(SOURCE) + ':', ', '.join(dropped))
    return source


def cut(text, piece, name):
    """The printed words from the opening words to the closing ones, found between the words given."""
    opens, closes, before, after, count = [part.split() if isinstance(part, str) else part for part in piece]
    tokens = [(n, bare(token)) for n, token in enumerate(text.split())]
    words = [(n, letters) for n, letters in tokens if letters]
    letters = [w for _, w in words]

    def at(i, wanted):
        return i >= 0 and letters[i:i + len(wanted)] == wanted

    starts = [i for i in range(len(letters)) if at(i, opens) and at(i - len(before), before)]
    found = []
    for i in starts:
        j = i + count - 1
        whole = at(j - len(closes) + 1, closes) and (at(j + 1, after) if after else j == len(letters) - 1)
        if whole:
            found.append((i, j))
    assert len(found) == 1, '%s: found %d places for "%s ... %s"' % (name, len(found), ' '.join(opens), ' '.join(closes))
    i, j = found[0]
    first, last = words[i][0], words[j][0]
    # Whole: no sign stands between its words that is not part of a word.
    assert last - first == j - i, '%s: something that is not a word stands inside the cut' % name
    raw = text.split()[first:last + 1]
    # The signs around the cut (a quotation mark, the full stop that ends the hadith's sentence) are not part of it.
    raw[0] = re.sub('^[^ء-ي]+', '', raw[0])
    raw[-1] = re.sub('[^ء-يً-ْ]+$', '', raw[-1])
    line = ' '.join(raw)
    assert re.fullmatch('[ء-يً-ْ، ]+', line), '%s: an unexpected sign in "%s"' % (name, line)
    return line


def respell(word):
    """One printed word in the site's spelling, and the rules that changed it."""
    rules = []
    fixed = re.sub(LAM + ALIF + '(' + SHADDA + '?[' + FATHA + FATHATAN + '])', LAM + r'\1' + ALIF, word)
    if fixed != word:
        rules.append('lam-alif')
    dotted = re.sub(DOTLESS + '(?=[' + MARKS + '])', YEH, fixed)
    if dotted != fixed:
        rules.append('dotless yeh')
    full = re.sub('^([وفبكل][' + FATHA + KASRA + '])?' + ALIF + LAM + '(?=[' + HAMZA_ALIFS + '])', lambda m: (m.group(1) or '') + ALIF + LAM + SUKOON, dotted)
    if full != dotted:
        rules.append('sukoon')
    return full, rules


def lacking(word):
    """The letters of a word left without a mark that the site's full voweling gives one."""
    units = re.findall('([ء-غف-ي])([' + MARKS + ']*)', word)
    missing = []
    for n, (letter, marks) in enumerate(units):
        if marks:
            continue
        before = units[n - 1][1] if n else ''
        after = units[n + 1] if n + 1 < len(units) else ('', '')
        if letter in ALIF + 'آ' + DOTLESS:
            continue  # an alif carries no mark of its own; the alif madda and the alif maqsura neither
        if letter == 'و' and DAMMA in before:
            continue  # the long vowels
        if letter == YEH and KASRA in before:
            continue
        if letter == LAM and SHADDA in after[1] and n and units[n - 1][0] in ALIF + LAM:
            continue  # the article's lam before a sun letter, and the first lam of the Name
        missing.append(letter)
    return missing


def write(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def main():
    # The report at the end prints Arabic: an output sent to a file or a pipe on Windows is not UTF-8 by itself.
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if '--fetch' in sys.argv[1:]:
        copy_sources()
    source = keep_listed(json.load(io.open(SOURCE, encoding='utf-8')))
    hadiths = {hadith['id']: hadith for hadith in source['hadiths']}
    azkar = {}
    changed = 0
    for name, where, pieces in CUTS:
        hadith = hadiths[where]
        as_printed = [cut(hadith['hadith'], piece, name) for piece in pieces]
        kept = [phrase['text'] for phrase in hadith['phrases'] if phrase['id'] == name]
        assert kept == as_printed, '%s: the source file\'s phrase is not the one cut from its hadith' % name
        lines = []
        changes = []
        for line in as_printed:
            words = []
            for word in line.split():
                fixed, rules = respell(word)
                if rules:
                    changes.append({'printed': word, 'written': fixed, 'rule': ' and '.join(rules)})
                assert bare(fixed.replace(YEH, DOTLESS)) == bare(word.replace(YEH, DOTLESS)), (word, fixed)
                assert not lacking(fixed), '%s: "%s" lacks a mark on %s' % (name, fixed, ' '.join(lacking(fixed)))
                words.append(fixed)
            lines.append(' '.join(words))
        changed += len(changes)
        azkar[name] = {
            'lines': lines,
            'hadith': hadith['reference'],
            'url': hadith['source_url'],
            'copied': hadith['copied'],
            'printed': as_printed,
            'changes': changes,
        }
    out = {
        'source': 'Written by tools/make-salah.py from docs/sources/salah-azkar.json, the hadiths as printed at sunnah.com. '
                  'Never edit by hand. "lines" is what the site shows; "printed" is the same words as the page prints them; '
                  '"changes" lists every word respelled, one by one (%d in all).' % changed,
        'azkar': azkar,
    }
    write(TARGET, out)
    print('wrote', os.path.normpath(TARGET), 'with', len(azkar), 'phrases;', changed, 'words respelled')
    for name, entry in azkar.items():
        for change in entry['changes']:
            print('  %-12s %s -> %s (%s)' % (name, change['printed'], change['written'], change['rule']))


if __name__ == '__main__':
    main()
