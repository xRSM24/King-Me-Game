import type { BoardSetup, Pos } from "./types.ts";

const none: Pos[] = [];

/** Each felt is a different puzzle. Later ones still outscale Stars. */
export function boardSpec(index: number, extraYou: number, openKing: boolean): BoardSetup {
  const table: Omit<BoardSetup, "openKing">[] = [
    {
      you: 3,
      them: 2,
      youRows: [7, 6],
      themRows: [0, 1],
      themKings: 0,
      holes: none,
      bounce: false,
      themFly: false,
      blurb: "Jump the star first. Captures are the fun part!",
      youPos: [
        { r: 5, c: 2 },
        { r: 7, c: 0 },
        { r: 6, c: 5 },
      ],
      themPos: [
        { r: 4, c: 3 },
        { r: 2, c: 1 },
      ],
    },
    {
      you: 4,
      them: 4,
      youRows: [2, 3],
      themRows: [5, 6],
      themKings: 0,
      holes: none,
      bounce: false,
      themFly: false,
      blurb: "Race to the far row. First crown wins the brag!",
    },
    {
      you: 4,
      them: 5,
      youRows: [7, 6],
      themRows: [0, 1],
      themKings: 0,
      holes: [
        { r: 3, c: 2 },
        { r: 3, c: 4 },
        { r: 4, c: 3 },
        { r: 4, c: 5 },
      ],
      bounce: false,
      themFly: false,
      blurb: "Holes swallow pieces. Land around them.",
    },
    {
      you: 5,
      them: 6,
      youRows: [7, 6, 5],
      themRows: [0, 1, 2],
      themKings: 1,
      holes: none,
      bounce: false,
      themFly: false,
      blurb: "Their king already has a crown. Watch it!",
    },
    {
      you: 5,
      them: 7,
      youRows: [7, 6, 5],
      themRows: [0, 1, 2],
      themKings: 1,
      holes: none,
      bounce: true,
      themFly: false,
      blurb: "Boing! Everyone may jump backward.",
    },
    {
      you: 6,
      them: 9,
      youRows: [7, 6, 5],
      themRows: [0, 1, 2],
      themKings: 2,
      holes: none,
      bounce: false,
      themFly: true,
      blurb: "The Crown's kings slide extra far. Take them all!",
    },
  ];
  const base = table[Math.min(index, table.length - 1)]!;
  return {
    ...base,
    you: base.you + extraYou,
    openKing,
  };
}
