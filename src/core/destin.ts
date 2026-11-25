import { nextFloat, type RngState } from './rng';

// Le moteur Destin : seul point d'entrée du hasard du jeu.
// Règle d'or : les chances affichées au joueur (oddsOf) et le tirage (draw)
// passent par la même normalisation, donc ce qui est affiché est ce qui est tiré.

export interface Outcome<T> {
  readonly value: T;
  readonly weight: number;
}

export interface Odds<T> {
  readonly value: T;
  readonly probability: number;
}

export function oddsOf<T>(outcomes: readonly Outcome<T>[]): Odds<T>[] {
  const total = outcomes.reduce((sum, o) => sum + Math.max(0, o.weight), 0);
  if (total <= 0) throw new Error('Destin : aucun résultat possible');
  return outcomes.map((o) => ({ value: o.value, probability: Math.max(0, o.weight) / total }));
}

export function draw<T>(rng: RngState, outcomes: readonly Outcome<T>[]): [T, RngState] {
  const odds = oddsOf(outcomes);
  const [roll, next] = nextFloat(rng);
  let acc = 0;
  for (const o of odds) {
    acc += o.probability;
    if (roll < acc && o.probability > 0) return [o.value, next];
  }
  // Arrondi flottant : on retombe sur le dernier résultat possible.
  const last = [...odds].reverse().find((o) => o.probability > 0);
  if (!last) throw new Error('Destin : aucun résultat possible');
  return [last.value, next];
}

/** Un dé : chaque face est un résultat de poids 1. Les dés pipés changeront les faces, pas les poids. */
export function dieOutcomes(faces: readonly number[]): Outcome<number>[] {
  return faces.map((value) => ({ value, weight: 1 }));
}

export function standardDie(sides: number): number[] {
  return Array.from({ length: sides }, (_, i) => i + 1);
}
