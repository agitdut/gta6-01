// Deterministic street blocks, public spaces and solid city footprints.
import { X, Y, W, H, BEACH, ROAD, point } from './config.js';

const colors = [
  ['#cf8265', '#db9a70', '#e3b88a'],
  ['#7397a4', '#859fa6', '#a7aaa0'],
  ['#dfaa77', '#82b4aa', '#e8c69b'],
  ['#cc977e', '#aba0ac', '#e3b08b'],
  [],
  ['#949b8c', '#a79a8e', '#b7a48f'],
];

export function makeCity(random) {
  const buildings = [], trees = [], parks = [], lamps = [], sidewalks = [];
  for (let row = 0; row < Y.length - 1; row++) {
    for (let column = 0; column < X.length - 1; column++) {
      const left = X[column] + ROAD / 2 + 23;
      const top = Y[row] + ROAD / 2 + 23;
      const width = X[column + 1] - left - ROAD / 2 - 23;
      const height = Y[row + 1] - top - ROAD / 2 - 23;
      const district = row < 2 ? column < 2 ? 0 : column < 4 ? 1 : 2 : column < 2 ? 3 : column === 2 ? 4 : 5;
      const block = { x: left, y: top, w: width, h: height, zone: district };
      parks.push(block);
      sidewalks.push({ x: left - 14, y: top - 14, w: width + 28, h: height + 28 });

      for (const lx of [left - 12, left + width + 12])
        for (const ly of [top - 12, top + height + 12]) lamps.push(point(lx, ly));

      if (district === 4) {
        for (let n = 0; n < 20; n++) trees.push({
          x: left + 12 + random() * (width - 24), y: top + 12 + random() * (height - 24),
          r: 13 + random() * 11, palm: false,
        });
        continue;
      }
      const columns = district === 5 ? 1 : 2;
      const rows = district === 3 ? 3 : 2;
      for (let cx = 0; cx < columns; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          const bw = width / columns - 32;
          const bh = height / rows - 32;
          buildings.push({
            x: left + (cx * width) / columns + 12 + random() * 7,
            y: top + (cy * height) / rows + 11 + random() * 7,
            w: bw, h: bh, high: district === 1 ? 28 + random() * 31 : 10 + random() * 13,
            zone: district, color: colors[district][Math.floor(random() * 3)],
            id: buildings.length,
          });
        }
      }
      for (let n = 0; n < 6; n++) trees.push({
        x: left + (n * width) / 5,
        y: n % 2 ? top : top + height,
        r: 10 + random() * 8,
        palm: district !== 3,
      });
    }
  }
  for (let y = 55; y < H; y += 56) trees.push({ x: 2131 + random() * 75, y: y + random() * 17, r: 13 + random() * 10, palm: true });
  return { buildings, trees, parks, lamps, sidewalks };
}

export function blocked(city, x, y, radius = 10) {
  if (x < radius || y < radius || x > W - radius || y > H - radius) return true;
  if (x + radius > 2310 && !(x < 2525 - radius && y > 753 + radius && y < 832 - radius)) return true;
  return city.buildings.some((building) =>
    x + radius > building.x && x - radius < building.x + building.w &&
    y + radius > building.y && y - radius < building.y + building.h,
  );
}

export function clearSight(city, from, to) {
  const span = Math.hypot(from.x - to.x, from.y - to.y);
  for (let step = 18; step < span; step += 18) {
    const x = from.x + ((to.x - from.x) * step) / span;
    const y = from.y + ((to.y - from.y) * step) / span;
    if (blocked(city, x, y, 2)) return false;
  }
  return true;
}

export function nearRoad(x, y) {
  return X.some((roadX) => Math.abs(x - roadX) < ROAD / 2) ||
    Y.some((roadY) => Math.abs(y - roadY) < ROAD / 2);
}
