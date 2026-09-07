import type { BoardMods } from "./types.ts";

export interface YouBurst {
  lilyHops: number;
  openingHops: number;
  napPending: boolean;
  napUsed: boolean;
}

export function burstFromMods(mods: BoardMods): YouBurst {
  return {
    lilyHops: mods.lilyHops ?? 0,
    openingHops: mods.openingHops,
    napPending: mods.napPending,
    napUsed: mods.napUsed,
  };
}

export function applyBurst(mods: BoardMods, burst: YouBurst): void {
  mods.lilyHops = burst.lilyHops;
  mods.openingHops = burst.openingHops;
  mods.napPending = burst.napPending;
  mods.napUsed = burst.napUsed;
}

export function takeLilyOnBoard(mods: BoardMods): void {
  mods.lily = null;
  mods.lilyPending = true;
}

export function shouldGrantExtras(themLeft: number): boolean {
  return themLeft > 0;
}

export function noteCapture(burst: YouBurst, napLaw: boolean): YouBurst {
  if (!napLaw || burst.napUsed || burst.napPending) return burst;
  return { ...burst, napPending: true };
}

export function takeLily(burst: YouBurst): YouBurst {
  return { ...burst, lilyHops: 2 };
}

function handoff(burst: YouBurst): { burst: YouBurst; next: "you" | "them" } {
  if (burst.napPending) {
    return { burst: { ...burst, napPending: false, napUsed: true }, next: "you" };
  }
  return { burst, next: "them" };
}

export function endYouTurn(
  burst: YouBurst,
  opts: { tookLily?: boolean } = {},
): { burst: YouBurst; next: "you" | "them" } {
  let b = { ...burst };
  if (opts.tookLily) {
    b = takeLily(b);
    if (b.openingHops > 0) b = { ...b, openingHops: b.openingHops - 1 };
    if (b.lilyHops > 0 || b.openingHops > 0) return { burst: b, next: "you" };
    return handoff(b);
  }
  if (b.lilyHops > 0) {
    b = { ...b, lilyHops: b.lilyHops - 1 };
    if (b.lilyHops > 0 || b.openingHops > 0) return { burst: b, next: "you" };
    return handoff(b);
  }
  if (b.openingHops > 0) {
    b = { ...b, openingHops: b.openingHops - 1 };
    if (b.openingHops > 0) return { burst: b, next: "you" };
    return handoff(b);
  }
  return handoff(b);
}
