"""Writes public/dua/riding.json, the du'a of riding shown in the driving game.

    python tools/make-riding-dua.py

Nothing in the du'a is typed by hand:
- the words of the du'a are cut from docs/sources/abudawud-2602.json, a copy of
  the Arabic text of Sunan Abi Dawud 2602 as printed at sunnah.com;
- the Quran quote inside it (Az-Zukhruf 43:13 from its 12th word, then 43:14)
  is fetched from the Quran.com API, text_uthmani, word by word, and the game
  shows it in the Mushaf font.

One change is made to the copied words, to follow the site's Modern Standard
Arabic spelling: sunnah.com stores the marks of lam-alif after the alif (the
old typesetting habit), and here they are moved onto the lam. The letters and
the reading are the same. Standard library only.
"""
import io
import json
import os
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, '..', 'docs', 'sources', 'abudawud-2602.json')
TARGET = os.path.join(HERE, '..', 'public', 'dua', 'riding.json')

LAM, ALIF, FATHA, SHADDA = 'ل', 'ا', 'َ', 'ّ'


def modern(word):
    """Lam-alif with its marks after the alif: put them on the lam."""
    return word.replace(LAM + ALIF + SHADDA + FATHA, LAM + SHADDA + FATHA + ALIF).replace(LAM + ALIF + FATHA, LAM + FATHA + ALIF)


def verse(key):
    url = 'https://api.quran.com/api/v4/verses/by_key/%s?words=true&word_fields=text_uthmani&fields=text_uthmani' % key
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'})
    data = json.load(urllib.request.urlopen(request))['verse']
    words = [w['text_uthmani'] for w in data['words'] if w['char_type_name'] == 'word']
    assert ' '.join(words) == data['text_uthmani'], key
    return words


def main():
    source = json.load(io.open(SOURCE, encoding='utf-8'))
    said = {p['id']: p['text'] for p in source['phrases']}
    quote = verse('43:13')[11:] + verse('43:14')
    printed = [w for w in said['verses'].split() if w != '*']
    assert len(quote) == len(printed) == 13, (len(quote), len(printed))
    changed = []
    parts = []
    # The parents chose (2026-11-21) to keep two parts of the hadith's du'a: the
    # bismillah, then the verses. The source file holds the rest.
    for name, times in [('bismillah', 1), ('verses', 1)]:
        if name == 'verses':
            parts.append({'id': name, 'quran': True, 'words': quote})
            continue
        words = said[name].split()
        fixed = [modern(w) for w in words]
        changed += [w for w, f in zip(words, fixed) if w != f]
        part = {'id': name, 'words': fixed}
        if times > 1:
            part['times'] = times
        parts.append(part)
    out = {
        'source': 'Written by tools/make-riding-dua.py. Never edit by hand.',
        'hadith': source['source_url'] + ' (Sunan Abi Dawud 2602), copied 2026-11-21; the parents kept two of its parts; %d words respelled.' % len(changed),
        'quran': 'Quran.com API v4, text_uthmani words of 43:13 (from its 12th word) and 43:14, fetched 2026-11-21.',
        'parts': parts,
    }
    os.makedirs(os.path.dirname(TARGET), exist_ok=True)
    io.open(TARGET, 'w', encoding='utf-8', newline='\n').write(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
    print('wrote', os.path.normpath(TARGET), 'with', sum(len(p['words']) * p.get('times', 1) for p in parts), 'spoken words;', len(changed), 'words respelled')


if __name__ == '__main__':
    main()
