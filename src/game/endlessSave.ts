import { packBoard, unpackBoard, type ClimbSave } from "./save.ts";
import { emptyLaws, emptyMods, type FeltMod, type Laws } from "./types.ts";

export const ENDLESS_KEY = "jumpgrave-endless-v1";

export interface EndlessSave extends ClimbSave {
  endlessRound: number;
  clears: number;
  pendingTake: keyof Laws | null;
}

export function loadEndless(): EndlessSave | null {
  try {
    const raw = localStorage.getItem(ENDLESS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<EndlessSave>;
    if (p.v !== 1 || !Array.isArray(p.board) || typeof p.runSeed !== "number") return null;

    const feltMods = Array.isArray(p.feltMods)
      ? p.feltMods.filter((m): m is FeltMod => !!m && typeof m.title === "string" && typeof m.desc === "string")
      : [];
    const size = p.board.length === 10 ? 10 : 8;
    const laws = { ...emptyLaws(), ...(p.laws ?? {}) };
    const pendingTake =
      typeof p.pendingTake === "string" && Object.hasOwn(emptyLaws(), p.pendingTake)
        ? (p.pendingTake as keyof Laws)
        : null;

    return {
      v: 1,
      runSeed: p.runSeed,
      pathNames: Array.isArray(p.pathNames) ? p.pathNames.map(String) : [],
      board: packBoard(unpackBoard(p.board)),
      laws,
      mods: {
        ...emptyMods(),
        ...(p.mods ?? {}),
        size,
        holes: Array.isArray(p.mods?.holes) ? p.mods.holes : [],
      },
      blurb: typeof p.blurb === "string" ? p.blurb : "",
      feltMods,
      hops: Number(p.hops) || 0,
      moves: Number(p.moves) || 0,
      combo: Number(p.combo) || 0,
      boardIndex: Number(p.boardIndex) || 0,
      turn: p.turn === "them" ? "them" : "you",
      lock: p.lock && typeof p.lock.r === "number" ? p.lock : null,
      lastRitesUsed: !!p.lastRitesUsed,
      oopsLeft: typeof p.oopsLeft === "number" ? p.oopsLeft : 1,
      snapshot: Array.isArray(p.snapshot) ? packBoard(unpackBoard(p.snapshot)) : null,
      snapshotMods: p.snapshotMods
        ? {
            ...emptyMods(),
            ...p.snapshotMods,
            size,
            holes: Array.isArray(p.snapshotMods.holes) ? p.snapshotMods.holes : [],
          }
        : null,
      snapshotHops: Number(p.snapshotHops) || 0,
      snapshotMoves: Number(p.snapshotMoves) || 0,
      snapshotLastRites: !!p.snapshotLastRites,
      skippedJump: !!p.skippedJump,
      quiet: Number(p.quiet) || 0,
      snapshotQuiet: Number(p.snapshotQuiet) || 0,
      idSeq: Number(p.idSeq) || 1,
      log: Array.isArray(p.log) ? p.log.map(String).slice(0, 3) : [],
      offers: Array.isArray(p.offers) ? (p.offers as (keyof Laws)[]) : [],
      screen: p.screen === "pick" ? "pick" : "playing",
      endlessRound: Math.max(1, Number(p.endlessRound) || 1),
      clears: Math.max(0, Number(p.clears) || 0),
      pendingTake,
    };
  } catch {
    return null;
  }
}

export function saveEndless(data: EndlessSave): void {
  localStorage.setItem(ENDLESS_KEY, JSON.stringify(data));
}

export function clearEndless(): void {
  localStorage.removeItem(ENDLESS_KEY);
}

export function hasEndless(): boolean {
  return loadEndless() != null;
}
