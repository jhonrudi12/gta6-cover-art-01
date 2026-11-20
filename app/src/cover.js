// Renders the cover onto a canvas: photo panels, a 256-entry LUT colour grade,
// film grain and vignette, then the bold caption lettering, badge and heat meter.
// Everything drawn here is original art made from the user's own photos.

import { buildGradeLUT, gradeById } from './grades.js';
import { layoutPanels, panelCount } from './layouts.js';

/** The three post sizes the app exports. */
export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
];

/** A small deterministic random generator, so grain looks the same every render. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Waits until the two vendored OFL fonts are usable on canvas. */
export async function ensureCoverFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    // The cover still draws with fallback fonts if a font fails to load.
  }
}

/**
 * Draws the whole cover. `state` holds layout, grade, caption, subtitle, badge,
 * stars and per-panel settings; `photos` is the list of loaded images, indexed
 * by each panel's `photo` field.
 */
export function drawCoverArt(canvas, state, photos) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const w = canvas.width;
  const h = canvas.height;
  const grade = gradeById(state.grade);
  const scale = w / 1080;

  // Backdrop: deep dusk purple, so gaps and collage edges read as poster board.
  ctx.fillStyle = '#1c1030';
  ctx.fillRect(0, 0, w, h);

  const panels = layoutPanels(state.layout, w, h);
  const count = panelCount(state.layout);
  for (let i = 0; i < count; i++) {
    const panel = panels[i];
    const setting = state.panels[i] ?? { photo: 0, zoom: 1, ox: 0, oy: 0, flip: false };
    const img = photos[setting.photo] ?? photos[0] ?? null;
    drawPhotoPanel(ctx, img, panel, setting, state.layout === 'collage', scale);
  }

  applyGradeLUT(ctx, w, h, buildGradeLUT(grade), state.gradeAmount);
  addVignette(ctx, w, h);
  addFilmGrain(ctx, w, h, 20261120);

  drawBadgeAndHeat(ctx, state, w, h, grade, scale);
  drawTitleBlock(ctx, state, w, h, grade, scale);
}

/** Draws one photo into one panel: cover-fit, zoom, pan and optional flip. */
export function drawPhotoPanel(ctx, img, panel, setting, snapshotBorder, scale) {
  ctx.save();
  const cx = panel.x + panel.w / 2;
  const cy = panel.y + panel.h / 2;
  ctx.translate(cx, cy);
  if (panel.rot) ctx.rotate((panel.rot * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();
  if (img) {
    const zoom = setting.zoom || 1;
    const base = Math.max(panel.w / img.naturalWidth, panel.h / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * base;
    const ph = img.naturalHeight * base;
    const ox = (setting.ox || 0) * panel.w;
    const oy = (setting.oy || 0) * panel.h;
    // When a tall photo is cropped into a short panel, bias the crop toward the
    // top of the photo, where faces usually are, instead of centring blindly.
    const topBias = ph > panel.h ? (ph - panel.h) * 0.28 : 0;
    ctx.save();
    if (setting.flip) {
      ctx.translate(panel.x + panel.w / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(panel.x + panel.w / 2), 0);
    }
    ctx.drawImage(img, panel.x + (panel.w - pw) / 2 + ox, panel.y + (panel.h - ph) / 2 + oy + topBias, pw, ph);
    ctx.restore();
  } else {
    // Empty panel: a sunset gradient placeholder until a photo is picked.
    const grad = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
    grad.addColorStop(0, '#ff9a5c');
    grad.addColorStop(0.55, '#e84a7a');
    grad.addColorStop(1, '#5b2a86');
    ctx.fillStyle = grad;
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  }
  ctx.restore();

  // Frame each panel: a white snapshot border for the collage, a dark keyline otherwise.
  ctx.save();
  ctx.translate(cx, cy);
  if (panel.rot) ctx.rotate((panel.rot * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  ctx.lineWidth = snapshotBorder ? Math.max(6, 10 * scale) : Math.max(2, 3 * scale);
  ctx.strokeStyle = snapshotBorder ? '#fdf6ec' : 'rgba(12, 6, 24, 0.85)';
  ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
  if (snapshotBorder) {
    ctx.fillStyle = '#fdf6ec';
    ctx.fillRect(panel.x - 4 * scale, panel.y + panel.h, panel.w + 8 * scale, 26 * scale);
  }
  ctx.restore();
}

/** Runs the grade LUT over the whole canvas, blended by `amount` (0..1). */
export function applyGradeLUT(ctx, w, h, lut, amount) {
  if (amount <= 0) return;
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const a = Math.max(0, Math.min(1, amount));
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i] + (lut.r[d[i]] - d[i]) * a;
    d[i + 1] = d[i + 1] + (lut.g[d[i + 1]] - d[i + 1]) * a;
    d[i + 2] = d[i + 2] + (lut.b[d[i + 2]] - d[i + 2]) * a;
  }
  ctx.putImageData(image, 0, 0);
}

/** Darkens the corners so the centre of the cover pops. */
export function addVignette(ctx, w, h) {
  const grad = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  grad.addColorStop(0, 'rgba(10, 4, 24, 0)');
  grad.addColorStop(1, 'rgba(10, 4, 24, 0.42)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/** A light dusting of film grain, seeded so every render matches. */
export function addFilmGrain(ctx, w, h, seed) {
  const rand = mulberry32(seed);
  const step = Math.max(3, Math.round(w / 360));
  ctx.save();
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const v = rand();
      if (v > 0.86) {
        ctx.fillStyle = v > 0.93 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
        ctx.fillRect(x, y, step * 0.6, step * 0.6);
      }
    }
  }
  ctx.restore();
}

/** Shrinks the font until `text` fits `maxWidth`, then returns the size used. */
export function fitTitleFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 12) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/** A band of halftone dots behind the title, fading toward its top edge. */
export function drawHalftoneBand(ctx, x, y, w, h, color) {
  const gap = Math.max(10, w / 90);
  ctx.save();
  for (let row = 0; row * gap < h; row++) {
    for (let col = 0; col * gap < w; col++) {
      const fade = 1 - (row * gap) / h;
      const r = gap * 0.16 + gap * 0.22 * fade * (0.5 + 0.5 * Math.sin(col * 0.9 + row));
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.16 + 0.30 * fade;
      ctx.beginPath();
      ctx.arc(x + col * gap, y + row * gap, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The top-left badge and the top-right five-star heat meter. */
export function drawBadgeAndHeat(ctx, state, w, h, grade, scale) {
  const pad = Math.round(Math.min(w, h) * 0.03);
  ctx.save();
  ctx.textBaseline = 'middle';
  if (state.badge) {
    const label = 'VICE COAST';
    const fontSize = 44 * scale * 0.62;
    ctx.font = `${fontSize}px Anton, sans-serif`;
    const tw = ctx.measureText(label).width;
    const pillH = 44 * scale;
    const pillW = tw + 52 * scale;
    ctx.fillStyle = 'rgba(12, 6, 24, 0.82)';
    ctx.beginPath();
    ctx.roundRect(pad, pad, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = 2.5 * scale;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(label, pad + 26 * scale, pad + pillH / 2 + 1 * scale);
  }
  // Heat meter: five stars, filled up to `state.stars`.
  const star = (cx, cy, r, filled) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = (Math.PI / 5) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const px = cx + Math.cos(ang) * rad;
      const py = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = filled ? '#ffd23d' : 'rgba(255,255,255,0.28)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(12, 6, 24, 0.7)';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();
  };
  const r = 15 * scale;
  const gap = 34 * scale;
  const total = gap * 4 + r * 2;
  for (let i = 0; i < 5; i++) {
    star(w - pad - total + r + i * gap, pad + 22 * scale, r, i < state.stars);
  }
  ctx.restore();
}

/** The caption: halftone band, gradient Anton title, Pacifico subtitle. */
export function drawTitleBlock(ctx, state, w, h, grade, scale) {
  const title = (state.caption || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  if (!title && !subtitle) return;
  const bandH = h * 0.20;
  const bandY = h - bandH;
  // A dark shelf the lettering sits on, so it reads over any photo.
  const shelf = ctx.createLinearGradient(0, bandY, 0, h);
  shelf.addColorStop(0, 'rgba(12, 6, 24, 0)');
  shelf.addColorStop(0.35, 'rgba(12, 6, 24, 0.72)');
  shelf.addColorStop(1, 'rgba(12, 6, 24, 0.92)');
  ctx.fillStyle = shelf;
  ctx.fillRect(0, bandY, w, bandH);
  drawHalftoneBand(ctx, 0, bandY, w, bandH * 0.5, grade.accent);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const maxW = w * 0.92;
  if (title) {
    const size = fitTitleFont(ctx, title, maxW, h * 0.115, 'Anton, sans-serif');
    const ty = h - h * 0.045 - (subtitle ? h * 0.045 : 0);
    const grad = ctx.createLinearGradient(0, ty - size, 0, ty);
    grad.addColorStop(0, grade.titleTop);
    grad.addColorStop(1, grade.titleBottom);
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#14082b';
    ctx.lineWidth = Math.max(4, size * 0.14);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(title, w / 2, ty);
    ctx.fillStyle = grad;
    ctx.fillText(title, w / 2, ty);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (subtitle) {
    const subSize = Math.max(20, h * 0.032);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = subSize * 0.25;
    ctx.fillText(subtitle, w / 2, h - h * 0.028);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}
