"""Writes public/typing/layouts.json, the Arabic keyboards of the typing game.

    python tools/make-typing-layouts.py
    python tools/make-typing-layouts.py --microsoft <folder> [--download]

No key is typed by hand. Every layout is read from a published description kept
in docs/sources/typing (all fetched on 2026-11-23):

- cldr43-*.xml: the Unicode CLDR keyboard files, release 43, the last release
  that carried them (https://github.com/unicode-org/cldr/tree/release-43/keyboards,
  Unicode License, cldr-unicode-license.txt). Windows "Arabic (101)", "Arabic
  (102)" and "Arabic (102) AZERTY"; macOS "Arabic" and "Arabic - PC"; and the
  Arabic keyboard Android draws on a touch screen.
- xkb-2.48-symbols-ara.txt: the file symbols/ara of xkeyboard-config 2.48, the
  Arabic layout of Linux (https://www.x.org/releases/individual/data/xkeyboard-config/,
  MIT-style license, xkb-2.48-COPYING.txt).
- google-input-tools-ar.js: the Arabic keyboard of ChromeOS
  (https://github.com/google/google-input-tools, chrome/os/keyboard/layouts/ar.js,
  Apache License 2.0).
- aosp-keyboard_layout_arabic.kcm: the layout Android gives a keyboard that is
  plugged in (https://github.com/aosp-mirror/platform_frameworks_base,
  packages/InputDevices/res/raw, Apache License 2.0).
- aosp-latinime-*.xml: the rows of the Android keyboard's Arabic layout
  (https://android.googlesource.com/platform/packages/inputmethods/LatinIME,
  java/res/xml and java/res/xml-sw600dp, Apache License 2.0).

Each layout is then checked against a second description, and every
disagreement is printed. For the three Windows layouts the second description
is Microsoft's own tables as published at https://kbdlayout.info (kbda1, kbda2,
kbda3, "download as XML"). Those files are Microsoft's and are not kept in this
public repository: --microsoft names a folder that holds them as
kbdlayout-kbda1.xml and so on, and --download fetches them there first.

Standard library only.
"""
import argparse
import io
import json
import os
import re
import sys
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCES = os.path.join(HERE, '..', 'docs', 'sources', 'typing')
TARGET = os.path.join(HERE, '..', 'public', 'typing', 'layouts.json')
FETCHED = '2026-11-23'

CLDR_URL = 'https://raw.githubusercontent.com/unicode-org/cldr/release-43/keyboards/'
XKB_URL = 'https://www.x.org/releases/individual/data/xkeyboard-config/xkeyboard-config-2.48.tar.xz'
MS_URL = 'https://kbdlayout.info/%s/download/xml'

# The keys of the four rows of characters, named as KeyboardEvent.code names
# them, from the top row to the bottom row and from left to right.
DIGITS = ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8',
          'Digit9', 'Digit0', 'Minus', 'Equal']
TOP = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft',
       'BracketRight']
HOME = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote']
BOTTOM = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash']
ALL = DIGITS + TOP + ['Backslash'] + HOME + ['IntlBackslash'] + BOTTOM + ['Space']
LEVELS = ('base', 'shift', 'altgr', 'altgrShift')

# The same keys as CLDR names them (ISO 9995 positions). The key that carries
# the backslash on an American keyboard is D13 there and C12 on a European one.
ISO = {'D13': 'Backslash', 'C12': 'Backslash', 'B00': 'IntlBackslash', 'A03': 'Space'}
for number, code in enumerate(DIGITS):
    ISO['E%02d' % number] = code
for number, code in enumerate(TOP):
    ISO['D%02d' % (number + 1)] = code
for number, code in enumerate(HOME):
    ISO['C%02d' % (number + 1)] = code
for number, code in enumerate(BOTTOM):
    ISO['B%02d' % (number + 1)] = code

# As Windows numbers them (scan codes, set 1).
SCAN = {'29': 'Backquote', '2B': 'Backslash', '56': 'IntlBackslash', '39': 'Space'}
for number, code in enumerate(DIGITS[1:]):
    SCAN['%02X' % (0x02 + number)] = code
for number, code in enumerate(TOP):
    SCAN['%02X' % (0x10 + number)] = code
for number, code in enumerate(HOME):
    SCAN['%02X' % (0x1E + number)] = code
for number, code in enumerate(BOTTOM):
    SCAN['%02X' % (0x2C + number)] = code

# As XKB names them.
XKB = {'TLDE': 'Backquote', 'BKSL': 'Backslash', 'LSGT': 'IntlBackslash', 'SPCE': 'Space'}
for number, code in enumerate(DIGITS[1:]):
    XKB['AE%02d' % (number + 1)] = code
for number, code in enumerate(TOP):
    XKB['AD%02d' % (number + 1)] = code
for number, code in enumerate(HOME):
    XKB['AC%02d' % (number + 1)] = code
for number, code in enumerate(BOTTOM):
    XKB['AB%02d' % (number + 1)] = code

# As Android's key maps name them.
KCM = {'GRAVE': 'Backquote', 'MINUS': 'Minus', 'EQUALS': 'Equal', 'LEFT_BRACKET': 'BracketLeft',
       'RIGHT_BRACKET': 'BracketRight', 'BACKSLASH': 'Backslash', 'SEMICOLON': 'Semicolon',
       'APOSTROPHE': 'Quote', 'COMMA': 'Comma', 'PERIOD': 'Period', 'SLASH': 'Slash', 'SPACE': 'Space'}
for digit in '0123456789':
    KCM[digit] = 'Digit' + digit
for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
    KCM[letter] = 'Key' + letter

# As the ChromeOS file names them: the character of the Windows virtual key.
VK = {'\u00c0': 'Backquote', 'm': 'Minus', '=': 'Equal', '\u00db': 'BracketLeft', '\u00dd': 'BracketRight',
      '\u00dc': 'Backslash', ';': 'Semicolon', '\u00de': 'Quote', '\u00bc': 'Comma', '\u00be': 'Period',
      '\u00bf': 'Slash'}
VK.update(KCM)

# The names XKB gives the characters of its Arabic layouts.
KEYSYM = {
    'exclam': '!', 'at': '@', 'numbersign': '#', 'dollar': '$', 'percent': '%', 'asciicircum': '^',
    'ampersand': '&', 'asterisk': '*', 'parenleft': '(', 'parenright': ')', 'minus': '-',
    'underscore': '_', 'equal': '=', 'plus': '+', 'grave': '`', 'asciitilde': '~', 'less': '<',
    'greater': '>', 'bracketleft': '[', 'bracketright': ']', 'braceleft': '{', 'braceright': '}',
    'slash': '/', 'backslash': '\\', 'bar': '|', 'colon': ':', 'semicolon': ';', 'quotedbl': '"',
    'apostrophe': "'", 'comma': ',', 'period': '.', 'question': '?', 'space': ' ',
    'division': '\u00f7', 'multiply': '\u00d7', 'ellipsis': '\u2026', 'brokenbar': '\u00a6',
    'endash': '\u2013', 'notequal': '\u2260', 'guillemotleft': '\u00ab', 'guillemotright': '\u00bb',
    'eacute': '\u00e9', 'egrave': '\u00e8', 'ccedilla': '\u00e7', 'agrave': '\u00e0', 'degree': '\u00b0',
    'Arabic_hamza': '\u0621', 'Arabic_maddaonalef': '\u0622', 'Arabic_hamzaonalef': '\u0623',
    'Arabic_hamzaonwaw': '\u0624', 'Arabic_hamzaunderalef': '\u0625', 'Arabic_hamzaonyeh': '\u0626',
    'Arabic_alef': '\u0627', 'Arabic_beh': '\u0628', 'Arabic_tehmarbuta': '\u0629', 'Arabic_teh': '\u062a',
    'Arabic_theh': '\u062b', 'Arabic_jeem': '\u062c', 'Arabic_hah': '\u062d', 'Arabic_khah': '\u062e',
    'Arabic_dal': '\u062f', 'Arabic_thal': '\u0630', 'Arabic_ra': '\u0631', 'Arabic_zain': '\u0632',
    'Arabic_seen': '\u0633', 'Arabic_sheen': '\u0634', 'Arabic_sad': '\u0635', 'Arabic_dad': '\u0636',
    'Arabic_tah': '\u0637', 'Arabic_zah': '\u0638', 'Arabic_ain': '\u0639', 'Arabic_ghain': '\u063a',
    'Arabic_tatweel': '\u0640', 'Arabic_feh': '\u0641', 'Arabic_qaf': '\u0642', 'Arabic_kaf': '\u0643',
    'Arabic_lam': '\u0644', 'Arabic_meem': '\u0645', 'Arabic_noon': '\u0646', 'Arabic_ha': '\u0647',
    'Arabic_waw': '\u0648', 'Arabic_alefmaksura': '\u0649', 'Arabic_yeh': '\u064a',
    'Arabic_fathatan': '\u064b', 'Arabic_dammatan': '\u064c', 'Arabic_kasratan': '\u064d',
    'Arabic_fatha': '\u064e', 'Arabic_damma': '\u064f', 'Arabic_kasra': '\u0650',
    'Arabic_shadda': '\u0651', 'Arabic_sukun': '\u0652', 'Arabic_superscript_alef': '\u0670',
    'Arabic_comma': '\u060c', 'Arabic_semicolon': '\u061b', 'Arabic_question_mark': '\u061f',
    'Arabic_percent': '\u066a', 'Arabic_veh': '\u06a4', 'Arabic_tcheh': '\u0686', 'Arabic_peh': '\u067e',
    'Arabic_gaf': '\u06af', 'Arabic_jeh': '\u0698',
}
for digit in '0123456789':
    KEYSYM[digit] = digit
    KEYSYM['Arabic_' + digit] = chr(0x0660 + int(digit))

# XKB and Android write a lam-alef key as one presentation-form character.
# Windows and macOS type the two letters, and so does this file.
LIGATURES = {'\ufefb': '\u0644\u0627', '\ufef7': '\u0644\u0623', '\ufef9': '\u0644\u0625', '\ufef5': '\u0644\u0622'}


def source(name):
    return os.path.join(SOURCES, name)


def typed(text):
    """What a key types, or None when it types nothing a page can show."""
    if text is None:
        return None
    text = ''.join(LIGATURES.get(ch, ch) for ch in text)
    if not text or any(ord(ch) < 0x20 or ord(ch) == 0x7f for ch in text):
        return None
    return text


def arabic(text):
    """True when every character is an Arabic letter or mark (not a digit or a sign)."""
    return bool(text) and all(
        0x0600 <= ord(ch) <= 0x06ff and unicodedata.category(ch)[0] in 'LM' for ch in text)


def unescape(text):
    return re.sub(r'\\u\{([0-9A-Fa-f]+)\}', lambda m: chr(int(m.group(1), 16)), text)


def levels_of(modifiers):
    """The levels (base, shift, altgr, altgrShift) a CLDR keyMap stands for.

    Each alternative lists keys held down, a question mark marking one that may
    be held or not. Right Alt, and Ctrl with Alt, are AltGr on Windows; Option
    plays that part on macOS.
    """
    found = set()
    for alternative in (modifiers or '').split(' ') if modifiers else ['']:
        needed, allowed = set(), set()
        for part in alternative.split('+'):
            if not part:
                continue
            name = part.rstrip('?')
            name = {'altR': 'opt', 'shiftL': 'shift', 'shiftR': 'shift', 'optL': 'opt', 'optR': 'opt'}.get(name, name)
            (allowed if part.endswith('?') else needed).add(name)
        if {'ctrl', 'alt'} <= needed:
            needed = (needed - {'ctrl', 'alt'}) | {'opt'}
        for level, held in (('base', set()), ('shift', {'shift'}), ('altgr', {'opt'}),
                            ('altgrShift', {'opt', 'shift'})):
            if needed <= held <= (needed | allowed):
                found.add(level)
    return found


def read_cldr(name):
    """A CLDR keyboard file: {code: {level: text}} and, for a touch keyboard, its long presses."""
    root = ET.parse(source(name)).getroot()
    keys, more = {}, {}
    for key_map in root.findall('keyMap'):
        levels = levels_of(key_map.get('modifiers'))
        for entry in key_map.findall('map'):
            position = entry.get('iso')
            text = typed(unescape(entry.get('to')))
            for level in levels:
                if text is not None:
                    keys.setdefault(ISO.get(position, position), {})[level] = text
                if entry.get('longPress'):
                    more.setdefault(position, {})[level] = [unescape(x) for x in entry.get('longPress').split(' ')]
    transforms = [(unescape(t.get('from')), unescape(t.get('to'))) for t in root.findall('transforms/transform')]
    return {'title': root.find('names/name').get('value'), 'keys': keys, 'more': more, 'positions': keys,
            'transforms': transforms}


def read_microsoft(path):
    """A layout as kbdlayout.info publishes Microsoft's tables: {code: {level: text}}."""
    keys = {}
    for key in ET.parse(path).getroot().iter('PK'):
        code = SCAN.get(key.get('SC'))
        if not code:
            continue
        for result in key.findall('Result'):
            level = {'': 'base', 'VK_SHIFT': 'shift', 'VK_CONTROL VK_MENU': 'altgr',
                     'VK_SHIFT VK_CONTROL VK_MENU': 'altgrShift'}.get(result.get('With') or '')
            if level is None:
                continue
            if result.get('Text') is not None:
                text = result.get('Text')
            else:
                text = ''.join(chr(int(x, 16)) for x in (result.get('TextCodepoints') or '').split())
            if typed(text) is not None:
                keys.setdefault(code, {})[level] = typed(text)
    return keys


def keysym(name):
    name = name.strip()
    if name in ('any', 'none', 'NoSymbol', 'VoidSymbol', ''):
        return None
    match = re.fullmatch(r'U([0-9A-Fa-f]{4,6})', name) or re.fullmatch(r'0x100([0-9A-Fa-f]{4})', name)
    if match:
        return typed(chr(int(match.group(1), 16)))
    if name in KEYSYM:
        return KEYSYM[name]
    return '<%s>' % name


def read_xkb(name):
    """Every variant of an XKB symbols file, with the variants it includes laid under it."""
    text = io.open(source(name), encoding='utf-8').read()
    blocks = {}
    for match in re.finditer(r'xkb_symbols\s+"([^"]+)"\s*\{(.*?)\n\};', text, re.S):
        blocks[match.group(1)] = match.group(2)

    def variant(which):
        keys = {}
        body = blocks[which]
        for included in re.findall(r'include\s+"ara\(([^)]+)\)"', body):
            keys.update(variant(included))
        for match in re.finditer(r'key\s+<(\w+)>\s*\{\s*\[([^\]]*)\]', body):
            code = XKB.get(match.group(1))
            if not code:
                continue
            key = {}
            for level, symbol in zip(LEVELS, match.group(2).split(',')):
                if keysym(symbol) is not None:
                    key[level] = keysym(symbol)
            keys[code] = key
        return keys

    return {which: variant(which) for which in blocks}


def read_kcm(name):
    """An Android key character map: {code: {level: text}}."""
    keys, current = {}, None
    for line in io.open(source(name), encoding='utf-8'):
        line = line.strip()
        match = re.fullmatch(r'key (\w+) \{', line)
        if match:
            current = KCM.get(match.group(1))
            continue
        if line == '}':
            current = None
            continue
        match = re.fullmatch(r"(base|shift):\s*'(.*)'", line)
        if current and match:
            text = match.group(2)
            escaped = re.fullmatch(r'\\u([0-9A-Fa-f]{4})', text)
            if escaped:
                text = chr(int(escaped.group(1), 16))
            elif text.startswith('\\'):
                text = text[1:]
            keys.setdefault(current, {})[match.group(1)] = typed(text)
    return keys


def read_chromeos(name):
    """The ChromeOS Arabic keyboard: {code: {level: text}}, and the lines that do not add up."""
    text = io.open(source(name), encoding='utf-8').read()
    text = text[text.index("'mappings'"):]

    def plain(piece):
        piece = re.sub(r'\\u([0-9A-Fa-f]{4})', lambda m: chr(int(m.group(1), 16)), piece)
        return re.sub(r'\\(.)', r'\1', piece)

    # The file is JavaScript: take its strings and its punctuation in order.
    # A string joined to the next by a plus sign is one string.
    tokens = []
    for string, sign in re.findall(r"'((?:[^'\\]|\\.)*)'|([:{}+])", text):
        if sign == '+':
            tokens.append('+')
        elif sign:
            tokens.append(sign)
        elif tokens and tokens[-1] == '+':
            tokens.pop()
            tokens[-1] = ('text', tokens[-1][1] + plain(string))
        else:
            tokens.append(('text', plain(string)))

    keys, flawed, level = {}, [], None
    for at, token in enumerate(tokens):
        if not (isinstance(token, tuple) and at + 1 < len(tokens) and tokens[at + 1] == ':'):
            continue
        names, after = token[1], tokens[at + 2]
        if after == '{':
            # The states a group of keys is for: s is Shift, c Caps Lock, l AltGr.
            level = {'scl,sc,sl,s': 'shift', 'cl,l,c,': 'base'}.get(names)
        elif level and isinstance(after, tuple):
            value = after[1]
            if len(names) == 1:
                keys.setdefault(VK[names], {})[level] = typed(value)
            elif len(names) == len(value):
                for one, ch in zip(names, value):
                    keys.setdefault(VK[one], {})[level] = typed(ch)
            else:
                flawed.append('%s: the %d keys %s are given %d characters, %s' % (
                    level, len(names), ' '.join(VK[one] for one in names), len(value), show(value)))
    return keys, flawed


def read_latinime(names):
    """Keys of the Android keyboard's rows: a list of (letter, [long presses])."""
    space = '{http://schemas.android.com/apk/res/com.android.inputmethod.latin}'
    keys = []
    for name in names:
        for key in ET.parse(source(name)).getroot().iter('Key'):
            more = []
            for piece in (key.get(space + 'moreKeys') or '').split(','):
                piece = piece.split('|')[-1]
                if piece and not piece.startswith('!'):
                    more.append(typed(piece))
            keys.append((key.get(space + 'keySpec'), more))
    return keys


def physical(layout_id, title, platform, iso, keys, sources, notes):
    """One physical layout in the shape the game reads."""
    def key(code):
        entry = {'code': code}
        levels = keys.get(code, {})
        for level in ('base', 'shift'):
            if levels.get(level) is not None:
                entry[level] = levels[level]
        # AltGr or Option is recorded only where it types Arabic letters or marks.
        for level in ('altgr', 'altgrShift'):
            if arabic(levels.get(level)):
                entry[level] = levels[level]
        return entry

    # Every layout is listed on the American shape of keyboard, the one the
    # family has: the Backslash key ends the top row of letters. On a keyboard
    # of the European shape that same key sits beside Enter, at the end of the
    # home row, and the IntlBackslash key exists.
    rows = [DIGITS, TOP + ['Backslash'], HOME, ['IntlBackslash'] + BOTTOM, ['Space']]
    return {'id': layout_id, 'title': title, 'platform': platform, 'kind': 'physical', 'iso': iso,
            'sources': sources, 'notes': notes, 'rows': [[key(code) for code in row] for row in rows]}


def touch(layout_id, title, cldr, rows, sources, notes):
    """One keyboard drawn on a touch screen: rows of {base, more}."""
    out = []
    for row in rows:
        line = []
        for position in row:
            base = cldr['positions'].get(ISO.get(position, position), {}).get('base')
            if base is None:
                continue
            entry = {'base': base}
            more = cldr['more'].get(position, {}).get('base')
            if more:
                entry['more'] = more
            line.append(entry)
        out.append(line)
    return {'id': layout_id, 'title': title, 'platform': 'android', 'kind': 'touch', 'iso': False,
            'sources': sources, 'notes': notes, 'rows': out}


def differences(name_a, a, name_b, b, levels=('base', 'shift'), codes=ALL):
    """The keys on which two descriptions disagree, as printable lines."""
    lines = []
    for code in codes:
        for level in levels:
            one, two = a.get(code, {}).get(level), b.get(code, {}).get(level)
            if one != two:
                lines.append('    %s %s: %s has %s, %s has %s' % (code, level, name_a, show(one), name_b, show(two)))
    return lines


def show(text):
    if text is None:
        return 'nothing'
    return '%s (%s)' % (text, ' '.join('U+%04X' % ord(ch) for ch in text))


def report(title, lines):
    print('%s: %s' % (title, 'no disagreement' if not lines else '%d disagreement(s)' % len(lines)))
    for line in lines:
        print(line)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--microsoft', help='folder with kbdlayout-kbda1.xml, -kbda2.xml, -kbda3.xml')
    parser.add_argument('--download', action='store_true', help='fetch those three files into the folder first')
    args = parser.parse_args()
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    win101 = read_cldr('cldr43-ar-t-k0-windows.xml')
    win102 = read_cldr('cldr43-ar-t-k0-windows-102key.xml')
    azerty = read_cldr('cldr43-ar-t-k0-windows-azerty.xml')
    mac = read_cldr('cldr43-ar-t-k0-osx.xml')
    mac_pc = read_cldr('cldr43-ar-t-k0-osx-qwerty-var.xml')
    phone = read_cldr('cldr43-ar-t-k0-android.xml')
    tablet7 = read_cldr('cldr43-ar-t-k0-android-600dpi.xml')
    tablet10 = read_cldr('cldr43-ar-t-k0-android-768dpi.xml')
    xkb = read_xkb('xkb-2.48-symbols-ara.txt')
    kcm = read_kcm('aosp-keyboard_layout_arabic.kcm')
    chromeos, chromeos_flawed = read_chromeos('google-input-tools-ar.js')

    assert (win101['title'], win102['title'], azerty['title']) == ('Arabic (101)', 'Arabic (102)', 'Arabic (102) AZERTY')
    assert (mac['title'], mac_pc['title']) == ('Arabic', 'Arabic PC')

    cldr = 'Unicode CLDR 43, keyboards/%s (' + CLDR_URL + '%s), Unicode License, fetched ' + FETCHED
    microsoft = "checked against Microsoft's %s as published at https://kbdlayout.info/%s (not kept in this repository)"
    letter_rows = [['D%02d' % n for n in range(1, 13)], ['C%02d' % n for n in range(1, 13)],
                   ['B%02d' % n for n in range(1, 12)], ['A00', 'A01', 'A02', 'A03', 'A04']]

    layouts = [
        physical('win-101', 'Windows Arabic (101)', 'windows', False, win101['keys'], [
            cldr % ('windows/ar-t-k0-windows.xml', 'windows/ar-t-k0-windows.xml'),
            microsoft % ('kbda1.dll', 'kbda1')],
            'The default of Windows for every Arabic language except Algeria, Morocco and Tunisia. For the '
            'American keyboard, which has no key between the left Shift and Z.'),
        physical('win-102', 'Windows Arabic (102)', 'windows', True, win102['keys'], [
            cldr % ('windows/ar-t-k0-windows-102key.xml', 'windows/ar-t-k0-windows-102key.xml'),
            microsoft % ('kbda2.dll', 'kbda2')],
            'Made for the European keyboard with the extra key beside the left Shift, and usable on an '
            'American one: that extra key carries only the tatweel (also on Shift+KeyJ) and the bar. Never a '
            'default of Windows: someone has to choose it. Shift+KeyS types nothing. AltGr on Q, W, E, R, C '
            'and V types the shadda and a vowel together.'),
        physical('win-102-azerty', 'Windows Arabic (102) AZERTY', 'windows', True, azerty['keys'], [
            cldr % ('windows/ar-t-k0-windows-azerty.xml', 'windows/ar-t-k0-windows-azerty.xml'),
            microsoft % ('kbda3.dll', 'kbda3')],
            'The default of Windows for Algeria, Morocco and Tunisia. The Arabic letters and marks sit '
            'exactly as in Arabic (102); the digit row is the French one.'),
        physical('mac-arabic', 'macOS Arabic', 'macos', False, mac['keys'], [
            cldr % ('osx/ar-t-k0-osx.xml', 'osx/ar-t-k0-osx.xml'),
            'checked against the variant "mac" of xkeyboard-config 2.48, symbols/ara'],
            'The layout printed on Apple keyboards sold with Arabic keycaps. No lam-alef key. The CLDR file '
            'describes OS X 10.9.'),
        physical('mac-arabic-pc', 'macOS Arabic - PC', 'macos', False, mac_pc['keys'], [
            cldr % ('osx/ar-t-k0-osx-qwerty-var.xml', 'osx/ar-t-k0-osx-qwerty-var.xml'),
            'checked against Windows Arabic (101)'],
            'The letters and marks of Windows Arabic (101) on a Mac, with Arabic-Indic digits on the digit '
            'row. The CLDR file describes OS X 10.9.'),
        physical('linux-ara', 'Linux Arabic (XKB ara, basic)', 'linux', False, xkb['basic'], [
            'xkeyboard-config 2.48, symbols/ara, variant "basic" (' + XKB_URL + '), MIT-style license, fetched '
            + FETCHED,
            'checked against Windows Arabic (101)'],
            'The letters and marks of Windows Arabic (101). Level 3 (right Alt) adds letters of other '
            'languages and the alef wasla.'),
        touch('android-phone', 'Android keyboard (AOSP), Arabic, phone and 10-inch tablet', phone, letter_rows, [
            cldr % ('android/ar-t-k0-android.xml', 'android/ar-t-k0-android.xml'),
            'checked against the Android Open Source Project keyboard, LatinIME java/res/xml/rowkeys_arabic1-3.xml '
            'and keys_arabic3_left.xml, Apache License 2.0, fetched ' + FETCHED],
            'Gboard grew out of this keyboard. Marks: on the symbols page, a long press on the full stop. '
            'The CLDR file describes Android 4.4.'),
        touch('android-tablet-7in', 'Android keyboard (AOSP), Arabic, 7-inch tablet', tablet7, letter_rows, [
            cldr % ('android/ar-t-k0-android-600dpi.xml', 'android/ar-t-k0-android-600dpi.xml'),
            'checked against LatinIME java/res/xml-sw600dp/keys_arabic3_left.xml, Apache License 2.0, fetched '
            + FETCHED],
            'One more key in the bottom row of letters. Marks: a long press on the full stop. '
            'The CLDR file describes Android 4.4.'),
    ]

    # The marks of the phone keyboard are behind its symbols page, which CLDR
    # lists as another layer of the same key.
    marks = phone['more'].get('A04', {}).get('altgr') or []
    layouts[6]['marks'] = [m for m in marks if unicodedata.category(m[0]) == 'Mn']

    data = {
        'about': 'Written by tools/make-typing-layouts.py from the files in docs/sources/typing. Do not edit by '
                 'hand. Physical layouts: rows from the top row to the bottom row, keys from left to right, '
                 'each named by KeyboardEvent.code, with what it types alone (base) and with Shift (shift). '
                 'altgr and altgrShift (right Alt on Windows and Linux, Option on macOS) are given only where '
                 'they type Arabic letters or marks. A level that types nothing is left out. A key that types '
                 'two characters at once keeps both. IntlBackslash, the key between the left Shift and Z, is '
                 'listed in every layout, but only keyboards of the European shape have it: "iso" says whether '
                 'the layout was made for that shape. The rows follow the American shape, with Backslash at the '
                 'end of the top row of letters; on the European shape that key sits at the end of the home '
                 'row. Touch layouts: rows of what a key types (base) and what a long press '
                 'offers (more).',
        'fetched': FETCHED,
        'layouts': layouts,
        'aliases': [
            {'id': 'chromeos-ar', 'title': 'ChromeOS Arabic keyboard', 'platform': 'chromeos', 'use': 'win-101',
             'notes': 'Letters and marks as in Windows Arabic (101); the digit row types Arabic-Indic digits. '
                      'From google-input-tools, chrome/os/keyboard/layouts/ar.js (2014), Apache License 2.0.'},
            {'id': 'android-physical', 'title': 'Android, Arabic layout for a plugged-in keyboard',
             'platform': 'android', 'use': 'win-101',
             'notes': 'Letters and marks as in Windows Arabic (101); Arabic-Indic digits; each lam-alef key '
                      'types one presentation-form character (U+FEFB, U+FEF5, U+FEF7, U+FEF9). From the Android '
                      'Open Source Project, keyboard_layout_arabic.kcm, Apache License 2.0.'},
            {'id': 'linux-ara-azerty', 'title': 'Linux Arabic (XKB ara, azerty)', 'platform': 'linux',
             'use': 'linux-ara',
             'notes': 'The basic variant with the French digit row. The letters stay where Arabic (101) has '
                      'them, unlike Windows Arabic (102) AZERTY.'},
        ],
    }
    os.makedirs(os.path.dirname(TARGET), exist_ok=True)
    with io.open(TARGET, 'w', encoding='utf-8', newline='\n') as out:
        json.dump(data, out, ensure_ascii=False, indent=1)
        out.write('\n')
    print('wrote %s: %d layouts' % (os.path.relpath(TARGET, os.path.join(HERE, '..')), len(layouts)))
    print()

    # The second look at every layout.
    if args.microsoft:
        for dll, layout in (('kbda1', win101), ('kbda2', win102), ('kbda3', azerty)):
            path = os.path.join(args.microsoft, 'kbdlayout-%s.xml' % dll)
            if args.download and not os.path.exists(path):
                request = urllib.request.Request(MS_URL % dll, headers={'User-Agent': 'Mozilla/5.0'})
                with open(path, 'wb') as out:
                    out.write(urllib.request.urlopen(request, timeout=60).read())
            report('%s, CLDR against Microsoft %s.dll (base, Shift, AltGr, Shift+AltGr)' % (layout['title'], dll),
                   differences('CLDR', layout['keys'], 'Microsoft', read_microsoft(path), LEVELS))
    else:
        print('Windows layouts: not checked against Microsoft (give --microsoft <folder>).')
    report('macOS Arabic, CLDR against XKB ara(mac) (base, Shift)',
           differences('CLDR', mac['keys'], 'XKB', xkb['mac'], codes=[c for c in ALL if c != 'Space']))
    report('macOS Arabic - PC against Windows Arabic (101) (base, Shift)',
           differences('macOS', mac_pc['keys'], 'Windows', win101['keys']))
    report('Linux ara(basic) against Windows Arabic (101) (base, Shift)',
           differences('XKB', xkb['basic'], 'Windows', win101['keys'], codes=[c for c in ALL if c != 'Space']))
    report('Linux ara(azerty) against Windows Arabic (102) AZERTY (base, Shift)',
           differences('XKB', xkb['azerty'], 'Windows', azerty['keys'], codes=[c for c in ALL if c != 'Space']))
    report('ChromeOS Arabic against Windows Arabic (101) (base, Shift)',
           ['    the source file is flawed: ' + line for line in chromeos_flawed]
           + differences('ChromeOS', chromeos, 'Windows', win101['keys'],
                         codes=[c for c in ALL if c not in ('Space', 'IntlBackslash')]))
    report('Android plugged-in keyboard against Windows Arabic (101) (base, Shift)',
           differences('Android', kcm, 'Windows', win101['keys'],
                       codes=[c for c in ALL if c not in ('Space', 'IntlBackslash')]))

    # The touch keyboard: CLDR (Android 4.4) against today's AOSP rows.
    for title, layout, left in (('phone', layouts[6], 'aosp-latinime-keys_arabic3_left.xml'),
                                ('7-inch tablet', layouts[7], 'aosp-latinime-sw600dp-keys_arabic3_left.xml')):
        aosp = read_latinime(['aosp-latinime-rowkeys_arabic1.xml', 'aosp-latinime-rowkeys_arabic2.xml', left,
                              'aosp-latinime-rowkeys_arabic3.xml'])
        ours = [(k['base'], k.get('more', [])) for row in layout['rows'][:3] for k in row]
        lines = []
        if [k for k, _ in ours] != [k for k, _ in aosp]:
            lines.append('    letters: CLDR has %s, AOSP has %s' % (' '.join(k for k, _ in ours), ' '.join(k for k, _ in aosp)))
        for (key, more_a), (_, more_b) in zip(ours, aosp):
            if more_a != more_b:
                lines.append('    long press on %s: CLDR has %s, AOSP has %s' % (key, more_a or 'nothing', more_b or 'nothing'))
        report('Android touch keyboard, %s, CLDR against AOSP LatinIME (the three rows of letters)' % title, lines)
    ten = touch('', '', tablet10, letter_rows, [], '')
    report('Android touch keyboard, 10-inch tablet against phone (CLDR, the three rows of letters)',
           [] if ten['rows'][:3] == layouts[6]['rows'][:3] else ['    the rows differ'])


if __name__ == '__main__':
    main()
