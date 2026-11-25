export interface CreditEntry {
  readonly asset: string;
  readonly author: string;
  readonly url: string;
  readonly license: string;
}

// Miroir de CREDITS.md, affiché dans l'écran Crédits.
export const CREDITS: readonly CreditEntry[] = [
  { asset: 'Character Pack: Adventurers (chevalière)', author: 'Kay Lousberg', url: 'https://kaylousberg.itch.io/kaykit-adventurers', license: 'CC0' },
  { asset: 'Dungeon Remastered (dalle)', author: 'Kay Lousberg', url: 'https://kaylousberg.itch.io/kaykit-dungeon-remastered', license: 'CC0' },
  { asset: 'Papicons (icônes)', author: 'Association Papillon', url: 'https://github.com/PapillonApp/Papicons', license: 'MIT' },
  { asset: 'Fredoka (police)', author: 'The Fredoka Project Authors', url: 'https://github.com/hafontia/Fredoka-One', license: 'OFL 1.1' },
];
