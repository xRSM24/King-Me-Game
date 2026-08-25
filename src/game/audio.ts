export class AudioSys {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drone: OscillatorNode | null = null;
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
    this.startDrone();
  }

  private now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain = 0.08,
    at = 0,
    slide?: number,
  ): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.now() + at;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain = 0.04): void {
    if (!this.ctx || !this.master || this.muted) return;
    const n = this.ctx.createBufferSource();
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    n.buffer = buf;
    const g = this.ctx.createGain();
    const t = this.now();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(g);
    g.connect(this.master);
    n.start(t);
    n.stop(t + dur);
  }

  startDrone(): void {
    if (!this.ctx || !this.master || this.drone) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 55;
    g.gain.value = 0.025;
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    this.drone = osc;
  }

  move(): void {
    this.tone(180 + Math.random() * 40, 0.05, "square", 0.03);
  }

  hit(): void {
    this.tone(140, 0.09, "sawtooth", 0.1, 0, 60);
    this.noise(0.08, 0.05);
  }

  wear(): void {
    this.tone(220, 0.18, "triangle", 0.08, 0, 440);
    this.tone(330, 0.22, "sine", 0.06, 0.04, 660);
  }

  harvest(): void {
    this.tone(520, 0.08, "square", 0.05);
    this.tone(780, 0.1, "square", 0.04, 0.06);
  }

  pop(): void {
    this.tone(300, 0.16, "sawtooth", 0.09, 0, 80);
    this.noise(0.12, 0.06);
  }

  dead(): void {
    this.tone(200, 0.5, "triangle", 0.1, 0, 40);
    this.tone(150, 0.7, "sine", 0.08, 0.1, 30);
  }

  win(): void {
    this.tone(330, 0.2, "triangle", 0.07);
    this.tone(415, 0.25, "triangle", 0.07, 0.12);
    this.tone(523, 0.4, "sine", 0.08, 0.24);
  }

  resonate(): void {
    this.tone(392, 0.2, "sine", 0.07);
    this.tone(523, 0.25, "sine", 0.06, 0.08);
    this.tone(659, 0.3, "sine", 0.05, 0.16);
  }

  stairs(): void {
    this.tone(240, 0.12, "triangle", 0.06, 0, 360);
  }

  stitch(): void {
    this.tone(640, 0.1, "sine", 0.05);
    this.tone(960, 0.12, "sine", 0.04, 0.05);
  }

  fire(): void {
    this.noise(0.1, 0.04);
    this.tone(90, 0.1, "sawtooth", 0.04);
  }

  ui(): void {
    this.tone(480, 0.05, "square", 0.03);
  }

  play(name: string): void {
    switch (name) {
      case "move":
        this.move();
        break;
      case "hit":
        this.hit();
        break;
      case "wear":
        this.wear();
        break;
      case "harvest":
        this.harvest();
        break;
      case "pop":
        this.pop();
        break;
      case "dead":
        this.dead();
        break;
      case "win":
        this.win();
        break;
      case "resonate":
        this.resonate();
        break;
      case "stairs":
        this.stairs();
        break;
      case "stitch":
        this.stitch();
        break;
      case "fire":
        this.fire();
        break;
      default:
        this.ui();
    }
  }
}
