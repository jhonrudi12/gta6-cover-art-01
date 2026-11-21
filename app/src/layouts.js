// Panel layouts for Vice Coast Cover Studio.
// Every layout is a list of panels in fractions of the cover (x, y, w, h in 0..1),
// plus an optional rotation (degrees) and a white "snapshot" border.
// The title band sits in the free space each layout reserves at the bottom
// (or, for full bleed, over the photo). Nothing here is a fixed frame image:
// panels are cut from the user's own photos at render time.

export const LAYOUTS = [
  {
    id: 'hero3',
    name: 'Hero + 3',
    blurb: 'Big hero, three below',
    gap: 0.012,
    titleBand: { x: 0, y: 0.78, w: 1, h: 0.22 },
    panels: [
      { x: 0, y: 0, w: 1, h: 0.60 },
      { x: 0, y: 0.612, w: 0.326, h: 0.156 },
      { x: 0.337, y: 0.612, w: 0.326, h: 0.156 },
      { x: 0.674, y: 0.612, w: 0.326, h: 0.156 },
    ],
  },
  {
    id: 'grid4',
    name: 'Grid 4',
    blurb: 'Classic 2 × 2 poster',
    gap: 0.012,
    titleBand: { x: 0, y: 0.76, w: 1, h: 0.24 },
    panels: [
      { x: 0, y: 0, w: 0.494, h: 0.368 },
      { x: 0.506, y: 0, w: 0.494, h: 0.368 },
      { x: 0, y: 0.38, w: 0.494, h: 0.368 },
      { x: 0.506, y: 0.38, w: 0.494, h: 0.368 },
    ],
  },
  {
    id: 'grid9',
    name: 'Grid 9',
    blurb: 'Nine-panel mosaic',
    gap: 0.01,
    titleBand: { x: 0, y: 0.80, w: 1, h: 0.20 },
    panels: [
      { x: 0, y: 0, w: 0.327, h: 0.26 },
      { x: 0.3365, y: 0, w: 0.327, h: 0.26 },
      { x: 0.673, y: 0, w: 0.327, h: 0.26 },
      { x: 0, y: 0.27, w: 0.327, h: 0.26 },
      { x: 0.3365, y: 0.27, w: 0.327, h: 0.26 },
      { x: 0.673, y: 0.27, w: 0.327, h: 0.26 },
      { x: 0, y: 0.54, w: 0.327, h: 0.25 },
      { x: 0.3365, y: 0.54, w: 0.327, h: 0.25 },
      { x: 0.673, y: 0.54, w: 0.327, h: 0.25 },
    ],
  },
  {
    id: 'tilted',
    name: 'Tilted Snaps',
    blurb: 'Scattered snapshots',
    gap: 0,
    titleBand: { x: 0, y: 0.80, w: 1, h: 0.20 },
    panels: [
      { x: 0.22, y: 0.05, w: 0.56, h: 0.52, rot: -3, border: 0.018 },
      { x: 0.03, y: 0.34, w: 0.34, h: 0.32, rot: -7, border: 0.02 },
      { x: 0.63, y: 0.40, w: 0.34, h: 0.32, rot: 6, border: 0.02 },
      { x: 0.30, y: 0.55, w: 0.40, h: 0.24, rot: 2, border: 0.02 },
    ],
  },
  {
    id: 'fullbleed',
    name: 'Full Bleed',
    blurb: 'One photo, edge to edge',
    gap: 0,
    titleBand: { x: 0, y: 0.72, w: 1, h: 0.28 },
    panels: [
      { x: 0, y: 0, w: 1, h: 1 },
    ],
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

// Panels in absolute pixels for a cover of width W and height H.
export function panelRects(layout, W, H) {
  return layout.panels.map((p) => ({
    x: Math.round(p.x * W),
    y: Math.round(p.y * H),
    w: Math.round(p.w * W),
    h: Math.round(p.h * H),
    rot: p.rot || 0,
    border: p.border ? Math.round(p.border * Math.min(W, H)) : 0,
  }));
}

// Default crop for a photo in a panel: cover-fit, slightly top-biased
// (faces usually sit in the upper half of a photo), no flip.
export function defaultCrop() {
  return { photo: 0, zoom: 1, panX: 0.5, panY: 0.35, flip: false };
}
