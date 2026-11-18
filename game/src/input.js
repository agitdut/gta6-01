const browserShortcuts = new Set([
  'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyE', 'KeyF', 'KeyP', 'Escape', 'KeyM',
]);

export function input(canvas) {
  const k = new Set();
  const mouse = { x: 0, y: 0, down: false, hasMoved: false };
  const held = (code) => k.has(code);

  function aim(event) {
    Object.assign(mouse, { x: event.clientX, y: event.clientY, hasMoved: true });
  }
  function releasePointer() {
    mouse.down = false;
  }

  addEventListener('keydown', (event) => {
    k.add(event.code);
    if (browserShortcuts.has(event.code)) event.preventDefault();
  });
  addEventListener('keyup', ({ code }) => k.delete(code));
  addEventListener('blur', () => {
    k.clear();
    releasePointer();
  });

  canvas.addEventListener('pointermove', aim);
  canvas.addEventListener('pointerdown', (event) => {
    aim(event);
    mouse.down = true;
  });
  addEventListener('pointerup', releasePointer);
  addEventListener('pointercancel', releasePointer);

  return { down: held, pressed: held, mouse, k };
}
