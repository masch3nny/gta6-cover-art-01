// Colour grades for Sunset Cover Studio: each grade is a set of
// canvas overlays applied on top of a panel's photo. Nothing here
// copies any game's look: these are plain gradient and tint recipes.
export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    blurb: 'Warm orange-to-pink dusk',
    wash: ['#ff9a3d', '#ff3d7e'],
    washAlpha: 0.22,
    washMode: 'overlay',
    sky: { top: '#ffb347', mid: '#ff6b6b', bottom: '#c94b7c' },
    sun: '#ffd76a',
    shadow: 0.12,
    grain: 0.05,
  },
  neon: {
    name: 'Neon Night',
    blurb: 'Magenta and cyan after dark',
    wash: ['#ff2fb3', '#00e5ff'],
    washAlpha: 0.28,
    washMode: 'overlay',
    sky: { top: '#2b1055', mid: '#7597de', bottom: '#ff2fb3' },
    sun: '#ff5df2',
    shadow: 0.22,
    grain: 0.06,
  },
  dusk: {
    name: 'Palm Dusk',
    blurb: 'Purple and gold evening',
    wash: ['#7b5cff', '#ffb347'],
    washAlpha: 0.24,
    washMode: 'overlay',
    sky: { top: '#3b2d6b', mid: '#a06cd5', bottom: '#ffb347' },
    sun: '#ffcf5c',
    shadow: 0.18,
    grain: 0.05,
  },
  noir: {
    name: 'Noir',
    blurb: 'High-contrast black and white',
    wash: ['#ffffff', '#000000'],
    washAlpha: 0.0,
    washMode: 'overlay',
    sky: { top: '#e8e8e8', mid: '#9a9a9a', bottom: '#222222' },
    sun: '#f5f5f5',
    shadow: 0.3,
    grain: 0.08,
  },
};

// The order grades appear in the editor's picker.
export const GRADE_ORDER = ['sunset', 'neon', 'dusk', 'noir'];

// Look up a grade by id, falling back to the sunset grade.
export function gradeById(id) {
  return GRADES[id] || GRADES.sunset;
}
