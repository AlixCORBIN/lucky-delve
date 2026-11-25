import { BALANCE } from '../../content/balance';
import { FLOOR_BOSSES, FLOOR_MONSTERS, MONSTERS, type MonsterId } from '../../content/monsters';
import { ROOM_SCORE, ROOM_WHEEL, type RoomKind } from '../../content/rooms';
import { drawIndex, nudgeWheel, pushValue, rollDice, rollDie, spinWheel, standardDie, type Die } from '../destin';
import { cellAt, reachable, sameTile, setCell } from './floor';
import { canPay, consumeKarma, emit, gainClovers, heal, karmaFull, pay, setPhase } from './hero';
import { startHigherLower } from './minigames';
import type { Enemy, GameState, PhaseOf, Tile } from './types';

export const moveDice = (): Die[] => BALANCE.moveDice.map((sides) => standardDie(sides));
export const moveTotal = (roll: readonly number[]): number => roll.reduce((a, b) => a + b, 0);

/** Cases atteignables avec le jet en cours (vide tant qu'on n'a pas lancé). */
export function moveTargets(state: GameState): Tile[] {
  const { phase } = state;
  if (phase.kind !== 'explore' || !phase.roll) return [];
  return reachable(state.floor, state.pos, moveTotal(phase.roll));
}

// Le jet de déplacement n'utilise pas le Karma : il n'y a pas de « meilleur » déplacement.
export function rollMove(state: GameState, phase: PhaseOf<'explore'>): GameState {
  if (phase.roll) return state;
  const [roll, map] = rollDice(state.rng.map, moveDice());
  return { ...state, rng: { ...state.rng, map }, phase: { ...phase, roll } };
}

export function rerollMove(state: GameState, phase: PhaseOf<'explore'>): GameState {
  if (!phase.roll || phase.rerolled || !canPay(state, BALANCE.costs.reroll)) return state;
  const [roll, map] = rollDice(state.rng.map, moveDice());
  return { ...pay(state, BALANCE.costs.reroll), rng: { ...state.rng, map }, phase: { ...phase, roll, rerolled: true } };
}

export function pushMove(state: GameState, phase: PhaseOf<'explore'>, index: number, delta: 1 | -1): GameState {
  const die = moveDice()[index];
  const value = phase.roll?.[index];
  if (!phase.roll || !die || value === undefined || !canPay(state, BALANCE.costs.push)) return state;
  const pushed = pushValue(die, value, delta);
  if (pushed === value) return state;
  const roll = phase.roll.map((v, i) => (i === index ? pushed : v));
  return { ...pay(state, BALANCE.costs.push), phase: { ...phase, roll } };
}

export function moveHero(state: GameState, to: Tile): GameState {
  if (!moveTargets(state).some((t) => sameTile(t, to))) return state;
  const moved: GameState = { ...state, pos: { x: to.x, y: to.y }, turn: state.turn + 1 };
  switch (cellAt(state.floor, to)) {
    case 'room':
      return { ...moved, floor: setCell(state.floor, to, 'cleared'), phase: { kind: 'roomWheel', removed: [], result: null, nudged: false, respun: false } };
    case 'clover':
      return { ...gainClovers({ ...moved, floor: setCell(state.floor, to, 'floor') }, BALANCE.clover.gain), phase: explorePhase() };
    case 'exit':
      return startCombat(moved, FLOOR_BOSSES[state.depth - 1] ?? 'croupier', true);
    default:
      return { ...moved, phase: explorePhase() };
  }
}

export const explorePhase = (): PhaseOf<'explore'> => ({ kind: 'explore', roll: null, rerolled: false });

export const roomScore = (kind: RoomKind): number => ROOM_SCORE[kind];

export function removeSlice(state: GameState, phase: PhaseOf<'roomWheel'>, index: number): GameState {
  const left = ROOM_WHEEL.length - phase.removed.length;
  if (phase.result !== null || phase.removed.includes(index) || left <= 1 || !ROOM_WHEEL[index]) return state;
  if (!canPay(state, BALANCE.costs.removeSlice)) return state;
  return { ...pay(state, BALANCE.costs.removeSlice), phase: { ...phase, removed: [...phase.removed, index] } };
}

function spin(state: GameState, phase: PhaseOf<'roomWheel'>): GameState {
  const full = karmaFull(state.hero);
  const [result, map] = spinWheel(state.rng.map, ROOM_WHEEL, phase.removed, full, roomScore);
  return consumeKarma({ ...state, rng: { ...state.rng, map }, phase: { ...phase, result } }, full);
}

export function spinRoomWheel(state: GameState, phase: PhaseOf<'roomWheel'>): GameState {
  return phase.result === null ? spin(state, phase) : state;
}

export function respinRoomWheel(state: GameState, phase: PhaseOf<'roomWheel'>): GameState {
  if (phase.result === null || phase.respun || !canPay(state, BALANCE.costs.respinWheel)) return state;
  return spin(pay(state, BALANCE.costs.respinWheel), { ...phase, respun: true });
}

export function nudgeRoomWheel(state: GameState, phase: PhaseOf<'roomWheel'>, delta: 1 | -1): GameState {
  if (phase.result === null || phase.nudged || !canPay(state, BALANCE.costs.nudgeWheel)) return state;
  const result = nudgeWheel(ROOM_WHEEL.length, phase.removed, phase.result, delta);
  return { ...pay(state, BALANCE.costs.nudgeWheel), phase: { ...phase, result, nudged: true } };
}

export function enterRoom(state: GameState, phase: PhaseOf<'roomWheel'>): GameState {
  const room = phase.result === null ? undefined : ROOM_WHEEL[phase.result]?.value;
  if (!room) return state;
  const s = emit(state, { type: 'room', room });
  switch (room) {
    case 'monster': {
      const pool = FLOOR_MONSTERS[s.depth - 1] ?? FLOOR_MONSTERS[0] ?? [];
      const [pick, combat] = drawIndex(s.rng.combat, pool.length);
      return startCombat({ ...s, rng: { ...s.rng, combat } }, pool[pick] ?? 'slime', false);
    }
    case 'treasure':
      return { ...s, phase: { kind: 'loot', symbols: null, locked: [false, false, false], respun: false } };
    case 'trap':
      return { ...s, phase: { kind: 'trap', roll: null } };
    case 'higherLower':
      return startHigherLower(s);
    case 'spring':
      return setPhase(heal(s, BALANCE.spring.heal), explorePhase());
  }
}

export function startCombat(state: GameState, id: MonsterId, boss: boolean): GameState {
  const hp = MONSTERS[id].hp;
  const enemy: Enemy = { id, hp, maxHp: hp, boss };
  return { ...state, phase: { kind: 'combat', enemy, hand: null, slots: [], fleeSteps: 0, round: 1 } };
}

export const trapDie = (): Die => standardDie(BALANCE.trap.die);

export function rollTrapDie(state: GameState, reroll: boolean): GameState {
  const { phase } = state;
  if (phase.kind !== 'trap' || (phase.roll === null) === reroll) return state;
  if (reroll && !canPay(state, BALANCE.costs.reroll)) return state;
  const paid = reroll ? pay(state, BALANCE.costs.reroll) : state;
  const full = karmaFull(paid.hero);
  const [roll, minigame] = rollDie(paid.rng.minigame, trapDie(), full);
  return consumeKarma({ ...paid, rng: { ...paid.rng, minigame }, phase: { kind: 'trap', roll } }, full);
}
