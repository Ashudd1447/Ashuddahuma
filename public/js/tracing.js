/* Letter tracing, the part shared by the admin stroke editor and the lesson:
   how a letter is laid out on a square board, so that strokes drawn in the
   editor land on the same glyph the child sees. The glyph's ink box, as the
   font measures it, fills at most FIT of the board and sits centered. */
const tracing = (() => {
  const FONT = 'Noto Naskh Arabic';
  const FIT = 0.72;

  function ready(text) {
    return document.fonts.load(`400 100px "${FONT}"`, text || 'أب').then(() => undefined, () => undefined);
  }

  /* Font size, pen position and ink box (in board units) for `text` on a
     square board of side `size`. */
  function layout(ctx, text, size) {
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `400 100px "${FONT}"`;
    const probe = ctx.measureText(text);
    const probeW = probe.actualBoundingBoxLeft + probe.actualBoundingBoxRight;
    const probeH = probe.actualBoundingBoxAscent + probe.actualBoundingBoxDescent;
    const px = 100 * FIT * size / Math.max(probeW, probeH, 1);
    ctx.font = `400 ${px}px "${FONT}"`;
    const m = ctx.measureText(text);
    const x = size / 2 + (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2;
    const y = size / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    const box = [
      (x - m.actualBoundingBoxLeft) / size,
      (y - m.actualBoundingBoxAscent) / size,
      (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / size,
      (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / size,
    ];
    return { px, x, y, box };
  }

  function drawGlyph(ctx, text, size, color) {
    const placed = layout(ctx, text, size);
    ctx.fillStyle = color;
    ctx.fillText(text, placed.x, placed.y);
    return placed.box;
  }

  return { FONT, FIT, ready, layout, drawGlyph };
})();
