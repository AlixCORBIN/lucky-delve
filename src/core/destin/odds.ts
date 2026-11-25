import { nextFloat, type RngState } from '../rng';

// Règle d'or du moteur Destin : les chances affichées au joueur (oddsOf) et le
// tirage (draw) passent par la même normalisation. Ce qui est affiché est ce qui est tiré.

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

/** Probabilité totale des résultats qui vérifient `test`, lue sur les mêmes chances que le tirage. */
export function chanceOf<T>(outcomes: readonly Outcome<T>[], test: (value: T) => boolean): number {
  return oddsOf(outcomes).reduce((sum, o) => (test(o.value) ? sum + o.probability : sum), 0);
}

/**
 * Karma plein : le pari est réduit à son meilleur résultat possible.
 * On transforme le pari lui-même (et pas le tirage) pour que l'affichage montre 100 %.
 */
export function withKarma<T>(outcomes: readonly Outcome<T>[], full: boolean, score: (value: T) => number): Outcome<T>[] {
  if (!full) return [...outcomes];
  const possible = outcomes.filter((o) => o.weight > 0);
  if (possible.length === 0) return [...outcomes];
  const best = Math.max(...possible.map((o) => score(o.value)));
  return possible.filter((o) => score(o.value) === best);
}

/** Index uniforme dans [0, n). */
export function drawIndex(rng: RngState, n: number): [number, RngState] {
  return draw(rng, Array.from({ length: n }, (_, i) => ({ value: i, weight: 1 })));
}
