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
    banner: 'Mode 2D de secours',
    why: 'Pourquoi ?',
    causes: {
      forced: 'Forcé par ?renderer=2d dans l’adresse.',
      webgl: 'WebGL indisponible. Active l’accélération matérielle du navigateur. Sur Firefox, vérifie que webgl.disabled vaut false dans about:config.',
      lost: 'Le contexte WebGL a été perdu (pilote graphique ou mémoire). Recharge la page.',
      load: 'Les modèles 3D n’ont pas pu être chargés.',
    },
  },
  errors: {
    boot: 'Le jeu n’a pas pu démarrer.',
    reload: 'Recharger',
  },
} as const;
