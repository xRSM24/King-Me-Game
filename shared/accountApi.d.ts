export const HISTORY_CAP: number;
export const HOP_KINDS: Set<string>;

export interface AccountStore {
  getJSON(key: string): Promise<unknown>;
  setJSON(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export function emptyStats(): Record<string, unknown>;
export function todayUtc(): string;
export function tidyHistory(list: unknown): unknown[];
export function cleanEvent(raw: unknown): unknown;
export function mergeHistory(a: unknown, b: unknown): unknown[];
export function mergeProgress(client: unknown, server: unknown): unknown;
export function bumpStats(stats: unknown, kind: string): Record<string, unknown>;
export function handleAccount(opts: {
  op: string;
  method: string;
  body: unknown;
  auth: string;
  store: AccountStore;
}): Promise<{ status: number; body: unknown }>;
