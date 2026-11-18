import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { audioPreference, readSave, writeSave } from './save.js';
import { stage } from './shots.js';
import { World } from './world.js';

const canvas = document.querySelector('#game');
const input = createInput(canvas);
const renderer = createRenderer(canvas);
const sound = createAudio(audioPreference());
const query = new URLSearchParams(location.search);
const seed = Number(query.get('seed')) || 2087;
const shot = query.get('shot');
const staged = ['start', 'play', 'end'].includes(shot);
let checkpoint = staged ? null : readSave();
let world = new World(seed, checkpoint, sound);

function enterTitle() {
  stage('start', world);
}

function restart(state) {
  world = new World(seed, state, sound);
  world.mode = 'play';
}

if (staged) {
  stage(shot, world);
  requestAnimationFrame(() => {
    renderer.draw(world);
    window.__shotReady = true;
  });
} else {
  enterTitle();
  addEventListener('keydown', sound.unlock);
  canvas.addEventListener('pointerdown', sound.unlock);

  let previous = performance.now();
  function frame(now) {
    const dt = Math.min((now - previous) / 1000, 1 / 24);
    previous = now;
    const confirm = input.hit('Enter', 'Space');
    const pause = input.hit('Escape', 'KeyP');
    if (input.hit('KeyM')) audioPreference(sound.toggle());

    if (world.mode === 'start') {
      if (input.hit('KeyN')) {
        checkpoint = { mission: 0, cash: 0, collected: [] };
        writeSave(checkpoint);
        restart(checkpoint);
      } else if (confirm) restart(checkpoint);
    } else if (world.mode === 'pause') {
      if (input.hit('KeyQ')) {
        checkpoint = world.snapshot();
        writeSave(checkpoint);
        enterTitle();
      } else if (input.hit('KeyR')) restart(checkpoint);
      else if (confirm || pause) world.mode = 'play';
    } else if (world.mode === 'end') {
      if (input.hit('KeyR') || confirm) restart(checkpoint);
    } else if (pause) {
      world.mode = 'pause';
    } else {
      world.step(dt, input, renderer.aim(input.pointer));
      if (world.mode === 'end' && world.result.success) {
        checkpoint = world.snapshot();
        writeSave(checkpoint);
      }
    }
    if (world.mode !== 'play') sound.engine(0);
    renderer.draw(world);
    input.end();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
