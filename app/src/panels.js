// Panel layout templates for Sunset Cover Studio. Every layout is a
// function of the cover's width and height that returns panel rects in
// relative coordinates (0..1), plus where the caption band sits. The
// gutter between panels is part of the poster look.
const GUTTER = 0.012;

function rect(x, y, w, h) {
  return { x, y, w, h };
}

// Big hero panel on the left, two stacked panels on the right.
function heroLayout(W, H) {
  const g = GUTTER;
  const heroW = 0.62;
  return {
    panels: [
      rect(0, 0, heroW - g / 2, 1),
      rect(heroW + g / 2, 0, 1 - heroW - g / 2, 0.5 - g / 2),
      rect(heroW + g / 2, 0.5 + g / 2, 1 - heroW - g / 2, 0.5 - g / 2),
    ],
    caption: { x: 0.03, y: 0.66, w: 0.56, align: 'left' },
    sun: { x: 0.86, y: 0.24, r: 0.085 },
  };
}

// Four equal panels in a two-by-two grid.
function gridLayout(W, H) {
  const g = GUTTER;
  return {
    panels: [
      rect(0, 0, 0.5 - g / 2, 0.5 - g / 2),
      rect(0.5 + g / 2, 0, 0.5 - g / 2, 0.5 - g / 2),
      rect(0, 0.5 + g / 2, 0.5 - g / 2, 0.5 - g / 2),
      rect(0.5 + g / 2, 0.5 + g / 2, 0.5 - g / 2, 0.5 - g / 2),
    ],
    caption: { x: 0.03, y: 0.47, w: 0.94, align: 'center' },
    sun: { x: 0.92, y: 0.08, r: 0.06 },
  };
}

// Three tall vertical strips.
function stripsLayout(W, H) {
  const g = GUTTER;
  const third = 1 / 3;
  return {
    panels: [
      rect(0, 0, third - g / 2, 1),
      rect(third + g / 2, 0, third - g, 1),
      rect(2 * third + g / 2, 0, third - g / 2, 1),
    ],
    caption: { x: 0.03, y: 0.72, w: 0.94, align: 'center' },
    sun: { x: 0.08, y: 0.08, r: 0.06 },
  };
}

// Two panels split by a slanted divider, top-left and bottom-right.
function duoLayout(W, H) {
  return {
    panels: [
      rect(0, 0, 1, 0.62),
      rect(0, 0.62, 1, 0.38),
    ],
    slant: 0.14,
    caption: { x: 0.03, y: 0.6, w: 0.94, align: 'center' },
    sun: { x: 0.82, y: 0.18, r: 0.08 },
  };
}

export const LAYOUTS = {
  hero: { name: 'Hero + Two', blurb: 'One big moment, two side shots', panels: 3, build: heroLayout },
  grid: { name: 'Four Panel', blurb: 'A classic 2 by 2 poster grid', panels: 4, build: gridLayout },
  strips: { name: 'Three Strips', blurb: 'Tall vertical panels', panels: 3, build: stripsLayout },
  duo: { name: 'Slant Split', blurb: 'Two panels, one slanted cut', panels: 2, build: duoLayout },
};

// The order layouts appear in the editor's picker.
export const LAYOUT_ORDER = ['hero', 'grid', 'strips', 'duo'];

// Build the geometry for a layout id at a given cover size.
export function layoutGeometry(id, W, H) {
  const layout = LAYOUTS[id] || LAYOUTS.hero;
  return layout.build(W, H);
}

// How many panels a layout has.
export function layoutPanelCount(id) {
  return (LAYOUTS[id] || LAYOUTS.hero).panels;
}
