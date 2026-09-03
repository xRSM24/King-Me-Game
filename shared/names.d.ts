export const NAME_MAX: number;
export function foldName(raw: string): string;
export function isBlockedName(raw: string): boolean;
export function tidyName(raw: string): string;
export function tryName(raw: string): string | null;
export function nameProblem(raw: string): string | null;
export function sanitizeName(raw: string): string;
