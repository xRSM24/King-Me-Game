import type { BoardSetup } from "./types.ts";

/** Later boards field more black men than notches can ever match. */
export function boardSpec(index: number, extraYou: number, openKing: boolean): BoardSetup {
  const table: Omit<BoardSetup, "openKing">[] = [
    { you: 3, them: 3, youRows: [7, 6], themRows: [0, 1], themKings: 0 },
    { you: 4, them: 5, youRows: [7, 6], themRows: [0, 1], themKings: 0 },
    { you: 4, them: 6, youRows: [7, 6, 5], themRows: [0, 1, 2], themKings: 1 },
    { you: 5, them: 8, youRows: [7, 6, 5], themRows: [0, 1, 2], themKings: 1 },
    { you: 6, them: 9, youRows: [7, 6, 5], themRows: [0, 1, 2], themKings: 1 },
    { you: 6, them: 11, youRows: [7, 6, 5], themRows: [0, 1, 2], themKings: 2 },
  ];
  const base = table[Math.min(index, table.length - 1)]!;
  return {
    ...base,
    you: base.you + extraYou,
    openKing,
  };
}
