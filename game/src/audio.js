const MASTER_LEVEL = 0.065;
const SCORE = [110, 146, 164, 196, 164, 146, 123, 146];
const ENGINE = [
  { wave: 'sawtooth', initial: 72, floor: 58, range: 165, slope: 0.42, ceiling: 0.09, divisor: 5200, smooth: 0.08 },
  { wave: 'triangle', initial: 54, floor: 47, range: 90, slope: 0.19, ceiling: 0.035, divisor: 13500, smooth: 0.10 },
];

export function createAudio() {
  let context, master, siren;
  let engine = [];
  let muted = false;
  let phase = 0;
  let note = 0;

  function voice(wave, frequency, level) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.value = frequency;
    gain.gain.value = level;
    oscillator.connect(gain);
    gain.connect(master);
    return { oscillator, gain };
  }

  function tone(wave, frequency, peak, decay, duration) {
    const time = context.currentTime;
    const { oscillator, gain } = voice(wave, frequency, peak);
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(time);
    oscillator.stop(time + duration);
  }

  function start() {
    if (context || typeof window.AudioContext !== 'function') return;
    context = new window.AudioContext();
    master = context.createGain();
    master.gain.value = muted ? 0 : MASTER_LEVEL;
    master.connect(context.destination);

    engine = ENGINE.map(({ wave, initial }) => voice(wave, initial, 0));
    siren = voice('square', 640, 0);
    for (const { oscillator } of [...engine, siren]) oscillator.start();

    window.setInterval(() => {
      if (muted) return;
      tone('sine', SCORE[note++ % SCORE.length], 0.026, 0.34, 0.36);
    }, 850);
    if (context.state === 'suspended') {
      // A browser may keep audio suspended under its autoplay settings.
      context.resume().catch(() => {});
    }
  }

  function update(speed, wanted) {
    if (!context) return;
    const time = context.currentTime;
    const throttle = Math.abs(speed);
    for (const [i, { oscillator, gain }] of engine.entries()) {
      const spec = ENGINE[i];
      gain.gain.setTargetAtTime(muted ? 0 : Math.min(spec.ceiling, throttle / spec.divisor), time, spec.smooth);
      oscillator.frequency.setTargetAtTime(spec.floor + Math.min(spec.range, throttle * spec.slope), time, spec.smooth + 0.01);
    }
    phase += 0.035;
    siren.gain.gain.setTargetAtTime(muted ? 0 : Math.min(0.035, wanted * 0.007), time, 0.12);
    siren.oscillator.frequency.setTargetAtTime(560 + Math.sin(phase * 7) * 110, time, 0.08);
  }

  function cue(frequency = 660) {
    if (context && !muted) tone('triangle', frequency, 0.065, 0.3, 0.31);
  }

  return {
    start, update, cue,
    toggle() {
      muted = !muted;
      master?.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, context.currentTime, 0.04);
      return muted;
    },
    get muted() { return muted; },
  };
}
