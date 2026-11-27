"""Writes public/quran/rahman-9.json, the ayah that opens the balance game
(balance.html): Ar-Rahman 55:9, the father's choice (2026-11-27), shown at the
start and read by a parent.

    python tools/make-balance-ayah.py

Nothing is typed by hand: the words are fetched from the Quran.com API,
text_uthmani, word by word, and checked against the whole verse. The game
shows them in the Mushaf font through mushafText() in app.js, which changes
the display only. Standard library only.
"""
import io
import json
import os
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(HERE, '..', 'public', 'quran', 'rahman-9.json')
KEY = '55:9'


def verse(key):
    url = 'https://api.quran.com/api/v4/verses/by_key/%s?words=true&word_fields=text_uthmani&fields=text_uthmani' % key
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'})
    data = json.load(urllib.request.urlopen(request))['verse']
    words = [w['text_uthmani'] for w in data['words'] if w['char_type_name'] == 'word']
    assert ' '.join(words) == data['text_uthmani'], key
    return words


def main():
    words = verse(KEY)
    out = {
        'source': 'Written by tools/make-balance-ayah.py from the Quran.com API (text_uthmani). Never edit by hand.',
        'key': KEY,
        'ayah': '٩',
        'words': words,
    }
    with io.open(TARGET, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(KEY, ' '.join(words))


if __name__ == '__main__':
    main()
