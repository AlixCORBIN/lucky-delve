# Lucky Delve

Roguelike dungeon crawler isométrique pour navigateur où tout se décide par un pari influençable : déplacements, combats, loots et mini-jeux.

- Jouer : https://alixcorbin.github.io/lucky-delve/
- Design : [docs/GDD.md](docs/GDD.md)
- Règles de développement : [CLAUDE.md](CLAUDE.md)
- Crédits des assets : [CREDITS.md](CREDITS.md)

## Développer

```
npm install
npm run dev           # serveur local
npm run check         # tsc + eslint
npm test              # tests du core
npm run build:single  # dist-single/index.html (artefact)
```

`?renderer=2d` force le mode 2D de secours, `?seed=abc` fixe la seed.

Statut : J0 Fondations (scène iso, chargement, fallback 2D, CI).
