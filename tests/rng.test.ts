import { describe, expect, it } from 'vitest';
import { chachaBlock, createRng, createStreams, nextFloat, seedKey, type RngState } from '../src/core/rng';

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
    const copy = JSON.stringify(s);
    nextFloat(s);
    expect(JSON.stringify(s)).toBe(copy);
  });

  it('ChaCha20 respecte le vecteur de test RFC 8439 (§2.3.2)', () => {
    const key = Array.from({ length: 8 }, (_, i) => ((4 * i + 3) << 24 | (4 * i + 2) << 16 | (4 * i + 1) << 8 | 4 * i) >>> 0);
    const block = chachaBlock(key, 1, [0x09000000, 0x4a000000, 0]);
    expect(block[0]).toBe(0xe4e7f110);
    expect(block[15]).toBe(0x4e3c50a2);
  });

  it('une graine hexadécimale de 256 bits est utilisée telle quelle', () => {
    const hex = 'ff'.repeat(16) + '01'.repeat(16);
    expect(seedKey(hex)).toEqual([...Array(4).fill(0xffffffff), ...Array(4).fill(0x01010101)]);
  });

  it('une graine tapée à la main donne aussi 256 bits', () => {
    expect(seedKey('abc')).toHaveLength(8);
    expect(seedKey('abc')).not.toEqual(seedKey('abd'));
  });
});
