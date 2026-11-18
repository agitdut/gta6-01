// Canvas artwork for the city, vehicles, characters, tactical minimap and game screens.
import { W, H, X, Y, ROAD, BEACH, types, garage } from './config.js';
function rounded(c, x, y, w, h, r) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}
function text(c, t, x, y, size, color, align) {
  c.font = '700 ' + size + 'px Arial,sans-serif';
  c.fillStyle = color || '#f7eedb';
  c.textAlign = align || 'left';
  c.fillText(t, x, y);
}
export function createRenderer(canvas, world) {
  const c = canvas.getContext('2d'),
    v = { x: 0, y: 0, z: 1, sw: 0, sh: 0, ready: false };
  function resize() {
    const d = devicePixelRatio || 1;
    canvas.width = innerWidth * d;
    canvas.height = innerHeight * d;
    v.sw = canvas.width;
    v.sh = canvas.height;
  }
  addEventListener('resize', resize);
  resize();
  function drawCar(o) {
    c.save();
    c.translate(o.x, o.y);
    c.rotate(o.a || 0);
    const ty = types[o.type] || types.sedan,
      L = ty.len;
    c.fillStyle = 'rgba(0,0,0,.32)';
    rounded(c, -L / 2 + 2, -8, L, 20, 7);
    c.fillStyle = ty.color;
    rounded(c, -L / 2, -12, L, 24, 7);
    c.fillStyle = o.type === 'police' ? '#284b65' : '#294957';
    rounded(c, -L * 0.18, -9, L * 0.4, 18, 5);
    c.fillStyle = '#f3dfa9';
    c.fillRect(L / 2 - 5, -8, 4, 5);
    c.fillRect(L / 2 - 5, 3, 4, 5);
    c.fillStyle = '#382f35';
    c.fillRect(-L * 0.28, -14, 10, 3);
    c.fillRect(-L * 0.28, 11, 10, 3);
    if (o.type === 'police') {
      c.fillStyle = '#f44952';
      c.fillRect(-5, -13, 9, 3);
      c.fillStyle = '#66c5ed';
      c.fillRect(4, -13, 8, 3);
    }
    if (o.hp < 55) {
      c.fillStyle = 'rgba(70,70,66,.45)';
      c.beginPath();
      c.arc(-L * 0.38, -17, 5 + Math.sin(Date.now() / 90) * 2, 0, 7);
      c.fill();
    }
    c.restore();
  }
  function drawCity() {
    c.fillStyle = '#dfc5a0';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#b9d7ce';
    c.fillRect(0, 0, W, BEACH);
    c.fillStyle = '#c5e1d8';
    c.fillRect(0, BEACH - 8, W, 17);
    c.fillStyle = '#d8bd91';
    c.fillRect(0, BEACH, W, 80);
    c.fillStyle = '#2b9bb2';
    c.fillRect(2310, 0, W - 2310, H);
    c.fillStyle = '#d1aa75';
    c.fillRect(2285, 770, 210, 48);
    c.fillStyle = '#9dbea8';
    for (let y = 1620; y < 1910; y += 36)
      for (let x = 60; x < 710; x += 38) {
        c.beginPath();
        c.arc(x + (((y / 36) | 0) % 2) * 13, y, 8, 0, 7);
        c.fill();
      }
    c.fillStyle = '#c3c9be';
    for (let y = 0; y < H; y += 18) c.fillRect(2125, y, 9, 8);
    c.fillStyle = '#d9ceb5';
    for (const x of X) c.fillRect(x - ROAD / 2, 0, ROAD, H);
    for (const y of Y) c.fillRect(0, y - ROAD / 2, W, ROAD);
    c.fillStyle = '#e9d7a6';
    for (const x of X)
      for (let y = 0; y < H; y += 30) c.fillRect(x - 1, y, 2, 15);
    for (const y of Y)
      for (let x = 0; x < W; x += 30) c.fillRect(x, y - 1, 15, 2);
    c.fillStyle = 'rgba(250,244,220,.86)';
    for (const xx of X)
      for (const yy of Y) {
        for (let q = -4; q <= 4; q++)
          for (let k = 0; k < 2; k++) {
            c.fillRect(xx + q * 10 - 2, yy - ROAD / 2 + 5 + k * 8, 4, 6);
            c.fillRect(xx - ROAD / 2 + 5 + k * 8, yy + q * 10 - 2, 6, 4);
          }
        c.fillStyle = '#efc35e';
        c.fillRect(xx - ROAD / 2 + 5, yy - ROAD / 2 + 5, 5, 5);
        c.fillStyle = '#74b98a';
        c.fillRect(xx - ROAD / 2 + 12, yy - ROAD / 2 + 5, 5, 5);
      }
    for (const p of world.city.parks)
      if (p.zone === 4) {
        c.fillStyle = '#76a58b';
        c.fillRect(p.x, p.y, p.w, p.h);
        c.fillStyle = '#d8c9a7';
        c.fillRect(p.x + 15, p.y + p.h * 0.48, p.w - 30, 6);
      }
    for (const b of world.city.buildings) {
      c.fillStyle = 'rgba(41,45,48,.23)';
      c.fillRect(b.x + 8, b.y + 10, b.w, b.h);
      c.fillStyle = b.color;
      c.fillRect(b.x, b.y, b.w, b.h);
      c.fillStyle = b.zone === 1 ? '#829b9c' : '#eccbab';
      c.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      c.fillStyle = b.zone === 1 ? '#608493' : '#997965';
      c.fillRect(b.x + 11, b.y + 11, b.w - 22, b.h - 22);
      if (b.zone === 1) {
        c.fillStyle = '#dbd3b5';
        for (let xx = b.x + 14; xx < b.x + b.w - 9; xx += 16)
          for (let yy = b.y + 14; yy < b.y + b.h - 9; yy += 17)
            c.fillRect(xx, yy, 6, 7);
      } else {
        c.fillStyle = '#d2c0a1';
        for (let xx = b.x + 13; xx < b.x + b.w - 10; xx += 22)
          c.fillRect(xx, b.y + 12, 8, 6);
      }
    }
    for (const t of world.city.trees) {
      c.fillStyle = 'rgba(28,58,45,.23)';
      c.beginPath();
      c.ellipse(t.x + 4, t.y + 5, t.r, t.r * 0.7, 0, 0, 7);
      c.fill();
      c.fillStyle = t.palm ? '#357b5c' : '#397853';
      c.beginPath();
      c.arc(t.x, t.y, t.r, 0, 7);
      c.fill();
      c.fillStyle = '#70a879';
      c.beginPath();
      c.arc(t.x - 4, t.y - 4, t.r * 0.48, 0, 7);
      c.fill();
    }
    c.fillStyle = '#c48c60';
    for (let y = 770; y < 850; y += 7) c.fillRect(2305, y, 180, 3);
    c.fillStyle = '#dac39a';
    c.fillRect(2290, 748, 20, 124);
    for (const y of Y)
      for (const x of X) {
        c.fillStyle = '#e0d8b8';
        c.fillRect(x - ROAD / 2 - 3, y - ROAD / 2 - 3, 22, 22);
        c.fillStyle = ((x / 100 + y / 100) | 0) % 2 ? '#6db484' : '#f0c35e';
        c.fillRect(x - ROAD / 2 + 4, y - ROAD / 2 + 4, 7, 7);
      }
  }
  function drawPerson(p, player) {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.angle || p.a || 0);
    c.fillStyle = 'rgba(0,0,0,.23)';
    c.beginPath();
    c.ellipse(2, 5, 9, 6, 0, 0, 7);
    c.fill();
    c.fillStyle = player ? '#f6d3a6' : '#bd8261';
    c.beginPath();
    c.arc(0, -4, 5.5, 0, 7);
    c.fill();
    c.fillStyle = player ? '#1b3141' : p.panic ? '#d64e54' : '#405c62';
    c.beginPath();
    c.ellipse(0, 4, 6, 8, 0, 0, 7);
    c.fill();
    if (player) {
      c.fillStyle = '#f3dfb9';
      c.fillRect(-5, 3, 10, 3);
    }
    c.restore();
  }
  function drawPlayerOutline(player) {
    const car = player.car;
    const subject = car || player;
    c.save();
    c.translate(subject.x, subject.y);
    c.beginPath();
    if (car) {
      c.rotate(car.a);
      const length = types[car.type].len;
      c.roundRect(-length / 2 - 4, -16, length + 8, 32, 9);
    } else {
      c.ellipse(0, 1, 11, 15, 0, 0, Math.PI * 2);
    }
    c.strokeStyle = 'rgba(14,27,34,.88)';
    c.lineWidth = 5;
    c.stroke();
    c.strokeStyle = '#fff3a5';
    c.lineWidth = 2.5;
    c.stroke();
    c.restore();
  }

  function drawPlayerMarker(player) {
    const subject = player.car || player;
    const x = (subject.x - v.x) * v.z;
    const y = (subject.y - v.y) * v.z - 30;
    c.fillStyle = '#132932';
    rounded(c, x - 19, y - 18, 38, 18, 6);
    text(c, 'YOU', x, y - 5, 11, '#fff3a5', 'center');
    c.fillStyle = '#fff3a5';
    c.beginPath();
    c.moveTo(x - 5, y);
    c.lineTo(x + 5, y);
    c.lineTo(x, y + 6);
    c.closePath();
    c.fill();
  }

  function drawMinimap() {
    let x = v.sw - 198,
      y = 20,
      w = 178,
      h = 134;
    c.fillStyle = 'rgba(9,24,31,.88)';
    rounded(c, x - 7, y - 7, w + 14, h + 14, 11);
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    c.fillStyle = '#8cc9bd';
    c.fillRect(x, y, w, h);
    c.fillStyle = '#247b88';
    c.fillRect(x + w * 0.88, y, 30, h);
    c.fillStyle = '#d7c69d';
    c.fillRect(x + w * 0.83, y + h * 0.47, w * 0.2, 12);
    c.fillStyle = '#536a64';
    for (const xx of X) c.fillRect(x + (xx / W) * w - 3, y, 6, h);
    for (const yy of Y) c.fillRect(x, y + (yy / H) * h - 3, w, 6);
    c.font = 'bold 7px Arial';
    c.fillStyle = 'rgba(255,241,207,.83)';
    c.textAlign = 'center';
    c.fillText('OLD TOWN', x + 36, y + 25);
    c.fillText('DOWNTOWN', x + 95, y + 44);
    c.fillText('MARINA', x + 145, y + 28);
    c.fillText('SUBURBS', x + 31, y + 105);
    c.fillText('PALM PARK', x + 92, y + 111);
    c.fillText('INDUSTRIAL', x + 141, y + 103);
    for (const b of world.city.buildings) {
      c.fillStyle = '#bd9a7f';
      c.fillRect(
        x + (b.x / W) * w,
        y + (b.y / H) * h,
        Math.max(1, (b.w / W) * w),
        Math.max(1, (b.h / H) * h),
      );
    }
    for (const cop of world.s.police) {
      c.fillStyle = '#f05a62';
      c.fillRect(x + (cop.x / W) * w - 2, y + (cop.y / H) * h - 2, 5, 5);
    }
    const goal = world.goal();
    if (goal) {
      c.fillStyle = '#ffd568';
      c.beginPath();
      c.arc(
        x + (goal.x / W) * w,
        y + (goal.y / H) * h,
        4 + Math.sin(Date.now() / 150) * 1.5,
        0,
        7,
      );
      c.fill();
    }
    const p = world.s.player;
    c.save();
    c.translate(x + (p.x / W) * w, y + (p.y / H) * h);
    c.rotate(p.angle);
    c.fillStyle = '#fff2cb';
    c.beginPath();
    c.moveTo(5, 0);
    c.lineTo(-4, -3);
    c.lineTo(-3, 0);
    c.lineTo(-4, 3);
    c.closePath();
    c.fill();
    c.restore();
    c.restore();
    c.fillStyle = '#e8d6ae';
    c.font = 'bold 9px Arial';
    c.textAlign = 'center';
    c.fillText('PORT SOLANO', x + w / 2, y + h + 17);
  }
  function drawWrappedText(t, x, y, w) {
    c.font = '14px Arial';
    c.fillStyle = '#e8e1d3';
    let words = t.split(' '),
      s = '';
    for (const q of words) {
      if (c.measureText(s + q + ' ').width > w) {
        c.fillText(s, x, y);
        s = q + ' ';
        y += 18;
      } else s += q + ' ';
    }
    c.fillText(s, x, y);
  }
  function drawHUD() {
    const s = world.s,
      p = s.player;
    c.fillStyle = 'rgba(10,22,28,.82)';
    rounded(c, 19, 18, 260, 96, 12);
    text(c, 'PORT SOLANO', 34, 42, 14, '#f7ce8c');
    text(c, 'CASH  $' + p.cash.toLocaleString(), 34, 70, 21);
    c.fillStyle = '#202e32';
    rounded(c, 34, 82, 210, 12, 6);
    c.fillStyle = '#cf6359';
    rounded(c, 34, 82, (210 * p.health) / 100, 12, 6);
    c.fillStyle = '#74b8c7';
    c.fillRect(34, 98, (210 * p.armour) / 100, 5);
    text(c, 'HP', 251, 93, 9, '#e3c1b1', 'right');
    text(c, 'AMMO ' + p.ammo, 251, 106, 9, '#bfd6df', 'right');
    c.fillStyle = 'rgba(10,22,28,.8)';
    rounded(c, v.sw / 2 - 143, 18, 286, 74, 11);
    text(
      c,
      'PORT SOLANO  •  ' + world.districtName(),
      v.sw / 2,
      43,
      13,
      '#e7cf9f',
      'center',
    );
    let hh = Math.floor(s.clock / 3600) % 24,
      mm = Math.floor(s.clock / 60) % 60;
    text(
      c,
      ('0' + hh).slice(-2) +
        ':' +
        ('0' + mm).slice(-2) +
        '  •  ' +
        s.packages +
        '/10 PACKAGES',
      v.sw / 2,
      70,
      13,
      '#fff3de',
      'center',
    );
    c.fillStyle = 'rgba(10,22,28,.8)';
    rounded(c, v.sw - 199, 174, 180, 43, 9);
    text(c, 'WANTED', v.sw - 188, 201, 12, '#e7cf9f');
    text(
      c,
      '★'.repeat(s.wanted) + '☆'.repeat(5 - s.wanted),
      v.sw - 105,
      203,
      19,
      s.wanted ? '#ffbf56' : '#a0a8a2',
    );
    const m = world.missionData();
    c.fillStyle = 'rgba(10,22,28,.87)';
    rounded(c, 19, v.sh - 139, 365, 116, 12);
    text(
      c,
      'DANTE  /  STORY  /  ' +
        (s.mission < 6
          ? ('0' + (s.mission + 1)).slice(-2) + '  ' + m[0]
          : 'FREE ROAM'),
      35,
      v.sh - 111,
      14,
      '#f6ce84',
    );
    drawWrappedText(m[2], 35, v.sh - 84, 320);
    if (s.missionTime > 0 && [1, 3, 5].includes(s.mission)) {
      text(
        c,
        'TIME  ' + Math.ceil(s.missionTime) + 's',
        342,
        v.sh - 111,
        11,
        '#ffc775',
        'right',
      );
    }
    if (world.goal()) {
      const d = Math.floor(
        Math.hypot(world.goal().x - p.x, world.goal().y - p.y),
      );
      text(c, '◆  ' + d + ' m', 35, v.sh - 36, 13, '#f0bf68');
    }
    if (p.car) {
      c.fillStyle = 'rgba(10,22,28,.8)';
      rounded(c, v.sw - 176, v.sh - 71, 157, 52, 10);
      text(
        c,
        Math.floor(Math.abs(p.car.speed) * 0.18) + ' KM/H',
        v.sw - 97,
        v.sh - 39,
        18,
        '#f4d59b',
        'center',
      );
    } else {
      const nearCar = s.cars.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 48);
      if (nearCar) {
        c.fillStyle = 'rgba(10,22,28,.8)';
        rounded(c, v.sw / 2 - 89, 106, 178, 28, 8);
        text(c, 'E  STEAL VEHICLE', v.sw / 2, 126, 12, '#f5ce86', 'center');
      }
    }
    drawControlsHint();
  }

  function drawControlsHint() {
    const x = v.sw / 2;
    const y = v.sh - 83;
    const width = Math.min(460, v.sw - 24);
    c.fillStyle = 'rgba(10,22,28,.85)';
    rounded(c, x - width / 2, y, width, 42, 8);
    c.font = '700 11px Arial,sans-serif';
    c.fillStyle = '#ecdfc7';
    c.textAlign = 'center';
    c.fillText(
      'WASD / ARROWS  MOVE OR DRIVE   •   E  ENTER / EXIT   •   SPACE  HANDBRAKE',
      x,
      y + 16,
      width - 16,
    );
    c.fillText(
      'SHIFT  SPRINT   •   F  PUNCH / CLICK  SHOOT   •   P  PAUSE   •   M  MUTE',
      x,
      y + 32,
      width - 16,
    );
  }

  function drawMenuPanel(sub, button) {
    c.fillStyle = 'rgba(5,17,23,.72)';
    c.fillRect(0, 0, v.sw, v.sh);
    let ww = Math.min(730, v.sw - 50),
      xx = (v.sw - ww) / 2;
    c.fillStyle = 'rgba(16,33,39,.96)';
    rounded(c, xx, v.sh * 0.13, ww, v.sh * 0.74, 20);
    c.strokeStyle = 'rgba(231,188,119,.7)';
    c.lineWidth = 2;
    c.strokeRect(xx + 1, v.sh * 0.13 + 1, ww - 2, v.sh * 0.74);
    text(
      c,
      'PORT SOLANO',
      v.sw / 2,
      v.sh * 0.27,
      Math.min(68, v.sw * 0.065),
      '#f3cc8d',
      'center',
    );
    text(
      c,
      'SUN, SAND, AND SIRENS — MAKE YOUR NAME.',
      v.sw / 2,
      v.sh * 0.33,
      14,
      '#e9dfca',
      'center',
    );
    c.fillStyle = '#f0c16f';
    rounded(c, v.sw / 2 - 126, v.sh * 0.4, 252, 45, 8);
    text(c, button, v.sw / 2, v.sh * 0.4 + 29, 16, '#182b31', 'center');
    c.fillStyle = '#e9e2d2';
    c.font = '14px Arial';
    c.textAlign = 'center';
    let yy = v.sh * 0.51;
    for (const line of sub) {
      c.fillText(line, v.sw / 2, yy);
      yy += 22;
    }
    c.fillStyle = '#b6c5bd';
    c.font = '12px Arial';
    c.fillText(
      'WASD / ARROWS MOVE   •   E STEAL CAR   •   SHIFT SPRINT   •   F PUNCH   •   CLICK SHOOT   •   P PAUSE',
      v.sw / 2,
      v.sh * 0.81,
    );
  }
  function draw() {
    const s = world.s,
      p = s.player,
      speed = p.car ? Math.abs(p.car.speed) : 0;
    v.z = Math.max(0.72, Math.min(1, 1 - speed / 1600));
    let vw = v.sw / v.z,
      vh = v.sh / v.z;
    const tx = Math.max(0, Math.min(W - vw, p.x - vw / 2)),
      ty = Math.max(0, Math.min(H - vh, p.y - vh / 2));
    if (!v.ready) {
      v.x = tx;
      v.y = ty;
      v.ready = true;
    } else {
      v.x += (tx - v.x) * 0.12;
      v.y += (ty - v.y) * 0.12;
    }
    if (s.shake > 0) {
      v.x += Math.sin(Date.now() * 0.07) * s.shake * 20;
      v.y += Math.cos(Date.now() * 0.09) * s.shake * 20;
    }
    c.setTransform(v.z, 0, 0, v.z, -v.x * v.z, -v.y * v.z);
    drawCity();
    for (const o of s.cars) drawCar(o);
    for (const o of s.police) {
      if (o.vehicle)
        drawCar({
          x: o.x,
          y: o.y,
          a: Math.atan2(p.y - o.y, p.x - o.x),
          type: 'police',
        });
      else {
        drawPerson(o, false);
        c.fillStyle = '#274f70';
        c.beginPath();
        c.ellipse(o.x, o.y + 4, 7, 9, 0, 0, 7);
        c.fill();
        c.fillStyle = '#d6bb76';
        c.fillRect(o.x - 3, o.y + 1, 6, 2);
      }
    }
    for (const o of s.peds) if (o.health > 0) drawPerson(o, false);
    for (const t of s.thugs)
      if (t.alive) {
        drawPerson({ ...t, a: t.a }, false);
        c.fillStyle = '#253233';
        c.fillRect(t.x - 13, t.y - 20, 26, 4);
        c.fillStyle = '#e5675d';
        c.fillRect(t.x - 13, t.y - 20, 26 * Math.max(0, t.health / 70), 4);
      }
    if (!p.car) drawPerson(p, true);
    for (const q of s.pickups)
      if (q.active) {
        c.fillStyle =
          q.type === 'package'
            ? '#51d6db'
            : q.type === 'cash'
              ? '#f1c66d'
              : q.type === 'health'
                ? '#e78c79'
                : '#a8c5ef';
        c.beginPath();
        c.arc(q.x, q.y, 7 + Math.sin(Date.now() / 170) * 1.4, 0, 7);
        c.fill();
        c.strokeStyle = '#fff1c9';
        c.stroke();
      }
    const target = world.goal();
    if (target) {
      c.strokeStyle = '#f1c575';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(target.x, target.y, 22 + Math.sin(Date.now() / 180) * 3, 0, 7);
      c.stroke();
    }
    for (const fx of s.particles) {
      c.globalAlpha = Math.max(0, fx.life * 1.8);
      c.fillStyle = fx.color;
      c.beginPath();
      c.arc(fx.x, fx.y, 2 + Math.min(4, fx.life * 5), 0, 7);
      c.fill();
      c.globalAlpha = 1;
    }
    for (const b of s.bullets) {
      c.fillStyle = '#ffe597';
      c.beginPath();
      c.arc(b.x, b.y, 3, 0, 7);
      c.fill();
    }
    for (const t of s.texts) {
      c.globalAlpha = Math.min(1, t.life);
      text(c, t.t, t.x, t.y, 17, t.c, 'center');
      c.globalAlpha = 1;
    }
    if ((s.clock / 3600) % 24 > 17) {
      c.fillStyle = 'rgba(219,120,71,.1)';
      c.fillRect(v.x, v.y, vw, vh);
    }
    const showHUD = s.screen === 'play' && !s.paused;
    if (showHUD) drawPlayerOutline(p);
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (showHUD) {
      drawPlayerMarker(p);
      drawHUD();
      drawMinimap();
      const g = world.goal();
      if (g) {
        const ax = v.sw / 2 + (g.x - p.x) * v.z,
          ay = v.sh / 2 + (g.y - p.y) * v.z;
        if (ax < 30 || ax > v.sw - 30 || ay < 30 || ay > v.sh - 30) {
          const cx = Math.max(34, Math.min(v.sw - 34, ax)),
            cy = Math.max(34, Math.min(v.sh - 34, ay));
          c.fillStyle = '#ffd16f';
          c.beginPath();
          c.moveTo(cx, cy - 10);
          c.lineTo(cx - 8, cy + 8);
          c.lineTo(cx + 8, cy + 8);
          c.closePath();
          c.fill();
        }
      }
    }
    if (s.screen === 'title')
      drawMenuPanel(
        [
          'A six-part story. A name waiting to be made.',
          'FIRST WHEELS  ·  THE PACKAGE  ·  GETAWAY DRIVER',
          'TAXI TROUBLE  ·  ROOFTOP DEAL  ·  THE BIG SCORE',
          'BEST CASH  $' + world.s.best.toLocaleString() + '  •  LOCAL SAVE',
          'ENTER / CLICK CONTINUE  •  N NEW GAME',
        ],
        'NEW GAME  /  CONTINUE',
      );
    if (s.paused)
      drawMenuPanel(
        [
          'PAUSED  •  STORY: ' + (s.mission + 1) + ' / 6',
          'P OR ESC RESUME     R RESTART MISSION     M MUTE',
          'FIRST WHEELS · THE PACKAGE · GETAWAY DRIVER · TAXI TROUBLE · ROOFTOP DEAL · THE BIG SCORE',
          'Q SAVE & QUIT     M MUTE     R RETRY MISSION',
        ],
        'RESUME',
      );
    if (s.screen === 'complete')
      drawMenuPanel(
        [
          'MISSION COMPLETE  •  THE BIG SCORE',
          'PORT SOLANO IS YOURS  •  CASH  $' + p.cash.toLocaleString(),
        ],
        'CONTINUE',
      );
    if (s.screen === 'wasted' || s.screen === 'busted')
      drawMenuPanel(
        [
          'Dante wakes up at the station. Some cash went missing.',
          'Cash: $' +
            p.cash.toLocaleString() +
            '  •  ENTER CONTINUE  /  R RETRY',
        ],
        'RETRY / CONTINUE',
      );
  }
  return { draw, resize };
}
