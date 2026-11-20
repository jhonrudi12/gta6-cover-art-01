// Wires the Vice Coast Cover Studio editor: photos in, layout and grade picked,
// caption typed, panels cropped per panel, PNG exported in three post sizes.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).

import { drawCoverArt, ensureCoverFonts, EXPORT_SIZES } from './cover.js';
import { GRADES, gradeById } from './grades.js';
import { LAYOUTS, layoutPanels, panelCount } from './layouts.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const panelList = document.getElementById('panelList');

/** One loaded photo: the image plus the name shown in the picker. */
function makePhoto(img, name) {
  return { img, name };
}

/** The editor state: everything drawCoverArt needs, plus the photo list. */
const state = {
  layout: 'hero3',
  grade: 'sunset',
  gradeAmount: 0.85,
  caption: 'VICE COAST',
  subtitle: 'a sunset heist story',
  size: '1080x1080',
  badge: true,
  stars: 5,
  selectedPanel: 0,
  panels: Array.from({ length: 9 }, (_, i) => ({
    photo: i % 2, zoom: 1, ox: 0, oy: 0, flip: false,
  })),
};
const photos = [];
let ready = false;

function currentSize() {
  return EXPORT_SIZES.find((s) => s.id === state.size) ?? EXPORT_SIZES[0];
}

function photoImages() {
  return photos.map((p) => p.img);
}

/** Redraws the preview canvas at the chosen export size. */
export function redrawCover() {
  const size = currentSize();
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCoverArt(canvas, state, photoImages());
  // The cover-only screenshot shows the exported art clean, with no editor outline.
  if (!document.body.classList.contains('shot-cover')) highlightSelectedPanel();
}

/** Outlines the selected panel on the preview so it is easy to find. */
function highlightSelectedPanel() {
  const ctx = canvas.getContext('2d');
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  const panel = panels[state.selectedPanel];
  if (!panel) return;
  const scale = canvas.width / 1080;
  ctx.save();
  ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
  if (panel.rot) ctx.rotate((panel.rot * Math.PI) / 180);
  ctx.translate(-(panel.x + panel.w / 2), -(panel.y + panel.h / 2));
  ctx.strokeStyle = '#ffd23d';
  ctx.lineWidth = Math.max(4, 6 * scale);
  ctx.setLineDash([18 * scale, 10 * scale]);
  ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
  ctx.restore();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds a photo to the picker and, when it is the first, fills the panels. */
export function addPhoto(img, name) {
  if (photos.length >= 6) {
    status.textContent = 'Six photos is the limit — remove one first.';
    return;
  }
  photos.push(makePhoto(img, name));
  rebuildPhotoPickers();
  redrawCover();
}

/** Rebuilds the per-panel photo dropdown and the sample strip after a change. */
function rebuildPhotoPickers() {
  const select = document.getElementById('panelPhoto');
  select.innerHTML = '';
  photos.forEach((photo, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `${i + 1}. ${photo.name}`;
    select.appendChild(option);
  });
  select.value = String(state.panels[state.selectedPanel].photo);
  document.getElementById('photoCount').textContent =
    `${photos.length} photo${photos.length === 1 ? '' : 's'} loaded`;
}

/** Rebuilds the clickable panel buttons (P1..Pn) for the current layout. */
function rebuildPanelButtons() {
  panelList.innerHTML = '';
  const count = panelCount(state.layout);
  if (state.selectedPanel >= count) state.selectedPanel = 0;
  for (let i = 0; i < count; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'panel-btn' + (i === state.selectedPanel ? ' selected' : '');
    button.textContent = `Panel ${i + 1}`;
    button.addEventListener('click', () => selectPanel(i));
    panelList.appendChild(button);
  }
}

/** Selects a panel for cropping and refreshes its controls. */
export function selectPanel(i) {
  state.selectedPanel = i;
  const setting = state.panels[i];
  document.getElementById('panelPhoto').value = String(setting.photo);
  document.getElementById('zoom').value = String(setting.zoom);
  document.getElementById('panX').value = String(setting.ox);
  document.getElementById('panY').value = String(setting.oy);
  document.getElementById('flip').checked = setting.flip;
  rebuildPanelButtons();
  redrawCover();
}

/** Builds the layout and grade picker buttons from their definitions. */
function buildPickers() {
  const layoutBox = document.getElementById('layoutPicker');
  LAYOUTS.forEach((layout) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pick' + (layout.id === state.layout ? ' selected' : '');
    button.textContent = layout.name;
    button.title = layout.blurb;
    button.addEventListener('click', () => {
      state.layout = layout.id;
      layoutBox.querySelectorAll('.pick').forEach((b) => b.classList.remove('selected'));
      button.classList.add('selected');
      rebuildPanelButtons();
      redrawCover();
    });
    layoutBox.appendChild(button);
  });
  const gradeBox = document.getElementById('gradePicker');
  GRADES.forEach((grade) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pick grade' + (grade.id === state.grade ? ' selected' : '');
    button.title = `${grade.name} — ${grade.blurb}`;
    const dot = document.createElement('span');
    dot.className = 'swatch';
    dot.style.background = grade.swatch;
    button.appendChild(dot);
    button.appendChild(document.createTextNode(grade.name));
    button.addEventListener('click', () => {
      state.grade = grade.id;
      gradeBox.querySelectorAll('.pick').forEach((b) => b.classList.remove('selected'));
      button.classList.add('selected');
      document.getElementById('gradeBlurb').textContent = grade.blurb;
      redrawCover();
    });
    gradeBox.appendChild(button);
  });
  const sizeSelect = document.getElementById('size');
  EXPORT_SIZES.forEach((size) => {
    const option = document.createElement('option');
    option.value = size.id;
    option.textContent = size.label;
    sizeSelect.appendChild(option);
  });
  sizeSelect.value = state.size;
}

/** Clicking the preview selects whichever panel was clicked. */
function wirePreviewClicks() {
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    const panels = layoutPanels(state.layout, canvas.width, canvas.height);
    for (let i = 0; i < panels.length; i++) {
      const p = panels[i];
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) {
        selectPanel(i);
        return;
      }
    }
  });
}

/** Reads one uploaded file into the photo list. */
async function handleUpload(file) {
  const img = await loadImage(URL.createObjectURL(file));
  addPhoto(img, file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Photo');
  status.textContent = `Added ${photos.length} photo${photos.length === 1 ? '' : 's'}. Pick a panel, then crop it.`;
}

/** Exports the cover at the chosen size as a PNG download. */
export function exportCoverPNG() {
  const size = currentSize();
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCoverArt(off, state, photoImages());
  off.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-coast-cover-${size.id}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved vice-coast-cover-${size.id}.png (${size.w} x ${size.h}).`;
  }, 'image/png');
}

function wireControls() {
  document.getElementById('photo').addEventListener('change', async (e) => {
    for (const file of e.target.files) await handleUpload(file);
    e.target.value = '';
  });
  document.querySelectorAll('[data-sample]').forEach((button) => {
    button.addEventListener('click', async () => {
      const name = button.dataset.sample;
      if (photos.some((p) => p.name === name)) return;
      const img = await loadImage(`samples/${name}.jpg`);
      addPhoto(img, name === 'pier' ? 'Pier sunset' : 'Boulevard');
    });
  });
  captionInput.addEventListener('input', () => { state.caption = captionInput.value; redrawCover(); });
  subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redrawCover(); });
  document.getElementById('gradeAmount').addEventListener('input', (e) => {
    state.gradeAmount = Number(e.target.value);
    document.getElementById('gradeAmountLabel').textContent = `${Math.round(state.gradeAmount * 100)}%`;
    redrawCover();
  });
  document.getElementById('badge').addEventListener('change', (e) => {
    state.badge = e.target.checked;
    redrawCover();
  });
  document.getElementById('stars').addEventListener('input', (e) => {
    state.stars = Number(e.target.value);
    document.getElementById('starsLabel').textContent = `${state.stars} / 5`;
    redrawCover();
  });
  document.getElementById('size').addEventListener('change', (e) => {
    state.size = e.target.value;
    redrawCover();
  });
  document.getElementById('panelPhoto').addEventListener('change', (e) => {
    state.panels[state.selectedPanel].photo = Number(e.target.value);
    redrawCover();
  });
  document.getElementById('zoom').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].zoom = Number(e.target.value);
    redrawCover();
  });
  document.getElementById('panX').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].ox = Number(e.target.value);
    redrawCover();
  });
  document.getElementById('panY').addEventListener('input', (e) => {
    state.panels[state.selectedPanel].oy = Number(e.target.value);
    redrawCover();
  });
  document.getElementById('flip').addEventListener('change', (e) => {
    state.panels[state.selectedPanel].flip = e.target.checked;
    redrawCover();
  });
  document.getElementById('fillAll').addEventListener('click', () => {
    const photo = state.panels[state.selectedPanel].photo;
    state.panels.forEach((p) => { p.photo = photo; });
    rebuildPhotoPickers();
    redrawCover();
    status.textContent = 'Every panel now shows the same photo.';
  });
  document.getElementById('export').addEventListener('click', exportCoverPNG);
  wirePreviewClicks();
}

const query = new URLSearchParams(location.search);
const shot = query.get('shot');

async function start() {
  // Shot scenes name their layout, grade, size and caption in the URL; apply
  // them before the pickers are built so the controls match the scene.
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size')) state.size = query.get('size');
  if (query.get('caption')) {
    state.caption = query.get('caption');
    captionInput.value = state.caption;
  }
  buildPickers();
  document.getElementById('gradeBlurb').textContent = gradeById(state.grade).blurb;
  rebuildPanelButtons();
  wireControls();
  await ensureCoverFonts();
  if (shot) {
    await runShot(shot, query, async (sample, text) => {
      const img = await loadImage(sample);
      photos.length = 0;
      addPhoto(img, sample.includes('pier') ? 'Pier sunset' : 'Boulevard');
      state.caption = text;
      captionInput.value = text;
      // A second sample fills the side panels, so multi-panel shots look full.
      const other = sample.includes('pier') ? 'boulevard' : 'pier';
      const img2 = await loadImage(`samples/${other}.jpg`);
      addPhoto(img2, other === 'pier' ? 'Pier sunset' : 'Boulevard');
      redrawCover();
    });
  } else {
    // First run: load both built-in samples so the cover is never empty.
    const pier = await loadImage('samples/pier.jpg');
    addPhoto(pier, 'Pier sunset');
    const boulevard = await loadImage('samples/boulevard.jpg');
    addPhoto(boulevard, 'Boulevard');
    redrawCover();
  }
  ready = true;
  window.__appReady = true;
}

start();
