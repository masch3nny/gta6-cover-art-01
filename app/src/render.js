// Canvas renderer for Sunset Cover Studio: turns the editor state into
// a finished poster cover on any 2D canvas context. Everything drawn
// here is original: gradients, vector sun and palm silhouettes, halftone
// dots and grain are all painted in code.
import { gradeById } from './grades.js';
import { layoutGeometry } from './panels.js';

// A small noise tile, made once, reused for the grain overlay.
let grainTile = null;
function makeGrainTile() {
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  return tile;
}

// Draw one photo inside a panel rect, cover-fit, with zoom and pan.
// px and py (0..1) pick which part of the photo sits at the panel centre.
// The pan is clamped so the photo always covers the whole panel.
export function drawPanelPhoto(ctx, img, rect, zoom, px, py, noir) {
  if (!img || !img.naturalWidth) return;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const minPx = (rect.w / 2) / dw;
  const maxPx = 1 - minPx;
  const minPy = (rect.h / 2) / dh;
  const maxPy = 1 - minPy;
  const cpx = Math.min(Math.max(px, minPx), Math.max(minPx, maxPx));
  const cpy = Math.min(Math.max(py, minPy), Math.max(minPy, maxPy));
  const dx = rect.x + rect.w / 2 - dw * cpx;
  const dy = rect.y + rect.h / 2 - dh * cpy;
  ctx.save();
  if (noir) ctx.filter = 'grayscale(1) contrast(1.18) brightness(1.04)';
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// Paint a grade's colour wash over a rect.
function paintGradeWash(ctx, grade, rect) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, grade.wash[0]);
  g.addColorStop(1, grade.wash[1]);
  ctx.save();
  ctx.globalCompositeOperation = grade.washMode;
  ctx.globalAlpha = grade.washAlpha;
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  if (grade.shadow > 0) {
    ctx.save();
    ctx.globalAlpha = grade.shadow;
    const shade = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = shade;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }
}

// A retro striped sun disc, drawn in code.
export function drawSunDisc(ctx, x, y, r, colour) {
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.6);
  glow.addColorStop(0, colour);
  glow.addColorStop(1, 'rgba(255,120,80,0)');
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  let gap = r * 0.12;
  for (let i = 0; i < 3; i++) {
    const sy = y + r * 0.15 + i * r * 0.3;
    ctx.fillRect(x - r, sy, r * 2, gap);
    gap *= 1.5;
  }
  ctx.restore();
}

// A small palm silhouette, drawn in code: curved trunk, six fronds.
export function drawPalmTree(ctx, x, y, s, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = colour;
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.quadraticCurveTo(-2, -60, 14, -105);
  ctx.quadraticCurveTo(20, -108, 18, -100);
  ctx.quadraticCurveTo(6, -55, 8, 0);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = (-160 + i * 52) * (Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(16, -104);
    ctx.quadraticCurveTo(16 + Math.cos(a) * 55, -104 + Math.sin(a) * 55 - 18, 16 + Math.cos(a) * 95, -104 + Math.sin(a) * 95 + 26);
    ctx.quadraticCurveTo(16 + Math.cos(a) * 55, -104 + Math.sin(a) * 55 + 6, 16, -104);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Halftone dots across a band, for the printed-poster feel.
function paintHalftone(ctx, x, y, w, h, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.globalAlpha = 0.16;
  const step = Math.max(9, w / 90);
  for (let row = 0; row * step < h; row++) {
    for (let col = 0; col * step < w; col++) {
      const r = step * 0.16 * (1 + (row % 3) * 0.25);
      ctx.beginPath();
      ctx.arc(x + col * step + step / 2, y + row * step + step / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Soft dark corners so the poster reads as one image.
function paintVignette(ctx, W, H) {
  ctx.save();
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Grain over the whole cover.
function paintGrain(ctx, W, H, alpha) {
  if (!grainTile) grainTile = makeGrainTile();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(grainTile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Fit a line of Anton text to a width, then draw it with a style.
// align is 'left' or 'center': the text starts at cx (left) or is
// centred on cx (center).
function drawFittedTitle(ctx, text, cx, cy, maxW, baseSize, style, grade, align) {
  let size = baseSize;
  ctx.textAlign = align === 'center' ? 'center' : 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  while (size > 18 && ctx.measureText(text).width > maxW) {
    size *= 0.94;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.02);
  if (style === 'outline') {
    ctx.lineWidth = size / 9;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(text, 0, 0);
    ctx.lineWidth = size / 22;
    ctx.strokeStyle = '#111111';
    ctx.strokeText(text, 0, 0);
  } else if (style === 'neon') {
    ctx.shadowColor = grade.wash[0];
    ctx.shadowBlur = size / 3;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 0, 0);
    ctx.shadowBlur = 0;
    ctx.lineWidth = size / 16;
    ctx.strokeStyle = grade.wash[0];
    ctx.strokeText(text, 0, 0);
  } else if (style === 'gradient') {
    const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, grade.sky.mid);
    g.addColorStop(1, grade.wash[0]);
    ctx.fillStyle = g;
    ctx.fillText(text, 0, 0);
    ctx.lineWidth = size / 14;
    ctx.strokeStyle = '#14060a';
    ctx.strokeText(text, 0, 0);
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size / 10;
    ctx.shadowOffsetY = size / 16;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = size / 12;
    ctx.strokeStyle = '#14060a';
    ctx.strokeText(text, 0, 0);
  }
  ctx.restore();
  return size;
}

// The caption block: title, subtitle, tagline.
function drawCaption(ctx, state, geo, W, H, grade) {
  const cap = geo.caption;
  const cx = cap.x * W + (cap.align === 'center' ? cap.w * W / 2 : 0);
  const titleY = cap.y * H;
  const maxW = cap.w * W;
  const titleSize = drawFittedTitle(ctx, state.title.toUpperCase(), cx, titleY, maxW, W * 0.11, state.lettering, grade, cap.align);
  ctx.save();
  ctx.textAlign = cap.align === 'center' ? 'center' : 'left';
  ctx.textBaseline = 'middle';
  const subSize = Math.max(13, W * 0.021);
  ctx.font = `${subSize}px Anton, 'Arial Narrow', sans-serif`;
  try { ctx.letterSpacing = `${Math.max(2, subSize * 0.22)}px`; } catch (e) { /* older canvas */ }
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = subSize / 3;
  ctx.shadowOffsetY = subSize / 8;
  ctx.fillText(state.subtitle.toUpperCase(), cap.align === 'center' ? cx : cap.x * W, titleY + titleSize * 0.72);
  ctx.restore();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tagSize = Math.max(11, W * 0.014);
  ctx.font = `${tagSize}px Anton, 'Arial Narrow', sans-serif`;
  try { ctx.letterSpacing = `${Math.max(2, tagSize * 0.3)}px`; } catch (e) { /* older canvas */ }
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(state.tagline.toUpperCase(), W / 2, H - tagSize * 1.8);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `${Math.max(9, W * 0.009)}px Anton, 'Arial Narrow', sans-serif`;
  ctx.fillText('MADE WITH SUNSET COVER STUDIO', W / 2, H - tagSize * 0.7);
  ctx.restore();
}

// Render the whole cover onto ctx at W by H pixels.
export function drawCover(ctx, state, W, H) {
  const grade = gradeById(state.grade);
  const geo = layoutGeometry(state.layout, W, H);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#14060a';
  ctx.fillRect(0, 0, W, H);
  const noir = state.grade === 'noir';
  geo.panels.forEach((rel, i) => {
    const rect = { x: rel.x * W, y: rel.y * H, w: rel.w * W, h: rel.h * H };
    const panel = state.panels[i] || { photo: 0, zoom: 1.15, px: 0.5, py: 0.42 };
    const img = state.photos[panel.photo] ? state.photos[panel.photo].img : null;
    ctx.save();
    ctx.beginPath();
    if (geo.slant && i === 0) {
      const s = geo.slant * W;
      ctx.moveTo(rect.x, rect.y);
      ctx.lineTo(rect.x + rect.w, rect.y);
      ctx.lineTo(rect.x + rect.w - s, rect.y + rect.h);
      ctx.lineTo(rect.x, rect.y + rect.h);
      ctx.closePath();
    } else if (geo.slant && i === 1) {
      const s = geo.slant * W;
      ctx.moveTo(rect.x + s, rect.y);
      ctx.lineTo(rect.x + rect.w, rect.y);
      ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
      ctx.lineTo(rect.x, rect.y + rect.h);
      ctx.closePath();
    } else {
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.clip();
    if (img) drawPanelPhoto(ctx, img, rect, panel.zoom, panel.px, panel.py, noir);
    else {
      const sky = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      sky.addColorStop(0, grade.sky.top);
      sky.addColorStop(0.55, grade.sky.mid);
      sky.addColorStop(1, grade.sky.bottom);
      ctx.fillStyle = sky;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    paintGradeWash(ctx, grade, rect);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, W * 0.002);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  });
  // Decorative sun and palm, painted over the panels.
  const sun = geo.sun;
  drawSunDisc(ctx, sun.x * W, sun.y * H, sun.r * Math.min(W, H), grade.sun);
  if (state.layout === 'hero') {
    drawPalmTree(ctx, W * 0.05, H * 0.98, Math.min(W, H) / 900, '#12040a');
  }
  paintHalftone(ctx, 0, H * 0.62, W, H * 0.38, '#ffffff');
  paintVignette(ctx, W, H);
  paintGrain(ctx, W, H, grade.grain);
  drawCaption(ctx, state, geo, W, H, grade);
}
