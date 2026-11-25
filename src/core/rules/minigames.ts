import { BALANCE } from '../../content/balance';
import { drawCard, drawIndex, guessChance, guessOutcomes, nextCardOutcomes, pushValue, removeCard, wins, type Guess } from '../destin';
import { canPay, consumeKarma, damage, emit, failKarma, gainGold, karmaFull, pay, setPhase } from './hero';
import type { GameState, PhaseOf } from './types';

const explore = { kind: 'explore', roll: null, rerolled: false } as const;

// --- Piège : un d6 à faire au moins `need`. ---

export function pushTrap(state: GameState, phase: PhaseOf<'trap'>, delta: 1 | -1): GameState {
  if (phase.roll === null || !canPay(state, BALANCE.costs.push)) return state;
  const roll = pushValue({ faces: [1, 2, 3, 4, 5, 6].slice(0, BALANCE.trap.die) }, phase.roll, delta);
  if (roll === phase.roll) return state;
  return { ...pay(state, BALANCE.costs.push), phase: { ...phase, roll } };
}

export function resolveTrap(state: GameState, phase: PhaseOf<'trap'>): GameState {
  if (phase.roll === null) return state;
  const success = phase.roll >= BALANCE.trap.need;
  const s = emit(state, { type: 'trap', success });
  if (success) return setPhase(s, explore);
  return setPhase(failKarma(damage(s, BALANCE.trap.damage)), explore);
}

// --- Plus haut / plus bas : paquet visible, égalité perdue. ---

export function fullDeck(): number[] {
  const { deck, copies } = BALANCE.higherLower;
  return Array.from({ length: copies }, () => [...deck]).flat();
}

export function startHigherLower(state: GameState): GameState {
  const deck = fullDeck();
  const [pick, minigame] = drawIndex(state.rng.minigame, deck.length);
  const current = deck[pick] ?? 1;
  return {
    ...state,
    rng: { ...state.rng, minigame },
    phase: { kind: 'higherLower', current, deck: removeCard(deck, current), peeked: null, streak: 0 },
  };
}

/** Le paquet sur lequel porte le pari : une carte déjà vue (Coup d'œil) est la seule issue possible. */
export const betDeck = (phase: PhaseOf<'higherLower'>): readonly number[] =>
  phase.peeked === null ? phase.deck : [phase.peeked];

export const potFor = (streak: number): number => (streak <= 0 ? 0 : BALANCE.higherLower.basePot * 2 ** (streak - 1));

export function guessOdds(state: GameState, phase: PhaseOf<'higherLower'>, guess: Guess): number {
  return guessChance(betDeck(phase), phase.current, guess, karmaFull(state.hero) && phase.peeked === null);
}

export function peekCard(state: GameState, phase: PhaseOf<'higherLower'>): GameState {
  if (phase.peeked !== null || !canPay(state, BALANCE.costs.peek)) return state;
  const [peeked, minigame] = drawCard(state.rng.minigame, nextCardOutcomes(phase.deck));
  return { ...pay(state, BALANCE.costs.peek), rng: { ...state.rng, minigame }, phase: { ...phase, peeked } };
}

export function guessCard(state: GameState, phase: PhaseOf<'higherLower'>, guess: Guess): GameState {
  const full = karmaFull(state.hero) && phase.peeked === null;
  const [card, minigame] = drawCard(state.rng.minigame, guessOutcomes(betDeck(phase), phase.current, guess, full));
  const success = wins(guess, phase.current, card);
  let s = consumeKarma(emit({ ...state, rng: { ...state.rng, minigame } }, { type: 'card', card, success }), full);
  if (!success) return setPhase(failKarma(s), explore);
  const streak = phase.streak + 1;
  s = { ...s, phase: { ...phase, current: card, deck: removeCard(phase.deck, card), peeked: null, streak } };
  return streak >= BALANCE.higherLower.maxStreak ? cashOut(s) : s;
}

export function cashOut(state: GameState): GameState {
  const { phase } = state;
  if (phase.kind !== 'higherLower' || phase.streak === 0) return state;
  return setPhase(gainGold(state, potFor(phase.streak)), explore);
}
