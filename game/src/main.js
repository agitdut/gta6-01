// Browser startup, persistence, frame timing and accessible game controls.
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { input } from './input.js';
import { createRenderer } from './render.js';
import { stage } from './shots.js';
import { createAudio } from './audio.js';
import { load, save } from './save.js';

const query = new URLSearchParams(window.location.search);
const seed = Number(query.get('seed')) || 1;
const shot = query.get('shot');
const canvas = document.querySelector('#game');
const status = document.querySelector('#status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas, world);
const controls = input(canvas);
const audio = createAudio();
const previous = { keys: {}, screen: world.s.screen, mission: world.s.mission, cash: world.s.player.cash, damage: 0, ammo: world.s.player.ammo };

const stored = load();
if (stored) {
  world.s.player.cash = stored.cash || 1200;
  world.s.mission = stored.mission || 0;
  world.s.packages = stored.packages || 0;
  world.s.best = stored.best || 0;
  world.s.muted = !!stored.muted;
  if (world.s.muted) audio.toggle();
}

function announce(message) {
  status.textContent = message;
}
function pressed(code) {
  const current = controls.down(code);
  const fresh = current && !previous.keys[code];
  previous.keys[code] = current;
  return fresh;
}
function isDown(...codes) {
  return codes.some((code) => controls.down(code));
}

if (shot) {
  stage(shot, world);
  renderer.draw();
  renderer.draw();
  requestAnimationFrame(() => {
    renderer.draw();
    window.__shotReady = true;
    document.body.dataset.shotReady = 'true';
  });
} else {
  announce('Port Solano. Press Enter to continue or N for a new story.');
  let priorFrame = performance.now();
  let lastSave = 0;

  function recoverScreen() {
    const s = world.s;
    if (!['busted', 'wasted', 'complete'].includes(s.screen)) return;
    if (pressed('KeyR')) {
      world.restartMission();
      s.screen = 'play';
      s.player.x = 1250;
      s.player.y = 1270;
    }
    if (isDown('Enter', 'Space') || controls.mouse.down) {
      if (s.screen === 'wasted') { s.player.cash = Math.max(0, s.player.cash - 250); save(s); }
      s.screen = 'play'; s.paused = false; s.player.health = 100; s.player.armour = 35; s.wanted = 0;
      s.player.x = 960; s.player.y = 1270; s.complete = false;
      announce('Back in Port Solano.');
    }
  }

  function menuKeys() {
    const s = world.s;
    if (pressed('KeyM')) { s.muted = audio.toggle(); save(s); }
    if (s.screen === 'title' && pressed('KeyN')) {
      audio.start(); world.newGame(); announce('New game. First Wheels. Find a car and deliver it to the garage.');
    }
    if (s.screen === 'title' && (isDown('Enter', 'Space') || controls.mouse.down)) {
      audio.start(); s.screen = 'play';
      announce('Port Solano. First Wheels. Find a car and deliver it to the garage.');
    }
    if (pressed('KeyP') || pressed('Escape')) {
      s.paused = !s.paused;
      announce(s.paused ? 'Paused.' : 'Resumed.');
    }
    if (s.paused && pressed('KeyQ')) {
      save(s); s.paused = false; s.screen = 'title'; announce('Saved. Back to title.');
    }
    if (s.paused && pressed('KeyR')) {
      world.restartMission(); s.paused = false; announce('Mission restarted.');
    }
  }

  function reportChanges(now) {
    const s = world.s;
    if (s.complete && s.screen === 'play') s.screen = 'complete';
    if (s.player.cash > previous.cash) audio.cue(920);
    if (s.damage > previous.damage) audio.cue(145);
    if (s.player.ammo < previous.ammo) audio.cue(240);
    if (s.screen !== previous.screen) {
      previous.screen = s.screen;
      if (s.screen === 'wasted' || s.screen === 'busted') announce(`${s.screen.toUpperCase()}. Enter to continue, R to retry.`);
      else if (s.paused) announce('Paused. Press P to resume.');
    }
    if (s.mission !== previous.mission) {
      previous.mission = s.mission;
      announce(s.mission < 6 ? `Mission update: ${world.missionData()[0]}` : 'Port Solano story complete. Free roam unlocked.');
      audio.cue(880);
      save(s);
    }
    previous.cash = s.player.cash;
    previous.damage = s.damage;
    previous.ammo = s.player.ammo;
    if (now - lastSave > 4000) { save(s); lastSave = now; }
  }

  function frame(now) {
    const dt = Math.min(0.04, (now - priorFrame) / 1000);
    priorFrame = now;
    recoverScreen();
    menuKeys();
    world.update(dt, controls);
    audio.update(world.s.player.car?.speed || 0, world.s.wanted);
    reportChanges(now);
    renderer.draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
