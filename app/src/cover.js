// Vice Coast Cover Studio — cover render engine.
// Draws a multi-panel GTA-poster-style cover onto a 2D canvas: panel layouts,
// gradient-map colour grades, bold display lettering with a script subtitle,
// halftone title band, badge ribbon, heat meter, grain and vignette.
// No network use: every input is an Image already loaded from the user's machine.
export const LAYOUTS = {
  hero3: { name: 'Hero + 3', panels: 4 },
  grid4: { name: '4-Panel Grid', panels: 4 },
  grid9: { name: '9-Panel Grid', panels: 9 },
  tilted: { name: 'Tilted Snapshots', panels: 3 },
  fullbleed: { name: 'Full Bleed', panels: 1 },
};

export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    stops: ['#160a2e', '#7a1e6e', '#ff5e3a', '#ffb347', '#fff3b0'],
    tint: '#ff7a3c', title: ['#ffe259', '#ff7e5f'],
  },
  neon: {
    name: 'Neon Nights',
    stops: ['#070a2e', '#3b0f66', '#ff2e88', '#22e6ff', '#e8fff9'],
    tint: '#ff2e88', title: ['#7df9ff', '#ff5db1'],
  },
  golden: {
    name: 'Golden Hour',
    stops: ['#1d0f00', '#7a3d0d', '#c96f1e', '#ffcf6e', '#fff7d6'],
    tint: '#ffb347', title: ['#fff3b0', '#ff9a3c'],
  },
  midnight: {
    name: 'Midnight Purple',
    stops: ['#0a0518', '#2a1150', '#5b2a86', '#b537f2', '#ffd6ff'],
    tint: '#b537f2', title: ['#e0aaff', '#7b2fbe'],
  },
  teal: {
    name: 'Palm Teal',
    stops: ['#02161f', '#074b4f', '#0e7c7b', '#7fe3c0', '#f2fff8'],
    tint: '#2ec4b6', title: ['#c8fff2', '#2ec4b6'],
  },
};

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Build a 256-entry gradient-map lookup from hex stops.
export function buildGradeLut(stops) {
  const rgb = stops.map(hexRgb);
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const seg = Math.min(rgb.length - 2, Math.floor(t * (rgb.length - 1)));
    const local = t * (rgb.length - 1) - seg;
    const c = lerpColor(rgb[seg], rgb[seg + 1], local);
    lut[i * 3] = c[0];
    lut[i * 3 + 1] = c[1];
    lut[i * 3 + 2] = c[2];
  }
  return lut;
}

// Map every pixel's luminance through the grade LUT, blended with the original.
export function applyGrade(ctx, w, h, lut, intensity) {
  if (intensity <= 0) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const mix = Math.min(1, intensity);
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    const j = lum * 3;
    d[i] = d[i] + (lut[j] - d[i]) * mix;
    d[i + 1] = d[i + 1] + (lut[j + 1] - d[i + 1]) * mix;
    d[i + 2] = d[i + 2] + (lut[j + 2] - d[i + 2]) * mix;
  }
  ctx.putImageData(img, 0, 0);
}

// Draw one photo into a panel rect with cover-fit, zoom, pan offsets and flip.
export function drawPhotoInto(ctx, img, rect, panel) {
  const zoom = panel.zoom || 1;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (panel.flip) {
    ctx.translate(rect.x + rect.w / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(rect.x + rect.w / 2), 0);
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// Panel rectangles for each layout, in fractions of the cover.
export function layoutPanels(layout, W, H) {
  const m = 0.028; // outer margin fraction
  const g = 0.014; // gutter fraction
  const mx = W * m;
  const my = H * m;
  const gx = W * g;
  const gy = H * g;
  const innerW = W - 2 * mx;
  const titleH = H * 0.155;
  const bodyH = H - 2 * my - titleH - gy;
  const col = (n) => (innerW - gx * (n - 1)) / n;
  const row = (n) => (bodyH - gy * (n - 1)) / n;
  if (layout === 'hero3') {
    const heroH = bodyH * 0.62;
    const smallH = bodyH - heroH - gy;
    const w3 = col(3);
    return [
      { x: mx, y: my, w: innerW, h: heroH, rot: 0 },
      { x: mx, y: my + heroH + gy, w: w3, h: smallH, rot: 0 },
      { x: mx + w3 + gx, y: my + heroH + gy, w: w3, h: smallH, rot: 0 },
      { x: mx + 2 * (w3 + gx), y: my + heroH + gy, w: w3, h: smallH, rot: 0 },
    ];
  }
  if (layout === 'grid4') {
    const w2 = col(2);
    const h2 = row(2);
    return [
      { x: mx, y: my, w: w2, h: h2, rot: 0 },
      { x: mx + w2 + gx, y: my, w: w2, h: h2, rot: 0 },
      { x: mx, y: my + h2 + gy, w: w2, h: h2, rot: 0 },
      { x: mx + w2 + gx, y: my + h2 + gy, w: w2, h: h2, rot: 0 },
    ];
  }
  if (layout === 'grid9') {
    const w3 = col(3);
    const h3 = row(3);
    const out = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        out.push({ x: mx + c * (w3 + gx), y: my + r * (h3 + gy), w: w3, h: h3, rot: 0 });
      }
    }
    return out;
  }
  if (layout === 'tilted') {
    const w = innerW * 0.42;
    const h = bodyH * 0.62;
    return [
      { x: mx, y: my + bodyH * 0.02, w, h, rot: -0.1 },
      { x: mx + innerW * 0.30, y: my + bodyH * 0.16, w, h, rot: 0.045 },
      { x: mx + innerW * 0.58, y: my + bodyH * 0.02, w, h, rot: 0.11 },
    ];
  }
  // fullbleed
  return [{ x: 0, y: 0, w: W, h: H, rot: 0 }];
}

export function titleBandRect(W, H, titlePos) {
  const h = H * 0.155;
  return titlePos === 'top'
    ? { x: 0, y: 0, w: W, h }
    : { x: 0, y: H - h, w: W, h };
}

let noiseCanvas = null;
export function grainOverlay(ctx, W, H, amount) {
  if (amount <= 0) return;
  if (!noiseCanvas) {
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 160;
    noiseCanvas.height = 160;
    const nctx = noiseCanvas.getContext('2d');
    const img = nctx.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = 0.09 * amount;
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(noiseCanvas, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export function vignette(ctx, W, H) {
  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,4,24,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function halftoneDots(ctx, rect, color) {
  ctx.save();
  ctx.fillStyle = color;
  const step = Math.max(10, rect.h / 9);
  for (let y = rect.y + step * 0.7; y < rect.y + rect.h; y += step) {
    for (let x = rect.x + step * 0.7; x < rect.x + rect.w; x += step) {
      const r = step * 0.16;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startPx, family, weight) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 24 && ctx.measureText(text).width > maxWidth) {
    px -= 4;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

// The main draw: state holds layout, grade, title, subtitle, intensity, grain,
// halftone, titlePos, titleSize, spacing; panels hold per-panel photo settings;
// photos is an array of loaded Image elements.
export function drawCover(canvas, state, panels, photos) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.sunset;
  const lut = buildGradeLut(grade.stops);

  // Backdrop: deep violet with a sunset wash, so gutters and tilted gaps look printed.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#160a2e');
  bg.addColorStop(0.55, '#2a0f45');
  bg.addColorStop(1, '#12041f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const rects = layoutPanels(state.layout, W, H);
  const fullbleed = state.layout === 'fullbleed';

  // Panels: each photo drawn to a temp canvas, graded, then pasted with keylines.
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    const p = panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0, flip: false };
    const img = photos[p.photo];
    const pad = state.layout === 'tilted' ? Math.round(W * 0.012) : 0;
    ctx.save();
    if (r.rot) {
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate(r.rot);
      ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    }
    if (state.layout === 'tilted') {
      ctx.fillStyle = '#fff8ef';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = W * 0.02;
      ctx.shadowOffsetY = H * 0.008;
      ctx.fillRect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2);
      ctx.shadowColor = 'transparent';
    }
    const inner = { x: r.x, y: r.y, w: r.w, h: r.h };
    if (img) {
      const tmp = document.createElement('canvas');
      tmp.width = Math.max(2, Math.round(r.w));
      tmp.height = Math.max(2, Math.round(r.h));
      const tctx = tmp.getContext('2d');
      drawPhotoInto(tctx, img, { x: 0, y: 0, w: tmp.width, h: tmp.height }, p);
      applyGrade(tctx, tmp.width, tmp.height, lut, state.intensity * 0.85);
      ctx.drawImage(tmp, r.x, r.y, r.w, r.h);
    } else {
      // Empty panel placeholder: warm gradient with a dashed frame.
      const pg = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      pg.addColorStop(0, '#3d1a5e');
      pg.addColorStop(1, '#ff5e3a');
      ctx.fillStyle = pg;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = Math.max(2, W * 0.002);
      ctx.setLineDash([W * 0.012, W * 0.008]);
      ctx.strokeRect(r.x + W * 0.01, r.y + W * 0.01, r.w - W * 0.02, r.h - W * 0.02);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `700 ${Math.round(W * 0.022)}px Anton, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD PHOTO', r.x + r.w / 2, r.y + r.h / 2);
    }
    if (!fullbleed) {
      // Thin dark keyline + hairline white edge, like a printed poster panel.
      ctx.strokeStyle = 'rgba(12,4,24,0.85)';
      ctx.lineWidth = Math.max(2, W * 0.0025);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    }
    ctx.restore();
  }

  // Warm tint wash over the whole cover, then vignette.
  ctx.save();
  ctx.globalAlpha = 0.10 * state.intensity;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  vignette(ctx, W, H);

  // Title band with halftone dots.
  const band = titleBandRect(W, H, state.titlePos);
  const bandGrad = ctx.createLinearGradient(band.x, band.y, band.x, band.y + band.h);
  bandGrad.addColorStop(0, '#14082b');
  bandGrad.addColorStop(1, '#0a0318');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  ctx.fillStyle = grade.title[0];
  ctx.fillRect(band.x, band.y, band.w, Math.max(3, H * 0.004));
  if (state.halftone) halftoneDots(ctx, { x: band.x, y: band.y, w: band.w * 0.5, h: band.h }, 'rgba(255,255,255,0.10)');

  // Badge ribbon, top corner opposite the title band.
  const badgeY = state.titlePos === 'top' ? H - H * 0.075 : H * 0.028;
  drawBadge(ctx, W, badgeY, grade);

  // Title + subtitle lettering.
  const title = (state.title || 'VICE COAST').toUpperCase();
  const sub = state.subtitle || '';
  const padX = W * 0.045;
  const titleMax = W - padX * 2;
  const basePx = H * 0.088 * (state.titleSize || 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${Math.round((state.spacing ?? 6) * W / 1080)}px`; } catch { /* older canvas */ }
  const titlePx = fitFont(ctx, title, titleMax, basePx, 'Anton, sans-serif', 400);
  const titleGrad = ctx.createLinearGradient(0, band.y + band.h * 0.12, 0, band.y + band.h * 0.92);
  titleGrad.addColorStop(0, grade.title[0]);
  titleGrad.addColorStop(1, grade.title[1]);
  const cy = band.y + band.h * (sub ? 0.38 : 0.52);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = W * 0.008;
  ctx.shadowOffsetY = H * 0.004;
  ctx.lineWidth = Math.max(3, titlePx * 0.09);
  ctx.strokeStyle = '#12041f';
  ctx.lineJoin = 'round';
  ctx.strokeText(title, padX, cy);
  ctx.fillStyle = titleGrad;
  ctx.fillText(title, padX, cy);
  ctx.restore();
  if (sub) {
    ctx.font = `${Math.round(H * 0.032)}px Pacifico, cursive`;
    ctx.fillStyle = '#ffe9f3';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.fillText(sub, padX, band.y + band.h * 0.80);
    ctx.shadowColor = 'transparent';
  }
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }

  // Heat meter: five stars + "HEAT" label inside the band, right aligned.
  drawHeatMeter(ctx, W, band, grade);

  grainOverlay(ctx, W, H, state.grain ?? 0.5);
  return rects;
}

function drawBadge(ctx, W, y, grade) {
  const text = 'VICE COAST';
  const fs = Math.round(W * 0.02);
  ctx.save();
  ctx.font = `400 ${fs}px Anton, sans-serif`;
  const tw = ctx.measureText(text).width;
  const bw = tw + W * 0.036;
  const bh = fs * 2.1;
  const bx = W - bw - W * 0.028;
  ctx.fillStyle = grade.title[1];
  ctx.beginPath();
  ctx.moveTo(bx, y);
  ctx.lineTo(bx + bw, y);
  ctx.lineTo(bx + bw - bh * 0.45, y + bh);
  ctx.lineTo(bx, y + bh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#14082b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + bw / 2, y + bh / 2 + 1);
  ctx.restore();
}

function drawHeatMeter(ctx, W, band, grade) {
  const stars = '★★★★★';
  const fs = Math.round(W * 0.02);
  ctx.save();
  ctx.font = `${fs}px sans-serif`;
  const sw = ctx.measureText(stars).width;
  const x = W - W * 0.045 - sw;
  const y = band.y + band.h * 0.80;
  ctx.fillStyle = grade.title[0];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(stars, x, y);
  ctx.font = `400 ${Math.round(W * 0.016)}px Anton, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'right';
  ctx.fillText('HEAT', x - W * 0.012, y);
  ctx.restore();
}
