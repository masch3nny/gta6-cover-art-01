// PNG export for Sunset Cover Studio: renders the cover at full post
// size on an offscreen canvas and downloads it as a PNG file.
import { drawCover } from './render.js';

// The three common post sizes the app offers.
export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide · 1920 × 1080' },
};

export const SIZE_ORDER = ['1920x1080', '1080x1350', '1080x1080'];

// Render the cover at a size id and return a PNG blob.
export function renderCoverBlob(state, sizeId) {
  const size = SIZES[sizeId] || SIZES['1920x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, state, size.w, size.h);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

// Render at a size id and trigger a browser download of the PNG.
export async function exportCoverPNG(state, sizeId) {
  const blob = await renderCoverBlob(state, sizeId);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sunset-cover-${sizeId}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}

// Render at a size id and return the PNG as a data URL (used by the
// screenshot scenes to show an exported cover without a download).
export async function renderCoverDataURL(state, sizeId) {
  const size = SIZES[sizeId] || SIZES['1920x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, state, size.w, size.h);
  return canvas.toDataURL('image/png');
}
