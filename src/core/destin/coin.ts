import type { RngState } from '../rng';
import { draw, withKarma, type Outcome } from './odds';

/** Pièce à poids explicites : `win` et `lose` sont affichés tels quels. */
export function coinOutcomes(win: number, lose: number, karmaFull: boolean): Outcome<boolean>[] {
  return withKarma([{ value: true, weight: win }, { value: false, weight: lose }], karmaFull, (v) => (v ? 1 : 0));
}

export function flipCoin(rng: RngState, outcomes: readonly Outcome<boolean>[]): [boolean, RngState] {
  return draw(rng, outcomes);
}
