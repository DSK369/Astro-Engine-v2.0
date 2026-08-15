// Fits a text block (optional header row + wrapped label rows) inside an
// arbitrary convex polygon, in SVG pixel space.
//
// Replaces the previous approach of hand-tuned per-house offset tables.
// Those offsets were guessed rather than derived, and pushed labels past
// the chart edge for the 8 corner-triangle houses (3/5/9/11 landed fully
// outside the square; 2/6/8/12 straddled an edge once a glyph's height
// or a planet row was accounted for).
//
// Both chart styles use this, so "inside its own cell/house" is enforced
// by the same code path for North and South layouts.
//
// Relies on the polygons being convex (the North Indian chart's 12
// regions are 4 kites + 8 triangles; South Indian cells are rectangles).
// For a convex polygon, a rectangle whose 4 corners are all inside is
// itself entirely inside — that's what makes the fit check cheap and
// exact rather than a sampled approximation.

// Metrics are deliberately conservative — they over-estimate rather than
// under-estimate, so a mis-estimate costs a slightly smaller font rather
// than text escaping its house.
//
// Vertically, Devanagari matras are real: they stack above and below the
// base glyph, so the line box and baseline leave room for them.
const CHAR_WIDTH_RATIO = 0.62; // conservative advance width for a sans digit/letter
const DEVANAGARI_WIDTH_RATIO = 1.15; // base glyphs run wider than the Latin average
const CONJUNCT_SAVING = 0.6; // a virama fuses two bases into one narrower conjunct

// Combining marks: matras, virama, nukta, anusvara/candrabindu/visarga.
// These carry no advance width of their own.
const DEVANAGARI_COMBINING = /[ऀ-ःऺ-़ा-ॏ॑-ॗॢॣ]/g;
const HAS_DEVANAGARI = /[ऀ-ॿ]/;

// Width of a label in "average character" units. Counting raw code units
// works for Latin but badly over-measures Devanagari, where a cluster
// like प्लु is 4 code units but renders about as wide as one and a half
// glyphs — enough to shrink a whole house's font a few px for no reason.
export function textWidthUnits(text) {
  if (!HAS_DEVANAGARI.test(text)) return text.length;
  const viramas = (text.match(/्/g) || []).length;
  const bases = text.replace(DEVANAGARI_COMBINING, "").length;
  return Math.max(1, (bases - viramas * CONJUNCT_SAVING) * DEVANAGARI_WIDTH_RATIO);
}
const LINE_HEIGHT_RATIO = 1.35;
const BASELINE_RATIO = 0.85; // ascent from the row's top edge to its baseline
// The ladder runs well below a comfortable reading size on purpose. The
// bottom rungs only ever get used by pathological crowding (most of the
// chart's bodies conjunct in one corner triangle, all retrograde, so
// every label carries a marker). Containing that case at a tiny size
// beats letting it spill outside the house, and no rung is reached
// unless every larger one has been proven not to fit.
const FONT_STEPS = [13, 12, 11, 10, 9, 8, 7, 6, 5.5, 5, 4.5, 4];
const COLUMN_STEPS = [1, 2, 3, 4];

export function pointInPolygon([px, py], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi === yj) continue;
    if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function distToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distToBoundary(p, poly) {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    d = Math.min(d, distToSegment(p, poly[i], poly[(i + 1) % poly.length]));
  }
  return d;
}

// Interior point farthest from any edge ("pole of inaccessibility"), i.e.
// the roomiest spot to centre a text block. Coarse grid then a local
// refine — deterministic, and cheap enough for a dozen small polygons.
export function poleOfInaccessibility(poly, samples = 40) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }

  let best = null;
  let bestD = -Infinity;

  const scan = (x0, x1, y0, y1, n) => {
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        const p = [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * j) / n];
        if (!pointInPolygon(p, poly)) continue;
        const d = distToBoundary(p, poly);
        if (d > bestD) { bestD = d; best = p; }
      }
    }
  };

  scan(minX, maxX, minY, maxY, samples);
  if (!best) {
    const n = poly.length;
    return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n];
  }

  const step = Math.max((maxX - minX) / samples, (maxY - minY) / samples);
  scan(best[0] - step, best[0] + step, best[1] - step, best[1] + step, 12);
  return best;
}

// Shrink a convex polygon toward an interior point so text keeps a
// visible gap from the drawn chart lines instead of merely being
// "technically inside" and touching them.
export function insetPolygon(poly, center, margin) {
  const inradius = distToBoundary(center, poly);
  if (!(inradius > margin)) return poly;
  const s = 1 - margin / inradius;
  return poly.map(([x, y]) => [
    center[0] + (x - center[0]) * s,
    center[1] + (y - center[1]) * s,
  ]);
}

function rectFits(cx, cy, w, h, poly) {
  const hw = w / 2;
  const hh = h / 2;
  return (
    pointInPolygon([cx - hw, cy - hh], poly) &&
    pointInPolygon([cx + hw, cy - hh], poly) &&
    pointInPolygon([cx - hw, cy + hh], poly) &&
    pointInPolygon([cx + hw, cy + hh], poly)
  );
}

function build(center, fontSize, columns, header, labels) {
  const rows = columns > 0 ? Math.ceil(labels.length / columns) : 0;
  const headerRows = header ? 1 : 0;
  const rowHeight = fontSize * LINE_HEIGHT_RATIO;
  const colWidth = maxCharWidth(fontSize, header, labels);
  const blockHeight = (rows + headerRows) * rowHeight;
  const top = center[1] - blockHeight / 2;

  return {
    fontSize,
    columns,
    headerX: center[0],
    headerY: top + fontSize * BASELINE_RATIO,
    positions: labels.map((_, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      return {
        x: center[0] + (col - (columns - 1) / 2) * colWidth,
        y: top + rowHeight * (row + headerRows) + fontSize * BASELINE_RATIO,
      };
    }),
  };
}

function maxCharWidth(fontSize, header, labels) {
  const widths = labels.map(textWidthUnits);
  if (header) widths.push(textWidthUnits(header));
  const maxChars = Math.max(1, ...widths);
  return maxChars * CHAR_WIDTH_RATIO * fontSize + fontSize * 0.3;
}

// Largest font (then fewest columns) whose whole block fits inside poly.
// Falls back to the smallest font / most columns if nothing fits, so a
// pathologically crowded house degrades in legibility rather than
// spilling outside its boundary.
export function fitLabelBlock(poly, center, header, labels) {
  for (const fontSize of FONT_STEPS) {
    for (const columns of COLUMN_STEPS) {
      if (labels.length === 0 && columns > 1) continue;
      if (columns > Math.max(1, labels.length)) continue;

      const rows = labels.length === 0 ? 0 : Math.ceil(labels.length / columns);
      const rowHeight = fontSize * LINE_HEIGHT_RATIO;
      const w = columns * maxCharWidth(fontSize, header, labels);
      const h = (rows + (header ? 1 : 0)) * rowHeight;

      if (rectFits(center[0], center[1], w, h, poly)) {
        return build(center, fontSize, Math.max(1, columns), header, labels);
      }
    }
  }

  const last = FONT_STEPS[FONT_STEPS.length - 1];
  return build(center, last, labels.length > 0 ? 3 : 1, header, labels);
}
