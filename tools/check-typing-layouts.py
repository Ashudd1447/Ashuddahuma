"""Checks public/typing/layouts.json, the Arabic keyboards of the typing game.

    python tools/check-typing-layouts.py

The file is written by tools/make-typing-layouts.py from the keyboard
descriptions in docs/sources/typing (Unicode CLDR 43, xkeyboard-config 2.48,
the Android Open Source Project); this script reads only the JSON file.

It checks that every physical layout types the 36 letters of Modern Standard
Arabic (the 28, the hamza and its five seats, the teh marbuta and the alef
maksura) and the eight marks, each with one key press, and that no key is
listed twice. Then it prints, layout by layout, where each letter and each mark
sits (the KeyboardEvent.code of its key, with Shift or AltGr when needed), which
keys type two characters at once, and how the layouts differ from one another.
For a keyboard drawn on a touch screen it prints the rows and what is behind a
long press. It ends with exit code 1 if a check failed. Standard library only.
"""
import io
import json
import os
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, '..', 'public', 'typing', 'layouts.json')

LETTERS = 'ء آ أ ؤ إ ئ ا ب ة ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ى ي'.split()
MARKS = [('َ', 'fatha'), ('ُ', 'damma'), ('ِ', 'kasra'), ('ْ', 'sukun'),
         ('ّ', 'shadda'), ('ً', 'fathatan'), ('ٌ', 'dammatan'), ('ٍ', 'kasratan')]
LEVELS = [('base', ''), ('shift', 'Shift+'), ('altgr', 'AltGr+'), ('altgrShift', 'Shift+AltGr+')]
CODES = set(
    'Backquote Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal '
    'KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP BracketLeft BracketRight Backslash '
    'KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon Quote '
    'IntlBackslash KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash Space'.split())


def name(ch):
    """A letter with its Unicode name, so that a line reads the same in any direction."""
    return '%s %s' % (ch, unicodedata.name(ch).replace('ARABIC LETTER ', '').lower())


def places(layout):
    """Every (text typed, place) of a physical layout, the plain key before the shifted one."""
    found = []
    for level, prefix in LEVELS:
        for row in layout['rows']:
            for key in row:
                if key.get(level):
                    found.append((key[level], prefix + key['code']))
    return found


def check_physical(layout, problems):
    """Print where everything sits; return {character: its first place}."""
    codes = [key['code'] for row in layout['rows'] for key in row]
    for code in sorted(set(codes)):
        if codes.count(code) > 1:
            problems.append('%s: %s is listed %d times' % (layout['id'], code, codes.count(code)))
        if code not in CODES:
            problems.append('%s: %s is not a key of the four rows' % (layout['id'], code))
    for missing in sorted(CODES - set(codes)):
        problems.append('%s: %s is missing' % (layout['id'], missing))

    typed = places(layout)
    where = {}
    for text, place in typed:
        where.setdefault(text, []).append(place)

    def seat(ch, label):
        if ch not in where:
            problems.append('%s: nothing types %s' % (layout['id'], label))
            return '%s MISSING' % label
        return '%s %s' % (label, ' or '.join(where[ch]))

    def wrapped(title, items):
        """Print the items a few to a line, so that the listing stays short."""
        line = '  %s:' % title
        for item in items:
            if len(line) + len(item) > 118:
                print(line)
                line = '   '
            line += ' ' + item + ','
        print(line.rstrip(','))

    # The lists are in Latin letters only: a line that mixes Arabic letters
    # and key names is shown in a different order by every screen.
    wrapped('letters', [seat(ch, name(ch)[2:]) for ch in LETTERS])
    wrapped('marks', [seat(ch, label) for ch, label in MARKS])
    double = [(text, place) for text, place in typed if len(text) > 1]
    wrapped('two characters at once', [
        '%s %s' % ('+'.join(name(ch)[2:] if unicodedata.category(ch)[0] == 'L' else
                            dict(MARKS).get(ch, 'U+%04X' % ord(ch)) for ch in text), place)
        for text, place in double] or ['none'])
    print('  digit row, alone: %s' % ' '.join(key.get('base', '-') for key in layout['rows'][0][1:11]))
    return {ch: where[ch][0] for ch in LETTERS + [m for m, _ in MARKS] if ch in where}


def check_touch(layout, problems):
    """Print the rows of a touch keyboard and where its letters and marks are."""
    reach = {}
    for number, row in enumerate(layout['rows']):
        print('  row %d: %s' % (number + 1, ' '.join('space' if key['base'] == ' ' else key['base'] for key in row)))
        for key in row:
            reach.setdefault(key['base'], 'row %d' % (number + 1))
    for row in layout['rows']:
        for key in row:
            for more in key.get('more', []):
                reach.setdefault(more, 'long press on %s' % key['base'])
            if key.get('more'):
                shown = ['U+%04X' % ord(m) if unicodedata.category(m[0]) == 'Mn' else m for m in key['more']]
                print('  long press on %s: %s' % (key['base'], ' '.join(shown)))
    for mark in layout.get('marks', []):
        reach.setdefault(mark, 'the symbols page, long press on the full stop')
    behind = [name(ch) + ' (' + reach[ch] + ')' for ch in LETTERS if ch in reach and not reach[ch].startswith('row')]
    print('  letters with no key of their own: %s' % ('; '.join(behind) or 'none'))
    for ch in LETTERS:
        if ch not in reach:
            problems.append('%s: nothing types %s' % (layout['id'], name(ch)))
    print('  lam-alef: %s' % ('; '.join('%s (%s)' % (text, reach[text]) for text in reach if len(text) == 2 and text[0] == 'ل')
                               or 'no key and no long press: typed as lam, then alef'))
    marks = ['%s (%s)' % (label, reach[ch]) for ch, label in MARKS if ch in reach]
    print('  marks: %s' % ('; '.join(marks) or 'none'))
    for ch, label in MARKS:
        if ch not in reach:
            problems.append('%s: nothing types the %s' % (layout['id'], label))


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    with io.open(SOURCE, encoding='utf-8') as source:
        data = json.load(source)
    problems, table, order = [], {}, []

    ids = [layout['id'] for layout in data['layouts']]
    for layout_id in sorted(set(ids)):
        if ids.count(layout_id) > 1:
            problems.append('the id %s is used %d times' % (layout_id, ids.count(layout_id)))

    for layout in data['layouts']:
        shape = 'needs the 102nd key' if layout['iso'] else 'no 102nd key needed'
        print('%s: %s (%s%s)' % (layout['id'], layout['title'], layout['kind'],
                                 ', ' + shape if layout['kind'] == 'physical' else ''))
        if layout['kind'] == 'physical':
            table[layout['id']] = check_physical(layout, problems)
            order.append(layout['id'])
        else:
            check_touch(layout, problems)
        print()

    # How the physical layouts differ: first the letters and marks that are
    # not on the same key everywhere, then a count for every pair of layouts.
    print('Letters and marks that are not in the same place in every physical layout')
    same = []
    for ch, label in [(ch, name(ch)) for ch in LETTERS] + MARKS:
        seats = {}
        for layout_id in order:
            seats.setdefault(table[layout_id].get(ch, 'MISSING'), []).append(layout_id)
        if len(seats) == 1:
            same.append(label)
            continue
        print('  %s: %s' % (label, '; '.join('%s in %s' % (seat, ', '.join(who)) for seat, who in seats.items())))
    print('In the same place everywhere (%d): %s' % (len(same), ', '.join(same)))
    print()
    print('Letters and marks placed differently, for every pair of physical layouts')
    for i, one in enumerate(order):
        for two in order[i + 1:]:
            moved = [ch for ch in table[one] if table[one][ch] != table[two].get(ch)]
            print('  %s and %s: %d' % (one, two, len(moved)))
    print()

    by_id = {layout['id']: layout for layout in data['layouts']}
    for alias in data.get('aliases', []):
        if alias['use'] not in by_id:
            problems.append('the alias %s points at %s, which is not a layout' % (alias['id'], alias['use']))
        print('alias %s (%s): use %s' % (alias['id'], alias['title'], alias['use']))
    print()

    if problems:
        print('%d PROBLEM(S)' % len(problems))
        for problem in problems:
            print('  ' + problem)
        sys.exit(1)
    print('All checks passed: %d physical layouts, %d touch layouts.' % (
        len(order), len(data['layouts']) - len(order)))


if __name__ == '__main__':
    main()
