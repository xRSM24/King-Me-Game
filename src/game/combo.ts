const NAMES = [
  "Got one!",
  "Double hop!",
  "Triple jump!",
  "Quad smash!",
  "Hop storm!",
  "Yatta storm!",
];

/** Combo is same-frog keep-jumping. A new hop after the Enemy is 1, not 2. */
export function comboAfterHop(combo: number, capture: boolean, chained: boolean): number {
  if (!capture) return 0;
  if (!chained) return 1;
  return combo + 1;
}

export function comboName(combo: number): string {
  if (combo <= 1) return NAMES[0]!;
  return NAMES[Math.min(combo, NAMES.length) - 1]!;
}

export function comboTier(combo: number): number {
  return Math.min(Math.max(combo, 1), 5);
}
