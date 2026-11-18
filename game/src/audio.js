// WebAudio engine, police siren, soft score and short gameplay cues.
export function createAudio() {
  let context = null;
  let master = null;
  let engine = [];
  let siren = null;
  let muted = false;
  let noteIndex = 0;
  let musicClock = 0;

  function start() {
    if (context || typeof window.AudioContext !== 'function') return;
    context = new window.AudioContext();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.065;
    master.connect(context.destination);
    for (let index = 0; index < 2; index++) {
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      oscillator.type = index === 0 ? 'sawtooth' : 'triangle';
      oscillator.frequency.value = index === 0 ? 72 : 54;
      volume.gain.value = 0;
      oscillator.connect(volume);
      volume.connect(master);
      oscillator.start();
      engine.push({ oscillator, volume });
    }
    const sirenOsc = context.createOscillator();
    const sirenGain = context.createGain();
    sirenOsc.type = 'square';
    sirenOsc.frequency.value = 640;
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(master);
    sirenOsc.start();
    siren = { oscillator: sirenOsc, volume: sirenGain };
    window.setInterval(playMusicNote, 850);
    if (context.state === 'suspended') context.resume();
  }

  function playMusicNote() {
    if (!context || muted || !master) return;
    const current = context.currentTime;
    const scale = [110, 146, 164, 196, 164, 146, 123, 146];
    const tone = context.createOscillator();
    const envelope = context.createGain();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(scale[noteIndex++ % scale.length], current);
    envelope.gain.setValueAtTime(0.026, current);
    envelope.gain.exponentialRampToValueAtTime(0.001, current + 0.34);
    tone.connect(envelope);
    envelope.connect(master);
    tone.start(current);
    tone.stop(current + 0.36);
  }

  function update(speed, wanted) {
    if (!context) return;
    const time = context.currentTime;
    const volume = muted ? 0 : 1;
    engine[0].volume.gain.setTargetAtTime(Math.min(0.09, Math.abs(speed) / 5200) * volume, time, 0.08);
    engine[0].oscillator.frequency.setTargetAtTime(58 + Math.min(165, Math.abs(speed) * 0.42), time, 0.09);
    engine[1].volume.gain.setTargetAtTime(Math.min(0.035, Math.abs(speed) / 13500) * volume, time, 0.1);
    engine[1].oscillator.frequency.setTargetAtTime(47 + Math.min(90, Math.abs(speed) * 0.19), time, 0.11);
    musicClock += 0.035;
    if (siren) {
      siren.volume.gain.setTargetAtTime(wanted ? Math.min(0.035, wanted * 0.007) * volume : 0, time, 0.12);
      siren.oscillator.frequency.setTargetAtTime(560 + Math.sin(musicClock * 7) * 110, time, 0.08);
    }
  }

  function cue(frequency = 660) {
    if (!context || muted) return;
    const at = context.currentTime;
    const tone = context.createOscillator();
    const envelope = context.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(frequency, at);
    envelope.gain.setValueAtTime(0.065, at);
    envelope.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
    tone.connect(envelope);
    envelope.connect(master);
    tone.start(at);
    tone.stop(at + 0.31);
  }

  return {
    start,
    update,
    cue,
    toggle() {
      muted = !muted;
      if (master && context) master.gain.setTargetAtTime(muted ? 0 : 0.065, context.currentTime, 0.04);
      return muted;
    },
    get muted() { return muted; },
  };
}
