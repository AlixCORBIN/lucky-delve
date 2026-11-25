import type { RngState } from '../rng';
import { draw, oddsOf, withKarma, type Odds, type Outcome } from './odds';

/** Un dé = la liste de ses faces. Un dé pipé change ses faces, jamais les poids. */
export interface Die {
  readonly faces: readonly number[];
}

export function standardDie(sides: number): Die {
  return { faces: Array.from({ length: sides }, (_, i) => i + 1) };
}

export function dieOutcomes(die: Die, karmaFull = false): Outcome<number>[] {
  return withKarma(die.faces.map((value) => ({ value, weight: 1 })), karmaFull, (v) => v);
}

export function rollDie(rng: RngState, die: Die, karmaFull = false): [number, RngState] {
  return draw(rng, dieOutcomes(die, karmaFull));
}

export function rollDice(rng: RngState, dice: readonly Die[], karmaFull = false): [number[], RngState] {
  const values: number[] = [];
  let s = rng;
  for (const die of dice) {
    const [v, next] = rollDie(s, die, karmaFull);
    values.push(v);
    s = next;
  }
  return [values, s];
}

/** Loi exacte de la somme, par convolution des chances de chaque dé (même source que le tirage). */
export function sumOdds(dice: readonly Die[], karmaFull = false): Odds<number>[] {
  let dist = new Map<number, number>([[0, 1]]);
  for (const die of dice) {
    const next = new Map<number, number>();
    for (const [total, p] of dist) {
      for (const o of oddsOf(dieOutcomes(die, karmaFull))) {
        next.set(total + o.value, (next.get(total + o.value) ?? 0) + p * o.probability);
      }
    }
    dist = next;
  }
  return [...dist.entries()].sort((a, b) => a[0] - b[0]).map(([value, probability]) => ({ value, probability }));
}

/** Poussée : décale une valeur de ±1, bornée par les faces du dé. */
export function pushValue(die: Die, value: number, delta: number): number {
  const min = Math.min(...die.faces);
  const max = Math.max(...die.faces);
  return Math.min(max, Math.max(min, value + delta));
}

export function describeDie(die: Die): string {
  const max = Math.max(...die.faces);
  const standard = die.faces.length === max && die.faces.every((f, i) => f === i + 1);
  return standard ? `d${max}` : `d[${die.faces.join(',')}]`;
}
