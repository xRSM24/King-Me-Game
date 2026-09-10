import type { Board } from "./rules.ts";
import { campsFromRows } from "./rules.ts";
import type { BoardMods, FeltMod, Laws, Pos, Side } from "./types.ts";
import { SIZE, emptyLaws, emptyMods } from "./types.ts";
import { climbFeltMods } from "./copy.ts";

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
  snapshotMods: BoardMods | null;
  snapshotHops: number;
  snapshotMoves: number;
  snapshotLastRites: boolean;
  skippedJump: boolean;
  quiet: number;
  snapshotQuiet: number;
  idSeq: number;
  log: string[];
  offers: (keyof Laws)[];
  screen: "playing" | "pick";
}

type SavedCell = { id: number; side: Side; king: boolean } | null;

function asRows(v: unknown, fallback: number[], size = SIZE): number[] {
  if (!Array.isArray(v)) return fallback;
  const rows = v.filter((n): n is number => typeof n === "number" && n >= 0 && n < size);
  return rows.length ? rows : fallback;
}

function campsForSave(
  raw: Partial<BoardMods> | undefined,
  feltMods: FeltMod[],
  size: number,
): Pick<BoardMods, "youKingRow" | "themKingRow" | "youHome" | "themHome"> {
  if (raw && typeof raw.youKingRow === "number" && typeof raw.themKingRow === "number") {
    return {
      youKingRow: raw.youKingRow === size - 1 ? size - 1 : 0,
      themKingRow: raw.themKingRow === 0 ? 0 : size - 1,
      youHome: asRows(raw.youHome, emptyMods().youHome, size),
      themHome: asRows(raw.themHome, emptyMods().themHome, size),
    };
  }
  if (feltMods.some((m) => m.title === "Race to the Far Row")) {
    return campsFromRows([3, 2], size === 10 ? [8, 7, 9] : [6, 5, 7], size);
  }
  return campsFromRows(size === 10 ? [9, 8] : [7, 6], [0, 1], size);
}

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
    const feltModsRaw = Array.isArray(p.feltMods)
      ? p.feltMods.filter((m): m is FeltMod => !!m && typeof m.title === "string" && typeof m.desc === "string")
      : [];
    const size = p.board.length === 10 ? 10 : SIZE;
    const pathNames = Array.isArray(p.pathNames) ? p.pathNames.map(String) : [];
    const boardIndex = Number(p.boardIndex) || 0;
    const feltMods = climbFeltMods(boardIndex, pathNames[boardIndex] ?? "", feltModsRaw);
    return {
      v: 1,
      runSeed: p.runSeed,
      pathNames,
      board: p.board,
      laws: { ...emptyLaws(), ...(p.laws ?? {}) },
      mods: {
        ...emptyMods(),
        ...(p.mods ?? {}),
        size,
        holes: Array.isArray(p.mods?.holes) ? p.mods.holes : [],
        ...campsForSave(p.mods, feltModsRaw, size),
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
      snapshot: Array.isArray(p.snapshot) ? p.snapshot : null,
      snapshotMods: p.snapshotMods
        ? {
            ...emptyMods(),
            ...p.snapshotMods,
            size,
            holes: Array.isArray(p.snapshotMods.holes) ? p.snapshotMods.holes : [],
            ...campsForSave(p.snapshotMods, feltModsRaw, size),
          }
        : null,
      snapshotHops: Number(p.snapshotHops) || 0,
      snapshotMoves: Number(p.snapshotMoves) || 0,
      snapshotLastRites: !!p.snapshotLastRites,
      snapshotQuiet: Number(p.snapshotQuiet) || 0,
      skippedJump: !!p.skippedJump,
      quiet: Number(p.quiet) || 0,
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
