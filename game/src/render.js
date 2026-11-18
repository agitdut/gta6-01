// Canvas rendering for Port Solano's streets, characters, interface and screens.
import { W, H, X, Y, ROAD, BEACH, types, money } from './config.js';

const TAU = Math.PI * 2;
const districts = ['OLD TOWN', 'DOWNTOWN', 'MARINA', 'SUBURBS', 'PALM PARK', 'INDUSTRIAL'];

export function createRenderer(canvas, world) {
  const context = canvas.getContext('2d');
  const view = { width: 1, height: 1, pixelRatio: 1, zoom: 1, cameraX: 0, cameraY: 0 };

  function resize() {
    view.pixelRatio = window.devicePixelRatio || 1;
    view.width = window.innerWidth;
    view.height = window.innerHeight;
    canvas.width = Math.round(view.width * view.pixelRatio);
    canvas.height = Math.round(view.height * view.pixelRatio);
    view.zoom = Math.min(0.9, Math.max(0.56, Math.min(view.width / 1000, view.height / 650)));
  }
  window.addEventListener('resize', resize);
  resize();

  function panel(x, y, width, height, radius = 12, fill = 'rgba(8,23,29,.87)') {
    context.fillStyle = fill;
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fill();
  }
  function write(value, x, y, size = 14, color = '#f7eedb', align = 'left', weight = 700) {
    context.font = `${weight} ${size}px Arial, sans-serif`;
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }
  function line(x1, y1, x2, y2, color, width = 1) {
    context.strokeStyle = color;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }
  function drawGround() {
    const c = context;
    c.fillStyle = '#168b9b'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#d4c29d'; c.fillRect(0, 0, 2310, H);
    c.fillStyle = '#44aebe'; c.fillRect(0, BEACH - 20, 2310, 40);
    c.fillStyle = '#d8b980'; c.fillRect(0, BEACH, 2310, H - BEACH);
    c.fillStyle = '#d8c399'; c.fillRect(2310, 0, W - 2310, H);
    c.fillStyle = '#268b98'; c.fillRect(2310, 0, W - 2310, H);
    c.fillStyle = '#e0c292'; c.fillRect(2285, 770, 210, 48);
    c.fillStyle = 'rgba(238,227,194,.55)';
    for (let y = 18; y < BEACH - 10; y += 31) c.fillRect(2270 + (y % 2) * 8, y, 35, 2);
    c.fillStyle = '#c5cbbf';
    for (let y = 0; y < H; y += 18) c.fillRect(2125, y, 9, 8);

    c.fillStyle = '#d8ceb6';
    for (const roadX of X) c.fillRect(roadX - ROAD / 2 - 9, 0, ROAD + 18, H);
    for (const roadY of Y) c.fillRect(0, roadY - ROAD / 2 - 9, W, ROAD + 18);
    c.fillStyle = '#414c4c';
    for (const roadX of X) c.fillRect(roadX - ROAD / 2, 0, ROAD, H);
    for (const roadY of Y) c.fillRect(0, roadY - ROAD / 2, W, ROAD);
    c.fillStyle = 'rgba(246,220,150,.72)';
    for (const roadX of X) for (let y = 0; y < H; y += 38) c.fillRect(roadX - 1, y, 2, 18);
    for (const roadY of Y) for (let x = 0; x < W; x += 38) c.fillRect(x, roadY - 1, 18, 2);
    for (const roadX of X) for (const roadY of Y) drawCrosswalk(roadX, roadY);

    for (const block of world.city.parks) {
      if (block.zone !== 4) continue;
      c.fillStyle = '#75a584'; c.fillRect(block.x, block.y, block.w, block.h);
      c.fillStyle = '#dfc99d'; c.fillRect(block.x + 14, block.y + block.h * 0.48, block.w - 28, 6);
      c.fillStyle = 'rgba(252,242,215,.28)'; c.fillRect(block.x + block.w * 0.48, block.y + 14, 5, block.h - 28);
    }
    for (const building of world.city.buildings) drawBuilding(building);
    for (const lamp of world.city.lamps) drawLamp(lamp.x, lamp.y);
    for (const tree of world.city.trees) drawTree(tree);
    c.fillStyle = '#b77956';
    for (let y = 770; y < 850; y += 7) c.fillRect(2305, y, 180, 3);
  }
  function drawCrosswalk(x, y) {
    const c = context;
    c.fillStyle = 'rgba(245,237,211,.78)';
    for (let stripe = -4; stripe <= 4; stripe++) {
      c.fillRect(x + stripe * 10 - 2, y - ROAD / 2 + 6, 4, 23);
      c.fillRect(x + stripe * 10 - 2, y + ROAD / 2 - 29, 4, 23);
      c.fillRect(x - ROAD / 2 + 6, y + stripe * 10 - 2, 23, 4);
      c.fillRect(x + ROAD / 2 - 29, y + stripe * 10 - 2, 23, 4);
    }
    c.fillStyle = '#efc35e'; c.fillRect(x - ROAD / 2 + 6, y - ROAD / 2 + 6, 6, 6);
    c.fillStyle = '#73b58a'; c.fillRect(x + ROAD / 2 - 12, y - ROAD / 2 + 6, 6, 6);
  }
  function drawBuilding(b) {
    const c = context;
    c.fillStyle = 'rgba(43,42,37,.21)'; c.fillRect(b.x + 9, b.y + 11, b.w, b.h);
    c.fillStyle = b.color; c.fillRect(b.x, b.y, b.w, b.h);
    c.fillStyle = b.zone === 1 ? '#788f91' : '#ecd0aa'; c.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    c.fillStyle = b.zone === 1 ? '#607d87' : '#a17e68'; c.fillRect(b.x + 11, b.y + 11, b.w - 22, b.h - 22);
    if (b.zone === 1) {
      c.fillStyle = '#ded4b6';
      for (let x = b.x + 14; x < b.x + b.w - 9; x += 16)
        for (let y = b.y + 14; y < b.y + b.h - 9; y += 17) c.fillRect(x, y, 6, 7);
    } else {
      c.fillStyle = '#ddc7a2';
      for (let x = b.x + 13; x < b.x + b.w - 10; x += 22) c.fillRect(x, b.y + 12, 8, 6);
      c.fillStyle = 'rgba(57,70,66,.14)'; c.fillRect(b.x + b.w - 16, b.y + 8, 7, b.h - 16);
    }
  }
  function drawLamp(x, y) {
    const c = context;
    c.fillStyle = 'rgba(30,38,36,.25)'; c.beginPath(); c.ellipse(x + 4, y + 5, 8, 4, 0, 0, TAU); c.fill();
    c.fillStyle = '#56615b'; c.fillRect(x - 2, y - 9, 4, 19);
    c.fillStyle = '#f8d58f'; c.beginPath(); c.arc(x, y - 10, 4, 0, TAU); c.fill();
  }
  function drawTree(tree) {
    const c = context;
    c.fillStyle = 'rgba(29,57,42,.28)'; c.beginPath(); c.ellipse(tree.x + 5, tree.y + 7, tree.r, tree.r * 0.7, 0, 0, TAU); c.fill();
    c.fillStyle = tree.palm ? '#36745a' : '#397852'; c.beginPath(); c.arc(tree.x, tree.y, tree.r, 0, TAU); c.fill();
    c.fillStyle = '#6fa276'; c.beginPath(); c.arc(tree.x - 4, tree.y - 4, tree.r * 0.48, 0, TAU); c.fill();
    if (tree.palm) {
      c.strokeStyle = '#76a46f'; c.lineWidth = 2;
      for (let spoke = 0; spoke < 5; spoke++) {
        const a = (spoke * TAU) / 5;
        c.beginPath(); c.moveTo(tree.x, tree.y); c.lineTo(tree.x + Math.cos(a) * tree.r * 1.55, tree.y + Math.sin(a) * tree.r * 1.55); c.stroke();
      }
    }
  }
  function roundedRect(x, y, width, height, radius, color) {
    context.fillStyle = color; context.beginPath(); context.roundRect(x, y, width, height, radius); context.fill();
  }
  function drawCar(car) {
    const c = context;
    const spec = types[car.type] || types.sedan;
    const length = spec.len;
    c.save(); c.translate(car.x, car.y); c.rotate(car.a || 0);
    roundedRect(-length / 2 + 2, -8, length, 20, 7, 'rgba(0,0,0,.32)');
    roundedRect(-length / 2, -12, length, 24, 7, spec.color);
    roundedRect(-length * 0.18, -9, length * 0.4, 18, 5, car.type === 'police' ? '#29485b' : '#294957');
    c.fillStyle = '#f4dfa8'; c.fillRect(length / 2 - 5, -8, 4, 5); c.fillRect(length / 2 - 5, 3, 4, 5);
    c.fillStyle = '#332d32'; c.fillRect(-length * 0.28, -14, 10, 3); c.fillRect(-length * 0.28, 11, 10, 3);
    if (car.type === 'police') { c.fillStyle = '#f44952'; c.fillRect(-5, -14, 9, 4); c.fillStyle = '#66c5ed'; c.fillRect(4, -14, 8, 4); }
    if (car.hp < 55) { c.fillStyle = 'rgba(70,70,66,.4)'; c.beginPath(); c.arc(-length * 0.38, -17, 5 + Math.sin(Date.now() / 90) * 2, 0, TAU); c.fill(); }
    if (car.player) { c.strokeStyle = '#fff0a0'; c.lineWidth = 2; c.strokeRect(-length / 2 - 3, -15, length + 6, 30); }
    c.restore();
  }
  function drawPerson(person, isPlayer = false, hostile = false) {
    const c = context; c.save(); c.translate(person.x, person.y); c.rotate(person.angle || person.a || 0);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(2, 5, 9, 6, 0, 0, TAU); c.fill();
    c.fillStyle = isPlayer ? '#f5d0a0' : hostile ? '#c68666' : '#bd8261'; c.beginPath(); c.arc(0, -4, 5.5, 0, TAU); c.fill();
    c.fillStyle = isPlayer ? '#1c3542' : hostile ? '#773f3b' : person.panic ? '#d64e54' : '#405c62';
    c.beginPath(); c.ellipse(0, 4, 6, 8, 0, 0, TAU); c.fill();
    if (isPlayer) { c.fillStyle = '#f3dfb9'; c.fillRect(-5, 3, 10, 3); }
    if (hostile) { c.strokeStyle = '#ffe59a'; c.lineWidth = 2; c.beginPath(); c.moveTo(7, 3); c.lineTo(16, 0); c.stroke(); }
    c.restore();
  }
  function drawWorldEntities() {
    const s = world.s;
    for (const item of s.pickups) if (item.active) {
      const colors = { cash: '#78dc9c', package: '#f2cc66', health: '#f06f75', ammo: '#9bc9f4' };
      context.fillStyle = colors[item.type] || '#fff'; context.beginPath(); context.arc(item.x, item.y, 8 + Math.sin(Date.now() / 180) * 1.5, 0, TAU); context.fill();
      context.strokeStyle = 'rgba(12,28,31,.65)'; context.lineWidth = 2; context.stroke();
    }
    for (const car of s.cars) if (car.hp > 0) drawCar(car);
    for (const ped of s.peds) if (ped.health > 0) drawPerson(ped);
    for (const thug of s.thugs) if (thug.alive) drawPerson(thug, false, true);
    for (const cop of s.police) {
      if (cop.vehicle) drawCar({ ...cop, type: 'police', a: cop.a, hp: 100 });
      else drawPerson(cop, false, true);
    }
    for (const bullet of s.bullets) {
      context.fillStyle = '#ffe39a'; context.beginPath(); context.arc(bullet.x, bullet.y, 3, 0, TAU); context.fill();
    }
    for (const effect of s.particles) {
      context.globalAlpha = Math.max(0, effect.life * 1.7); context.fillStyle = effect.color;
      context.beginPath(); context.arc(effect.x, effect.y, 2 + effect.life * 3, 0, TAU); context.fill(); context.globalAlpha = 1;
    }
    const player = s.player;
    if (!player.car) drawPerson(player, true);
    for (const message of s.texts) {
      context.globalAlpha = Math.min(1, message.life); write(message.t, message.x, message.y, 14, message.c, 'center'); context.globalAlpha = 1;
    }
    const target = world.goal();
    if (target && s.screen === 'play') {
      context.strokeStyle = 'rgba(255,214,105,.8)'; context.lineWidth = 4; context.beginPath(); context.arc(target.x, target.y, 18 + Math.sin(Date.now() / 200) * 3, 0, TAU); context.stroke();
      context.fillStyle = '#ffd568'; context.beginPath(); context.arc(target.x, target.y, 5, 0, TAU); context.fill();
    }
  }

  function minimap() {
    const c = context, x = view.width - 198, y = 18, width = 176, height = 132;
    panel(x - 7, y - 7, width + 14, height + 14, 11);
    c.save(); c.beginPath(); c.rect(x, y, width, height); c.clip();
    c.fillStyle = '#8cc9bd'; c.fillRect(x, y, width, height);
    c.fillStyle = '#257c88'; c.fillRect(x + width * 0.9, y, width * 0.1, height);
    c.fillStyle = '#d8c59d'; c.fillRect(x + width * 0.83, y + height * 0.47, width * 0.2, 9);
    c.fillStyle = '#576c65';
    for (const roadX of X) c.fillRect(x + roadX / W * width - 2, y, 4, height);
    for (const roadY of Y) c.fillRect(x, y + roadY / H * height - 2, width, 4);
    context.globalAlpha = 0.7;
    for (const building of world.city.buildings) {
      c.fillStyle = '#ba967a'; c.fillRect(x + building.x / W * width, y + building.y / H * height, Math.max(1, building.w / W * width), Math.max(1, building.h / H * height));
    }
    context.globalAlpha = 1;
    for (const cop of world.s.police) { c.fillStyle = '#ef5961'; c.fillRect(x + cop.x / W * width - 2, y + cop.y / H * height - 2, 5, 5); }
    const target = world.goal();
    if (target) { c.fillStyle = '#ffd568'; c.beginPath(); c.arc(x + target.x / W * width, y + target.y / H * height, 4, 0, TAU); c.fill(); }
    const player = world.s.player;
    c.save(); c.translate(x + player.x / W * width, y + player.y / H * height); c.rotate(player.angle);
    c.fillStyle = '#fff2cb'; c.beginPath(); c.moveTo(5, 0); c.lineTo(-4, -3); c.lineTo(-3, 0); c.lineTo(-4, 3); c.closePath(); c.fill(); c.restore();
    c.restore();
    write('PORT SOLANO', x + width / 2, y + height + 18, 9, '#e8d6ae', 'center');
  }
  function objectiveText() {
    const s = world.s;
    if (s.mission === 0) return 'Find a car and deliver it to the garage';
    if (s.mission === 1) return s.objective === 0 ? 'Collect the package downtown' : `Deliver the package · ${Math.ceil(s.missionTime)}s`;
    if (s.mission === 2) return 'Lose the police pursuit';
    if (s.mission === 3) return `Pick up taxi fares · ${Math.min(s.objective, 3)}/3`;
    if (s.mission === 4) return s.objective < 3 ? `Defeat the rooftop crew · ${s.objective}/3` : s.heistCase ? 'Escape to your car' : 'Grab the briefcase';
    if (s.mission === 5) return s.objective < 2 ? `Collect the cash · ${s.objective}/2` : 'Lose the chase and return to the hideout';
    return s.player.car?.type === 'taxi' ? 'Take another fare around the city' : 'Explore Port Solano';
  }
  function drawHud() {
    const s = world.s, p = s.player;
    panel(18, 18, 285, 116);
    write('PORT SOLANO', 34, 42, 13, '#f7ce8c');
    write(money(p.cash), 34, 72, 24, '#fff5df');
    write(districts[Math.max(0, Math.min(5, Math.floor(p.x / W * 3) + (p.y > 960 ? 3 : 0)))] || 'PORT SOLANO', 34, 96, 10, '#9ec9c6');
    const bar = (name, value, color, y) => {
      write(name, 34, y + 3, 9, '#c3c8b8'); roundedRect(92, y - 7, 176, 9, 4, '#29383a'); roundedRect(92, y - 7, 176 * Math.max(0, Math.min(1, value / 100)), 9, 4, color);
    };
    bar('HEALTH', p.health, '#62cf89', 108);
    panel(18, 146, 400, 88, 10, 'rgba(8,23,29,.78)');
    const info = world.missionData();
    write(`MISSION ${String(Math.min(s.mission + 1, 6)).padStart(2, '0')}  ·  ${info[0]}`, 34, 169, 12, '#f7ce8c');
    write(objectiveText(), 34, 191, 14, '#fff5df', 'left', 600);
    if (s.missionTime > 0 && (s.mission === 1 || s.mission === 3 || s.mission === 5)) write(`${Math.ceil(s.missionTime)} SEC`, 398, 218, 11, '#f5bf72', 'right');
    const stars = '★'.repeat(s.wanted) + '☆'.repeat(5 - s.wanted);
    write(stars, view.width - 210, 184, 19, s.wanted ? '#ffcf62' : '#bdc4b6', 'right');
    panel(view.width - 183, view.height - 77, 165, 58, 10, 'rgba(8,23,29,.77)');
    write(p.car ? `${Math.max(0, Math.round(Math.abs(p.car.speed)))} KM/H` : `${p.ammo} ROUNDS`, view.width - 100, view.height - 53, 12, '#fff1ce', 'center');
    write(`ARMOUR ${Math.round(p.armour)}   ·   PACKAGES ${s.packages}`, view.width - 100, view.height - 32, 9, '#b4c8bd', 'center');
    minimap();
  }
  function shade() {
    const c = context, gradient = c.createRadialGradient(view.width * 0.5, view.height * 0.45, view.height * 0.18, view.width * 0.5, view.height * 0.5, view.width * 0.72);
    gradient.addColorStop(0, 'rgba(12,27,30,0)'); gradient.addColorStop(1, 'rgba(9,22,26,.35)');
    c.fillStyle = gradient; c.fillRect(0, 0, view.width, view.height);
  }
  function titleScreen() {
    const c = context;
    c.fillStyle = 'rgba(7,19,27,.46)'; c.fillRect(0, 0, view.width, view.height);
    const boxW = Math.min(570, view.width - 36), boxX = Math.max(18, (view.width - boxW) / 2);
    panel(boxX, view.height * 0.18, boxW, view.height * 0.61, 22, 'rgba(8,24,31,.91)');
    write('PORT', view.width / 2, view.height * 0.36, 22, '#f1c47f', 'center');
    write('SOLANO', view.width / 2, view.height * 0.46, Math.min(64, view.width / 10), '#fff3dc', 'center');
    line(view.width / 2 - 118, view.height * 0.49, view.width / 2 + 118, view.height * 0.49, '#e8aa65', 2);
    write('A CITY OF SUNSHINE. A LIFE OF YOUR OWN.', view.width / 2, view.height * 0.55, 12, '#a9d4ce', 'center');
    write('ENTER / SPACE  ·  CONTINUE STORY', view.width / 2, view.height * 0.65, 14, '#fff3dc', 'center');
    write('N  ·  NEW GAME', view.width / 2, view.height * 0.70, 12, '#f3c77f', 'center');
    write('WASD / ARROWS DRIVE   ·   E ENTER / EXIT   ·   M MUTE', view.width / 2, view.height * 0.755, 10, '#b4c6bd', 'center');
  }
  function modalScreen(title, subtitle, accent) {
    const width = Math.min(500, view.width - 36), x = (view.width - width) / 2, y = view.height * 0.28;
    panel(x, y, width, view.height * 0.42, 20, 'rgba(7,19,26,.94)');
    write(title, view.width / 2, y + 70, Math.min(42, width / 9), accent, 'center');
    write(subtitle, view.width / 2, y + 112, 14, '#fff1d5', 'center', 500);
    line(view.width / 2 - 95, y + 137, view.width / 2 + 95, y + 137, '#6c8f88', 1);
    write('ENTER / SPACE  ·  CONTINUE', view.width / 2, y + 177, 12, '#d5e3d7', 'center');
    write('R  ·  RESTART MISSION', view.width / 2, y + 204, 11, '#e7bb77', 'center');
  }
  function draw() {
    const c = context, s = world.s, p = s.player;
    c.setTransform(view.pixelRatio, 0, 0, view.pixelRatio, 0, 0);
    c.clearRect(0, 0, view.width, view.height);
    const focus = p.car || p;
    view.cameraX = focus.x + (p.car ? Math.cos(p.car.a) * 75 : 0);
    view.cameraY = focus.y + (p.car ? Math.sin(p.car.a) * 75 : 0);
    const jolt = s.shake ? (Math.random() - 0.5) * s.shake * 20 : 0;
    c.save();
    c.translate(view.width / 2 + jolt, view.height / 2 - jolt);
    c.scale(view.zoom, view.zoom);
    c.translate(-view.cameraX, -view.cameraY);
    drawGround();
    drawWorldEntities();
    c.restore();
    shade();
    if (s.screen === 'title') titleScreen();
    else {
      drawHud();
      if (s.paused) modalScreen('PAUSED', 'Port Solano is waiting for you.', '#f1c47f');
      else if (s.screen === 'busted') modalScreen('BUSTED', 'The city has caught up with you.', '#ff7772');
      else if (s.screen === 'wasted') modalScreen('WASTED', 'Take a breath. Port Solano is still here.', '#ff7772');
      else if (s.screen === 'complete') modalScreen('THE BIG SCORE', 'The story is complete. Free roam is yours.', '#f3ca77');
    }
  }
  return { draw, resize };
}
