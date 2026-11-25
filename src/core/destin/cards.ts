import type { RngState } from '../rng';
import { chanceOf, draw, withKarma, type Outcome } from './odds';

// Cartes : le paquet restant est visible, chaque carte restante a le même poids.
// Plus haut / plus bas : une égalité est perdue (c'est l'avantage de la maison).

export type Guess = 'higher' | 'lower';

export const wins = (guess: Guess, current: number, next: number): boolean =>
  guess === 'higher' ? next > current : next < current;

export function nextCardOutcomes(deck: readonly number[]): Outcome<number>[] {
  return deck.map((value) => ({ value, weight: 1 }));
}

/** Pari sur la prochaine carte. Karma plein : seules les cartes gagnantes restent possibles. */
export function guessOutcomes(deck: readonly number[], current: number, guess: Guess, karmaFull: boolean): Outcome<number>[] {
  return withKarma(nextCardOutcomes(deck), karmaFull, (card) => (wins(guess, current, card) ? 1 : 0));
}

export function guessChance(deck: readonly number[], current: number, guess: Guess, karmaFull: boolean): number {
  return chanceOf(guessOutcomes(deck, current, guess, karmaFull), (card) => wins(guess, current, card));
}

export function drawCard(rng: RngState, outcomes: readonly Outcome<number>[]): [number, RngState] {
  return draw(rng, outcomes);
}

/** Retire une occurrence de la carte du paquet. */
export function removeCard(deck: readonly number[], card: number): number[] {
  const i = deck.indexOf(card);
  return i < 0 ? [...deck] : [...deck.slice(0, i), ...deck.slice(i + 1)];
}
