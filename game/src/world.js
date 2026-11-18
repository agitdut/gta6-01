import { W, H, X, Y, ROAD, types, clamp, distance, angle, wrapAngle, garage, station, contact, point } from './config.js';
import { makeCity, blocked, clearSight } from './city.js';

const downtown = point(960, 520);
const marina = point(1770, 520);
const rooftop = point(555, 895);
const stashA = point(1770, 1270);
const stashB = point(555, 520);
const fares = [point(2050, 1270), point(960, 895), point(555, 1270)];
export const missions = [
  ['FIRST WHEELS', 'Dante', 'Steal a car and deliver it to the garage', garage, 500],
  ['THE PACKAGE', 'Dante', 'Pick up the package downtown, deliver it to the marina', downtown, marina, 900],
  ['GETAWAY DRIVER', 'Dante', 'Lose the 2-star wanted level', garage, 1200],
  ['TAXI TROUBLE', 'Dante', 'Drive a taxi and pick up 3 fares around the city', fares[0], 1500],
  ['ROOFTOP DEAL', 'Dante', 'Fight through 3 thugs, grab the briefcase, escape to your car', rooftop, 2200],
  ['THE BIG SCORE', 'Dante', 'Grab cash from 2 spots, then escape a 3-star chase', stashA, 4000],
];

const TAU = 2 * Math.PI;
const idle = { down: () => false };
const nearby = (from, to, range) => distance(from, to) < range;
const closest = (axis, value) => axis.reduce((best, road) => Math.abs(road - value) < Math.abs(best - value) ? road : best);
const nextFare = (s) => fares[s.sideFare % fares.length];

function advance(entity, heading, length) {
  entity.x += Math.cos(heading) * length;
  entity.y += Math.sin(heading) * length;
}

function newCar(x, y, a, type, traffic = false) {
  return { x, y, a, type, hp: 100, traffic, stolen: false, speed: 0, player: false, driver: traffic };
}

function newPickup(x, y, type, value = 1) {
  return { x, y, type, value, active: true };
}

function populate(s, city, random) {
  const kinds = ['sedan', 'taxi', 'sport', 'van', 'pickup'];
  const pick = (options) => options[Math.floor(random() * options.length)];
  const integer = (low, high) => Math.floor(low + random() * (high - low + 1));

  for (let i = 0; i < 22; i++) {
    const northSouth = random() < 0.5;
    const lane = pick(northSouth ? X : Y);
    const x = northSouth ? lane + (random() - 0.5) * 48 : random() * W;
    const y = northSouth ? random() * H : lane + (random() - 0.5) * 48;
    const forward = random() < 0.5;
    const heading = northSouth ? (forward ? Math.PI / 2 : -Math.PI / 2) : (forward ? 0 : Math.PI);
    s.cars.push(newCar(x, y, heading, i === 1 ? 'taxi' : pick(kinds), i < 14));
  }
  s.cars.push(newCar(contact.x - 55, contact.y + 12, 0, 'sport'));
  s.cars.push(newCar(garage.x + 58, garage.y + 12, Math.PI, 'taxi'));

  for (let i = 0; i < 27; i++) {
    s.peds.push({
      x: 180 + random() * 1950, y: 100 + random() * 1750,
      r: 8, a: random() * TAU, panic: 0, health: 40,
      cash: random() < 0.25 ? integer(15, 60) : 0,
    });
  }
  for (let i = 0; i < 10; i++) {
    let x, y;
    for (let attempt = 0; attempt < 50; attempt++) {
      x = 190 + random() * 2050;
      y = 120 + random() * 1750;
      if (!blocked(city, x, y, 14)) break;
    }
    if (i < 5) s.pickups.push(newPickup(x, y, 'cash', integer(80, 220)));
    else s.pickups.push(newPickup(x, y, i < 8 ? 'package' : 'health'));
  }
  s.pickups.push(newPickup(contact.x + 15, contact.y - 45, 'ammo', 12));
}

export function createWorld(random) {
  const city = makeCity(random);
  const player = { ...contact, r: 15, health: 100, armour: 35, cash: 1200, angle: 0, car: null, ammo: 18 };
  const s = {
    player, cars: [], peds: [], thugs: [], police: [], bullets: [], pickups: [], particles: [], texts: [],
    wanted: 0, mission: 0, objective: 0, sideFare: 0, missionTime: 0, crimeTimer: 0,
    arrest: 0, clock: 15 * 3600, screen: 'title', complete: false, paused: false,
    damage: 0, packages: 0, muted: false, best: 0, shake: 0, heistCase: false,
  };
  const lastAction = { enter: false, fire: false, melee: false };
  populate(s, city, random);

  function addText(message, x, y, color = '#ffe28a') {
    s.texts.push({ t: message, x, y, c: color, life: 2 });
  }

  function tell(message, color) {
    addText(message, player.x, player.y, color);
  }

  function sparks(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const heading = random() * TAU;
      const speed = 25 + random() * 190;
      s.particles.push({ x, y, vx: Math.cos(heading) * speed, vy: Math.sin(heading) * speed, life: 0.25 + random() * 0.5, color });
    }
  }

  function scatter(x, y, range) {
    const danger = point(x, y);
    for (const ped of s.peds) {
      if (!nearby(ped, danger, range)) continue;
      ped.panic = 6;
      ped.a = angle(danger, ped);
    }
  }

  function crime(stars) {
    s.wanted = clamp(s.wanted + stars, 0, 5);
    s.crimeTimer = 20;
    scatter(player.x, player.y, 270);
  }

  function enterExit() {
    const occupied = player.car;
    if (occupied) {
      for (const [dx, dy] of [[34, 34], [-34, 34], [34, -34], [-34, -34]]) {
        const x = occupied.x + dx, y = occupied.y + dy;
        if (blocked(city, x, y, player.r)) continue;
        Object.assign(player, { x, y, car: null });
        occupied.player = false;
        return;
      }
      if (blocked(city, occupied.x, occupied.y, player.r)) return;
      Object.assign(player, { x: occupied.x, y: occupied.y, car: null });
      occupied.player = false;
      return;
    }

    const car = s.cars.find((candidate) => candidate.hp > 0 && nearby(candidate, player, 46));
    if (!car) return;
    player.car = car;
    Object.assign(car, { player: true, stolen: true, driver: false });
    const witnessed = car.traffic || s.peds.some((ped) => nearby(ped, player, 100)) ||
      s.police.some((cop) => nearby(cop, player, 200));
    if (witnessed) crime(1);
    tell('CAR STOLEN', '#ff7272');
    for (const ped of s.peds) if (nearby(ped, player, 150)) ped.panic = 7;
  }

  function fire() {
    if (player.car || player.ammo <= 0) return;
    const { x, y, angle: heading } = player;
    const dx = Math.cos(heading), dy = Math.sin(heading);
    player.ammo--;
    s.bullets.push({ x, y, vx: dx * 800, vy: dy * 800, life: 0.75 });
    sparks(x + dx * 17, y + dy * 17, '#ffd378', 3);
    crime(1);
  }

  function hurtThug(thug, damage, melee = false) {
    thug.health -= damage;
    if (melee) sparks(thug.x, thug.y, '#d87864', 6);
    if (thug.health > 0) return;
    thug.alive = false;
    if (melee) addText('THUG DOWN', thug.x, thug.y);
    if (s.mission === 4) s.objective++;
  }

  function punch() {
    if (player.car) return;
    const target = s.thugs.find((thug) => thug.alive && nearby(thug, player, 45) &&
      Math.abs(wrapAngle(angle(player, thug) - player.angle)) < 1.35);
    if (target) hurtThug(target, 42, true);
  }

  function collect() {
    const item = s.pickups.find((pickup) => pickup.active && nearby(pickup, player, 32));
    if (!item) return;
    item.active = false;
    switch (item.type) {
      case 'cash':
        player.cash += item.value;
        s.best = Math.max(s.best, player.cash);
        tell('+$' + item.value);
        break;
      case 'package':
        s.packages++;
        player.cash += 250;
        tell('HIDDEN PACKAGE ' + s.packages + '/10');
        if (s.packages < 10) s.pickups.push(newPickup(200 + random() * 2100, 100 + random() * 1900, 'package'));
        break;
      case 'ammo':
        player.ammo += item.value;
        tell('AMMO +' + item.value);
        break;
      case 'health':
        player.health = Math.min(100, player.health + 35);
        player.armour = Math.min(100, player.armour + 20);
        tell('HEALTH + ARMOUR');
        break;
    }
  }

  function spawnCrew() {
    s.thugs = Array.from({ length: 3 }, (_, i) => ({
      x: 540 + i * 22, y: 845 - i * 20, r: 13, a: 0, health: 70, attack: 0, alive: true,
    }));
  }

  function finishJob(reward, message) {
    player.cash += reward;
    s.mission++;
    s.objective = 0;
    tell(message);
  }

  function elapsed(dt) {
    if (s.missionTime <= 0) return false;
    s.missionTime -= dt;
    return s.missionTime <= 0;
  }

  function runStory(dt) {
    const at = (target, radius) => nearby(player, target, radius);
    switch (s.mission) {
      case 0:
        if (player.car && at(garage, 68)) {
          finishJob(missions[0][4], 'FIRST WHEELS COMPLETE  +$500');
          s.missionTime = 90;
        }
        break;
      case 1:
        if (s.objective < 2 && elapsed(dt)) {
          s.missionTime = 90;
          s.objective = 0;
          tell('PACKAGE WINDOW RESET — RETURN DOWNTOWN', '#ff7772');
        }
        if (s.objective === 0 && at(downtown, 52)) {
          s.objective = 1;
          s.missionTime = 90;
          tell('PACKAGE SECURED — 90 SECONDS');
        } else if (s.objective === 1 && at(marina, 65)) {
          finishJob(missions[1][5], 'PACKAGE DELIVERED  +$900');
          s.wanted = Math.max(s.wanted, 2);
          s.crimeTimer = 22;
        }
        break;
      case 2:
        if (s.wanted === 0) {
          finishJob(missions[2][4], 'GETAWAY DRIVER COMPLETE  +$1,200');
          s.missionTime = 120;
        }
        break;
      case 3:
        if (elapsed(dt)) {
          s.missionTime = 120;
          s.objective = 0;
          tell('FARES EXPIRED — TRY AGAIN', '#ff7772');
        }
        if (player.car?.type !== 'taxi') s.objective = 0;
        else if (s.objective < fares.length && at(fares[s.objective], 70)) {
          s.objective++;
          player.cash += 250;
          tell('FARE COMPLETE  +$250');
          if (s.objective === fares.length) {
            finishJob(missions[3][4], 'TAXI TROUBLE COMPLETE');
            spawnCrew();
          }
        }
        break;
      case 4:
        if (!s.heistCase && s.objective >= 3 && !player.car && at(rooftop, 42)) {
          s.heistCase = true;
          addText('BRIEFCASE SECURED', rooftop.x, rooftop.y);
        } else if (s.heistCase && player.car && at(contact, 80)) {
          finishJob(missions[4][4], 'ROOFTOP DEAL COMPLETE  +$2,200');
          s.heistCase = false;
        }
        break;
      case 5:
        if (s.objective === 1 && elapsed(dt)) {
          s.objective = 0;
          s.wanted = 0;
          tell('HEIST WINDOW CLOSED — RESET', '#ff7772');
        }
        if (s.objective === 0 && at(stashA, 70)) {
          Object.assign(s, { objective: 1, wanted: 3, crimeTimer: 25, missionTime: 150 });
          player.cash += 1000;
          tell('CASH STASH 1/2  +$1,000');
        } else if (s.objective === 1 && at(stashB, 70)) {
          s.objective = 2;
          player.cash += 1000;
          tell('CASH STASH 2/2  +$1,000');
        } else if (s.objective === 2 && s.wanted === 0 && at(contact, 75)) {
          finishJob(missions[5][4], 'THE BIG SCORE  +$4,000');
          Object.assign(s, { objective: 2, complete: true, screen: 'complete' });
        }
        break;
      case 6:
        if (player.car?.type === 'taxi' && at(nextFare(s), 70)) {
          player.cash += 250;
          s.sideFare++;
          tell('SIDE FARE COMPLETE  +$250');
        }
        break;
    }
  }

  function goal() {
    switch (s.mission) {
      case 0:
      case 2: return garage;
      case 1: return s.objective === 0 ? downtown : marina;
      case 3: return fares[Math.min(s.objective, fares.length - 1)];
      case 4: return s.objective >= 3 && s.heistCase ? contact : rooftop;
      case 5: return [stashA, stashB, contact][s.objective] ?? contact;
      case 6: return player.car?.type === 'taxi' ? nextFare(s) : null;
      default: return null;
    }
  }

  function missionData() {
    return missions[s.mission] ?? ['FREE ROAM', 'Dante', 'Explore Port Solano, collect hidden packages, and take repeat taxi fares'];
  }

  function districtName() {
    const { x, y } = player;
    if (y < 500 || x < 900) return 'OLD TOWN';
    if (x < 1500) return 'DOWNTOWN';
    if (x > 1700 && y < 950) return 'MARINA';
    return 'INDUSTRIAL';
  }

  function traffic(dt, speed = 70) {
    s.cars.forEach((car, i) => {
      if (!car.traffic || car.player) return;
      const horizontal = Math.abs(Math.cos(car.a)) > 0.7;
      const along = horizontal ? car.x : car.y;
      const across = horizontal ? car.y : car.x;
      const atLight = Math.abs(closest(horizontal ? X : Y, along) - along) < 31 &&
        Math.abs(closest(horizontal ? Y : X, across) - across) < ROAD / 2;
      const red = atLight && (Math.floor(s.clock / 7) + i) % 2 === 0;
      const bumper = point(car.x + Math.cos(car.a) * 34, car.y + Math.sin(car.a) * 34);
      const queued = s.cars.some((other) => other !== car && other.traffic && !other.player && nearby(other, bumper, 24));
      if (!red && !queued) advance(car, car.a, speed * dt);
      if (car.x < 0 || car.x > W || car.y < 0 || car.y > H) Object.assign(car, { x: random() * W, y: random() * H });
    });
  }

  function walkCrowd(dt) {
    for (const ped of s.peds) {
      if (ped.panic > 0) {
        ped.panic -= dt;
        advance(ped, ped.a, 95 * dt);
        if (ped.cash > 0) {
          s.pickups.push(newPickup(ped.x, ped.y, 'cash', ped.cash));
          ped.cash = 0;
        }
      } else {
        advance(ped, ped.a, 18 * dt);
        if (random() < dt * 0.15) ped.a += (random() - 0.5) * 2;
      }
      if (blocked(city, ped.x, ped.y, 7)) ped.a += Math.PI * 0.6;
      if (ped.health <= 0) ped.health = -1;
    }
  }

  function flyBullets(dt) {
    for (const bullet of s.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      const hit = s.thugs.find((thug) => thug.alive && nearby(bullet, thug, 15));
      if (hit) {
        hurtThug(hit, 35);
        bullet.life = 0;
      }
    }
    s.bullets = s.bullets.filter(({ life }) => life > 0);
  }

  function dispatch(dt) {
    const spotted = s.police.some((cop) => nearby(cop, player, 250) && clearSight(city, cop, player));
    if (s.wanted > 0) {
      s.crimeTimer -= dt;
      if (s.crimeTimer <= 0 && !spotted) {
        s.wanted--;
        s.crimeTimer = 20;
      }
    }
    while (s.police.length < s.wanted) {
      s.police.push({ x: random() < 0.5 ? 0 : W, y: random() * H, a: 0, hp: 100, vehicle: Boolean(player.car) });
    }
    if (s.police.length > s.wanted) s.police.length = s.wanted;

    for (const cop of s.police) {
      const car = player.car;
      cop.vehicle = Boolean(car);
      cop.a = angle(cop, player);
      advance(cop, cop.a, (95 + s.wanted * 28) * dt);
      if (!nearby(cop, player, 29)) continue;
      if (car) {
        car.speed *= 0.9;
        if (Math.abs(car.speed) < 14 && s.wanted >= 3) s.arrest += dt;
      } else {
        s.arrest += dt;
        player.health -= 5 * dt;
      }
      if (s.arrest <= 1.5) continue;
      if (car) car.player = false;
      Object.assign(player, { ...station, car: null, cash: Math.max(0, player.cash - 300) });
      Object.assign(s, { screen: 'busted', wanted: 0, arrest: 0 });
      tell('BUSTED  -$300', '#ff7772');
    }
  }

  function moveCrew(dt) {
    for (const thug of s.thugs) {
      if (!thug.alive || !nearby(thug, player, 260)) continue;
      thug.a = angle(thug, player);
      advance(thug, thug.a, 36 * dt);
      if (!nearby(thug, player, 25)) continue;
      thug.attack -= dt;
      if (thug.attack > 0) continue;
      player.health -= 8;
      player.armour = Math.max(0, player.armour - 5);
      thug.attack = 0.8;
      crime(1);
    }
  }

  function drive(car, steer, pedal, handbrake, dt) {
    const spec = types[car.type];
    car.a += steer * spec.turn * dt * (0.35 + Math.abs(car.speed) / spec.max);
    car.speed += (pedal * spec.max - car.speed) * dt * (handbrake ? 3 : 2);
    if (handbrake && Math.abs(car.speed) > 100) {
      sparks(car.x - Math.cos(car.a) * 20, car.y - Math.sin(car.a) * 20, '#a7a49c', 1);
      car.speed *= 0.992;
    }
    const position = point(car.x, car.y);
    advance(car, car.a, car.speed * dt);
    if (blocked(city, car.x, car.y, 25)) {
      Object.assign(car, position);
      car.speed *= -0.32;
      car.hp -= 13;
      s.damage++;
      s.shake = 0.2;
      sparks(car.x, car.y, '#ffc36c');
      scatter(car.x, car.y, 220);
    }
    for (const other of s.cars) {
      if (other === car || other.hp <= 0 || !nearby(car, other, 34)) continue;
      car.speed *= -0.35;
      car.hp -= 6;
      other.hp -= 6;
      s.damage++;
      s.shake = 0.16;
      sparks(car.x, car.y, '#ffd17a', 7);
      if (other.type === 'police') crime(2);
      else if (other.driver) crime(1);
    }
    for (const cop of s.police) {
      if (!nearby(car, cop, 34)) continue;
      car.speed *= -0.4;
      car.hp -= 8;
      s.shake = 0.18;
      crime(2);
      sparks(car.x, car.y, '#ffd17a', 10);
    }
    if (car.hp <= 0) {
      sparks(car.x, car.y, '#ef7048', 28);
      addText('VEHICLE DESTROYED', car.x, car.y, '#ff7657');
      car.player = false;
      player.car = null;
      player.health -= 15;
      s.damage = 0;
      return;
    }
    Object.assign(player, { x: car.x, y: car.y, angle: car.a });
    if (Math.abs(car.speed) <= 95) return;
    for (const ped of s.peds) {
      if (ped.health <= 0 || !nearby(car, ped, 23)) continue;
      Object.assign(ped, { health: 0, panic: 8 });
      car.speed *= 0.78;
      crime(1);
      addText('PEDESTRIAN HIT', ped.x, ped.y, '#ff7772');
      sparks(ped.x, ped.y, '#d97961', 6);
    }
  }

  function handleInput(input, dt) {
    const held = (...keys) => keys.some((key) => input.down(key));
    const east = Number(held('KeyD', 'ArrowRight')) - Number(held('KeyA', 'ArrowLeft'));
    const south = Number(held('KeyS', 'ArrowDown')) - Number(held('KeyW', 'ArrowUp'));
    if (player.car) {
      drive(player.car, east, -south, held('Space'), dt);
    } else if (east || south) {
      const step = (held('ShiftLeft', 'ShiftRight') ? 250 : 170) * dt;
      const x = player.x + east * step, y = player.y + south * step;
      player.angle = Math.atan2(south, east);
      if (!blocked(city, x, y, 15)) Object.assign(player, { x, y });
    }
    const mouse = input.mouse;
    if (mouse?.hasMoved) player.angle = Math.atan2(mouse.y - innerHeight / 2, mouse.x - innerWidth / 2);
    const triggers = { enter: held('KeyE'), fire: Boolean(mouse?.down), melee: held('KeyF') };
    if (triggers.enter && !lastAction.enter) enterExit();
    if (triggers.fire && !lastAction.fire) fire();
    if (triggers.melee && !lastAction.melee) punch();
    Object.assign(lastAction, triggers);
  }

  function update(dt, input = idle) {
    if (s.screen === 'title') {
      s.clock += dt * 20;
      traffic(dt, 48);
      for (const ped of s.peds) advance(ped, ped.a, 10 * dt);
      return;
    }
    if (s.screen !== 'play' || s.paused) return;
    s.clock += dt * 20;
    s.shake = Math.max(0, s.shake - dt);
    handleInput(input, dt);
    traffic(dt);
    walkCrowd(dt);
    flyBullets(dt);
    collect();
    dispatch(dt);
    moveCrew(dt);
    runStory(dt);

    for (const text of s.texts) {
      text.y -= 20 * dt;
      text.life -= dt;
    }
    for (const particle of s.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    }
    s.texts = s.texts.filter(({ life }) => life > 0);
    s.particles = s.particles.filter(({ life }) => life > 0);
    if (player.health < 100 && !s.wanted && !s.thugs.some((thug) => thug.alive && nearby(thug, player, 200))) {
      player.health = Math.min(100, player.health + dt * 2);
    }
    if (player.health <= 0) s.screen = 'wasted';
  }

  function stageComplete() {
    Object.assign(s, { mission: 5, objective: 2, wanted: 0, screen: 'play' });
    Object.assign(player, { ...contact, cash: 14450 });
    runStory(0);
  }

  function restartMission() {
    const missionTime = s.mission === 1 ? 90 : s.mission === 3 ? 120 : 0;
    Object.assign(s, { objective: 0, missionTime, crimeTimer: s.mission === 2 ? 22 : 0, heistCase: false, arrest: 0, wanted: s.mission === 2 ? 2 : 0 });
    player.health = 100;
    if (s.mission === 4) spawnCrew();
    tell('MISSION RESTARTED');
  }

  function newGame() {
    if (player.car) player.car.player = false;
    Object.assign(player, { ...contact, car: null, cash: 1200, health: 100, armour: 35 });
    Object.assign(s, { mission: 0, objective: 0, missionTime: 0, wanted: 0, complete: false, screen: 'play', paused: false });
  }

  return { s, city, update, restartMission, newGame, missionData, stageComplete, goal, districtName, enterExit, addText };
}
