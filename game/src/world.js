// Port Solano simulation: city driving, pedestrians, police, combat, pickups and six story missions.
import {
  W,
  H,
  X,
  Y,
  ROAD,
  types,
  clamp,
  distance,
  angle,
  wrapAngle,
  garage,
  station,
  contact,
  point,
} from './config.js';
import { makeCity, blocked, clearSight } from './city.js';
export const missions = [
  [
    'FIRST WHEELS',
    'Dante',
    'Steal a car and deliver it to the garage',
    garage,
    500,
  ],
  [
    'THE PACKAGE',
    'Dante',
    'Pick up the package downtown, deliver it to the marina',
    point(960, 520),
    point(1770, 520),
    900,
  ],
  [
    'GETAWAY DRIVER',
    'Dante',
    'Lose the 2-star wanted level',
    point(1365, 895),
    1200,
  ],
  [
    'TAXI TROUBLE',
    'Dante',
    'Drive a taxi and pick up 3 fares around the city',
    point(2050, 1270),
    1500,
  ],
  [
    'ROOFTOP DEAL',
    'Dante',
    'Fight through 3 thugs, grab the briefcase, escape to your car',
    point(555, 895),
    2200,
  ],
  [
    'THE BIG SCORE',
    'Dante',
    'Grab cash from 2 spots, then escape a 3-star chase',
    point(1770, 1270),
    4000,
  ],
];
function near(a, b, r) {
  return Math.hypot(a.x - b.x, a.y - b.y) < r;
}
export function createWorld(rand) {
  const city = makeCity(rand),
    s = {
      player: {
        x: contact.x,
        y: contact.y,
        r: 15,
        health: 100,
        armour: 35,
        cash: 1200,
        angle: 0,
        car: null,
        ammo: 18,
      },
      cars: [],
      peds: [],
      thugs: [],
      police: [],
      bullets: [],
      pickups: [],
      particles: [],
      texts: [],
      wanted: 0,
      mission: 0,
      objective: 0,
      sideFare: 0,
      missionTime: 0,
      crimeTimer: 0,
      arrest: 0,
      clock: 15 * 3600,
      screen: 'title',
      complete: false,
      paused: false,
      damage: 0,
      packages: 0,
      muted: false,
      best: 0,
    };
  const carTypes = ['sedan', 'taxi', 'sport', 'van', 'pickup'];
  for (let i = 0; i < 22; i++) {
    let vertical = rand() < 0.5,
      road = vertical
        ? X[Math.floor(rand() * X.length)]
        : Y[Math.floor(rand() * Y.length)];
    s.cars.push({
      x: vertical ? road + (rand() - 0.5) * 48 : rand() * W,
      y: vertical ? rand() * H : road + (rand() - 0.5) * 48,
      a: vertical
        ? rand() < 0.5
          ? Math.PI / 2
          : -Math.PI / 2
        : rand() < 0.5
          ? 0
          : Math.PI,
      type: i === 1 ? 'taxi' : carTypes[Math.floor(rand() * carTypes.length)],
      hp: 100,
      traffic: i < 14,
      stolen: false,
      speed: 0,
      player: false,
      driver: i < 14,
    });
  }
  s.cars.push({
    x: contact.x - 55,
    y: contact.y + 12,
    a: 0,
    type: 'sport',
    hp: 100,
    traffic: false,
    stolen: false,
    speed: 0,
    player: false,
    driver: false,
  });
  s.cars.push({
    x: garage.x + 58,
    y: garage.y + 12,
    a: Math.PI,
    type: 'taxi',
    hp: 100,
    traffic: false,
    stolen: false,
    speed: 0,
    player: false,
    driver: false,
  });
  for (let i = 0; i < 27; i++)
    s.peds.push({
      x: 180 + rand() * 1950,
      y: 100 + rand() * 1750,
      r: 8,
      a: rand() * 6.28,
      panic: 0,
      health: 40,
      cash: rand() < 0.25 ? randInt(15, 60) : 0,
    });
  for (let i = 0; i < 10; i++) {
    let x = 190,
      y = 120;
    for (let tries = 0; tries < 50; tries++) {
      x = 190 + rand() * 2050;
      y = 120 + rand() * 1750;
      if (!blocked(city, x, y, 14)) break;
    }
    s.pickups.push({
      x,
      y,
      type: i < 5 ? 'cash' : i < 8 ? 'package' : 'health',
      value: i < 5 ? randInt(80, 220) : 1,
      active: true,
    });
  }
  s.pickups.push({
    x: contact.x + 15,
    y: contact.y - 45,
    type: 'ammo',
    value: 12,
    active: true,
  });
  const hideout = contact,
    heistA = point(1770, 1270),
    heistB = point(555, 520),
    taxiStops = [point(2050, 1270), point(960, 895), point(555, 1270)];
  function randInt(a, b) {
    return Math.floor(a + rand() * (b - a + 1));
  }
  function addText(t, x, y, c = '#ffe28a') {
    s.texts.push({ t, x, y, c, life: 2 });
  }
  function particles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = rand() * 6.28,
        sp = 25 + rand() * 190;
      s.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.25 + rand() * 0.5,
        color,
      });
    }
  }
  function disturb(x, y, r = 220) {
    for (const q of s.peds)
      if (near(q, { x, y }, r)) {
        q.panic = 6;
        q.a = angle({ x, y }, q);
      }
  }
  function crime(n) {
    if (!n) return;
    s.wanted = clamp(s.wanted + n, 0, 5);
    s.crimeTimer = 20;
    for (const q of s.peds)
      if (near(q, s.player, 270)) {
        q.panic = 6;
        q.a = angle(s.player, q);
      }
  }
  function spawnThugs() {
    s.thugs = [];
    for (let i = 0; i < 3; i++)
      s.thugs.push({
        x: 540 + i * 22,
        y: 845 - i * 20,
        r: 13,
        health: 70,
        a: 0,
        attack: 0,
        alive: true,
      });
  }
  function enterExit() {
    const p = s.player;
    if (p.car) {
      p.x = p.car.x + 34;
      p.y = p.car.y + 34;
      p.car.player = false;
      p.car = null;
      return;
    }
    const car = s.cars.find((o) => near(o, p, 46));
    if (car) {
      p.car = car;
      car.player = true;
      car.stolen = true;
      car.driver = false;
      if (
        car.traffic ||
        s.peds.some((q) => near(q, p, 100)) ||
        s.police.some((q) => near(q, p, 200))
      )
        crime(1);
      addText('CAR STOLEN', p.x, p.y, '#ff7272');
      for (const q of s.peds) if (near(q, p, 150)) q.panic = 7;
    }
  }
  function shoot() {
    if (s.player.car || s.player.ammo <= 0) return;
    const p = s.player,
      a = p.angle;
    s.player.ammo--;
    s.bullets.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(a) * 800,
      vy: Math.sin(a) * 800,
      life: 0.75,
    });
    particles(p.x + Math.cos(a) * 17, p.y + Math.sin(a) * 17, '#ffd378', 3);
    crime(1);
  }
  function punch() {
    const p = s.player;
    for (const t of s.thugs) {
      if (
        t.alive &&
        near(t, p, 45) &&
        Math.abs(wrapAngle(Math.atan2(t.y - p.y, t.x - p.x) - p.angle)) < 1.35
      ) {
        t.health -= 42;
        particles(t.x, t.y, '#d87864', 6);
        if (t.health <= 0) {
          t.alive = false;
          addText('THUG DOWN', t.x, t.y);
          if (s.mission === 4) s.objective++;
        }
        return;
      }
    }
  }
  function pickup() {
    const p = s.player;
    for (const q of s.pickups) {
      if (!q.active || !near(q, p, 32)) continue;
      q.active = false;
      if (q.type === 'cash') {
        p.cash += q.value;
        addText('+$' + q.value, p.x, p.y);
        s.best = Math.max(s.best, p.cash);
      } else if (q.type === 'package') {
        s.packages++;
        addText('HIDDEN PACKAGE ' + s.packages + '/10', p.x, p.y);
        p.cash += 250;
      } else if (q.type === 'ammo') {
        p.ammo += q.value;
        addText('AMMO +' + q.value, p.x, p.y);
      } else if (q.type === 'health') {
        p.health = Math.min(100, p.health + 35);
        p.armour = Math.min(100, p.armour + 20);
        addText('HEALTH + ARMOUR', p.x, p.y);
      }
      if (q.type === 'package' && s.packages < 10)
        s.pickups.push({
          x: 200 + rand() * 2100,
          y: 100 + rand() * 1900,
          type: 'package',
          value: 1,
          active: true,
        });
      break;
    }
  }
  function missionStep(dt) {
    const p = s.player,
      m = missions[Math.min(s.mission, 5)];
    if (s.mission === 0 && p.car && near(p, garage, 68)) {
      p.cash += m[4];
      s.mission = 1;
      s.objective = 0;
      s.missionTime = 90;
      addText('FIRST WHEELS COMPLETE  +$500', p.x, p.y);
    } else if (s.mission === 1) {
      if (s.objective < 2 && s.missionTime > 0) {
        s.missionTime -= dt;
        if (s.missionTime <= 0) {
          s.missionTime = 90;
          if (s.objective === 1) s.objective = 0;
          addText(
            'PACKAGE WINDOW RESET — RETURN DOWNTOWN',
            p.x,
            p.y,
            '#ff7772',
          );
        }
      }
      if (s.objective === 0 && near(p, m[3], 52)) {
        s.objective = 1;
        s.missionTime = 90;
        addText('PACKAGE SECURED — 90 SECONDS', p.x, p.y);
      } else if (s.objective === 1 && near(p, m[4], 65)) {
        p.cash += m[5];
        s.mission = 2;
        s.objective = 0;
        s.wanted = Math.max(s.wanted, 2);
        s.crimeTimer = 22;
        addText('PACKAGE DELIVERED  +$900', p.x, p.y);
      }
    } else if (s.mission === 2 && s.wanted === 0) {
      p.cash += m[4];
      s.mission = 3;
      s.objective = 0;
      s.missionTime = 120;
      addText('GETAWAY DRIVER COMPLETE  +$1,200', p.x, p.y);
    } else if (s.mission === 3) {
      if (s.missionTime > 0) {
        s.missionTime -= dt;
        if (s.missionTime <= 0) {
          s.missionTime = 120;
          s.objective = 0;
          addText('FARES EXPIRED — TRY AGAIN', p.x, p.y, '#ff7772');
        }
      }
      if (!p.car || p.car.type !== 'taxi') s.objective = 0;
      else if (s.objective < 3 && near(p, taxiStops[s.objective], 70)) {
        s.objective++;
        p.cash += 250;
        addText('FARE COMPLETE  +$250', p.x, p.y);
        if (s.objective === 3) {
          p.cash += m[4];
          s.mission = 4;
          s.objective = 0;
          spawnThugs();
          addText('TAXI TROUBLE COMPLETE', p.x, p.y);
        }
      }
    } else if (s.mission === 4) {
      if (
        s.objective >= 3 &&
        !s.heistCase &&
        !p.car &&
        near(p, point(555, 895), 42)
      ) {
        s.heistCase = true;
        addText('BRIEFCASE SECURED', 555, 895);
      } else if (s.heistCase && p.car && near(p, contact, 80)) {
        p.cash += m[4];
        s.mission = 5;
        s.objective = 0;
        s.heistCase = false;
        addText('ROOFTOP DEAL COMPLETE  +$2,200', p.x, p.y);
      }
    } else if (s.mission === 5) {
      if (s.objective === 1 && s.missionTime > 0) {
        s.missionTime -= dt;
        if (s.missionTime <= 0) {
          s.objective = 0;
          s.wanted = 0;
          addText('HEIST WINDOW CLOSED — RESET', p.x, p.y, '#ff7772');
        }
      }
      if (s.objective === 0 && near(p, heistA, 70)) {
        s.objective = 1;
        p.cash += 1000;
        s.wanted = 3;
        s.crimeTimer = 25;
        s.missionTime = 150;
        addText('CASH STASH 1/2  +$1,000', p.x, p.y);
      } else if (s.objective === 1 && near(p, heistB, 70)) {
        s.objective = 2;
        p.cash += 1000;
        addText('CASH STASH 2/2  +$1,000', p.x, p.y);
      } else if (s.objective === 2 && s.wanted === 0 && near(p, hideout, 75)) {
        p.cash += m[4];
        s.mission = 6;
        s.complete = true;
        s.screen = 'complete';
        addText('THE BIG SCORE  +$4,000', p.x, p.y);
      }
    }
  }
  function goal() {
    const p = s.player;
    if (s.mission === 0) return garage;
    if (s.mission === 1)
      return s.objective === 0 ? missions[1][3] : missions[1][4];
    if (s.mission === 2) return point(1365, 895);
    if (s.mission === 3) return taxiStops[Math.min(s.objective, 2)];
    if (s.mission === 6 && p.car && p.car.type === 'taxi')
      return taxiStops[s.sideFare % taxiStops.length];
    if (s.mission === 4)
      return s.objective < 3
        ? { x: 555, y: 895 }
        : s.heistCase
          ? contact
          : { x: 555, y: 895 };
    if (s.mission === 5)
      return s.objective === 0 ? heistA : s.objective === 1 ? heistB : hideout;
    return null;
  }
  function missionData() {
    return s.mission >= 6
      ? [
          'FREE ROAM',
          'Dante',
          'Explore Port Solano, collect hidden packages, and take repeat taxi fares',
        ]
      : missions[s.mission];
  }
  function districtName() {
    const x = s.player.x,
      y = s.player.y;
    return y < 500
      ? 'OLD TOWN'
      : x < 900
        ? 'OLD TOWN'
        : x < 1500
          ? 'DOWNTOWN'
          : x > 1700 && y < 950
            ? 'MARINA'
            : y > 1450 && x < 900
              ? 'SUBURBS'
              : y > 1100 && x < 1500
                ? 'PALM PARK'
                : 'INDUSTRIAL';
  }
  function update(dt, inp) {
    if (s.screen !== 'play' || s.paused) {
      if (s.screen === 'title') {
        s.clock += dt * 20;
        for (const car of s.cars)
          if (car.traffic && !car.player) {
            car.x += Math.cos(car.a) * 48 * dt;
            car.y += Math.sin(car.a) * 48 * dt;
            if (car.x < 0 || car.x > W || car.y < 0 || car.y > H) {
              car.x = rand() * W;
              car.y = rand() * H;
            }
          }
        for (const q of s.peds) {
          q.x += Math.cos(q.a) * 10 * dt;
          q.y += Math.sin(q.a) * 10 * dt;
        }
      }
      return;
    }
    s.shake = Math.max(0, (s.shake || 0) - dt);
    s.clock += dt * 20;
    const p = s.player;
    let dx =
        (inp.down('KeyD') || inp.down('ArrowRight') ? 1 : 0) -
        (inp.down('KeyA') || inp.down('ArrowLeft') ? 1 : 0),
      dy =
        (inp.down('KeyS') || inp.down('ArrowDown') ? 1 : 0) -
        (inp.down('KeyW') || inp.down('ArrowUp') ? 1 : 0);
    if (!p.car) {
      const sp = inp.down('ShiftLeft') || inp.down('ShiftRight') ? 250 : 170;
      if (dx || dy) p.angle = Math.atan2(dy, dx);
      p.x += dx * sp * dt;
      p.y += dy * sp * dt;
      if ((dx || dy) && blocked(city, p.x, p.y, 15)) {
        p.x -= dx * sp * dt;
        p.y -= dy * sp * dt;
      }
    } else {
      const car = p.car,
        hand = inp.down('Space');
      car.a +=
        dx *
        types[car.type].turn *
        dt *
        (0.35 + Math.abs(car.speed) / types[car.type].max);
      const push = -dy * types[car.type].max;
      car.speed += (push - car.speed) * dt * (hand ? 3 : 2);
      if (hand && Math.abs(car.speed) > 100) {
        particles(
          car.x - Math.cos(car.a) * 20,
          car.y - Math.sin(car.a) * 20,
          '#a7a49c',
          1,
        );
        car.speed *= 0.992;
      }
      car.x += Math.cos(car.a) * car.speed * dt;
      car.y += Math.sin(car.a) * car.speed * dt;
      if (blocked(city, car.x, car.y, 25)) {
        car.speed *= -0.32;
        car.hp -= 13;
        s.damage++;
        s.shake = 0.2;
        particles(car.x, car.y, '#ffc36c');
        disturb(car.x, car.y);
        crime(0);
        if (car.hp <= 0) {
          particles(car.x, car.y, '#ef7048', 28);
          addText('VEHICLE DESTROYED', car.x, car.y, '#ff7657');
          p.car = null;
          p.health -= 15;
          s.damage = 0;
        }
      }
      for (const other of s.cars) {
        if (other === car || !other.hp) continue;
        if (near(car, other, 34)) {
          car.speed *= -0.35;
          car.hp -= 6;
          other.hp -= 6;
          s.damage++;
          s.shake = 0.16;
          particles(car.x, car.y, '#ffd17a', 7);
          if (other.type === 'police') {
            crime(2);
          } else if (other.driver) crime(1);
        }
      }
      for (const cop of s.police)
        if (near(car, cop, 34)) {
          car.speed *= -0.4;
          car.hp -= 8;
          s.shake = 0.18;
          crime(2);
          particles(car.x, car.y, '#ffd17a', 10);
        }
      if (car.hp <= 0) {
        particles(car.x, car.y, '#ef7048', 28);
        addText('VEHICLE DESTROYED', car.x, car.y, '#ff7657');
        p.car = null;
        p.health -= 15;
        s.damage = 0;
      }
      p.x = car.x;
      p.y = car.y;
      p.angle = car.a;
      if (Math.abs(car.speed) > 95)
        for (const q of s.peds)
          if (q.health > 0 && near(car, q, 23)) {
            q.health = 0;
            q.panic = 8;
            car.speed *= 0.78;
            crime(1);
            addText('PEDESTRIAN HIT', q.x, q.y, '#ff7772');
            particles(q.x, q.y, '#d97961', 6);
          }
    }
    if (inp.mouse?.hasMoved) {
      p.angle = Math.atan2(
        inp.mouse.y - innerHeight / 2,
        inp.mouse.x - innerWidth / 2,
      );
    }
    if (inp.down('KeyE')) {
      if (!s._e) s._e = 1;
      else s._e++;
    } else s._e = 0;
    if (s._e === 1) enterExit();
    const fire = inp.mouse?.down;
    if (fire && !s._shot) {
      if (!p.car) shoot();
      s._shot = 1;
    }
    if (!fire) s._shot = 0;
    if (inp.down('KeyF') && !s._punch) {
      if (!p.car) punch();
      s._punch = 1;
    }
    if (!inp.down('KeyF')) s._punch = 0;
    for (let ci = 0; ci < s.cars.length; ci++) {
      const car = s.cars[ci];
      if (car.traffic && !car.player) {
        let stop = false;
        const horizontal = Math.abs(Math.cos(car.a)) > 0.7;
        if (horizontal) {
          const ix = X.reduce(
            (a, b) => (Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a),
            X[0],
          );
          stop =
            Math.abs(ix - car.x) < 31 &&
            Math.abs(
              car.y -
                Y.reduce(
                  (a, b) => (Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a),
                  Y[0],
                ),
            ) <
              ROAD / 2 &&
            (Math.floor(s.clock / 7) + ci) % 2 === 0;
        } else {
          const iy = Y.reduce(
            (a, b) => (Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a),
            Y[0],
          );
          stop =
            Math.abs(iy - car.y) < 31 &&
            Math.abs(
              car.x -
                X.reduce(
                  (a, b) => (Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a),
                  X[0],
                ),
            ) <
              ROAD / 2 &&
            (Math.floor(s.clock / 7) + ci) % 2 === 0;
        }
        if (!stop) {
          const blockedAhead = s.cars.some(
            (o, oi) =>
              oi !== ci &&
              o.traffic &&
              !o.player &&
              near(
                o,
                {
                  x: car.x + Math.cos(car.a) * 34,
                  y: car.y + Math.sin(car.a) * 34,
                },
                24,
              ),
          );
          if (!blockedAhead) {
            car.x += Math.cos(car.a) * 70 * dt;
            car.y += Math.sin(car.a) * 70 * dt;
          }
        }
        if (car.x < 0 || car.x > W || car.y < 0 || car.y > H) {
          car.x = rand() * W;
          car.y = rand() * H;
        }
      }
    }
    for (const q of s.peds) {
      if (q.panic > 0) {
        q.panic -= dt;
        q.x += Math.cos(q.a) * 95 * dt;
        q.y += Math.sin(q.a) * 95 * dt;
        if (q.cash > 0) {
          s.pickups.push({
            x: q.x,
            y: q.y,
            type: 'cash',
            value: q.cash,
            active: true,
          });
          q.cash = 0;
        }
      } else {
        q.x += Math.cos(q.a) * 18 * dt;
        q.y += Math.sin(q.a) * 18 * dt;
        if (rand() < dt * 0.15) q.a += (rand() - 0.5) * 2;
      }
      if (blocked(city, q.x, q.y, 7)) {
        q.a += Math.PI * 0.6;
      }
      if (q.health <= 0) q.health = -1;
    }
    for (const b of s.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      for (const t of s.thugs)
        if (t.alive && near(b, t, 15)) {
          t.health -= 35;
          b.life = 0;
          if (t.health <= 0) {
            t.alive = false;
            if (s.mission === 4) s.objective++;
          }
          break;
        }
    }
    s.bullets = s.bullets.filter((b) => b.life > 0);
    pickup();
    const copsVisible = s.police.some(
      (c) => near(c, p, 250) && clearSight(city, c, p),
    );
    if (s.wanted > 0) {
      s.crimeTimer -= dt;
      if (s.crimeTimer <= 0 && !copsVisible) {
        s.wanted = Math.max(0, s.wanted - 1);
        s.crimeTimer = 20;
      }
    }
    const needed = s.wanted ? Math.min(5, s.wanted) : 0;
    while (s.police.length < needed) {
      s.police.push({
        x: rand() < 0.5 ? 0 : W,
        y: rand() * H,
        a: 0,
        hp: 100,
        vehicle: !!p.car,
      });
    }
    while (s.police.length > needed) s.police.pop();
    for (const cop of s.police) {
      cop.vehicle = !!p.car;
      cop.a = angle(cop, p);
      const speed = 95 + s.wanted * 28;
      cop.x += Math.cos(cop.a) * speed * dt;
      cop.y += Math.sin(cop.a) * speed * dt;
      if (near(cop, p, 29)) {
        if (p.car) {
          p.car.speed *= 0.9;
          if (Math.abs(p.car.speed) < 14 && s.wanted >= 3) s.arrest += dt;
        } else {
          s.arrest += dt;
          p.health -= 5 * dt;
        }
        if (s.arrest > 1.5) {
          s.screen = 'busted';
          p.cash = Math.max(0, p.cash - 300);
          p.car = null;
          p.x = station.x;
          p.y = station.y;
          s.wanted = 0;
          s.arrest = 0;
          addText('BUSTED  -$300', p.x, p.y, '#ff7772');
        }
      }
    }
    for (const t of s.thugs)
      if (t.alive) {
        if (near(t, p, 260)) {
          t.a = angle(t, p);
          t.x += Math.cos(t.a) * 36 * dt;
          t.y += Math.sin(t.a) * 36 * dt;
          if (near(t, p, 25)) {
            t.attack -= dt;
            if (t.attack <= 0) {
              p.health -= 8;
              p.armour = Math.max(0, p.armour - 5);
              t.attack = 0.8;
              crime(1);
            }
          }
        }
      }
    if (
      s.mission === 6 &&
      p.car &&
      p.car.type === 'taxi' &&
      near(p, taxiStops[s.sideFare % taxiStops.length], 70)
    ) {
      p.cash += 250;
      s.sideFare++;
      addText('SIDE FARE COMPLETE  +$250', p.x, p.y);
    }
    missionStep(dt);
    s.texts.forEach((t) => {
      t.y -= 20 * dt;
      t.life -= dt;
    });
    s.texts = s.texts.filter((t) => t.life > 0);
    for (const fx of s.particles) {
      fx.x += fx.vx * dt;
      fx.y += fx.vy * dt;
      fx.life -= dt;
    }
    s.particles = s.particles.filter((f) => f.life > 0);
    if (
      p.health < 100 &&
      !s.wanted &&
      !s.thugs.some((t) => near(t, p, 200) && t.alive)
    )
      p.health = Math.min(100, p.health + dt * 2);
    if (p.health <= 0) s.screen = 'wasted';
  }
  function stageComplete() {
    s.mission = 5;
    s.objective = 2;
    s.wanted = 0;
    s.player.x = contact.x;
    s.player.y = contact.y;
    s.screen = 'play';
    s.player.cash = 14450;
    missionStep(0);
  }
  function restartMission() {
    s.objective = 0;
    s.missionTime = s.mission === 1 ? 90 : 0;
    s.heistCase = false;
    s.arrest = 0;
    s.player.health = 100;
    s.wanted = s.mission === 2 ? 2 : 0;
    if (s.mission === 4) spawnThugs();
    addText('MISSION RESTARTED', s.player.x, s.player.y);
  }
  function newGame() {
    s.mission = 0;
    s.objective = 0;
    s.missionTime = 0;
    s.wanted = 0;
    s.complete = false;
    s.player.cash = 1200;
    s.player.health = 100;
    s.player.armour = 35;
    s.player.x = contact.x;
    s.player.y = contact.y;
    s.player.car = null;
    s.screen = 'play';
    s.paused = false;
  }
  return {
    s,
    city,
    update,
    enterExit,
    addText,
    goal,
    missionData,
    districtName,
    restartMission,
    newGame,
    stageComplete,
  };
}
