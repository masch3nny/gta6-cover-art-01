// Deterministic screenshot scenes for Sunset Cover Studio. The shots
// in shots.json drive the app with query params, so every screenshot is
// a real render of the app's own code: ?shot=cover shows an exported
// cover full-bleed, ?shot=editor shows the editor with a photo loaded.
// Supported params: photo (a sample file name without extension),
// caption (the title), layout, grade, size, subtitle.
import { renderCoverDataURL } from './export.js';

// Read the scene params from the page URL.
export function readSceneParams() {
  const q = new URLSearchParams(window.location.search);
  return {
    shot: q.get('shot') || '',
    photo: q.get('photo') || '',
    caption: q.get('caption') || '',
    subtitle: q.get('subtitle') || '',
    layout: q.get('layout') || '',
    grade: q.get('grade') || '',
    size: q.get('size') || '',
  };
}

// Apply scene params to the editor state before the first render.
export function applySceneToState(params, state, sampleNames) {
  if (params.caption) state.title = params.caption;
  if (params.subtitle) state.subtitle = params.subtitle;
  if (params.layout) state.layout = params.layout;
  if (params.grade) state.grade = params.grade;
  if (params.size) state.size = params.size;
  if (params.photo) {
    const idx = state.photos.findIndex((p) => p.name === params.photo);
    if (idx >= 0) {
      state.panels.forEach((panel, i) => {
        panel.photo = (idx + i) % state.photos.length;
      });
    }
  }
  return state;
}

// Show an exported cover full-bleed in the page body (the ?shot=cover
// scene): the app's own render of the cover, at the export size, fitted
// to the viewport. Returns after the image is in the DOM.
export async function showExportedCover(state, sizeId) {
  const dataUrl = await renderCoverDataURL(state, sizeId);
  document.body.classList.add('shot-cover');
  const holder = document.getElementById('shot-holder');
  holder.innerHTML = '';
  const img = document.createElement('img');
  img.id = 'shot-cover-img';
  img.src = dataUrl;
  img.alt = 'Exported cover';
  holder.appendChild(img);
  await new Promise((resolve) => {
    if (img.complete) resolve();
    else img.onload = resolve;
  });
  document.title = 'Sunset Cover Studio — exported cover';
}
