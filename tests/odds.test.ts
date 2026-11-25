import { describe, expect, it } from 'vitest';
import { dieOutcomes, draw, oddsOf, standardDie, type Outcome } from '../src/core/destin';
import { createRng, type RngState } from '../src/core/rng';

function frequencies<T>(rng: RngState, outcomes: Outcome<T>[], n: number): Map<T, number> {
  const counts = new Map<T, number>();
  let s = rng;
  for (let i = 0; i < n; i++) {
    const [v, next] = draw(s, outcomes);
    counts.set(v, (counts.get(v) ?? 0) + 1);
    s = next;
  }
  return counts;
}

describe('destin', () => {
  it('les chances affichées correspondent aux tirages (roue pondérée)', () => {
    const wheel: Outcome<string>[] = [
      { value: 'combat', weight: 5 },
      { value: 'trésor', weight: 3 },
      { value: 'piège', weight: 2 },
    ];
    const n = 60000;
    const counts = frequencies(createRng('roue', 'map'), wheel, n);
    for (const { value, probability } of oddsOf(wheel)) {
      expect((counts.get(value) ?? 0) / n).toBeCloseTo(probability, 2);
    }
  });

  it('un d6 standard donne 1/6 par face', () => {
    const odds = oddsOf(dieOutcomes(standardDie(6)));
    expect(odds).toHaveLength(6);
    for (const o of odds) expect(o.probability).toBeCloseTo(1 / 6, 10);
  });

  it('un poids nul n’est jamais tiré', () => {
    const counts = frequencies(createRng('zero', 'loot'), [
      { value: 'a', weight: 1 },
      { value: 'b', weight: 0 },
    ], 5000);
    expect(counts.get('b')).toBeUndefined();
  });

  it('refuse un pari sans issue', () => {
    expect(() => oddsOf([{ value: 'x', weight: 0 }])).toThrow();
  });

  it('même seed = même tirage', () => {
    const die = dieOutcomes(standardDie(20));
    expect(draw(createRng('s', 'combat'), die)[0]).toBe(draw(createRng('s', 'combat'), die)[0]);
  });
});
