// Unified keyboard and pointer controls.
export function input(canvas) {
  const k = new Set();
  let mouse = { x: 0, y: 0, down: false, hasMoved: false };
  addEventListener('keydown', (e) => {
    k.add(e.code);
    if (['Space', 'KeyE', 'KeyF', 'KeyP', 'Escape', 'KeyM'].includes(e.code))
      e.preventDefault();
  });
  addEventListener('keyup', (e) => k.delete(e.code));
  canvas.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.hasMoved = true;
  });
  canvas.addEventListener('pointerdown', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.hasMoved = true;
    mouse.down = true;
  });
  addEventListener('pointerup', () => (mouse.down = false));
  return { down: (c) => k.has(c), pressed: (c) => k.has(c), mouse, k };
}
