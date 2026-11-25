import type { RngState } from '../rng';
import { draw, withKarma, type Outcome } from './odds';

// Roue à parts : la taille d'une part est son poids. Une part retirée garde sa place
// dans la liste (pour l'affichage) mais passe à poids nul, donc ne peut plus sortir.

export function wheelOutcomes<T>(
  slices: readonly Outcome<T>[],
  removed: readonly number[],
  karmaFull: boolean,
  score: (value: T) => number,
): Outcome<number>[] {
  const indexed = slices.map((s, i) => ({ value: i, weight: removed.includes(i) ? 0 : s.weight }));
  return withKarma(indexed, karmaFull, (i) => {
    const slice = slices[i];
    return slice ? score(slice.value) : -Infinity;
  });
}

export function spinWheel<T>(
  rng: RngState,
  slices: readonly Outcome<T>[],
  removed: readonly number[],
  karmaFull: boolean,
  score: (value: T) => number,
): [number, RngState] {
  return draw(rng, wheelOutcomes(slices, removed, karmaFull, score));
}

/** Poussée de roue : la part voisine (en sautant les parts retirées). */
export function nudgeWheel(count: number, removed: readonly number[], index: number, delta: 1 | -1): number {
  let i = index;
  for (let step = 0; step < count; step++) {
    i = (i + delta + count) % count;
    if (!removed.includes(i)) return i;
  }
  return index;
}
