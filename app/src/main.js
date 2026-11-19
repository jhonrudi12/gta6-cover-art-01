// Vice Coast Cover Studio — editor: photos, panels, controls, export, undo/redo.
// All photos are read with FileReader on this machine and never uploaded.
import { LAYOUTS, GRADES, SIZES, drawCover, layoutPanels } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const query = new URLSearchParams(location.search);

export const state = {
  layout: query.get('layout') || 'hero3',
  grade: query.get('grade') || 'sunset',
  intensity: 0.85,
  grain: 0.5,
  halftone: true,
  title: query.get('caption') || 'VICE COAST',
  subtitle: 'one last sunset heist',
  titlePos: 'bottom',
  titleSize: 1,
  spacing: 6,
  size: query.get('size') || '1080x1080',
};
if (!LAYOUTS[state.layout]) state.layout = 'hero3';
if (!GRADES[state.grade]) state.grade = 'sunset';
if (!SIZES[state.size]) state.size = '1080x1080';

export const photos = []; // { img, name } — loaded from disk, never sent anywhere
export let panels = []; // one per layout panel: { photo, zoom, ox, oy, flip }
export let selectedPanel = 0;
let lastRects = [];

function defaultPanels(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ photo: photos.length ? i % photos.length : 0, zoom: 1, ox: 0, oy: 0, flip: false });
  }
  return out;
}

function syncPanels() {
  const count = LAYOUTS[state.layout].panels;
  const next = defaultPanels(count);
  for (let i = 0; i < Math.min(count, panels.length); i++) next[i] = panels[i];
  panels = next;
  if (selectedPanel >= count) selectedPanel = 0;
}

// --- undo / redo ------------------------------------------------------------
const undoStack = [];
const redoStack = [];
function snapshot() {
  return JSON.stringify({ state: { ...state }, panels: panels.map((p) => ({ ...p })) });
}
function restore(snap) {
  const data = JSON.parse(snap);
  Object.assign(state, data.state);
  panels = data.panels;
  syncControls();
  render();
}
function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
}
$('undo').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
});
$('redo').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
});

// --- rendering --------------------------------------------------------------
let renderQueued = false;
export function render() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const size = SIZES[state.size];
    if (preview.width !== size.w || preview.height !== size.h) {
      preview.width = size.w;
      preview.height = size.h;
    }
    lastRects = drawCover(preview, state, panels, photos.map((p) => p.img)) || [];
    refreshPanelStrip();
  });
}

function renderNow() {
  const size = SIZES[state.size];
  preview.width = size.w;
  preview.height = size.h;
  lastRects = drawCover(preview, state, panels, photos.map((p) => p.img)) || [];
}

// --- photos -----------------------------------------------------------------
export function loadPhotoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        photos.push({ img, name: file.name || 'photo' });
        resolve();
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function loadSamplePhoto(name) {
  const response = await fetch(`./samples/${name}.jpg`);
  const blob = await response.blob();
  await loadPhotoFile(new File([blob], `${name}.jpg`, { type: 'image/jpeg' }));
}

async function loadSamples(first) {
  setStatus('Loading sample photos…');
  try {
    const wasEmpty = photos.length === 0;
    if (wasEmpty) {
      const order = first === 'pier' ? ['pier', 'boulevard'] : ['boulevard', 'pier'];
      for (const name of order) await loadSamplePhoto(name);
    }
    if (wasEmpty) {
      // Fresh spread: cycle the loaded photos across the panels so a cover
      // shows variety, and nudge a wide hero panel down so faces stay in frame.
      panels = defaultPanels(LAYOUTS[state.layout].panels);
      if (state.layout === 'hero3' && panels[0]) panels[0].oy = 0.06;
      selectedPanel = 0;
    }
    syncPanels();
    refreshThumbs();
    render();
    setStatus('Sample photos loaded — pick a layout, grade and caption, then export.');
  } catch (err) {
    setStatus('Could not load the sample photos.');
  }
}

function refreshThumbs() {
  const box = $('thumbs');
  box.innerHTML = '';
  if (!photos.length) {
    box.innerHTML = '<span class="empty">No photos yet — add one, or load a sample below.</span>';
    return;
  }
  photos.forEach((p, i) => {
    const img = document.createElement('img');
    img.src = p.img.src;
    img.alt = p.name;
    img.title = `Assign ${p.name} to the selected panel`;
    img.classList.toggle('on', panels[selectedPanel] && panels[selectedPanel].photo === i);
    img.addEventListener('click', () => {
      pushHistory();
      panels[selectedPanel].photo = i;
      panels[selectedPanel].zoom = 1;
      panels[selectedPanel].ox = 0;
      panels[selectedPanel].oy = 0;
      refreshThumbs();
      render();
    });
    box.appendChild(img);
  });
}

function refreshPanelStrip() {
  const strip = $('panelStrip');
  if (strip.childElementCount === panels.length) {
    [...strip.children].forEach((b, i) => b.classList.toggle('on', i === selectedPanel));
    return;
  }
  strip.innerHTML = '';
  panels.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (i === selectedPanel ? ' on' : '');
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => {
      selectedPanel = i;
      syncZoomControl();
      refreshThumbs();
      render();
    });
    strip.appendChild(b);
  });
}

function syncZoomControl() {
  const p = panels[selectedPanel];
  if (!p) return;
  $('zoom').value = Math.round(p.zoom * 100);
  $('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
}

// Apply a deterministic scene (used by ?shot= screenshots).
export function applyScene(scene) {
  if (scene.layout && LAYOUTS[scene.layout]) state.layout = scene.layout;
  if (scene.grade && GRADES[scene.grade]) state.grade = scene.grade;
  if (scene.title) state.title = scene.title;
  if (scene.subtitle) state.subtitle = scene.subtitle;
  if (scene.size && SIZES[scene.size]) state.size = scene.size;
  syncPanels();
  syncControls();
}

// --- controls ---------------------------------------------------------------
function buildButtons() {
  const layoutBox = $('layoutBtns');
  Object.entries(LAYOUTS).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (state.layout === key ? ' on' : '');
    b.textContent = def.name;
    b.addEventListener('click', () => {
      pushHistory();
      state.layout = key;
      syncPanels();
      layoutBox.querySelectorAll('.btn').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      render();
    });
    layoutBox.appendChild(b);
  });
  const gradeBox = $('gradeBtns');
  Object.entries(GRADES).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (state.grade === key ? ' on' : '');
    b.title = def.name;
    b.setAttribute('aria-label', def.name);
    b.style.background = `linear-gradient(135deg, ${def.stops[1]}, ${def.stops[2]} 55%, ${def.stops[3]})`;
    b.addEventListener('click', () => {
      pushHistory();
      state.grade = key;
      gradeBox.querySelectorAll('.swatch').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      render();
    });
    gradeBox.appendChild(b);
  });
}

function syncControls() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('titlePos').value = state.titlePos;
  $('titleSize').value = String(state.titleSize);
  $('spacing').value = state.spacing;
  $('spacingVal').textContent = String(state.spacing);
  $('intensity').value = Math.round(state.intensity * 100);
  $('intensityVal').textContent = `${Math.round(state.intensity * 100)}%`;
  $('grain').value = Math.round(state.grain * 100);
  $('grainVal').textContent = `${Math.round(state.grain * 100)}%`;
  $('halftone').checked = state.halftone;
  $('size').value = state.size;
  document.querySelectorAll('#layoutBtns .btn').forEach((b, i) => {
    b.classList.toggle('on', Object.keys(LAYOUTS)[i] === state.layout);
  });
  document.querySelectorAll('#gradeBtns .swatch').forEach((b, i) => {
    b.classList.toggle('on', Object.keys(GRADES)[i] === state.grade);
  });
  syncZoomControl();
  refreshThumbs();
}

function setStatus(text) {
  $('status').textContent = text;
}

function bindControls() {
  $('photos').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    setStatus(`Loading ${files.length} photo${files.length > 1 ? 's' : ''}…`);
    for (const f of files) {
      try { await loadPhotoFile(f); } catch { /* skip unreadable file */ }
    }
    syncPanels();
    refreshThumbs();
    render();
    setStatus(`${photos.length} photo${photos.length > 1 ? 's' : ''} loaded. Click a panel, then a photo, to assign it.`);
    e.target.value = '';
  });
  $('sampleBtn').addEventListener('click', loadSamples);
  $('fillOne').addEventListener('click', () => {
    if (!photos.length) { setStatus('Add a photo first.'); return; }
    pushHistory();
    panels.forEach((p) => { p.photo = 0; });
    refreshThumbs();
    render();
    setStatus('All panels now show the first photo.');
  });
  $('fillMany').addEventListener('click', () => {
    if (!photos.length) { setStatus('Add a photo first.'); return; }
    pushHistory();
    panels.forEach((p, i) => { p.photo = i % photos.length; });
    refreshThumbs();
    render();
    setStatus('Each panel now shows a different photo.');
  });
  $('title').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('title').addEventListener('change', pushHistory);
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('subtitle').addEventListener('change', pushHistory);
  $('titlePos').addEventListener('change', (e) => { pushHistory(); state.titlePos = e.target.value; render(); });
  $('titleSize').addEventListener('change', (e) => { pushHistory(); state.titleSize = Number(e.target.value); render(); });
  $('spacing').addEventListener('input', (e) => {
    state.spacing = Number(e.target.value);
    $('spacingVal').textContent = e.target.value;
    render();
  });
  $('spacing').addEventListener('change', pushHistory);
  $('intensity').addEventListener('input', (e) => {
    state.intensity = Number(e.target.value) / 100;
    $('intensityVal').textContent = `${e.target.value}%`;
    render();
  });
  $('intensity').addEventListener('change', pushHistory);
  $('grain').addEventListener('input', (e) => {
    state.grain = Number(e.target.value) / 100;
    $('grainVal').textContent = `${e.target.value}%`;
    render();
  });
  $('grain').addEventListener('change', pushHistory);
  $('halftone').addEventListener('change', (e) => { pushHistory(); state.halftone = e.target.checked; render(); });
  $('size').addEventListener('change', (e) => { pushHistory(); state.size = e.target.value; render(); });
  $('zoom').addEventListener('input', (e) => {
    const p = panels[selectedPanel];
    if (!p) return;
    p.zoom = Number(e.target.value) / 100;
    $('zoomVal').textContent = `${e.target.value}%`;
    render();
  });
  $('zoom').addEventListener('change', pushHistory);
  $('flipBtn').addEventListener('click', () => {
    const p = panels[selectedPanel];
    if (!p) return;
    pushHistory();
    p.flip = !p.flip;
    render();
  });
  $('centerBtn').addEventListener('click', () => {
    const p = panels[selectedPanel];
    if (!p) return;
    pushHistory();
    p.zoom = 1; p.ox = 0; p.oy = 0;
    syncZoomControl();
    render();
  });
  $('export').addEventListener('click', () => { void exportCover(); });
}

// --- drag to position, wheel to zoom ----------------------------------------
function canvasPoint(e) {
  const rect = preview.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (preview.width / rect.width),
    y: (e.clientY - rect.top) * (preview.height / rect.height),
  };
}
function hitPanel(pt) {
  for (let i = lastRects.length - 1; i >= 0; i--) {
    const r = lastRects[i];
    if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) return i;
  }
  return -1;
}
let drag = null;
preview.addEventListener('pointerdown', (e) => {
  const pt = canvasPoint(e);
  const i = hitPanel(pt);
  if (i < 0) return;
  if (i !== selectedPanel) {
    selectedPanel = i;
    syncZoomControl();
    refreshThumbs();
    render();
  }
  drag = { x: pt.x, y: pt.y, moved: false };
  preview.setPointerCapture(e.pointerId);
});
preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pt = canvasPoint(e);
  const p = panels[selectedPanel];
  const r = lastRects[selectedPanel];
  if (!p || !r) return;
  const dx = (pt.x - drag.x) / r.w;
  const dy = (pt.y - drag.y) / r.h;
  if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
  p.ox = Math.max(-0.6, Math.min(0.6, p.ox + dx));
  p.oy = Math.max(-0.6, Math.min(0.6, p.oy + dy));
  drag.x = pt.x;
  drag.y = pt.y;
  render();
});
preview.addEventListener('pointerup', () => {
  if (drag && drag.moved) pushHistory();
  drag = null;
});
preview.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = panels[selectedPanel];
  if (!p) return;
  p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  syncZoomControl();
  render();
}, { passive: false });

// --- export -----------------------------------------------------------------
export function exportCover(sizeKey) {
  const key = sizeKey || state.size;
  const size = SIZES[key];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, { ...state, size: key }, panels, photos.map((p) => p.img));
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('export failed')); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vice-coast-${key}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus(`Exported vice-coast-${key}.png (${size.w} x ${size.h}).`);
      resolve(blob);
    }, 'image/png');
  });
}

// Headless-friendly export: returns a PNG data URL of the current cover.
window.__exportPNG = async function exportPNGDataURL(sizeKey) {
  const key = sizeKey || state.size;
  const size = SIZES[key];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, { ...state, size: key }, panels, photos.map((p) => p.img));
  return canvas.toDataURL('image/png');
};
window.__viceCoast = { state, photos, panels, render, exportCover };

// --- boot -------------------------------------------------------------------
async function boot() {
  buildButtons();
  bindControls();
  syncPanels();
  try {
    await Promise.all([
      document.fonts.load('400 100px Anton'),
      document.fonts.load('400 60px Pacifico'),
      document.fonts.ready,
    ]);
  } catch { /* fall back to system fonts */ }
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, { loadSamples, loadSamplePhoto, renderNow, setStatus, applyScene, photos });
  } else {
    render();
  }
  syncControls();
  refreshThumbs();
}

boot();
