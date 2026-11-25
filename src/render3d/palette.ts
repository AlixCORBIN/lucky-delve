// Palette fixe du jeu. Le CSS de l'UI reçoit les mêmes valeurs en variables au démarrage.
export const PALETTE = {
  night: '#1f1a2e',
  shadow: '#120f1c',
  plum: '#3b2f52',
  stone: '#8a7f9e',
  mist: '#c9bfd6',
  cream: '#fff4e0',
  gold: '#f2b544',
  clover: '#5fbf6b',
  coral: '#ef6f6c',
  sky: '#6cb6e8',
  berry: '#c06bd1',
  wood: '#a8693f',
} as const;

export type PaletteColor = keyof typeof PALETTE;
