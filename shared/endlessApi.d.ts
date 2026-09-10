export interface EndlessScore {
  name: string;
  rounds: number;
  at: number;
}

export declare const MAX_ENDLESS_ROUNDS: 999;
export declare const ENDLESS_LIST_CAP: 80;

export declare function sortEndlessScores(scores: EndlessScore[]): EndlessScore[];
export declare function mergeEndlessRow(
  scores: EndlessScore[],
  name: string,
  rounds: number,
  at: number,
): EndlessScore[];
