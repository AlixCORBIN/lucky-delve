export interface MonsterDef {
  readonly id: MonsterId;
  readonly hp: number;
  /** Dé de l'attaque ennemie (faces max) et bonus fixe : « 1d6+1 ». */
  readonly attack: { readonly count: number; readonly sides: number; readonly bonus: number };
  readonly gold: number;
}

export type MonsterId = 'slime' | 'goblin' | 'skeleton' | 'bat' | 'ratKing' | 'spadeQueen' | 'croupier';

export const MONSTERS: Readonly<Record<MonsterId, MonsterDef>> = {
  slime: { id: 'slime', hp: 8, attack: { count: 1, sides: 4, bonus: 1 }, gold: 4 },
  bat: { id: 'bat', hp: 7, attack: { count: 1, sides: 6, bonus: 0 }, gold: 4 },
  goblin: { id: 'goblin', hp: 11, attack: { count: 1, sides: 6, bonus: 1 }, gold: 6 },
  skeleton: { id: 'skeleton', hp: 15, attack: { count: 1, sides: 8, bonus: 1 }, gold: 8 },
  ratKing: { id: 'ratKing', hp: 22, attack: { count: 2, sides: 4, bonus: 1 }, gold: 15 },
  spadeQueen: { id: 'spadeQueen', hp: 30, attack: { count: 2, sides: 6, bonus: 0 }, gold: 20 },
  croupier: { id: 'croupier', hp: 40, attack: { count: 2, sides: 6, bonus: 2 }, gold: 30 },
};

/** Monstres possibles par étage (index 0 = étage 1), tirés à poids égal. */
export const FLOOR_MONSTERS: readonly (readonly MonsterId[])[] = [
  ['slime', 'bat', 'goblin'],
  ['bat', 'goblin', 'skeleton'],
  ['goblin', 'skeleton', 'skeleton'],
];

export const FLOOR_BOSSES: readonly MonsterId[] = ['ratKing', 'spadeQueen', 'croupier'];
