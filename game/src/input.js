export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const pointer = { x: 0, y: 0, active: false, down: false };
  const blocked = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  addEventListener('keydown', event => {
    if (blocked.has(event.code)) event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    held.add(event.code);
  });
  addEventListener('keyup', event => held.delete(event.code));
  addEventListener('blur', () => {
    held.clear();
    pressed.clear();
    pointer.down = false;
  });
  canvas.addEventListener('pointermove', event => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    pointer.down = true;
    canvas.setPointerCapture(event.pointerId);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, () => { pointer.down = false; });
  }
  const down = (...codes) => codes.some(code => held.has(code));
  return {
    down, pointer,
    hit: (...codes) => codes.some(code => pressed.has(code)),
    axis: (positive, negative) => Number(down(...positive)) - Number(down(...negative)),
    end: () => pressed.clear(),
  };
}
