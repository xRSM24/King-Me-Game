const NAMES = [
  "Got one!",
  "Double hop!",
  "Triple jump!",
  "Quad smash!",
  "Hop storm!",
  "Yatta storm!",
];

export function comboName(combo: number): string {
  if (combo <= 1) return NAMES[0]!;
  return NAMES[Math.min(combo, NAMES.length) - 1]!;
}

export function comboTier(combo: number): number {
  return Math.min(Math.max(combo, 1), 5);
}
