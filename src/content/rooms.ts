// Roue de salle. `score` dit au Karma quelle part est la meilleure pour le joueur.
export type RoomKind = 'monster' | 'treasure' | 'trap' | 'higherLower' | 'spring';

export const ROOM_WHEEL: readonly { readonly value: RoomKind; readonly weight: number }[] = [
  { value: 'monster', weight: 4 },
  { value: 'treasure', weight: 3 },
  { value: 'trap', weight: 2 },
  { value: 'higherLower', weight: 2 },
  { value: 'spring', weight: 1 },
];

export const ROOM_SCORE: Readonly<Record<RoomKind, number>> = {
  treasure: 5,
  spring: 4,
  higherLower: 3,
  monster: 2,
  trap: 0,
};
