export const fr = {
  title: 'Lucky Delve',
  tagline: 'Un donjon où chaque pas est un pari.',
  menu: {
    play: 'Jouer',
    credits: 'Crédits',
    back: 'Menu',
    close: 'Fermer',
  },
  hud: {
    hint: 'Clique une case pour y envoyer la chevalière.',
    turn: (n: number) => `Tour ${n}`,
  },
  credits: {
    title: 'Crédits',
    intro: 'Modèles, icônes et police libres. Merci à leurs auteurs.',
  },
  loading: {
    models: 'Chargement des modèles',
  },
  fallback: {
    banner: 'Mode 2D : WebGL indisponible.',
    help: 'Active l’accélération matérielle du navigateur. Sur Firefox, vérifie que webgl.disabled vaut false dans about:config.',
  },
  errors: {
    boot: 'Le jeu n’a pas pu démarrer.',
    reload: 'Recharger',
  },
} as const;
