export function createAudio(initiallyOn) {
  let context;
  let bus;
  let motor;
  let motorLevel;
  let enabled = initiallyOn;
  const unlock = () => {
    if (!context) {
      const Context = globalThis.AudioContext;
      if (!Context) return;
      context = new Context();
      bus = context.createGain();
      bus.gain.value = enabled ? 0.24 : 0;
      bus.connect(context.destination);
      motor = context.createOscillator();
      motor.type = 'triangle';
      motorLevel = context.createGain();
      motorLevel.gain.value = 0;
      motor.connect(motorLevel).connect(bus);
      motor.start();
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  };

  function note(pitch, end, duration, shape, volume, delay = 0) {
    if (!context || !enabled) return;
    const time = context.currentTime + delay;
    const voice = context.createOscillator();
    const envelope = context.createGain();
    voice.type = shape;
    voice.frequency.setValueAtTime(pitch, time);
    voice.frequency.exponentialRampToValueAtTime(end, time + duration);
    envelope.gain.setValueAtTime(volume, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + duration);
    voice.connect(envelope).connect(bus);
    voice.start(time);
    voice.stop(time + duration);
  }

  return {
    unlock,
    toggle() {
      enabled = !enabled;
      if (bus) bus.gain.setTargetAtTime(enabled ? 0.24 : 0, context.currentTime, 0.03);
      return enabled;
    },
    engine(speed) {
      if (!motor) return;
      const time = context.currentTime;
      motor.frequency.setTargetAtTime(36 + Math.abs(speed) * 0.26, time, 0.09);
      motorLevel.gain.setTargetAtTime(speed ? 0.08 : 0, time, 0.12);
    },
    play(event) {
      if (event === 'fire') note(160, 32, 0.11, 'sawtooth', 0.28);
      if (event === 'impact') note(95, 31, 0.18, 'triangle', 0.38);
      if (event === 'heat') {
        note(420, 630, 0.27, 'sine', 0.22);
        note(630, 410, 0.27, 'sine', 0.22, 0.27);
      }
      if (event === 'reward') {
        [392, 494, 587, 784].forEach((pitch, i) => note(pitch, pitch, 0.28, 'triangle', 0.27, i * 0.09));
      }
    },
  };
}
