"""Writes public/mazes/mazes.json, the mazes of the maze game.

    python tools/make-mazes.py [the books' folder]

The mazes are the family's printed pages, used exactly as printed: this script
reads the walls out of each PDF's own drawing, so no wall is retyped or
redrawn. For each page it finds the grid, which walls stand, the two gaps in
the outer wall (the way in is the one with the green mark, the way out the one
with the red mark), and the way through. For every maze it proves that there
is a way from the start to the end and counts the ways through; a maze with
none or with several is reported, never hidden.

The first seven are the worksheet docs/sources/arabic-mazes.pdf (seven pages,
one maze each), read with the standard library alone. They keep their numbers,
1 to 7, and their place at the head of the file, so the finished marks kept on
the family's devices still fit; each must be whole (all cells joined, no
loops, so exactly one way through), or the script stops.

The rest are the maze pages of the son's two printed activity books,
musa-go.pdf and musa-back.pdf. The books are not in this repository: they are
looked for in the folder given on the command line, or in ../books beside the
repository. Their pages are read with PyMuPDF (pip install pymupdf), the one
thing here that is not the standard library. A book page whose walls and doors
are those of a maze already taken (one of the seven, or an earlier book page)
is skipped and named. A book maze's number is 100 plus its page in musa-go.pdf
and 200 plus its page in musa-back.pdf, so it never changes when pages are
added or dropped; its title counts on from eight in the order of the list.
After the seven the file holds the mazes without a picture, smallest first,
then the ones with a picture at each end, then the ones with a hidden picture.

When the books or PyMuPDF are not there, the seven are still read and written,
the book mazes already in mazes.json are kept as they are, and the script says
so; nothing is dropped without a word.

Some book pages show a small picture at the start and one at the end, and
their instruction names them (HELP). The pictures are taken out of the PDF,
transparency and all, and saved once each as public/images/mazes/<name>.png,
the longer side 240 pixels.

In some mazes the way through draws a hidden picture. Its name, and the clean
outline that the child's own line is straightened into at the end, are written
here by hand (PICTURES): the outline follows the way through closely, with its
stair steps made into straight lines and curves. The names are the parents' to
approve.
"""
import io
import json
import math
import os
import re
import sys
import zlib
from collections import deque

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, '..', 'docs', 'sources', 'arabic-mazes.pdf')
TARGET = os.path.join(HERE, '..', 'public', 'mazes', 'mazes.json')
IMAGES = os.path.join(HERE, '..', 'public', 'images', 'mazes')
BOOKS = os.path.join(HERE, '..', '..', 'books')

DARK = (0.102, 0.102, 0.102)  # the worksheet's walls
NAVY = (0.114, 0.141, 0.2)  # the books' walls
GREEN = (0.106, 0.498, 0.231)  # the mark in the first cell
RED = (0.776, 0.157, 0.157)  # the mark in the last cell

TITLES = [
    'الْمَتَاهَةُ الْأُولَى', 'الْمَتَاهَةُ الثَّانِيَةُ', 'الْمَتَاهَةُ الثَّالِثَةُ', 'الْمَتَاهَةُ الرَّابِعَةُ',
    'الْمَتَاهَةُ الْخَامِسَةُ', 'الْمَتَاهَةُ السَّادِسَةُ', 'الْمَتَاهَةُ السَّابِعَةُ',
]
TITLE = 'الْمَتَاهَةُ'  # a book maze's title: this word and its place in the list, in Arabic-Indic digits
DIGITS = '٠١٢٣٤٥٦٧٨٩'

# The books' maze pages, by PDF page (the first page is 1): the file, what is
# added to a page to make its maze's number, the pages without a picture, the
# pages with a picture at each end, and the pages with a hidden picture.
PAGES = [
    ('musa-go.pdf', 100, [5, 9, 11, 15, 17, 19, 22, 25, 29, 34, 38, 40, 46, 48, 52, 59, 65, 71, 78], [31, 54], [42, 57, 62, 68, 74]),
    ('musa-back.pdf', 200, [5, 9, 11, 21, 26, 35, 38, 44, 48, 57, 60, 63, 69, 73], [14, 31, 51], [17, 24, 33, 42, 53, 65, 74]),
]

# The mazes with a picture at each end, by number: the page's instruction as
# the child sees it, the clip that says it, and the names of the two pictures'
# files, the one at the start first.
HELP = {
    131: {'text': 'سَاعِدِ السَّيَّارَةَ لِتَصِلَ إِلَى الْبَيْتِ', 'clip': 'maze-help-car', 'ends': ('car', 'house')},
    154: {'text': 'سَاعِدِ الطَّائِرَةَ لِتَصِلَ إِلَى السَّحَابَةِ', 'clip': 'maze-help-plane', 'ends': ('plane', 'cloud')},
    214: {'text': 'سَاعِدِ الْحَافِلَةَ لِتَصِلَ إِلَى الْمَسْجِدِ', 'clip': 'maze-help-bus', 'ends': ('bus', 'masjid')},
    231: {'text': 'سَاعِدِ الدَّرَّاجَةَ لِتَصِلَ إِلَى الشَّجَرَةِ', 'clip': 'maze-help-bike', 'ends': ('bike', 'tree')},
    251: {'text': 'سَاعِدِ الْبَالُونَ لِيَصِلَ إِلَى الشَّمْسِ', 'clip': 'maze-help-balloon', 'ends': ('balloon', 'sun')},
}
SIDE = 240  # the longer side of a saved picture, in pixels


# Reading the worksheet: its objects, its page streams, and the lines and shapes drawn on each page.

def read_pdf(path):
    data = open(path, 'rb').read()
    objs = {}
    for m in re.finditer(rb'(\d+)\s+\d+\s+obj\b(.*?)endobj', data, re.S):
        objs[int(m.group(1))] = m.group(2)
    kids = re.search(rb'/Kids\s*\[([^\]]*)\]', data).group(1).split()[0::3]
    return objs, [int(n) for n in kids]


def stream(objs, num):
    body = objs[num]
    s = re.search(rb'stream\r?\n', body)
    raw = body[s.end():]
    raw = raw[:raw.rfind(b'endstream')].rstrip(b'\r\n')
    return zlib.decompress(raw) if b'FlateDecode' in body[:s.start()] else raw


def mul(a, b):
    return [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
            a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
            a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]]


def at(ctm, x, y):
    return (ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5])


TOKEN = re.compile(rb"<<.*?>>|<[0-9A-Fa-f\s]*>|\((?:\\.|[^\\)])*\)|\[|\]|/[^\s/\[\]<>()]+|[-+]?\d*\.?\d+|[A-Za-z\*]+", re.S)


def shapes_of(objs, page_num):
    """The stroked and filled paths of a page, in points, y up from the foot of the page."""
    body = objs[page_num]
    faint = set()
    for m in re.finditer(rb'/(G\d+)\s+(\d+)\s+0\s+R', body):
        ca = re.search(rb'/ca\s+([\d.]+)', objs[int(m.group(2))])
        if ca and float(ca.group(1)) < 0.5:
            faint.add(m.group(1).decode())
    content = stream(objs, int(re.search(rb'/Contents\s+(\d+)', body).group(1)))
    ctm = [1, 0, 0, 1, 0, 0]
    stack = []
    state = {'stroke': (0, 0, 0), 'fill': (0, 0, 0), 'faint': False}
    args = []
    path = []
    sub = None
    shapes = []

    def flush(kind):
        nonlocal path, sub
        if sub:
            path.append(sub)
        if path and kind:
            shapes.append({'kind': kind, 'stroke': state['stroke'], 'fill': state['fill'], 'faint': state['faint'], 'subs': path})
        path = []
        sub = None

    for m in TOKEN.finditer(content):
        tok = m.group(0)
        if tok[:1] in b'-+.0123456789':
            args.append(float(tok))
            continue
        if tok[:1] in b'/(<[]':
            args.append(tok)
            continue
        op = tok.decode()
        nums = [a for a in args if isinstance(a, float)]
        if op == 'q':
            stack.append((ctm[:], dict(state)))
        elif op == 'Q':
            ctm, state = stack.pop()
        elif op == 'cm':
            ctm = mul(nums[-6:], ctm)
        elif op == 'm':
            if sub:
                path.append(sub)
            sub = [at(ctm, nums[-2], nums[-1])]
        elif op == 'l':
            sub.append(at(ctm, nums[-2], nums[-1]))
        elif op == 'c':
            sub.append(at(ctm, nums[-2], nums[-1]))
        elif op == 're':
            x, y, w, h = nums[-4:]
            if sub:
                path.append(sub)
            path.append([at(ctm, x, y), at(ctm, x + w, y), at(ctm, x + w, y + h), at(ctm, x, y + h)])
            sub = None
        elif op in ('S', 's'):
            flush('stroke')
        elif op in ('f', 'F', 'f*', 'B', 'B*', 'b', 'b*'):
            flush('fill')
        elif op == 'n':
            flush(None)
        elif op == 'RG':
            state['stroke'] = tuple(nums[-3:])
        elif op == 'rg':
            state['fill'] = tuple(nums[-3:])
        elif op == 'gs':
            state['faint'] = args[-1][1:].decode() in faint
        args = []
    return shapes


def same(a, b):
    return all(abs(x - y) < 0.02 for x, y in zip(a, b))


# From a page's drawing to a maze on a grid.

def count_ways(start, end, ways, most=99):
    """How many ways lead from the start to the end without passing a cell
    twice, counted up to most. In a maze without loops it is one or none."""
    seen = {start}
    count = 0
    trail = [(start, iter(ways(*start)))]
    while trail and count < most:
        here, rest = trail[-1]
        there = next(rest, None)
        if there is None:
            trail.pop()
            seen.discard(here)
        elif there == end:
            count += 1
        elif there not in seen:
            seen.add(there)
            trail.append((there, iter(ways(*there))))
    return count


def maze_of(shapes, label, dark=DARK):
    """The maze drawn on a page, and how whole it is: the ways through
    (counted), the cells that cannot be reached, and the passages beyond the
    fewest that join every cell (each one is a loop). label names the page in
    whatever is said about it."""
    walls = []
    marks = {}
    for shape in shapes:
        if shape['kind'] == 'stroke' and same(shape['stroke'], dark):
            walls += [(sub[0], sub[1]) for sub in shape['subs']]
        elif shape['kind'] == 'fill' and shape['faint']:
            pts = [p for sub in shape['subs'] for p in sub]
            xs, ys = [p[0] for p in pts], [p[1] for p in pts]
            for name, color in (('start', GREEN), ('end', RED)):
                if same(shape['fill'], color):
                    marks[name] = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
    assert walls, '%s: no walls found' % label
    assert len(marks) == 2, '%s: the green and the red mark were not both found' % label
    xs = sorted(set(round(p[0], 1) for wall in walls for p in wall))
    ys = sorted(set(round(p[1], 1) for wall in walls for p in wall))
    x0, x1, y0, y1 = xs[0], xs[-1], ys[0], ys[-1]
    cell = min(b - a for a, b in zip(xs, xs[1:]) if b - a > 2)
    cols, rows = round((x1 - x0) / cell), round((y1 - y0) / cell)
    cx, cy = (x1 - x0) / cols, (y1 - y0) / rows
    # h[r][c] is the wall on the top side of cell (c, r), for r from 0 to rows;
    # v[r][c] the wall on its left side, for c from 0 to cols. Row 0 is the top row.
    h = [[0] * cols for _ in range(rows + 1)]
    v = [[0] * (cols + 1) for _ in range(rows)]
    for (ax, ay), (bx, by) in walls:
        ca, cb = (ax - x0) / cx, (bx - x0) / cx
        ra, rb = (y1 - ay) / cy, (y1 - by) / cy
        for value in (ca, cb, ra, rb):
            assert abs(value - round(value)) < 0.2, '%s: a wall off the grid' % label
        if abs(ay - by) < 0.5:
            for c in range(round(min(ca, cb)), round(max(ca, cb))):
                h[round(ra)][c] = 1
        else:
            assert abs(ax - bx) < 0.5, '%s: a slanted wall' % label
            for r in range(round(min(ra, rb)), round(max(ra, rb))):
                v[r][round(ca)] = 1

    def cell_of(mark):
        return (int((mark[0] - x0) / cx), int((y1 - mark[1]) / cy))

    start, end = cell_of(marks['start']), cell_of(marks['end'])

    def ways(c, r):
        out = []
        if r > 0 and not h[r][c]:
            out.append((c, r - 1))
        if r < rows - 1 and not h[r + 1][c]:
            out.append((c, r + 1))
        if c > 0 and not v[r][c]:
            out.append((c - 1, r))
        if c < cols - 1 and not v[r][c + 1]:
            out.append((c + 1, r))
        return out

    doors = {}
    for c in range(cols):
        if not h[0][c]:
            doors[(c, 0)] = 'top'
        if not h[rows][c]:
            doors[(c, rows - 1)] = 'bottom'
    for r in range(rows):
        if not v[r][0]:
            doors[(0, r)] = 'left'
        if not v[r][cols]:
            doors[(cols - 1, r)] = 'right'
    assert set(doors) == {start, end}, '%s: the gaps in the outer wall are not at the two marks' % label
    assert {doors[start], doors[end]} <= {'top', 'bottom'}, '%s: a door in a side wall, which the game does not draw' % label

    before = {start: None}
    queue = deque([start])
    while queue:
        here = queue.popleft()
        for there in ways(*here):
            if there not in before:
                before[there] = here
                queue.append(there)
    passages = sum(len(ways(c, r)) for r in range(rows) for c in range(cols)) // 2
    whole = {
        'ways': count_ways(start, end, ways),
        'loose': cols * rows - len(before),
        'loops': passages - (cols * rows - 1) if len(before) == cols * rows else None,
    }
    path = []
    here = end if end in before else None
    while here is not None:
        path.append(here)
        here = before[here]
    path.reverse()
    return {
        'cols': cols, 'rows': rows,
        'h': [''.join(str(bit) for bit in row) for row in h],
        'v': [''.join(str(bit) for bit in row) for row in v],
        'start': list(start), 'end': list(end), 'enter': doors[start], 'leave': doors[end],
        'path': [list(step) for step in path],
    }, whole


def told(whole):
    """What is to be said about how whole a maze is."""
    if whole['ways'] == 0:
        said = 'NO WAY THROUGH'
    elif whole['ways'] == 1:
        said = 'one way through'
    else:
        said = '%d%s WAYS THROUGH' % (whole['ways'], ' or more' if whole['ways'] >= 99 else '')
    if whole['loose']:
        said += ', %d CELLS THAT CANNOT BE REACHED' % whole['loose']
    if whole['loops']:
        said += ', %d loops' % whole['loops']
    return said


def walls_of(maze):
    """What makes two pages the same maze: the grid, the walls and the doors."""
    return (maze['cols'], maze['rows'], tuple(maze['h']), tuple(maze['v']), tuple(maze['start']), tuple(maze['end']))


# The hidden pictures. Lengths are in cells from the maze's top left corner,
# so the middle of cell (c, r) is (c + 0.5, r + 0.5). Each outline is a closed
# line that begins and ends at the middle of the gap between the two doors and
# runs the same way round as the way through.

STEP = 0.1


def line(*points):
    out = []
    for (ax, ay), (bx, by) in zip(points, points[1:]):
        count = max(1, round(math.hypot(bx - ax, by - ay) / STEP))
        out += [(ax + (bx - ax) * i / count, ay + (by - ay) * i / count) for i in range(count)]
    return out + [points[-1]]


def arc(cx, cy, rx, ry, a0, a1):
    """Part of an ellipse. Angles in degrees: 0 is to the right, 90 is down."""
    count = max(2, round(abs(a1 - a0) / 360 * 2 * math.pi * max(rx, ry) / STEP))
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / count)),
             cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / count))) for i in range(count + 1)]


def curve(points, before=None, after=None):
    """A smooth line through the points; before and after bend its two ends."""
    pts = [before or points[0]] + list(points) + [after or points[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        count = max(2, round(math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / STEP))
        for j in range(count):
            t = j / count
            out.append(tuple(
                0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t
                       + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t ** 3) for k in (0, 1)))
    return out + [points[-1]]


def circle_through(a, b, c):
    d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]))
    ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / d
    uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / d
    return ux, uy, math.hypot(a[0] - ux, a[1] - uy)


def angle(cx, cy, p):
    return math.degrees(math.atan2(p[1] - cy, p[0] - cx))


def ice_cream():
    # A scoop (half an ellipse on straight sides) that overhangs a cone.
    return (arc(8, 5, 5.5, 3.5, -90, 0) + line((13.5, 5), (13.5, 8.5), (11.5, 8.5), (8, 15.75), (4.5, 8.5), (2.5, 8.5), (2.5, 5))
            + arc(8, 5, 5.5, 3.5, 180, 270))


def apple():
    # A round body with two shoulders, a dip between them, and a straight stem.
    right = [(8, 15.6), (11.5, 15.35), (13.4, 14.0), (14.45, 12.0), (14.6, 10.0), (14.3, 8.0), (13.4, 6.5), (12.0, 5.55),
             (10.6, 5.45), (9.4, 5.95), (8.5, 6.5)]
    left = [(16 - x, y) for x, y in reversed(right)]
    return curve(right, before=left[-2]) + line((8.5, 6.5), (8.5, 1.5), (7.5, 1.5), (7.5, 6.5)) + curve(left, after=right[1])


def lantern():
    # A pointed cap with eaves, a narrower glass, and a base that spreads and closes below.
    right = [(13.5, 5.5), (13.5, 7.5), (11.5, 7.5), (11.5, 11.5), (13.5, 11.5), (13.5, 12.5), (10.8, 15.5)]
    return line((8, 0.45), *right, *[(16 - x, y) for x, y in reversed(right)], (8, 0.45))


def crescent():
    # Two circles: the outer edge, and the inner edge through the two horns.
    ox, oy, big = 7.6, 8.5, 7.2
    low = (ox + big * 0.8, oy + big * 0.6)
    high = (ox + big * math.cos(math.radians(-81)), oy + big * math.sin(math.radians(-81)))
    ix, iy, small = circle_through(high, low, (5.5, 7.0))
    begin = math.degrees(math.acos((8.5 - ox) / big))
    return (arc(ox, oy, big, big, begin, angle(ox, oy, low))
            + arc(ix, iy, small, small, angle(ix, iy, low), angle(ix, iy, high) + 360)
            + arc(ox, oy, big, big, angle(ox, oy, high) + 360, begin))


def masjid():
    # A hall, a dome with a spire over its right part, and a minaret with a pointed cap at its left end.
    tip = math.degrees(math.acos(0.5 / 4.5))
    return (line((8.5, 15.5), (14.5, 15.5), (14.5, 9.5)) + arc(10, 9.5, 4.5, 5, 0, -tip)
            + line((10.5, 9.5 - 5 * math.sin(math.radians(tip))), (10, 1.4), (9.5, 9.5 - 5 * math.sin(math.radians(tip))))
            + arc(10, 9.5, 4.5, 5, tip - 180, -180)
            + line((5.5, 9.5), (3.5, 9.5), (3.5, 4.8), (2.5, 3.0), (1.5, 4.8), (1.5, 15.5), (8.5, 15.5)))


def joined(*pieces):
    """Pieces of an outline in a row, with a straight line wherever one ends
    away from where the next begins."""
    out = list(pieces[0])
    for piece in pieces[1:]:
        if math.hypot(piece[0][0] - out[-1][0], piece[0][1] - out[-1][1]) > STEP:
            out += line(out[-1], piece[0])[1:-1]
        out += piece
    return out


def house():
    # Two walls, a roof whose eaves reach past them, and a chimney on its right slope.
    return line((8.5, 15.5), (14, 15.5), (14, 8), (15, 8), (11.5, 4.5), (11.5, 1), (10.5, 1), (10.5, 3.5), (8.5, 1.5),
                (2, 8), (3, 8), (3, 15.5), (8.5, 15.5))


def tree():
    # A round crown on a trunk that widens a little toward the ground.
    foot = math.degrees(math.acos(1.3 / 6.5))
    low = 6 + 5.6 * math.sin(math.radians(foot))
    return (line((8, 15.5), (9.6, 15.5), (9.3, low)) + arc(8, 6, 6.5, 5.6, foot, -180 - foot)
            + line((6.7, low), (6.4, 15.5), (8, 15.5)))


def plane():
    # Seen from above, flying up the page: a round nose, swept wings and a tailplane.
    right = [(12.5, 15.5), (12.5, 14.4), (9.5, 12.8), (9.5, 10.5), (15.5, 10.5), (15.5, 8.5), (9.5, 5), (9.5, 2.2)]
    return (line((8.5, 15.5), *right) + arc(8, 2.2, 1.5, 1.9, 0, -180)
            + line(*[(16 - x, y) for x, y in reversed(right)], (8.5, 15.5)))


def boat():
    # A hull that narrows toward the keel, and a sail whose upright edge is the mast.
    return line((8.5, 15.5), (11.5, 15.5), (14.5, 11.5), (9.5, 11.5), (9.5, 1.2), (3.5, 11.5), (1.5, 11.5), (4.5, 15.5), (8.5, 15.5))


def car():
    # Seen from the side: a cabin with a flat roof, a slanted glass down to a
    # flat hood on the right, an upright glass and a sloping boot on the left,
    # a bumper at each end, and two wheels, alike, whose tops are in the body.
    meets = math.degrees(math.asin(0.9 / 2.6))  # where a wheel passes the underside of the body
    return joined(line((7.5, 0.5), (10.2, 0.5), (12.3, 5.5), (14.9, 5.5)), arc(14.9, 6.1, 0.6, 0.6, -90, 0),
                  line((15.5, 6.1), (15.5, 7.9)), arc(14.9, 7.9, 0.6, 0.6, 0, 90),
                  arc(12, 9.4, 2.6, 2.6, -meets, 180 + meets), arc(5, 9.4, 2.6, 2.6, -meets, 180 + meets),
                  arc(2.1, 7.9, 0.6, 0.6, 90, 180), line((1.5, 7.9), (1.5, 5.6), (4.5, 3.2), (4.5, 1.1)),
                  arc(5.1, 1.1, 0.6, 0.6, 180, 270), line((5.1, 0.5), (7.5, 0.5)))


def umbrella():
    # A canopy with a straight lower edge, and a shaft that ends in a hook to the left.
    return joined(arc(8, 8.5, 6.5, 8, -90, 0), line((14.5, 8.5), (9.2, 8.5), (9.2, 13.2)), arc(6.85, 13.2, 2.35, 2.35, 0, 180),
                  line((4.5, 13.2), (4.5, 12.5)), arc(5.2, 12.5, 0.7, 0.7, 180, 360), line((5.9, 12.5), (5.9, 13.2)),
                  arc(6.85, 13.2, 0.95, 0.95, 180, 0), line((7.8, 13.2), (7.8, 8.5), (1.5, 8.5)), arc(8, 8.5, 6.5, 8, -180, -90))


def cup():
    # A straight mug with a round handle on its right.
    return joined(line((7.5, 15.5), (11.9, 15.5)), arc(11.9, 14.9, 0.6, 0.6, 90, 0), line((12.5, 14.9), (12.5, 11.5)),
                  arc(12.5, 8.5, 3, 3, 90, -90), line((12.5, 5.5), (12.5, 3.5), (2.5, 3.5), (2.5, 14.9)),
                  arc(3.1, 14.9, 0.6, 0.6, 180, 90), line((3.1, 15.5), (7.5, 15.5)))


# The name of each picture, as the child sees it, and the clip that says it,
# by the maze's number. 'mosque' and 'house' are words the reading game
# already has a recording of. The books do not say what their pictures are:
# the names are a reading of the drawn way through.
PICTURES = {
    3: {'name': 'مُثَلَّجَات', 'clip': 'maze-icecream', 'outline': ice_cream},
    4: {'name': 'تُفَّاحَة', 'clip': 'maze-apple', 'outline': apple},
    5: {'name': 'فَانُوس', 'clip': 'maze-lantern', 'outline': lantern},
    6: {'name': 'هِلَال', 'clip': 'maze-crescent', 'outline': crescent},
    7: {'name': 'مَسْجِد', 'clip': 'mosque', 'outline': masjid},
    162: {'name': 'بَيْت', 'clip': 'house', 'outline': house},
    168: {'name': 'شَجَرَة', 'clip': 'maze-tree', 'outline': tree},
    217: {'name': 'طَائِرَة', 'clip': 'maze-plane', 'outline': plane},
    224: {'name': 'قَارِب', 'clip': 'maze-boat', 'outline': boat},
    233: {'name': 'سَيَّارَة', 'clip': 'maze-car', 'outline': car},
    242: {'name': 'مِظَلَّة', 'clip': 'maze-umbrella', 'outline': umbrella},
    253: {'name': 'كُوب', 'clip': 'maze-cup', 'outline': cup},
}


def tidy(points):
    out = []
    for x, y in points:
        point = [round(x, 2), round(y, 2)]
        if not out or point != out[-1]:
            out.append(point)
    return out


def anchors(path, outline):
    """For each cell of the way through, how far along the outline (0 to 1)
    the nearest point of the outline lies, never going backward: this is what
    lets each part of the child's line move to its own part of the picture."""
    far = [0.0]
    for a, b in zip(outline, outline[1:]):
        far.append(far[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    cost = [[math.hypot(c + 0.5 - x, r + 0.5 - y) for x, y in outline] for c, r in path]
    count = len(outline)
    best = cost[0][:]
    back = []
    for row in cost[1:]:
        low, where, step, came = float('inf'), 0, [], []
        for j in range(count):
            if best[j] < low:
                low, where = best[j], j
            step.append(low + row[j])
            came.append(where)
        back.append(came)
        best = step
    j = min(range(count), key=lambda k: best[k])
    picks = [j]
    for came in reversed(back):
        j = came[j]
        picks.append(j)
    picks.reverse()
    worst = max(cost[i][j] for i, j in enumerate(picks))
    return [round(far[j] / far[-1], 4) for j in picks], worst


def with_picture(maze):
    """Adds a maze's hidden picture to it; returns what is to be said about it."""
    picture = PICTURES[maze['number']]
    outline = tidy(picture['outline']())
    assert outline[0] == outline[-1], 'maze %d: the outline is not closed' % maze['number']
    where, worst = anchors(maze['path'], outline)
    assert worst < 1.6, 'maze %d: the outline strays %.2f cells from the way through' % (maze['number'], worst)
    maze['picture'] = {'name': picture['name'], 'clip': picture['clip'], 'outline': outline, 'anchors': where}
    return ', picture %s, outline of %d points, at most %.2f cells from the way through' % (picture['clip'], len(outline), worst)


def worksheet():
    """The seven mazes of the worksheet, each with what is to be said about it."""
    objs, pages = read_pdf(SOURCE)
    assert len(pages) == 7, 'the worksheet should have seven pages'
    mazes = []
    for number, page in enumerate(pages, 1):
        grid, whole = maze_of(shapes_of(objs, page), 'maze %d' % number)
        assert whole == {'ways': 1, 'loose': 0, 'loops': 0}, 'maze %d: %s' % (number, told(whole))
        maze = {'number': number, 'title': TITLES[number - 1], **grid}
        note = with_picture(maze) if number in PICTURES else ''
        mazes.append((maze, 'the worksheet page %d, %s%s' % (number, told(whole), note)))
    return mazes


# Reading the books, with PyMuPDF.

def book_shapes(page):
    """The stroked and filled paths of a book's page, as shapes_of gives them
    for the worksheet: in points, y up from the foot of the page."""
    high = page.rect.height
    shapes = []
    for drawing in page.get_drawings():
        subs = []
        for item in drawing['items']:
            if item[0] == 're':
                points = [item[1].tl, item[1].tr, item[1].br, item[1].bl]
            elif item[0] == 'qu':
                points = [item[1].ul, item[1].ur, item[1].lr, item[1].ll]
            else:  # a line's two ends, or a curve's ends and control points
                points = item[1:]
            subs.append([(p.x, high - p.y) for p in points])
        if 's' in drawing['type'] and drawing.get('color'):
            shapes.append({'kind': 'stroke', 'stroke': tuple(drawing['color']), 'fill': (0, 0, 0), 'faint': False, 'subs': subs})
        if 'f' in drawing['type'] and drawing.get('fill'):
            opacity = drawing.get('fill_opacity')
            shapes.append({'kind': 'fill', 'stroke': (0, 0, 0), 'fill': tuple(drawing['fill']),
                           'faint': opacity is not None and opacity < 0.5, 'subs': subs})
    return shapes


def marks_of(shapes):
    """The middles of the green and the red mark of a book's page."""
    marks = {}
    for shape in shapes:
        if shape['kind'] == 'fill' and shape['faint']:
            pts = [p for sub in shape['subs'] for p in sub]
            xs, ys = [p[0] for p in pts], [p[1] for p in pts]
            for name, color in (('start', GREEN), ('end', RED)):
                if same(shape['fill'], color):
                    marks[name] = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
    return marks


def save_picture(pymupdf, doc, xref, name, saved):
    """Saves one of a page's pictures, with its transparency, as
    images/mazes/<name>.png, its longer side SIDE pixels, once however many
    pages show it. Returns its size in pixels."""
    info = doc.extract_image(xref)
    if name in saved:
        assert saved[name][0] == info['image'], 'two different pictures are both called %s' % name
        return saved[name][1]
    assert all(data != info['image'] for data, _ in saved.values()), 'the picture %s is already saved under another name' % name
    pix = pymupdf.Pixmap(doc, xref)
    if info['smask']:
        pix = pymupdf.Pixmap(pix, pymupdf.Pixmap(doc, info['smask']))
    scale = min(1, SIDE / max(pix.width, pix.height))
    size = (round(pix.width * scale), round(pix.height * scale))
    sheet = pymupdf.open()
    leaf = sheet.new_page(width=size[0], height=size[1])
    leaf.insert_image(leaf.rect, pixmap=pix)
    os.makedirs(IMAGES, exist_ok=True)
    leaf.get_pixmap(alpha=True).save(os.path.join(IMAGES, name + '.png'))
    saved[name] = (info['image'], size)
    return size


def with_help(pymupdf, doc, page, shapes, maze, saved):
    """Adds to a maze its instruction and the pictures at its two ends: of the
    page's two pictures, the one nearer the green mark is the start's."""
    help_ = HELP[maze['number']]
    marks = marks_of(shapes)
    high = page.rect.height
    found = []
    for info in page.get_image_info(xrefs=True):
        x0, y0, x1, y1 = info['bbox']
        found.append((info['xref'], ((x0 + x1) / 2, high - (y0 + y1) / 2)))
    assert len(found) == 2, 'maze %d: the page should show two pictures, and shows %d' % (maze['number'], len(found))
    first = min(found, key=lambda one: math.dist(one[1], marks['start']))
    last = min(found, key=lambda one: math.dist(one[1], marks['end']))
    assert first != last, 'maze %d: one picture is the nearest to both marks' % maze['number']
    ends = {}
    for key, (xref, _), name in (('from', first, help_['ends'][0]), ('to', last, help_['ends'][1])):
        wide, tall = save_picture(pymupdf, doc, xref, name, saved)
        ends[key] = {'image': name, 'w': wide, 'h': tall}
    maze['help'] = {'text': help_['text'], 'clip': help_['clip'], **ends}
    return ', pictures %s.png and %s.png, instruction %s' % (help_['ends'][0], help_['ends'][1], help_['clip'])


def from_books(folder, taken):
    """The books' mazes that are not taken yet, in the order of the list, each
    with what is to be said about it; then the pages skipped, with the reason.
    taken maps the walls of the mazes there already to their names. None, with
    the reason, when the books cannot be read."""
    missing = [name for name, *_ in PAGES if not os.path.isfile(os.path.join(folder, name))]
    if missing:
        return None, '%s not found in %s' % (' and '.join(missing), os.path.normpath(folder))
    try:
        import pymupdf
    except ImportError:
        return None, 'PyMuPDF is not installed (pip install pymupdf)'
    kinds = ('plain', 'help', 'picture')
    found = {kind: [] for kind in kinds}
    skipped = []
    saved = {}
    for name, base, *lists in PAGES:
        doc = pymupdf.open(os.path.join(folder, name))
        for number, kind in sorted((base + number, kind) for kind, numbers in zip(kinds, lists) for number in numbers):
            source = '%s page %d' % (name, number - base)
            page = doc[number - base - 1]
            shapes = book_shapes(page)
            grid, whole = maze_of(shapes, source, NAVY)
            walls = walls_of(grid)
            if walls in taken:
                skipped.append('%s: the same maze as %s' % (source, taken[walls]))
                continue
            if not whole['ways']:
                skipped.append('%s: NOT WRITTEN, %s' % (source, told(whole)))
                continue
            taken[walls] = source
            maze = {'number': number, 'title': '', **grid}
            note = ''
            if kind == 'picture' and number in PICTURES:
                note = with_picture(maze)
            elif kind == 'help' and number in HELP:
                note = with_help(pymupdf, doc, page, shapes, maze, saved)
            elif kind != 'plain':
                note = ', ITS %s IS NOT WRITTEN IN THIS SCRIPT: it goes in as a maze without one' % ('PICTURE' if kind == 'picture' else 'INSTRUCTION')
                kind = 'plain'
            found[kind].append((maze, '%s, %s%s' % (source, told(whole), note)))
    found['plain'].sort(key=lambda one: one[0]['cols'] * one[0]['rows'])
    return [one for kind in kinds for one in found[kind]], skipped


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else BOOKS
    mazes = worksheet()
    taken = {walls_of(maze): 'maze %d of the worksheet' % maze['number'] for maze, _ in mazes}
    new, skipped = from_books(folder, taken)
    if new is None:
        kept = []
        if os.path.isfile(TARGET):
            with io.open(TARGET, encoding='utf-8') as old:
                kept = [maze for maze in json.load(old)['mazes'] if maze['number'] > len(TITLES)]
        print('THE BOOKS WERE NOT READ: %s.' % skipped)
        print('Only the worksheet was read. %s' % (
            'The %d book mazes already in mazes.json are kept as they are, and no picture was written.' % len(kept) if kept
            else 'mazes.json had no book mazes to keep: it holds the seven alone.'))
        mazes += [(maze, 'kept as it was') for maze in kept]
    else:
        for place, (maze, _) in enumerate(new, len(mazes) + 1):
            maze['title'] = '%s %s' % (TITLE, ''.join(DIGITS[int(digit)] for digit in str(place)))
        mazes += new
    for place, (maze, note) in enumerate(mazes, 1):
        print('%2d. maze %d: %d by %d, way through of %d cells, %s' % (place, maze['number'], maze['cols'], maze['rows'], len(maze['path']), note))
    if new is not None:
        for line_ in skipped:
            print('skipped ' + line_)
        print('%d mazes from the books, %d book pages skipped' % (len(new), len(skipped)))
    assert len({maze['number'] for maze, _ in mazes}) == len(mazes), 'two mazes have one number'
    os.makedirs(os.path.dirname(TARGET), exist_ok=True)
    with io.open(TARGET, 'w', encoding='utf-8', newline='\n') as out:
        out.write('{"mazes": [\n' + ',\n'.join(json.dumps(maze, ensure_ascii=False, separators=(',', ':')) for maze, _ in mazes) + '\n]}\n')
    print('wrote', os.path.normpath(TARGET))


if __name__ == '__main__':
    main()
