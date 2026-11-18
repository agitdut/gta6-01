export const BLOCK = 240;
export const ROAD = 68;
export const COLS = 10;
export const ROWS = 8;
export const WIDTH = COLS * BLOCK + ROAD;
export const HEIGHT = ROWS * BLOCK + ROAD;
export const DISTRICTS = [
  ['SUNWARD HEIGHTS', 'CITRUS MARKET', 'SALTWIND PIER'],
  ['MARIGOLD ROW', 'GLASS QUARTER', 'BLUE LANTERN'],
];
export const PAINT = ['#e7714c', '#eec16b', '#69b1b2', '#e5e2cf', '#38445a', '#9f6585'];
export const STORY = [
  { title: 'First Wheels', call: 'Dante hired you for one delivery. The ignition key is already in the coupe.', kind: 'marked', car: [3, 3], stop: [4, 3], reward: 220 },
  { title: 'The Package', call: 'A dock clerk left the harbor ledger at Citrus Market. Bring it to Mara.', kind: 'parcel', pickup: [4, 2], stop: [6, 3], reward: 420 },
  { title: 'Getaway Driver', call: 'Mara found a name in the ledger. Meet her at the pier and lose the harbor patrol.', kind: 'chase', pickup: [8, 3], stop: [7, 5], reward: 650 },
  { title: 'Taxi Trouble', call: 'The witness needs an ordinary ride across town. A yellow cab is waiting.', kind: 'marked', car: [6, 5], stop: [4, 6], reward: 500 },
  { title: 'Rooftop Deal', call: 'Pick up the duplicate ledger at the Glass Quarter roof stair. The buyer is near the market.', kind: 'parcel', pickup: [5, 5], stop: [3, 3], reward: 800 },
  { title: 'The Big Score', call: 'The buyer sold you out. Take the evidence to the Blue Lantern freight gate.', kind: 'chase', pickup: [5, 3], stop: [9, 6], reward: 1500 },
];
export const FARE = { title: 'Meter Running', call: 'Pick up a cab and take the next fare to the market.', kind: 'marked', car: [5, 5], stop: [4, 3], reward: 150 };
