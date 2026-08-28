export class Rng {
  s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
    if (this.s === 0) this.s = 0x9e3779b9;
  }

  next(): number {
    this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0;
    return this.s / 0x100000000;
  }

  int(n: number): number {
    if (n <= 0) return 0;
    return Math.floor(this.next() * n);
  }

  range(a: number, b: number): number {
    return a + this.int(b - a + 1);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)]!;
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const t = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = t;
    }
    return arr;
  }
}

export function dailySeed(): number {
  const n = new Date();
  const day = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  return (day / 86400000) | 0;
}

export function hashSeed(n: number): number {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

/** A fresh climb seed. Daily boards use dailySeed() instead, so friends share today. */
export function freshSeed(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const n = buf[0] ?? 0;
    if (n) return n >>> 0;
  }
  return ((Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
}
