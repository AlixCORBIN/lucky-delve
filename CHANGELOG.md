# Changelog

## 0.1.0 : J0 Fondations
- Scène 3D isométrique : plateau 5×5 de dalles et une chevalière KayKit animée qu'on déplace en cliquant une case.
- Menu principal et HUD avec animations « DA Alix » et icônes Papicons ; popover Crédits.
- Écran de chargement, erreurs de démarrage affichées à l'écran.
- Mode 2D de secours minimal si WebGL est absent ou perdu (`?renderer=2d` pour le forcer).
- Version et hash du commit affichés en jeu.
- RNG seedé à flux séparés et moteur Destin minimal, testés.
- CI GitHub Actions et déploiement GitHub Pages.

## Avant 0.1.0
- Le mode 2D de secours est limité à un rendu minimal, jamais prioritaire.
- Plan du jeu (`docs/GDD.md`) et règles de développement (`CLAUDE.md`).
