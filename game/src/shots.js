import { junction } from './city.js';
import { vehicle } from './world.js';

export function stage(name, world) {
  if (name === 'start') {
    world.mode = 'start';
    world.camera = { x: 2240, y: 598 };
    return;
  }

  world.index = name === 'play' ? 2 : 5;
  world.prepareMission();
  world.acquired = true;
  world.mode = 'play';
  world.time = 9.2;
  const point = junction(8, 5);
  const lead = vehicle(point.x + 35, point.y - 11, -0.12, '#f78758', { speed: 192 });
  world.cars = world.cars.filter(car => Math.hypot(car.x - point.x, car.y - point.y) > 105);
  world.cars.push(lead);
  world.player.car = lead;
  world.camera = { x: point.x + 95, y: point.y + 28 };
  world.cash = name === 'play' ? 640 : 3235;

  if (name === 'play') {
    world.heat = 3;
    world.player.health = 83;
    for (const [dx, dy, angle] of [[-31, 10, -0.18], [-88, -12, 0.05], [3, 77, -1.58]]) {
      world.cars.push(vehicle(point.x + dx, point.y + dy, angle, '#eeeadd', { police: true }));
    }
    world.effects.push({ kind: 'spark', x: point.x - 14, y: point.y + 2, ttl: 0.28 });
  } else {
    world.camera = { x: 2220, y: 1375 };
    world.end(true);
  }
}
