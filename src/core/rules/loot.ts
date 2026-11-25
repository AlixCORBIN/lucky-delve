import { BALANCE } from '../../content/balance';
import { LOOT_BASE, LOOT_KINDS, MULTIPLIERS, RARITIES, RARITY_POWER, REEL_SCORES, REEL_WEIGHTS, type LootKind, type Rarity } from '../../content/loot';
import { spinReels, type Die, type Reel } from '../destin';
import { canPay, consumeKarma, damage, emit, failKarma, gainClovers, gainGold, heal, karmaFull, pay, setPhase } from './hero';
import type { GameState, PhaseOf } from './types';

const explore = { kind: 'explore', roll: null, rerolled: false } as const;

export const REELS: readonly Reel[] = REEL_WEIGHTS.map((weights) => weights.map((weight, value) => ({ value, weight })));
export const LOOT_SCORES = REEL_SCORES.map((row) => (symbol: number) => row[symbol] ?? 0);

export interface LootResult {
  readonly rarity: Rarity;
  readonly kind: LootKind;
  readonly multiplier: number;
  readonly amount: number;
}

export function lootOf(symbols: readonly number[]): LootResult {
  const rarity = RARITIES[symbols[0] ?? 0] ?? 'common';
  const kind = LOOT_KINDS[symbols[1] ?? 0] ?? 'gold';
  const multiplier = MULTIPLIERS[symbols[2] ?? 0] ?? 1;
  return { rarity, kind, multiplier, amount: LOOT_BASE[kind] * RARITY_POWER[rarity] * multiplier };
}

function spin(state: GameState, phase: PhaseOf<'loot'>): GameState {
  const full = karmaFull(state.hero);
  const [symbols, loot] = spinReels(state.rng.loot, REELS, phase.symbols, phase.locked, full, LOOT_SCORES);
  return consumeKarma({ ...state, rng: { ...state.rng, loot }, phase: { ...phase, symbols } }, full);
}

export function spinLoot(state: GameState, phase: PhaseOf<'loot'>): GameState {
  return phase.symbols ? state : spin(state, phase);
}

export function toggleLock(state: GameState, phase: PhaseOf<'loot'>, index: number): GameState {
  if (!phase.symbols || phase.respun || phase.locked[index] === undefined) return state;
  return { ...state, phase: { ...phase, locked: phase.locked.map((l, i) => (i === index ? !l : l)) } };
}

/** Blocage : garder les rouleaux choisis et relancer les autres, une fois par coffre. */
export function respinLoot(state: GameState, phase: PhaseOf<'loot'>): GameState {
  if (!phase.symbols || phase.respun || phase.locked.every(Boolean) || !canPay(state, BALANCE.costs.lockRespin)) return state;
  return spin(pay(state, BALANCE.costs.lockRespin), { ...phase, respun: true });
}

/** Forge : chaque point améliore la plus petite face améliorable de la main. */
export function forge(dice: readonly Die[], points: number): { dice: Die[]; upgrades: { from: number; to: number }[] } {
  let hand = dice.map((d) => ({ faces: [...d.faces] }));
  const upgrades: { from: number; to: number }[] = [];
  for (let p = 0; p < points; p++) {
    let best: { die: number; face: number; value: number } | null = null;
    hand.forEach((d, di) => {
      const max = Math.max(...d.faces);
      d.faces.forEach((value, fi) => {
        if (value < max && (!best || value < best.value)) best = { die: di, face: fi, value };
      });
    });
    if (!best) break;
    const { die, face, value } = best;
    hand = hand.map((d, di) => (di === die ? { faces: d.faces.map((v, fi) => (fi === face ? v + 1 : v)) } : d));
    upgrades.push({ from: value, to: value + 1 });
  }
  return { dice: hand, upgrades };
}

export function takeLoot(state: GameState, phase: PhaseOf<'loot'>): GameState {
  if (!phase.symbols) return state;
  const loot = lootOf(phase.symbols);
  let s = emit(state, { type: 'loot', rarity: loot.rarity, kind: loot.kind, amount: loot.amount });
  if (loot.rarity === 'skull') return setPhase(failKarma(damage(s, BALANCE.loot.skullDamage)), explore);
  switch (loot.kind) {
    case 'gold':
      s = gainGold(s, loot.amount);
      break;
    case 'potion':
      s = heal(s, loot.amount);
      break;
    case 'clover':
      s = gainClovers(s, loot.amount);
      break;
    case 'forge': {
      const { dice, upgrades } = forge(s.hero.dice, loot.amount);
      s = emit({ ...s, hero: { ...s.hero, dice } }, ...upgrades.map((u) => ({ type: 'forge' as const, ...u })));
      break;
    }
  }
  return setPhase(s, explore);
}
