// Équilibrage central. Toute valeur de règle vit ici, jamais dans core/.

export const BALANCE = {
  hero: { hp: 24, clovers: 3, gold: 0, dice: [6, 6, 6], maxDice: 6 },
  karma: { max: 5 },
  costs: { reroll: 1, push: 1, removeSlice: 1, nudgeWheel: 1, respinWheel: 1, lockRespin: 2, peek: 1 },
  floor: { width: 7, height: 7, rooms: 9, clovers: 3, count: 3 },
  /** Dés de déplacement : 2d4 sur un étage 7×7 (2d6 du GDD est trop long pour cette taille). */
  moveDice: [4, 4],
  clover: { gain: 1 },
  spring: { heal: 6 },
  trap: { die: 6, need: 4, damage: 5 },
  combat: {
    combos: { pair: 1.5, triple: 2 },
    /** Fuite : pièce truquée par la mise. Chances = (base + mise × bonus) / (base + mise × bonus + perte). */
    flee: { win: 50, lose: 50, stakeStep: 5, bonusPerStep: 15, maxSteps: 3 },
  },
  higherLower: { deck: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], copies: 4, basePot: 4, maxStreak: 5 },
  loot: { skullDamage: 4 },
  bossHealBetweenFloors: 8,
} as const;
