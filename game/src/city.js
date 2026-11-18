import { X, Y, W, H, ROAD, point } from './config.js';

const setback = ROAD / 2 + 23;
const palettes = [
  ['#cf8265', '#db9a70', '#e3b88a'],
  ['#7397a4', '#859fa6', '#a7aaa0'],
  ['#dfaa77', '#82b4aa', '#e8c69b'],
  ['#cc977e', '#aba0ac', '#e3b08b'],
  [],
  ['#949b8c', '#a79a8e', '#b7a48f'],
];

function zoning(row, col) {
  if (row < 2) return col < 2 ? 0 : col < 4 ? 1 : 2;
  return col < 2 ? 3 : col === 2 ? 4 : 5;
}

function populateBlock(city, block, random) {
  const { x, y, w, h, zone } = block;
  if (zone === 4) {
    for (let i = 0; i < 20; i++) {
      city.trees.push({
        x: x + 12 + random() * (w - 24),
        y: y + 12 + random() * (h - 24),
        r: 13 + random() * 11,
        palm: false,
      });
    }
    return;
  }

  const columns = zone === 5 ? 1 : 2;
  const rows = zone === 3 ? 3 : 2;
  const lotWidth = w / columns;
  const lotHeight = h / rows;
  for (let lot = 0; lot < columns * rows; lot++) {
    city.buildings.push({
      x: x + Math.floor(lot / rows) * lotWidth + 12 + random() * 7,
      y: y + lot % rows * lotHeight + 11 + random() * 7,
      w: lotWidth - 32,
      h: lotHeight - 32,
      high: zone === 1 ? 28 + random() * 31 : 10 + random() * 13,
      zone,
      color: palettes[zone][Math.floor(random() * 3)],
      id: city.buildings.length,
    });
  }
  for (let i = 0; i < 6; i++) {
    city.trees.push({ x: x + i * w / 5, y: i % 2 ? y : y + h, r: 10 + random() * 8, palm: zone !== 3 });
  }
}

export function makeCity(random) {
  const city = { buildings: [], trees: [], parks: [], lamps: [], sidewalks: [] };
  for (let row = 0; row + 1 < Y.length; row++) {
    for (let col = 0; col + 1 < X.length; col++) {
      const x = X[col] + setback;
      const y = Y[row] + setback;
      const w = X[col + 1] - x - setback;
      const h = Y[row + 1] - y - setback;
      const block = { x, y, w, h, zone: zoning(row, col) };
      city.parks.push(block);
      city.sidewalks.push({ x: x - 14, y: y - 14, w: w + 28, h: h + 28 });
      for (const edgeX of [x - 12, x + w + 12]) {
        city.lamps.push(point(edgeX, y - 12), point(edgeX, y + h + 12));
      }
      populateBlock(city, block, random);
    }
  }

  for (let y = 55; y < H; y += 56) {
    city.trees.push({ x: 2131 + random() * 75, y: y + random() * 17, r: 13 + random() * 10, palm: true });
  }
  return city;
}

export function blocked(city, x, y, radius = 10) {
  const left = x - radius, right = x + radius;
  const top = y - radius, bottom = y + radius;
  if (left < 0 || top < 0 || right > W || bottom > H) return true;
  const onPier = right < 2525 && top > 753 && bottom < 832;
  if (right > 2310 && !onPier) return true;
  return city.buildings.some((b) => right > b.x && left < b.x + b.w && bottom > b.y && top < b.y + b.h);
}

export function clearSight(city, from, to) {
  // Skip both endpoints. Police may spawn on the map edge, and visibility
  // depends on obstacles between the pursuer and the player.
  const dx = to.x - from.x, dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= 18) return true;
  const ux = dx / length, uy = dy / length;
  for (let walked = 18; walked < length; walked += 18) {
    if (blocked(city, from.x + ux * walked, from.y + uy * walked, 2)) return false;
  }
  return true;
}

export function nearRoad(x, y) {
  return X.some((center) => Math.abs(center - x) < ROAD / 2) ||
    Y.some((center) => Math.abs(center - y) < ROAD / 2);
}
