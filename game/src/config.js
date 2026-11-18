// City geometry, vehicle tuning and shared simulation helpers.
export const W = 2560,
  H = 1920,
  BEACH = 1740,
  ROAD = 112,
  STEP = 1 / 60;
export const X = [160, 555, 960, 1365, 1770, 2050],
  Y = [160, 520, 895, 1270, 1660];
export const districts = [
  'OLD TOWN',
  'DOWNTOWN',
  'MARINA',
  'SUBURBS',
  'PALM PARK',
  'INDUSTRIAL',
];
export const district = (x, y) =>
  y < 1050 ? (x < 750 ? 0 : x < 1750 ? 1 : 2) : x < 750 ? 3 : x < 1500 ? 4 : 5;
export const types = {
  sedan: { color: '#96dada', max: 305, turn: 2.8, len: 45 },
  taxi: { color: '#ffca58', max: 285, turn: 2.8, len: 46 },
  sport: { color: '#ff496e', max: 445, turn: 3.15, len: 45 },
  van: { color: '#b2a2e2', max: 250, turn: 2.1, len: 53 },
  pickup: { color: '#ef895b', max: 280, turn: 2.4, len: 51 },
  police: { color: '#accce8', max: 363, turn: 3, len: 48 },
};
export const point = (x, y) => ({ x, y });
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const nearest = (list, n) =>
  list.reduce((a, b) => (Math.abs(a - n) < Math.abs(b - n) ? a : b));
export const garage = point(1365, 895),
  station = point(960, 1270),
  contact = point(1280, 895);
export const light = (t, x, y, horizontal) =>
  ((Math.floor(t / 7) + X.indexOf(x) + Y.indexOf(y)) % 2 === 0) === horizontal;
export const money = (n) => '$' + Math.floor(n).toLocaleString('en-US');
