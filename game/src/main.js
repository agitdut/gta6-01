// Browser boot, game loop, saves, menu transitions and reproducible screenshot scenes.
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { input } from './input.js';
import { createRenderer } from './render.js';
import { stage } from './shots.js';
import { createAudio } from './audio.js';
import { load, save } from './save.js';
const seed = Number(new URLSearchParams(location.search).get('seed')) || 1,
  shot = new URLSearchParams(location.search).get('shot');
const canvas = document.querySelector('#game'),
  status = document.querySelector('#status'),
  world = createWorld(createRandom(seed)),
  renderer = createRenderer(canvas, world),
  keys = input(canvas),
  audio = createAudio();
const loaded = load();
if (loaded) {
  world.s.player.cash = loaded.cash || 1200;
  world.s.mission = loaded.mission || 0;
  world.s.packages = loaded.packages || 0;
  world.s.best = loaded.best || 0;
  world.s.muted = !!loaded.muted;
  if (world.s.muted) audio.toggle();
}
function announce(t) {
  status.textContent = t;
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
  let prior = performance.now(),
    lastTap = {},
    lastStore = 0,
    lastMission = world.s.mission,
    lastScreen = world.s.screen,
    lastCash = world.s.player.cash,
    lastDamage = 0,
    lastAmmo = world.s.player.ammo;
  announce('Port Solano. Press Enter to continue or N for a new story.');
  function frame(now) {
    let dt = Math.min(0.04, (now - prior) / 1000);
    prior = now;
    const s = world.s;
    if (
      (s.screen === 'busted' ||
        s.screen === 'wasted' ||
        s.screen === 'complete') &&
      keys.down('KeyR') &&
      !lastTap.retry
    ) {
      world.restartMission();
      s.screen = 'play';
      s.player.x = 1250;
      s.player.y = 1270;
      lastTap.retry = 1;
    }
    if (!keys.down('KeyR')) lastTap.retry = 0;
    if (
      (s.screen === 'busted' ||
        s.screen === 'wasted' ||
        s.screen === 'complete') &&
      (keys.down('Enter') || keys.down('Space') || keys.mouse.down)
    ) {
      if (s.screen === 'wasted') {
        s.player.cash = Math.max(0, s.player.cash - 250);
        save(s);
      }
      s.screen = 'play';
      s.paused = false;
      s.player.health = 100;
      s.player.armour = 35;
      s.wanted = 0;
      s.player.x = 960;
      s.player.y = 1270;
      s.complete = false;
      announce('Back in Port Solano.');
    }
    if (keys.down('KeyM') && !lastTap.m) {
      s.muted = audio.toggle();
      lastTap.m = 1;
      save(s);
    }
    if (!keys.down('KeyM')) lastTap.m = 0;
    if (s.screen === 'title' && keys.down('KeyN') && !lastTap.n) {
      audio.start();
      world.newGame();
      lastTap.n = 1;
      announce(
        'New game. First Wheels. Find a car and deliver it to the garage.',
      );
    }
    if (!keys.down('KeyN')) lastTap.n = 0;
    if (
      s.screen === 'title' &&
      (keys.down('Enter') || keys.down('Space') || keys.mouse.down)
    ) {
      audio.start();
      s.screen = 'play';
      announce(
        'Port Solano. First Wheels. Find a car and deliver it to the garage.',
      );
    } else if (keys.down('KeyP') || keys.down('Escape')) {
      if (!lastTap.p) {
        s.paused = !s.paused;
        lastTap.p = 1;
        announce(s.paused ? 'Paused.' : 'Resumed.');
      }
    } else lastTap.p = 0;
    if (s.paused && keys.down('KeyQ') && !lastTap.q) {
      save(s);
      s.paused = false;
      s.screen = 'title';
      lastTap.q = 1;
      announce('Saved. Back to title.');
    }
    if (!keys.down('KeyQ')) lastTap.q = 0;
    if (s.paused && keys.down('KeyR') && !lastTap.r) {
      world.restartMission();
      s.paused = false;
      lastTap.r = 1;
      announce('Mission restarted.');
    }
    if (!keys.down('KeyR')) lastTap.r = 0;
    world.update(dt, keys);
    audio.update(s.player.car?.speed || 0, s.wanted);
    if (s.complete && s.screen === 'play') s.screen = 'complete';
    if (s.player.cash > lastCash) {
      audio.cue(920);
      lastCash = s.player.cash;
    }
    if (s.damage > lastDamage) {
      audio.cue(145);
      lastDamage = s.damage;
    }
    if (s.player.ammo < lastAmmo) {
      audio.cue(240);
      lastAmmo = s.player.ammo;
    }
    if (s.screen !== lastScreen) {
      lastScreen = s.screen;
      if (s.screen === 'wasted' || s.screen === 'busted')
        announce(s.screen.toUpperCase() + '. Enter to continue, R to retry.');
      else if (s.paused) announce('Paused. Press P to resume.');
    }
    if (s.mission !== lastMission) {
      lastMission = s.mission;
      announce(
        s.mission < 6
          ? 'Mission update: ' + world.missionData()[0]
          : 'Port Solano story complete. Free roam unlocked.',
      );
      audio.cue(880);
      save(s);
    }
    if (now - lastStore > 4000) {
      save(s);
      lastStore = now;
    }
    renderer.draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
