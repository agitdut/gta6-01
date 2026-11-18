import { BLOCK, ROAD, WIDTH, HEIGHT, PAINT, STORY, FARE } from './config.js';
import { buildCity, junction, streetPoint } from './city.js';
import { angleTo, between, clamp, distance, pick, random, turn } from './random.js';

export function vehicle(x, y, angle, color, options = {}) {
  return { x, y, angle, color, speed: 0, integrity: 100, ...options };
}

export class World {
  constructor(seed, save, sound) {
    this.next = random(seed ^ 0xa89bfd);
    this.city = buildCity(seed);
    this.sound = sound;
    this.index = clamp(save?.mission ?? 0, 0, STORY.length);
    this.cash = save?.cash ?? 0;
    this.collected = new Set(save?.collected ?? []);
    this.time = 0;
    this.heat = 0;
    this.quiet = 0;
    this.cooldown = 0;
    this.dispatch = 0;
    this.damageTimer = 0;
    this.mode = 'start';
    this.cars = [];
    this.people = [];
    this.effects = [];
    this.player = { ...junction(3, 3), angle: 0, health: 100, car: null };
    this.camera = { ...this.player };
    this.updateTrafficPopulation();
    this.prepareMission();
  }

  get actor() {
    return this.player.car ?? this.player;
  }

  get objective() {
    const mission = this.mission;
    if (mission.kind === 'marked' && !this.acquired) return this.marked;
    if (mission.pickup && !this.acquired) return junction(...mission.pickup);
    return junction(...mission.stop);
  }

  get instruction() {
    if (this.mission.kind === 'marked' && !this.acquired) return 'Get into the marked vehicle';
    if (!this.acquired) return this.mission.kind === 'chase' ? 'Meet the contact' : 'Collect the ledger';
    if (this.mission.kind === 'chase' && this.heat) return 'Lose the harbor patrol';
    if (this.mission.kind === 'marked' && this.player.car !== this.marked) return 'Return to the marked vehicle';
    return 'Reach the drop point';
  }

  snapshot() {
    return { mission: this.index, cash: this.cash, collected: [...this.collected] };
  }

  prepareMission() {
    this.mission = STORY[this.index] ?? FARE;
    this.acquired = false;
    if (this.marked) this.marked.marked = false;
    this.marked = null;
    if (this.mission.car) {
      const point = junction(...this.mission.car);
      this.marked = vehicle(point.x + 70, point.y + 20, 0, this.index === 0 ? '#e86c47' : '#ecc75e', {
        marked: true, taxi: this.index !== 0,
      });
      this.cars.push(this.marked);
    }
  }

  updateTrafficPopulation() {
    for (let i = 0; i < 49; i++) {
      const p = streetPoint(this.next);
      const pace = between(this.next, 47, 96);
      this.cars.push(vehicle(p.x, p.y, p.angle, pick(this.next, PAINT), {
        traffic: i < 38, pace, speed: i < 38 ? pace : 0,
      }));
    }
    for (let i = 0; i < 94; i++) {
      const p = streetPoint(this.next, true);
      this.people.push({
        ...p, home: { ...p }, stride: between(this.next, 11, 27),
        phase: between(this.next, 0, 6.28), outfit: pick(this.next, PAINT), down: 0,
      });
    }
  }

  walkable(x, y, radius) {
    return x > radius && x < WIDTH - radius && y > radius && y < HEIGHT - radius
      && !this.city.blocks(x, y, radius);
  }

  move(entity, dx, dy, radius) {
    if (this.walkable(entity.x + dx, entity.y, radius)) entity.x += dx;
    else dx = 0;
    if (this.walkable(entity.x, entity.y + dy, radius)) entity.y += dy;
    else dy = 0;
    return Math.hypot(dx, dy);
  }

  raiseHeat(amount) {
    if (!this.heat) this.sound.play('heat');
    this.heat = clamp(Math.max(this.heat, amount), 0, 5);
    this.quiet = 0;
  }

  interact() {
    const player = this.player;
    if (player.car) {
      const car = player.car;
      if (Math.abs(car.speed) > 60) return;
      for (const side of [1, -1]) {
        const x = car.x - Math.sin(car.angle) * 24 * side;
        const y = car.y + Math.cos(car.angle) * 24 * side;
        if (this.walkable(x, y, 7)) {
          car.speed = 0;
          player.x = x;
          player.y = y;
          player.angle = car.angle;
          player.car = null;
          return;
        }
      }
      return;
    }
    const nearest = this.nearCar();
    if (!nearest) return;
    nearest.traffic = false;
    player.car = nearest;
    if (nearest === this.marked) this.acquired = true;
    else this.raiseHeat(1);
  }

  nearCar() {
    let best = null;
    let gap = 39;
    for (const car of this.cars) {
      if (car.police || car.integrity <= 0 || Math.abs(car.speed) > 60) continue;
      const d = distance(this.player, car);
      if (d < gap) {
        best = car;
        gap = d;
      }
    }
    return best;
  }

  drive(dt, input, throttle, steer) {
    const car = this.player.car;
    const braking = input.down('Space');
    const acceleration = throttle > 0 ? 185 : 240;
    car.speed = clamp(car.speed + throttle * acceleration * dt, -78, 255);
    car.speed *= Math.exp(-dt * (braking ? 5 : throttle ? 0.4 : 1.7));
    car.angle += steer * Math.sign(car.speed) * clamp(Math.abs(car.speed) / 40, 0, 1) * (braking ? 3.4 : 2.25) * dt;
    const step = car.speed * dt;
    const traveled = this.move(car, Math.cos(car.angle) * step, Math.sin(car.angle) * step, 13);
    if (traveled < Math.abs(step) * 0.46 && Math.abs(car.speed) > 25) {
      this.impact(car, Math.abs(car.speed) * 0.13);
    }
    for (const other of this.cars) {
      if (other === car || distance(other, car) > 25) continue;
      if (Math.abs(car.speed) > 40 && this.damageTimer <= 0) {
        this.impact(car, 8 + Math.abs(car.speed) * 0.04);
        if (other.police) this.raiseHeat(3);
      }
    }
    if (Math.abs(car.speed) > 80) {
      for (const person of this.people) {
        if (person.down || distance(person, car) > 17) continue;
        person.down = 6;
        this.raiseHeat(2);
        car.speed *= 0.8;
      }
    }
  }

  impact(car, damage) {
    car.speed *= -0.23;
    car.integrity -= damage;
    this.damageTimer = 0.34;
    this.sound.play('impact');
    this.effects.push({ kind: 'spark', x: car.x, y: car.y, ttl: 0.3 });
    if (car.integrity <= 0) this.end(false, 'Vehicle wrecked');
  }

  walk(dt, input, forward, side, aim) {
    const player = this.player;
    if (forward || side) {
      const length = Math.hypot(forward, side);
      const speed = input.down('ShiftLeft', 'ShiftRight') ? 157 : 108;
      this.move(player, speed * dt * side / length, -speed * dt * forward / length, 7);
      player.angle = Math.atan2(-forward, side);
    }
    if (aim) player.angle = angleTo(player, aim);
    if (input.hit('KeyF') && this.cooldown <= 0) this.attack(26, false);
    else if (input.pointer.down && this.cooldown <= 0) this.attack(170, true);
  }

  attack(range, ranged) {
    const actor = this.player;
    this.cooldown = ranged ? 0.27 : 0.4;
    let end = range;
    for (let d = 10; d < range; d += 8) {
      if (!this.walkable(actor.x + Math.cos(actor.angle) * d, actor.y + Math.sin(actor.angle) * d, 2)) {
        end = d;
        break;
      }
    }
    let target;
    let best = end + 2;
    for (const item of [...this.people, ...this.cars.filter(car => car.police)]) {
      if (item.down || item.integrity <= 0) continue;
      const d = distance(item, actor);
      const cone = Math.abs(turn(actor.angle, angleTo(actor, item)));
      if (d < best && cone < (ranged ? Math.atan2(12, d) : 1.5)) {
        best = d;
        target = item;
      }
    }
    if (target?.police) target.integrity -= ranged ? 34 : 14;
    else if (target) target.down = 7;
    if (ranged) {
      this.effects.push({ kind: 'trace', x: actor.x, y: actor.y, angle: actor.angle, length: Math.min(end, best), ttl: 0.09 });
      this.sound.play('fire');
      this.raiseHeat(target?.police ? 3 : 2);
    } else if (target) {
      this.sound.play('impact');
      this.raiseHeat(1);
    }
  }

  updateStreet(dt) {
    for (const car of this.cars) {
      if (!car.traffic) continue;
      const pace = this.cars.some(other => other !== car && distance(other, car) < 35 &&
        Math.abs(turn(car.angle, angleTo(car, other))) < 0.35) ? 0 : car.pace;
      car.speed += (pace - car.speed) * Math.min(1, dt * 3);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (car.x < -30) car.x = WIDTH + 25;
      if (car.y < -30) car.y = HEIGHT + 25;
      if (car.x > WIDTH + 30) car.x = -25;
      if (car.y > HEIGHT + 30) car.y = -25;
    }
    for (const person of this.people) {
      person.down = Math.max(0, person.down - dt);
      if (person.down) continue;
      const offset = Math.sin(this.time * 0.41 + person.phase) * person.stride * 2;
      const x = person.home.x + (person.horizontal ? offset : 0);
      const y = person.home.y + (person.horizontal ? 0 : offset);
      if (this.walkable(x, y, 5)) {
        person.angle = angleTo(person, { x, y });
        person.x = x;
        person.y = y;
      }
    }
  }

  spawnPatrol() {
    const actor = this.actor;
    const candidates = [];
    for (let y = ROAD / 2; y < HEIGHT; y += BLOCK) {
      for (let x = ROAD / 2; x < WIDTH; x += BLOCK) {
        const d = distance(actor, { x, y });
        if (d > 285 && d < 570) candidates.push({ x, y });
      }
    }
    if (!candidates.length) return;
    const point = pick(this.next, candidates);
    this.cars.push(vehicle(point.x, point.y, angleTo(point, actor), '#e7e6da', { police: true, speed: 100 }));
  }

  pursue(car, dt) {
    const actor = this.actor;
    const direct = angleTo(car, actor);
    const headings = [direct, direct - 0.65, direct + 0.65, direct - 1.35, direct + 1.35, direct + Math.PI];
    const safe = headings.find(a => [24, 46, 70].every(r =>
      this.walkable(car.x + Math.cos(a) * r, car.y + Math.sin(a) * r, 13)));
    const desired = safe ?? direct + Math.PI;
    car.angle += clamp(turn(car.angle, desired), -3.8 * dt, 3.8 * dt);
    const gap = distance(car, actor);
    car.speed = gap < 31 ? 0 : 116 + this.heat * 13;
    const step = car.speed * dt;
    this.move(car, Math.cos(car.angle) * step, Math.sin(car.angle) * step, 12);
    if (gap < 36 && this.damageTimer <= 0) {
      this.damageTimer = 0.6;
      this.player.health -= this.player.car ? 6 : 13;
      this.sound.play('impact');
      if (this.player.health <= 0) this.end(false, 'Harbor patrol caught you');
    }
    return gap < 210;
  }

  updatePolice(dt) {
    this.cars = this.cars.filter(car => !car.police || car.integrity > 0 && (this.heat || distance(car, this.actor) < 300));
    if (!this.heat) {
      for (const car of this.cars) if (car.police) car.speed = 0;
      return;
    }
    const police = this.cars.filter(car => car.police);
    this.dispatch -= dt;
    if (police.filter(car => distance(car, this.actor) < 620).length < this.heat + 1 && this.dispatch <= 0) {
      this.cars = this.cars.filter(car => !car.police || distance(car, this.actor) < 760);
      this.spawnPatrol();
      this.dispatch = 3.4;
    }
    let seen = false;
    for (const car of police) seen = this.pursue(car, dt) || seen;
    this.quiet = seen ? 0 : this.quiet + dt;
    if (this.quiet > 6.5) {
      this.heat--;
      this.quiet = 0;
    }
  }

  updateMission() {
    const actor = this.actor;
    for (const parcel of this.city.packages) {
      if (!this.collected.has(parcel.id) && distance(actor, parcel) < 15) {
        this.collected.add(parcel.id);
        this.cash += 75;
        this.sound.play('reward');
      }
    }
    if (distance(actor, this.objective) > 33) return;
    if (this.mission.kind === 'marked' && this.player.car !== this.marked) return;
    if (!this.acquired) {
      if (this.mission.kind === 'marked') return;
      this.acquired = true;
      if (this.mission.kind === 'chase') this.raiseHeat(3);
      else this.sound.play('reward');
      return;
    }
    if (this.mission.kind === 'chase' && this.heat) return;
    this.end(true);
  }

  end(success, reason = '') {
    if (this.mode !== 'play') return;
    this.result = { success, title: this.mission.title, reward: success ? this.mission.reward : 0, reason };
    this.mode = 'end';
    if (success) {
      this.cash += this.result.reward;
      this.index = Math.min(this.index + 1, STORY.length);
      this.sound.play('reward');
    }
  }

  step(dt, input, aim) {
    this.time += dt;
    this.cooldown -= dt;
    this.damageTimer -= dt;
    if (input.hit('KeyE')) this.interact();
    const forward = input.axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']);
    const side = input.axis(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']);
    if (this.player.car) this.drive(dt, input, forward, side);
    else this.walk(dt, input, forward, side, aim);
    this.updateStreet(dt);
    if (this.mode === 'play') this.updatePolice(dt);
    if (this.mode === 'play') this.updateMission();
    for (const effect of this.effects) effect.ttl -= dt;
    this.effects = this.effects.filter(effect => effect.ttl > 0);
    const actor = this.actor;
    const easing = 1 - Math.exp(-dt * 7);
    this.camera.x += (actor.x - this.camera.x) * easing;
    this.camera.y += (actor.y - this.camera.y) * easing;
    this.sound.engine(this.player.car?.speed ?? 0);
  }
}
