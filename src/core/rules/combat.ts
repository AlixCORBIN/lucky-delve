import { BALANCE } from '../../content/balance';
import { MONSTERS } from '../../content/monsters';
import { coinOutcomes, flipCoin, pushValue, rollDice, rollDie, standardDie, sumOdds, type Die, type Odds } from '../destin';
import { canPay, consumeKarma, damage, emit, failKarma, gainGold, karmaFull, pay, setPhase } from './hero';
import type { Enemy, GameState, PhaseOf } from './types';

const explore = { kind: 'explore', roll: null, rerolled: false } as const;

export function enemyDice(enemy: Enemy): Die[] {
  const { count, sides } = MONSTERS[enemy.id].attack;
  return Array.from({ length: count }, () => standardDie(sides));
}

/** Chances de l'attaque ennemie, bonus inclus : lues sur les mêmes dés que le tirage. */
export function enemyAttackOdds(enemy: Enemy): Odds<number>[] {
  const { bonus } = MONSTERS[enemy.id].attack;
  return sumOdds(enemyDice(enemy)).map((o) => ({ value: o.value + bonus, probability: o.probability }));
}

/** Combos façon poker sur les dés d'attaque : brelan ×2, paire ×1,5. */
export function comboOf(values: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const best = Math.max(0, ...counts.values());
  if (best >= 3) return BALANCE.combat.combos.triple;
  if (best === 2) return BALANCE.combat.combos.pair;
  return 1;
}

export function strikePreview(phase: PhaseOf<'combat'>): { attack: number; guard: number; combo: number } {
  const hand = phase.hand ?? [];
  const atk = hand.filter((_, i) => phase.slots[i] === 'attack');
  const guard = hand.filter((_, i) => phase.slots[i] === 'guard').reduce((a, b) => a + b, 0);
  const combo = comboOf(atk);
  return { attack: Math.floor(atk.reduce((a, b) => a + b, 0) * combo), guard, combo };
}

export function rollHand(state: GameState, phase: PhaseOf<'combat'>): GameState {
  if (phase.hand) return state;
  const full = karmaFull(state.hero);
  const [hand, combat] = rollDice(state.rng.combat, state.hero.dice, full);
  const slots = hand.map(() => 'attack' as const);
  return consumeKarma({ ...state, rng: { ...state.rng, combat }, phase: { ...phase, hand, slots } }, full);
}

export function rerollDie(state: GameState, phase: PhaseOf<'combat'>, index: number): GameState {
  const die = state.hero.dice[index];
  if (!phase.hand || !die || !canPay(state, BALANCE.costs.reroll)) return state;
  const paid = pay(state, BALANCE.costs.reroll);
  const full = karmaFull(paid.hero);
  const [value, combat] = rollDie(paid.rng.combat, die, full);
  const hand = phase.hand.map((v, i) => (i === index ? value : v));
  return consumeKarma({ ...paid, rng: { ...paid.rng, combat }, phase: { ...phase, hand } }, full);
}

export function pushDie(state: GameState, phase: PhaseOf<'combat'>, index: number, delta: 1 | -1): GameState {
  const die = state.hero.dice[index];
  const value = phase.hand?.[index];
  if (!phase.hand || !die || value === undefined || !canPay(state, BALANCE.costs.push)) return state;
  const pushed = pushValue(die, value, delta);
  if (pushed === value) return state;
  return { ...pay(state, BALANCE.costs.push), phase: { ...phase, hand: phase.hand.map((v, i) => (i === index ? pushed : v)) } };
}

export function toggleSlot(state: GameState, phase: PhaseOf<'combat'>, index: number): GameState {
  if (!phase.hand || phase.slots[index] === undefined) return state;
  const slots = phase.slots.map((s, i) => (i === index ? (s === 'attack' ? 'guard' : 'attack') : s));
  return { ...state, phase: { ...phase, slots } };
}

function enemyTurn(state: GameState, phase: PhaseOf<'combat'>, guard: number): GameState {
  const bonus = MONSTERS[phase.enemy.id].attack.bonus;
  const [rolls, combat] = rollDice(state.rng.combat, enemyDice(phase.enemy));
  const roll = rolls.reduce((a, b) => a + b, 0) + bonus;
  const blocked = Math.min(guard, roll);
  let s = emit({ ...state, rng: { ...state.rng, combat } }, { type: 'enemyAttack', roll, blocked });
  if (roll - blocked > 0) s = failKarma(damage(s, roll - blocked));
  return setPhase(s, { ...phase, hand: null, slots: [], round: phase.round + 1 });
}

export function strike(state: GameState, phase: PhaseOf<'combat'>): GameState {
  if (!phase.hand) return state;
  const { attack, guard, combo } = strikePreview(phase);
  const hp = Math.max(0, phase.enemy.hp - attack);
  const enemy = { ...phase.enemy, hp };
  const s = emit(state, { type: 'enemyHit', amount: attack, combo });
  if (hp > 0) return enemyTurn(s, { ...phase, enemy }, guard);
  const won = gainGold(emit(s, { type: 'enemyDown', id: enemy.id }), MONSTERS[enemy.id].gold);
  if (!enemy.boss) return setPhase(won, explore);
  const last = won.depth >= BALANCE.floor.count;
  return setPhase(won, last ? { kind: 'over', victory: true } : { kind: 'floorCleared' });
}

export function fleeCost(steps: number): number {
  return steps * BALANCE.combat.flee.stakeStep;
}

export function fleeOutcomes(state: GameState, steps: number) {
  const { win, lose, bonusPerStep } = BALANCE.combat.flee;
  return coinOutcomes(win + steps * bonusPerStep, lose, karmaFull(state.hero));
}

export function setFleeSteps(state: GameState, phase: PhaseOf<'combat'>, steps: number): GameState {
  const clamped = Math.max(0, Math.min(BALANCE.combat.flee.maxSteps, Math.floor(steps)));
  if (fleeCost(clamped) > state.hero.gold) return state;
  return { ...state, phase: { ...phase, fleeSteps: clamped } };
}

export function flee(state: GameState, phase: PhaseOf<'combat'>): GameState {
  if (phase.enemy.boss || fleeCost(phase.fleeSteps) > state.hero.gold) return state;
  const full = karmaFull(state.hero);
  const paid: GameState = { ...state, hero: { ...state.hero, gold: state.hero.gold - fleeCost(phase.fleeSteps) } };
  const [success, combat] = flipCoin(paid.rng.combat, fleeOutcomes(state, phase.fleeSteps));
  const s = consumeKarma(emit({ ...paid, rng: { ...paid.rng, combat } }, { type: 'fled', success }), full);
  if (success) return setPhase(s, explore);
  // Fuite ratée : l'ennemi frappe sans garde.
  return enemyTurn(failKarma(s), { ...phase, fleeSteps: 0 }, 0);
}

