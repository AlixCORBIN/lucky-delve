# Changelog

## 0.2.1
- La graine de chaque partie est tirée sur random.org (sans clé), avec repli automatique sur l'aléa du navigateur ; la source s'affiche en jeu.

## 0.2.0 : J1 Moteur Destin et première boucle jouable
- Moteur Destin complet : dés (y compris pipés), roue à parts, machine à sous à 3 rouleaux, cartes, pièce ; les chances affichées sont celles du tirage (testé).
- Leviers d'influence en Trèfles : relance, poussée ±1, retrait et décalage de part de roue, blocage de rouleaux, coup d'œil ; Karma qui garantit le meilleur résultat après 5 échecs.
- Boucle jouable sur 3 étages 7×7 : jet de déplacement, salles « ? » révélées par la roue (monstre, trésor, piège, plus haut / plus bas, source), combats aux dés avec Attaque/Garde et combos, fuite à pile ou face avec mise, boss en fin d'étage.
- Graine de 256 bits par partie (random.org via Supabase, repli crypto), générateur ChaCha20.
- Barre de ressources (PV, Or, Trèfles, Karma, étage) et fil des événements.

## 0.1.1
- Corrige l'artefact qui s'ouvrait en mode 2D de secours : la vue 3D isométrique s'affiche maintenant.
- Le bandeau du mode 2D est plus discret et donne la vraie cause.
- Le mode 2D dessine aussi le plateau en losanges isométriques.

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
