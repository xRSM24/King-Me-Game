export class AudioSys {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
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
    void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain = 0.06, slide = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  hop(): void {
    this.tone(520, 0.08, "triangle", 0.05, 180);
    this.tone(780, 0.1, "sine", 0.03);
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
    this.tone(640, 0.05, "triangle", 0.03);
  }

  oops(): void {
    this.tone(300, 0.08, "sine", 0.04, -60);
  }
}
