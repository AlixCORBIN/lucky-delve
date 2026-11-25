import { describe, expect, it } from 'vitest';
import { ROOM_WHEEL } from '../src/content/rooms';
import {
  chanceOf,
  coinOutcomes,
  dieOutcomes,
  drawCard,
  flipCoin,
  guessChance,
  guessOutcomes,
  oddsOf,
  reelOutcomes,
  rollDice,
  rollDie,
  spinReels,
  spinWheel,
  standardDie,
  sumOdds,
  wheelOutcomes,
  wins,
  nudgeWheel,
  pushValue,
} from '../src/core/destin';
import { createRng, type RngState } from '../src/core/rng';
import { REELS } from '../src/core/rules/loot';
import { roomScore } from '../src/core/rules/explore';
import { enemyAttackOdds, enemyDice } from '../src/core/rules/combat';

const N = 40000;

function sample<T>(n: number, rng: RngState, once: (s: RngState) => [T, RngState]): Map<T, number> {
  const counts = new Map<T, number>();
  let s = rng;
  for (let i = 0; i < n; i++) {
    const [v, next] = once(s);
    counts.set(v, (counts.get(v) ?? 0) + 1);
    s = next;
  }
  return counts;
}

// Tolérance statistique : 4,5 écarts-types (un faux échec tous les ~150 000 contrôles).
function expectMatches<T>(counts: Map<T, number>, odds: { value: T; probability: number }[], n = N): void {
  for (const { value, probability } of odds) {
    const sigma = Math.sqrt((probability * (1 - probability)) / n);
    expect(Math.abs((counts.get(value) ?? 0) / n - probability)).toBeLessThanOrEqual(4.5 * sigma + 1e-12);
  }
}

describe('paris : chances affichées = tirages', () => {
  it('somme de dés (jet de déplacement 2d4)', () => {
    const dice = [standardDie(4), standardDie(4)];
    const counts = sample(N, createRng('move', 'map'), (s) => {
      const [v, n] = rollDice(s, dice);
      return [v[0]! + v[1]!, n];
    });
    expectMatches(counts, sumOdds(dice));
    expect(sumOdds(dice).find((o) => o.value === 5)?.probability).toBeCloseTo(4 / 16, 10);
  });

  it('dé pipé (faces modifiées)', () => {
    const die = { faces: [4, 2, 3, 4, 5, 6] };
    const counts = sample(N, createRng('pipe', 'combat'), (s) => rollDie(s, die));
    const odds = oddsOf(dieOutcomes(die));
    expect(chanceOf(dieOutcomes(die), (v) => v === 4)).toBeCloseTo(2 / 6, 10);
    expectMatches(counts, odds.filter((o, i, all) => all.findIndex((x) => x.value === o.value) === i).map((o) => ({ value: o.value, probability: chanceOf(dieOutcomes(die), (v) => v === o.value) })));
  });

  it('attaque ennemie (dés + bonus)', () => {
    const enemy = { id: 'ratKing' as const, hp: 1, maxHp: 1, boss: true };
    const counts = sample(N, createRng('enemy', 'combat'), (s) => {
      const [v, n] = rollDice(s, enemyDice(enemy));
      return [v.reduce((a, b) => a + b, 0) + 1, n];
    });
    expectMatches(counts, enemyAttackOdds(enemy));
  });

  it('roue de salle avec une part retirée', () => {
    const removed = [2];
    const outcomes = wheelOutcomes(ROOM_WHEEL, removed, false, roomScore);
    const counts = sample(N, createRng('roue', 'map'), (s) => spinWheel(s, ROOM_WHEEL, removed, false, roomScore));
    expectMatches(counts, oddsOf(outcomes));
    expect(counts.get(2)).toBeUndefined();
  });

  it('rouleaux de la machine à sous, un rouleau bloqué', () => {
    const scores = [() => 0, () => 0, () => 0];
    let s = createRng('slots', 'loot');
    const counts = [new Map<number, number>(), new Map<number, number>()];
    for (let i = 0; i < N; i++) {
      const [symbols, next] = spinReels(s, REELS, [9, 9, 2], [false, false, true], false, scores);
      expect(symbols[2]).toBe(2);
      counts[0]!.set(symbols[0]!, (counts[0]!.get(symbols[0]!) ?? 0) + 1);
      counts[1]!.set(symbols[1]!, (counts[1]!.get(symbols[1]!) ?? 0) + 1);
      s = next;
    }
    expectMatches(counts[0]!, oddsOf(reelOutcomes(REELS[0]!, false, () => 0)));
    expectMatches(counts[1]!, oddsOf(reelOutcomes(REELS[1]!, false, () => 0)));
  });

  it('plus haut / plus bas sur le paquet restant', () => {
    const deck = [1, 2, 3, 7, 7, 9, 12, 13];
    const current = 7;
    const shown = guessChance(deck, current, 'higher', false);
    expect(shown).toBeCloseTo(3 / 8, 10);
    const counts = sample(N, createRng('cards', 'minigame'), (s) => {
      const [card, n] = drawCard(s, guessOutcomes(deck, current, 'higher', false));
      return [wins('higher', current, card), n];
    });
    expectMatches(counts, [{ value: true, probability: shown }]);
  });

  it('pièce truquée de la fuite', () => {
    const outcomes = coinOutcomes(80, 50, false);
    const counts = sample(N, createRng('coin', 'combat'), (s) => flipCoin(s, outcomes));
    expectMatches(counts, oddsOf(outcomes));
  });
});

describe('Karma plein : le meilleur résultat à 100 %', () => {
  it('dé', () => {
    expect(oddsOf(dieOutcomes(standardDie(6), true))).toEqual([{ value: 6, probability: 1 }]);
  });
  it('roue : la meilleure part restante', () => {
    const odds = oddsOf(wheelOutcomes(ROOM_WHEEL, [1], true, roomScore));
    expect(odds).toHaveLength(1);
    expect(ROOM_WHEEL[odds[0]!.value]?.value).toBe('spring');
  });
  it('cartes : seules les gagnantes restent, sauf si aucune ne gagne', () => {
    expect(guessChance([1, 2, 9], 5, 'higher', true)).toBe(1);
    expect(guessChance([1, 2], 5, 'higher', true)).toBe(0);
  });
  it('pièce', () => {
    expect(chanceOf(coinOutcomes(1, 99, true), (v) => v)).toBe(1);
  });
});

describe('influences', () => {
  it('poussée bornée par les faces', () => {
    expect(pushValue(standardDie(6), 6, 1)).toBe(6);
    expect(pushValue(standardDie(6), 1, -1)).toBe(1);
    expect(pushValue(standardDie(6), 3, 1)).toBe(4);
  });
  it('poussée de roue saute les parts retirées', () => {
    expect(nudgeWheel(5, [1], 0, 1)).toBe(2);
    expect(nudgeWheel(5, [], 0, -1)).toBe(4);
  });
});
