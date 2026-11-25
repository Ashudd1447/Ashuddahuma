"""Writes public/sheets/sheets.json and the pictures public/sheets/img/<name>.png:
the number games and the thinking games of the family's two activity books, as data.

    python tools/make-sheets.py [folder of the books]

The books are musa-go.pdf and musa-back.pdf. They are not in this repo: by
default they are looked for in ../books, beside the repo. PyMuPDF is needed
(pip install pymupdf); nothing else. It takes about half a minute and prints
every round with its answer.

WHAT IS READ, AND WHAT IS WRITTEN BY HAND

Nothing on a page is retyped. Which pages hold which game comes from the books'
own index (PDF page 4: the rows under the green heading are the number games,
the rows under the purple one the thinking games; a printed page number is the
PDF page number minus 2, and each page is checked to carry its number and its
heading). Counts, numbers, letters, places, sizes and outlines come out of the
pages' own objects: the embedded pictures, the vector drawings, and the glyphs
with what the page says they spell. The right answers are worked out here and
each is checked against what the page offers: how many pictures a group holds,
which box holds more, which picture is largest or smallest, the number that
fills the gap, the sum, the two pictures that are one and the same (by their
pixels), which shadow belongs to which picture (by their transparency), what
continues a run, which letters equal the boxed one, what differs between two
scenes. Every picture and every character of a page must be accounted for by
its game. Anything that does not fit stops the script with a message that names
the book and the page. Nothing is guessed.

Written by hand, in the tables at the top of this file: the order of the games
in the index (INDEX), the instruction of each game (GAMES, the parents' wording),
the name of each picture (NAMES, by what it shows), the kind of thing each
picture is, for the game of the one that does not belong (KINDS), the names of
the eight crayons in the order the index shows them (CRAYONS), and what the
dot drawings, the coloring drawings and the half drawings show (DRAWN).

THE PICTURES

Every embedded picture used on those pages is saved once, as
public/sheets/img/<name>.png: with transparency, cut to what is visible, its
longer side 320 pixels. One file serves both books and every page. A picture
that the books hold again at another size (the red balloon of one page and of
another) is recognized by its pixels and is one file too. Names say what the
picture shows; where the books have one drawing in several colorings, every one
of them carries its color (car-red, car-blue, car-purple). A shadow is named
after its picture without the color: teapot-shadow. Files in img/ that this
script no longer writes are deleted.

THE FORMAT OF sheets.json

    {"v": 1, "colors": {...}, "outlines": {...}, "pictures": {...}, "games": [...]}

colors     the crayons the games use, by English name:
           {"red": {"hex": "#e53935", "ar": "أَحْمَرُ"}, ...}. The hex is the
           crayon's own fill on the page.
pictures   every file in img/, by name: {"apple-red": {"w": 259, "h": 320}},
           the size of the file in pixels. A shadow also says whose it is:
           {"teapot-shadow": {"w": 320, "h": 225, "of": "teapot-blue"}}. A
           shadow and its picture have the same size and the same outline, so
           one laid over the other covers it exactly.
outlines   the four shapes of the game color-count, by name (star, balloon,
           heart, circle): {"box": {"w": 1, "h": 0.9512}, "fill": "M...Z",
           "line": "M...", "stroke": 0.0469}. "fill" is the closed outline to
           color in and to stroke, "line" (the balloon's string; "" for the
           others) is stroked only, "stroke" is the pen's width. All in the
           outline's own box.
games      the seventeen games, the number games first, in the order of the
           books' index: {"id": "count", "hub": "numbers", "prompt": "...",
           "rounds": [...]}. hub is "numbers" or "think". prompt is the
           instruction. A round with a "prompt" of its own uses that one
           instead (only the three "smallest" rounds of the game size).

Every round starts with where it came from: "book" ("go" or "back") and "page",
the page number printed at the foot of the page. Rounds are in book order: go
first, then back, and a page's rows from top to bottom ("row", from 1; a round
that is a whole page has no "row").

Order. The books are Arabic, so a row is read from the right. Every list that
runs along a row (choices, pictures, run, the groups of one row, sizes, key) is
in reading order: its FIRST item is the RIGHTMOST on the page. Lists that run
down a page (the groups and numbers of match-number, the pictures and shadows
of shadow) go from top to bottom. The cells of letter go row by row from the
top, each row from the right. "answer" is always a place in such a list,
counted from 0 (or a list of such places).

Boxes. Wherever places are given, they are in a box that is 1 wide and "h"
tall: {"w": 1, "h": 0.62}. x runs from 0 at the left edge to 1 at the right
edge; y runs from 0 at the top downward to h, in the same unit (the box's
width). A place is [x, y, w, h]: the left edge, the top edge, the width and
the height. A point is [x, y]. So on a screen where the box is drawn W pixels
wide, multiply every number by W. A box is the tight frame around what it
holds, with no margin (a pen's width sticks out by half). Paths ("d", "fill",
"line") are SVG path data in the same unit (M, L, C, A, Z with absolute
numbers), ready for new Path2D(d) or <path d>.

A group is a set of one picture repeated, as the page lays it out:
    {"picture": "apple-red", "count": 3, "box": {"w": 1, "h": 0.3743},
     "places": [[x, y, w, h], ...]}
places are in the group's own box, in reading order (top line first, each line
from the right). In color-count the group has "outline" (a name in outlines)
in place of "picture". A group drawn in a rectangle R of the screen, R.w wide
and R.w * box.h high, puts each picture at R.x + x * R.w, R.y + y * R.w, sized
w * R.w by h * R.w. Where a round lays several groups out together (add,
match-number), each group also has "at": the place of its box in the round's
box, so that their pictures come out at one size.

The rounds, game by game:

count         {"group": G, "choices": [6, 3, 5], "answer": 1}
              choices[answer] is G.count. On the page the group is on the
              right, the numbers on the left.
color-count   {"number": 3, "group": G}
              G holds outlines (six of them); `number` of them are to be
              colored, in any color. On the page the number stands at the
              right of the row.
match-number  {"box": B, "groups": [G + {"at": place, "dot": point}, x4],
              "numbers": [{"n": 4, "at": place, "dot": point}, x4],
              "answer": [2, 0, 3, 1], "dotRadius": r}
              The groups are on the right of the page, the numbers on the
              left, each with the dot a line is drawn from. answer[i] is the
              place in numbers of the number that group i joins. A number's
              "at" is its circle.
dots          {"box": B, "shape": "star", "name": "...", "closed": true,
              "radius": r, "dots": [{"n": 1, "x": .., "y": .., "label": point}]}
              The dots in the order to join them. label is the middle of the
              printed number. closed: the last dot is joined back to the first.
              On the page dot 1 is green and a third larger than the others.
more          {"groups": [G, G], "answer": 0}
              Two boxes of one picture; the answer is the fuller one. Here a
              group's box is the page's frame around it (both frames are one
              size).
size          {"picture": "apple-red", "sizes": [0.682, 1, 0.412],
              "want": "largest", "answer": 1}
              One picture three times; sizes are their widths, the largest 1.
              want is "largest" or "smallest".
missing       {"run": [1, null, 3, 4, 5], "choices": [10, 2, 9], "answer": 1}
              null is the gap.
shapes        {"box": B, "stroke": s, "key": [{"shape": "circle", "color":
              "red", "box": b, "d": path}, x4], "shapes": [{"shape": "star",
              "color": "green", "at": place, "d": path}, x16]}
              shape is circle, triangle, square or star. Each shape's d is its
              outline in the round's box (they differ in size and in the way
              they are turned); color is the answer, from the key. A key
              entry's d is in its own small box.
add           {"box": B, "groups": [G + {"at": place}, G + {"at": place}],
              "choices": [5, 6, 4], "answer": 2}
              groups[0] (on the right) + groups[1] = choices[answer]. The box
              holds the two groups only; on the page a + stands between them,
              and = and an empty box at their left.
color-number  {"box": B, "shape": "house", "name": "...", "stroke": s,
              "key": [{"number": 1, "color": "red"}, ...],
              "regions": [{"number": 1, "color": "red", "d": path, "label":
              point}], "lines": [{"d": path, "width": w}]}
              regions are in the order they are painted: a later one lies on
              top of an earlier one (the door on the wall, the water on the
              hull), so fill them in this order and, for a touch, take the
              LAST region that holds the point. label is where the number
              stands. lines are strokes that are not regions (the mast).
shadow        {"box": B, "pictures": [{"picture": "car-red", "at": place,
              "dot": point}, x4], "shadows": [{"picture": "teapot-shadow",
              "at": place, "dot": point}, x4], "answer": [1, 0, 3, 2],
              "dotRadius": r}
              The pictures are on the right, the shadows on the left.
              answer[i] is the place in shadows of the shadow of picture i.
different     {"pictures": [p, p, p, p], "answer": 2}
              Three are one kind of thing; the answer is not.
similar       {"pictures": [p, p, p, p], "answer": [1, 3]}
              One drawing in three colorings; the answer is the two alike
              (they carry the same name).
next          {"run": [p x6], "choices": [p x3], "answer": 1}
              The run repeats; choices[answer] comes next, at its left end.
letter        {"letter": "م", "cols": 5, "rows": 4, "cells": [20 letters],
              "answer": [5, 6, 7, 8, 9, 17, 19]}
              answer lists every cell that holds the letter.
differences   {"box": B, "ground": y, "top": [{"picture": p, "at": place}],
              "bottom": [...], "differences": [{"top": 5, "bottom": 4,
              "at": place}, {"top": 1, "bottom": null, "at": place}, ...]}
              Two scenes in one box each, drawn in list order (later on top).
              ground is where the strip of grass begins; it runs to the foot.
              A difference names the thing in top and the thing in bottom that
              took its place (null: nothing there), and the place that covers
              both, for a touch in either scene.
complete      {"box": B, "shape": "house", "name": "...", "axis": 0.5,
              "stroke": s, "drawn": {"d": path, "points": [point, ...]},
              "todo": {"d": path, "points": [...]}}
              drawn is the half the page draws (right of the axis), todo its
              mirror image (the page's dotted half), the child's to draw. Both
              start and end on the axis, at the same two points. points is the
              same line as d in short straight steps. Each page has two
              drawings, so here a round is one drawing ("row" 1 or 2).
"""
import hashlib
import json
import os
import re
import sys
import unicodedata

import pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..'))
BOOKS = os.path.normpath(os.path.join(REPO, '..', 'books'))
TARGET = os.path.join(REPO, 'public', 'sheets')
FILES = {'go': 'musa-go.pdf', 'back': 'musa-back.pdf'}

# The games in the order of the books' index, with the parents' wording of each instruction.
GAMES = [
    ('count', 'numbers', 'عُدَّ، ثُمَّ ضَعْ دَائِرَةً حَوْلَ الْعَدَدِ'),
    ('color-count', 'numbers', 'لَوِّنْ بِعَدَدِ الرَّقْمِ'),
    ('match-number', 'numbers', 'صِلْ كُلَّ مَجْمُوعَةٍ بِعَدَدِهَا'),
    ('dots', 'numbers', 'صِلِ النِّقَاطَ بِالتَّرْتِيبِ'),
    ('more', 'numbers', 'ضَعْ دَائِرَةً حَوْلَ الْأَكْثَرِ'),
    ('size', 'numbers', 'ضَعْ دَائِرَةً حَوْلَ الْأَكْبَرِ'),
    ('missing', 'numbers', 'مَا الْعَدَدُ النَّاقِصُ؟'),
    ('shapes', 'numbers', 'لَوِّنِ الْأَشْكَالَ كَمَا فِي الْمِثَالِ'),
    ('add', 'numbers', 'عُدَّ الْكُلَّ، وَضَعْ دَائِرَةً حَوْلَ الْجَوَابِ'),
    ('color-number', 'numbers', 'لَوِّنْ كُلَّ رَقْمٍ بِلَوْنِهِ'),
    ('shadow', 'think', 'صِلْ كُلَّ صُورَةٍ بِظِلِّهَا'),
    ('different', 'think', 'ضَعْ دَائِرَةً حَوْلَ الْمُخْتَلِفِ'),
    ('similar', 'think', 'ضَعْ دَائِرَةً حَوْلَ الصُّورَتَيْنِ الْمُتَشَابِهَتَيْنِ'),
    ('next', 'think', 'مَاذَا يَأْتِي بَعْدُ؟'),
    ('letter', 'think', 'لَوِّنْ كُلَّ حَرْفٍ مِثْلَ هَذَا'),
    ('differences', 'think', 'اِبْحَثْ عَنْ ٣ اخْتِلَافَاتٍ'),
    ('complete', 'think', 'أَكْمِلِ الرَّسْمَ'),
]
SMALLEST = 'ضَعْ دَائِرَةً حَوْلَ الْأَصْغَرِ'  # the size game, where the page asks for the smallest

# The rows of each book's index under the two headings, from the top.
INDEX = {
    'go': {
        'numbers': ['count', 'color-count', 'match-number', 'dots', 'more', 'size', 'missing', 'shapes'],
        'think': ['shadow', 'different', 'similar', 'next', 'letter'],
    },
    'back': {
        'numbers': ['count', 'color-count', 'match-number', 'dots', 'more', 'size', 'add', 'color-number'],
        'think': ['shadow', 'different', 'next', 'complete', 'letter', 'differences'],
    },
}

# The eight crayons in the box on PDF page 3, as the page is read: the top row from the right, then the second.
CRAYONS = [
    ('red', 'أَحْمَرُ'), ('orange', 'بُرْتُقَالِيٌّ'), ('yellow', 'أَصْفَرُ'), ('green', 'أَخْضَرُ'),
    ('blue', 'أَزْرَقُ'), ('purple', 'بَنَفْسَجِيٌّ'), ('brown', 'بُنِّيٌّ'), ('black', 'أَسْوَدُ'),
]

# What each picture shows. The key is the first twelve hex digits of the MD5 of the picture's size, colors and
# transparency (digest() below); a picture the books hold at several sizes may be listed under each. Shadows are
# not listed: they are named after the picture whose outline they share.
NAMES = {
    'afb296a64512': 'apple-brown',
    '93ae955392a8': 'apple-green',
    '3d6adc0be605': 'apple-red', '9e93526a0456': 'apple-red', 'a0d5f83cebd3': 'apple-red',
    '56774d3e8c8a': 'ball',
    '19a449e90dd1': 'balloon-green', 'df50bfdbb2f3': 'balloon-green', 'ff19901a9019': 'balloon-green',
    'a6d52c3c1d91': 'balloon-purple',
    '3b330f806e29': 'balloon-red', '480a598509cf': 'balloon-red', 'fc86fe30aa09': 'balloon-red',
    '1147330b812d': 'banana',
    '4b2ce19bfa3d': 'bicycle',
    '5653aa40dbb1': 'boat',
    '3975b24e7967': 'bus',
    '390f79bd2cdc': 'car-blue',
    '03d428e6c1f3': 'car-purple',
    '2669b6723bde': 'car-red', '3656c6f7b793': 'car-red', 'b1665a77771f': 'car-red',
    '4398ee41caae': 'cloud',
    '8fe91445c520': 'cup-blue',
    '3bc98a46301e': 'cup-pink',
    '0acd7ecb0d6a': 'cupcake-blue',
    '6580aff52d18': 'cupcake-green',
    '71a6e3ee3609': 'cupcake-pink', '7fb8159501e1': 'cupcake-pink', 'ea3c3992899c': 'cupcake-pink',
    'e9e8c1793d53': 'flower',
    '15fa0cb5f68c': 'gift',
    'c42e3b4c7076': 'grapes',
    '9ac71b7cb533': 'house',
    'feea900b6a56': 'ice-cream',
    'eded17787f0f': 'kite',
    '2c73fae3b08e': 'lantern',
    'd126cb6c85c4': 'moon',
    '8fa01432d125': 'mosque',
    'ed936929d12f': 'mushaf',
    'ce43e1b55318': 'orange',
    '977260679439': 'pear',
    '90718f960808': 'plane',
    '6270b2936bc6': 'pot',
    '81315a7d6227': 'prayer-rug',
    'ca65db416b11': 'star',
    '716866fe4757': 'strawberry',
    '9e5e22a283ad': 'suitcase',
    '0e94d5845e0c': 'sun',
    '35c6554d4e12': 'teapot-blue', '5c9902ab4dda': 'teapot-blue', 'a48be6abaa60': 'teapot-blue',
    '3eb5625fd941': 'teapot-green',
    '31051625e661': 'teapot-pink',
    '24144fa41744': 'tree',
    'ce2b617f7588': 'umbrella-blue',
    '9e2698e2bde8': 'umbrella-green',
    'ba6581bec078': 'umbrella-purple', 'd3f93b58dcf4': 'umbrella-purple',
}
TINTS = ('red', 'blue', 'green', 'purple', 'pink', 'brown')  # a name's last word, when it is only the coloring

# What kind of thing a picture is: the meaning the game "different" turns on, which no page carries. In every row
# of that game three pictures must be one kind and the fourth another.
KINDS = {
    'apple-red': 'fruit', 'banana': 'fruit', 'orange': 'fruit', 'strawberry': 'fruit', 'pear': 'fruit', 'grapes': 'fruit',
    'car-red': 'vehicle', 'bus': 'vehicle', 'plane': 'vehicle', 'bicycle': 'vehicle', 'boat': 'vehicle',
    'sun': 'sky', 'cloud': 'sky', 'star': 'sky', 'moon': 'sky',
    'cup-blue': 'kitchen', 'teapot-blue': 'kitchen', 'pot': 'kitchen',
    'kite': 'toy', 'balloon-red': 'toy', 'ball': 'toy', 'gift': 'toy',
    'mosque': 'masjid', 'prayer-rug': 'masjid', 'mushaf': 'masjid', 'lantern': 'masjid',
    'flower': 'plant', 'tree': 'plant',
    'cupcake-pink': 'sweet', 'umbrella-purple': 'rain', 'suitcase': 'travel',
}

# What the line drawings show, by book and printed page (and row, for the half drawings): an English word and the
# Arabic name. The names are drafts for the parents. All the dot drawings end where they began.
DRAWN = {
    ('dots', 'go', 34): ('star', 'نَجْمَة'),
    ('dots', 'go', 64): ('house', 'بَيْت'),
    ('dots', 'back', 13): ('boat', 'قَارِب'),
    ('dots', 'back', 39): ('tree', 'شَجَرَة'),
    ('dots', 'back', 69): ('lantern', 'فَانُوس'),
    ('color-number', 'back', 25): ('house', 'بَيْت'),
    ('color-number', 'back', 64): ('boat', 'قَارِب'),
    ('complete', 'back', 27, 1): ('house', 'بَيْت'),
    ('complete', 'back', 27, 2): ('heart', 'قَلْب'),
    ('complete', 'back', 59, 1): ('tree', 'شَجَرَة'),
    ('complete', 'back', 59, 2): ('mosque', 'مَسْجِد'),
}

# How the pages are drawn: the colors that tell one kind of mark from another.
HUBS = {'#2e9d4a': 'numbers', '#8e24aa': 'think'}  # the heading's pill, on the index and on every page
INK = '#1d2433'  # outlines, dots, digits
START = '#1b7f3b'  # the first dot of a dot drawing
RING = '#9aa5b1'  # the circle around a number to choose
FRAME = '#b0bec5'  # a frame: the boxes of "more", the keys
RULE = '#cfd8dc'  # the line between two rows; the pale circles of "next" and "letter"
DASH = '#90a4ae'  # the dashed answer box; the dotted half of a drawing
GAP = '#fff8e1'  # the cell of the missing number
CRAYON = '#333333'  # the outline of a crayon
SCENE = '#fafcff'  # the background of a scene of "differences"
GRASS = '#eef6e8'
LETTER = '#f3e5f5'  # the box of the letter to find
AXIS = '#e0e6ea'  # the mirror line
WHITE = '#ffffff'
FOOT = 0x666666  # the page number
HEAD = 108  # everything above this is the heading and the instruction

DIGITS = '٠١٢٣٤٥٦٧٨٩'
OUTLINES = {('l10',): 'star', ('c64', 'l3', 'c1'): 'balloon', ('c4',): 'heart', ('c64',): 'circle'}
SHAPES = {'c64': 'circle', 'l3': 'triangle', 'l1c4l1c4l1c4l1c4': 'square', 'l10': 'star'}

SIDE = 320  # the longer side of a saved picture, in pixels
GRID = 24  # pictures are compared on a grid of this many cells each way
# Two pictures are one drawing when their outlines differ by less than SAME_SHAPE (of 255), two drawings above
# OTHER_SHAPE; with one outline they are one picture when their colors differ by less than SAME_COLOR, two colorings
# above OTHER_COLOR. Between the two marks the script stops. In these books one picture drawn at two sizes differs
# from itself by 3 in outline and 5 in color (the green balloon by 17: its green is a shade apart from one book to
# the other, which no eye sees); the nearest two drawings differ by 22, the nearest two colorings by 60.
SAME_SHAPE, OTHER_SHAPE = 6.0, 15.0
SAME_COLOR, OTHER_COLOR = 25.0, 45.0


ASKED = set()  # the entries of DRAWN and KINDS that a page asked for: at the end none may be left over


class Problem(Exception):
    pass


def need(ok, message):
    if not ok:
        raise Problem(message)


# Small geometry. A box is (x0, y0, x1, y1) in points, y down from the top of the page.

def r4(v):
    v = round(v, 4)
    return 0.0 if v == 0 else v


def num(v):
    text = ('%.4f' % v).rstrip('0').rstrip('.')
    return '0' if text in ('-0', '') else text


def union(boxes):
    boxes = list(boxes)
    return (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))


def center(box):
    return ((box[0] + box[2]) / 2, (box[1] + box[3]) / 2)


def inside(point, box):
    return box[0] <= point[0] <= box[2] and box[1] <= point[1] <= box[3]


def place(box, frame):
    """A box as [x, y, w, h] in a frame that is 1 wide."""
    w = frame[2] - frame[0]
    return [r4((box[0] - frame[0]) / w), r4((box[1] - frame[1]) / w), r4((box[2] - box[0]) / w), r4((box[3] - box[1]) / w)]


def point(p, frame):
    w = frame[2] - frame[0]
    return [r4((p[0] - frame[0]) / w), r4((p[1] - frame[1]) / w)]


def unit(frame):
    return {'w': 1, 'h': r4((frame[3] - frame[1]) / (frame[2] - frame[0]))}


def from_right(things):
    """Along a row, as Arabic is read."""
    return sorted(things, key=lambda t: -t.cx)


def lines_of(things):
    """Things in lines, the top line first, each line from the right."""
    things = sorted(things, key=lambda t: t.cy)
    lines = []
    for thing in things:
        if lines and thing.cy - lines[-1][-1].cy < min(thing.h, lines[-1][-1].h) / 2:
            lines[-1].append(thing)
        else:
            lines.append([thing])
    return [from_right(line) for line in lines]


def one_of(choices, value, what):
    need(len(set(choices)) == len(choices), 'the choices %s repeat' % choices)
    need(choices.count(value) == 1, '%s %s is not among the choices %s' % (what, value, choices))
    return choices.index(value)


# Paths. A drawing's items become pieces, each a run of lines and curves joined end to end.

def pieces_of(items):
    pieces, last = [], None
    for item in items:
        if item[0] == 'l':
            steps = [('l', (item[1].x, item[1].y), (item[2].x, item[2].y))]
        elif item[0] == 'c':
            steps = [('c',) + tuple((p.x, p.y) for p in item[1:5])]
        elif item[0] in ('re', 'qu'):
            if item[0] == 're':
                r = item[1]
                corners = [(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1)]
            else:
                q = item[1]
                corners = [(q.ul.x, q.ul.y), (q.ur.x, q.ur.y), (q.lr.x, q.lr.y), (q.ll.x, q.ll.y)]
            pieces.append([('l', corners[i], corners[(i + 1) % 4]) for i in range(4)])
            last = None
            continue
        else:
            raise Problem('a path item of an unknown kind: %r' % (item[0],))
        for step in steps:
            if last is None or abs(step[1][0] - last[0]) + abs(step[1][1] - last[1]) > 0.02:
                pieces.append([])
            pieces[-1].append(step)
            last = step[-1]
    return pieces


def ends_meet(piece):
    a, b = piece[0][1], piece[-1][-1]
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) < 0.02


def bezier(step, t):
    p0, p1, p2, p3 = step[1:]
    s = 1 - t
    return (s * s * s * p0[0] + 3 * s * s * t * p1[0] + 3 * s * t * t * p2[0] + t * t * t * p3[0],
            s * s * s * p0[1] + 3 * s * s * t * p1[1] + 3 * s * t * t * p2[1] + t * t * t * p3[1])


def flat(piece, steps=16):
    """A piece as a list of points: its corners, and its curves in short straight steps."""
    points = [piece[0][1]]
    for step in piece:
        if step[0] == 'l':
            points.append(step[2])
        else:
            points.extend(bezier(step, k / steps) for k in range(1, steps + 1))
    return points


def oval_of(piece):
    """(cx, cy, rx, ry) when a piece is a whole circle or ellipse drawn as many small curves."""
    if len(piece) < 8 or any(step[0] != 'c' for step in piece) or not ends_meet(piece):
        return None
    points = [step[1] for step in piece] + [bezier(step, 0.5) for step in piece]
    x0, x1 = min(p[0] for p in points), max(p[0] for p in points)
    y0, y1 = min(p[1] for p in points), max(p[1] for p in points)
    cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
    if rx < 0.5 or ry < 0.5:
        return None
    for p in points:
        if abs(((p[0] - cx) / rx) ** 2 + ((p[1] - cy) / ry) ** 2 - 1) > 0.02:
            return None
    return cx, cy, rx, ry


def path(pieces, frame, close):
    """SVG path data for pieces, in a frame that is 1 wide."""
    w = frame[2] - frame[0]

    def xy(p):
        return '%s %s' % (num((p[0] - frame[0]) / w), num((p[1] - frame[1]) / w))

    out = []
    for piece in pieces:
        oval = oval_of(piece)
        if oval:
            cx, cy, rx, ry = oval
            radii = '%s %s' % (num(rx / w), num(ry / w))
            left, right = xy((cx - rx, cy)), xy((cx + rx, cy))
            out.append('M%s A%s 0 1 0 %s A%s 0 1 0 %s Z' % (left, radii, right, radii, left))
            continue
        steps = list(piece)
        shut = close or ends_meet(piece)
        if shut and ends_meet(piece) and steps[-1][0] == 'l' and len(steps) > 1:
            steps = steps[:-1]  # the last line home is what Z draws
        out.append('M' + xy(piece[0][1]))
        for step in steps:
            if step[0] == 'l':
                out.append('L' + xy(step[2]))
            else:
                out.append('C%s %s %s' % (xy(step[2]), xy(step[3]), xy(step[4])))
        if shut:
            out.append('Z')
    return ' '.join(out)


def holds(pieces, p):
    """Is the point inside the closed pieces (even-odd)?"""
    inside_ = False
    for piece in pieces:
        pts = flat(piece)
        for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
            if (y0 > p[1]) != (y1 > p[1]) and p[0] < x0 + (p[1] - y0) * (x1 - x0) / (y1 - y0):
                inside_ = not inside_
    return inside_


def far_from(p, line):
    """The distance from a point to a line of straight steps."""
    best = None
    for (x0, y0), (x1, y1) in zip(line, line[1:]):
        dx, dy = x1 - x0, y1 - y0
        t = 0 if dx == dy == 0 else max(0, min(1, ((p[0] - x0) * dx + (p[1] - y0) * dy) / (dx * dx + dy * dy)))
        d = ((p[0] - x0 - t * dx) ** 2 + (p[1] - y0 - t * dy) ** 2) ** 0.5
        best = d if best is None else min(best, d)
    return best


# What a page holds: drawings, characters, pictures.

def hexof(color):
    return None if color is None else '#%02x%02x%02x' % tuple(int(round(v * 255)) for v in color)


class Shape:
    """One vector drawing of a page."""

    def __init__(self, d):
        self.kind = d['type']  # 'f' filled, 's' stroked, 'fs' both
        self.fill = hexof(d.get('fill')) if 'f' in self.kind else None
        self.stroke = hexof(d.get('color')) if 's' in self.kind else None
        self.width = (d.get('width') or 0) if 's' in self.kind else 0
        r = d['rect']
        self.box = (r.x0, r.y0, r.x1, r.y1)
        self.items = d['items']
        runs = []
        for item in self.items:
            if runs and runs[-1][0] == item[0]:
                runs[-1][1] += 1
            else:
                runs.append([item[0], 1])
        self.sig = ''.join('%s%d' % (k, n) for k, n in runs)  # 'l10': ten lines; 'c64': sixty-four curves

    x0 = property(lambda self: self.box[0])
    y0 = property(lambda self: self.box[1])
    x1 = property(lambda self: self.box[2])
    y1 = property(lambda self: self.box[3])
    w = property(lambda self: self.box[2] - self.box[0])
    h = property(lambda self: self.box[3] - self.box[1])
    cx = property(lambda self: (self.box[0] + self.box[2]) / 2)
    cy = property(lambda self: (self.box[1] + self.box[3]) / 2)

    def pieces(self):
        return pieces_of(self.items)


class Char:
    """One glyph a page draws: a digit, a sign, a letter or a piece of a letter."""

    def __init__(self, c, gid, seq, origin, box, size, color):
        self.c, self.gid, self.seq = c, gid, seq
        self.box = tuple(box)
        self.ox, self.oy = origin
        self.size = size
        self.color = color
        self.cx = (self.box[0] + self.box[2]) / 2
        self.cy = self.oy - 0.3 * self.size  # about the middle of a digit or a letter, above its baseline
        self.h = self.size

    at = property(lambda self: (self.cx, self.cy))


def chars_of(page):
    """Every glyph of a page, as it is drawn. (The page's text, read as text, loses a letter now and then; the
    glyphs are all there, each with its place.)"""
    out = []
    for span in page.get_texttrace():
        color = sum(int(round(v * 255)) << shift for v, shift in zip(span['color'], (16, 8, 0)))
        for code, gid, origin, box in span['chars']:
            c = chr(code) if code > 0 else '\ufffd'
            if not c.isspace():
                out.append(Char(c, gid, span['seqno'], origin, box, span['size'], color))
    return out


SPAN = re.compile(rb'/Span\s*<<\s*/ActualText\s*<([0-9A-Fa-f\s]*)>\s*>>\s*BDC(.*?)EMC', re.S)
SHOWN = re.compile(rb'<([0-9A-Fa-f\s]*)>')


def spelled(page):
    """What the page says its glyphs spell, where a letter is drawn in pieces (a bowl and its dot, a letter and its
    vowel mark): [(text, (glyph, glyph, ...))] in the order drawn. The books' maker wrote the text beside each such
    run of glyphs, as /ActualText in the page's own drawing instructions."""
    out = []
    for found in SPAN.finditer(page.read_contents()):
        text = bytes.fromhex(b''.join(found.group(1).split()).decode('ascii'))
        text = text.decode('utf-16') if text[:2] in (b'\xfe\xff', b'\xff\xfe') else text.decode('latin-1')
        glyphs = []
        for shown in SHOWN.finditer(found.group(2)):
            digits = b''.join(shown.group(1).split()).decode('ascii')
            need(len(digits) % 4 == 0, 'glyphs written in an unexpected way')
            glyphs += [int(digits[i:i + 4], 16) for i in range(0, len(digits), 4)]
        out.append((text, tuple(glyphs)))
    return out


def number(chars):
    """The number a few digit characters write. The page keeps them in no reliable order, so they are read by place."""
    need(chars and all(c.c in DIGITS for c in chars), 'not a number: %r' % ''.join(c.c for c in chars))
    value = 0
    for c in sorted(chars, key=lambda c: c.box[0]):
        value = value * 10 + DIGITS.index(c.c)
    return value


def digest(width, height, rgb, alpha):
    return hashlib.md5(b'%d %d ' % (width, height) + rgb + alpha).hexdigest()[:12]


class Raw:
    """One embedded picture: where it is in a book, what part of it is visible, and what it looks like in small."""

    def __init__(self, key, book, xref, smask, width, height):
        self.key, self.book, self.xref, self.smask = key, book, xref, smask
        self.width, self.height = width, height
        self.trim = None  # the visible part, in pixels
        self.small = None  # GRID x GRID pixels of red, green, blue (times alpha) and alpha
        self.name = None
        self.of = None  # for a shadow: its picture's name
        self.used = []

    aspect = property(lambda self: (self.trim[2] - self.trim[0]) / (self.trim[3] - self.trim[1]))


def read_picture(doc, xref, smask):
    """A picture of a book: (width, height, its colors, its transparency, both as one pixmap)."""
    base = pymupdf.Pixmap(doc, xref)
    if base.alpha or base.n != 3:
        base = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.Pixmap(base, 0) if base.alpha else base)
    w, h = base.width, base.height
    need(base.stride == w * 3, 'picture %d: unexpected row length' % xref)
    if smask:
        mask = pymupdf.Pixmap(doc, smask)
        need(mask.n == 1 and mask.width == w and mask.height == h and mask.stride == w, 'picture %d: its mask does not fit it' % xref)
        both, alpha = pymupdf.Pixmap(base, mask), mask.samples
    else:
        both, alpha = pymupdf.Pixmap(base, 1), bytes([255]) * (w * h)
    need(both.n == 4 and both.stride == w * 4, 'picture %d: unexpected pixels' % xref)
    return w, h, base.samples, alpha, both  # in `both`, as MuPDF keeps pixels, the colors are multiplied by alpha


def visible(w, h, alpha):
    """The box of the pixels that are not (nearly) clear."""
    rows = [y for y in range(h) if max(alpha[y * w:(y + 1) * w]) > 8]
    cols = [x for x in range(w) if max(alpha[x::w]) > 8]
    need(rows and cols, 'a picture with nothing in it')
    return (cols[0], rows[0], cols[-1] + 1, rows[-1] + 1)


def cut(pixmap, trim):
    """The visible part of a picture, as a pixmap of its own."""
    w, s = pixmap.width, pixmap.samples
    x0, y0, x1, y1 = trim
    rows = b''.join(s[(y * w + x0) * 4:(y * w + x1) * 4] for y in range(y0, y1))
    return pymupdf.Pixmap(pymupdf.csRGB, x1 - x0, y1 - y0, rows, True)


def small_of(pixmap, trim):
    """The visible part of a picture on a grid of GRID by GRID cells, each cell the true average of what it covers:
    red, green, blue (times alpha) and alpha. This is what pictures are compared by."""
    part = cut(pixmap, trim)
    while min(part.width, part.height) >= 4 * GRID:
        part.shrink(1)  # halves it, each new pixel the average of four
    w, h, s = part.width, part.height, part.samples

    def spans(size):
        out = []
        for g in range(GRID):
            a, b = g * size / GRID, (g + 1) * size / GRID
            out.append([(j, (min(b, j + 1) - max(a, j)) / (b - a)) for j in range(int(a), min(size, int(b) + 1)) if min(b, j + 1) > max(a, j)])
        return out

    cols, rows = spans(w), spans(h)
    out = bytearray(GRID * GRID * 4)
    for gy, ys in enumerate(rows):
        for gx, xs in enumerate(cols):
            sums = [0.0, 0.0, 0.0, 0.0]
            for y, wy in ys:
                for x, wx in xs:
                    i, f = (y * w + x) * 4, wy * wx
                    sums[0] += s[i] * f
                    sums[1] += s[i + 1] * f
                    sums[2] += s[i + 2] * f
                    sums[3] += s[i + 3] * f
            o = (gy * GRID + gx) * 4
            out[o:o + 4] = bytes(min(255, int(v + 0.5)) for v in sums)
    return bytes(out)


def scaled(pixmap, trim, tw, th):
    """The visible part of a picture, tw by th pixels (colors still multiplied by alpha)."""
    part = cut(pixmap, trim)
    while part.width >= 2 * tw and part.height >= 2 * th:
        part.shrink(1)
    doc = pymupdf.open()
    page = doc.new_page(width=tw, height=th)
    page.insert_image(page.rect, pixmap=part, keep_proportion=False)
    out = page.get_pixmap(alpha=True)
    doc.close()
    need((out.width, out.height, out.n) == (tw, th, 4), 'a picture came out at the wrong size')
    return out


def apart(a, b):
    """How far two pictures are: (in outline, in coloring), each from 0 (the same) to 255."""
    n = GRID * GRID
    shape = sum(abs(a[i] - b[i]) for i in range(3, n * 4, 4)) / n
    total = cells = 0
    for i in range(0, n * 4, 4):
        ka, kb = a[i + 3], b[i + 3]
        if ka >= 128 and kb >= 128:  # where both are mostly solid: their true colors, alpha divided out
            total += max(abs(a[i + k] * 255 // ka - b[i + k] * 255 // kb) for k in range(3))
            cells += 1
    return shape, total / cells if cells else 255.0


def one_color(small):
    """Is a picture one flat color wherever it is solid (a shadow)?"""
    solid = [i for i in range(0, GRID * GRID * 4, 4) if small[i + 3] >= 250]
    need(solid, 'a picture with no solid part')
    return all(max(small[i + k] for i in solid) - min(small[i + k] for i in solid) <= 8 for k in range(3))


class Library:
    """Every picture of the pages read: told apart, grouped when they are one picture, and named."""

    def __init__(self, docs):
        self.docs = docs
        self.by_xref = {}
        self.raws = {}

    def raw(self, book, xref, smask):
        if (book, xref) not in self.by_xref:
            w, h, rgb, alpha, both = read_picture(self.docs[book], xref, smask)
            key = digest(w, h, rgb, alpha)
            if key not in self.raws:
                raw = Raw(key, book, xref, smask, w, h)
                raw.trim = visible(w, h, alpha)
                raw.small = small_of(both, raw.trim)
                self.raws[key] = raw
            self.by_xref[(book, xref)] = self.raws[key]
        return self.by_xref[(book, xref)]

    def settle(self, shadow_sheets):
        """Group the pictures that are one picture, name the groups, and find each shadow's picture."""
        raws = list(self.raws.values())
        leader = {r.key: r.key for r in raws}

        def find(k):
            while leader[k] != k:
                k = leader[k]
            return k

        self.spread = {'same': 0.0, 'other': 255.0, 'shape': 255.0}
        for i, a in enumerate(raws):
            for b in raws[i + 1:]:
                if not 0.9 < a.aspect / b.aspect < 1.1:
                    continue  # one is plainly wider than the other: two drawings
                shape, color = apart(a.small, b.small)
                need(not SAME_SHAPE < shape < OTHER_SHAPE,
                     'pictures %s and %s: cannot tell whether they have one outline (%.1f)' % (a.key, b.key, shape))
                if shape >= OTHER_SHAPE:
                    self.spread['shape'] = min(self.spread['shape'], shape)
                    continue
                need(not SAME_COLOR < color < OTHER_COLOR,
                     'pictures %s and %s: cannot tell whether they are one picture (%.1f)' % (a.key, b.key, color))
                if color <= SAME_COLOR:
                    self.spread['same'] = max(self.spread['same'], color)
                    leader[find(a.key)] = find(b.key)
                else:
                    self.spread['other'] = min(self.spread['other'], color)
        groups = {}
        for r in raws:
            groups.setdefault(find(r.key), []).append(r)
        # the shadows: on a shadow page the left column, each with the outline of one picture of the right column
        shadows = {}
        for sheet in shadow_sheets:
            left = [s for s in sheet.spots if s.cx < sheet.middle]
            right = [s for s in sheet.spots if s.cx >= sheet.middle]
            with sheet:
                need(len(left) == 4 and len(right) == 4, 'expected four pictures and four shadows')
                for shadow in left:
                    need(one_color(shadow.raw.small), 'a shadow that is not one flat color')
                    gaps = sorted((apart(shadow.raw.small, p.raw.small)[0], n) for n, p in enumerate(right))
                    need(gaps[0][0] < 1 and gaps[1][0] > OTHER_SHAPE, 'a shadow fits no picture, or more than one')
                    need(not one_color(right[gaps[0][1]].raw.small), 'a shadow of a shadow')
                    shadows[find(shadow.raw.key)] = find(right[gaps[0][1]].raw.key)
        names = {}
        for lead, members in groups.items():
            if lead in shadows:
                need(not any(m.key in NAMES for m in members), 'the shadow %s is in NAMES' % lead)
                continue
            found = sorted({NAMES[m.key] for m in members if m.key in NAMES})
            where = ', '.join(sorted({u for m in members for u in m.used}))
            need(found, 'no name in NAMES for the picture %s (on %s)' % (' = '.join(m.key for m in members), where))
            need(len(found) == 1, 'the pictures %s are one picture but NAMES calls them %s' % (' = '.join(m.key for m in members), found))
            names[lead] = found[0]
        need(len(set(names.values())) == len(names), 'NAMES gives one name to two different pictures: %s' %
             sorted(n for n in names.values() if list(names.values()).count(n) > 1))
        unused = sorted(set(NAMES) - set(self.raws))
        need(not unused, 'NAMES lists pictures that are on no page: %s' % unused)
        of = {}
        for lead, owner in shadows.items():
            need(owner in names, 'a shadow of something that is not a picture')
            words = names[owner].split('-')
            names[lead] = '-'.join(words[:-1] if words[-1] in TINTS else words) + '-shadow'
            of[names[lead]] = names[owner]
        need(len(set(names.values())) == len(names), 'two shadows would get one name')
        self.files = {}
        for lead, members in groups.items():
            best = max(members, key=lambda m: (m.trim[2] - m.trim[0]) * (m.trim[3] - m.trim[1]))
            for m in members:
                m.name, m.of = names[lead], of.get(names[lead])
            self.files[names[lead]] = best

    def save(self, folder, names):
        """Write the named pictures as PNG files; return their sizes."""
        os.makedirs(folder, exist_ok=True)
        for old in os.listdir(folder):
            if old.endswith('.png') and old[:-4] not in names:
                os.remove(os.path.join(folder, old))
        table = {}
        for name in sorted(names):
            raw = self.files[name]
            both = read_picture(self.docs[raw.book], raw.xref, raw.smask)[4]
            tw, th = raw.trim[2] - raw.trim[0], raw.trim[3] - raw.trim[1]
            scale = min(1, SIDE / max(tw, th))
            ow, oh = max(1, round(tw * scale)), max(1, round(th * scale))
            buf = bytearray(scaled(both, raw.trim, ow, oh).samples)
            for i in range(3, len(buf), 4):  # a PNG keeps colors as they are, not multiplied by alpha
                a = buf[i]
                if 0 < a < 255:
                    buf[i - 3] = min(255, (buf[i - 3] * 255 + a // 2) // a)
                    buf[i - 2] = min(255, (buf[i - 2] * 255 + a // 2) // a)
                    buf[i - 1] = min(255, (buf[i - 1] * 255 + a // 2) // a)
            pymupdf.Pixmap(pymupdf.csRGB, ow, oh, bytes(buf), True).save(os.path.join(folder, name + '.png'))
            table[name] = {'w': ow, 'h': oh}
            if raw.of:
                table[name]['of'] = raw.of
        for name, entry in table.items():
            if 'of' in entry:
                owner = table[entry['of']]
                need(abs(entry['w'] - owner['w']) <= 1 and abs(entry['h'] - owner['h']) <= 1, '%s is not the size of its picture' % name)
        return table


class Spot:
    """A picture where a page draws it (the box of its visible part)."""

    def __init__(self, raw, bbox):
        self.raw = raw
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        t = raw.trim
        self.box = (bbox[0] + w * t[0] / raw.width, bbox[1] + h * t[1] / raw.height,
                    bbox[0] + w * t[2] / raw.width, bbox[1] + h * t[3] / raw.height)

    name = property(lambda self: self.raw.name)
    w = property(lambda self: self.box[2] - self.box[0])
    h = property(lambda self: self.box[3] - self.box[1])
    cx = property(lambda self: (self.box[0] + self.box[2]) / 2)
    cy = property(lambda self: (self.box[1] + self.box[3]) / 2)
    at = property(lambda self: (self.cx, self.cy))


class Sheet:
    """One page of a book."""

    def __init__(self, book, doc, pdf, library):
        self.book, self.pdf = book, pdf
        page = doc[pdf - 1]
        self.middle = page.rect.width / 2
        with self:
            shapes = [Shape(d) for d in page.get_drawings()]
            chars = chars_of(page)
            self.spelled = spelled(page)
            pills = [s for s in shapes if s.kind == 'f' and s.fill in HUBS and s.y1 < HEAD and s.w > 30]
            need(len(pills) == 1, 'no heading, or more than one')
            self.hub = HUBS[pills[0].fill]
            foot = [c for c in chars if c.color == FOOT and c.size < 14 and c.oy > 740]
            self.page = number(foot)
            need(self.page == pdf - 2, 'the page says it is page %d' % self.page)
            self.head = [c for c in chars if c.oy < HEAD]
            self.chars = [c for c in chars if c.oy >= HEAD and c not in foot]
            body = [s for s in shapes if s.y1 >= HEAD]
            rules = [s for s in body if s.kind == 'f' and s.fill == RULE and s.h < 2 and s.w > 400]
            self.rules = sorted(s.cy for s in rules)
            self.shapes = [s for s in body if s not in rules]
            smasks = {im[0]: im[1] for im in page.get_images(full=True)}
            self.spots = []
            for info in page.get_image_info(xrefs=True):
                a, b, c, d = info['transform'][:4]
                need(a > 0 and d > 0 and abs(b) < 1e-6 and abs(c) < 1e-6, 'a picture that is turned or mirrored')
                raw = library.raw(book, info['xref'], smasks.get(info['xref'], 0))
                raw.used.append('%s p.%d' % (book, self.page))
                self.spots.append(Spot(raw, info['bbox']))
            need(all(HEAD <= s.cy < 750 for s in self.spots), 'a picture in the heading or at the foot of the page')
            self.taken = set()

    def __enter__(self):
        return self

    def __exit__(self, kind, error, trace):
        if kind is Problem and not getattr(error, 'placed', False):
            error.placed = True
            error.args = ('the %s book, PDF page %d (printed page %d): %s' % (self.book, self.pdf, self.pdf - 2, error.args[0]),)
        return False

    def bands(self, count):
        """The rows of the page, between its rules: (top, bottom) from the top down."""
        need(len(self.rules) == count - 1, 'expected %d rows, found %d rules between rows' % (count, len(self.rules)))
        edges = [HEAD] + self.rules + [750]
        return list(zip(edges, edges[1:]))

    def within(self, things, band):
        return [t for t in things if band[0] <= t.cy < band[1]]

    def take(self, things):
        """Marks pictures and characters as read. When a page is done, nothing on it may be left unread."""
        self.taken.update(id(t) for t in things)
        return things

    def left_over(self):
        return [t for t in self.chars + self.spots if id(t) not in self.taken]

    def number_in(self, shape):
        return number(self.take([c for c in self.chars if inside(c.at, shape.box)]))

    def group(self, spots, frame=None):
        """A set of one picture repeated, laid out as on the page: (the group, its frame on the page)."""
        need(spots, 'a group with nothing in it')
        need(len({s.name for s in spots}) == 1, 'a group of different pictures: %s' % sorted({s.name for s in spots}))
        frame = frame or union(s.box for s in spots)
        ordered = [s for line in lines_of(self.take(spots)) for s in line]
        return {'picture': spots[0].name, 'count': len(spots), 'box': unit(frame), 'places': [place(s.box, frame) for s in ordered]}, frame

    def rings(self, band, count):
        """The numbers to choose from in a row, from the right."""
        rings = from_right(self.within([s for s in self.shapes if s.stroke == RING and s.kind == 'fs'], band))
        need(len(rings) == count, 'expected %d numbers in circles, found %d' % (count, len(rings)))
        return rings

    def drawn(self, kind, row=None):
        """What a line drawing of this page shows: (English word, Arabic name), from DRAWN."""
        key = (kind, self.book, self.page) + ((row,) if row else ())
        need(key in DRAWN, 'DRAWN does not say what the drawing %s shows' % (key,))
        ASKED.add(key)
        return DRAWN[key]

    def base(self, row=None):
        out = {'book': self.book, 'page': self.page}
        if row:
            out['row'] = row
        return out

    def where(self, row=None):
        return '%-4s p.%-2d%s' % (self.book, self.page, ' row %d' % row if row else '      ')


# The games. Each reader takes a page and gives its rounds, each with a line that says what it holds and its answer.

def read_count(sheet):
    out = []
    for row, band in enumerate(sheet.bands(3), 1):
        choices = [sheet.number_in(r) for r in sheet.rings(band, 3)]
        spots = sheet.within(sheet.spots, band)
        group, frame = sheet.group(spots)
        need(max(r.x1 for r in sheet.rings(band, 3)) < frame[0], 'the numbers are not left of the group')
        answer = one_of(choices, group['count'], 'the count')
        out.append((dict(sheet.base(row), group=group, choices=choices, answer=answer),
                    '%d x %s; choices %s; answer %d' % (group['count'], group['picture'], choices, choices[answer])))
    return out


def clusters_of(shapes):
    """Drawings that overlap across the row are one thing (a balloon, its knot and its string)."""
    out = []
    for shape in sorted(shapes, key=lambda s: s.x0):
        if out and shape.x0 < max(s.x1 for s in out[-1]):
            out[-1].append(shape)
        else:
            out.append([shape])
    return out


def outline_of(cluster):
    """A cluster of drawings as an outline in its own box: (name, entry for the outlines table)."""
    name = OUTLINES.get(tuple(s.sig for s in cluster))
    need(name, 'an outline of an unknown shape: %s' % [s.sig for s in cluster])
    frame = union(s.box for s in cluster)
    fill = ' '.join(path(s.pieces(), frame, True) for s in cluster if 'f' in s.kind)
    line = ' '.join(path(s.pieces(), frame, False) for s in cluster if s.kind == 's')
    stroke = max(s.width for s in cluster) / (frame[2] - frame[0])
    return name, {'box': unit(frame), 'fill': fill, 'line': line, 'stroke': r4(stroke)}, frame


def numbers_in(d):
    out, word = [], ''
    for ch in d + ' ':
        if ch.isdigit() or ch in '.-':
            word += ch
        elif word:
            out.append(float(word))
            word = ''
    return out


def same_outline(a, b):
    na, nb = numbers_in(a['fill'] + ' ' + a['line']), numbers_in(b['fill'] + ' ' + b['line'])
    return len(na) == len(nb) and all(abs(x - y) < 0.01 for x, y in zip(na, nb)) and abs(a['box']['h'] - b['box']['h']) < 0.01


def read_color_count(sheet, outlines):
    out = []
    for row, band in enumerate(sheet.bands(4), 1):
        ring = sheet.rings(band, 1)[0]
        count = sheet.number_in(ring)
        clusters = clusters_of(sheet.within([s for s in sheet.shapes if s.stroke == INK], band))
        need(clusters, 'no shapes to color')
        found = [outline_of(c) for c in clusters]
        need(len({f[0] for f in found}) == 1, 'a row of different shapes')
        name = found[0][0]
        for _, entry, _ in found:
            if name not in outlines:
                outlines[name] = entry
            need(same_outline(outlines[name], entry), 'the outline "%s" is not drawn the same everywhere' % name)
        frames = [f[2] for f in found]
        frame = union(frames)
        need(ring.x0 > frame[2], 'the number is not at the right of its shapes')
        need(1 <= count <= len(frames), 'cannot color %d of %d shapes' % (count, len(frames)))
        ordered = sorted(frames, key=lambda f: -f[0])
        group = {'outline': name, 'count': len(frames), 'box': unit(frame), 'places': [place(f, frame) for f in ordered]}
        out.append((dict(sheet.base(row), number=count, group=group), 'color %d of %d x %s' % (count, len(frames), name)))
    return out


def dots_of(sheet):
    return [s for s in sheet.shapes if s.kind == 'f' and s.fill in (INK, START) and s.sig == 'c32' and s.w < 20]


def read_match_number(sheet):
    need(not sheet.rules, 'rules between rows on a page to join')
    rings = sorted([s for s in sheet.shapes if s.stroke == RING and s.kind == 'fs'], key=lambda s: s.cy)
    dots = dots_of(sheet)
    need(len(rings) == 4 and len(dots) == 8, 'expected four numbers and eight dots, found %d and %d' % (len(rings), len(dots)))
    by_name = {}
    for spot in sheet.spots:
        by_name.setdefault(spot.name, []).append(spot)
    need(len(by_name) == 4, 'expected four groups of four different pictures, found %s' % sorted(by_name))
    groups = sorted((sheet.group(spots) for spots in by_name.values()), key=lambda g: center(g[1])[1])
    left = sorted([d for d in dots if d.cx < sheet.middle / 1.5], key=lambda d: d.cy)
    right = sorted([d for d in dots if d.cx >= sheet.middle / 1.5], key=lambda d: d.cy)
    need(len(left) == 4 and len(right) == 4, 'the dots are not in two columns of four')
    for (group, gframe), ring, a, b in zip(groups, rings, left, right):
        need(abs(center(gframe)[1] - b.cy) < 30 and abs(ring.cy - a.cy) < 30, 'a group or a number is not level with its dot')
        need(ring.x1 < a.x0 < b.x0 < gframe[0], 'expected, from the left: number, dot, dot, group')
    frame = union([g[1] for g in groups] + [r.box for r in rings] + [d.box for d in dots])
    numbers = [sheet.number_in(r) for r in rings]
    need(sorted(numbers) == sorted(g[0]['count'] for g in groups) and len(set(numbers)) == 4, 'the numbers %s do not fit the groups' % numbers)
    answer = [numbers.index(g[0]['count']) for g in groups]
    round_ = dict(sheet.base(), box=unit(frame),
                  groups=[dict(g, at=place(gf, frame), dot=point(center(d.box), frame)) for (g, gf), d in zip(groups, right)],
                  numbers=[{'n': n, 'at': place(r.box, frame), 'dot': point(center(d.box), frame)} for n, r, d in zip(numbers, rings, left)],
                  answer=answer, dotRadius=r4(dots[0].w / 2 / (frame[2] - frame[0])))
    note = '; '.join('%d x %s -> %d' % (g[0]['count'], g[0]['picture'], numbers[a]) for g, a in zip(groups, answer))
    return [(round_, 'numbers top to bottom %s; %s; answer %s' % (numbers, note, answer))]


def read_dots(sheet):
    dots = dots_of(sheet)
    digits = sorted([c for c in sheet.chars if c.c in DIGITS], key=lambda c: (round(c.oy), c.box[0]))
    need(len(sheet.take(digits)) == len(sheet.chars), 'something written that is not a number')
    labels = []
    for c in digits:
        if labels and abs(labels[-1][-1].oy - c.oy) < 0.5 and c.box[0] - labels[-1][-1].box[2] < 3:
            labels[-1].append(c)
        else:
            labels.append([c])
    need(len(labels) == len(dots) >= 3, '%d numbers for %d dots' % (len(labels), len(dots)))
    found = {}
    for label in labels:
        box = union(c.box for c in label)
        mid = ((box[0] + box[2]) / 2, label[0].cy)
        dot = min(dots, key=lambda d: (d.cx - mid[0]) ** 2 + (d.cy - mid[1]) ** 2)
        need(((dot.cx - mid[0]) ** 2 + (dot.cy - mid[1]) ** 2) ** 0.5 < 40, 'a number far from every dot')
        n = number(label)
        need(n not in found and all(dot is not f[0] for f in found.values()), 'two numbers at one dot, or one number twice')
        found[n] = (dot, mid, (box[0], mid[1] - 0.35 * label[0].size, box[2], mid[1] + 0.35 * label[0].size))
    need(sorted(found) == list(range(1, len(dots) + 1)), 'the dots are not numbered 1 to %d' % len(dots))
    need(found[1][0].fill == START and all(found[n][0].fill == INK for n in found if n > 1), 'the green dot is not dot 1')
    frame = union([f[0].box for f in found.values()] + [f[2] for f in found.values()])
    shape, name = sheet.drawn('dots')
    round_ = dict(sheet.base(), box=unit(frame), shape=shape, name=name, closed=True,
                  radius=r4(found[2][0].w / 2 / (frame[2] - frame[0])),
                  dots=[{'n': n, 'x': point(center(found[n][0].box), frame)[0], 'y': point(center(found[n][0].box), frame)[1],
                         'label': point(found[n][1], frame)} for n in sorted(found)])
    return [(round_, '%d dots, a %s' % (len(dots), shape))]


def read_more(sheet):
    need(not sheet.rules, 'rules between rows on a page of boxes')
    frames = [s for s in sheet.shapes if s.stroke == FRAME and s.kind == 's']
    need(len(frames) == 6, 'expected six boxes, found %d' % len(frames))
    out = []
    for row, line in enumerate(lines_of(frames), 1):
        need(len(line) == 2, 'expected two boxes in a row')
        groups = []
        for frame in line:
            spots = [s for s in sheet.spots if inside(s.at, frame.box)]
            need(all(inside((s.box[0], s.box[1]), frame.box) and inside((s.box[2], s.box[3]), frame.box) for s in spots), 'a picture sticks out of its box')
            groups.append(sheet.group(spots, frame.box)[0])
        need(groups[0]['picture'] == groups[1]['picture'], 'two boxes of different pictures')
        need(groups[0]['count'] != groups[1]['count'], 'two boxes that hold as many')
        answer = 0 if groups[0]['count'] > groups[1]['count'] else 1
        out.append((dict(sheet.base(row), groups=groups, answer=answer),
                    '%s: %d (right) or %d (left); answer the %s box' % (groups[0]['picture'], groups[0]['count'], groups[1]['count'], ('right', 'left')[answer])))
    return out


def read_size(sheet):
    letters = set(''.join(text for text, _ in sheet.spelled))  # only the heading and the instruction are written on such a page
    want = {(True, False): 'largest', (False, True): 'smallest'}.get(('ك' in letters, 'ص' in letters))
    need(want, 'cannot tell from the instruction whether the largest or the smallest is wanted')
    out = []
    for row, band in enumerate(sheet.bands(3), 1):
        spots = from_right(sheet.take(sheet.within(sheet.spots, band)))
        need(len(spots) == 3 and len({s.name for s in spots}) == 1, 'expected one picture three times')
        widths = [s.w for s in spots]
        need(all(abs(s.w / s.h / (spots[0].w / spots[0].h) - 1) < 0.03 for s in spots), 'the picture is stretched')
        ordered = sorted(widths)
        need(ordered[1] / ordered[0] > 1.2 and ordered[2] / ordered[1] > 1.2, 'two of the three are almost one size')
        answer = widths.index(ordered[2] if want == 'largest' else ordered[0])
        round_ = dict(sheet.base(row), picture=spots[0].name, sizes=[round(w / ordered[2], 3) for w in widths], want=want, answer=answer)
        if want == 'smallest':
            round_['prompt'] = SMALLEST
        out.append((round_, '%s at sizes %s; the %s; answer place %d' % (spots[0].name, round_['sizes'], want, answer)))
    return out


def read_missing(sheet):
    out = []
    for row, band in enumerate(sheet.bands(3), 1):
        cells = from_right(sheet.within([s for s in sheet.shapes if s.stroke == INK and s.kind == 'fs' and s.fill in (WHITE, GAP)], band))
        need(len(cells) >= 3, 'a run of fewer than three numbers')
        run = []
        for cell in cells:
            held = sheet.take([c for c in sheet.chars if inside(c.at, cell.box)])
            if cell.fill == GAP:
                need([c.c for c in held] == ['؟'], 'the gap does not hold a question mark')
                run.append(None)
            else:
                run.append(number(held))
        need(run.count(None) == 1, 'expected one gap')
        starts = {v - i for i, v in enumerate(run) if v is not None}
        need(len(starts) == 1, 'the run %s does not count up by one, read from the right' % run)
        missing = starts.pop() + run.index(None)
        choices = [sheet.number_in(r) for r in sheet.rings(band, 3)]
        answer = one_of(choices, missing, 'the missing number')
        out.append((dict(sheet.base(row), run=run, choices=choices, answer=answer),
                    'run %s; choices %s; answer %d' % (['?' if v is None else v for v in run], choices, missing)))
    return out


def key_of(sheet, colors):
    """The key at the top of a page: its frame, and its crayons from the right as (color name, crayon)."""
    frames = [s for s in sheet.shapes if s.stroke == FRAME and s.kind == 's']
    need(len(frames) == 1, 'expected one key')
    frame = frames[0]
    crayons = from_right([s for s in sheet.shapes if s.stroke == CRAYON and s.sig == 'l1c4l1c4l1c4l1c4' and inside(center(s.box), frame.box)])
    need(crayons, 'a key without crayons')
    for c in crayons:
        need(c.fill in colors, 'a crayon of a color the index does not show: %s' % c.fill)
    need(len({c.fill for c in crayons}) == len(crayons), 'two crayons of one color in a key')
    return frame, [(colors[c.fill], c) for c in crayons]


def read_shapes(sheet, colors, used):
    frame, crayons = key_of(sheet, colors)
    drawn = [s for s in sheet.shapes if s.stroke == INK and s.kind == 'fs']
    for s in drawn:
        need(s.sig in SHAPES, 'a shape of an unknown kind: %s' % s.sig)
    keys = from_right([s for s in drawn if inside(center(s.box), frame.box)])
    need(len(keys) == len(crayons), 'the key has %d shapes and %d crayons' % (len(keys), len(crayons)))
    key, color_of = [], {}
    for shape, (color, crayon) in zip(keys, crayons):
        need(abs(shape.cx - crayon.cx) < 30, 'a shape of the key is not above its crayon')
        need(SHAPES[shape.sig] not in color_of, 'a shape twice in the key')
        color_of[SHAPES[shape.sig]] = color
        used.add(color)
        key.append({'shape': SHAPES[shape.sig], 'color': color, 'box': unit(shape.box), 'd': path(shape.pieces(), shape.box, True)})
    rest = [s for s in drawn if s not in keys]
    need(all(s.y0 > frame.y1 for s in rest), 'a shape above the key')
    need(len(rest) % 4 == 0, 'expected rows of four shapes')
    rest.sort(key=lambda s: s.cy)
    lines = [rest[i:i + 4] for i in range(0, len(rest), 4)]
    for a, b in zip(lines, lines[1:]):
        need(max(s.cy for s in a) < min(s.cy for s in b), 'the shapes are not in clear rows')
    ordered = [s for line in lines for s in from_right(line)]
    box = union(s.box for s in ordered)
    shapes = []
    for s in ordered:
        need(SHAPES[s.sig] in color_of, 'a %s is not in the key' % SHAPES[s.sig])
        shapes.append({'shape': SHAPES[s.sig], 'color': color_of[SHAPES[s.sig]], 'at': place(s.box, box), 'd': path(s.pieces(), box, True)})
    widths = sorted(s.width for s in ordered)
    round_ = dict(sheet.base(), box=unit(box), stroke=r4(widths[len(widths) // 2] / (box[2] - box[0])), key=key, shapes=shapes)
    count = {}
    for s in shapes:
        count[s['shape']] = count.get(s['shape'], 0) + 1
    note = ', '.join('%s %s (%d)' % (k['shape'], k['color'], count.get(k['shape'], 0)) for k in key)
    return [(round_, 'key from the right: %s; %d shapes' % (note, len(shapes)))]


def read_add(sheet):
    out = []
    for row, band in enumerate(sheet.bands(3), 1):
        signs = {s: sheet.take(sheet.within([c for c in sheet.chars if c.c == s], band)) for s in '+='}
        need(len(signs['+']) == 1 and len(signs['=']) == 1, 'expected one + and one =')
        plus, equals = signs['+'][0].cx, signs['='][0].cx
        boxes = sheet.within([s for s in sheet.shapes if s.fill == DASH and s.kind == 'f'], band)
        need(boxes and all(b.x1 < equals for b in boxes), 'no empty box left of the =')
        spots = sheet.within(sheet.spots, band)
        need(all(s.box[0] > equals for s in spots) and equals < plus, 'a picture left of the =')
        first, second = [s for s in spots if s.cx > plus], [s for s in spots if s.cx < plus]
        need(all(s.box[0] > plus for s in first) and all(s.box[2] < plus for s in second), 'a picture across the +')
        (a, a_frame), (b, b_frame) = sheet.group(first), sheet.group(second)
        need(a['picture'] == b['picture'], 'adding different pictures')
        choices = [sheet.number_in(r) for r in sheet.rings(band, 3)]
        answer = one_of(choices, a['count'] + b['count'], 'the sum')
        frame = union([a_frame, b_frame])
        groups = [dict(a, at=place(a_frame, frame)), dict(b, at=place(b_frame, frame))]
        out.append((dict(sheet.base(row), box=unit(frame), groups=groups, choices=choices, answer=answer),
                    '%d + %d x %s; choices %s; answer %d' % (a['count'], b['count'], a['picture'], choices, choices[answer])))
    return out


def read_color_number(sheet, colors, used):
    frame, crayons = key_of(sheet, colors)
    digits = from_right(sheet.take([c for c in sheet.chars if inside(c.at, frame.box)]))
    need(len(digits) == len(crayons), 'the key has %d numbers and %d crayons' % (len(digits), len(crayons)))
    key, color_of = [], {}
    for digit, (color, crayon) in zip(digits, crayons):
        need(abs(digit.cx - crayon.cx) < 30, 'a number of the key is not above its crayon')
        n = number([digit])
        need(n not in color_of, 'a number twice in the key')
        color_of[n] = color
        key.append({'number': n, 'color': color})
    drawn = [s for s in sheet.shapes if s.y0 > frame.y1 and (s.stroke == INK or s.fill == WHITE)]
    need(len(drawn) == len([s for s in sheet.shapes if s.y0 > frame.y1]), 'a mark in the drawing that is neither ink nor paper')
    regions = [s for s in drawn if s.fill == WHITE]
    lines = [s for s in drawn if s.fill is None and not any(max(abs(a - b) for a, b in zip(s.box, r.box)) < 0.1 for r in regions)]
    box = union(s.box for s in drawn)
    labels = sheet.take([c for c in sheet.chars if not inside(c.at, frame.box)])
    numbered = {}
    for label in labels:
        over = [i for i, r in enumerate(regions) if holds(r.pieces(), label.at)]
        need(over, 'a number outside every region')
        need(over[-1] not in numbered, 'two numbers in one region')
        numbered[over[-1]] = label
    need(len(numbered) == len(regions), '%d regions but %d numbers' % (len(regions), len(labels)))
    out = []
    for i, r in enumerate(regions):
        n = number([numbered[i]])
        need(n in color_of, 'the number %d is not in the key' % n)
        used.add(color_of[n])
        out.append({'number': n, 'color': color_of[n], 'd': path(r.pieces(), box, True), 'label': point(numbered[i].at, box)})
    shape, name = sheet.drawn('color-number')
    widths = sorted(s.width for s in drawn if s.width)
    round_ = dict(sheet.base(), box=unit(box), shape=shape, name=name, stroke=r4(widths[0] / (box[2] - box[0])), key=key, regions=out,
                  lines=[{'d': path(s.pieces(), box, False), 'width': r4(s.width / (box[2] - box[0]))} for s in lines])
    note = ', '.join('%d %s' % (k['number'], k['color']) for k in key)
    return [(round_, 'a %s; key %s; regions in paint order %s' % (shape, note, [r['number'] for r in out]))]


def read_shadow(sheet):
    need(not sheet.rules, 'rules between rows on a page to join')
    dots = dots_of(sheet)
    left = sorted([d for d in dots if d.cx < sheet.middle], key=lambda d: d.cy)
    right = sorted([d for d in dots if d.cx >= sheet.middle], key=lambda d: d.cy)
    need(len(left) == 4 and len(right) == 4, 'the dots are not in two columns of four')
    shadows = sorted([s for s in sheet.take(sheet.spots) if s.cx < sheet.middle], key=lambda s: s.cy)
    pictures = sorted([s for s in sheet.spots if s.cx >= sheet.middle], key=lambda s: s.cy)
    need(len(shadows) == 4 and len(pictures) == 4, 'expected four pictures and four shadows')
    for s, d in zip(shadows, left):
        need(abs(s.cy - d.cy) < 30 and s.box[2] < d.x0 and s.raw.of, 'a shadow is not level with its dot, or is not a shadow')
    for p, d in zip(pictures, right):
        need(abs(p.cy - d.cy) < 30 and p.box[0] > d.x1 and not p.raw.of, 'a picture is not level with its dot, or is a shadow')
    owners = [s.raw.of for s in shadows]
    need(sorted(owners) == sorted(p.name for p in pictures) and len(set(owners)) == 4, 'the shadows %s do not fit the pictures' % owners)
    answer = [owners.index(p.name) for p in pictures]
    frame = union([s.box for s in sheet.spots] + [d.box for d in dots])
    round_ = dict(sheet.base(), box=unit(frame),
                  pictures=[{'picture': p.name, 'at': place(p.box, frame), 'dot': point(center(d.box), frame)} for p, d in zip(pictures, right)],
                  shadows=[{'picture': s.name, 'at': place(s.box, frame), 'dot': point(center(d.box), frame)} for s, d in zip(shadows, left)],
                  answer=answer, dotRadius=r4(dots[0].w / 2 / (frame[2] - frame[0])))
    return [(round_, 'pictures %s; shadows %s; answer %s' % ([p.name for p in pictures], [s.name for s in shadows], answer))]


def four_of(sheet, band):
    spots = from_right(sheet.take(sheet.within(sheet.spots, band)))
    need(len(spots) == 4, 'expected four pictures in a row, found %d' % len(spots))
    return spots


def read_different(sheet):
    out = []
    for row, band in enumerate(sheet.bands(3), 1):
        spots = four_of(sheet, band)
        need(len({s.name for s in spots}) == 4, 'the same picture twice in a row')
        for s in spots:
            need(s.name in KINDS, 'KINDS does not say what kind of thing "%s" is' % s.name)
            ASKED.add(s.name)
        kinds = [KINDS[s.name] for s in spots]
        odd = [i for i, k in enumerate(kinds) if kinds.count(k) == 1]
        need(len(odd) == 1 and len(set(kinds)) == 2, 'not exactly one picture that does not belong: %s' % list(zip([s.name for s in spots], kinds)))
        out.append((dict(sheet.base(row), pictures=[s.name for s in spots], answer=odd[0]),
                    '%s; answer %s (the others are %s)' % (' '.join(s.name for s in spots), spots[odd[0]].name, kinds[1 - odd[0] if odd[0] < 2 else 0])))
    return out


def read_similar(sheet):
    out = []
    for row, band in enumerate(sheet.bands(3), 1):
        spots = four_of(sheet, band)
        for s in spots[1:]:
            need(apart(spots[0].raw.small, s.raw.small)[0] < SAME_SHAPE, 'the four are not one drawing')
        names = [s.name for s in spots]
        pair = [i for i, n in enumerate(names) if names.count(n) == 2]
        need(len(pair) == 2 and len(set(names)) == 3, 'not exactly two pictures alike: %s' % names)
        out.append((dict(sheet.base(row), pictures=names, answer=pair), '%s; answer places %s (%s)' % (' '.join(names), pair, names[pair[0]])))
    return out


def read_next(sheet):
    out = []
    for row, band in enumerate(sheet.bands(3), 1):
        circles = from_right(sheet.within([s for s in sheet.shapes if s.stroke == RULE and s.kind == 's' and s.sig == 'c64'], band))
        need(len(circles) == 3, 'expected three choices')
        spots = sheet.take(sheet.within(sheet.spots, band))
        choices = []
        for circle in circles:
            held = [s for s in spots if inside(s.at, circle.box)]
            need(len(held) == 1, 'a choice that is not one picture')
            choices.append(held[0])
        run = from_right([s for s in spots if s not in choices])
        need(len(run) >= 4 and max(s.box[3] for s in run) < min(c.y0 for c in circles), 'the run is not above the choices')
        asks = sheet.take(sheet.within([c for c in sheet.chars if c.c == '؟'], band))
        need(len(asks) == 1 and asks[0].cx < min(s.box[0] for s in run), 'no question mark at the left end of the run')
        names = [s.name for s in run]
        period = [p for p in range(1, len(names) // 2 + 1) if all(names[i] == names[i + p] for i in range(len(names) - p))]
        need(period and len(set(names)) > 1, 'the run %s does not repeat' % names)
        coming = names[len(names) - period[0]]
        picks = [s.name for s in choices]
        answer = one_of(picks, coming, 'what comes next,')
        out.append((dict(sheet.base(row), run=names, choices=picks, answer=answer),
                    'run %s (repeats every %d); choices %s; answer %s' % (' '.join(names), period[0], ' '.join(picks), coming)))
    return out


def letter_in(sheet, box):
    """The letter drawn in a box: (the letter, the glyphs that draw it). Many letters are drawn in pieces, a bowl
    and its dots; what letter the pieces make is what the page itself says they spell."""
    glyphs = sheet.take([c for c in sheet.chars if inside((c.ox, c.cy), box)])
    need(glyphs and len({c.seq for c in glyphs}) == 1, 'a box that does not hold one letter')
    key = tuple(c.gid for c in glyphs)
    said = {text for text, drawn in sheet.spelled if drawn == key}
    whole = unicodedata.normalize('NFKC', glyphs[0].c) if len(glyphs) == 1 else ''
    if len(whole) == 1 and '\u0621' <= whole <= '\u064a':
        said.add(whole)
    need(len(said) == 1, 'cannot tell which letter the glyphs %s draw: %s' % (key, sorted(said)))
    letter = said.pop()
    need(len(letter) == 1 and '\u0621' <= letter <= '\u064a', 'not one Arabic letter: %r' % letter)
    return letter, key


def read_letter(sheet):
    boxes = [s for s in sheet.shapes if s.fill == LETTER]
    need(len(boxes) == 1, 'expected one box with the letter to find')
    circles = [s for s in sheet.shapes if s.stroke == RULE and s.kind == 's' and s.sig == 'c64']
    lines = lines_of(circles)
    need(len({len(line) for line in lines}) == 1, 'the grid of letters is not even')
    letter, drawn = letter_in(sheet, boxes[0].box)
    found = [letter_in(sheet, circle.box) for line in lines for circle in line]
    cells = [f[0] for f in found]
    answer = [i for i, c in enumerate(cells) if c == letter]
    need(answer, 'the letter is nowhere in the grid')
    need(answer == [i for i, f in enumerate(found) if f[1] == drawn], 'one letter drawn in two ways')
    cols = len(lines[0])
    return [(dict(sheet.base(), letter=letter, cols=cols, rows=len(lines), cells=cells, answer=answer),
             'find %s in %s; answer cells %s' % (letter, ' / '.join(' '.join(cells[i:i + cols]) for i in range(0, len(cells), cols)), answer))]


def read_differences(sheet):
    frames = sorted([s for s in sheet.shapes if s.fill == SCENE and s.stroke == INK], key=lambda s: s.cy)
    need(len(frames) == 2, 'expected two scenes')
    need(abs(frames[0].w - frames[1].w) < 0.5 and abs(frames[0].h - frames[1].h) < 0.5 and abs(frames[0].x0 - frames[1].x0) < 0.5, 'the two scenes are not one size')
    said = [c for c in sheet.head if c.c in DIGITS]
    need(len(said) == 1, 'the instruction does not say how many differences')
    scenes, grounds = [], []
    for frame in frames:
        grass = [s for s in sheet.shapes if s.fill == GRASS and inside(center(s.box), frame.box)]
        need(len(grass) == 1, 'expected one strip of grass in a scene')
        grounds.append((grass[0].y0 - frame.y0) / frame.w)
        things = sheet.take([s for s in sheet.spots if inside(s.at, frame.box)])
        need(things, 'an empty scene')
        scenes.append([(s.name, place(s.box, frame.box)) for s in things])
    need(abs(grounds[0] - grounds[1]) < 0.002, 'the ground is not at one height in the two scenes')
    top, bottom = scenes

    def overlap(a, b):
        w = min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0])
        h = min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1])
        return w * h if w > 0 and h > 0 else 0

    pairs, used = [], set()
    for i, (name, at) in enumerate(top):  # what is the same in both
        for j, (name2, at2) in enumerate(bottom):
            if j not in used and name == name2 and max(abs(a - b) for a, b in zip(at, at2)) < 0.004:
                used.add(j)
                pairs.append((i, j, True))
                break
    rest_top = [i for i in range(len(top)) if i not in {p[0] for p in pairs}]
    rest_bottom = [j for j in range(len(bottom)) if j not in used]
    changed = []
    while True:  # what took the place of what: the pair that overlaps most, again and again
        best = max(((overlap(top[i][1], bottom[j][1]), i, j) for i in rest_top for j in rest_bottom), default=(0, 0, 0))
        if best[0] <= 0:
            break
        changed.append((best[1], best[2]))
        rest_top.remove(best[1])
        rest_bottom.remove(best[2])
    changed += [(i, None) for i in rest_top] + [(None, j) for j in rest_bottom]
    need(len(changed) == number(said), 'found %d differences, the page says %d' % (len(changed), number(said)))
    differences, notes = [], []
    for i, j in sorted(changed, key=lambda c: -(top[c[0]][1][0] if c[0] is not None else bottom[c[1]][1][0])):
        boxes = [t[1] for t in ([top[i]] if i is not None else []) + ([bottom[j]] if j is not None else [])]
        x0, y0 = min(b[0] for b in boxes), min(b[1] for b in boxes)
        x1, y1 = max(b[0] + b[2] for b in boxes), max(b[1] + b[3] for b in boxes)
        differences.append({'top': i, 'bottom': j, 'at': [r4(x0), r4(y0), r4(x1 - x0), r4(y1 - y0)]})
        notes.append('%s -> %s' % (top[i][0] if i is not None else 'nothing', bottom[j][0] if j is not None else 'nothing'))
    round_ = dict(sheet.base(), box=unit(frames[0].box), ground=r4(grounds[0]),
                  top=[{'picture': n, 'at': at} for n, at in top], bottom=[{'picture': n, 'at': at} for n, at in bottom], differences=differences)
    return [(round_, 'top: %s; bottom: %s; differences: %s' % (' '.join(n for n, _ in top), ' '.join(n for n, _ in bottom), '; '.join(notes)))]


def read_complete(sheet):
    axes = sorted([s for s in sheet.shapes if s.fill == AXIS and s.kind == 'f' and s.w < 3], key=lambda s: s.cy)
    solid = sorted([s for s in sheet.shapes if s.stroke == INK and s.kind == 's'], key=lambda s: s.cy)
    dotted = sorted([s for s in sheet.shapes if s.fill == DASH and s.kind == 'f'], key=lambda s: s.cy)
    need(len(axes) == len(solid) == len(dotted) >= 1 and len(axes) + len(solid) + len(dotted) == len(sheet.shapes), 'expected a mirror line, a drawn half and a dotted half for each drawing')
    out = []
    for row, (axis, half, dots) in enumerate(zip(axes, solid, dotted), 1):
        need(axis.y0 <= half.y0 and half.y1 <= axis.y1, 'a half drawing that is not beside its mirror line')
        pieces = half.pieces()
        need(len(pieces) == 1, 'the drawn half is not one line')
        line = flat(pieces[0])
        x = line[0][0]  # the half begins and ends on the mirror line; the pale dashed line the page draws there is a hair off
        need(abs(line[-1][0] - x) < 0.05 and abs(axis.cx - x) < 0.5 and all(p[0] > x - 0.05 for p in line),
             'the drawn half does not run from the mirror line to the mirror line, on its right')

        def mirror(p):
            return (2 * x - p[0], p[1])

        mirrored = [mirror(p) for p in line]
        marks = [center(union([q for step in piece for q in ((p[0], p[1], p[0], p[1]) for p in step[1:])])) for piece in dots.pieces()]
        need(len(marks) >= 10, 'too few dots in the dotted half')
        need(all(far_from(m, mirrored) < 1.6 for m in marks), 'the dotted half is not the mirror image of the drawn half')
        fine = [bezier(('c', a, a, b, b), k / 8) for a, b in zip(mirrored, mirrored[1:]) for k in range(8)]
        need(all(min((m[0] - p[0]) ** 2 + (m[1] - p[1]) ** 2 for m in marks) < 49 for p in fine), 'part of the mirror image has no dots')
        reach = max(p[0] for p in line) - x
        box = (x - reach, min(p[1] for p in line), x + reach, max(p[1] for p in line))
        other = [[(step[0],) + tuple(mirror(p) for p in step[1:]) for step in pieces[0]]]
        shape, name = sheet.drawn('complete', row)
        round_ = dict(sheet.base(row), box=unit(box), shape=shape, name=name, axis=point((x, box[1]), box)[0], stroke=r4(half.width / (box[2] - box[0])),
                      drawn={'d': path(pieces, box, False), 'points': [point(p, box) for p in line]},
                      todo={'d': path(other, box, False), 'points': [point(p, box) for p in mirrored]})
        out.append((round_, 'half a %s, %d points, mirrored on x = %s' % (shape, len(line), round_['axis'])))
    return out


# The index, and the whole job.

def read_index(book, doc):
    """The printed pages of each game, from the index on PDF page 4, and the hub of each game."""
    page = doc[3]
    shapes = [Shape(d) for d in page.get_drawings()]
    pills = sorted([s for s in shapes if s.kind == 'f' and s.fill in HUBS and s.sig == 'c8l1c16l1c8'], key=lambda s: s.cy)
    need([HUBS[p.fill] for p in pills] == ['numbers', 'think'], 'the %s book: the index does not have the two headings' % book)
    digits = [c for c in chars_of(page) if c.color == 0x333333 and c.c in DIGITS]
    rows = {}
    for c in digits:
        rows.setdefault(round(c.oy), []).append(c)
    found = {'numbers': [], 'think': []}
    for y in sorted(rows):
        need(y > pills[0].y1, 'the %s book: page numbers above the first heading' % book)
        numbers, word = [], []
        for c in sorted(rows[y], key=lambda c: c.box[0]):
            if word and c.box[0] - word[-1].box[2] > 1:  # a gap: the next number
                numbers.append(number(word))
                word = []
            word.append(c)
        numbers.append(number(word))
        found['numbers' if y < pills[1].y0 else 'think'].append(sorted(numbers))
    pages = {}
    for hub, kinds in INDEX[book].items():
        need(len(kinds) == len(found[hub]), 'the %s book: the index has %d rows under "%s", INDEX has %d' % (book, len(found[hub]), hub, len(kinds)))
        for kind, numbers in zip(kinds, found[hub]):
            need(numbers, 'the %s book: no pages for "%s"' % (book, kind))
            pages[kind] = numbers
    return pages


def read_crayons(doc):
    """The colors of the eight crayons in the box on PDF page 3: fill -> English name."""
    shapes = [Shape(d) for d in doc[2].get_drawings()]
    frames = [s for s in shapes if s.kind == 's' and s.stroke == RULE and s.w > 400]
    need(len(frames) == 1, 'the box of crayons is not on PDF page 3')
    bodies = [s for s in shapes if s.stroke == CRAYON and s.sig == 'l1c4l1c4l1c4l1c4' and inside(center(s.box), frames[0].box)]
    ordered = [s for line in lines_of(bodies) for s in line]
    need(len(ordered) == len(CRAYONS), 'the box on PDF page 3 shows %d crayons, CRAYONS names %d' % (len(ordered), len(CRAYONS)))
    need(len({s.fill for s in ordered}) == len(ordered), 'two crayons of one color in the box on PDF page 3')
    return {s.fill: name for s, (name, _) in zip(ordered, CRAYONS)}


def text_of(data):
    def whole(value):
        if isinstance(value, float) and value == int(value):
            return int(value)
        if isinstance(value, dict):
            return {k: whole(v) for k, v in value.items()}
        if isinstance(value, list):
            return [whole(v) for v in value]
        return value

    def js(value):
        return json.dumps(whole(value), ensure_ascii=False, separators=(',', ':'))

    def table(values):
        return '{\n' + ',\n'.join('%s:%s' % (js(k), js(v)) for k, v in values.items()) + '}'

    games = []
    for game in data['games']:
        head = js({k: v for k, v in game.items() if k != 'rounds'})[:-1]
        games.append(head + ',"rounds":[\n' + ',\n'.join(js(r) for r in game['rounds']) + ']}')
    return ('{"v":%d,\n"colors":%s,\n"outlines":%s,\n"pictures":%s,\n"games":[\n%s]}\n'
            % (data['v'], js(data['colors']), table(data['outlines']), table(data['pictures']), ',\n'.join(games)))


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    folder = sys.argv[1] if len(sys.argv) > 1 else BOOKS
    docs = {}
    for book, name in FILES.items():
        where = os.path.join(folder, name)
        need(os.path.exists(where), 'the book %s is not there. Give the folder of the books: python tools/make-sheets.py <folder>' % where)
        docs[book] = pymupdf.open(where)
    colors = read_crayons(docs['go'])
    need(colors == read_crayons(docs['back']), 'the two books do not show the same crayons')
    library = Library(docs)
    sheets = {}  # game id -> its pages, go first
    for book in FILES:
        for kind, pages in read_index(book, docs[book]).items():
            for printed in pages:
                sheet = Sheet(book, docs[book], printed + 2, library)
                hub = [g[1] for g in GAMES if g[0] == kind][0]
                with sheet:
                    need(sheet.hub == hub, 'the index lists this page under "%s", its heading says "%s"' % (hub, sheet.hub))
                sheets.setdefault(kind, []).append(sheet)
    library.settle(sheets['shadow'])
    outlines, used_colors = {}, set()
    readers = {
        'count': read_count, 'color-count': lambda s: read_color_count(s, outlines), 'match-number': read_match_number, 'dots': read_dots,
        'more': read_more, 'size': read_size, 'missing': read_missing, 'shapes': lambda s: read_shapes(s, colors, used_colors), 'add': read_add,
        'color-number': lambda s: read_color_number(s, colors, used_colors), 'shadow': read_shadow, 'different': read_different,
        'similar': read_similar, 'next': read_next, 'letter': read_letter, 'differences': read_differences, 'complete': read_complete,
    }
    games, report = [], []
    for kind, hub, prompt in GAMES:
        rounds = []
        for sheet in sheets[kind]:
            with sheet:
                for round_, note in readers[kind](sheet):
                    rounds.append(round_)
                    report.append('%-12s %s  %s' % (kind, sheet.where(round_.get('row')), note))
                rest = sheet.left_over()
                need(not rest, '%d things on the page that the game does not account for: %s' % (
                    len(rest), ', '.join(sorted({getattr(t, 'name', None) or getattr(t, 'c', '?') for t in rest}))))
        games.append({'id': kind, 'hub': hub, 'prompt': prompt, 'rounds': rounds})
    unasked = [key for key in list(DRAWN) + list(KINDS) if key not in ASKED]
    need(not unasked, 'DRAWN or KINDS has entries that no page asks for: %s' % unasked)
    names = set()

    def gather(value):
        if isinstance(value, dict):
            for k, v in value.items():
                if k == 'picture':
                    names.add(v)
                elif k in ('pictures', 'run', 'choices') and v and isinstance(v[0], str):
                    names.update(v)
                else:
                    gather(v)
        elif isinstance(value, list):
            for v in value:
                gather(v)

    gather(games)
    need(names == set(library.files), 'pictures read but not used, or used but not read: %s' % sorted(names ^ set(library.files)))
    pictures = library.save(os.path.join(TARGET, 'img'), names)
    arabic = dict(CRAYONS)
    data = {'v': 1,
            'colors': {name: {'hex': fill, 'ar': arabic[name]} for fill, name in colors.items() if name in used_colors},
            'outlines': outlines, 'pictures': pictures, 'games': games}
    with open(os.path.join(TARGET, 'sheets.json'), 'w', encoding='utf-8', newline='\n') as out:
        out.write(text_of(data))
    for line in report:
        print(line)
    spread = library.spread
    print('\n%d pages, %d rounds in %d games, %d pictures (%d of them shadows), colors: %s' % (
        sum(len(s) for s in sheets.values()), sum(len(g['rounds']) for g in games), len(games), len(pictures),
        sum(1 for p in pictures.values() if 'of' in p), ', '.join(data['colors'])))
    print('telling pictures apart: one picture differs from itself by at most %.1f, two colorings of one drawing by at least %.1f, two drawings by at least %.1f (of 255)'
          % (spread['same'], spread['other'], spread['shape']))
    print('wrote', os.path.normpath(os.path.join(TARGET, 'sheets.json')), 'and', os.path.normpath(os.path.join(TARGET, 'img')))


if __name__ == '__main__':
    try:
        main()
    except Problem as problem:
        sys.exit('make-sheets: ' + str(problem))
