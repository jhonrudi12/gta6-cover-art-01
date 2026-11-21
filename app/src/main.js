// Vice Coast Cover Studio — UI wiring.
// State lives here; drawing lives in cover.js, grades in grades.js,
// panel geometry in layouts.js, ?shot= presets in shots.js.
import { GRADES, gradeById } from './grades.js';
import { LAYOUTS, layoutById, panelRects, defaultCrop } from './layouts.js';
import { renderCover, loadFonts } from './cover.js';
import { shotConfig, sampleUrls } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const ctx = canvas.getContext('2d');
const shot = shotConfig();

const state = {
  layoutId: shot?.layout || 'hero3',
  gradeId: shot?.grade || 'sunset',
  strength: shot?.strength ?? 80,
  grain: true,
  vignette: true,
  halftone: true,
  title: shot?.title || 'VICE COAST',
  subtitle: shot?.subtitle || 'sunset chasers & palm dreams',
  heat: shot?.heat || 4,
  badge: 'VICE COAST',
  crops: [],
  exportSize: '1080x1080',
};

let photos = []; // [{ img, name }]
let selectedPanel = -1;
let activePhoto = 0;
let dragging = null;
// Panels the user has picked a photo for by hand; untouched panels get
// spread round-robin across the loaded photos whenever photos change.
const cropsTouched = new Set();

// ---------- photos ----------

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image: ' + src));
    img.src = src;
  });
}

async function addPhoto(img, name) {
  if (photos.length >= 6) {
    setStatus('Six photos max — clear some first.', true);
    return false;
  }
  photos.push({ img, name });
  return true;
}

async function loadSamples() {
  for (const url of ['samples/pier.jpg', 'samples/boulevard.jpg']) {
    try {
      const img = await loadImage(url);
      await addPhoto(img, url.split('/').pop());
    } catch (e) {
      setStatus('Sample failed to load: ' + e.message, true);
    }
  }
  afterPhotosChanged();
}

function afterPhotosChanged() {
  syncCrops();
  renderStrip();
  render();
  $('photoCount').textContent =
    photos.length === 0 ? '0 photos loaded'
    : photos.length === 1 ? '1 photo loaded'
    : `${photos.length} photos loaded`;
}

function renderStrip() {
  const strip = $('photoStrip');
  strip.innerHTML = '';
  photos.forEach((p, i) => {
    const wrap = document.createElement('div');
    const thumb = document.createElement('img');
    thumb.className = 'thumb' + (i === activePhoto ? ' active' : '');
    thumb.src = p.img.src;
    thumb.alt = p.name;
    thumb.title = p.name + ' — click to use in the selected panel';
    thumb.addEventListener('click', () => {
      activePhoto = i;
      if (selectedPanel >= 0) {
        state.crops[selectedPanel].photo = i;
        cropsTouched.add(selectedPanel);
        syncCropPanel();
      }
      renderStrip();
      render();
    });
    const lab = document.createElement('div');
    lab.className = 'thumb-label';
    lab.textContent = p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name;
    wrap.append(thumb, lab);
    strip.appendChild(wrap);
  });
}

// ---------- crops ----------

function syncCrops() {
  const n = layoutById(state.layoutId).panels.length;
  while (state.crops.length < n) {
    const c = defaultCrop();
    c.photo = photos.length ? state.crops.length % photos.length : 0;
    state.crops.push(c);
  }
  state.crops.length = n;
  state.crops.forEach((c, i) => {
    if (!photos[c.photo]) c.photo = 0;
    else if (!cropsTouched.has(i) && photos.length > 1) c.photo = i % photos.length;
  });
  if (selectedPanel >= n) selectedPanel = -1;
}

function panelAt(px, py) {
  const rects = panelRects(layoutById(state.layoutId), canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

function syncCropPanel() {
  const panel = $('cropPanel');
  if (selectedPanel < 0) {
    panel.classList.add('hidden');
    canvas.classList.remove('cropping');
    $('cropHint').classList.add('hidden');
    return;
  }
  const crop = state.crops[selectedPanel];
  panel.classList.remove('hidden');
  canvas.classList.add('cropping');
  $('cropHint').classList.remove('hidden');
  $('cropTitle').textContent = `Panel ${selectedPanel + 1} of ${state.crops.length}`;
  const sel = $('cropPhoto');
  sel.innerHTML = '';
  photos.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i + 1} · ${p.name}`;
    sel.appendChild(opt);
  });
  sel.value = String(crop.photo);
  $('cropZoom').value = String(crop.zoom);
  $('zoomVal').textContent = crop.zoom.toFixed(2) + '×';
  $('cropFlip').checked = !!crop.flip;
}

// ---------- render ----------

function exportDims() {
  const [w, h] = state.exportSize.split('x').map(Number);
  return { W: w, H: h };
}

function render() {
  if (shot && (shot.mode === 'cover' || shot.mode === 'export')) {
    canvas.width = shot.size.W;
    canvas.height = shot.size.H;
  } else {
    const { W, H } = exportDims();
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
  }
  const imgs = photos.map((p) => p.img);
  renderCover(ctx, canvas.width, canvas.height, state, imgs);
  const { W, H } = exportDims();
  $('sizeLabel').textContent =
    shot && (shot.mode === 'cover' || shot.mode === 'export')
      ? `${canvas.width} × ${canvas.height} · Export view`
      : `${W} × ${H} · ${W === H ? 'Square post' : W < H ? 'Portrait post' : 'Landscape post'}`;
  window.__vcReady = true;
}

function setStatus(msg, isError) {
  const el = $('exportStatus');
  el.textContent = msg;
  el.classList.toggle('error', !!isError);
}

// ---------- export ----------

async function exportPng() {
  if (photos.length === 0) {
    setStatus('Add a photo first — samples work too.', true);
    return;
  }
  const btn = $('exportBtn');
  btn.disabled = true;
  setStatus('Drawing your PNG…');
  try {
    await loadFonts();
    const { W, H } = exportDims();
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    renderCover(off.getContext('2d'), W, H, state, photos.map((p) => p.img));
    const blob = await new Promise((res, rej) => off.toBlob((b) => (b ? res(b) : rej(new Error('PNG encode failed'))), 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-coast-${state.layoutId}-${W}x${H}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved ${W} × ${H} PNG — check your downloads.`);
  } catch (e) {
    setStatus('Export failed: ' + e.message, true);
  } finally {
    btn.disabled = false;
  }
}

// ---------- choice rows ----------

function buildChoices() {
  const layoutRow = $('layoutRow');
  LAYOUTS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice-btn' + (l.id === state.layoutId ? ' active' : '');
    b.innerHTML = '';
    const name = document.createElement('strong');
    name.textContent = l.name;
    const small = document.createElement('small');
    small.textContent = l.blurb;
    b.append(name, small);
    b.addEventListener('click', () => {
      state.layoutId = l.id;
      selectedPanel = -1;
      syncCrops();
      syncCropPanel();
      buildChoices();
      render();
    });
    layoutRow.appendChild(b);
  });

  const gradeRow = $('gradeRow');
  GRADES.forEach((g) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice-btn' + (g.id === state.gradeId ? ' active' : '');
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = g.swatch;
    const name = document.createElement('strong');
    name.textContent = g.name;
    const small = document.createElement('small');
    small.textContent = g.blurb;
    b.append(sw, name, small);
    b.addEventListener('click', () => {
      state.gradeId = g.id;
      buildChoices();
      render();
    });
    gradeRow.appendChild(b);
  });
}

// ---------- canvas pointer: select panel, drag to pan, wheel to zoom ----------

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

function drawnSize(panelIndex) {
  const rects = panelRects(layoutById(state.layoutId), canvas.width, canvas.height);
  const rect = rects[panelIndex];
  const crop = state.crops[panelIndex];
  const photo = photos[crop.photo] || photos[0];
  if (!photo) return null;
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const pw = rect.w - (rect.border || 0) * 2;
  const ph = rect.h - (rect.border || 0) * 2;
  const base = Math.max(pw / iw, ph / ih) * crop.zoom;
  return { dw: iw * base, dh: ih * base, pw, ph, rect };
}

canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const idx = panelAt(p.x, p.y);
  if (idx < 0) {
    selectedPanel = -1;
    syncCropPanel();
    return;
  }
  selectedPanel = idx;
  syncCropPanel();
  dragging = { x: p.x, y: p.y, moved: false };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging || selectedPanel < 0) return;
  const p = canvasPoint(e);
  const dx = p.x - dragging.x;
  const dy = p.y - dragging.y;
  if (Math.abs(dx) + Math.abs(dy) > 1) dragging.moved = true;
  const d = drawnSize(selectedPanel);
  if (d && (d.dw > d.pw || d.dh > d.ph)) {
    const crop = state.crops[selectedPanel];
    if (d.dw > d.pw) crop.panX = Math.max(0, Math.min(1, crop.panX + dx / (d.dw - d.pw)));
    if (d.dh > d.ph) crop.panY = Math.max(0, Math.min(1, crop.panY + dy / (d.dh - d.ph)));
    render();
  }
  dragging.x = p.x;
  dragging.y = p.y;
});

canvas.addEventListener('pointerup', () => { dragging = null; });

canvas.addEventListener('wheel', (e) => {
  if (selectedPanel < 0) return;
  e.preventDefault();
  const crop = state.crops[selectedPanel];
  crop.zoom = Math.max(1, Math.min(4, crop.zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
  $('cropZoom').value = String(crop.zoom);
  $('zoomVal').textContent = crop.zoom.toFixed(2) + '×';
  render();
}, { passive: false });

// ---------- wire up controls ----------

function wire() {
  buildChoices();

  $('fileInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      try {
        const img = await loadImage(URL.createObjectURL(f));
        await addPhoto(img, f.name);
      } catch (err) {
        setStatus('Could not read ' + f.name, true);
      }
    }
    afterPhotosChanged();
    e.target.value = '';
  });

  $('loadSamples').addEventListener('click', loadSamples);
  $('clearPhotos').addEventListener('click', () => {
    photos = [];
    cropsTouched.clear();
    selectedPanel = -1;
    syncCropPanel();
    afterPhotosChanged();
  });

  $('gradeStrength').addEventListener('input', (e) => {
    state.strength = Number(e.target.value);
    $('strengthVal').textContent = state.strength + '%';
    render();
  });
  $('grainToggle').addEventListener('change', (e) => { state.grain = e.target.checked; render(); });
  $('vignetteToggle').addEventListener('change', (e) => { state.vignette = e.target.checked; render(); });
  $('halftoneToggle').addEventListener('change', (e) => { state.halftone = e.target.checked; render(); });

  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('badgeInput').addEventListener('input', (e) => { state.badge = e.target.value; render(); });
  $('heatInput').addEventListener('input', (e) => {
    state.heat = Number(e.target.value);
    $('heatVal').textContent = state.heat + ' / 5';
    render();
  });

  document.querySelectorAll('.size-btn').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      state.exportSize = b.dataset.size;
      render();
    });
  });

  $('exportBtn').addEventListener('click', exportPng);

  $('cropDone').addEventListener('click', () => { selectedPanel = -1; syncCropPanel(); });
  $('cropPhoto').addEventListener('change', (e) => {
    if (selectedPanel < 0) return;
    state.crops[selectedPanel].photo = Number(e.target.value);
    cropsTouched.add(selectedPanel);
    activePhoto = Number(e.target.value);
    renderStrip();
    render();
  });
  $('cropZoom').addEventListener('input', (e) => {
    if (selectedPanel < 0) return;
    state.crops[selectedPanel].zoom = Number(e.target.value);
    $('zoomVal').textContent = Number(e.target.value).toFixed(2) + '×';
    render();
  });
  $('cropFlip').addEventListener('change', (e) => {
    if (selectedPanel < 0) return;
    state.crops[selectedPanel].flip = e.target.checked;
    render();
  });
  $('cropCenter').addEventListener('click', () => {
    if (selectedPanel < 0) return;
    const c = state.crops[selectedPanel];
    c.panX = 0.5;
    c.panY = 0.35;
    c.zoom = 1;
    syncCropPanel();
    render();
  });
  $('fillAll').addEventListener('click', () => {
    if (selectedPanel < 0) return;
    const src = { ...state.crops[selectedPanel] };
    state.crops = state.crops.map(() => ({ ...src }));
    state.crops.forEach((_, i) => cropsTouched.add(i));
    render();
  });

  // Initial values from state (shot presets may override defaults).
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('badgeInput').value = state.badge;
  $('heatInput').value = String(state.heat);
  $('heatVal').textContent = state.heat + ' / 5';
  $('gradeStrength').value = String(state.strength);
  $('strengthVal').textContent = state.strength + '%';
}

// ---------- boot ----------

async function boot() {
  wire();
  syncCrops();
  if (shot) {
    if (shot.mode === 'cover' || shot.mode === 'export') {
      document.body.classList.add('shot-export');
      if (shot.size) state.exportSize = `${shot.size.W}x${shot.size.H}`;
    }
    for (const url of sampleUrls(shot.photo)) {
      try {
        const img = await loadImage(url);
        await addPhoto(img, url.split('/').pop());
      } catch (e) { /* samples are optional in shot mode */ }
    }
    afterPhotosChanged();
  } else {
    render();
  }
  await loadFonts();
  render();
}

boot();
