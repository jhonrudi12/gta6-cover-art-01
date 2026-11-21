// Colour grades for Vice Coast Cover Studio.
// Each grade is built into three 256-entry lookup tables (one per channel)
// from lift / gamma / gain curves plus a tint and a saturation push.
// A LUT is cheap to build once and fast to apply to every pixel.

export const GRADES = [
  {
    id: 'sunset',
    name: 'Vice Sunset',
    blurb: 'Pink-orange dusk',
    swatch: 'linear-gradient(90deg,#ff2e88,#ff7a1a,#ffd23e)',
    lift: [0.02, 0.0, 0.02],
    gamma: [0.92, 1.0, 1.08],
    gain: [1.12, 1.0, 0.94],
    tint: [1.10, 0.96, 1.04],
    sat: 1.22,
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    blurb: 'Magenta + cyan glow',
    swatch: 'linear-gradient(90deg,#ff00c8,#7b2fff,#00e5ff)',
    lift: [0.03, 0.0, 0.05],
    gamma: [0.95, 1.02, 0.92],
    gain: [1.14, 0.94, 1.14],
    tint: [1.14, 0.92, 1.12],
    sat: 1.38,
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    blurb: 'Warm honey light',
    swatch: 'linear-gradient(90deg,#ffb347,#ff8c1a,#ffe9a8)',
    lift: [0.01, 0.0, 0.0],
    gamma: [0.95, 0.98, 1.12],
    gain: [1.10, 1.02, 0.86],
    tint: [1.12, 1.0, 0.88],
    sat: 1.15,
  },
  {
    id: 'midnight',
    name: 'Midnight Purple',
    blurb: 'Deep violet night',
    swatch: 'linear-gradient(90deg,#2b1055,#7b2fff,#ff2e88)',
    lift: [0.05, 0.02, 0.06],
    gamma: [1.05, 1.02, 0.92],
    gain: [0.98, 0.88, 1.12],
    tint: [1.06, 0.9, 1.16],
    sat: 1.25,
  },
  {
    id: 'teal',
    name: 'Palm Teal',
    blurb: 'Cool tropical teal',
    swatch: 'linear-gradient(90deg,#0f766e,#2ee6c8,#a7f3d0)',
    lift: [0.0, 0.02, 0.03],
    gamma: [1.04, 0.96, 0.94],
    gain: [0.9, 1.08, 1.10],
    tint: [0.9, 1.08, 1.10],
    sat: 1.18,
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// Build the three 256-entry LUTs for a grade at a given strength (0..1).
// strength 0 returns the identity table; strength 1 the full grade.
export function buildLuts(grade, strength) {
  const luts = [[], [], []];
  for (let c = 0; c < 3; c++) {
    const lut = new Uint8Array(256);
    const lift = grade.lift[c] * strength;
    const gamma = 1 + (grade.gamma[c] - 1) * strength;
    const gain = 1 + (grade.gain[c] - 1) * strength;
    const tint = 1 + (grade.tint[c] - 1) * strength;
    for (let v = 0; v < 256; v++) {
      const n = v / 255;
      let out = Math.pow(Math.max(0, n), gamma) * gain + lift;
      out *= tint;
      lut[v] = Math.max(0, Math.min(255, Math.round(out * 255)));
    }
    luts[c] = lut;
  }
  return luts;
}

// Apply LUTs + saturation to an ImageData in place.
export function applyLuts(imageData, luts, saturation) {
  const d = imageData.data;
  const rL = luts[0];
  const gL = luts[1];
  const bL = luts[2];
  for (let i = 0; i < d.length; i += 4) {
    let r = rL[d[i]];
    let g = gL[d[i + 1]];
    let b = bL[d[i + 2]];
    if (saturation !== 1) {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = Math.max(0, Math.min(255, lum + (r - lum) * saturation));
      g = Math.max(0, Math.min(255, lum + (g - lum) * saturation));
      b = Math.max(0, Math.min(255, lum + (b - lum) * saturation));
    }
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
  return imageData;
}
