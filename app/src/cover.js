// Cover renderer for Vice Coast Cover Studio.
// Draws the whole poster onto any canvas: the live preview and the export PNG
// share this one code path, so what you see is exactly what you download.
import { buildLuts, applyLuts, gradeById } from './grades.js';
import { layoutById, panelRects } from './layouts.js';

const grainTile = makeGrainTile();

function makeGrainTile() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const x = c.getContext('2d');
  const img = x.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.strokeStyle = 'rgba(20,5,30,0.85)';
  ctx.stroke();
}

// Draw one photo into a panel rect, honouring its crop (zoom / pan / flip),
// then grade the panel pixels with the grade LUTs.
function drawPanel(ctx, photo, rect, crop, luts, sat) {
  const { x, y, w, h } = rect;
  if (!photo || w <= 0 || h <= 0) return;
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const pad = rect.border || 0;
  const pw = w - pad * 2;
  const ph = h - pad * 2;

  // Render the photo (graded) to a temp canvas at panel resolution.
  const tmp = document.createElement('canvas');
  const scale = Math.min(1, 900 / Math.max(pw, ph));
  tmp.width = Math.max(2, Math.round(pw * scale));
  tmp.height = Math.max(2, Math.round(ph * scale));
  const t = tmp.getContext('2d');
  const base = Math.max(tmp.width / iw, tmp.height / ih) * (crop.zoom || 1);
  const dw = iw * base;
  const dh = ih * base;
  const dx = (tmp.width - dw) * (crop.panX ?? 0.5);
  const dy = (tmp.height - dh) * (crop.panY ?? 0.5);
  t.save();
  if (crop.flip) {
    t.translate(tmp.width / 2, 0);
    t.scale(-1, 1);
    t.translate(-tmp.width / 2, 0);
  }
  t.drawImage(photo, dx, dy, dw, dh);
  t.restore();
  const img = t.getImageData(0, 0, tmp.width, tmp.height);
  applyLuts(img, luts, sat);
  t.putImageData(img, 0, 0);

  // Place the graded panel, with rotation / snapshot border when the layout asks.
  ctx.save();
  if (rect.rot) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((rect.rot * Math.PI) / 180);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = w * 0.04;
    ctx.shadowOffsetY = w * 0.015;
    if (pad) {
      ctx.fillStyle = '#fdf6ec';
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    ctx.drawImage(tmp, -pw / 2, -ph / 2, pw, ph);
  } else {
    if (pad) {
      ctx.fillStyle = '#fdf6ec';
      ctx.fillRect(x, y, w, h);
    }
    ctx.drawImage(tmp, x + pad, y + pad, pw, ph);
  }
  ctx.restore();
}

function halftoneBand(ctx, band, W) {
  const { x, y, w, h } = band;
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, '#ff2e88');
  grad.addColorStop(0.5, '#ff7a1a');
  grad.addColorStop(1, '#ffd23e');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  // Rows of dots, shrinking toward the right edge — the classic poster halftone.
  const step = Math.max(10, h / 5);
  for (let row = 0; row < 4; row++) {
    const cy = y + (row + 0.5) * (h / 4);
    for (let cx = x + step / 2; cx < x + w; cx += step) {
      const t = (cx - x) / w;
      const r = step * 0.32 * (1 - t * 0.55) * (row % 2 === 0 ? 1 : 0.8);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20,5,30,0.28)';
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawLettering(ctx, W, H, state, band) {
  const { x, y, w, h } = band;
  const cx = x + w / 2;

  // Title: Anton, sunset gradient, dark outline, hard drop shadow.
  const title = (state.title || 'VICE COAST').toUpperCase();
  const titleSize = Math.min(h * 0.52, (w * 0.92) / Math.max(4, title.length * 0.62));
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${titleSize}px Anton, sans-serif`;
  const ty = y + h * 0.42;
  const tGrad = ctx.createLinearGradient(cx - w * 0.4, ty, cx + w * 0.4, ty);
  tGrad.addColorStop(0, '#ffd23e');
  tGrad.addColorStop(0.45, '#ff7a1a');
  tGrad.addColorStop(1, '#ff2e88');
  ctx.shadowColor = 'rgba(10,2,20,0.85)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = titleSize * 0.07;
  ctx.lineJoin = 'round';
  ctx.lineWidth = titleSize * 0.10;
  ctx.strokeStyle = '#160a24';
  ctx.strokeText(title, cx, ty);
  ctx.fillStyle = tGrad;
  ctx.fillText(title, cx, ty);
  ctx.restore();

  // Subtitle: Pacifico script under the title.
  const sub = state.subtitle || '';
  if (sub) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.min(h * 0.20, 44 * (W / 1080))}px Pacifico, cursive`;
    ctx.fillStyle = '#fff7ea';
    ctx.shadowColor = 'rgba(10,2,20,0.7)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillText(sub, cx, y + h * 0.82);
    ctx.restore();
  }

  // Badge pill, top-left.
  const badge = (state.badge || 'VICE COAST').toUpperCase();
  const bs = Math.max(15, W * 0.016);
  ctx.save();
  ctx.font = `${bs}px Anton, sans-serif`;
  const bw = ctx.measureText(badge).width + bs * 2.2;
  const bh = bs * 2.1;
  const bx = W * 0.03;
  const by = H * 0.025;
  ctx.fillStyle = 'rgba(13,7,22,0.72)';
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = Math.max(2, W * 0.002);
  roundRect(ctx, bx, by, bw, bh, bh / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff5da2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, bx + bw / 2, by + bh / 2 + 1);
  ctx.restore();

  // Five-star heat meter, top-right.
  const heat = Math.max(1, Math.min(5, state.heat || 4));
  const sr = Math.max(11, W * 0.014);
  const gap = sr * 2.4;
  const total = gap * 5;
  const sx = W - W * 0.03 - total;
  const sy = H * 0.025 + sr * 1.4;
  ctx.save();
  ctx.font = `${Math.max(11, W * 0.011)}px Anton, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('HEAT', sx - sr, sy);
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, sx + i * gap + sr, sy, sr, i < heat ? '#ffd23e' : 'rgba(255,255,255,0.28)');
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function grain(ctx, W, H) {
  const pat = ctx.createPattern(grainTile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function vignette(ctx, W, H) {
  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,2,20,0.42)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// The one render path. `photos` is an array of loaded <img>/canvas images.
// `state.crops` is parallel to the layout's panels: {photo, zoom, panX, panY, flip}.
export function renderCover(ctx, W, H, state, photos) {
  const layout = layoutById(state.layoutId);
  const grade = gradeById(state.gradeId);
  const strength = (state.strength ?? 80) / 100;
  const sat = 1 + (grade.sat - 1) * strength;
  const luts = buildLuts(grade, strength);

  // Sunset backdrop shows through the gaps between panels.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1b0b33');
  bg.addColorStop(0.55, '#3d1158');
  bg.addColorStop(0.8, '#a4135c');
  bg.addColorStop(1, '#ff7a1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const rects = panelRects(layout, W, H);
  rects.forEach((rect, i) => {
    const crop = (state.crops && state.crops[i]) || { photo: 0, zoom: 1, panX: 0.5, panY: 0.5, flip: false };
    const photo = photos[crop.photo] || photos[0] || null;
    drawPanel(ctx, photo, rect, crop, luts, sat);
  });

  const band = {
    x: layout.titleBand.x * W,
    y: layout.titleBand.y * H,
    w: layout.titleBand.w * W,
    h: layout.titleBand.h * H,
  };
  if (state.halftone !== false) halftoneBand(ctx, band, W);
  drawLettering(ctx, W, H, state, band);

  if (state.grain !== false) grain(ctx, W, H);
  if (state.vignette !== false) vignette(ctx, W, H);
}

// Await the two display fonts so lettering never falls back to a system font.
export async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch (e) {
    // Fonts still render from @font-face on next paint; never block the app.
  }
}
