import { describe, expect, it } from 'vitest';
import { createRng, createStreams, nextFloat, type RngState } from '../src/core/rng';

function sample(state: RngState, n: number): number[] {
  const out: number[] = [];
  let s = state;
  for (let i = 0; i < n; i++) {
    const [v, next] = nextFloat(s);
    out.push(v);
    s = next;
  }
  return out;
}

describe('rng', () => {
  it('même seed = même suite', () => {
    expect(sample(createRng('abc', 'map'), 20)).toEqual(sample(createRng('abc', 'map'), 20));
  });

  it('les flux sont indépendants', () => {
    const s = createStreams('abc');
    expect(sample(s.map, 5)).not.toEqual(sample(s.combat, 5));
  });

  it('seeds différentes = suites différentes', () => {
    expect(sample(createRng('a', 'loot'), 5)).not.toEqual(sample(createRng('b', 'loot'), 5));
  });

  it('reste dans [0, 1)', () => {
    for (const v of sample(createRng('bornes', 'minigame'), 10000)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('ne modifie pas l’état passé (pur)', () => {
    const s = createRng('pur', 'map');
    const copy = [...s];
    nextFloat(s);
    expect([...s]).toEqual(copy);
  });
});
