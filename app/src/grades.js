// Colour grades for the cover maker. Each grade is a 256-entry lookup table (LUT) per
// colour channel, built from a few control points, plus the colours the lettering uses
// so the title always matches the grade. All five grades are original curves drawn
// for a Vice City sunset / neon look; nothing here copies any game's palette.

/** Interpolates a piecewise-linear curve through [[input, output], ...] control points. */
export function buildCurve(points) {
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let a = points[0];
    let b = points[points.length - 1];
    for (let k = 0; k < points.length - 1; k++) {
      if (i >= points[k][0] && i <= points[k + 1][0]) { a = points[k]; b = points[k + 1]; break; }
    }
    const t = b[0] === a[0] ? 0 : (i - a[0]) / (b[0] - a[0]);
    lut[i] = Math.max(0, Math.min(255, Math.round(a[1] + (b[1] - a[1]) * t)));
  }
  return lut;
}

/** Builds the three channel LUTs of one grade from its per-channel control points. */
export function buildGradeLUT(grade) {
  return {
    r: buildCurve(grade.curves.r),
    g: buildCurve(grade.curves.g),
    b: buildCurve(grade.curves.b),
  };
}

const S_CURVE = [[0, 0], [64, 52], [128, 128], [192, 204], [255, 255]];

export const GRADES = [
  {
    id: 'sunset',
    name: 'Vice Sunset',
    blurb: 'Warm orange-pink dusk, the classic Vice City sunset.',
    curves: {
      r: [[0, 8], [64, 78], [128, 150], [192, 220], [255, 255]],
      g: [[0, 0], [64, 58], [128, 122], [192, 190], [255, 245]],
      b: [[0, 18], [64, 70], [128, 118], [192, 176], [255, 225]],
    },
    titleTop: '#ffe45e', titleBottom: '#ff5e8a', accent: '#ff7a3d', swatch: '#ff7a3d',
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    blurb: 'Hot magenta shadows and cyan highlights, after dark.',
    curves: {
      r: [[0, 22], [64, 66], [128, 132], [192, 205], [255, 250]],
      g: [[0, 6], [64, 48], [128, 110], [192, 178], [255, 235]],
      b: [[0, 40], [64, 96], [128, 150], [192, 210], [255, 255]],
    },
    titleTop: '#7df9ff', titleBottom: '#ff4fd8', accent: '#ff4fd8', swatch: '#ff4fd8',
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    blurb: 'Low honeyed sun, lifted warm blacks, soft contrast.',
    curves: {
      r: [[0, 20], [64, 88], [128, 155], [192, 218], [255, 255]],
      g: [[0, 12], [64, 72], [128, 132], [192, 196], [255, 240]],
      b: [[0, 4], [64, 48], [128, 104], [192, 168], [255, 215]],
    },
    titleTop: '#fff3b0', titleBottom: '#ff9a3d', accent: '#ffc53d', swatch: '#ffc53d',
  },
  {
    id: 'midnight',
    name: 'Midnight Purple',
    blurb: 'Deep violet night, crushed blacks, electric highlights.',
    curves: {
      r: [[0, 4], [64, 58], [128, 128], [192, 198], [255, 248]],
      g: [[0, 0], [64, 44], [128, 108], [192, 182], [255, 238]],
      b: [[0, 26], [64, 88], [128, 152], [192, 216], [255, 255]],
    },
    titleTop: '#e9b6ff', titleBottom: '#8a5cff', accent: '#8a5cff', swatch: '#8a5cff',
  },
  {
    id: 'teal',
    name: 'Palm Teal',
    blurb: 'Teal shadows, warm skin highlights, palm-tree postcard.',
    curves: {
      r: [[0, 2], [64, 56], [128, 126], [192, 200], [255, 252]],
      g: [[0, 14], [64, 74], [128, 138], [192, 202], [255, 245]],
      b: [[0, 22], [64, 84], [128, 142], [192, 204], [255, 248]],
    },
    titleTop: '#b8fff1', titleBottom: '#2ec4b6', accent: '#2ec4b6', swatch: '#2ec4b6',
  },
];

/** Looks a grade up by id, falling back to the first grade. */
export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** A gentle S-curve LUT used to add contrast before the grade is blended in. */
export function contrastLUT() {
  return buildCurve(S_CURVE);
}
