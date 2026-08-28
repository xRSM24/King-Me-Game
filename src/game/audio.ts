export class AudioSys {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private lastPuff = 0;
  private lastSparkle = 0;
  muted = false;

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 1;
  }

  unlock(): void {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    const n = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.35, this.ctx.sampleRate);
    const data = n.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = n;
    void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain = 0.06, slide = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private burst(dur: number, gain: number, freq: number, slide = 0): void {
    if (!this.ctx || !this.master || this.muted || !this.noise) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(freq, t);
    if (slide) bp.frequency.linearRampToValueAtTime(Math.max(80, freq + slide), t + dur);
    bp.Q.value = 1.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur);
  }

  hop(): void {
    this.tone(520, 0.08, "triangle", 0.05, 180);
    this.tone(780, 0.1, "sine", 0.03);
  }

  whoosh(): void {
    this.burst(0.14, 0.045, 920, -420);
    this.tone(640, 0.1, "sine", 0.03, 220);
  }

  pop(): void {
    this.burst(0.1, 0.06, 420, -180);
    this.tone(240, 0.09, "triangle", 0.055, -80);
    this.tone(720, 0.07, "sine", 0.03);
  }

  puff(): void {
    const now = performance.now();
    if (now - this.lastPuff < 70) return;
    this.lastPuff = now;
    this.burst(0.09, 0.03, 540, -200);
  }

  sparkle(): void {
    const now = performance.now();
    if (now - this.lastSparkle < 90) return;
    this.lastSparkle = now;
    this.tone(1760, 0.07, "sine", 0.025);
    this.tone(2340, 0.09, "sine", 0.02, 400);
    this.tone(3120, 0.06, "triangle", 0.016);
  }

  land(): void {
    this.tone(220, 0.07, "triangle", 0.045, -70);
    this.tone(490, 0.1, "sine", 0.035, 80);
  }

  pickup(): void {
    this.tone(380, 0.07, "triangle", 0.04, 260);
    this.tone(620, 0.08, "sine", 0.025);
  }

  plop(): void {
    this.tone(340, 0.08, "sine", 0.035, -140);
    this.burst(0.08, 0.025, 280, -80);
  }

  select(): void {
    this.tone(880, 0.05, "sine", 0.03);
    this.tone(1320, 0.07, "triangle", 0.018);
  }

  chirp(): void {
    this.tone(660, 0.07, "triangle", 0.045, 140);
    this.tone(990, 0.1, "sine", 0.04);
    this.tone(1320, 0.12, "sine", 0.03);
  }

  screen(): void {
    this.burst(0.16, 0.028, 680, -240);
    this.tone(392, 0.12, "sine", 0.03, 160);
  }

  capture(combo = 1): void {
    const bump = Math.min(combo, 5) * 40;
    this.tone(330 + bump, 0.1, "triangle", 0.06);
    this.tone(494 + bump, 0.12, "sine", 0.05);
    this.tone(659 + bump, 0.16, "triangle", 0.04);
  }

  crown(): void {
    this.tone(523, 0.12, "triangle", 0.06);
    this.tone(659, 0.16, "sine", 0.05);
    this.tone(784, 0.22, "triangle", 0.05);
    this.tone(1046, 0.18, "sine", 0.03);
  }

  win(): void {
    this.tone(392, 0.1, "triangle", 0.06);
    this.tone(523, 0.12, "triangle", 0.06);
    this.tone(659, 0.14, "sine", 0.06);
    this.tone(784, 0.28, "sine", 0.07);
  }

  lose(): void {
    this.tone(392, 0.18, "sine", 0.05, -80);
    this.tone(330, 0.28, "triangle", 0.04, -40);
  }

  ui(): void {
    this.tone(720, 0.05, "triangle", 0.03);
    this.tone(980, 0.07, "sine", 0.02);
  }

  oops(): void {
    this.tone(300, 0.08, "sine", 0.04, -60);
    this.burst(0.1, 0.03, 240, -60);
  }
}
