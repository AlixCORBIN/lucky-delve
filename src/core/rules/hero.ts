import { BALANCE } from '../../content/balance';
import type { GameEvent, GameState, Hero, Phase } from './types';

export const karmaFull = (hero: Hero): boolean => hero.karma >= BALANCE.karma.max;

export const canPay = (state: GameState, cost: number): boolean => state.hero.clovers >= cost;

export function pay(state: GameState, cost: number): GameState {
  return { ...state, hero: { ...state.hero, clovers: state.hero.clovers - cost } };
}

export function emit(state: GameState, ...events: GameEvent[]): GameState {
  return { ...state, events: [...state.events, ...events] };
}

export function setPhase(state: GameState, phase: Phase): GameState {
  // Une mort pendant la résolution prime sur la phase suivante.
  if (state.phase.kind === 'over') return state;
  return { ...state, phase };
}

/** Un pari vient d'être tiré : si le Karma était plein, il a servi et retombe à 0. */
export function consumeKarma(state: GameState, used: boolean): GameState {
  if (!used) return state;
  return emit({ ...state, hero: { ...state.hero, karma: 0 } }, { type: 'karmaUsed' });
}

/** Un échec remplit la jauge (anti-frustration). */
export function failKarma(state: GameState): GameState {
  if (karmaFull(state.hero)) return state;
  return emit({ ...state, hero: { ...state.hero, karma: state.hero.karma + 1 } }, { type: 'karmaGain' });
}

export function damage(state: GameState, amount: number): GameState {
  if (amount <= 0) return state;
  const hp = Math.max(0, state.hero.hp - amount);
  const next = emit({ ...state, hero: { ...state.hero, hp } }, { type: 'damage', amount });
  return hp === 0 ? { ...next, phase: { kind: 'over', victory: false } } : next;
}

export function heal(state: GameState, amount: number): GameState {
  const hp = Math.min(state.hero.maxHp, state.hero.hp + amount);
  return emit({ ...state, hero: { ...state.hero, hp } }, { type: 'heal', amount: hp - state.hero.hp });
}

export function gainGold(state: GameState, amount: number): GameState {
  return emit({ ...state, hero: { ...state.hero, gold: state.hero.gold + amount } }, { type: 'gold', amount });
}

export function gainClovers(state: GameState, amount: number): GameState {
  return emit({ ...state, hero: { ...state.hero, clovers: state.hero.clovers + amount } }, { type: 'clover', amount });
}
