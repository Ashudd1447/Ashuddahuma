/* الضَّوْءُ وَالْمِرْآةُ, light and mirrors: the first game of the lab. A beam
   of sunlight comes into a room through a window, and the child turns mirrors
   to send it where it is needed: to a lantern that has a small eye for light,
   to a flower bud, to a solar panel that turns a toy windmill, to a crystal
   that throws a rainbow. The beam is a real ray: at a mirror it leaves at the
   angle it came at, only the shiny face reflects, and walls and furniture
   stop it. Where the beam meets a mirror, the normal is drawn as a dotted
   line and the two angles as two arcs, which open and close together. The
   beam must rest on a target for most of a second; then a chime, the target
   comes alive, and when all of a level's targets have, the next level comes
   by itself. Twelve levels in three places (his room in the morning, the
   masjid's courtyard, a cellar where the beam is the only light); how many
   are finished is kept on the device. There is nothing to lose.

   This file has three parts: the light itself (plain functions with no page
   in them, which node can load, so that checks can play every level), the
   levels (data), and the page. */

/* THE LIGHT

   Lengths are in the picture's own units: it is W wide and H high, x to the
   right and y DOWN, as on the screen. Angles are in degrees from the x axis,
   so they grow clockwise on the screen.

   A level is data: the window and the sun, the things that stop the beam
   (blocks), the mirrors and the targets. How the mirrors stand is kept
   apart: [{face, slide}], the way each one looks and how far along its rail
   it is. A mirror is a thin box round its pivot: the shiny face in front,
   the dull back behind, a frame at each end. Its stand is behind the beam's
   plane and stops nothing. A target is a disc: the middle of the beam must
   come into it.

     lightEngine.trace(level, mirrors, places)
       -> {points, bounces, end, target, heading}
          places    where each target is now: lightEngine.spots(level, time)
          points    the beam's corners, from the sun to where it ends
          bounces   one for each mirror it leaves: {mirror, at, normal, from, to, angle},
                    angle being the one angle on both sides of the normal
          end       'target', 'wall', 'back' (a mirror's dull back), 'rim' (its frame),
                    'out' (it left the picture) or 'spent' (the last bounce allowed)
          target    the target it rests on, or -1
          heading   the way it was going when it ended
     lightEngine.reflect(d, n)       the law of reflection: d - 2 (d.n) n
     lightEngine.incidence(d, n)     the angle between a ray and a mirror's normal
     lightEngine.pose(mirror, state) where a mirror is: {p, n, t}: pivot, normal, along the face
     lightEngine.turned(mirror, face) a way of looking, kept within the mirror's hinge
     lightEngine.spot(target, time)  where a target is at a time (one on a rail moves)
     lightEngine.soak(fill, lit, dt) a target's ring filling under the beam and emptying without it
     lightEngine.meet(scene, o, d)   the first thing any ray meets (scene from lightEngine.arrange) */
const lightEngine = (() => {
  const W = 14;
  const H = 10;
  const WALL = 0.4; // how thick the room's walls are
  const FLOOR = 0.6;
  const SIDE = 1.5; // the strip of outdoors beside the window
  /* A mirror, seen edge on: half its length, how far its shiny face and its
     dull back are from the pivot, and how much of each end is frame. */
  const MIRROR = { half: 0.75, face: 0.06, back: 0.1, rim: 0.07 };
  const BOUNCES = 12;
  const HOLD = 0.8; // seconds the beam must rest on a target
  const DRAIN = 0.4; // seconds for a ring to empty
  const TINY = 1e-9;
  const RAD = Math.PI / 180;

  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const unit = (angle) => [Math.cos(angle * RAD), Math.sin(angle * RAD)];
  const degrees = (v) => Math.atan2(v[1], v[0]) / RAD;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  function toward(from, to) {
    const x = to[0] - from[0];
    const y = to[1] - from[1];
    const length = Math.hypot(x, y) || 1;
    return [x / length, y / length];
  }

  /* The law of reflection. d is the way the ray goes, n the mirror's normal
     (both of length one): the part of d along n turns back, the part along
     the mirror stays, so the ray leaves at the angle it came at. */
  function reflect(d, n) {
    const k = 2 * dot(d, n);
    return [d[0] - k * n[0], d[1] - k * n[1]];
  }

  /* The angle between a ray that arrives and the normal it arrives at. */
  const incidence = (d, n) => Math.acos(clamp(-dot(d, n), -1, 1)) / RAD;

  /* The room's inner faces. The window is in the left wall or the right one,
     and that side has a strip of outdoors. */
  function room(level) {
    const { side } = level.window;
    return {
      x0: side === 'left' ? SIDE + WALL : WALL,
      x1: side === 'right' ? W - SIDE - WALL : W - WALL,
      y0: WALL,
      y1: H - FLOOR,
    };
  }

  /* The room's ceiling, floor and walls as boxes [x0, y0, x1, y1], with the
     window's opening left out. */
  function shell(level) {
    const { side, from, to } = level.window;
    const left = side === 'left' ? SIDE : 0;
    const right = side === 'right' ? W - SIDE : W;
    const boxes = [[left, 0, right, WALL], [left, H - FLOOR, right, H]];
    if (side === 'left') boxes.push([left, 0, left + WALL, from], [left, to, left + WALL, H], [right - WALL, 0, right, H]);
    else boxes.push([left, 0, left + WALL, H], [right - WALL, 0, right, from], [right - WALL, to, right, H]);
    return boxes;
  }

  /* A mirror's pivot: where it stands, or a place along its rail. */
  function pivot(mirror, slide) {
    if (!mirror.rail) return mirror.at;
    const s = clamp(slide || 0, 0, 1);
    return [mirror.at[0] + (mirror.rail[0] - mirror.at[0]) * s, mirror.at[1] + (mirror.rail[1] - mirror.at[1]) * s];
  }

  /* The way a mirror looks, kept within the limits of its hinge. A mirror
     without limits turns all the way round. */
  function turned(mirror, face) {
    if (mirror.turn) return clamp(face, mirror.turn[0], mirror.turn[1]);
    return face - 360 * Math.floor((face + 180) / 360);
  }

  /* Where a mirror is: its pivot, its normal (the way the shiny face looks)
     and the direction along the face. */
  function pose(mirror, state) {
    const n = unit(state.face);
    return { p: pivot(mirror, state.slide), n, t: [-n[1], n[0]] };
  }

  /* The mirrors of a level as they stand when it opens. */
  const resting = (level) => level.mirrors.map((mirror) => ({ face: mirror.face, slide: mirror.slide || 0 }));

  /* Where a target is. One on a rail goes slowly to and fro, easing at the ends. */
  function spot(target, time) {
    if (!target.rail) return target.at;
    const u = 0.5 - 0.5 * Math.cos((2 * Math.PI * time) / target.secs);
    return [target.at[0] + (target.rail[0] - target.at[0]) * u, target.at[1] + (target.rail[1] - target.at[1]) * u];
  }
  const spots = (level, time) => level.targets.map((target) => spot(target, time));

  /* A ring fills while the beam rests on its target and empties without it. */
  const soak = (fill, lit, dt) => clamp(fill + (lit ? dt / HOLD : -dt / DRAIN), 0, 1);

  /* Where a ray first enters a box whose sides run along the axes: how far
     along the ray, and by which pair of sides (0: the two across x, 1: the
     two across y). Nothing when it misses, slides along a side, or starts on
     the box and heads away. A ray that starts inside is stopped at once. */
  function enter(ox, oy, dx, dy, x0, y0, x1, y1) {
    let near = -Infinity;
    let far = Infinity;
    let side = 0;
    if (Math.abs(dx) < 1e-12) {
      if (ox <= x0 || ox >= x1) return null;
    } else {
      const a = (x0 - ox) / dx;
      const b = (x1 - ox) / dx;
      near = Math.min(a, b);
      far = Math.max(a, b);
    }
    if (Math.abs(dy) < 1e-12) {
      if (oy <= y0 || oy >= y1) return null;
    } else {
      const a = (y0 - oy) / dy;
      const b = (y1 - oy) / dy;
      if (Math.min(a, b) > near) {
        near = Math.min(a, b);
        side = 1;
      }
      far = Math.min(far, Math.max(a, b));
    }
    if (near > far || far <= TINY) return null;
    return { t: Math.max(near, 0), side };
  }

  /* Where a ray first touches a disc: how far along it, or -1. */
  function touch(ox, oy, dx, dy, cx, cy, r) {
    const fx = ox - cx;
    const fy = oy - cy;
    const c = fx * fx + fy * fy - r * r;
    if (c <= 0) return 0;
    const b = fx * dx + fy * dy;
    const under = b * b - c;
    if (b > 0 || under < 0) return -1;
    const t = -b - Math.sqrt(under);
    return t > TINY ? t : -1;
  }

  /* How far a ray goes before it leaves the picture. */
  function leave(ox, oy, dx, dy) {
    const tx = dx > 0 ? (W - ox) / dx : dx < 0 ? -ox / dx : Infinity;
    const ty = dy > 0 ? (H - oy) / dy : dy < 0 ? -oy / dy : Infinity;
    return Math.max(0, Math.min(tx, ty));
  }

  /* Everything in a level that the beam can meet, where it is now. */
  function arrange(level, mirrors, places) {
    return {
      boxes: shell(level).concat((level.blocks || []).map((b) => [b.x, b.y, b.x + b.w, b.y + b.h])),
      poses: level.mirrors.map((mirror, i) => pose(mirror, mirrors[i])),
      discs: level.targets.map((target, j) => [places[j][0], places[j][1], target.r]),
    };
  }

  /* The first thing a ray meets: {t, kind, index}. kind is 'out', 'wall',
     'target', or for a mirror 'mirror' (its shiny face), 'back' or 'rim'. */
  function meet(scene, o, d, bare = false) {
    let best = { t: leave(o[0], o[1], d[0], d[1]), kind: 'out', index: -1 };
    for (const [x0, y0, x1, y1] of scene.boxes) {
      const hit = enter(o[0], o[1], d[0], d[1], x0, y0, x1, y1);
      if (hit && hit.t < best.t) best = { t: hit.t, kind: 'wall', index: -1 };
    }
    if (!bare) {
      scene.discs.forEach(([cx, cy, r], j) => {
        const t = touch(o[0], o[1], d[0], d[1], cx, cy, r);
        if (t >= 0 && t < best.t) best = { t, kind: 'target', index: j };
      });
    }
    scene.poses.forEach(({ p, n, t }, i) => {
      // The mirror is a thin box in its own frame: x along its normal, y along its face.
      const rx = o[0] - p[0];
      const ry = o[1] - p[1];
      const lx = rx * n[0] + ry * n[1];
      const ly = rx * t[0] + ry * t[1];
      const ldx = d[0] * n[0] + d[1] * n[1];
      const ldy = d[0] * t[0] + d[1] * t[1];
      const hit = enter(lx, ly, ldx, ldy, -MIRROR.back, -MIRROR.half, MIRROR.face, MIRROR.half);
      if (!hit || hit.t >= best.t) return;
      let kind = 'rim';
      if (hit.t > 0 && hit.side === 0) {
        if (ldx > 0) kind = 'back';
        else if (Math.abs(ly + ldy * hit.t) <= MIRROR.half - MIRROR.rim) kind = 'mirror';
      }
      best = { t: hit.t, kind, index: i };
    });
    return best;
  }

  /* The beam, from the sun to where it ends. */
  function trace(level, mirrors, places) {
    const scene = arrange(level, mirrors, places);
    let o = level.sun.slice();
    let d = toward(level.sun, level.aim);
    const points = [o];
    const bounces = [];
    for (;;) {
      const hit = meet(scene, o, d);
      const at = [o[0] + d[0] * hit.t, o[1] + d[1] * hit.t];
      points.push(at);
      if (hit.kind !== 'mirror') return { points, bounces, end: hit.kind, target: hit.kind === 'target' ? hit.index : -1, heading: d };
      const { n } = scene.poses[hit.index];
      const to = reflect(d, n);
      bounces.push({ mirror: hit.index, at, normal: n, from: d, to, angle: incidence(d, n) });
      if (bounces.length >= BOUNCES) return { points, bounces, end: 'spent', target: -1, heading: to };
      d = to;
      o = [at[0] + n[0] * TINY, at[1] + n[1] * TINY];
    }
  }

  return {
    W, H, WALL, FLOOR, SIDE, MIRROR, BOUNCES, HOLD, DRAIN,
    unit, degrees, toward, reflect, incidence, room, shell, pivot, turned, pose, resting, spot, spots, soak, arrange, meet, trace,
  };
})();

/* THE LEVELS

   place    'room' (his room in the morning), 'court' (the masjid's courtyard) or 'cellar'
   say      the line shown and said when the level opens (a name in TEXT)
   window   the opening the sun comes in by: its side ('left' or 'right') and where it begins and ends, down that wall
   sun, aim where the beam starts, outdoors, and a point it heads for
   blocks   what stops the beam besides the room itself: {x, y, w, h, look}
   mirrors  at      the pivot
            face    the way the shiny face looks when the level opens
            turn    the limits of its hinge, if it has any
            fixed   bolted: the child cannot turn it
            rail    the other end of its rail (at is the first), and slide, where on it the level opens (0 to 1)
            mount   where its stand comes from: 'floor', 'ceiling', or 'wall' (a plate on the wall behind it)
   targets  kind    'lantern', 'bud', 'panel' or 'crystal'
            at, r   the disc the middle of the beam must rest in
            rail, secs  the other end of a rail it goes along, and the seconds there and back
            way     the mirrors the beam goes by to reach it, in order: only the checks read it
            and what its picture needs: hang (from the ceiling), tilt (the way a panel faces), rest (what it stands on)
   lamps    in the cellar, the lamps in the niches of the wall behind: they light when the last level is done */
const LIGHT_LEVELS = (() => {
  const ROOM = { side: 'left', from: 1.2, to: 2.8 };
  const COURT = { side: 'right', from: 1.2, to: 2.8 };
  const CELLAR = { side: 'left', from: 1, to: 2.6 };
  /* The furniture of his room, the same on every morning. */
  const CHEST = { x: 2.1, y: 8.5, w: 1.7, h: 0.9, look: 'chest' };
  const BED = { x: 10.2, y: 8.3, w: 3.4, h: 1.1, look: 'bed' };
  const SHELF = { x: 11.3, y: 5, w: 2.3, h: 0.22, look: 'shelf' };

  return [
    /* 1. One mirror and one large lantern. */
    {
      place: 'room', say: 'turn', window: ROOM, sun: [0.5, 0.9], aim: [6.6, 6.6],
      blocks: [CHEST, BED, SHELF],
      mirrors: [{ at: [6.6, 6.6], face: -120, mount: 'floor' }],
      targets: [{ kind: 'lantern', at: [9.8, 2.3], r: 0.6, hang: true, way: [0] }],
    },
    /* 2. Three lanterns, one mirror. */
    {
      place: 'room', say: 'turn', window: ROOM, sun: [0.5, 0.9], aim: [7.2, 6.9],
      blocks: [CHEST, BED, SHELF],
      mirrors: [{ at: [7.2, 6.9], face: -158, mount: 'floor' }],
      targets: [
        { kind: 'lantern', at: [4.2, 2.2], r: 0.46, hang: true, way: [0] },
        { kind: 'lantern', at: [8.8, 1.9], r: 0.46, hang: true, way: [0] },
        { kind: 'lantern', at: [12.2, 3.4], r: 0.46, hang: true, way: [0] },
      ],
    },
    /* 3. A small target far away: the solar panel on the shelf. */
    {
      place: 'room', say: 'panel', window: ROOM, sun: [0.45, 0.7], aim: [6.2, 7],
      blocks: [CHEST, BED, SHELF],
      mirrors: [{ at: [6.2, 7], face: -95, mount: 'floor' }],
      targets: [{ kind: 'panel', at: [11.9, 4.2], r: 0.36, tilt: 154, rest: 5, way: [0] }],
    },
    /* 4. A bookcase in the way; the second mirror is bolted in place. */
    {
      place: 'room', say: 'mirrors', window: ROOM, sun: [0.45, 0.6], aim: [5.6, 6.6],
      blocks: [CHEST, BED, SHELF, { x: 7.35, y: 4.4, w: 0.5, h: 5, look: 'bookcase' }, { x: 9.15, y: 7.72, w: 0.9, h: 1.68, look: 'nightstand' }, { x: 9.3, y: 7.17, w: 0.6, h: 0.55, look: 'pot' }],
      mirrors: [{ at: [5.6, 6.6], face: -70, mount: 'floor' }, { at: [7.6, 3.2], face: 90, fixed: true, mount: 'wall' }],
      targets: [{ kind: 'bud', at: [9.6, 6.6], r: 0.45, way: [0, 1] }],
    },
    /* 5. Two mirrors to turn, and a column in the way. */
    {
      place: 'court', say: 'mirrors', window: COURT, sun: [13.5, 0.8], aim: [8, 6.6],
      blocks: [{ x: 5.3, y: 4.2, w: 0.6, h: 5.2, look: 'column' }, { x: 2.7, y: 6.75, w: 1, h: 2.65, look: 'pedestal' }],
      mirrors: [{ at: [8, 6.6], face: -110, mount: 'floor' }, { at: [5.6, 2.6], face: 75, mount: 'ceiling' }],
      targets: [{ kind: 'lantern', at: [3.2, 6.2], r: 0.5, way: [0, 1] }],
    },
    /* 6. A mirror on a rail: it is moved into the light, then turned. */
    {
      place: 'court', say: 'slide', window: COURT, sun: [13.55, 0.6], aim: [7, 9.4],
      blocks: [{ x: 1.9, y: 6.12, w: 1.4, h: 3.28, look: 'planter' }, { x: 2.3, y: 5.57, w: 0.6, h: 0.55, look: 'pot' }],
      mirrors: [{ at: [4.6, 7], rail: [10.4, 7], slide: 0, face: -60, mount: 'floor' }],
      targets: [{ kind: 'bud', at: [2.6, 5], r: 0.45, way: [0] }],
    },
    /* 7. A lantern that goes slowly along a rail. */
    {
      place: 'court', say: 'turn', window: COURT, sun: [13.5, 0.8], aim: [6.6, 7],
      blocks: [],
      mirrors: [{ at: [6.6, 7], face: -120, mount: 'floor' }],
      targets: [{ kind: 'lantern', at: [2.6, 2.6], rail: [8.6, 2.6], secs: 34, r: 0.5, hang: true, way: [0] }],
    },
    /* 8. Round a pier with three mirrors. */
    {
      place: 'court', say: 'mirrors', window: COURT, sun: [13.5, 0.8], aim: [8.6, 6.8],
      blocks: [{ x: 5.6, y: 3.2, w: 1.8, h: 6.2, look: 'pier' }, { x: 3.9, y: 7.75, w: 1, h: 1.65, look: 'pedestal' }],
      mirrors: [{ at: [8.6, 6.8], face: -60, mount: 'floor' }, { at: [8.6, 2.4], face: 110, mount: 'ceiling' }, { at: [4.4, 2.4], face: 70, mount: 'ceiling' }],
      targets: [{ kind: 'lantern', at: [4.4, 7.2], r: 0.5, way: [0, 1, 2] }],
    },
    /* 9. Four flower buds, in any order; one hides behind a wall. */
    {
      place: 'court', say: 'flower', window: COURT, sun: [13.5, 0.8], aim: [6.4, 6.4],
      blocks: [
        { x: 8.1, y: 6.6, w: 0.6, h: 2.8, look: 'wall' },
        { x: 1.4, y: 8.44, w: 1.6, h: 0.96, look: 'planter' }, { x: 1.9, y: 7.94, w: 0.6, h: 0.5, look: 'pot' },
        { x: 0.4, y: 5.44, w: 1.5, h: 0.2, look: 'ledge' }, { x: 1, y: 4.94, w: 0.6, h: 0.5, look: 'pot' },
        { x: 0.4, y: 3.04, w: 1.5, h: 0.2, look: 'ledge' }, { x: 1, y: 2.54, w: 0.6, h: 0.5, look: 'pot' },
        { x: 9.9, y: 8.84, w: 0.6, h: 0.56, look: 'pot' },
      ],
      mirrors: [{ at: [6.4, 6.4], face: -60, mount: 'floor' }, { at: [10.9, 4.9], face: 131.6, fixed: true, mount: 'wall' }],
      targets: [
        { kind: 'bud', at: [2.2, 7.4], r: 0.42, way: [0] },
        { kind: 'bud', at: [1.3, 4.4], r: 0.42, way: [0] },
        { kind: 'bud', at: [1.3, 2], r: 0.42, way: [0] },
        { kind: 'bud', at: [10.2, 8.3], r: 0.42, way: [0, 1] },
      ],
    },
    /* 10. Two wells; the upper mirror rides a rail above them. */
    {
      place: 'cellar', say: 'crystal', window: CELLAR, sun: [0.45, 0.45], aim: [5.2, 7],
      lamps: [[3.3, 4.3], [9.95, 4.3], [13.1, 4.3]],
      blocks: [
        { x: 7.2, y: 5.6, w: 0.5, h: 3.8, look: 'wall' }, { x: 8.9, y: 5.6, w: 0.5, h: 3.8, look: 'wall' },
        { x: 10.6, y: 5.6, w: 0.5, h: 3.8, look: 'wall' }, { x: 12.3, y: 5.6, w: 0.5, h: 3.8, look: 'wall' },
        { x: 7.95, y: 8.42, w: 0.7, h: 0.98, look: 'plinth' }, { x: 11.3, y: 8.45, w: 0.8, h: 0.95, look: 'plinth' },
      ],
      mirrors: [{ at: [5.2, 7], face: -110, mount: 'floor' }, { at: [6.6, 2.6], rail: [12.4, 2.6], slide: 0, face: 100, mount: 'ceiling' }],
      targets: [{ kind: 'crystal', at: [8.3, 7.9], r: 0.4, way: [0, 1] }, { kind: 'lantern', at: [11.7, 7.9], r: 0.45, way: [0, 1] }],
    },
    /* 11. A crystal, a lantern behind a wall, and a lantern that moves above a gallery. */
    {
      place: 'cellar', say: 'mirrors', window: CELLAR, sun: [0.45, 0.45], aim: [5.2, 7],
      lamps: [[3.2, 4.6], [8, 5.2], [10.1, 5.2]],
      blocks: [
        { x: 6.6, y: 3.6, w: 7, h: 0.4, look: 'gallery' },
        { x: 8.95, y: 7.45, w: 0.9, h: 1.95, look: 'barrel' },
        { x: 11, y: 5.6, w: 0.5, h: 3.8, look: 'wall' }, { x: 12, y: 8.75, w: 0.8, h: 0.65, look: 'plinth' },
      ],
      mirrors: [{ at: [5.2, 7], face: -48, mount: 'floor' }, { at: [5.6, 3], face: -20, mount: 'ceiling' }, { at: [12.6, 4.8], face: 128.4, fixed: true, mount: 'wall' }],
      targets: [
        { kind: 'crystal', at: [9.4, 7], r: 0.36, way: [0] },
        { kind: 'lantern', at: [12.4, 8.2], r: 0.45, way: [0, 2] },
        { kind: 'lantern', at: [8.6, 1.6], rail: [12.4, 1.6], secs: 30, r: 0.48, hang: true, way: [0, 1] },
      ],
    },
    /* 12. The last: a crystal, then the great lantern by three mirrors. */
    {
      place: 'cellar', say: 'mirrors', window: CELLAR, sun: [0.45, 0.45], aim: [7.3, 9.4],
      lamps: [[3.4, 3.4], [5.9, 4.9], [10.6, 2.6], [12.9, 2.9], [10.9, 6.6], [13, 8.2]],
      blocks: [
        { x: 7.6, y: 4.2, w: 0.5, h: 5.2, look: 'wall' }, { x: 7.6, y: 4.2, w: 2.4, h: 0.45, look: 'gallery' },
        { x: 2.5, y: 6.45, w: 1, h: 2.95, look: 'barrel' }, { x: 8.9, y: 8.65, w: 1, h: 0.75, look: 'plinth' },
      ],
      mirrors: [
        { at: [4.4, 7.2], rail: [6.4, 7.2], slide: 0, face: -150, mount: 'floor' },
        { at: [8.6, 2], face: 83.3, fixed: true, mount: 'wall' },
        { at: [12.2, 5.6], face: 200, mount: 'floor' },
      ],
      targets: [{ kind: 'crystal', at: [3, 6], r: 0.34, way: [0] }, { kind: 'lantern', at: [9.4, 8], r: 0.55, way: [0, 1, 2] }],
    },
  ];
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { engine: lightEngine, levels: LIGHT_LEVELS };

/* THE PAGE */
if (typeof document !== 'undefined') (() => {
  const E = lightEngine;
  const LEVELS = LIGHT_LEVELS;
  const $ = (id) => document.getElementById(id);
  const KEY = 'light';
  const SAVE = 1;
  const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
  const STILL = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* What the child sees and hears. The parents approve every line. */
  const TEXT = {
    turn: { text: 'أَدِرِ الْمِرْآةَ لِيَصِلَ الضَّوْءُ إِلَى الْفَانُوسِ', clip: 'light-turn' },
    flower: { text: 'أَوْصِلِ الضَّوْءَ إِلَى الزَّهْرَةِ', clip: 'light-flower' },
    panel: { text: 'أَوْصِلِ الضَّوْءَ إِلَى اللَّوْحِ الشَّمْسِيِّ', clip: 'light-panel' },
    crystal: { text: 'أَوْصِلِ الضَّوْءَ إِلَى الْبِلَّوْرَةِ', clip: 'light-crystal' },
    mirrors: { text: 'الضَّوْءُ يَنْعَكِسُ مِنْ مِرْآةٍ إِلَى مِرْآةٍ', clip: 'light-mirrors' },
    slide: { text: 'حَرِّكِ الْمِرْآةَ وَأَدِرْهَا', clip: 'light-slide' },
    reflection: { text: 'اِنْعِكَاسٌ', clip: 'light-reflection' },
    praise: { text: 'أحسنت', clip: 'well-done' },
    last: { text: 'مَا شَاءَ اللَّهُ', clip: 'mashaallah' },
  };

  /* Seconds. */
  const AFTER = 0.9; // a finished level rests before its praise
  const PRAISE = 1.8; // the praise, before the next level
  const VEIL = 0.4; // one level fading into the next
  const WORD = 2.6; // the word in its pill
  const LAMP = 0.4; // from one lamp of the last level to the next
  const LINGER = 1.4; // the angles stay this long after a mirror is let go
  const PATIENCE = 6; // the longest wait for a recording to end
  const BREATH = 1.6; // one breath of the mirror that helps next
  const PANEL = 0.08; // how thick the dark face of a solar panel is
  const LEVER = 1.5; // the shortest handle a mirror is turned by, see lever()

  const INK = '#2B1F16';
  const GOLD = '#F2B84B';
  const TAU = Math.PI * 2;
  const RAD = Math.PI / 180;
  const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const wrap = (a) => a - TAU * Math.floor((a + Math.PI) / TAU); // an angle between -π and π
  const delay = (seconds) => new Promise((done) => setTimeout(done, seconds * 1000));
  const STEP = '<svg viewBox="0 0 24 30" aria-hidden="true"><path d="M12 1.5v3.5M8.2 8q3.8-5.4 7.6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect class="glass" x="6.2" y="8" width="11.6" height="14.5" rx="4.2" stroke="currentColor" stroke-width="2"/><path d="M9.2 22.8h5.6l-1 4.2h-3.6z" fill="currentColor"/></svg>';

  const root = $('light');
  const board = $('board');
  const frame = $('room');
  const canvas = $('scene');
  const ctx = canvas.getContext('2d');
  const backdrop = document.createElement('canvas'); // the place, painted once for each level and size
  const shade = document.createElement('canvas'); // the dark, with holes where there is light
  const shadeCtx = shade.getContext('2d');

  let reached = 0; // levels finished, kept on the device
  let index = 0; // the level that is open
  let level = null;
  let look = null; // its place's colors
  let inside = null; // its room's inner faces
  let mirrors = []; // [{face, slide}]
  let touched = []; // for each mirror, whether it has been turned and slid
  let targets = []; // [{fill, done, life, lit, glow, spin, angle, heading}]
  let beam = null; // the beam as it is now
  let places = []; // where the targets are now
  let clock = 0; // seconds since the level opened
  let hold = null; // the finger on a mirror: {id, i, mode, ...}
  let active = 0; // the mirror the keys turn
  let since = Infinity; // seconds since a mirror was last moved
  let marks = 0; // how strongly the angles show
  let lift = -1; // seconds into the last level's lamps lighting, or -1
  let told = false; // whether the word for it has been shown
  let away = false; // between two levels
  let run = 0; // counts the levels opened, so that what an older one still owed is dropped
  let talk = Promise.resolve(); // the lines being said, one after another
  let word = Promise.resolve(); // the word in its pill, until it is gone
  let awake = false; // whether the page has been touched, so that it may speak
  let owed = ''; // a line to say at the first touch
  let rang = -Infinity; // when the shimmer last sounded
  let fit = null; // the picture on the screen: pixels to a unit, size, pixel ratio
  let grain = 1; // how sharp the picture is drawn: less on a device that draws it too slowly
  let lag = 0; // milliseconds of late frames lately
  let calm = 0; // late frames are not counted before this time: a page that has just opened is busy
  let raf = 0;
  let last = 0;

  /* A recorded line, in the family's dialect; silent while it is not recorded.
     Lines are said one after another, never one over another, and a line that
     a level still owed when it closed is dropped. The promise ends when the
     line has been said, or after PATIENCE seconds if it has not ended by then. */
  function speak(clip) {
    const mine = run;
    talk = talk.then(() => (mine === run ? Promise.race([sound.say(clip), delay(PATIENCE)]) : null)).catch(() => {});
    return talk;
  }

  /* The page may not speak before it is touched: a line owed is said then. */
  function sayLine() {
    const { clip } = TEXT[level.say];
    if (awake) speak(clip);
    else owed = clip;
  }

  /* A soft shimmer as a target begins to fill. An older saved copy of sound.js has no tone(). */
  function shimmer() {
    if (clock - rang < 0.7 || typeof sound.tone !== 'function') return;
    rang = clock;
    sound.tone(1760, 0, 0.14, 0.022);
    sound.tone(2637, 0.05, 0.16, 0.016);
  }

  /* Saved on the device: how many levels are finished. */
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: SAVE, level: reached }));
    } catch {
      // Private browsing: it lasts for this visit only.
    }
  }

  function load() {
    try {
      const kept = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (kept && kept.v === SAVE && Number.isInteger(kept.level) && kept.level >= 0) reached = Math.min(kept.level, LEVELS.length);
    } catch {
      reached = 0;
    }
  }

  /* The strip of small lanterns: one for each level, lit when it is finished. */
  function paintSteps() {
    const steps = $('steps');
    if (steps.children.length !== LEVELS.length) steps.innerHTML = LEVELS.map(() => `<i>${STEP}</i>`).join('');
    [...steps.children].forEach((item, n) => {
      item.className = `${n < reached ? 'on' : ''}${n === index ? ' now' : ''}`;
    });
  }

  /* A word in its pill at the top of the room, shown and said: it stays for a
     moment, and until it has been said. */
  function showWord(entry) {
    const mine = run;
    const pill = $('word');
    pill.textContent = entry.text;
    pill.hidden = false;
    word = Promise.all([delay(WORD), speak(entry.clip)]).then(() => {
      if (mine === run) pill.hidden = true;
    });
  }

  function showPraise(entry) {
    const praise = $('praise');
    praise.textContent = entry.text;
    praise.hidden = false;
    return speak(entry.clip);
  }

  /* A level opens: its mirrors as the data has them, its targets asleep. */
  function open(n) {
    run += 1;
    index = clamp(n, 0, LEVELS.length - 1);
    level = LEVELS[index];
    look = LOOKS[level.place];
    inside = E.room(level);
    mirrors = E.resting(level).map((state, i) => ({ face: E.turned(level.mirrors[i], state.face), slide: state.slide }));
    touched = level.mirrors.map(() => ({ turn: false, slide: false }));
    targets = level.targets.map(() => ({ fill: 0, done: false, life: 0, lit: false, glow: 0, spin: 0, angle: 0, heading: [1, 0] }));
    active = Math.max(0, level.mirrors.findIndex((mirror) => !mirror.fixed));
    clock = 0;
    hold = null;
    since = Infinity;
    marks = index < 3 ? 1 : 0;
    lift = -1;
    rang = -Infinity;
    away = false;
    if (index === 0) told = false;
    $('word').hidden = true;
    $('praise').hidden = true;
    $('again').hidden = true;
    // A speaker mark in its place when the Egyptian recording is the one said
    // (the father's rule, 2026-11-25); a tap on it says the line again.
    if (typeof sound.caption === 'function') sound.caption($('line'), TEXT[level.say].text, TEXT[level.say].clip, { mark: true });
    else $('line').textContent = TEXT[level.say].text;
    frame.classList.remove('away');
    paintSteps();
    see();
    paintBackdrop();
    draw();
    sayLine();
    go();
  }

  /* The beam and the targets as they are at this moment. */
  function see() {
    places = E.spots(level, clock);
    beam = E.trace(level, mirrors, places);
    const data = level.targets[beam.target];
    if (!data || data.kind !== 'panel') return;
    // A panel is flat: inside its disc the beam goes on to the panel's face.
    const n = E.unit(data.tilt);
    const d = beam.heading;
    const end = beam.points[beam.points.length - 1];
    const closing = d[0] * n[0] + d[1] * n[1];
    if (closing > -1e-6) return;
    const c = places[beam.target];
    const far = ((c[0] + n[0] * PANEL - end[0]) * n[0] + (c[1] + n[1] * PANEL - end[1]) * n[1]) / closing;
    if (far > 0 && far < 2 * data.r) beam.points[beam.points.length - 1] = [end[0] + d[0] * far, end[1] + d[1] * far];
  }

  /* A target has had its light: the chime, and it comes alive. */
  function finish(j) {
    const target = targets[j];
    target.done = true;
    target.fill = 1;
    sound.chime();
    if (index === 0 && !told) {
      told = true;
      showWord(TEXT.reflection);
    }
    if (targets.every((each) => each.done)) win();
  }

  /* Every target of the level is lit: the praise, then the next level by
     itself. After the last level every lamp of the cellar lights in turn. */
  async function win() {
    const mine = run;
    const final = index === LEVELS.length - 1;
    reached = Math.max(reached, index + 1);
    save();
    paintSteps();
    if (final) lift = 0;
    await Promise.all([delay(AFTER + (final ? (level.lamps || []).length * LAMP + 0.5 : 0)), talk, word]);
    if (mine !== run) return;
    await Promise.all([delay(PRAISE), showPraise(final ? TEXT.last : TEXT.praise)]);
    if (mine !== run) return;
    if (final) {
      $('again').hidden = false;
      return;
    }
    away = true;
    hold = null;
    frame.classList.add('away');
    await delay(VEIL);
    if (mine !== run) return;
    open(index + 1);
  }

  function startOver() {
    reached = 0;
    save();
    sound.stop();
    open(0);
  }

  /* Time passing. */
  function update(dt) {
    clock += dt;
    since += dt;
    see();
    level.targets.forEach((data, j) => {
      const target = targets[j];
      target.lit = beam.target === j;
      if (target.lit) target.heading = beam.heading;
      if (!target.done) {
        if (target.lit && target.fill === 0) shimmer();
        target.fill = E.soak(target.fill, target.lit, dt);
        if (target.fill >= 1) finish(j);
      } else if (target.life < 1) {
        target.life = Math.min(1, target.life + dt / 1.1);
      }
      target.glow = clamp(target.glow + (target.lit ? dt : -dt) * 4);
      if (data.kind === 'panel') {
        target.spin = clamp(target.spin + (target.lit ? dt / 0.7 : -dt / 2.2));
        target.angle += target.spin * 9 * dt;
      }
    });
    const show = index < 3 || hold !== null || since < LINGER;
    marks = clamp(marks + (show ? dt : -dt) * 4);
    if (lift >= 0) lift += dt;
  }

  /* The mirror, or the foot on a rail, that helps next: the first one in the
     level's order that has not been touched. */
  function hint() {
    if (away || targets.every((target) => target.done)) return null;
    for (let i = 0; i < level.mirrors.length; i++) {
      const mirror = level.mirrors[i];
      if (mirror.fixed) continue;
      if (mirror.rail && !touched[i].slide) return { i, mode: 'slide' };
      if (!touched[i].turn) return { i, mode: 'turn' };
    }
    return null;
  }

  /* Where a mirror's stand ends: on the floor or at the ceiling. */
  const standEnd = (mirror) => (mirror.mount === 'ceiling' ? inside.y0 : inside.y1);
  /* The foot of a mirror on a rail, which is dragged to slide it. */
  function foot(i) {
    const mirror = level.mirrors[i];
    const p = E.pivot(mirror, mirrors[i].slide);
    return [p[0], standEnd(mirror) + (mirror.mount === 'ceiling' ? 0.17 : -0.17)];
  }

  /* How far from the pivot a finger must be for the mirror to turn exactly as
     far as the finger goes round it. A finger nearer than this turns the
     mirror by less than its own angle, as if it held a handle of this length:
     at the mirror's very edge the smallest move would otherwise swing the beam
     across the room, and no small hand could rest it on a target. */
  const lever = () => Math.max(LEVER, 140 / fit.s);

  /* The finger down, moving and up, in the picture's units: the pointer
     handlers and the test hook both come through here. A touch takes the
     nearest mirror that can move, however far it is; near the foot of one on
     a rail, it takes the foot. A second finger is ignored. */
  function press(x, y, id) {
    if (hold || away || !fit) return false;
    let best = null;
    level.mirrors.forEach((mirror, i) => {
      if (mirror.fixed) return;
      const p = E.pivot(mirror, mirrors[i].slide);
      const far = Math.hypot(x - p[0], y - p[1]);
      if (!best || far < best.far) best = { i, mode: 'turn', far };
      if (!mirror.rail) return;
      const f = foot(i);
      const near = Math.hypot(x - f[0], y - f[1]);
      if (near < Math.max(0.9, 40 / fit.s) && near < far && near <= best.far) best = { i, mode: 'slide', far: near };
    });
    if (!best) return false;
    hold = { id, i: best.i, mode: best.mode, at: [x, y], from: mirrors[best.i].slide, angle: null, turned: 0 };
    active = best.i;
    since = 0;
    drag(x, y, id);
    return true;
  }

  function drag(x, y, id) {
    if (!hold || id !== hold.id) return;
    const mirror = level.mirrors[hold.i];
    const state = mirrors[hold.i];
    since = 0;
    if (hold.mode === 'slide') {
      const dx = mirror.rail[0] - mirror.at[0];
      const dy = mirror.rail[1] - mirror.at[1];
      state.slide = clamp(hold.from + ((x - hold.at[0]) * dx + (y - hold.at[1]) * dy) / (dx * dx + dy * dy));
      // Only a mirror that has really moved has been touched: a tap somewhere in the room leaves it breathing.
      if (Math.abs(state.slide - hold.from) * Math.hypot(dx, dy) > 0.15) touched[hold.i].slide = true;
      return;
    }
    // The mirror turns with the finger as it goes round the pivot. Too near the pivot there is no steady angle.
    const p = E.pivot(mirror, state.slide);
    const far = Math.hypot(x - p[0], y - p[1]);
    if (far < Math.max(0.2, 10 / fit.s)) {
      hold.angle = null;
      return;
    }
    const angle = Math.atan2(y - p[1], x - p[0]);
    if (hold.angle !== null) {
      const by = (wrap(angle - hold.angle) / RAD) * Math.min(1, far / lever());
      state.face = E.turned(mirror, state.face + by);
      hold.turned += Math.abs(by);
      if (hold.turned > 2) touched[hold.i].turn = true;
    }
    hold.angle = angle;
  }

  function release(id) {
    if (!hold || id !== hold.id) return;
    hold = null;
    since = 0;
  }

  /* On a computer: the arrows turn the mirror last touched (with Shift, finely),
     up and down slide one on a rail, and the space bar goes to the next mirror. */
  function key(name, fine) {
    if (away || !level) return false;
    const movable = level.mirrors.map((mirror, i) => (mirror.fixed ? -1 : i)).filter((i) => i >= 0);
    if (!movable.length) return false;
    if (!movable.includes(active)) [active] = movable;
    const mirror = level.mirrors[active];
    const state = mirrors[active];
    if (name === ' ') {
      active = movable[(movable.indexOf(active) + 1) % movable.length];
    } else if (name === 'ArrowLeft' || name === 'ArrowRight') {
      state.face = E.turned(mirror, state.face + (name === 'ArrowRight' ? 1 : -1) * (fine ? 0.2 : 1));
      touched[active].turn = true;
    } else if ((name === 'ArrowUp' || name === 'ArrowDown') && mirror.rail) {
      state.slide = clamp(state.slide + (name === 'ArrowUp' ? 1 : -1) * (fine ? 0.004 : 0.02));
      touched[active].slide = true;
    } else {
      return false;
    }
    since = 0;
    return true;
  }

  /* THE PICTURE. Everything is drawn in the picture's own units. */

  /* The three places: the sky and the ground outdoors, the walls where they
     are cut, the dark indoors, and the colors of the angles. */
  const LOOKS = {
    room: {
      sky: ['#8EC5EC', '#E4F2F9'], ground: '#9CBF78', cut: '#6A5444', trim: '#8E6A4E', wood: '#9A6238',
      dark: 0.12, normal: 'rgba(43,31,22,.8)', arc: '#0F6E64', arcFill: 'rgba(22,138,125,.3)',
      stone: ['#D8C3A0', '#B99E77', '#EADBBF'],
    },
    court: {
      sky: ['#86BDE6', '#F7E6C2'], ground: '#D9BC8A', cut: '#8A6E52', trim: '#B0916C', wood: '#8E5529',
      dark: 0.1, normal: 'rgba(43,31,22,.8)', arc: '#0F6E64', arcFill: 'rgba(22,138,125,.3)',
      stone: ['#D6BD92', '#B4966B', '#EBD9B6'],
    },
    cellar: {
      sky: ['#8EC5EC', '#E4F2F9'], ground: '#7A5A3C', cut: '#3D352E', trim: '#5A4E43', wood: '#7A5230',
      dark: 0.7, normal: 'rgba(255,255,255,.85)', arc: '#9FF0E2', arcFill: 'rgba(143,232,218,.3)',
      stone: ['#857A6C', '#62594F', '#9C9082'],
    },
  };

  function rounded(g, x, y, w, h, r) {
    const k = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + k, y);
    g.arcTo(x + w, y, x + w, y + h, k);
    g.arcTo(x + w, y + h, x, y + h, k);
    g.arcTo(x, y + h, x, y, k);
    g.arcTo(x, y, x + w, y, k);
    g.closePath();
  }
  function fill(g, color) {
    g.fillStyle = color;
    g.fill();
  }
  function stroke(g, color, width) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.stroke();
  }
  function disc(g, x, y, r, color) {
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    fill(g, color);
  }
  function box(g, x, y, w, h, color, r = 0) {
    if (r) rounded(g, x, y, w, h, r);
    else {
      g.beginPath();
      g.rect(x, y, w, h);
    }
    fill(g, color);
  }
  function trail(g, points) {
    g.beginPath();
    g.moveTo(points[0][0], points[0][1]);
    for (let k = 1; k < points.length; k++) g.lineTo(points[k][0], points[k][1]);
  }
  /* An eight-pointed star: two squares, one turned. */
  function star(g, x, y, r, color) {
    g.fillStyle = color;
    for (const tilt of [0, Math.PI / 4]) {
      g.beginPath();
      for (let k = 0; k < 4; k++) g.lineTo(x + r * Math.cos(tilt + k * Math.PI / 2), y + r * Math.sin(tilt + k * Math.PI / 2));
      g.closePath();
      g.fill();
    }
  }
  /* Light from a point, fading outward. */
  function glow(g, x, y, r, inner, outer) {
    const light = g.createRadialGradient(x, y, 0, x, y, r);
    light.addColorStop(0, inner);
    light.addColorStop(1, outer);
    g.fillStyle = light;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  /* Courses of stone in a box. */
  function masonry(g, b, [face, joint, pale], high, stripes) {
    box(g, b.x, b.y, b.w, b.h, face);
    g.save();
    g.beginPath();
    g.rect(b.x, b.y, b.w, b.h);
    g.clip();
    for (let y = b.y, row = 0; y < b.y + b.h; y += high, row++) {
      if (stripes && row % 2) box(g, b.x, y, b.w, high, stripes);
      g.beginPath();
      g.moveTo(b.x, y);
      g.lineTo(b.x + b.w, y);
      for (let x = b.x + (row % 2 ? high * 0.9 : high * 1.8); x < b.x + b.w - 0.1; x += high * 1.8) {
        g.moveTo(x, y);
        g.lineTo(x, y + high);
      }
      stroke(g, joint, 0.03);
    }
    box(g, b.x, b.y, b.w, 0.06, pale);
    g.restore();
    g.beginPath();
    g.rect(b.x, b.y, b.w, b.h);
    stroke(g, INK, 0.035);
  }

  /* The things that stop the beam, each drawn inside its own box. */
  const BLOCKS = {
    chest(g, b) {
      box(g, b.x, b.y, b.w, b.h, '#B5713C', 0.08);
      stroke(g, INK, 0.035);
      box(g, b.x + 0.2, b.y, 0.16, b.h, '#8E5529');
      box(g, b.x + b.w - 0.36, b.y, 0.16, b.h, '#8E5529');
      g.beginPath();
      g.moveTo(b.x, b.y + b.h * 0.34);
      g.lineTo(b.x + b.w, b.y + b.h * 0.34);
      stroke(g, INK, 0.035);
      box(g, b.x + b.w / 2 - 0.09, b.y + b.h * 0.34 - 0.04, 0.18, 0.2, '#E3B341', 0.03);
      star(g, b.x + b.w / 2, b.y + b.h * 0.72, 0.13, '#E3B341');
    },
    bed(g, b) {
      box(g, b.x, b.y + b.h * 0.5, b.w, b.h * 0.5, '#A8743F', 0.05);
      stroke(g, INK, 0.035);
      box(g, b.x + 0.04, b.y + b.h * 0.22, b.w - 0.08, b.h * 0.34, '#F3EBDD', 0.08);
      stroke(g, INK, 0.03);
      box(g, b.x + 0.04, b.y + b.h * 0.1, b.w * 0.66, b.h * 0.46, '#C8553D', 0.1);
      stroke(g, INK, 0.03);
      box(g, b.x + 0.04, b.y + b.h * 0.1, b.w * 0.66, 0.09, '#F2D9A0', 0.04);
      for (let x = b.x + 0.4; x < b.x + b.w * 0.66; x += 0.52) star(g, x, b.y + b.h * 0.38, 0.09, '#F2D9A0');
      box(g, b.x + b.w - 0.98, b.y, 0.9, b.h * 0.3, '#FFFFFF', 0.12);
      stroke(g, INK, 0.03);
    },
    shelf(g, b) {
      box(g, b.x, b.y, b.w, b.h, '#A8743F');
      stroke(g, INK, 0.03);
      box(g, b.x, b.y, b.w, 0.05, '#C99363');
    },
    bookcase(g, b) {
      box(g, b.x, b.y, b.w, b.h, '#9A6238');
      stroke(g, INK, 0.035);
      box(g, b.x, b.y, b.w, 0.14, '#7C4B28');
      box(g, b.x, b.y + b.h - 0.2, b.w, 0.2, '#7C4B28');
      for (let y = b.y + 0.9; y < b.y + b.h - 0.6; y += 1.1) {
        box(g, b.x + 0.07, y - 0.36, b.w - 0.14, 0.72, '#8A5630', 0.04);
        star(g, b.x + b.w / 2, y, 0.14, '#D9A866');
      }
    },
    nightstand(g, b) {
      box(g, b.x, b.y, b.w, b.h, '#B5713C');
      stroke(g, INK, 0.035);
      box(g, b.x - 0.03, b.y, b.w + 0.06, 0.12, '#8E5529');
      rounded(g, b.x + 0.1, b.y + 0.24, b.w - 0.2, 0.4, 0.04);
      stroke(g, INK, 0.03);
      disc(g, b.x + b.w / 2, b.y + 0.44, 0.045, '#E3B341');
      rounded(g, b.x + 0.1, b.y + 0.78, b.w - 0.2, b.h - 0.94, 0.04);
      stroke(g, INK, 0.03);
      disc(g, b.x + b.w - 0.22, b.y + 0.78 + (b.h - 0.94) / 2, 0.045, '#E3B341');
    },
    pot(g, b) {
      g.beginPath();
      g.moveTo(b.x, b.y);
      g.lineTo(b.x + b.w, b.y);
      g.lineTo(b.x + b.w - 0.05, b.y + b.h);
      g.lineTo(b.x + 0.05, b.y + b.h);
      g.closePath();
      fill(g, '#C4694A');
      stroke(g, INK, 0.03);
      box(g, b.x, b.y, b.w, 0.12, '#D98363');
      g.beginPath();
      g.rect(b.x, b.y, b.w, 0.12);
      stroke(g, INK, 0.03);
    },
    column(g, b, stone) {
      box(g, b.x, b.y, b.w, b.h, stone[0]);
      box(g, b.x + b.w * 0.62, b.y, b.w * 0.38, b.h, stone[1]);
      g.beginPath();
      g.rect(b.x, b.y, b.w, b.h);
      stroke(g, INK, 0.035);
      box(g, b.x, b.y, b.w, 0.3, stone[2]);
      box(g, b.x, b.y + b.h - 0.34, b.w, 0.34, stone[2]);
      for (const y of [b.y, b.y + b.h - 0.34]) {
        g.beginPath();
        g.rect(b.x, y, b.w, y === b.y ? 0.3 : 0.34);
        stroke(g, INK, 0.03);
      }
    },
    pedestal(g, b, stone) {
      masonry(g, b, stone, 0.62);
      box(g, b.x, b.y, b.w, 0.16, stone[2]);
      g.beginPath();
      g.rect(b.x, b.y, b.w, 0.16);
      stroke(g, INK, 0.03);
    },
    plinth(g, b, stone) {
      box(g, b.x, b.y, b.w, b.h, stone[0]);
      box(g, b.x, b.y, b.w, 0.12, stone[2]);
      g.beginPath();
      g.rect(b.x, b.y, b.w, b.h);
      stroke(g, INK, 0.035);
    },
    planter(g, b, stone) {
      masonry(g, b, stone, 0.5);
      box(g, b.x, b.y, b.w, 0.14, '#6B4A32');
      g.beginPath();
      g.rect(b.x, b.y, b.w, 0.14);
      stroke(g, INK, 0.03);
    },
    pier(g, b, stone, place) {
      masonry(g, b, stone, 0.62, place === 'court' ? '#C8805F' : '');
    },
    wall(g, b, stone) {
      masonry(g, b, stone, 0.48);
    },
    ledge(g, b, stone) {
      box(g, b.x, b.y, b.w, b.h, stone[2]);
      stroke(g, INK, 0.03);
    },
    gallery(g, b, stone) {
      box(g, b.x, b.y, b.w, b.h, stone[0]);
      box(g, b.x, b.y, b.w, 0.1, stone[2]);
      for (let x = b.x + 0.35; x < b.x + b.w - 0.2; x += 0.7) box(g, x, b.y + b.h - 0.2, 0.22, 0.2, stone[1]);
      g.beginPath();
      g.rect(b.x, b.y, b.w, b.h);
      stroke(g, INK, 0.035);
    },
    barrel(g, b) {
      box(g, b.x, b.y, b.w, b.h, '#8A5A33', 0.1);
      stroke(g, INK, 0.035);
      g.beginPath();
      for (let x = b.x + b.w / 4; x < b.x + b.w - 0.05; x += b.w / 4) {
        g.moveTo(x, b.y + 0.04);
        g.lineTo(x, b.y + b.h - 0.04);
      }
      stroke(g, 'rgba(43,31,22,.35)', 0.025);
      for (const part of [0.12, 0.5, 0.88]) {
        box(g, b.x, b.y + b.h * part - 0.07, b.w, 0.14, '#4E5560');
        g.beginPath();
        g.rect(b.x, b.y + b.h * part - 0.07, b.w, 0.14);
        stroke(g, INK, 0.025);
      }
    },
  };

  /* The sky's colors, from the top of the picture to its foot. */
  function sky(g) {
    const colors = g.createLinearGradient(0, 0, 0, E.H);
    colors.addColorStop(0, look.sky[0]);
    colors.addColorStop(1, look.sky[1]);
    return colors;
  }

  /* Outdoors, beside the window: the sky, the sun the beam comes from, and the ground. */
  function paintOutdoors(g) {
    const { side, to } = level.window;
    const x = side === 'right' ? E.W - E.SIDE : 0;
    g.save();
    g.beginPath();
    g.rect(x, 0, E.SIDE, E.H);
    g.clip();
    box(g, x, 0, E.SIDE, E.H, sky(g));
    const [sx, sy] = level.sun;
    glow(g, sx, sy, 1.5, 'rgba(255,238,160,.95)', 'rgba(255,238,160,0)');
    disc(g, sx, sy, 0.4, '#FFD45C');
    // A cellar's window is at the level of the ground.
    const top = level.place === 'cellar' ? to + 0.14 : E.H - E.FLOOR;
    if (level.place === 'court') {
      // A minaret far off.
      const mx = x + (side === 'right' ? 1.02 : 0.48);
      box(g, mx - 0.16, 4.6, 0.32, top - 4.6, '#CDB48C');
      box(g, mx - 0.24, 5.5, 0.48, 0.14, '#B79A70');
      g.beginPath();
      g.moveTo(mx - 0.18, 4.6);
      g.quadraticCurveTo(mx - 0.2, 4.2, mx, 3.95);
      g.quadraticCurveTo(mx + 0.2, 4.2, mx + 0.18, 4.6);
      g.closePath();
      fill(g, '#5FA39B');
      box(g, mx - 0.012, 3.7, 0.024, 0.28, '#B79A70');
    }
    box(g, x, top, E.SIDE, E.H - top, look.ground);
    box(g, x, top, E.SIDE, 0.1, level.place === 'court' ? '#C7A877' : '#7DA857');
    g.restore();
  }

  /* The wall behind, in his room: a frieze of stars and tiles on the lower wall. */
  function paintRoom(g, R) {
    const w = R.x1 - R.x0;
    box(g, R.x0, R.y0, w, R.y1 - R.y0, '#A3C3C2');
    box(g, R.x0, R.y0 + 0.3, w, 0.5, '#92B6B6');
    for (let x = R.x0 + 0.5; x < R.x1 - 0.2; x += 0.9) star(g, x, R.y0 + 0.55, 0.15, '#B7D3CF');
    const top = R.y1 - 2.2;
    box(g, R.x0, top, w, 2.2, '#E9DEC6');
    for (let y = top + 0.4, row = 0; y < R.y1 - 0.2; y += 0.6, row++) {
      for (let x = R.x0 + 0.4 + (row % 2) * 0.3, k = 0; x < R.x1 - 0.2; x += 0.6, k++) star(g, x, y, 0.17, (k + row) % 2 ? '#8FBDB6' : '#E6C387');
    }
    box(g, R.x0, top - 0.12, w, 0.12, '#B5713C');
    box(g, R.x0, R.y1 - 0.16, w, 0.16, '#8E5529');
  }

  /* A small lamp in the scenery: on the wall behind, never in the beam's way. */
  function lamp(g, x, y, lit) {
    box(g, x - 0.15, y - 0.2, 0.3, 0.42, lit > 0 ? '#FFE9A6' : '#5E7A80', 0.07);
    stroke(g, '#6E5326', 0.035);
    g.beginPath();
    g.moveTo(x - 0.13, y - 0.2);
    g.quadraticCurveTo(x, y - 0.46, x + 0.13, y - 0.2);
    g.closePath();
    fill(g, '#8A6A2E');
    box(g, x - 0.09, y + 0.22, 0.18, 0.07, '#8A6A2E');
  }

  /* The masjid's courtyard: an arcade of pointed arches, their stones in two
     colors, a lamp hanging in each, and tiles along the foot of the wall. */
  function paintCourt(g, R) {
    const w = R.x1 - R.x0;
    box(g, R.x0, R.y0, w, R.y1 - R.y0, '#E0CAA3');
    const foot = R.y1 - 1.5;
    const spring = R.y0 + 2.9;
    const bay = w / 4;
    for (let k = 0; k < 4; k++) {
      const cx = R.x0 + bay * (k + 0.5);
      const half = bay * 0.37;
      const crown = () => {
        g.lineTo(cx - half, spring);
        g.quadraticCurveTo(cx - half, R.y0 + 1.35, cx, R.y0 + 0.8);
        g.quadraticCurveTo(cx + half, R.y0 + 1.35, cx + half, spring);
      };
      g.beginPath();
      g.moveTo(cx - half, foot);
      crown();
      g.lineTo(cx + half, foot);
      g.closePath();
      const deep = g.createLinearGradient(0, R.y0, 0, foot);
      deep.addColorStop(0, '#9E8263');
      deep.addColorStop(1, '#BDA27C');
      fill(g, deep);
      g.beginPath();
      crown();
      stroke(g, '#F4E6C8', 0.36);
      g.setLineDash([0.32, 0.32]);
      g.beginPath();
      crown();
      stroke(g, '#C8805F', 0.36);
      g.setLineDash([]);
      g.beginPath();
      g.moveTo(cx, R.y0 + 0.98);
      g.lineTo(cx, R.y0 + 1.6);
      stroke(g, '#6E5326', 0.03);
      lamp(g, cx, R.y0 + 2.04, 0);
      box(g, cx - half - 0.14, spring - 0.1, 0.28, 0.2, '#F4E6C8');
      box(g, cx + half - 0.14, spring - 0.1, 0.28, 0.2, '#F4E6C8');
    }
    box(g, R.x0, foot, w, 1.5, '#EFE5CC');
    for (let y = foot + 0.36, row = 0; y < R.y1 - 0.1; y += 0.5, row++) {
      for (let x = R.x0 + 0.3 + (row % 2) * 0.25, k = 0; x < R.x1 - 0.1; x += 0.5, k++) star(g, x, y, 0.15, (k + row) % 2 ? '#5FA39B' : '#3F7F98');
    }
    box(g, R.x0, foot - 0.1, w, 0.1, '#3F7F98');
  }

  /* The cellar: courses of stone, two vaults, and niches with lamps. */
  function paintCellar(g, R) {
    const w = R.x1 - R.x0;
    masonry(g, { x: R.x0, y: R.y0, w, h: R.y1 - R.y0 }, ['#8E8375', 'rgba(46,36,28,.3)', '#8E8375'], 0.8);
    for (const part of [0.26, 0.74]) {
      g.beginPath();
      g.ellipse(R.x0 + w * part, R.y0 + 2.5, w * 0.235, 2.1, 0, Math.PI, TAU);
      stroke(g, '#786D60', 0.32);
    }
    for (const [x, y] of level.lamps || []) {
      g.beginPath();
      g.moveTo(x - 0.4, y + 0.42);
      g.lineTo(x - 0.4, y - 0.3);
      g.quadraticCurveTo(x - 0.4, y - 0.75, x, y - 0.75);
      g.quadraticCurveTo(x + 0.4, y - 0.75, x + 0.4, y - 0.3);
      g.lineTo(x + 0.4, y + 0.42);
      g.closePath();
      fill(g, '#5F564C');
      stroke(g, '#4A423A', 0.04);
      box(g, x - 0.48, y + 0.42, 0.96, 0.1, '#A0958A');
      lamp(g, x, y + 0.12, 0);
    }
  }

  /* The room's walls where they are cut, with the window's frame. */
  function paintShell(g) {
    for (const [x0, y0, x1, y1] of E.shell(level)) box(g, x0, y0, x1 - x0, y1 - y0, look.cut);
    const { side, from, to } = level.window;
    const R = inside;
    g.beginPath();
    g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
    stroke(g, look.trim, 0.05);
    const x = side === 'left' ? E.SIDE : E.W - E.SIDE - E.WALL;
    box(g, x, from, E.WALL, to - from, sky(g));
    box(g, x - 0.07, from - 0.13, E.WALL + 0.14, 0.13, look.wood);
    box(g, x - 0.07, to, E.WALL + 0.14, 0.13, look.wood);
  }

  /* The rails: a mirror's along the floor or the ceiling, a lantern's overhead. */
  function paintRails(g) {
    level.mirrors.forEach((mirror) => {
      if (!mirror.rail) return;
      const up = mirror.mount === 'ceiling';
      const y = standEnd(mirror) + (up ? 0 : -0.1);
      const x0 = Math.min(mirror.at[0], mirror.rail[0]) - 0.62;
      const x1 = Math.max(mirror.at[0], mirror.rail[0]) + 0.62;
      box(g, x0, y, x1 - x0, 0.1, '#8D949B');
      g.beginPath();
      g.rect(x0, y, x1 - x0, 0.1);
      stroke(g, INK, 0.025);
      for (const x of [x0, x1 - 0.1]) box(g, x, up ? y : y - 0.12, 0.1, 0.22, '#4E5560');
    });
    level.targets.forEach((target) => {
      if (!target.rail) return;
      const y = target.at[1] - target.r - 0.72;
      const x0 = Math.min(target.at[0], target.rail[0]) - 0.45;
      const x1 = Math.max(target.at[0], target.rail[0]) + 0.45;
      for (const x of [x0 + 0.1, x1 - 0.1]) box(g, x - 0.035, inside.y0, 0.07, y - inside.y0, '#4E5560');
      box(g, x0, y, x1 - x0, 0.09, '#8D949B');
      g.beginPath();
      g.rect(x0, y, x1 - x0, 0.09);
      stroke(g, INK, 0.025);
    });
  }

  /* The place as it stands, painted once for each level and size. */
  function paintBackdrop() {
    if (!fit || !level) return;
    const g = backdrop.getContext('2d');
    g.setTransform(backdrop.width / E.W, 0, 0, backdrop.height / E.H, 0, 0);
    g.clearRect(0, 0, E.W, E.H);
    box(g, 0, 0, E.W, E.H, look.cut);
    paintOutdoors(g);
    if (level.place === 'room') paintRoom(g, inside);
    else if (level.place === 'court') paintCourt(g, inside);
    else paintCellar(g, inside);
    paintShell(g);
    paintRails(g);
    for (const b of level.blocks || []) (BLOCKS[b.look] || BLOCKS.wall)(g, b, look.stone, level.place);
  }

  /* A lantern: a round glass in a brass cage, the small eye that feels the
     light in its middle. It glows as it fills and shines when it is lit. */
  function drawLantern(g, [x, y], data, target) {
    const { r } = data;
    const shine = Math.max(ease(target.life), 0.4 * target.fill);
    const top = y - r * 1.34;
    if (data.rail) {
      // It hangs from a small trolley on its rail.
      const rail = data.at[1] - r - 0.72;
      g.beginPath();
      g.moveTo(x, top);
      g.lineTo(x, rail + 0.12);
      stroke(g, '#6E5326', 0.04);
      box(g, x - 0.24, rail - 0.05, 0.48, 0.2, '#C4553D', 0.05);
      stroke(g, INK, 0.03);
      disc(g, x - 0.13, rail - 0.03, 0.07, '#3A3A3A');
      disc(g, x + 0.13, rail - 0.03, 0.07, '#3A3A3A');
    } else if (data.hang) {
      g.setLineDash([0.07, 0.05]);
      g.beginPath();
      g.moveTo(x, top);
      g.lineTo(x, inside.y0);
      stroke(g, '#6E5326', 0.05);
      g.setLineDash([]);
    } else {
      box(g, x - r * 0.62, y + r * 0.9, r * 1.24, 0.14, '#8A6A2E', 0.03);
      g.beginPath();
      g.rect(x - r * 0.62, y + r * 0.9, r * 1.24, 0.14);
      stroke(g, INK, 0.025);
    }
    g.beginPath();
    g.moveTo(x - r * 0.6, y - r * 0.78);
    g.quadraticCurveTo(x - r * 0.5, y - r * 1.3, x, top);
    g.quadraticCurveTo(x + r * 0.5, y - r * 1.3, x + r * 0.6, y - r * 0.78);
    g.closePath();
    fill(g, '#B8862B');
    stroke(g, INK, 0.03);
    const glass = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    glass.addColorStop(0, '#9DB7BB');
    glass.addColorStop(1, '#58747A');
    disc(g, x, y, r, glass);
    if (shine > 0) {
      const warm = g.createRadialGradient(x, y, 0, x, y, r);
      warm.addColorStop(0, '#FFFBE0');
      warm.addColorStop(0.6, '#FFD466');
      warm.addColorStop(1, '#F2A33A');
      g.globalAlpha = shine;
      disc(g, x, y, r, warm);
      g.globalAlpha = 1;
    }
    g.beginPath();
    g.ellipse(x, y, r * 0.5, r, 0, 0, TAU);
    g.moveTo(x, y - r);
    g.lineTo(x, y + r);
    g.moveTo(x - r, y);
    g.lineTo(x + r, y);
    stroke(g, '#9A7226', 0.04);
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    stroke(g, INK, 0.035);
    disc(g, x, y, r * 0.2, '#9A7226');
    disc(g, x, y, r * 0.13, shine > 0.5 ? '#FFFDF0' : '#1E2A2E');
  }

  /* A flower: a round bud on its stem, which opens when it has had its light.
     Closed or open, it fills the disc the beam must rest in. */
  function drawBud(g, [x, y], data, target) {
    const { r } = data;
    const open = ease(target.life);
    const baseY = y + mix(r * 0.86, 0, open);
    g.beginPath();
    g.moveTo(x, baseY);
    g.lineTo(x, y + r + 0.14);
    stroke(g, '#4F8A3C', 0.07);
    for (const way of [-1, 1]) {
      g.beginPath();
      g.ellipse(x + way * r * 0.36, y + r * 1.02, r * 0.34, r * 0.12, way * -0.45, 0, TAU);
      fill(g, '#62A04A');
      stroke(g, '#3F7230', 0.02);
    }
    const petals = 7;
    const long = r * mix(1.74 + 0.06 * target.fill, 0.92, open);
    const wide = r * mix(0.46, 0.25, open);
    const spread = mix(9 * RAD, TAU / petals, open);
    for (let k = 0; k < petals; k++) {
      // The outer petals first, the middle one last, so the bud looks wrapped.
      const order = [0, 6, 1, 5, 2, 4, 3][k];
      g.save();
      g.translate(x, baseY);
      g.rotate(-Math.PI / 2 + (order - (petals - 1) / 2) * spread);
      g.beginPath();
      g.ellipse(long * 0.5, 0, long * 0.5, wide, 0, 0, TAU);
      fill(g, order % 2 ? '#F7A3C2' : '#F283AE');
      stroke(g, '#C9547F', 0.02);
      g.restore();
    }
    if (open > 0.3) disc(g, x, y, r * 0.26 * open, '#FFD45C');
    if (open < 1) {
      // The green cup that holds the bud closed.
      g.globalAlpha = 1 - open;
      g.beginPath();
      g.moveTo(x - r * 0.62, y + r * 0.18);
      g.quadraticCurveTo(x - r * 0.6, y + r * 0.9, x, baseY + r * 0.06);
      g.quadraticCurveTo(x + r * 0.6, y + r * 0.9, x + r * 0.62, y + r * 0.18);
      g.quadraticCurveTo(x + r * 0.3, y + r * 0.5, x, y + r * 0.3);
      g.quadraticCurveTo(x - r * 0.3, y + r * 0.5, x - r * 0.62, y + r * 0.18);
      fill(g, '#62A04A');
      stroke(g, '#3F7230', 0.02);
      g.globalAlpha = 1;
    }
  }

  /* A small solar panel on its legs, turned to where the light comes from,
     with a wire to a toy windmill that goes round while the panel is lit. */
  function drawPanel(g, [x, y], data, target) {
    const { r } = data;
    const n = E.unit(data.tilt);
    const t = [-n[1], n[0]];
    const half = r + 0.1;
    const millX = x + 1;
    const hubY = y - 0.1;
    for (const end of [-0.6, 0.6]) {
      g.beginPath();
      g.moveTo(x + t[0] * half * end - n[0] * 0.06, y + t[1] * half * end - n[1] * 0.06);
      g.lineTo(x + t[0] * half * end * 0.5 + 0.12, data.rest);
      stroke(g, '#4E5560', 0.05);
    }
    g.beginPath();
    g.moveTo(x - n[0] * 0.08, y - n[1] * 0.08);
    g.quadraticCurveTo(x + 0.5, data.rest + 0.02, millX, data.rest - 0.06);
    stroke(g, '#3A3A3A', 0.03);
    g.save();
    g.translate(x, y);
    g.rotate(data.tilt * RAD);
    box(g, -0.07, -half, 0.07, 2 * half, '#B8BEC4');
    box(g, 0, -half, PANEL, 2 * half, target.lit ? '#3E78C8' : '#2A4F86');
    g.beginPath();
    for (let k = -3; k <= 3; k++) {
      g.moveTo(0, (half * k) / 4);
      g.lineTo(PANEL, (half * k) / 4);
    }
    stroke(g, '#9CC4F0', 0.02);
    g.beginPath();
    g.rect(-0.07, -half, 0.07 + PANEL, 2 * half);
    stroke(g, INK, 0.03);
    g.restore();
    // The windmill: a stick, a small motor, four blades.
    box(g, millX - 0.035, hubY, 0.07, data.rest - hubY, '#A8743F');
    box(g, millX - 0.12, data.rest - 0.16, 0.24, 0.16, '#4E5560', 0.03);
    g.save();
    g.translate(millX, hubY);
    g.rotate(target.angle);
    ['#D9463A', '#F2B84B', '#35A85A', '#2F86DE'].forEach((color) => {
      g.rotate(Math.PI / 2);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(0.2, -0.26, 0.44, -0.1);
      g.lineTo(0.2, 0.02);
      g.closePath();
      fill(g, color);
      stroke(g, INK, 0.02);
    });
    g.restore();
    disc(g, millX, hubY, 0.06, '#FFFFFF');
    g.beginPath();
    g.arc(millX, hubY, 0.06, 0, TAU);
    stroke(g, INK, 0.02);
  }

  /* A crystal on a small foot: clear, round, cut in facets. */
  function drawCrystal(g, [x, y], data, target) {
    const { r } = data;
    box(g, x - r * 0.5, y + r * 0.94, r, 0.1, '#8A6A2E', 0.03);
    const sides = 10;
    const corner = (k, far) => [x + far * Math.cos((k * TAU) / sides - Math.PI / 2), y + far * Math.sin((k * TAU) / sides - Math.PI / 2)];
    const rim = Array.from({ length: sides }, (_, k) => corner(k, r));
    const table = Array.from({ length: sides }, (_, k) => corner(k + 0.5, r * 0.56));
    trail(g, rim);
    g.closePath();
    const body = g.createLinearGradient(x - r, y - r, x + r, y + r);
    body.addColorStop(0, '#F2FBFE');
    body.addColorStop(0.5, '#BFE3F2');
    body.addColorStop(1, '#8CC4DE');
    fill(g, body);
    if (target.glow > 0 || target.done) {
      g.globalAlpha = Math.max(0.75 * target.glow, target.done ? 0.3 : 0);
      fill(g, '#FFFFFF');
      g.globalAlpha = 1;
    }
    stroke(g, '#4E87A3', 0.035);
    trail(g, table);
    g.closePath();
    for (let k = 0; k < sides; k++) {
      g.moveTo(rim[k][0], rim[k][1]);
      g.lineTo(table[k][0], table[k][1]);
      g.moveTo(rim[(k + 1) % sides][0], rim[(k + 1) % sides][1]);
      g.lineTo(table[k][0], table[k][1]);
    }
    stroke(g, 'rgba(78,135,163,.6)', 0.02);
  }

  const TARGETS = { lantern: drawLantern, bud: drawBud, panel: drawPanel, crystal: drawCrystal };

  /* The rainbow a lit crystal throws: the colors leave it side by side and
     fall on the first wall in their way. */
  function drawRainbow(g, [x, y], data, target, scene) {
    const base = Math.atan2(target.heading[1], target.heading[0]);
    const colors = ['#E8453C', '#F28C28', '#F7D038', '#4CB85C', '#2FA7DE', '#3B5BDB', '#8E4EC6'];
    g.lineCap = 'round';
    colors.forEach((color, k) => {
      const a = base + (9 + k * 2.6) * RAD;
      const d = [Math.cos(a), Math.sin(a)];
      const from = [x + d[0] * (data.r + 0.03), y + d[1] * (data.r + 0.03)];
      const hit = E.meet(scene, from, d, true);
      const to = [from[0] + d[0] * hit.t, from[1] + d[1] * hit.t];
      g.globalAlpha = 0.5 * target.glow;
      g.beginPath();
      g.moveTo(from[0], from[1]);
      g.lineTo(to[0], to[1]);
      stroke(g, color, 0.045);
      g.globalAlpha = 0.95 * target.glow;
      disc(g, to[0], to[1], 0.085, color);
    });
    g.globalAlpha = 1;
    g.lineCap = 'butt';
  }

  /* A mirror's stand. It is behind the mirror and behind the beam: a post
     from the floor or the ceiling (on a foot with wheels if there is a rail),
     or, for a mirror that is bolted, a plate on the wall with four bolts. */
  function drawStand(g, mirror, state, breath) {
    const p = E.pivot(mirror, state.slide);
    if (mirror.mount === 'wall') {
      g.save();
      g.translate(p[0], p[1]);
      g.rotate(state.face * RAD);
      box(g, -0.36, -0.3, 0.5, 0.6, '#9BA2A9', 0.05);
      stroke(g, INK, 0.03);
      for (const [bx, by] of [[-0.28, -0.22], [-0.28, 0.22], [0.06, -0.22], [0.06, 0.22]]) {
        disc(g, bx, by, 0.045, '#4E5560');
      }
      g.restore();
      return;
    }
    const up = mirror.mount === 'ceiling';
    const end = standEnd(mirror);
    g.beginPath();
    g.moveTo(p[0], p[1]);
    g.lineTo(p[0], end);
    stroke(g, '#4A4038', 0.1);
    disc(g, p[0], p[1], 0.13, '#4A4038');
    if (!mirror.rail) {
      g.beginPath();
      g.moveTo(p[0] - 0.36, end);
      g.lineTo(p[0] - 0.2, end + (up ? 0.14 : -0.14));
      g.lineTo(p[0] + 0.2, end + (up ? 0.14 : -0.14));
      g.lineTo(p[0] + 0.36, end);
      g.closePath();
      fill(g, '#4A4038');
      return;
    }
    // The foot on the rail: it is what the finger drags.
    const y = end + (up ? 0.17 : -0.17);
    g.save();
    g.translate(p[0], y);
    g.scale(1 + 0.1 * breath, 1 + 0.1 * breath);
    for (const wx of [-0.3, 0.3]) disc(g, wx, up ? -0.06 : 0.06, 0.09, '#3A3A3A');
    box(g, -0.5, -0.15, 1, 0.26, '#35A85A', 0.09);
    stroke(g, INK, 0.035);
    g.fillStyle = '#FFFFFF';
    for (const way of [-1, 1]) {
      g.beginPath();
      g.moveTo(way * 0.4, -0.02);
      g.lineTo(way * 0.22, -0.12);
      g.lineTo(way * 0.22, 0.08);
      g.closePath();
      g.fill();
    }
    g.restore();
  }

  /* A mirror, seen edge on: the silvered glass with its glint in front, the
     dull back behind, brass at the two ends. */
  function drawMirror(g, mirror, state, breath) {
    const M = E.MIRROR;
    const p = E.pivot(mirror, state.slide);
    g.save();
    g.translate(p[0], p[1]);
    g.rotate(state.face * RAD);
    g.scale(1 + 0.07 * breath, 1 + 0.07 * breath);
    const long = 2 * (M.half - M.rim);
    const sheen = g.createLinearGradient(M.face, 0, M.face + 0.2, 0);
    sheen.addColorStop(0, 'rgba(220,244,252,.55)');
    sheen.addColorStop(1, 'rgba(220,244,252,0)');
    g.fillStyle = sheen;
    g.fillRect(M.face, -M.half + M.rim, 0.2, long);
    box(g, -M.back, -M.half, M.back + M.face, 2 * M.half, '#6B4A32', 0.03);
    const glass = g.createLinearGradient(0, -M.half, 0, M.half);
    glass.addColorStop(0, '#F6FCFF');
    glass.addColorStop(0.45, '#B4D9E8');
    glass.addColorStop(1, '#E6F5FB');
    g.fillStyle = glass;
    g.fillRect(-0.025, -M.half + M.rim, M.face + 0.025, long);
    box(g, -M.back, -M.half, M.back + M.face, M.rim, '#C99A3B');
    box(g, -M.back, M.half - M.rim, M.back + M.face, M.rim, '#C99A3B');
    rounded(g, -M.back, -M.half, M.back + M.face, 2 * M.half, 0.03);
    stroke(g, INK, 0.03);
    g.beginPath();
    g.moveTo(M.face - 0.012, -M.half * 0.55);
    g.lineTo(M.face - 0.012, -M.half * 0.15);
    stroke(g, '#FFFFFF', 0.03);
    if (mirror.fixed) {
      for (const by of [-0.42, 0.42]) disc(g, -0.062, by, 0.03, '#2F343A');
    } else {
      disc(g, -0.045, 0, 0.04, '#E3B341');
    }
    g.restore();
  }

  /* The mirror's face as a thin line of light, so that it can be found in the dark. */
  function drawGlint(g, mirror, state) {
    const M = E.MIRROR;
    const { p, n, t } = E.pose(mirror, state);
    const reach = M.half - M.rim;
    g.beginPath();
    g.moveTo(p[0] + n[0] * M.face - t[0] * reach, p[1] + n[1] * M.face - t[1] * reach);
    g.lineTo(p[0] + n[0] * M.face + t[0] * reach, p[1] + n[1] * M.face + t[1] * reach);
    stroke(g, 'rgba(214,240,250,.6)', 0.04);
  }

  /* The dark indoors, with holes where there is light: along the beam, where
     it ends, at the window, and round whatever is lit. */
  function drawShade(lampsLit) {
    const lamps = level.lamps || [];
    const raised = lamps.length ? clamp(lampsLit / lamps.length) : 0;
    const dark = look.dark * (1 - 0.72 * raised);
    const g = shadeCtx;
    g.setTransform(shade.width / E.W, 0, 0, shade.height / E.H, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, E.W, E.H);
    const { side, from, to } = level.window;
    g.fillStyle = `rgba(12,14,30,${dark})`;
    g.fillRect(side === 'left' ? E.SIDE : 0, 0, E.W - E.SIDE, E.H);
    g.globalCompositeOperation = 'destination-out';
    g.lineJoin = 'round';
    g.lineCap = 'round';
    for (const [width, strength] of [[3.2, 0.05], [2.6, 0.07], [2, 0.09], [1.5, 0.11], [1, 0.14], [0.6, 0.18], [0.3, 0.2]]) {
      trail(g, beam.points);
      stroke(g, `rgba(0,0,0,${strength})`, width);
    }
    const end = beam.points[beam.points.length - 1];
    if (beam.end !== 'out') glow(g, end[0], end[1], 1.8, 'rgba(0,0,0,.9)', 'rgba(0,0,0,0)');
    glow(g, side === 'left' ? E.SIDE + E.WALL : E.W - E.SIDE - E.WALL, (from + to) / 2, 1.6, 'rgba(0,0,0,.8)', 'rgba(0,0,0,0)');
    level.targets.forEach((data, j) => {
      const target = targets[j];
      const bright = data.kind === 'lantern' ? Math.max(ease(target.life), 0.4 * target.fill) : data.kind === 'crystal' ? Math.max(0.5 * target.glow, 0.3 * ease(target.life)) : 0.45 * ease(target.life);
      if (bright > 0) glow(g, places[j][0], places[j][1], data.r * (data.kind === 'lantern' ? 7 : 4), `rgba(0,0,0,${0.95 * bright})`, 'rgba(0,0,0,0)');
    });
    lamps.forEach(([x, y], k) => {
      const bright = clamp(lampsLit - k);
      if (bright > 0) glow(g, x, y, 3, `rgba(0,0,0,${0.9 * bright})`, 'rgba(0,0,0,0)');
    });
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(shade, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  /* The beam: a warm bright band with a soft glow, dust sparkling in it, and
     a bright spot where it ends. */
  function drawBeam(g) {
    const { points } = beam;
    g.lineJoin = 'round';
    g.lineCap = 'butt';
    trail(g, points);
    stroke(g, 'rgba(255,200,80,.1)', 0.56);
    stroke(g, 'rgba(255,204,88,.14)', 0.4);
    stroke(g, 'rgba(255,210,100,.2)', 0.27);
    stroke(g, '#FFE595', 0.15);
    stroke(g, '#FFFDF0', 0.065);
    // The dust: each speck has its own place along the beam and across it, and its own time to glint.
    const lengths = [];
    let total = 0;
    for (let k = 1; k < points.length; k++) {
      lengths.push(Math.hypot(points[k][0] - points[k - 1][0], points[k][1] - points[k - 1][1]));
      total += lengths[k - 1];
    }
    const time = STILL ? 0 : clock;
    const specks = Math.round(total * 2.4);
    for (let k = 0; k < specks; k++) {
      const glint = Math.sin(time * (1.6 + 2.6 * ((k * 0.23) % 1)) + k * 1.7);
      if (glint < 0.1) continue;
      let far = ((k * 0.618034 + time * (0.008 + 0.014 * ((k * 0.37) % 1))) % 1) * total;
      let part = 0;
      while (part < lengths.length - 1 && far > lengths[part]) far -= lengths[part++];
      const a = points[part];
      const b = points[part + 1];
      const u = lengths[part] ? far / lengths[part] : 0;
      const across = (((k * 0.754878) % 1) - 0.5) * 0.3;
      const nx = -(b[1] - a[1]) / (lengths[part] || 1);
      const ny = (b[0] - a[0]) / (lengths[part] || 1);
      disc(g, mix(a[0], b[0], u) + nx * across, mix(a[1], b[1], u) + ny * across, 0.02 + 0.022 * glint, `rgba(255,255,236,${0.9 * glint})`);
    }
    if (beam.end === 'out') return;
    const [ex, ey] = points[points.length - 1];
    const spot = g.createRadialGradient(ex, ey, 0, ex, ey, 0.45);
    spot.addColorStop(0, 'rgba(255,253,235,.98)');
    spot.addColorStop(0.35, 'rgba(255,226,130,.6)');
    spot.addColorStop(1, 'rgba(255,214,110,0)');
    g.fillStyle = spot;
    g.fillRect(ex - 0.45, ey - 0.45, 0.9, 0.9);
  }

  /* Where the beam meets a mirror: the normal as a fine dotted line, and the
     two angles as two arcs of one color. They are always the same size. */
  function drawMarks(g) {
    g.globalAlpha = marks;
    for (const bounce of beam.bounces) {
      const [x, y] = bounce.at;
      const normal = Math.atan2(bounce.normal[1], bounce.normal[0]);
      g.setLineDash([0.07, 0.08]);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + bounce.normal[0] * 1.1, y + bounce.normal[1] * 1.1);
      stroke(g, look.normal, 0.035);
      g.setLineDash([]);
      for (const ray of [[-bounce.from[0], -bounce.from[1]], bounce.to]) {
        const open = wrap(Math.atan2(ray[1], ray[0]) - normal);
        g.beginPath();
        g.moveTo(x, y);
        g.arc(x, y, 0.58, normal, normal + open, open < 0);
        g.closePath();
        fill(g, look.arcFill);
        g.beginPath();
        g.arc(x, y, 0.58, normal, normal + open, open < 0);
        stroke(g, look.arc, 0.045);
      }
    }
    g.globalAlpha = 1;
  }

  /* The ring round a target: it fills while the beam rests there. */
  function drawRing(g, [x, y], r, part) {
    g.beginPath();
    g.arc(x, y, r + 0.12, 0, TAU);
    stroke(g, 'rgba(43,31,22,.3)', 0.1);
    stroke(g, 'rgba(255,255,255,.9)', 0.055);
    if (part <= 0) return;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(x, y, r + 0.12, -Math.PI / 2, -Math.PI / 2 + part * TAU);
    stroke(g, GOLD, 0.1);
    g.lineCap = 'butt';
  }

  function draw() {
    if (!fit || !level || !beam) return;
    const g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.drawImage(backdrop, 0, 0);
    g.setTransform(canvas.width / E.W, 0, 0, canvas.height / E.H, 0, 0);
    const lamps = level.lamps || [];
    const lampsLit = lift >= 0 ? Math.max(0, (lift - AFTER * 0.6) / LAMP) : 0;
    lamps.forEach(([x, y], k) => {
      if (lampsLit > k) lamp(g, x, y + 0.12, 1);
    });
    level.targets.forEach((data, j) => TARGETS[data.kind](g, places[j], data, targets[j]));
    const helps = hint();
    const breath = STILL ? 0 : 0.5 - 0.5 * Math.cos((clock * TAU) / BREATH);
    level.mirrors.forEach((mirror, i) => drawStand(g, mirror, mirrors[i], helps && helps.i === i && helps.mode === 'slide' ? breath : 0));
    level.mirrors.forEach((mirror, i) => drawMirror(g, mirror, mirrors[i], helps && helps.i === i && helps.mode === 'turn' ? breath : 0));
    drawShade(lampsLit);
    level.mirrors.forEach((mirror, i) => drawGlint(g, mirror, mirrors[i]));
    // What is lit shines into the room.
    g.globalCompositeOperation = 'lighter';
    level.targets.forEach((data, j) => {
      if (data.kind !== 'lantern') return;
      const shine = Math.max(ease(targets[j].life), 0.4 * targets[j].fill);
      if (shine > 0) glow(g, places[j][0], places[j][1], data.r * 3.4, `rgba(255,206,110,${0.5 * shine})`, 'rgba(255,206,110,0)');
    });
    lamps.forEach(([x, y], k) => {
      const bright = clamp(lampsLit - k);
      if (bright > 0) glow(g, x, y + 0.1, 1.5, `rgba(255,206,110,${0.55 * bright})`, 'rgba(255,206,110,0)');
    });
    g.globalCompositeOperation = 'source-over';
    let scene = null;
    level.targets.forEach((data, j) => {
      if (data.kind !== 'crystal' || targets[j].glow <= 0) return;
      scene = scene || E.arrange(level, mirrors, places);
      drawRainbow(g, places[j], data, targets[j], scene);
    });
    drawBeam(g);
    if (marks > 0) drawMarks(g);
    level.targets.forEach((data, j) => {
      const target = targets[j];
      if (!target.done) drawRing(g, places[j], data.r, target.fill);
      else if (data.kind === 'panel' || data.kind === 'crystal') {
        g.beginPath();
        g.arc(places[j][0], places[j][1], data.r + 0.12, 0, TAU);
        stroke(g, GOLD, 0.06);
      }
    });
    if (helps) {
      // A soft ring round the mirror, or the foot, that helps next.
      const at = helps.mode === 'slide' ? foot(helps.i) : E.pivot(level.mirrors[helps.i], mirrors[helps.i].slide);
      g.beginPath();
      g.arc(at[0], at[1], helps.mode === 'slide' ? 0.72 : 0.98, 0, TAU);
      stroke(g, `rgba(242,184,75,${STILL ? 0.6 : 0.25 + 0.5 * breath})`, 0.07);
    }
  }

  /* The picture takes the largest place its shape allows. */
  function layout() {
    const wide = board.clientWidth;
    const high = board.clientHeight;
    if (!wide || !high) return;
    const s = Math.min(wide / E.W, high / E.H);
    const w = Math.round(E.W * s);
    const h = Math.round(E.H * s);
    const ratio = Math.max(0.6, Math.min(devicePixelRatio || 1, 2) * grain);
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    frame.style.left = `${(wide - w) / 2}px`;
    frame.style.top = `${(high - h) / 2}px`;
    const pw = Math.round(w * ratio);
    const ph = Math.round(h * ratio);
    if (!fit || canvas.width !== pw || canvas.height !== ph) {
      canvas.width = backdrop.width = pw;
      canvas.height = backdrop.height = ph;
      shade.width = Math.ceil(pw / 4);
      shade.height = Math.ceil(ph / 4);
    }
    fit = { s: w / E.W, w, h, ratio };
    paintBackdrop();
    draw();
  }

  /* One loop, which stops while the page is hidden. The beam must keep up
     with the finger: a device that cannot draw the picture 25 times a second
     gets it a little less sharp, and less again if that is not enough. */
  function tick(now) {
    raf = 0;
    if (document.hidden) return;
    const gap = now - last;
    last = now;
    // One long pause among quick frames (the system holding the page a moment) is not a slow device:
    // a late frame counts in full only when it follows another late one.
    if (now > calm) lag = gap > 40 ? lag + (lag > 0 ? gap : Math.min(gap, 100)) : Math.max(0, lag - 2 * gap);
    if (lag > 1200 && grain > 0.4) {
      grain *= 0.75;
      lag = 0;
      calm = now + 1500;
      layout();
    }
    update(clamp(gap / 1000, 0, 0.05));
    draw();
    raf = requestAnimationFrame(tick);
  }

  function go() {
    if (raf || document.hidden) return;
    last = performance.now();
    lag = 0;
    calm = last + 2500;
    raf = requestAnimationFrame(tick);
  }

  /* A pointer's place in the picture's units. */
  function spotOf(event) {
    const rect = canvas.getBoundingClientRect();
    return [((event.clientX - rect.left) / rect.width) * E.W, ((event.clientY - rect.top) / rect.height) * E.H];
  }

  frame.addEventListener('pointerdown', (event) => {
    if (event.button > 0 || !level || event.target.closest('button')) return;
    event.preventDefault();
    if (event.isPrimary) hold = null; // the first pointer down means none was down: one whose lifting was missed holds nothing back
    if (!press(...spotOf(event), event.pointerId)) return;
    try {
      frame.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that is already gone cannot be held; the mirror still follows it.
    }
  });
  frame.addEventListener('pointermove', (event) => {
    if (hold && event.pointerId === hold.id) drag(...spotOf(event), event.pointerId);
  });
  const lifted = (event) => release(event.pointerId);
  addEventListener('pointerup', lifted);
  addEventListener('pointercancel', lifted);
  root.addEventListener('contextmenu', (event) => event.preventDefault());

  addEventListener('keydown', (event) => {
    if (event.target.closest && event.target.closest('button, a')) return;
    if (key(event.key, event.shiftKey)) event.preventDefault();
  });

  /* The first touch or key lets the page speak: the level's line is said then. */
  const wake = () => {
    if (awake) return;
    awake = true;
    if (owed && level && TEXT[level.say].clip === owed) speak(owed);
    owed = '';
  };
  addEventListener('pointerdown', wake, { capture: true, once: true });
  addEventListener('keydown', wake, { capture: true, once: true });

  $('again').addEventListener('click', startOver);

  /* From the beginning, in the ☰ menu. */
  const menu = document.querySelector('.menu');
  if (menu) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'menu-item';
    button.textContent = $('again').getAttribute('aria-label');
    button.addEventListener('click', () => {
      menu.hidden = true;
      startOver();
    });
    const rule = document.createElement('hr');
    rule.className = 'menu-rule';
    menu.append(rule, button);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      hold = null;
    } else {
      go();
    }
  });
  addEventListener('resize', layout);
  if (typeof ResizeObserver === 'function') new ResizeObserver(layout).observe(board);

  /* For trying the game by hand on the family's computer: open a level, set
     a mirror, feed a finger in the picture's units, pass time and draw. */
  if (LOCAL) {
    window.lightGame = {
      engine: E,
      levels: LEVELS,
      open,
      startOver,
      update,
      draw,
      layout,
      key,
      set(i, values) {
        Object.assign(mirrors[i], values);
        mirrors[i].face = E.turned(level.mirrors[i], mirrors[i].face);
      },
      point(x, y, kind = 'move') {
        if (kind === 'down') return press(x, y, 1);
        if (kind === 'up') return release(1);
        return drag(x, y, 1);
      },
      lever,
      /* Where a place of the picture is on the screen. */
      screen(x, y) {
        const rect = canvas.getBoundingClientRect();
        return [rect.left + (x / E.W) * rect.width, rect.top + (y / E.H) * rect.height];
      },
      stop() {
        cancelAnimationFrame(raf);
        raf = 0;
      },
      go,
      get state() {
        return {
          index, reached, clock, away, lift, marks, awake, grain, running: raf !== 0,
          mirrors: mirrors.map((state) => ({ ...state })),
          targets: targets.map((target) => ({ ...target })),
          places,
          beam: beam && { end: beam.end, target: beam.target, points: beam.points, bounces: beam.bounces.map((b) => ({ mirror: b.mirror, angle: b.angle, at: b.at })) },
          hold: hold && { i: hold.i, mode: hold.mode },
          hint: hint(),
          fit,
        };
      },
    };
  }

  /* Start */
  load();
  index = Math.min(reached, LEVELS.length - 1);
  sound.preloadPrompts(Object.values(TEXT).map((entry) => entry.clip));
  layout();
  open(index);
})();
