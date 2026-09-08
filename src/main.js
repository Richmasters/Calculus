import { Painter, AbortedError } from './pipeline/index.js';
import { defaultParams, sanitize, PARAM_INDEX } from './params.js';
import { PRESETS, PRESET_CATEGORIES, findPreset } from './presets.js';
import { ControlPanel } from './ui/controls.js';
import { Viewer } from './ui/viewer.js';
import { resizeToCanvas } from './util/canvas.js';
import { makeSampleImage } from './sample.js';

const $ = (id) => document.getElementById(id);
const STORAGE_PARAMS = 'painterly.params.v1';
const STORAGE_PRESETS = 'painterly.presets.v1';
const MAX_EXPORT_EDGE = 4600;

const el = {
  fileInput: $('fileInput'), openBtn: $('openBtn'), browseBtn: $('browseBtn'),
  sampleBtn: $('sampleBtn'), dropzone: $('dropzone'), viewport: $('viewport'),
  view: $('view'), progress: $('progress'), progressFill: $('progressFill'),
  progressLabel: $('progressLabel'), presetList: $('presetList'),
  customPresetList: $('customPresetList'), controlGroups: $('controlGroups'),
  paramSearch: $('paramSearch'), exportBtn: $('exportBtn'), exportDialog: $('exportDialog'),
  exportScale: $('exportScale'), exportFormat: $('exportFormat'),
  exportQuality: $('exportQuality'), qualityValue: $('qualityValue'),
  qualityField: $('qualityField'), exportAll: $('exportAll'),
  previewQuality: $('previewQuality'), compareToggle: $('compareToggle'),
  holdOriginalBtn: $('holdOriginalBtn'), fitBtn: $('fitBtn'), zoom100Btn: $('zoom100Btn'),
  zoomLabel: $('zoomLabel'), imageMeta: $('imageMeta'), filmstrip: $('filmstrip'),
  randomBtn: $('randomBtn'), resetBtn: $('resetBtn'), savePresetBtn: $('savePresetBtn'),
  exportSettingsBtn: $('exportSettingsBtn'), importSettingsBtn: $('importSettingsBtn'),
  settingsInput: $('settingsInput'), seedRange: $('seedRange'), seedValue: $('seedValue'),
  rerollBtn: $('rerollBtn'), toast: $('toast')
};

const state = {
  images: [],
  active: -1,
  params: loadParams(),
  // Restored settings are no longer "a preset" — nothing should show as active.
  presetId: localStorage.getItem(STORAGE_PARAMS) ? null : 'classic-oil',
  customPresets: loadCustomPresets(),
  renderToken: null,
  busy: false,
  pending: false,
  renders: 0
};

const painter = new Painter();
const exportPainter = new Painter();
let imageSeq = 0;

const viewer = new Viewer(el.view, el.viewport, {
  onZoom: (s) => { el.zoomLabel.textContent = `${Math.round(s * 100)}%`; }
});

const panel = new ControlPanel(el.controlGroups, {
  onChange: (key, value) => {
    state.params[key] = value;
    state.presetId = null;
    panel.sync(state.params);
    markActivePreset();
    persistParams();
    scheduleRender();
  }
});

/* ------------------------------------------------------------------ *
 * Presets
 * ------------------------------------------------------------------ */

function buildPresetList() {
  el.presetList.innerHTML = '';
  for (const category of PRESET_CATEGORIES) {
    const head = document.createElement('div');
    head.className = 'preset-cat';
    head.textContent = category;
    el.presetList.append(head);

    for (const preset of PRESETS.filter((p) => p.category === category)) {
      const btn = document.createElement('button');
      btn.className = 'preset';
      btn.type = 'button';
      btn.dataset.preset = preset.id;
      btn.setAttribute('aria-pressed', String(state.presetId === preset.id));
      btn.innerHTML = `<strong></strong><span></span>`;
      btn.querySelector('strong').textContent = preset.name;
      btn.querySelector('span').textContent = preset.blurb;
      btn.addEventListener('click', () => applyPreset(preset));
      el.presetList.append(btn);
    }
  }
}

function buildCustomPresetList() {
  el.customPresetList.innerHTML = '';
  if (!state.customPresets.length) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'Dial in a look you like, then save it here.';
    el.customPresetList.append(note);
    return;
  }
  for (const preset of state.customPresets) {
    const row = document.createElement('div');
    row.className = 'preset-row';

    const btn = document.createElement('button');
    btn.className = 'preset';
    btn.type = 'button';
    btn.dataset.preset = preset.id;
    btn.setAttribute('aria-pressed', String(state.presetId === preset.id));
    btn.innerHTML = `<strong></strong><span></span>`;
    btn.querySelector('strong').textContent = preset.name;
    btn.querySelector('span').textContent = preset.blurb || 'Saved preset';
    btn.addEventListener('click', () => applyPreset(preset));

    const del = document.createElement('button');
    del.className = 'preset-del';
    del.type = 'button';
    del.title = `Delete “${preset.name}”`;
    del.textContent = '×';
    del.addEventListener('click', () => {
      state.customPresets = state.customPresets.filter((p) => p.id !== preset.id);
      localStorage.setItem(STORAGE_PRESETS, JSON.stringify(state.customPresets));
      buildCustomPresetList();
      toast(`Deleted “${preset.name}”`);
    });

    row.append(btn, del);
    el.customPresetList.append(row);
  }
}

function applyPreset(preset) {
  state.params = sanitize({ ...defaultParams(), ...preset.params, seed: state.params.seed });
  state.presetId = preset.id;
  panel.sync(state.params);
  markActivePreset();
  persistParams();
  scheduleRender();
}

function markActivePreset() {
  for (const btn of document.querySelectorAll('.preset')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.preset === state.presetId));
  }
}

/* ------------------------------------------------------------------ *
 * Images
 * ------------------------------------------------------------------ */

async function addFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/'));
  if (!list.length) {
    toast('No image files in that drop');
    return;
  }
  let added = 0;
  for (const file of list) {
    try {
      const bitmap = await loadBitmap(file);
      addImage(bitmap, file.name);
      added++;
    } catch {
      toast(`Could not read ${file.name}`);
    }
  }
  if (added) {
    setActive(state.images.length - added);
    toast(added === 1 ? 'Photo loaded' : `${added} photos loaded`);
  }
}

async function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
    img.src = url;
  });
}

function addImage(bitmap, name) {
  const width = bitmap.width;
  const height = bitmap.height;
  const thumb = resizeToCanvas(bitmap, 148, Math.max(1, Math.round((148 * height) / width)));
  state.images.push({
    id: `img${++imageSeq}`,
    key: `img${imageSeq}`,
    name: name || `Image ${imageSeq}`,
    bitmap,
    width,
    height,
    thumb: thumb.toDataURL('image/jpeg', 0.7)
  });
  buildFilmstrip();
}

function setActive(index) {
  if (index < 0 || index >= state.images.length) return;
  state.active = index;
  const img = state.images[index];
  el.dropzone.classList.add('hide');
  el.exportBtn.disabled = false;
  el.imageMeta.textContent = `${img.name} · ${img.width}×${img.height}`;
  buildFilmstrip();
  viewer.clear();
  scheduleRender(true);
}

function buildFilmstrip() {
  el.filmstrip.hidden = state.images.length < 2;
  el.filmstrip.innerHTML = '';
  if (state.images.length < 2) return;
  state.images.forEach((img, i) => {
    const btn = document.createElement('button');
    btn.className = 'thumb';
    btn.type = 'button';
    btn.title = img.name;
    btn.setAttribute('aria-pressed', String(i === state.active));
    const im = document.createElement('img');
    im.src = img.thumb;
    im.alt = img.name;
    btn.append(im);
    btn.addEventListener('click', () => setActive(i));
    el.filmstrip.append(btn);
  });
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

let renderTimer = null;

function scheduleRender(immediate = false) {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(runRender, immediate ? 0 : 150);
}

function previewSize(img) {
  const maxEdge = Number(el.previewQuality.value);
  const long = Math.max(img.width, img.height);
  const scale = Math.min(1, maxEdge / long);
  return {
    width: Math.max(2, Math.round(img.width * scale)),
    height: Math.max(2, Math.round(img.height * scale))
  };
}

async function runRender() {
  const img = state.images[state.active];
  if (!img) return;

  if (state.busy) {
    // Cancel the in-flight render and let it restart with the newest settings.
    if (state.renderToken) state.renderToken.cancelled = true;
    state.pending = true;
    return;
  }

  const token = { cancelled: false };
  state.renderToken = token;
  state.busy = true;
  showProgress(true);

  const { width, height } = previewSize(img);
  const original = resizeToCanvas(img.bitmap, width, height);

  try {
    const result = await painter.render({
      source: { key: img.key, bitmap: img.bitmap },
      width,
      height,
      params: state.params,
      token,
      onProgress: (label, value) => setProgress(label, value)
    });
    viewer.setImages(result.canvas, original);
    state.renders++;
  } catch (err) {
    if (!(err instanceof AbortedError)) {
      console.error(err);
      toast('Rendering failed — try a smaller preview size');
    }
  } finally {
    state.busy = false;
    showProgress(false);
    if (state.pending) {
      state.pending = false;
      scheduleRender(true);
    }
  }
}

function showProgress(on) {
  el.progress.hidden = !on;
  if (!on) el.progressFill.style.width = '0%';
}

function setProgress(label, value) {
  el.progressLabel.textContent = label;
  el.progressFill.style.width = `${Math.round(value * 100)}%`;
}

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

async function doExport() {
  const scale = Number(el.exportScale.value);
  const format = el.exportFormat.value;
  const quality = Number(el.exportQuality.value) / 100;
  const targets = el.exportAll.checked ? state.images : [state.images[state.active]];
  if (!targets.length || !targets[0]) return;

  el.exportBtn.disabled = true;
  showProgress(true);

  try {
    for (let i = 0; i < targets.length; i++) {
      const img = targets[i];
      const long = Math.max(img.width, img.height) * scale;
      const k = Math.min(1, MAX_EXPORT_EDGE / long) * scale;
      const width = Math.max(2, Math.round(img.width * k));
      const height = Math.max(2, Math.round(img.height * k));

      const result = await exportPainter.render({
        source: { key: `${img.key}-export`, bitmap: img.bitmap },
        width,
        height,
        params: state.params,
        token: { cancelled: false },
        onProgress: (label, value) =>
          setProgress(`${label} (${i + 1}/${targets.length})`, value)
      });

      await downloadCanvas(result.canvas, fileNameFor(img, format), format, quality);
      exportPainter.invalidate();
    }
    toast(targets.length > 1 ? `Exported ${targets.length} paintings` : 'Painting saved');
  } catch (err) {
    console.error(err);
    toast('Export failed');
  } finally {
    showProgress(false);
    el.exportBtn.disabled = false;
  }
}

function fileNameFor(img, format) {
  const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
  const base = img.name.replace(/\.[^.]+$/, '') || 'painting';
  const style = state.presetId || 'custom';
  return `${base}-${style}.${ext}`;
}

function downloadCanvas(canvas, filename, format, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => { URL.revokeObjectURL(url); resolve(); }, 400);
    }, format, quality);
  });
}

/* ------------------------------------------------------------------ *
 * Settings persistence
 * ------------------------------------------------------------------ */

function loadParams() {
  try {
    const raw = localStorage.getItem(STORAGE_PARAMS);
    if (raw) return sanitize(JSON.parse(raw));
  } catch { /* corrupt or blocked storage — fall through to the default look */ }
  return sanitize({ ...defaultParams(), ...findPreset('classic-oil').params });
}

function persistParams() {
  try {
    localStorage.setItem(STORAGE_PARAMS, JSON.stringify(state.params));
  } catch { /* private browsing — settings just won't persist */ }
}

function loadCustomPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_PRESETS);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ *
 * Misc UI
 * ------------------------------------------------------------------ */

let toastTimer = null;
function toast(message) {
  el.toast.textContent = message;
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2400);
}

function randomize() {
  const base = PRESETS[1 + Math.floor(Math.random() * (PRESETS.length - 1))];
  const next = sanitize({ ...defaultParams(), ...base.params });
  for (const [key, spec] of PARAM_INDEX) {
    if (spec.type === 'toggle' || spec.type === 'color') continue;
    if (spec.type === 'select') {
      if (Math.random() < 0.25) {
        next[key] = spec.options[Math.floor(Math.random() * spec.options.length)].value;
      }
      continue;
    }
    // Nudge rather than scramble: the result should still look like a painting.
    const span = (spec.max - spec.min) * 0.18;
    next[key] = Math.min(spec.max, Math.max(spec.min, next[key] + (Math.random() - 0.5) * 2 * span));
  }
  next.seed = 1 + Math.floor(Math.random() * 998);
  state.params = sanitize(next);
  state.presetId = null;
  syncAll();
  toast(`Riffing on “${base.name}”`);
}

function syncAll() {
  panel.sync(state.params);
  el.seedRange.value = state.params.seed;
  el.seedValue.textContent = state.params.seed;
  markActivePreset();
  persistParams();
  scheduleRender();
}

function saveCurrentPreset() {
  const name = prompt('Name this preset:', 'My look');
  if (!name) return;
  const preset = {
    id: `custom-${Date.now()}`,
    name: name.slice(0, 40),
    blurb: 'Saved preset',
    params: { ...state.params }
  };
  state.customPresets.push(preset);
  try {
    localStorage.setItem(STORAGE_PRESETS, JSON.stringify(state.customPresets));
  } catch {
    toast('Could not save — browser storage is full or blocked');
    return;
  }
  state.presetId = preset.id;
  buildCustomPresetList();
  markActivePreset();
  toast(`Saved “${preset.name}”`);
}

/* ------------------------------------------------------------------ *
 * Wiring
 * ------------------------------------------------------------------ */

el.openBtn.addEventListener('click', () => el.fileInput.click());
el.browseBtn.addEventListener('click', () => el.fileInput.click());
el.fileInput.addEventListener('change', () => {
  addFiles(el.fileInput.files);
  el.fileInput.value = '';
});

el.sampleBtn.addEventListener('click', () => {
  addImage(makeSampleImage(), 'demo-scene.png');
  setActive(state.images.length - 1);
});

for (const evt of ['dragenter', 'dragover']) {
  el.viewport.addEventListener(evt, (e) => {
    e.preventDefault();
    el.dropzone.classList.remove('hide');
    el.dropzone.classList.add('dragging');
  });
}
for (const evt of ['dragleave', 'drop']) {
  el.viewport.addEventListener(evt, (e) => {
    e.preventDefault();
    el.dropzone.classList.remove('dragging');
    if (state.images.length) el.dropzone.classList.add('hide');
  });
}
el.viewport.addEventListener('drop', (e) => {
  if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
});

window.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.files || [])];
  if (files.length) addFiles(files);
});

el.previewQuality.addEventListener('change', () => scheduleRender(true));
el.compareToggle.addEventListener('change', () => viewer.setCompare(el.compareToggle.checked));
el.fitBtn.addEventListener('click', () => viewer.fit());
el.zoom100Btn.addEventListener('click', () => viewer.zoomTo(1));

const holdOn = () => viewer.setHoldOriginal(true);
const holdOff = () => viewer.setHoldOriginal(false);
el.holdOriginalBtn.addEventListener('pointerdown', holdOn);
el.holdOriginalBtn.addEventListener('pointerup', holdOff);
el.holdOriginalBtn.addEventListener('pointerleave', holdOff);
el.holdOriginalBtn.addEventListener('blur', holdOff);

el.paramSearch.addEventListener('input', () => panel.filter(el.paramSearch.value));

el.randomBtn.addEventListener('click', randomize);
el.resetBtn.addEventListener('click', () => {
  state.params = defaultParams();
  state.presetId = 'neutral';
  syncAll();
  toast('Settings reset');
});
el.savePresetBtn.addEventListener('click', saveCurrentPreset);

el.exportSettingsBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ version: 1, params: state.params }, null, 2)],
    { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'painterly-settings.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 400);
});
el.importSettingsBtn.addEventListener('click', () => el.settingsInput.click());
el.settingsInput.addEventListener('change', async () => {
  const file = el.settingsInput.files?.[0];
  el.settingsInput.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    state.params = sanitize(data.params || data);
    state.presetId = null;
    syncAll();
    toast('Settings imported');
  } catch {
    toast('That file is not a settings export');
  }
});

el.seedRange.addEventListener('input', () => {
  state.params.seed = Number(el.seedRange.value);
  el.seedValue.textContent = state.params.seed;
  persistParams();
  scheduleRender();
});
el.rerollBtn.addEventListener('click', () => {
  state.params.seed = 1 + Math.floor(Math.random() * 998);
  el.seedRange.value = state.params.seed;
  el.seedValue.textContent = state.params.seed;
  persistParams();
  scheduleRender(true);
});

el.exportBtn.addEventListener('click', () => {
  el.exportAll.disabled = state.images.length < 2;
  if (state.images.length < 2) el.exportAll.checked = false;
  el.exportDialog.showModal();
});
el.exportDialog.addEventListener('close', () => {
  if (el.exportDialog.returnValue === 'ok') doExport();
});
el.exportFormat.addEventListener('change', () => {
  el.qualityField.hidden = el.exportFormat.value === 'image/png';
});
el.exportQuality.addEventListener('input', () => {
  el.qualityValue.textContent = el.exportQuality.value;
});

window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  if (e.key === 'f') viewer.fit();
  if (e.key === 'c') {
    el.compareToggle.checked = !el.compareToggle.checked;
    viewer.setCompare(el.compareToggle.checked);
  }
  if (e.key === 'r') randomize();
});

// Boot
el.qualityField.hidden = el.exportFormat.value === 'image/png';
buildPresetList();
buildCustomPresetList();
panel.sync(state.params);
el.seedRange.value = state.params.seed;
el.seedValue.textContent = state.params.seed;
markActivePreset();

// Expose a tiny hook so the smoke test can drive the app headlessly.
window.__painterly = { state, painter, viewer, addImage, setActive, makeSampleImage };
