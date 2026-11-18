// Lightweight synthesized engine, siren, music and event cues; audio begins after a user gesture.
export function createAudio() {
  let ctx = null,
    muted = false,
    osc = [],
    timer = 0;
  function start() {
    if (ctx) return;
    ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.035;
    master.connect(ctx.destination);
    for (let i = 0; i < 2; i++) {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = i ? 'triangle' : 'sawtooth';
      o.frequency.value = i ? 55 : 82;
      g.gain.value = 0;
      o.connect(g);
      g.connect(master);
      o.start();
      osc.push({ o, g });
    }
    setInterval(() => {
      if (!ctx || muted) return;
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = [110, 146, 164, 196][timer++ % 4];
      g.gain.setValueAtTime(0.03, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.27);
    }, 850);
  }
  function update(speed, wanted) {
    if (ctx) {
      osc[0].g.gain.value = muted ? 0 : Math.min(0.08, Math.abs(speed) / 6000);
      osc[1].g.gain.value = muted ? 0 : wanted * 0.007;
      osc[1].o.frequency.value = 520 + Math.sin(Date.now() / 140) * 90;
    }
  }
  function cue(f = 660) {
    if (!ctx || muted) return;
    let o = ctx.createOscillator(),
      g = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.31);
  }
  return {
    start,
    update,
    cue,
    toggle() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
