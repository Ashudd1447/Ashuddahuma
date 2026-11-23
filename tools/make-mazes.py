"""Writes public/mazes/mazes.json, the seven mazes of the maze game.

    python tools/make-mazes.py

The mazes are the family's printed worksheet, docs/sources/arabic-mazes.pdf
(seven pages, one maze each), used exactly as printed: this script reads the
walls out of the PDF's own drawing, so no wall is retyped or redrawn. For each
page it finds the grid, which walls stand, the two gaps in the outer wall (the
way in is the one with the green mark, the way out the one with the red mark),
and the one way through. Every maze is checked to be whole: all cells joined,
no loops, so there is exactly one way from the start to the end.

In mazes three to seven the way through draws a hidden picture. Its name, and
the clean outline that the child's own line is straightened into at the end,
are written here by hand (PICTURES): the outline follows the way through
closely, with its stair steps made into straight lines and curves. The names
are the parents' to approve.

Standard library only.
"""
import io
import json
import math
import os
import re
import zlib
from collections import deque

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, '..', 'docs', 'sources', 'arabic-mazes.pdf')
TARGET = os.path.join(HERE, '..', 'public', 'mazes', 'mazes.json')

DARK = (0.102, 0.102, 0.102)  # the walls
GREEN = (0.106, 0.498, 0.231)  # the mark in the first cell
RED = (0.776, 0.157, 0.157)  # the mark in the last cell

TITLES = [
    'الْمَتَاهَةُ الْأُولَى', 'الْمَتَاهَةُ الثَّانِيَةُ', 'الْمَتَاهَةُ الثَّالِثَةُ', 'الْمَتَاهَةُ الرَّابِعَةُ',
    'الْمَتَاهَةُ الْخَامِسَةُ', 'الْمَتَاهَةُ السَّادِسَةُ', 'الْمَتَاهَةُ السَّابِعَةُ',
]


# Reading the PDF: its objects, its page streams, and the lines and shapes drawn on each page.

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

def maze_of(shapes, number):
    walls = []
    marks = {}
    for shape in shapes:
        if shape['kind'] == 'stroke' and same(shape['stroke'], DARK):
            walls += [(sub[0], sub[1]) for sub in shape['subs']]
        elif shape['kind'] == 'fill' and shape['faint']:
            pts = [p for sub in shape['subs'] for p in sub]
            xs, ys = [p[0] for p in pts], [p[1] for p in pts]
            marks['start' if same(shape['fill'], GREEN) else 'end'] = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
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
            assert abs(value - round(value)) < 0.2, 'maze %d: a wall off the grid' % number
        if abs(ay - by) < 0.5:
            for c in range(round(min(ca, cb)), round(max(ca, cb))):
                h[round(ra)][c] = 1
        else:
            assert abs(ax - bx) < 0.5, 'maze %d: a slanted wall' % number
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
    assert set(doors) == {start, end}, 'maze %d: the gaps in the outer wall are not at the two marks' % number

    before = {start: None}
    queue = deque([start])
    while queue:
        here = queue.popleft()
        for there in ways(*here):
            if there not in before:
                before[there] = here
                queue.append(there)
    passages = sum(len(ways(c, r)) for r in range(rows) for c in range(cols)) // 2
    assert len(before) == cols * rows, 'maze %d: a cell cannot be reached' % number
    assert passages == cols * rows - 1, 'maze %d: more than one way through' % number
    path = []
    here = end
    while here is not None:
        path.append(here)
        here = before[here]
    path.reverse()
    return {
        'number': number, 'title': TITLES[number - 1], 'cols': cols, 'rows': rows,
        'h': [''.join(str(bit) for bit in row) for row in h],
        'v': [''.join(str(bit) for bit in row) for row in v],
        'start': list(start), 'end': list(end), 'enter': doors[start], 'leave': doors[end],
        'path': [list(step) for step in path],
    }


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


# The name of each picture, as the child sees it, and the clip that says it.
# 'mosque' is the word the reading game already has a recording of.
PICTURES = {
    3: {'name': 'مُثَلَّجَات', 'clip': 'maze-icecream', 'outline': ice_cream},
    4: {'name': 'تُفَّاحَة', 'clip': 'maze-apple', 'outline': apple},
    5: {'name': 'فَانُوس', 'clip': 'maze-lantern', 'outline': lantern},
    6: {'name': 'هِلَال', 'clip': 'maze-crescent', 'outline': crescent},
    7: {'name': 'مَسْجِد', 'clip': 'mosque', 'outline': masjid},
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


def main():
    objs, pages = read_pdf(SOURCE)
    assert len(pages) == 7, 'the worksheet should have seven pages'
    mazes = []
    for number, page in enumerate(pages, 1):
        maze = maze_of(shapes_of(objs, page), number)
        picture = PICTURES.get(number)
        if picture:
            outline = tidy(picture['outline']())
            assert outline[0] == outline[-1], 'maze %d: the outline is not closed' % number
            where, worst = anchors(maze['path'], outline)
            assert worst < 1.6, 'maze %d: the outline strays %.2f cells from the way through' % (number, worst)
            maze['picture'] = {'name': picture['name'], 'clip': picture['clip'], 'outline': outline, 'anchors': where}
            note = ', picture %s, outline of %d points, at most %.2f cells from the way through' % (picture['clip'], len(outline), worst)
        else:
            note = ''
        print('maze %d: %d by %d, way through of %d cells%s' % (number, maze['cols'], maze['rows'], len(maze['path']), note))
        mazes.append(maze)
    os.makedirs(os.path.dirname(TARGET), exist_ok=True)
    with io.open(TARGET, 'w', encoding='utf-8', newline='\n') as out:
        out.write('{"mazes": [\n' + ',\n'.join(json.dumps(maze, ensure_ascii=False, separators=(',', ':')) for maze in mazes) + '\n]}\n')
    print('wrote', os.path.normpath(TARGET))


if __name__ == '__main__':
    main()
