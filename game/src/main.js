import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { input } from './input.js';
import { createRenderer } from './render.js';
import { stage } from './shots.js';
import { createAudio } from './audio.js';
import { load, save } from './save.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(Number(params.get('seed')) || 1));
const renderer = createRenderer(canvas, world);
const shot = params.get('shot');

if (shot) {
  stage(shot, world);
  renderer.draw();
  requestAnimationFrame(() => {
    renderer.draw();
    window.__shotReady = true;
    document.body.dataset.shotReady = 'true';
  });
} else {
  play();
}

function play() {
  const { s } = world;
  const controls = input(canvas);
  const audio = createAudio();
  const announce = (message) => { status.textContent = message; };
  const record = load();
  let restoreMission = false;
  if (record) {
    s.player.cash = record.cash ?? 1200;
    s.mission = record.mission || 0;
    s.packages = record.packages || 0;
    s.best = record.best || 0;
    if (record.muted) s.muted = audio.toggle();
    restoreMission = s.mission > 0 && s.mission < 6;
  }

  const actionKeys = ['KeyM', 'KeyN', 'KeyP', 'Escape', 'KeyQ', 'KeyR'];
  let held = new Set();
  let previous = snapshot();
  let lastFrame = performance.now();
  let lastSave = 0;
  announce('Port Solano. Press Enter to continue or N for a new story.');

  function snapshot() {
    return { screen: s.screen, mission: s.mission, cash: s.player.cash, damage: s.damage, ammo: s.player.ammo };
  }

  function readMenus() {
    const next = new Set(actionKeys.filter(controls.down));
    const tapped = (key) => next.has(key) && !held.has(key);
    const confirm = controls.down('Enter') || controls.down('Space') || controls.mouse.down;
    const p = s.player;

    if (['busted', 'wasted', 'complete'].includes(s.screen)) {
      if (tapped('KeyR')) {
        world.restartMission();
        Object.assign(p, { x: 1250, y: 1270 });
        s.screen = 'play';
      } else if (confirm) {
        if (s.screen === 'wasted') {
          p.cash = Math.max(0, p.cash - 250);
          save(s);
        }
        Object.assign(p, { x: 960, y: 1270, health: 100, armour: 35 });
        Object.assign(s, { screen: 'play', paused: false, wanted: 0, complete: false });
        announce('Back in Port Solano.');
      }
    }

    if (tapped('KeyM')) {
      s.muted = audio.toggle();
      save(s);
    }
    if (s.screen === 'title' && (tapped('KeyN') || confirm)) {
      audio.start();
      if (tapped('KeyN')) world.newGame();
      else {
        // Saves keep the mission number, so rebuild its opening state on resume.
        if (restoreMission) world.restartMission();
        s.screen = 'play';
      }
      restoreMission = false;
      announce('Mission: ' + world.missionData()[0] + '. ' + world.missionData()[2]);
    }
    if (tapped('KeyP') || tapped('Escape')) {
      s.paused = !s.paused;
      announce(s.paused ? 'Paused.' : 'Resumed.');
    }
    if (s.paused && tapped('KeyQ')) {
      save(s);
      Object.assign(s, { paused: false, screen: 'title' });
      announce('Saved. Back to title.');
    }
    if (s.paused && tapped('KeyR')) {
      world.restartMission();
      s.paused = false;
      announce('Mission restarted.');
    }
    held = next;
  }

  function report(now) {
    const current = snapshot();
    if (current.cash > previous.cash) audio.cue(920);
    if (current.damage > previous.damage) audio.cue(145);
    if (current.ammo < previous.ammo) audio.cue(240);
    if (current.screen !== previous.screen && ['wasted', 'busted'].includes(current.screen)) {
      announce(current.screen.toUpperCase() + '. Enter to continue, R to retry.');
    }
    if (current.mission !== previous.mission) {
      announce(s.mission < 6 ? 'Mission update: ' + world.missionData()[0] : 'Port Solano story complete. Free roam unlocked.');
      audio.cue(880);
      save(s);
    }
    if (now - lastSave > 4000) {
      save(s);
      lastSave = now;
    }
    previous = current;
  }

  function frame(now) {
    const dt = Math.max(0, Math.min(0.04, (now - lastFrame) / 1000));
    lastFrame = now;
    readMenus();
    world.update(dt, controls);
    audio.update(s.player.car?.speed || 0, s.wanted);
    report(now);
    renderer.draw();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
