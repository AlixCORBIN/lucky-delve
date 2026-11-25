// Machine à sous des coffres : Rareté × Type × Multiplicateur. Les poids sont affichés tels quels.

export type Rarity = 'common' | 'rare' | 'epic' | 'skull';
export type LootKind = 'gold' | 'potion' | 'clover' | 'forge';

export const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'skull'];
export const LOOT_KINDS: readonly LootKind[] = ['gold', 'potion', 'clover', 'forge'];
export const MULTIPLIERS: readonly number[] = [1, 2, 3];

/** Poids par symbole, dans l'ordre des listes ci-dessus. */
export const REEL_WEIGHTS: readonly (readonly number[])[] = [
  [6, 3, 1, 2],
  [4, 3, 2, 2],
  [5, 3, 1],
];

export const RARITY_POWER: Readonly<Record<Rarity, number>> = { common: 1, rare: 2, epic: 3, skull: 0 };

/** Gain de base par type, multiplié par la puissance de rareté puis par le multiplicateur. */
export const LOOT_BASE: Readonly<Record<LootKind, number>> = { gold: 5, potion: 3, clover: 1, forge: 1 };

/** Préférence du Karma sur chaque rouleau (plus haut = mieux). */
export const REEL_SCORES: readonly (readonly number[])[] = [
  [1, 2, 3, 0],
  [1, 2, 3, 2],
  [1, 2, 3],
];
