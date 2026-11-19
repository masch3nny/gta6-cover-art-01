// Editor UI for Sunset Cover Studio: photo tray, layout/grade/size
// pickers, caption fields, panel selection, drag-to-pan and wheel zoom,
// export and the surprise-me shuffle. The preview canvas is re-rendered
// on every change.
import { drawCover } from './render.js';
import { GRADES, GRADE_ORDER } from './grades.js';
import { LAYOUTS, LAYOUT_ORDER, layoutGeometry, layoutPanelCount } from './panels.js';
import { SIZES, SIZE_ORDER, exportCoverPNG } from './export.js';

// Clamp a panel's pan so its photo always covers the panel.
function clampPanelPan(panel, img, rect) {
  if (!img || !img.naturalWidth) return;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const minPx = (rect.w / 2) / dw;
  const maxPx = 1 - (rect.w / 2) / dw;
  const minPy = (rect.h / 2) / dh;
  const maxPy = 1 - (rect.h / 2) / dh;
  panel.px = Math.min(Math.max(panel.px, minPx), Math.max(minPx, maxPx));
  panel.py = Math.min(Math.max(panel.py, minPy), Math.max(minPy, maxPy));
}

// Fresh per-panel photo placement, with a little variation per panel so
// one photo filling several panels does not look identical everywhere.
function freshPlacement(panelIndex) {
  const nudges = [0.42, 0.55, 0.32, 0.48];
  return { photo: 0, zoom: 1.15, px: 0.5, py: nudges[panelIndex % nudges.length] };
}

// Rebuild the panels array when the layout changes, keeping photos.
export function rebuildPanelsForLayout(state) {
  const count = layoutPanelCount(state.layout);
  const old = state.panels || [];
  state.panels = [];
  for (let i = 0; i < count; i++) {
    const kept = old[i] || freshPlacement(i);
    state.panels.push({ photo: kept.photo, zoom: kept.zoom, px: kept.px, py: kept.py });
  }
  state.selected = 0;
}

// Which panel (if any) holds a point in relative cover coordinates.
function panelAtPoint(state, W, H, rx, ry) {
  const geo = layoutGeometry(state.layout, W, H);
  for (let i = 0; i < geo.panels.length; i++) {
    const p = geo.panels[i];
    if (rx >= p.x && rx <= p.x + p.w && ry >= p.y && ry <= p.y + p.h) return i;
  }
  return -1;
}

// Wire the whole editor. els holds the DOM nodes; onRender is called
// after every state change so the preview refreshes.
export function initEditor(state, els, onRender) {
  // ---- photo tray -------------------------------------------------
  function renderTray() {
    els.tray.innerHTML = '';
    state.photos.forEach((photo, i) => {
      const btn = document.createElement('button');
      btn.className = 'tray-item';
      btn.type = 'button';
      btn.title = photo.name;
      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = photo.name;
      btn.appendChild(img);
      btn.addEventListener('click', () => {
        assignPhotoToSelected(i);
      });
      els.tray.appendChild(btn);
    });
  }

  function assignPhotoToSelected(photoIndex) {
    const panel = state.panels[state.selected];
    if (!panel) return;
    panel.photo = photoIndex;
    const fresh = freshPlacement(state.selected);
    panel.zoom = fresh.zoom;
    panel.px = fresh.px;
    panel.py = fresh.py;
    onRender();
    markSelectedTray();
  }

  function markSelectedTray() {
    const panel = state.panels[state.selected];
    if (!panel) return;
    Array.from(els.tray.children).forEach((child, i) => {
      child.classList.toggle('active', i === panel.photo);
    });
  }

  els.uploadInput.addEventListener('change', (event) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          state.photos.push({ name: file.name.replace(/\.[^.]+$/, ''), src: reader.result, img });
          renderTray();
          assignPhotoToSelected(state.photos.length - 1);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  });

  els.fillAllBtn.addEventListener('click', () => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    state.panels.forEach((p, i) => {
      p.photo = panel.photo;
      const fresh = freshPlacement(i);
      p.zoom = fresh.zoom;
      p.px = fresh.px;
      p.py = fresh.py;
    });
    onRender();
  });

  // ---- pickers ----------------------------------------------------
  function buildPicker(container, items, current, onPick) {
    container.innerHTML = '';
    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.className = 'pick';
      btn.type = 'button';
      btn.dataset.id = item.id;
      btn.textContent = item.label;
      btn.title = item.blurb || item.label;
      if (item.id === current) btn.classList.add('active');
      btn.addEventListener('click', () => {
        onPick(item.id);
        Array.from(container.children).forEach((child) => child.classList.remove('active'));
        btn.classList.add('active');
      });
      container.appendChild(btn);
    });
  }

  buildPicker(els.layoutPicker, LAYOUT_ORDER.map((id) => ({ id, label: LAYOUTS[id].name, blurb: LAYOUTS[id].blurb })), state.layout, (id) => {
    state.layout = id;
    rebuildPanelsForLayout(state);
    onRender();
    markSelectedTray();
  });

  buildPicker(els.gradePicker, GRADE_ORDER.map((id) => ({ id, label: GRADES[id].name, blurb: GRADES[id].blurb })), state.grade, (id) => {
    state.grade = id;
    onRender();
  });

  buildPicker(els.sizePicker, SIZE_ORDER.map((id) => ({ id, label: SIZES[id].label })), state.size, (id) => {
    state.size = id;
    onRender();
  });

  buildPicker(els.letteringPicker, [
    { id: 'gradient', label: 'Sunset Gradient' },
    { id: 'solid', label: 'Bold White' },
    { id: 'outline', label: 'Outline' },
    { id: 'neon', label: 'Neon Glow' },
  ], state.lettering, (id) => {
    state.lettering = id;
    onRender();
  });

  // ---- caption fields ---------------------------------------------
  els.titleInput.value = state.title;
  els.subtitleInput.value = state.subtitle;
  els.taglineInput.value = state.tagline;
  els.titleInput.addEventListener('input', () => { state.title = els.titleInput.value || 'UNTITLED'; onRender(); });
  els.subtitleInput.addEventListener('input', () => { state.subtitle = els.subtitleInput.value; onRender(); });
  els.taglineInput.addEventListener('input', () => { state.tagline = els.taglineInput.value; onRender(); });

  // ---- preview canvas: select, drag to pan, wheel to zoom ---------
  let dragging = null;
  function canvasPoint(event) {
    const rect = els.preview.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }

  els.preview.addEventListener('pointerdown', (event) => {
    const p = canvasPoint(event);
    const idx = panelAtPoint(state, els.preview.width, els.preview.height, p.x, p.y);
    if (idx < 0) return;
    state.selected = idx;
    dragging = { startX: p.x, startY: p.y, px: state.panels[idx].px, py: state.panels[idx].py };
    els.preview.setPointerCapture(event.pointerId);
    onRender();
    markSelectedTray();
  });

  els.preview.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const p = canvasPoint(event);
    const panel = state.panels[state.selected];
    const img = state.photos[panel.photo] ? state.photos[panel.photo].img : null;
    if (!img || !img.naturalWidth) return;
    const geo = layoutGeometry(state.layout, els.preview.width, els.preview.height);
    const rel = geo.panels[state.selected];
    const rect = { x: rel.x * els.preview.width, y: rel.y * els.preview.height, w: rel.w * els.preview.width, h: rel.h * els.preview.height };
    const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * panel.zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    panel.px = dragging.px - ((p.x - dragging.startX) * els.preview.width) / dw;
    panel.py = dragging.py - ((p.y - dragging.startY) * els.preview.height) / dh;
    clampPanelPan(panel, img, rect);
    onRender();
  });

  els.preview.addEventListener('pointerup', () => { dragging = null; });
  els.preview.addEventListener('pointercancel', () => { dragging = null; });

  els.preview.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[state.selected];
    if (!panel) return;
    panel.zoom = Math.min(4, Math.max(1, panel.zoom * Math.exp(-event.deltaY * 0.0012)));
    const img = state.photos[panel.photo] ? state.photos[panel.photo].img : null;
    const geo = layoutGeometry(state.layout, els.preview.width, els.preview.height);
    const rel = geo.panels[state.selected];
    const rect = { x: rel.x * els.preview.width, y: rel.y * els.preview.height, w: rel.w * els.preview.width, h: rel.h * els.preview.height };
    clampPanelPan(panel, img, rect);
    onRender();
  }, { passive: false });

  // ---- zoom slider -------------------------------------------------
  els.zoomSlider.addEventListener('input', () => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    panel.zoom = Number(els.zoomSlider.value);
    onRender();
  });

  // ---- surprise shuffle --------------------------------------------
  const posterTitles = ['SUNSET HEIST', 'NEON NIGHTS', 'BAYFRONT RUN', 'PALM & CHROME', 'GOLDEN HOUR'];
  els.shuffleBtn.addEventListener('click', () => {
    state.layout = LAYOUT_ORDER[Math.floor(Math.random() * LAYOUT_ORDER.length)];
    state.grade = GRADE_ORDER[Math.floor(Math.random() * GRADE_ORDER.length)];
    rebuildPanelsForLayout(state);
    state.panels.forEach((panel, i) => {
      panel.photo = Math.floor(Math.random() * state.photos.length);
      const fresh = freshPlacement(i);
      panel.zoom = fresh.zoom;
      panel.px = fresh.px;
      panel.py = fresh.py;
    });
    state.title = posterTitles[Math.floor(Math.random() * posterTitles.length)];
    els.titleInput.value = state.title;
    syncPickerActive(els.layoutPicker, state.layout);
    syncPickerActive(els.gradePicker, state.grade);
    onRender();
    markSelectedTray();
  });

  function syncPickerActive(container, id) {
    Array.from(container.children).forEach((child) => {
      child.classList.toggle('active', child.dataset.id === id);
    });
  }

  // ---- export -------------------------------------------------------
  els.exportBtn.addEventListener('click', async () => {
    els.exportBtn.disabled = true;
    els.exportBtn.textContent = 'Exporting…';
    try {
      await exportCoverPNG(state, state.size);
      showToast(`Exported ${state.size} PNG — check your downloads.`);
    } catch (err) {
      showToast('Export failed — try again.');
    }
    els.exportBtn.disabled = false;
    els.exportBtn.textContent = 'Export PNG';
  });

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    setTimeout(() => els.toast.classList.remove('show'), 3200);
  }

  renderTray();
  markSelectedTray();
  return { renderTray, markSelectedTray };
}
