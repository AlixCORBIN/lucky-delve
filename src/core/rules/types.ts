import type { LootKind, Rarity } from '../../content/loot';
import type { MonsterId } from '../../content/monsters';
import type { RoomKind } from '../../content/rooms';
import type { Die, Guess } from '../destin';
import type { RngStreams } from '../rng';

export interface Tile {
  readonly x: number;
  readonly y: number;
}

/** room = salle cachée « ? » ; cleared = salle déjà résolue. */
export type Cell = 'floor' | 'room' | 'clover' | 'exit' | 'cleared';

export interface Floor {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly Cell[];
  readonly start: Tile;
  readonly exit: Tile;
}

export interface Hero {
  readonly hp: number;
  readonly maxHp: number;
  readonly gold: number;
  readonly clovers: number;
  readonly karma: number;
  readonly dice: readonly Die[];
}

export type Slot = 'attack' | 'guard';

export interface Enemy {
  readonly id: MonsterId;
  readonly hp: number;
  readonly maxHp: number;
  readonly boss: boolean;
}

export type Phase =
  | { readonly kind: 'explore'; readonly roll: readonly number[] | null; readonly rerolled: boolean }
  | {
      readonly kind: 'roomWheel';
      readonly removed: readonly number[];
      readonly result: number | null;
      readonly nudged: boolean;
      readonly respun: boolean;
    }
  | {
      readonly kind: 'combat';
      readonly enemy: Enemy;
      readonly hand: readonly number[] | null;
      readonly slots: readonly Slot[];
      readonly fleeSteps: number;
      readonly round: number;
    }
  | { readonly kind: 'loot'; readonly symbols: readonly number[] | null; readonly locked: readonly boolean[]; readonly respun: boolean }
  | { readonly kind: 'trap'; readonly roll: number | null }
  | {
      readonly kind: 'higherLower';
      readonly current: number;
      readonly deck: readonly number[];
      readonly peeked: number | null;
      readonly streak: number;
    }
  | { readonly kind: 'floorCleared' }
  | { readonly kind: 'over'; readonly victory: boolean };

export type PhaseKind = Phase['kind'];
export type PhaseOf<K extends PhaseKind> = Extract<Phase, { kind: K }>;

export type GameEvent =
  | { readonly type: 'gold'; readonly amount: number }
  | { readonly type: 'heal'; readonly amount: number }
  | { readonly type: 'damage'; readonly amount: number }
  | { readonly type: 'clover'; readonly amount: number }
  | { readonly type: 'forge'; readonly from: number; readonly to: number }
  | { readonly type: 'karmaGain' }
  | { readonly type: 'karmaUsed' }
  | { readonly type: 'enemyHit'; readonly amount: number; readonly combo: number }
  | { readonly type: 'enemyAttack'; readonly roll: number; readonly blocked: number }
  | { readonly type: 'enemyDown'; readonly id: MonsterId }
  | { readonly type: 'fled'; readonly success: boolean }
  | { readonly type: 'trap'; readonly success: boolean }
  | { readonly type: 'card'; readonly card: number; readonly success: boolean }
  | { readonly type: 'loot'; readonly rarity: Rarity; readonly kind: LootKind; readonly amount: number }
  | { readonly type: 'room'; readonly room: RoomKind };

export interface GameState {
  readonly seed: string;
  readonly rng: RngStreams;
  readonly depth: number;
  readonly floor: Floor;
  readonly pos: Tile;
  readonly hero: Hero;
  readonly phase: Phase;
  readonly turn: number;
  /** Ce qui vient de se passer, pour que l'UI l'annonce. Vidé à chaque action. */
  readonly events: readonly GameEvent[];
}

export type Action =
  | { readonly type: 'rollMove' }
  | { readonly type: 'rerollMove' }
  | { readonly type: 'pushMove'; readonly index: number; readonly delta: 1 | -1 }
  | { readonly type: 'moveHero'; readonly to: Tile }
  | { readonly type: 'removeSlice'; readonly index: number }
  | { readonly type: 'spinWheel' }
  | { readonly type: 'respinWheel' }
  | { readonly type: 'nudgeWheel'; readonly delta: 1 | -1 }
  | { readonly type: 'enterRoom' }
  | { readonly type: 'rollHand' }
  | { readonly type: 'rerollDie'; readonly index: number }
  | { readonly type: 'pushDie'; readonly index: number; readonly delta: 1 | -1 }
  | { readonly type: 'toggleSlot'; readonly index: number }
  | { readonly type: 'strike' }
  | { readonly type: 'setFleeSteps'; readonly steps: number }
  | { readonly type: 'flee' }
  | { readonly type: 'spinReels' }
  | { readonly type: 'toggleLock'; readonly index: number }
  | { readonly type: 'respinReels' }
  | { readonly type: 'takeLoot' }
  | { readonly type: 'rollTrap' }
  | { readonly type: 'rerollTrap' }
  | { readonly type: 'pushTrap'; readonly delta: 1 | -1 }
  | { readonly type: 'resolveTrap' }
  | { readonly type: 'peekCard' }
  | { readonly type: 'guessCard'; readonly guess: Guess }
  | { readonly type: 'cashOut' }
  | { readonly type: 'nextFloor' }
  | { readonly type: 'newRun'; readonly seed: string };
