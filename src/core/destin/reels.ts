import type { RngState } from '../rng';
import { draw, withKarma, type Outcome } from './odds';

// Machine à sous : chaque rouleau est un pari indépendant, ses symboles et leurs
// poids sont affichés tels quels. Un rouleau bloqué garde son symbole et n'est pas tiré.

export type Reel = readonly Outcome<number>[];

export function reelOutcomes(reel: Reel, karmaFull: boolean, score: (symbol: number) => number): Outcome<number>[] {
  return withKarma(reel, karmaFull, score);
}

export function spinReels(
  rng: RngState,
  reels: readonly Reel[],
  current: readonly number[] | null,
  locked: readonly boolean[],
  karmaFull: boolean,
  scores: readonly ((symbol: number) => number)[],
): [number[], RngState] {
  const result: number[] = [];
  let s = rng;
  reels.forEach((reel, i) => {
    const kept = current?.[i];
    if (locked[i] && kept !== undefined) {
      result.push(kept);
      return;
    }
    const [symbol, next] = draw(s, reelOutcomes(reel, karmaFull, scores[i] ?? (() => 0)));
    result.push(symbol);
    s = next;
  });
  return [result, s];
}
