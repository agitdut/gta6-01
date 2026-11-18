// X lists north–south street centers, and Y lists east–west street centers.
// Distances and speeds use world units. STEP is the reference frame duration.
export const W = 2560;
export const H = 1920;
export const BEACH = 1740;
export const ROAD = 112;
export const STEP = 1 / 60;

export const X = [160, 555, 960, 1365, 1770, 2050];
export const Y = [160, 520, 895, 1270, 1660];
export const districts = ['OLD TOWN', 'DOWNTOWN', 'MARINA', 'SUBURBS', 'PALM PARK', 'INDUSTRIAL'];

export function district(x, y) {
  if (y < 1050) return x < 750 ? 0 : x < 1750 ? 1 : 2;
  return x < 750 ? 3 : x < 1500 ? 4 : 5;
}

const vehicle = (color, max, turn, len) => ({ color, max, turn, len });
export const types = {
  sedan: vehicle('#96dada', 305, 2.8, 45),
  taxi: vehicle('#ffca58', 285, 2.8, 46),
  sport: vehicle('#ff496e', 445, 3.15, 45),
  van: vehicle('#b2a2e2', 250, 2.1, 53),
  pickup: vehicle('#ef895b', 280, 2.4, 51),
  police: vehicle('#accce8', 363, 3, 48),
};

export const point = (x, y) => ({ x, y });
export const garage = point(1365, 895);
export const station = point(960, 1270);
export const contact = point(1280, 895);

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const distance = (from, to) => Math.hypot(to.x - from.x, to.y - from.y);
export const angle = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);
export const wrapAngle = (radians) => Math.atan2(Math.sin(radians), Math.cos(radians));
export const nearest = (values, target) => values.reduce((best, candidate) =>
  Math.abs(best - target) < Math.abs(candidate - target) ? best : candidate,
);

export function light(time, x, y, horizontal) {
  const phase = Math.floor(time / 7) + X.indexOf(x) + Y.indexOf(y);
  return (phase % 2 === 0) === horizontal;
}

const dollars = new Intl.NumberFormat('en-US');
export const money = (amount) => '$' + dollars.format(Math.floor(amount));
