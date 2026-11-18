// Deterministic screenshot staging using the live city, simulation, and renderer.
export function stage(name, world) {
  const state = world.s;
  state.screen = name === 'start' ? 'title' : 'play';
  state.paused = false;

  if (name === 'start') {
    state.player.x = 1940;
    state.player.y = 1490;
    const idle = { down: () => false, mouse: null };
    for (let i = 0; i < 90; i++) world.update(1 / 60, idle);
  }
  if (name === 'play') stageChase(state);
  if (name === 'end') world.stageComplete();
  return () => {};
}

function stageChase(state) {
  state.mission = 1;
  state.objective = 1;
  state.wanted = 2;

  const sportsCar = state.cars.find(
    (car) => car.type === 'sport' && !car.traffic,
  );
  Object.assign(sportsCar, { x: 1180, y: 540, a: 0, player: true, speed: 320 });
  Object.assign(state.player, {
    x: sportsCar.x,
    y: sportsCar.y,
    angle: sportsCar.a,
    car: sportsCar,
    cash: 6850,
  });

  const traffic = [
    [740, 496, Math.PI],
    [855, 496, Math.PI],
    [1285, 496, Math.PI],
    [1525, 496, Math.PI],
    [1715, 540, 0],
    [1600, 540, 0],
    [1385, 366, Math.PI / 2],
    [1346, 710, -Math.PI / 2],
    [979, 685, Math.PI / 2],
    [941, 340, -Math.PI / 2],
    [619, 540, 0],
    [1880, 496, Math.PI],
    [1400, 164, 0],
    [1140, 146, Math.PI],
  ];
  for (let i = 0; i < traffic.length; i++) {
    const [x, y, a] = traffic[i];
    Object.assign(state.cars[i], { x, y, a });
  }

  state.police.push(
    { x: 1072, y: 540, vehicle: true },
    { x: 953, y: 553, vehicle: true },
  );
}
