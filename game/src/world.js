// Port Solano's open-world simulation and story state machine.
import {
  W, H, X, Y, ROAD, types, clamp, distance, angle, wrapAngle,
  garage, station, contact, point,
} from './config.js';
import { makeCity, blocked, clearSight } from './city.js';

export const missions = [
  ['FIRST WHEELS', 'Dante', 'Steal a car and deliver it to the garage', garage, 500],
  ['THE PACKAGE', 'Dante', 'Pick up the package downtown, deliver it to the marina', point(960, 520), point(1770, 520), 900],
  ['GETAWAY DRIVER', 'Dante', 'Lose the 2-star wanted level', point(1365, 895), 1200],
  ['TAXI TROUBLE', 'Dante', 'Drive a taxi and pick up 3 fares around the city', point(2050, 1270), 1500],
  ['ROOFTOP DEAL', 'Dante', 'Fight through 3 thugs, grab the briefcase, escape to your car', point(555, 895), 2200],
  ['THE BIG SCORE', 'Dante', 'Grab cash from 2 spots, then escape a 3-star chase', point(1770, 1270), 4000],
];

const taxiStops = [point(2050, 1270), point(960, 895), point(555, 1270)];
const hideout = contact;
const heistA = point(1770, 1270);
const heistB = point(555, 520);
const near = (a, b, radius) => distance(a, b) < radius;

export function createWorld(random) {
  const city = makeCity(random);
  const s = {
    player: { x: contact.x, y: contact.y, r: 15, health: 100, armour: 35, cash: 1200, angle: 0, car: null, ammo: 18 },
    cars: [], peds: [], thugs: [], police: [], bullets: [], pickups: [], particles: [], texts: [],
    wanted: 0, mission: 0, objective: 0, sideFare: 0, missionTime: 0, crimeTimer: 0,
    arrest: 0, clock: 15 * 3600, screen: 'title', complete: false, paused: false,
    damage: 0, packages: 0, muted: false, best: 0, shake: 0, heistCase: false,
  };

  const carKinds = ['sedan', 'taxi', 'sport', 'van', 'pickup'];
  for (let i = 0; i < 22; i++) {
    const vertical = random() < 0.5;
    const lane = vertical ? X[Math.floor(random() * X.length)] : Y[Math.floor(random() * Y.length)];
    s.cars.push({
      x: vertical ? lane + (random() - 0.5) * 48 : random() * W,
      y: vertical ? random() * H : lane + (random() - 0.5) * 48,
      a: vertical ? (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (random() < 0.5 ? 0 : Math.PI),
      type: i === 1 ? 'taxi' : carKinds[Math.floor(random() * carKinds.length)],
      hp: 100, traffic: i < 14, stolen: false, speed: 0, player: false, driver: i < 14,
    });
  }
  s.cars.push({ x: contact.x - 55, y: contact.y + 12, a: 0, type: 'sport', hp: 100, traffic: false, stolen: false, speed: 0, player: false, driver: false });
  s.cars.push({ x: garage.x + 58, y: garage.y + 12, a: Math.PI, type: 'taxi', hp: 100, traffic: false, stolen: false, speed: 0, player: false, driver: false });

  for (let i = 0; i < 27; i++) {
    s.peds.push({ x: 180 + random() * 1950, y: 100 + random() * 1750, r: 8, a: random() * Math.PI * 2, panic: 0, health: 40, cash: random() < 0.25 ? integer(15, 60) : 0 });
  }
  for (let i = 0; i < 10; i++) {
    let x = 190, y = 120;
    for (let attempt = 0; attempt < 50; attempt++) {
      x = 190 + random() * 2050;
      y = 120 + random() * 1750;
      if (!blocked(city, x, y, 14)) break;
    }
    s.pickups.push({ x, y, type: i < 5 ? 'cash' : i < 8 ? 'package' : 'health', value: i < 5 ? integer(80, 220) : 1, active: true });
  }
  s.pickups.push({ x: contact.x + 15, y: contact.y - 45, type: 'ammo', value: 12, active: true });

  function integer(low, high) { return Math.floor(low + random() * (high - low + 1)); }
  function label(message, x, y, color = '#ffe28a') { s.texts.push({ t: message, x, y, c: color, life: 2 }); }
  function burst(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const direction = random() * Math.PI * 2;
      const force = 25 + random() * 190;
      s.particles.push({ x, y, vx: Math.cos(direction) * force, vy: Math.sin(direction) * force, life: 0.25 + random() * 0.5, color });
    }
  }
  function scareNearby(x, y, radius = 220) {
    for (const ped of s.peds) if (near(ped, { x, y }, radius)) {
      ped.panic = 6;
      ped.a = angle({ x, y }, ped);
    }
  }
  function commitCrime(stars) {
    if (!stars) return;
    s.wanted = clamp(s.wanted + stars, 0, 5);
    s.crimeTimer = 20;
    scareNearby(s.player.x, s.player.y, 270);
  }
  function addThugs() {
    s.thugs = Array.from({ length: 3 }, (_, index) => ({ x: 540 + index * 22, y: 845 - index * 20, r: 13, health: 70, a: 0, attack: 0, alive: true }));
  }
  function leaveCar() {
    const p = s.player;
    if (p.car) {
      p.x = p.car.x + 34;
      p.y = p.car.y + 34;
      p.car.player = false;
      p.car = null;
      return;
    }
    const car = s.cars.find((vehicle) => near(vehicle, p, 46));
    if (!car) return;
    p.car = car;
    car.player = true;
    car.stolen = true;
    car.driver = false;
    if (car.traffic || s.peds.some((ped) => near(ped, p, 100)) || s.police.some((cop) => near(cop, p, 200))) commitCrime(1);
    label('CAR STOLEN', p.x, p.y, '#ff7272');
    for (const ped of s.peds) if (near(ped, p, 150)) ped.panic = 7;
  }
  function fireWeapon() {
    const p = s.player;
    if (p.car || p.ammo <= 0) return;
    p.ammo--;
    s.bullets.push({ x: p.x, y: p.y, vx: Math.cos(p.angle) * 800, vy: Math.sin(p.angle) * 800, life: 0.75 });
    burst(p.x + Math.cos(p.angle) * 17, p.y + Math.sin(p.angle) * 17, '#ffd378', 3);
    commitCrime(1);
  }
  function punch() {
    const p = s.player;
    for (const thug of s.thugs) {
      const facing = Math.atan2(thug.y - p.y, thug.x - p.x) - p.angle;
      if (!thug.alive || !near(thug, p, 45) || Math.abs(wrapAngle(facing)) >= 1.35) continue;
      thug.health -= 42;
      burst(thug.x, thug.y, '#d87864', 6);
      if (thug.health <= 0) {
        thug.alive = false;
        label('THUG DOWN', thug.x, thug.y);
        if (s.mission === 4) s.objective++;
      }
      return;
    }
  }
  function collectPickup() {
    const p = s.player;
    for (const item of s.pickups) {
      if (!item.active || !near(item, p, 32)) continue;
      item.active = false;
      if (item.type === 'cash') {
        p.cash += item.value;
        label('+$' + item.value, p.x, p.y);
        s.best = Math.max(s.best, p.cash);
      } else if (item.type === 'package') {
        s.packages++;
        p.cash += 250;
        label('HIDDEN PACKAGE ' + s.packages + '/10', p.x, p.y);
      } else if (item.type === 'ammo') {
        p.ammo += item.value;
        label('AMMO +' + item.value, p.x, p.y);
      } else if (item.type === 'health') {
        p.health = Math.min(100, p.health + 35);
        p.armour = Math.min(100, p.armour + 20);
        label('HEALTH + ARMOUR', p.x, p.y);
      }
      if (item.type === 'package' && s.packages < 10) s.pickups.push({ x: 200 + random() * 2100, y: 100 + random() * 1900, type: 'package', value: 1, active: true });
      break;
    }
  }

  function missionStep(dt) {
    const p = s.player;
    const mission = missions[Math.min(s.mission, missions.length - 1)];
    if (s.mission === 0 && p.car && near(p, garage, 68)) {
      p.cash += mission[4]; s.mission = 1; s.objective = 0; s.missionTime = 90;
      label('FIRST WHEELS COMPLETE  +$500', p.x, p.y);
    } else if (s.mission === 1) {
      if (s.objective < 2 && s.missionTime > 0) {
        s.missionTime -= dt;
        if (s.missionTime <= 0) {
          s.missionTime = 90;
          if (s.objective === 1) s.objective = 0;
          label('PACKAGE WINDOW RESET — RETURN DOWNTOWN', p.x, p.y, '#ff7772');
        }
      }
      if (s.objective === 0 && near(p, mission[3], 52)) {
        s.objective = 1; s.missionTime = 90; label('PACKAGE SECURED — 90 SECONDS', p.x, p.y);
      } else if (s.objective === 1 && near(p, mission[4], 65)) {
        p.cash += mission[5]; s.mission = 2; s.objective = 0; s.wanted = Math.max(s.wanted, 2); s.crimeTimer = 22;
        label('PACKAGE DELIVERED  +$900', p.x, p.y);
      }
    } else if (s.mission === 2 && s.wanted === 0) {
      p.cash += mission[4]; s.mission = 3; s.objective = 0; s.missionTime = 120;
      label('GETAWAY DRIVER COMPLETE  +$1,200', p.x, p.y);
    } else if (s.mission === 3) {
      if (s.missionTime > 0) {
        s.missionTime -= dt;
        if (s.missionTime <= 0) { s.missionTime = 120; s.objective = 0; label('FARES EXPIRED — TRY AGAIN', p.x, p.y, '#ff7772'); }
      }
      if (!p.car || p.car.type !== 'taxi') s.objective = 0;
      else if (s.objective < 3 && near(p, taxiStops[s.objective], 70)) {
        s.objective++; p.cash += 250; label('FARE COMPLETE  +$250', p.x, p.y);
        if (s.objective === 3) {
          p.cash += mission[4]; s.mission = 4; s.objective = 0; addThugs(); label('TAXI TROUBLE COMPLETE', p.x, p.y);
        }
      }
    } else if (s.mission === 4) {
      if (s.objective >= 3 && !s.heistCase && !p.car && near(p, point(555, 895), 42)) {
        s.heistCase = true; label('BRIEFCASE SECURED', 555, 895);
      } else if (s.heistCase && p.car && near(p, contact, 80)) {
        p.cash += mission[4]; s.mission = 5; s.objective = 0; s.heistCase = false;
        label('ROOFTOP DEAL COMPLETE  +$2,200', p.x, p.y);
      }
    } else if (s.mission === 5) {
      if (s.objective === 1 && s.missionTime > 0) {
        s.missionTime -= dt;
        if (s.missionTime <= 0) { s.objective = 0; s.wanted = 0; label('HEIST WINDOW CLOSED — RESET', p.x, p.y, '#ff7772'); }
      }
      if (s.objective === 0 && near(p, heistA, 70)) {
        s.objective = 1; p.cash += 1000; s.wanted = 3; s.crimeTimer = 25; s.missionTime = 150; label('CASH STASH 1/2  +$1,000', p.x, p.y);
      } else if (s.objective === 1 && near(p, heistB, 70)) {
        s.objective = 2; p.cash += 1000; label('CASH STASH 2/2  +$1,000', p.x, p.y);
      } else if (s.objective === 2 && s.wanted === 0 && near(p, hideout, 75)) {
        p.cash += mission[4]; s.mission = 6; s.complete = true; s.screen = 'complete'; label('THE BIG SCORE  +$4,000', p.x, p.y);
      }
    }
  }

  function goal() {
    const p = s.player;
    if (s.mission === 0) return garage;
    if (s.mission === 1) return s.objective === 0 ? missions[1][3] : missions[1][4];
    if (s.mission === 2) return point(1365, 895);
    if (s.mission === 3) return taxiStops[Math.min(s.objective, 2)];
    if (s.mission === 6 && p.car?.type === 'taxi') return taxiStops[s.sideFare % taxiStops.length];
    if (s.mission === 4) return s.objective < 3 ? point(555, 895) : s.heistCase ? contact : point(555, 895);
    if (s.mission === 5) return s.objective === 0 ? heistA : s.objective === 1 ? heistB : hideout;
    return null;
  }
  function missionData() {
    return s.mission >= 6 ? ['FREE ROAM', 'Dante', 'Explore Port Solano, collect hidden packages, and take repeat taxi fares'] : missions[s.mission];
  }
  function districtName() {
    const { x, y } = s.player;
    return y < 500 ? 'OLD TOWN' : x < 900 ? 'OLD TOWN' : x < 1500 ? 'DOWNTOWN' : x > 1700 && y < 950 ? 'MARINA' : y > 1450 && x < 900 ? 'SUBURBS' : y > 1100 && x < 1500 ? 'PALM PARK' : 'INDUSTRIAL';
  }

  function moveTraffic(dt) {
    for (let index = 0; index < s.cars.length; index++) {
      const car = s.cars[index];
      if (!car.traffic || car.player) continue;
      const alongX = Math.abs(Math.cos(car.a)) > 0.7;
      const crossRoad = alongX ? closest(X, car.x) : closest(Y, car.y);
      const roadLine = alongX ? closest(Y, car.y) : closest(X, car.x);
      const stopped = Math.abs(crossRoad - (alongX ? car.x : car.y)) < 31 && Math.abs(roadLine - (alongX ? car.y : car.x)) < ROAD / 2 && (Math.floor(s.clock / 7) + index) % 2 === 0;
      const ahead = s.cars.some((other, otherIndex) => otherIndex !== index && other.traffic && !other.player && near(other, { x: car.x + Math.cos(car.a) * 34, y: car.y + Math.sin(car.a) * 34 }, 24));
      if (!stopped && !ahead) { car.x += Math.cos(car.a) * 70 * dt; car.y += Math.sin(car.a) * 70 * dt; }
      if (car.x < 0 || car.x > W || car.y < 0 || car.y > H) { car.x = random() * W; car.y = random() * H; }
    }
  }
  function closest(values, target) {
    return values.reduce((best, value) => Math.abs(value - target) < Math.abs(best - target) ? value : best, values[0]);
  }
  function updatePedestrians(dt) {
    for (const ped of s.peds) {
      if (ped.panic > 0) {
        ped.panic -= dt; ped.x += Math.cos(ped.a) * 95 * dt; ped.y += Math.sin(ped.a) * 95 * dt;
        if (ped.cash > 0) { s.pickups.push({ x: ped.x, y: ped.y, type: 'cash', value: ped.cash, active: true }); ped.cash = 0; }
      } else {
        ped.x += Math.cos(ped.a) * 18 * dt; ped.y += Math.sin(ped.a) * 18 * dt;
        if (random() < dt * 0.15) ped.a += (random() - 0.5) * 2;
      }
      if (blocked(city, ped.x, ped.y, 7)) ped.a += Math.PI * 0.6;
      if (ped.health <= 0) ped.health = -1;
    }
  }
  function pursue(dt) {
    const p = s.player;
    for (const bullet of s.bullets) {
      bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt;
      for (const thug of s.thugs) if (thug.alive && near(bullet, thug, 15)) {
        thug.health -= 35; bullet.life = 0;
        if (thug.health <= 0) { thug.alive = false; if (s.mission === 4) s.objective++; }
        break;
      }
    }
    s.bullets = s.bullets.filter((bullet) => bullet.life > 0);
    collectPickup();
    const eyesOn = s.police.some((cop) => near(cop, p, 250) && clearSight(city, cop, p));
    if (s.wanted > 0) {
      s.crimeTimer -= dt;
      if (s.crimeTimer <= 0 && !eyesOn) { s.wanted = Math.max(0, s.wanted - 1); s.crimeTimer = 20; }
    }
    const count = s.wanted ? Math.min(5, s.wanted) : 0;
    while (s.police.length < count) s.police.push({ x: random() < 0.5 ? 0 : W, y: random() * H, a: 0, hp: 100, vehicle: !!p.car });
    while (s.police.length > count) s.police.pop();
    for (const cop of s.police) {
      cop.vehicle = !!p.car; cop.a = angle(cop, p);
      const velocity = 95 + s.wanted * 28;
      cop.x += Math.cos(cop.a) * velocity * dt; cop.y += Math.sin(cop.a) * velocity * dt;
      if (!near(cop, p, 29)) continue;
      if (p.car) { p.car.speed *= 0.9; if (Math.abs(p.car.speed) < 14 && s.wanted >= 3) s.arrest += dt; }
      else { s.arrest += dt; p.health -= 5 * dt; }
      if (s.arrest > 1.5) {
        s.screen = 'busted'; p.cash = Math.max(0, p.cash - 300); p.car = null; p.x = station.x; p.y = station.y; s.wanted = 0; s.arrest = 0;
        label('BUSTED  -$300', p.x, p.y, '#ff7772');
      }
    }
    for (const thug of s.thugs) if (thug.alive && near(thug, p, 260)) {
      thug.a = angle(thug, p); thug.x += Math.cos(thug.a) * 36 * dt; thug.y += Math.sin(thug.a) * 36 * dt;
      if (near(thug, p, 25)) {
        thug.attack -= dt;
        if (thug.attack <= 0) { p.health -= 8; p.armour = Math.max(0, p.armour - 5); thug.attack = 0.8; commitCrime(1); }
      }
    }
  }
  function drive(dt, input) {
    const p = s.player;
    const horizontal = Number(input.down('KeyD') || input.down('ArrowRight')) - Number(input.down('KeyA') || input.down('ArrowLeft'));
    const vertical = Number(input.down('KeyS') || input.down('ArrowDown')) - Number(input.down('KeyW') || input.down('ArrowUp'));
    if (!p.car) {
      const speed = input.down('ShiftLeft') || input.down('ShiftRight') ? 250 : 170;
      if (horizontal || vertical) p.angle = Math.atan2(vertical, horizontal);
      p.x += horizontal * speed * dt; p.y += vertical * speed * dt;
      if ((horizontal || vertical) && blocked(city, p.x, p.y, 15)) { p.x -= horizontal * speed * dt; p.y -= vertical * speed * dt; }
    } else {
      const car = p.car;
      const handbrake = input.down('Space');
      car.a += horizontal * types[car.type].turn * dt * (0.35 + Math.abs(car.speed) / types[car.type].max);
      const target = -vertical * types[car.type].max;
      car.speed += (target - car.speed) * dt * (handbrake ? 3 : 2);
      if (handbrake && Math.abs(car.speed) > 100) { burst(car.x - Math.cos(car.a) * 20, car.y - Math.sin(car.a) * 20, '#a7a49c', 1); car.speed *= 0.992; }
      car.x += Math.cos(car.a) * car.speed * dt; car.y += Math.sin(car.a) * car.speed * dt;
      if (blocked(city, car.x, car.y, 25)) {
        car.speed *= -0.32; car.hp -= 13; s.damage++; s.shake = 0.2; burst(car.x, car.y, '#ffc36c'); scareNearby(car.x, car.y);
      }
      for (const other of s.cars) if (other !== car && other.hp && near(car, other, 34)) {
        car.speed *= -0.35; car.hp -= 6; other.hp -= 6; s.damage++; s.shake = 0.16; burst(car.x, car.y, '#ffd17a', 7);
        if (other.type === 'police') commitCrime(2); else if (other.driver) commitCrime(1);
      }
      for (const cop of s.police) if (near(car, cop, 34)) { car.speed *= -0.4; car.hp -= 8; s.shake = 0.18; commitCrime(2); burst(car.x, car.y, '#ffd17a', 10); }
      if (car.hp <= 0) {
        burst(car.x, car.y, '#ef7048', 28); label('VEHICLE DESTROYED', car.x, car.y, '#ff7657'); p.car = null; p.health -= 15; s.damage = 0;
      }
      if (p.car) {
        p.x = car.x; p.y = car.y; p.angle = car.a;
        if (Math.abs(car.speed) > 95) for (const ped of s.peds) if (ped.health > 0 && near(car, ped, 23)) {
          ped.health = 0; ped.panic = 8; car.speed *= 0.78; commitCrime(1); label('PEDESTRIAN HIT', ped.x, ped.y, '#ff7772'); burst(ped.x, ped.y, '#d97961', 6);
        }
      }
    }
    if (input.mouse?.hasMoved) p.angle = Math.atan2(input.mouse.y - innerHeight / 2, input.mouse.x - innerWidth / 2);
    if (input.down('KeyE')) { if (!s._e) s._e = 1; else s._e++; } else s._e = 0;
    if (s._e === 1) leaveCar();
    const firing = input.mouse?.down;
    if (firing && !s._shot) { fireWeapon(); s._shot = 1; }
    if (!firing) s._shot = 0;
    if (input.down('KeyF') && !s._punch) { if (!p.car) punch(); s._punch = 1; }
    if (!input.down('KeyF')) s._punch = 0;
  }
  function animateEffects(dt) {
    for (const item of s.texts) { item.y -= 20 * dt; item.life -= dt; }
    s.texts = s.texts.filter((item) => item.life > 0);
    for (const particle of s.particles) { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt; }
    s.particles = s.particles.filter((particle) => particle.life > 0);
  }
  function update(dt, input = { down: () => false }) {
    if (s.screen !== 'play' || s.paused) {
      if (s.screen === 'title') {
        s.clock += dt * 20; moveTraffic(dt * (48 / 70));
        for (const ped of s.peds) { ped.x += Math.cos(ped.a) * 10 * dt; ped.y += Math.sin(ped.a) * 10 * dt; }
      }
      return;
    }
    s.shake = Math.max(0, s.shake - dt); s.clock += dt * 20;
    drive(dt, input);
    moveTraffic(dt);
    updatePedestrians(dt);
    pursue(dt);
    if (s.mission === 6 && s.player.car?.type === 'taxi' && near(s.player, taxiStops[s.sideFare % taxiStops.length], 70)) {
      s.player.cash += 250; s.sideFare++; label('SIDE FARE COMPLETE  +$250', s.player.x, s.player.y);
    }
    missionStep(dt);
    animateEffects(dt);
    if (s.player.health < 100 && !s.wanted && !s.thugs.some((thug) => near(thug, s.player, 200) && thug.alive)) s.player.health = Math.min(100, s.player.health + dt * 2);
    if (s.player.health <= 0) s.screen = 'wasted';
  }

  function stageComplete() {
    s.mission = 5; s.objective = 2; s.wanted = 0; s.player.x = contact.x; s.player.y = contact.y; s.screen = 'play'; s.player.cash = 14450;
    missionStep(0);
  }
  function restartMission() {
    s.objective = 0; s.missionTime = s.mission === 1 ? 90 : 0; s.heistCase = false; s.arrest = 0; s.player.health = 100; s.wanted = s.mission === 2 ? 2 : 0;
    if (s.mission === 4) addThugs();
    label('MISSION RESTARTED', s.player.x, s.player.y);
  }
  function newGame() {
    s.mission = 0; s.objective = 0; s.missionTime = 0; s.wanted = 0; s.complete = false; s.player.cash = 1200; s.player.health = 100; s.player.armour = 35;
    s.player.x = contact.x; s.player.y = contact.y; s.player.car = null; s.screen = 'play'; s.paused = false;
  }
  return { s, city, update, restartMission, newGame, missionData, stageComplete, goal, districtName, enterExit: leaveCar, addText: label };
}
