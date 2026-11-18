import { BLOCK, ROAD, WIDTH, HEIGHT, STORY } from './config.js';
import { clamp, distance } from './random.js';

const ink = '#121f28';
const white = '#fff1da';
const coral = '#ff8562';
const mint = '#95dacf';
const gold = '#ffd180';

function rect(g, color, x, y, w, h) {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
}

function circle(g, color, x, y, radius) {
  g.beginPath();
  g.arc(x, y, radius, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
}

function line(g, color, width, x, y, toX, toY) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(toX, toY);
  g.stroke();
}

function label(g, value, x, y, options = {}) {
  const { size = 13, color = white, weight = 700, font = 'system-ui', align = 'left' } = options;
  g.font = weight + ' ' + size + 'px ' + font;
  g.textAlign = align;
  g.textBaseline = 'top';
  g.fillStyle = color;
  g.fillText(value, x, y);
}

function wrap(g, value, x, y, width) {
  g.font = '500 14px system-ui';
  let row = '';
  for (const word of value.split(' ')) {
    const next = row ? row + ' ' + word : word;
    if (row && g.measureText(next).width > width) {
      label(g, row, x, y, { size: 14, weight: 500, color: '#cee0da' });
      row = word;
      y += 20;
    } else row = next;
  }
  label(g, row, x, y, { size: 14, weight: 500, color: '#cee0da' });
}

function roadSurface(g, box) {
  rect(g, '#777477', 0, 0, WIDTH, HEIGHT);
  const firstX = Math.max(0, Math.floor(box.x / BLOCK));
  const firstY = Math.max(0, Math.floor(box.y / BLOCK));
  const lastX = Math.min(10, Math.ceil(box.right / BLOCK));
  const lastY = Math.min(8, Math.ceil(box.bottom / BLOCK));
  for (let i = firstX; i <= lastX; i++) {
    const x = i * BLOCK;
    rect(g, '#706b70', x + 3, Math.max(0, box.y), 62, Math.min(HEIGHT, box.bottom) - Math.max(0, box.y));
    for (let j = firstY; j <= lastY; j++) {
      const y = j * BLOCK;
      if (i < 10) {
        for (let dx = 91; dx < BLOCK - 19; dx += 27) {
          rect(g, '#ceb792', x + dx, y + 33, 12, 1.5);
        }
        for (let k = 0; k < 8; k++) {
          rect(g, '#bdada1', x + ROAD + 2, y + 10 + 6 * k, 11, 3);
          rect(g, '#bdada1', x + BLOCK - 13, y + 10 + 6 * k, 11, 3);
        }
      }
      if (j < 8) {
        for (let dy = 92; dy < BLOCK - 19; dy += 27) {
          rect(g, '#ceb792', x + 33, y + dy, 1.5, 12);
        }
        for (let k = 0; k < 8; k++) {
          rect(g, '#bdada1', x + 10 + 6 * k, y + ROAD + 2, 3, 11);
          rect(g, '#bdada1', x + 10 + 6 * k, y + BLOCK - 13, 3, 11);
        }
      }
    }
  }
}

function building(g, b) {
  const { x, y, w, h, height, roof } = b;
  const sx = height * 0.66;
  const sy = height * 0.71;
  rect(g, '#5b474c50', x + sx, y + sy, w + 6, h + 3);
  g.fillStyle = '#966860';
  g.beginPath();
  g.moveTo(x + w, y);
  g.lineTo(x + w + sx, y + sy);
  g.lineTo(x + w + sx, y + h + sy);
  g.lineTo(x + w, y + h);
  g.fill();
  g.fillStyle = '#b27964';
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x + w, y + h);
  g.lineTo(x + w + sx, y + h + sy);
  g.lineTo(x + sx, y + h + sy);
  g.fill();
  rect(g, '#735655', x - 1, y - 1, w + 2, h + 2);
  rect(g, roof, x, y, w, h);
  rect(g, '#fff0c880', x + 2, y + 2, w - 4, 2);
  rect(g, '#fff0c860', x + 2, y + 2, 2, h - 4);
  rect(g, '#35414931', x + 5, y + 7, w - 10, h - 12);
  if (h > 35) {
    rect(g, '#3f555c66', x + w * 0.51, y + 16, 14, 12);
    rect(g, '#ced4b8', x + w * 0.51 - 3, y + 13, 14, 10);
    for (let i = 0; i < 3; i++) {
      line(g, '#879797', 0.8, x + w * 0.51, y + 15 + i * 2, x + w * 0.51 + 7, y + 15 + i * 2);
    }
    if (b.striped) {
      for (let i = 2; i < w - 3; i += 6) {
        rect(g, i % 12 === 2 ? '#d45d51' : '#f0dabc', x + i, y + h - 2, 6, 8);
      }
    }
  } else {
    label(g, b.sign, x + w / 2, y + 6, { size: 7, color: '#483f42', align: 'center' });
  }
}

function palm(g, p) {
  g.save();
  g.translate(p.x, p.y);
  line(g, '#64594b70', 4, 0, 0, 20, 16);
  circle(g, '#586e55', 17, 12, p.size * 0.45);
  g.rotate(p.spin);
  for (let i = 0; i < 7; i++) {
    g.rotate(Math.PI * 2 / 7);
    g.fillStyle = i % 2 ? '#427c62' : '#619671';
    g.beginPath();
    g.moveTo(0, -1);
    g.quadraticCurveTo(p.size * 0.55, -6, p.size, 1);
    g.quadraticCurveTo(p.size * 0.43, 1, 0, 3);
    g.fill();
  }
  circle(g, '#e2ba76', 0, 0, 2);
  g.restore();
}

function lotArt(g, lot) {
  const { x, y, span } = lot;
  rect(g, '#b4a18c', x, y, span, span);
  rect(g, lot.waterfront ? '#e4c399' : '#dbbc9e', x + 3, y + 3, span - 6, span - 6);
  rect(g, '#fce0b1', x + 2, y + 2, span - 4, 2);
  if (lot.park) {
    rect(g, '#8daa83', x + 24, y + 25, span - 48, span - 50);
    rect(g, '#ddc5a0', x + span / 2 - 7, y + 23, 14, span - 46);
    rect(g, '#ddc5a0', x + 23, y + span / 2 - 7, span - 46, 14);
    circle(g, '#ecd5ac', x + span / 2, y + span / 2, 27);
    circle(g, '#588e94', x + span / 2, y + span / 2, 20);
    circle(g, '#83c1bc', x + span / 2 - 2, y + span / 2 - 3, 13);
    for (const f of lot.furniture) {
      rect(g, '#5f6560', f.x, f.y, 14, 5);
      rect(g, '#e2b27e', f.x + 1, f.y, 12, 3);
    }
  } else {
    for (const b of lot.buildings) building(g, b);
  }
  for (const p of lot.palms) palm(g, p);
}

function water(g, box) {
  rect(g, '#2f777b', box.x, box.y, box.right - box.x, box.bottom - box.y);
  rect(g, '#91c2a8', WIDTH, 0, 15, HEIGHT);
  rect(g, '#d5b890', WIDTH - 3, 0, 7, HEIGHT);
  for (let y = Math.max(-120, Math.floor(box.y / 30) * 30); y < box.bottom; y += 30) {
    for (let x = WIDTH + 26 + (Math.abs(y) % 91); x < box.right; x += 86) {
      line(g, '#a6ded147', 1, x, y, x + 26, y + 2);
    }
  }
  for (let y = BLOCK + 112; y < HEIGHT; y += BLOCK) {
    rect(g, '#234f5788', WIDTH + 2, y + 11, 134, 23);
    rect(g, '#be9972', WIDTH - 1, y, 130, 23);
    for (let x = WIDTH + 3; x < WIDTH + 129; x += 7) rect(g, '#926e5a', x, y, 1, 23);
    rect(g, '#ead3a9', WIDTH, y, 129, 2);
  }
}

function carArt(g, car, active, clock) {
  g.save();
  g.translate(car.x, car.y);
  g.rotate(car.angle);
  rect(g, '#28313c75', -18, -8, 39, 21);
  for (const x of [-13, 9]) {
    rect(g, '#252932', x, -11, 6, 22);
  }
  rect(g, '#242a32', -18, -10, 37, 20);
  rect(g, car.color, -17, -9, 35, 18);
  rect(g, '#ffffff50', -15, -8, 31, 2);
  rect(g, '#283846', -9, -7, 18, 14);
  rect(g, car.police ? '#2b4657' : car.color, -5, -6, 9, 12);
  rect(g, '#ffebbd', 16, -7, 3, 4);
  rect(g, '#ffebbd', 16, 3, 3, 4);
  rect(g, '#f37871', -18, -7, 3, 4);
  rect(g, '#f37871', -18, 3, 3, 4);
  if (car.police) {
    const flash = Math.floor(clock * 7) % 2;
    rect(g, flash ? '#79daff' : '#378ead', 0, -8, 4, 8);
    rect(g, flash ? '#af493f' : '#ff695d', 0, 0, 4, 8);
  } else if (car.taxi) rect(g, '#fff0aa', -2, -5, 3, 10);
  if (active) rect(g, '#f9e1a1', 0, -13, 9, 2);
  g.restore();
}

function personArt(g, person, player) {
  g.save();
  g.translate(person.x, person.y);
  g.rotate(person.angle);
  if (person.down) {
    rect(g, '#41394080', -6, -3, 13, 6);
  } else {
    circle(g, '#41394075', 2, 3, player ? 8 : 6);
    rect(g, '#343c46', -5, -3, 8, 6);
    rect(g, player ? '#f6c37f' : person.outfit, -3, -5, 7, 10);
    circle(g, '#dca083', 2, 0, 3.3);
    if (player) rect(g, '#fff0c1', 5, -1, 5, 2);
  }
  g.restore();
}

function objective(g, point, time) {
  const radius = 19 + Math.sin(time * 4) * 3;
  circle(g, '#ffd18040', point.x, point.y, radius);
  g.strokeStyle = gold;
  g.lineWidth = 2;
  g.stroke();
  g.save();
  g.translate(point.x, point.y - 21);
  g.rotate(Math.PI / 4);
  rect(g, ink, -6, -6, 12, 12);
  rect(g, gold, -4, -4, 8, 8);
  g.restore();
}

function minimap(g, world, x, y) {
  const w = 202;
  const h = 142;
  const a = world.actor;
  const scale = 0.238;
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  rect(g, '#203b44', x, y, w, h);
  g.translate(x + w / 2 - a.x * scale, y + h / 2 - a.y * scale);
  g.scale(scale, scale);
  rect(g, '#4e6265', 0, 0, WIDTH, HEIGHT);
  for (const lot of world.city.lots) {
    rect(g, lot.park ? '#688879' : '#283f49', lot.x, lot.y, lot.span, lot.span);
  }
  for (const car of world.cars) {
    if (car.police && world.heat) circle(g, coral, car.x, car.y, 13);
  }
  const p = world.objective;
  const mx = clamp(p.x, a.x - (w / 2 - 12) / scale, a.x + (w / 2 - 12) / scale);
  const my = clamp(p.y, a.y - (h / 2 - 12) / scale, a.y + (h / 2 - 12) / scale);
  circle(g, ink, mx, my, 19);
  circle(g, gold, mx, my, 13);
  g.translate(a.x, a.y);
  g.rotate(a.angle);
  g.fillStyle = white;
  g.beginPath();
  g.moveTo(22, 0);
  g.lineTo(-12, -12);
  g.lineTo(-7, 0);
  g.lineTo(-12, 12);
  g.fill();
  g.restore();
  rect(g, ink, x + w - 31, y + 3, 28, 16);
  label(g, 'N ↑', x + w - 26, y + 6, { color: white, size: 10, font: 'monospace' });
}

function hud(g, world, w, h) {
  const a = world.actor;
  const district = world.city.district(a.x, a.y);
  const mapY = h - 197;
  rect(g, ink, 24, mapY, 218, 175);
  label(g, district, 33, mapY + 7, { color: mint, size: 11, font: 'monospace' });
  minimap(g, world, 32, mapY + 25);

  const panelWidth = Math.min(344, Math.max(235, w - 245));
  rect(g, '#121f28f2', 24, 24, panelWidth, 133);
  rect(g, gold, 24, 24, 3, 133);
  const chapter = world.index < STORY.length ? 'DANTE  /  ' + (world.index + 1) + ' OF ' + STORY.length : 'FREE ROAM';
  label(g, chapter, 39, 34, { size: 10, color: gold, font: 'monospace' });
  label(g, world.mission.title, 39, 51, { size: 25 });
  label(g, world.instruction, 39, 84, { size: 14, color: mint });
  wrap(g, world.mission.call, 39, 107, panelWidth - 28);

  rect(g, ink, w - 200, 24, 176, 101);
  label(g, '$' + world.cash.toLocaleString('en-US'), w - 38, 32, { color: mint, size: 22, align: 'right' });
  label(g, '★'.repeat(world.heat) + '☆'.repeat(5 - world.heat), w - 38, 62, {
    color: world.heat ? coral : '#9caaa6', size: 22, align: 'right',
  });
  rect(g, '#4e6062', w - 185, 103, 148, 5);
  rect(g, mint, w - 185, 103, 148 * clamp(world.player.health / 100, 0, 1), 5);

  const hint = world.player.car
    ? Math.round(Math.abs(world.player.car.speed) * 0.42) + ' KM/H    E  Exit    SPACE  Brake'
    : world.nearCar() ? 'E  Enter vehicle' : 'SHIFT  Sprint    F  Melee    CLICK  Fire';
  g.font = '700 12px monospace';
  const hintWidth = g.measureText(hint).width + 24;
  rect(g, ink, w - hintWidth - 24, h - 52, hintWidth, 30);
  label(g, hint, w - hintWidth - 12, h - 44, { size: 12, font: 'monospace' });
}

function cover(g, world, w, h) {
  const fade = g.createLinearGradient(0, 0, w, 0);
  fade.addColorStop(0, '#121f28');
  fade.addColorStop(0.49, '#121f28ce');
  fade.addColorStop(1, '#121f2810');
  rect(g, fade, 0, 0, w, h);
  const x = Math.max(22, w * 0.067);
  const top = Math.max(28, h * 0.17);
  const size = Math.min(126, w * 0.17, h * 0.19);
  label(g, 'SALTWIND COUNTY  /  THE HARBOR LEDGER', x, top, { color: mint, size: 12, font: 'monospace' });
  label(g, 'PORT', x - 5, top + 19, { size, weight: 950 });
  label(g, 'SOLANO', x - 5, top + 19 + size * 0.85, { size, weight: 950, color: coral });
  const baseline = top + 49 + size * 1.8;
  line(g, gold, 2, x, baseline, x + 58, baseline);
  label(g, 'Dante has a job for you on the waterfront.', x, baseline + 17, { size: Math.min(20, w * 0.046), weight: 500 });
  rect(g, gold, x, baseline + 59, 198, 43);
  label(g, world.index || world.cash ? 'ENTER   CONTINUE' : 'ENTER   START STORY', x + 12, baseline + 72, {
    size: 14, color: ink, font: 'monospace',
  });
  label(g, 'N  New story     M  Sound', x, baseline + 118, { size: 12, font: 'monospace', color: mint });
}

function result(g, world, w, h) {
  rect(g, '#111b23a8', 0, 0, w, h);
  const panelW = Math.min(510, w - 36);
  const x = (w - panelW) / 2;
  const y = (h - 292) / 2;
  rect(g, '#141f29', x, y, panelW, 292);
  const paused = world.mode === 'pause';
  const success = world.result?.success;
  const accent = paused || success ? mint : coral;
  rect(g, accent, x, y, panelW, 4);
  label(g, paused ? 'ON HOLD' : success ? 'JOB CLOSED' : 'JOB FAILED', x + 25, y + 26, {
    color: accent, size: 12, font: 'monospace',
  });
  label(g, paused ? 'Paused' : success ? 'Mission complete' : world.result.reason, x + 25, y + 53, {
    size: Math.min(38, panelW / 13),
  });
  label(g, paused ? world.mission.title : world.result.title, x + 25, y + 110, { size: 19, color: gold });
  line(g, '#52646a', 1, x + 25, y + 153, x + panelW - 25, y + 153);
  label(g, success && !paused ? '+ $' + world.result.reward.toLocaleString('en-US') : 'Cash  $' + world.cash.toLocaleString('en-US'),
    x + 25, y + 173, { size: 25, color: accent });
  label(g, paused ? 'ENTER  Resume    R  Retry    Q  Save & quit' : 'ENTER  Continue    R  Retry', x + 25, y + 245, {
    font: 'monospace', color: white, size: Math.min(13, (panelW - 48) / 26),
  });
}

export function createRenderer(canvas) {
  const g = canvas.getContext('2d', { alpha: false });
  let view;
  return {
    aim(pointer) {
      if (!pointer.active || !view) return null;
      return { x: view.x + pointer.x / view.zoom, y: view.y + pointer.y / view.zoom };
    },
    draw(world) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      rect(g, ink, 0, 0, w, h);
      const zoom = world.mode === 'start' ? 0.83 : clamp(h / 535, 0.87, 1.65);
      const x = world.camera.x - w / (2 * zoom);
      const y = world.camera.y - h / (2 * zoom);
      view = { x, y, right: x + w / zoom, bottom: y + h / zoom, zoom };
      const visible = p => p.x > x - BLOCK && p.x < view.right + 35 && p.y > y - BLOCK && p.y < view.bottom + 35;

      g.save();
      g.scale(zoom, zoom);
      g.translate(-x, -y);
      water(g, view);
      roadSurface(g, view);
      for (const lot of world.city.lots) if (visible(lot)) lotArt(g, lot);
      for (const p of world.city.packages) {
        if (visible(p) && !world.collected.has(p.id)) rect(g, mint, p.x - 4, p.y - 4, 8, 8);
      }
      if (world.mode === 'play') objective(g, world.objective, world.time);
      for (const person of world.people) if (visible(person)) personArt(g, person, false);
      for (const car of world.cars) if (visible(car)) carArt(g, car, car === world.player.car, world.time);
      if (!world.player.car) personArt(g, world.player, true);
      for (const effect of world.effects) {
        if (effect.kind === 'spark') circle(g, gold, effect.x + 12, effect.y - 10, effect.ttl * 17);
        else line(g, gold, 1.5, effect.x, effect.y, effect.x + Math.cos(effect.angle) * effect.length,
          effect.y + Math.sin(effect.angle) * effect.length);
      }
      g.restore();

      if (world.mode === 'start') cover(g, world, w, h);
      else {
        hud(g, world, w, h);
        if (world.mode !== 'play') result(g, world, w, h);
        else if (distance(world.actor, world.objective) > 40) {
          const meters = Math.round(distance(world.actor, world.objective) * 0.5);
          const text = 'OBJECTIVE  ' + meters + ' m';
          rect(g, ink, w / 2 - 86, h - 45, 172, 30);
          label(g, text, w / 2, h - 38, {
            color: gold, align: 'center', font: 'monospace',
          });
        }
      }
    },
  };
}
