// Seeded lots, sidewalks and accessible waterfront. The renderer uses the same collision footprints.
import { X, Y, W, H, BEACH, ROAD, point } from './config.js';
export function makeCity(random) {
  const buildings = [],
    trees = [],
    parks = [],
    lamps = [];
  const palettes = [
    ['#d99471', '#c77867', '#e8bb91'],
    ['#82a8b3', '#99b4bb', '#bba8bd'],
    ['#e3ad80', '#8dc0b4', '#e7c4a1'],
    ['#d6a189', '#aaa7c5', '#e9b893'],
    [],
    ['#a0a99b', '#a49ea3', '#bf9a81'],
  ];
  for (let i = 0; i < X.length - 1; i++)
    for (let j = 0; j < Y.length - 1; j++) {
      const x = X[i] + ROAD / 2 + 23,
        y = Y[j] + ROAD / 2 + 23;
      const w = X[i + 1] - x - ROAD / 2 - 23,
        h = Y[j + 1] - y - ROAD / 2 - 23;
      const zone =
        j < 2 ? (i < 2 ? 0 : i < 4 ? 1 : 2) : i < 2 ? 3 : i === 2 ? 4 : 5;
      parks.push({ x, y, w, h, zone });
      for (const lx of [x - 12, x + w + 12])
        for (const ly of [y - 12, y + h + 12]) lamps.push(point(lx, ly));
      if (zone === 4) {
        for (let k = 0; k < 20; k++)
          trees.push({
            x: x + 12 + random() * (w - 24),
            y: y + 12 + random() * (h - 24),
            r: 13 + random() * 11,
            palm: false,
          });
        continue;
      }
      const cols = zone === 5 ? 1 : 2,
        rows = zone === 3 ? 3 : 2;
      for (let a = 0; a < cols; a++)
        for (let b = 0; b < rows; b++) {
          const bx = x + (a * w) / cols + 12 + random() * 7,
            by = y + (b * h) / rows + 11 + random() * 7;
          buildings.push({
            x: bx,
            y: by,
            w: w / cols - 32,
            h: h / rows - 32,
            high: zone === 1 ? 28 + random() * 31 : 10 + random() * 13,
            zone,
            color: palettes[zone][Math.floor(random() * 3)],
            id: buildings.length,
          });
        }
      for (let k = 0; k < 6; k++)
        trees.push({
          x: x + (k * w) / 5,
          y: k % 2 ? y : y + h,
          r: 10 + random() * 8,
          palm: zone !== 3,
        });
    }
  for (let y = 55; y < H; y += 56)
    trees.push({
      x: 2131 + random() * 75,
      y: y + random() * 17,
      r: 13 + random() * 10,
      palm: true,
    });
  return { buildings, trees, parks, lamps };
}
export function blocked(city, x, y, r = 10) {
  if (x < r || y < r || x > W - r || y > H - r) return true;
  if (x + r > 2310 && !(x < 2525 - r && y > 753 + r && y < 832 - r))
    return true;
  return city.buildings.some(
    (b) => x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h,
  );
}
export function clearSight(city, a, b) {
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  for (let t = 18; t < d; t += 18)
    if (
      blocked(city, a.x + ((b.x - a.x) * t) / d, a.y + ((b.y - a.y) * t) / d, 2)
    )
      return false;
  return true;
}
export function nearRoad(x, y) {
  return (
    X.some((n) => Math.abs(x - n) < ROAD / 2) ||
    Y.some((n) => Math.abs(y - n) < ROAD / 2)
  );
}
