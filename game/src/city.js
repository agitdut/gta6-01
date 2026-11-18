import { BLOCK, ROAD, COLS, ROWS, DISTRICTS } from './config.js';
import { between, clamp, pick, random } from './random.js';

export const junction = (col, row) => ({ x: col * BLOCK + ROAD / 2, y: row * BLOCK + ROAD / 2 });
const roofs = ['#d89575', '#e8b887', '#eacbb0', '#81a6a0', '#b89a8f'];
const signs = ['SOLANO CO-OP', 'CAFÉ LIMA', 'MARIGOLD HOTEL', 'MARA REPAIRS', 'HARBOR RADIO', 'CITRUS EXPRESS'];

export function buildCity(seed) {
  const next = random(seed ^ 0x8683e1);
  const lots = [];
  const packages = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * BLOCK + ROAD;
      const y = row * BLOCK + ROAD;
      const span = BLOCK - ROAD;
      const waterfront = col >= 8;
      const park = (col + 2 * row) % 7 === 0;
      const lot = { x, y, span, col, row, waterfront, park, buildings: [], palms: [], furniture: [] };
      const planterPositions = [[12, 14], [span - 14, 18], [13, span - 16], [span - 16, span - 18]];
      for (const [dx, dy] of planterPositions) {
        lot.palms.push({ x: x + dx, y: y + dy, spin: between(next, 0, 6.28), size: between(next, 9, 15) });
      }
      if (!park) {
        const split = Math.floor(between(next, 74, 100));
        const pieces = [[25, 26, split - 28, 92], [split + 8, 24, span - split - 30, 96], [26, 132, span - 52, 22]];
        for (const [dx, dy, w, h] of pieces) {
          lot.buildings.push({
            x: x + dx, y: y + dy, w, h,
            roof: pick(next, roofs),
            height: between(next, 10, waterfront ? 22 : 36),
            sign: pick(next, signs),
            striped: next() < 0.3,
          });
        }
      } else {
        for (let i = 0; i < 4; i++) {
          lot.furniture.push({ x: x + 33 + i * 34, y: y + 49 + (i % 2) * 67 });
        }
      }
      if ((col * 3 + 11 * row) % 8 === 0 && packages.length < 10) {
        packages.push({ id: packages.length, x: x + 35, y: y + 123 });
      }
      lots.push(lot);
    }
  }
  return lotsWithQueries(lots, packages);
}

function lotsWithQueries(lots, packages) {
  return {
    lots, packages,
    district(x, y) {
      return DISTRICTS[y < 4 * BLOCK ? 0 : 1][clamp(Math.floor(x / (3.6 * BLOCK)), 0, 2)];
    },
    blocks(x, y, radius) {
      const row = Math.floor(y / BLOCK);
      const col = Math.floor(x / BLOCK);
      for (let r = Math.max(0, row - 1); r <= Math.min(ROWS - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(COLS - 1, col + 1); c++) {
          for (const b of lots[r * COLS + c].buildings) {
            const dx = x - clamp(x, b.x, b.x + b.w);
            const dy = y - clamp(y, b.y, b.y + b.h);
            if (dx * dx + dy * dy < radius * radius) return true;
          }
        }
      }
      return false;
    },
  };
}

export function streetPoint(next, sidewalk = false) {
  const horizontal = next() < 0.5;
  const direction = next() < 0.5 ? -1 : 1;
  const index = Math.floor(next() * (horizontal ? ROWS + 1 : COLS + 1));
  const across = index * BLOCK + ROAD / 2 + direction * (sidewalk ? 39 : 12);
  const along = between(next, ROAD / 2, (horizontal ? COLS : ROWS) * BLOCK + ROAD / 2);
  return horizontal
    ? { x: along, y: across, angle: direction > 0 ? Math.PI : 0, horizontal }
    : { x: across, y: along, angle: direction > 0 ? Math.PI / 2 : -Math.PI / 2, horizontal };
}
