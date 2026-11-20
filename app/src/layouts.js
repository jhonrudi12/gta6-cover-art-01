// Multi-panel layouts for the cover. Each layout returns the panels that fill a
// cover of width w and height h: { x, y, w, h, rot } in pixels, rot in degrees.
// Five layouts, all original geometry: a hero panel with three side panels, two
// grids, a tilted snapshot collage, and one full-bleed photo.

export const LAYOUTS = [
  { id: 'hero3', name: 'Hero + 3', blurb: 'One big hero shot, three stacked beside it.' },
  { id: 'grid4', name: '4-Panel Grid', blurb: 'Four equal frames, comic-book style.' },
  { id: 'grid9', name: '9-Panel Grid', blurb: 'Nine frames, a wall of moments.' },
  { id: 'collage', name: 'Tilted Collage', blurb: 'Snapshots tossed on the table, tilted.' },
  { id: 'fullbleed', name: 'Full Bleed', blurb: 'One photo edge to edge, no panels.' },
];

/** How many panels a layout shows. */
export function panelCount(layoutId) {
  if (layoutId === 'grid9') return 9;
  if (layoutId === 'fullbleed') return 1;
  return 4;
}

/** Looks a layout up by id, falling back to the first layout. */
export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/** Panels for a layout on a cover of w by h pixels. */
export function layoutPanels(layoutId, w, h) {
  const g = Math.max(4, Math.round(Math.min(w, h) * 0.014)); // gutter between panels
  const pad = Math.round(Math.min(w, h) * 0.02); // outer frame
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  if (layoutId === 'fullbleed') {
    return [{ x: 0, y: 0, w, h, rot: 0 }];
  }
  if (layoutId === 'grid4') {
    const cw = (innerW - g) / 2;
    const ch = (innerH - g) / 2;
    return [
      { x: pad, y: pad, w: cw, h: ch, rot: 0 },
      { x: pad + cw + g, y: pad, w: cw, h: ch, rot: 0 },
      { x: pad, y: pad + ch + g, w: cw, h: ch, rot: 0 },
      { x: pad + cw + g, y: pad + ch + g, w: cw, h: ch, rot: 0 },
    ];
  }
  if (layoutId === 'grid9') {
    const cw = (innerW - g * 2) / 3;
    const ch = (innerH - g * 2) / 3;
    const panels = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        panels.push({ x: pad + col * (cw + g), y: pad + row * (ch + g), w: cw, h: ch, rot: 0 });
      }
    }
    return panels;
  }
  if (layoutId === 'collage') {
    // Four overlapping snapshots, each tilted, white photo borders drawn by the renderer.
    const cw = innerW * 0.46;
    const ch = innerH * 0.46;
    return [
      { x: pad + innerW * 0.02, y: pad + innerH * 0.02, w: cw, h: ch, rot: -6 },
      { x: pad + innerW * 0.52, y: pad + innerH * 0.00, w: cw, h: ch, rot: 5 },
      { x: pad + innerW * 0.06, y: pad + innerH * 0.52, w: cw, h: ch, rot: 4 },
      { x: pad + innerW * 0.50, y: pad + innerH * 0.50, w: cw, h: ch, rot: -5 },
    ];
  }
  // hero3: hero on the left, three stacked panels on the right.
  const heroW = innerW * 0.60;
  const sideW = innerW - heroW - g;
  const sideH = (innerH - g * 2) / 3;
  return [
    { x: pad, y: pad, w: heroW, h: innerH, rot: 0 },
    { x: pad + heroW + g, y: pad, w: sideW, h: sideH, rot: 0 },
    { x: pad + heroW + g, y: pad + sideH + g, w: sideW, h: sideH, rot: 0 },
    { x: pad + heroW + g, y: pad + (sideH + g) * 2, w: sideW, h: sideH, rot: 0 },
  ];
}
