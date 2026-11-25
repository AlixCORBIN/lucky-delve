import { BALANCE } from '../content/balance';
import { standardDie } from './destin';
import { rollHand, rerollDie, pushDie, toggleSlot, strike, setFleeSteps, flee } from './rules/combat';
import {
  enterRoom,
  explorePhase,
  moveHero,
  nudgeRoomWheel,
  pushMove,
  removeSlice,
  respinRoomWheel,
  rerollMove,
  rollMove,
  rollTrapDie,
  spinRoomWheel,
} from './rules/explore';
import { generateFloor } from './rules/floor';
import { heal } from './rules/hero';
import { respinLoot, spinLoot, takeLoot, toggleLock } from './rules/loot';
import { cashOut, guessCard, peekCard, pushTrap, resolveTrap } from './rules/minigames';
import type { Action, GameState } from './rules/types';
import { createStreams } from './rng';

export type * from './rules/types';

export function createGame(seed: string): GameState {
  const rng = createStreams(seed);
  const [floor, map] = generateFloor(rng.map);
  const { hp, clovers, gold, dice } = BALANCE.hero;
  return {
    seed,
    rng: { ...rng, map },
    depth: 1,
    floor,
    pos: floor.start,
    hero: { hp, maxHp: hp, gold, clovers, karma: 0, dice: dice.map((sides) => standardDie(sides)) },
    phase: explorePhase(),
    turn: 0,
    events: [],
  };
}

function nextFloor(state: GameState): GameState {
  const [floor, map] = generateFloor(state.rng.map);
  const next: GameState = { ...state, rng: { ...state.rng, map }, depth: state.depth + 1, floor, pos: floor.start, phase: explorePhase() };
  return heal(next, BALANCE.bossHealBetweenFloors);
}

/** Réducteur pur : une action invalide dans la phase courante renvoie l'état tel quel. */
export function reduce(previous: GameState, action: Action): GameState {
  if (action.type === 'newRun') return createGame(action.seed);
  const state: GameState = previous.events.length ? { ...previous, events: [] } : previous;
  const { phase } = state;
  let next = state;
  switch (phase.kind) {
    case 'explore':
      if (action.type === 'rollMove') next = rollMove(state, phase);
      else if (action.type === 'rerollMove') next = rerollMove(state, phase);
      else if (action.type === 'pushMove') next = pushMove(state, phase, action.index, action.delta);
      else if (action.type === 'moveHero') next = moveHero(state, action.to);
      break;
    case 'roomWheel':
      if (action.type === 'removeSlice') next = removeSlice(state, phase, action.index);
      else if (action.type === 'spinWheel') next = spinRoomWheel(state, phase);
      else if (action.type === 'respinWheel') next = respinRoomWheel(state, phase);
      else if (action.type === 'nudgeWheel') next = nudgeRoomWheel(state, phase, action.delta);
      else if (action.type === 'enterRoom') next = enterRoom(state, phase);
      break;
    case 'combat':
      if (action.type === 'rollHand') next = rollHand(state, phase);
      else if (action.type === 'rerollDie') next = rerollDie(state, phase, action.index);
      else if (action.type === 'pushDie') next = pushDie(state, phase, action.index, action.delta);
      else if (action.type === 'toggleSlot') next = toggleSlot(state, phase, action.index);
      else if (action.type === 'strike') next = strike(state, phase);
      else if (action.type === 'setFleeSteps') next = setFleeSteps(state, phase, action.steps);
      else if (action.type === 'flee') next = flee(state, phase);
      break;
    case 'loot':
      if (action.type === 'spinReels') next = spinLoot(state, phase);
      else if (action.type === 'toggleLock') next = toggleLock(state, phase, action.index);
      else if (action.type === 'respinReels') next = respinLoot(state, phase);
      else if (action.type === 'takeLoot') next = takeLoot(state, phase);
      break;
    case 'trap':
      if (action.type === 'rollTrap') next = rollTrapDie(state, false);
      else if (action.type === 'rerollTrap') next = rollTrapDie(state, true);
      else if (action.type === 'pushTrap') next = pushTrap(state, phase, action.delta);
      else if (action.type === 'resolveTrap') next = resolveTrap(state, phase);
      break;
    case 'higherLower':
      if (action.type === 'peekCard') next = peekCard(state, phase);
      else if (action.type === 'guessCard') next = guessCard(state, phase, action.guess);
      else if (action.type === 'cashOut') next = cashOut(state);
      break;
    case 'floorCleared':
      if (action.type === 'nextFloor') next = nextFloor(state);
      break;
    case 'over':
      break;
  }
  return next === state ? previous : next;
}
