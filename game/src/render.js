import { W, H, X, Y, ROAD, BEACH, types, money, districts, clamp } from './config.js';

const TAU = Math.PI * 2;
const pickupColor = { cash: '#78dc9c', package: '#f2cc66', health: '#f06f75', ammo: '#9bc9f4' };
const results = {
  paused: ['PAUSED', 'Port Solano is waiting for you.', '#f1c47f'],
  busted: ['BUSTED', 'The city has caught up with you.', '#ff7772'],
  wasted: ['WASTED', 'Take a breath. Port Solano is still here.', '#ff7772'],
  complete: ['THE BIG SCORE', 'The story is complete. Free roam is yours.', '#f3ca77'],
};

function objective(s) {
  switch (s.mission) {
    case 0: return 'Find a car and deliver it to the garage';
    case 1: return s.objective ? 'Deliver the package · ' + Math.ceil(s.missionTime) + 's' : 'Collect the package downtown';
    case 2: return 'Lose the police pursuit';
    case 3: return 'Pick up taxi fares · ' + Math.min(s.objective, 3) + '/3';
    case 4:
      if (s.objective < 3) return 'Defeat the rooftop crew · ' + s.objective + '/3';
      return s.heistCase ? 'Escape to your car' : 'Grab the briefcase';
    case 5: return s.objective < 2 ? 'Collect the cash · ' + s.objective + '/2' : 'Lose the chase and return to the hideout';
    default: return s.player.car?.type === 'taxi' ? 'Take another fare around the city' : 'Explore Port Solano';
  }
}

export function createRenderer(canvas, world) {
  const ctx = canvas.getContext('2d');
  let width, height, dpr, zoom, time;
  const { s, city } = world;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = window.devicePixelRatio || 1;
    zoom = clamp(Math.min(width / 1000, height / 650), 0.56, 0.9);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  function rect(color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }
  function round(color, x, y, w, h, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = color;
    ctx.fill();
  }
  function box(x, y, w, h, radius = 12, color = 'rgba(8,23,29,.87)') {
    round(color, x, y, w, h, radius);
  }
  function oval(color, x, y, rx, ry = rx) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
  }
  function stroke(color, thickness) {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.stroke();
  }
  function segment(color, x, y, endX, endY, thickness = 1) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    stroke(color, thickness);
  }
  function text(value, x, y, size, color, align = 'left', weight = 700, maxWidth) {
    ctx.font = weight + ' ' + size + 'px Arial, sans-serif';
    ctx.textAlign = align;
    ctx.fillStyle = color;
    if (maxWidth === undefined) ctx.fillText(value, x, y);
    else ctx.fillText(value, x, y, maxWidth);
  }

  function roadbed(color, span) {
    for (const x of X) rect(color, x - span / 2, 0, span, H);
    for (const y of Y) rect(color, 0, y - span / 2, W, span);
  }

  function crossing(x, y) {
    const half = ROAD / 2;
    const stripe = 'rgba(245,237,211,.78)';
    for (let offset = -40; offset <= 40; offset += 10) {
      for (const edge of [-half + 6, half - 29]) {
        rect(stripe, x + offset - 2, y + edge, 4, 23);
        rect(stripe, x + edge, y + offset - 2, 23, 4);
      }
    }
    rect('#efc35e', x - half + 6, y - half + 6, 6, 6);
    rect('#73b58a', x + half - 12, y - half + 6, 6, 6);
  }

  function roof({ x, y, w, h, color, zone }) {
    const downtown = zone === 1;
    rect('rgba(43,42,37,.21)', x + 9, y + 11, w, h);
    rect(color, x, y, w, h);
    rect(downtown ? '#788f91' : '#ecd0aa', x + 6, y + 6, w - 12, h - 12);
    rect(downtown ? '#607d87' : '#a17e68', x + 11, y + 11, w - 22, h - 22);
    if (downtown) {
      for (let dx = 14; dx < w - 9; dx += 16)
        for (let dy = 14; dy < h - 9; dy += 17) rect('#ded4b6', x + dx, y + dy, 6, 7);
    } else {
      for (let dx = 13; dx < w - 10; dx += 22) rect('#ddc7a2', x + dx, y + 12, 8, 6);
      rect('rgba(57,70,66,.14)', x + w - 16, y + 8, 7, h - 16);
    }
  }

  function tree({ x, y, r, palm }) {
    oval('rgba(29,57,42,.28)', x + 5, y + 7, r, r * 0.7);
    oval(palm ? '#36745a' : '#397852', x, y, r);
    oval('#6fa276', x - 4, y - 4, r * 0.48);
    if (!palm) return;
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5;
      segment('#76a46f', x, y, x + Math.cos(a) * r * 1.55, y + Math.sin(a) * r * 1.55, 2);
    }
  }

  function streets() {
    rect('#268b98', 2310, 0, W - 2310, H);
    rect('#d4c29d', 0, 0, 2310, H);
    rect('#44aebe', 0, BEACH - 20, 2310, 40);
    rect('#d8b980', 0, BEACH, 2310, H - BEACH);
    rect('#e0c292', 2285, 770, 210, 48);
    for (let y = 18; y < BEACH - 10; y += 31) rect('rgba(238,227,194,.55)', 2270 + (y % 2) * 8, y, 35, 2);
    for (let y = 0; y < H; y += 18) rect('#c5cbbf', 2125, y, 9, 8);

    roadbed('#d8ceb6', ROAD + 18);
    roadbed('#414c4c', ROAD);
    const lane = 'rgba(246,220,150,.72)';
    for (const x of X)
      for (let y = 0; y < H; y += 38) rect(lane, x - 1, y, 2, 18);
    for (const y of Y)
      for (let x = 0; x < W; x += 38) rect(lane, x, y - 1, 18, 2);
    for (const x of X)
      for (const y of Y) crossing(x, y);

    for (const { x, y, w, h, zone } of city.parks) {
      if (zone !== 4) continue;
      rect('#75a584', x, y, w, h);
      rect('#dfc99d', x + 14, y + h * 0.48, w - 28, 6);
      rect('rgba(252,242,215,.28)', x + w * 0.48, y + 14, 5, h - 28);
    }
    city.buildings.forEach(roof);
    for (const { x, y } of city.lamps) {
      oval('rgba(30,38,36,.25)', x + 4, y + 5, 8, 4);
      rect('#56615b', x - 2, y - 9, 4, 19);
      oval('#f8d58f', x, y - 10, 4);
    }
    city.trees.forEach(tree);
    for (let y = 770; y < 850; y += 7) rect('#b77956', 2305, y, 180, 3);
  }

  function vehicle(car) {
    const spec = types[car.type] ?? types.sedan;
    const l = spec.len;
    const police = car.type === 'police';
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.a || 0);
    round('rgba(0,0,0,.32)', -l / 2 + 2, -8, l, 20, 7);
    round(spec.color, -l / 2, -12, l, 24, 7);
    round(police ? '#29485b' : '#294957', -l * 0.18, -9, l * 0.4, 18, 5);
    for (const y of [-8, 3]) rect('#f4dfa8', l / 2 - 5, y, 4, 5);
    for (const y of [-14, 11]) rect('#332d32', -l * 0.28, y, 10, 3);
    if (police) {
      rect('#f44952', -5, -14, 9, 4);
      rect('#66c5ed', 4, -14, 8, 4);
    }
    if (car.hp < 55) oval('rgba(70,70,66,.4)', -l * 0.38, -17, 5 + Math.sin(time / 90) * 2);
    if (car.player) {
      ctx.beginPath();
      ctx.rect(-l / 2 - 3, -15, l + 6, 30);
      stroke('#fff0a0', 2);
    }
    ctx.restore();
  }

  function person(p, role = 'civilian') {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle || p.a || 0);
    const player = role === 'player';
    const hostile = role === 'hostile';
    oval('rgba(0,0,0,.25)', 2, 5, 9, 6);
    oval(player ? '#f5d0a0' : hostile ? '#c68666' : '#bd8261', 0, -4, 5.5);
    oval(player ? '#1c3542' : hostile ? '#773f3b' : p.panic ? '#d64e54' : '#405c62', 0, 4, 6, 8);
    if (player) rect('#f3dfb9', -5, 3, 10, 3);
    if (hostile) segment('#ffe59a', 7, 3, 16, 0, 2);
    ctx.restore();
  }

  function actors(target) {
    for (const item of s.pickups) {
      if (!item.active) continue;
      oval(pickupColor[item.type] ?? '#fff', item.x, item.y, 8 + Math.sin(time / 180) * 1.5);
      stroke('rgba(12,28,31,.65)', 2);
    }
    for (const car of s.cars) if (car.hp > 0) vehicle(car);
    for (const ped of s.peds) if (ped.health > 0) person(ped);
    for (const thug of s.thugs) if (thug.alive) person(thug, 'hostile');
    for (const cop of s.police) {
      if (cop.vehicle) vehicle({ ...cop, type: 'police', hp: 100 });
      else person(cop, 'hostile');
    }
    for (const { x, y } of s.bullets) oval('#ffe39a', x, y, 3);
    for (const { x, y, life, color } of s.particles) {
      ctx.globalAlpha = Math.max(0, life * 1.7);
      oval(color, x, y, 2 + life * 3);
    }
    ctx.globalAlpha = 1;
    if (!s.player.car) person(s.player, 'player');
    for (const { t, x, y, life, c } of s.texts) {
      ctx.globalAlpha = Math.min(1, life);
      text(t, x, y, 14, c, 'center');
    }
    ctx.globalAlpha = 1;
    if (target && s.screen === 'play') {
      ctx.beginPath();
      ctx.arc(target.x, target.y, 18 + Math.sin(time / 200) * 3, 0, TAU);
      stroke('rgba(255,214,105,.8)', 4);
      oval('#ffd568', target.x, target.y, 5);
    }
  }

  function map(target) {
    const w = 176, h = 132, x = width - 198, y = 18;
    const mapX = (value) => x + value * w / W;
    const mapY = (value) => y + value * h / H;
    box(x - 7, y - 7, w + 14, h + 14, 11);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    rect('#8cc9bd', x, y, w, h);
    rect('#257c88', x + w * 0.9, y, w * 0.1, h);
    rect('#d8c59d', x + w * 0.83, y + h * 0.47, w * 0.2, 9);
    for (const road of X) rect('#576c65', mapX(road) - 2, y, 4, h);
    for (const road of Y) rect('#576c65', x, mapY(road) - 2, w, 4);
    ctx.globalAlpha = 0.7;
    for (const b of city.buildings) {
      rect('#ba967a', mapX(b.x), mapY(b.y), Math.max(1, b.w * w / W), Math.max(1, b.h * h / H));
    }
    ctx.globalAlpha = 1;
    for (const cop of s.police) rect('#ef5961', mapX(cop.x) - 2, mapY(cop.y) - 2, 5, 5);
    if (target) oval('#ffd568', mapX(target.x), mapY(target.y), 4);
    ctx.translate(mapX(s.player.x), mapY(s.player.y));
    ctx.rotate(s.player.angle);
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-4, -3);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-4, 3);
    ctx.closePath();
    ctx.fillStyle = '#fff2cb';
    ctx.fill();
    ctx.restore();
    text('PORT SOLANO', x + w / 2, y + h + 18, 9, '#e8d6ae', 'center');
  }

  function hud(target) {
    const p = s.player;
    box(18, 18, 285, 116);
    text('PORT SOLANO', 34, 42, 13, '#f7ce8c');
    text(money(p.cash), 34, 72, 24, '#fff5df');
    const zone = clamp(Math.floor(p.x * 3 / W) + (p.y > 960 ? 3 : 0), 0, 5);
    text(districts[zone] ?? 'PORT SOLANO', 34, 96, 10, '#9ec9c6');
    text('HEALTH', 34, 111, 9, '#c3c8b8');
    round('#29383a', 92, 101, 176, 9, 4);
    round('#62cf89', 92, 101, 176 * clamp(p.health / 100, 0, 1), 9, 4);

    box(18, 146, 400, 88, 10, 'rgba(8,23,29,.78)');
    const mission = String(Math.min(s.mission + 1, 6)).padStart(2, '0');
    text('MISSION ' + mission + '  ·  ' + world.missionData()[0], 34, 169, 12, '#f7ce8c');
    text(objective(s), 34, 191, 14, '#fff5df', 'left', 600, 368);
    if (s.missionTime > 0 && [1, 3, 5].includes(s.mission)) {
      text(Math.ceil(s.missionTime) + ' SEC', 398, 218, 11, '#f5bf72', 'right');
    }
    const stars = '★'.repeat(s.wanted) + '☆'.repeat(5 - s.wanted);
    text(stars, width - 210, 184, 19, s.wanted ? '#ffcf62' : '#bdc4b6', 'right');

    box(width - 183, height - 77, 165, 58, 10, 'rgba(8,23,29,.77)');
    const instrument = p.car ? Math.round(Math.abs(p.car.speed)) + ' KM/H' : p.ammo + ' ROUNDS';
    text(instrument, width - 100, height - 53, 12, '#fff1ce', 'center');
    text('ARMOUR ' + Math.round(p.armour) + '   ·   PACKAGES ' + s.packages, width - 100, height - 32, 9, '#b4c8bd', 'center');
    map(target);
  }

  function title() {
    const x = width / 2;
    const panel = Math.min(570, width - 36);
    rect('rgba(7,19,27,.46)', 0, 0, width, height);
    box((width - panel) / 2, height * 0.18, panel, height * 0.61, 22, 'rgba(8,24,31,.91)');
    text('PORT', x, height * 0.36, 22, '#f1c47f', 'center');
    text('SOLANO', x, height * 0.46, Math.min(64, width / 10), '#fff3dc', 'center');
    segment('#e8aa65', x - 118, height * 0.49, x + 118, height * 0.49, 2);
    text('A CITY OF SUNSHINE. A LIFE OF YOUR OWN.', x, height * 0.55, 12, '#a9d4ce', 'center');
    text('ENTER / SPACE  ·  CONTINUE STORY', x, height * 0.65, 14, '#fff3dc', 'center');
    text('N  ·  NEW GAME', x, height * 0.70, 12, '#f3c77f', 'center');
    text('WASD / ARROWS DRIVE   ·   E ENTER / EXIT   ·   M MUTE', x, height * 0.755, 10, '#b4c6bd', 'center');
  }

  function modal([heading, message, accent]) {
    const x = width / 2, y = height * 0.28, panel = Math.min(500, width - 36);
    box(x - panel / 2, y, panel, height * 0.42, 20, 'rgba(7,19,26,.94)');
    text(heading, x, y + 70, Math.min(42, panel / 9), accent, 'center');
    text(message, x, y + 112, 14, '#fff1d5', 'center', 500);
    segment('#6c8f88', x - 95, y + 137, x + 95, y + 137);
    text('ENTER / SPACE  ·  CONTINUE', x, y + 177, 12, '#d5e3d7', 'center');
    text('R  ·  RESTART MISSION', x, y + 204, 11, '#e7bb77', 'center');
  }

  function draw() {
    time = Date.now();
    const target = world.goal();
    const car = s.player.car;
    const focus = car ?? s.player;
    const lead = car ? 75 : 0;
    const jolt = s.shake ? (Math.random() - 0.5) * s.shake * 20 : 0;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2 + jolt, height / 2 - jolt);
    ctx.scale(zoom, zoom);
    ctx.translate(-focus.x - lead * Math.cos(focus.a || 0), -focus.y - lead * Math.sin(focus.a || 0));
    streets();
    actors(target);
    ctx.restore();

    const gradient = ctx.createRadialGradient(width / 2, height * 0.45, height * 0.18, width / 2, height / 2, width * 0.72);
    gradient.addColorStop(0, 'rgba(12,27,30,0)');
    gradient.addColorStop(1, 'rgba(9,22,26,.35)');
    rect(gradient, 0, 0, width, height);
    if (s.screen === 'title') {
      title();
    } else {
      hud(target);
      const overlay = results[s.paused ? 'paused' : s.screen];
      if (overlay) modal(overlay);
    }
  }

  return { draw, resize };
}
