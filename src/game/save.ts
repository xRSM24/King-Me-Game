import type { Board } from "./rules.ts";
import type { BoardMods, FeltMod, Laws, Pos, Side } from "./types.ts";
import { emptyLaws, emptyMods } from "./types.ts";

const KEY = "jumpgrave-climb-v1";

export interface ClimbSave {
  v: 1;
  runSeed: number;
  pathNames: string[];
  board: SavedCell[][];
  laws: Laws;
  mods: BoardMods;
  blurb: string;
  feltMods: FeltMod[];
  hops: number;
  moves: number;
  combo: number;
  boardIndex: number;
  turn: Side;
  lock: Pos | null;
  lastRitesUsed: boolean;
  oopsLeft: number;
  snapshot: SavedCell[][] | null;
  snapshotHops: number;
  snapshotMoves: number;
  snapshotLastRites: boolean;
  idSeq: number;
  log: string[];
  offers: (keyof Laws)[];
  screen: "playing" | "pick";
}

type SavedCell = { id: number; side: Side; king: boolean } | null;

export function packBoard(board: Board): SavedCell[][] {
  return board.map((row) => row.map((c) => (c ? { id: c.id, side: c.side, king: c.king } : null)));
}

export function unpackBoard(saved: SavedCell[][]): Board {
  return saved.map((row) => row.map((c) => (c ? { id: c.id, side: c.side, king: c.king } : null)));
}

export function loadClimb(): ClimbSave | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<ClimbSave>;
    if (p.v !== 1 || !Array.isArray(p.board) || typeof p.runSeed !== "number") return null;
    return {
      v: 1,
      runSeed: p.runSeed,
      pathNames: Array.isArray(p.pathNames) ? p.pathNames.map(String) : [],
      board: p.board,
      laws: { ...emptyLaws(), ...(p.laws ?? {}) },
      mods: {
        ...emptyMods(),
        ...(p.mods ?? {}),
        holes: Array.isArray(p.mods?.holes) ? p.mods.holes : [],
      },
      blurb: typeof p.blurb === "string" ? p.blurb : "",
      feltMods: Array.isArray(p.feltMods)
        ? p.feltMods.filter((m): m is { title: string; desc: string } => !!m && typeof m.title === "string")
        : [],
      hops: Number(p.hops) || 0,
      moves: Number(p.moves) || 0,
      combo: Number(p.combo) || 0,
      boardIndex: Number(p.boardIndex) || 0,
      turn: p.turn === "them" ? "them" : "you",
      lock: p.lock && typeof p.lock.r === "number" ? p.lock : null,
      lastRitesUsed: !!p.lastRitesUsed,
      oopsLeft: typeof p.oopsLeft === "number" ? p.oopsLeft : 1,
      snapshot: Array.isArray(p.snapshot) ? p.snapshot : null,
      snapshotHops: Number(p.snapshotHops) || 0,
      snapshotMoves: Number(p.snapshotMoves) || 0,
      snapshotLastRites: !!p.snapshotLastRites,
      idSeq: Number(p.idSeq) || 1,
      log: Array.isArray(p.log) ? p.log.map(String).slice(0, 3) : [],
      offers: Array.isArray(p.offers) ? (p.offers as (keyof Laws)[]) : [],
      screen: p.screen === "pick" ? "pick" : "playing",
    };
  } catch {
    return null;
  }
}

export function saveClimb(data: ClimbSave): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearClimb(): void {
  localStorage.removeItem(KEY);
}

export function hasClimb(): boolean {
  return loadClimb() != null;
}
