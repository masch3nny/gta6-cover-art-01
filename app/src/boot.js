// Boot for Sunset Cover Studio: loads the display font and the sample
// photos, builds the editor state, wires the editor, and handles the
// deterministic ?shot= scenes used for screenshots.
import { drawCover } from './render.js';
import { initEditor, rebuildPanelsForLayout } from './editor.js';
import { layoutGeometry, layoutPanelCount } from './panels.js';
import { SIZES } from './export.js';
import { readSceneParams, applySceneToState, showExportedCover } from './scenes.js';

// Sample photos bundled with the app, free to use.
const SAMPLE_PHOTOS = [
  { name: 'rider', src: 'samples/rider.jpg' },
  { name: 'beach', src: 'samples/beach.jpg' },
  { name: 'street', src: 'samples/street.jpg' },
  { name: 'boulevard', src: 'samples/boulevard.jpg' },
  { name: 'pier', src: 'samples/pier.jpg' },
];

// Load one image file into an Image object.
function loadPhotoImage(photo) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ ...photo, img });
    img.onerror = () => resolve({ ...photo, img: null });
    img.src = photo.src;
  });
}

// The editor state: everything the cover is drawn from.
function freshState(photos) {
  const state = {
    layout: 'hero',
    grade: 'sunset',
    size: '1920x1080',
    title: 'SUNSET HEIST',
    subtitle: 'A Solmar Bay story',
    tagline: 'Every sunset has a price.',
    lettering: 'gradient',
    photos,
    panels: [],
    selected: 0,
  };
  rebuildPanelsForLayout(state);
  state.panels[0].photo = 0;
  state.panels[1].photo = 1;
  state.panels[2].photo = 2;
  return state;
}

// Size the preview canvas to the current export aspect, capped for speed.
function fitPreviewCanvas(canvas, sizeId) {
  const size = SIZES[sizeId] || SIZES['1920x1080'];
  const scale = Math.min(1, 960 / Math.max(size.w, size.h));
  const w = Math.round(size.w * scale);
  const h = Math.round(size.h * scale);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h };
}

// Draw the selection outline around the selected panel.
function drawSelectionOutline(ctx, state, W, H) {
  const geo = layoutGeometry(state.layout, W, H);
  const rel = geo.panels[state.selected];
  if (!rel) return;
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.setLineDash([Math.max(8, W * 0.012), Math.max(6, W * 0.008)]);
  ctx.strokeRect(rel.x * W + 2, rel.y * H + 2, rel.w * W - 4, rel.h * H - 4);
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.max(11, W * 0.016)}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`PANEL ${state.selected + 1}`, rel.x * W + 10, rel.y * H + 8);
  ctx.restore();
}

async function boot() {
  const els = {
    preview: document.getElementById('preview'),
    tray: document.getElementById('tray'),
    uploadInput: document.getElementById('upload'),
    fillAllBtn: document.getElementById('fill-all'),
    layoutPicker: document.getElementById('layout-picker'),
    gradePicker: document.getElementById('grade-picker'),
    sizePicker: document.getElementById('size-picker'),
    letteringPicker: document.getElementById('lettering-picker'),
    titleInput: document.getElementById('title-input'),
    subtitleInput: document.getElementById('subtitle-input'),
    taglineInput: document.getElementById('tagline-input'),
    zoomSlider: document.getElementById('zoom-slider'),
    shuffleBtn: document.getElementById('shuffle'),
    exportBtn: document.getElementById('export'),
    toast: document.getElementById('toast'),
  };

  // Load the display font first: the canvas lettering needs it ready.
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch (err) {
    // The canvas falls back to a narrow sans-serif if Anton fails.
  }

  const photos = await Promise.all(SAMPLE_PHOTOS.map(loadPhotoImage));
  const state = freshState(photos.filter((p) => p.img));
  const params = readSceneParams();
  if (params.shot) applySceneToState(params, state, SAMPLE_PHOTOS.map((p) => p.name));

  const ctx = els.preview.getContext('2d');
  function renderPreview() {
    const { w, h } = fitPreviewCanvas(els.preview, state.size);
    drawCover(ctx, state, w, h);
    if (!params.shot) drawSelectionOutline(ctx, state, w, h);
    els.zoomSlider.value = String(state.panels[state.selected] ? state.panels[state.selected].zoom : 1.15);
  }

  initEditor(state, els, renderPreview);
  renderPreview();

  // The ?shot=cover scene replaces the editor with the exported cover.
  if (params.shot === 'cover') {
    document.getElementById('app').style.display = 'none';
    await showExportedCover(state, state.size);
  }
  document.documentElement.classList.add('ready');
}

boot();
