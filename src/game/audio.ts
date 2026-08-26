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

  private tone(freq: number, dur: number, type: OscillatorType, gain = 0.06): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  hop(): void {
    this.tone(420, 0.07, "square", 0.05);
    this.tone(640, 0.09, "triangle", 0.04);
  }

  capture(): void {
    this.tone(180, 0.12, "sawtooth", 0.07);
    this.tone(90, 0.16, "square", 0.04);
  }

  crown(): void {
    this.tone(523, 0.14, "triangle", 0.06);
    this.tone(784, 0.2, "sine", 0.05);
  }

  win(): void {
    this.tone(392, 0.12, "triangle", 0.06);
    this.tone(523, 0.16, "triangle", 0.06);
    this.tone(659, 0.28, "sine", 0.07);
  }

  lose(): void {
    this.tone(220, 0.3, "sine", 0.07);
    this.tone(110, 0.45, "triangle", 0.05);
  }

  ui(): void {
    this.tone(500, 0.05, "square", 0.03);
  }
}
