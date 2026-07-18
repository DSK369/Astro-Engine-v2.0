// North Indian chart geometry, derived analytically (not hand-guessed pixels).
//
// Construction: a square, its 2 corner-to-corner diagonals, and a "diamond"
// connecting the midpoints of its 4 sides. These lines divide the square
// into exactly 12 regions: 4 kite-shaped regions at the side-midpoints
// (the "point" houses) and 8 triangular regions, 2 per corner.
//
// Coordinates below are for a unit square (0,0)-(1,1), y increasing
// downward (SVG convention). Scale by chart size when rendering.
//
// House numbering follows the reference layout in
// `_referrence Data sets/North Indian Chart Reference - Skeleton.png`:
// House 1 at the top point, numbering proceeds counter-clockwise
// (2 upper-left, 3 upper-left-corner, 4 left point, ... 12 upper-right).

const TL = [0, 0];
const TR = [1, 0];
const BR = [1, 1];
const BL = [0, 1];
const C = [0.5, 0.5];

const M_T = [0.5, 0]; // top mid
const M_R = [1, 0.5]; // right mid
const M_B = [0.5, 1]; // bottom mid
const M_L = [0, 0.5]; // left mid

// Intersections of the diamond edges with the two main diagonals.
// (Diamond edge M_T-M_R is parallel to diagonal TL-BR, so it only
// crosses the *other* diagonal, TR-BL, and vice versa for each edge.)
const P1 = [0.75, 0.25]; // M_T-M_R  x  TR-BL   (between houses 1/12/10)
const P2 = [0.25, 0.25]; // M_L-M_T  x  TL-BR   (between houses 1/2/4)
const P3 = [0.25, 0.75]; // M_L-M_B  x  TR-BL   (between houses 4/5/7)
const P4 = [0.75, 0.75]; // M_B-M_R  x  TL-BR   (between houses 7/8/10)

// House number -> polygon (array of [x, y] in unit-square space).
export const HOUSE_POLYGONS = {
  1: [M_T, P1, C, P2],
  2: [TL, M_T, P2],
  3: [TL, P2, M_L],
  4: [M_L, P2, C, P3],
  5: [M_L, BL, P3],
  6: [BL, M_B, P3],
  7: [M_B, P3, C, P4],
  8: [M_B, BR, P4],
  9: [BR, M_R, P4],
  10: [M_R, P4, C, P1],
  11: [M_R, TR, P1],
  12: [TR, M_T, P1],
};

// Skeleton lines to draw (outer square + both diagonals + diamond edges).
export const SKELETON_LINES = [
  // outer square
  [TL, TR], [TR, BR], [BR, BL], [BL, TL],
  // diagonals
  [TL, BR], [TR, BL],
  // diamond
  [M_T, M_R], [M_R, M_B], [M_B, M_L], [M_L, M_T],
];

function centroid(points) {
  const n = points.length;
  const x = points.reduce((sum, p) => sum + p[0], 0) / n;
  const y = points.reduce((sum, p) => sum + p[1], 0) / n;
  return [x, y];
}

// Label anchor per house: pulled slightly toward the square's edge from
// the true centroid so text doesn't collide with the crossing lines at
// the middle of the chart, and so planet lists have room to stack below
// the house-number label.
const LABEL_PULL = {
  1: [0, -0.12], 2: [-0.05, -0.08], 3: [-0.1, 0], 4: [-0.12, 0],
  5: [-0.1, 0], 6: [-0.05, 0.08], 7: [0, 0.12], 8: [0.05, 0.08],
  9: [0.1, 0], 10: [0.12, 0], 11: [0.1, 0], 12: [0.05, -0.08],
};

export function getHouseLayout(size) {
  const layout = {};
  for (const [house, unitPoints] of Object.entries(HOUSE_POLYGONS)) {
    const scaled = unitPoints.map(([x, y]) => [x * size, y * size]);
    const [cx, cy] = centroid(unitPoints);
    const [pdx, pdy] = LABEL_PULL[house];
    layout[house] = {
      points: scaled,
      pointsAttr: scaled.map((p) => p.join(",")).join(" "),
      labelX: (cx + pdx) * size,
      labelY: (cy + pdy) * size,
      planetsY: (cy + pdy) * size + size * 0.045,
    };
  }
  return layout;
}

export function getSkeletonLines(size) {
  return SKELETON_LINES.map(([a, b]) => ({
    x1: a[0] * size,
    y1: a[1] * size,
    x2: b[0] * size,
    y2: b[1] * size,
  }));
}
