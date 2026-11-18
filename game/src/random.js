const INCREMENT = 0x6d2b79f5;
const UINT32_RANGE = 2 ** 32;

export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    // Keep the state bounded so a long session cannot lose integer precision.
    state = (state + INCREMENT) >>> 0;
    const first = Math.imul(state ^ (state >>> 15), state | 1);
    const mixed = first ^ (first + Math.imul(first ^ (first >>> 7), first | 61));
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}
