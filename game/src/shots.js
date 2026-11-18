import { STEP } from './config.js';

const chaseLanes = [
  [740, 496, Math.PI], [855, 496, Math.PI], [1285, 496, Math.PI],
  [1525, 496, Math.PI], [1715, 540, 0], [1600, 540, 0],
  [1385, 366, Math.PI / 2], [1346, 710, -Math.PI / 2],
  [979, 685, Math.PI / 2], [941, 340, -Math.PI / 2],
  [619, 540, 0], [1880, 496, Math.PI], [1400, 164, 0], [1140, 146, Math.PI],
];

function poseChase(s) {
  Object.assign(s, { mission: 1, objective: 1, wanted: 2 });
  const car = s.cars.find(({ type, traffic }) => type === 'sport' && !traffic);
  Object.assign(car, { x: 1180, y: 540, a: 0, player: true, speed: 320 });
  Object.assign(s.player, { x: car.x, y: car.y, angle: car.a, car, cash: 6850 });
  chaseLanes.forEach(([x, y, a], index) => Object.assign(s.cars[index], { x, y, a }));
  s.police = [
    { x: 1072, y: 540, a: 0, vehicle: true },
    { x: 953, y: 553, a: 0, vehicle: true },
  ];
}

export function stage(name, world) {
  const { s } = world;
  s.paused = false;
  s.screen = name === 'start' ? 'title' : 'play';

  switch (name) {
    case 'start':
      Object.assign(s.player, { x: 1940, y: 1490 });
      for (let tick = 0; tick < 90; tick++) world.update(STEP);
      break;
    case 'play':
      poseChase(s);
      break;
    case 'end':
      world.stageComplete();
      break;
  }

  return () => {};
}
