// A local stream keeps the city independent of frame timing.
export function random(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

export const between = (next, lo, hi) => lo + (hi - lo) * next();
export const pick = (next, values) => values[Math.floor(next() * values.length)];
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
export const turn = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
