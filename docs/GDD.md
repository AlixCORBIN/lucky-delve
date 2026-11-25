# Lucky Delve — Game Design Document

Source vivante : https://claude.ai/artifact/3eqq4rTcgW3ozVdsEwDBka (ce fichier en est la copie de référence dans le dépôt ; le mettre à jour en même temps).

## Vision

Un dungeon crawler en vue isométrique où chaque décision passe par un pari : se déplacer, frapper, ouvrir un coffre, marchander. Le hasard n'est jamais subi, il se **pilote** : le joueur voit les probabilités et dépense des ressources pour les tordre en sa faveur.

- **Titre de travail** : *Lucky Delve* (à valider).
- **Plateforme** : navigateur (desktop d'abord, mobile ensuite), jouable dans un artefact Claude et sur GitHub Pages.
- **Durée d'une run** : 15 à 25 minutes. 3 étages, un boss à la fin de chacun.
- **Ton** : mignon, lisible, un peu taquin (un croupier-squelette commente tes paris).
- **Piliers** :
  1. *Tout est un pari* : aucune action n'a un résultat fixe.
  2. *Hasard lisible* : les chances sont toujours affichées (en %, ou en faces de dés visibles).
  3. *Influence > chance pure* : un bon joueur gagne plus souvent qu'un joueur chanceux.
  4. *Simple et mignon* : peu de polygones, couleurs franches, zéro look « IA slop ».
- **Hors périmètre** : aucun argent réel, aucun achat in-game, aucune loot box payante. Le gambling est une mécanique de jeu, pas un modèle économique.

## Boucle de jeu

Une run = 3 étages de 6 à 8 salles chacun, reliés par une carte en grille isométrique. On avance salle par salle, chaque salle est un pari, et le boss de l'étage est un duel de hasard spécial.

1. **Hub (taverne du croupier)** : choisir un héros, équiper ses dés, dépenser la monnaie méta.
2. **Entrée d'étage** : la carte est générée depuis une seed (salles cachées sous un brouillard).
3. **Déplacement** : jet de déplacement, choix de la case d'arrivée.
4. **Révélation de la salle** : roue de salle (combat, trésor, piège, marchand, mini-jeu, autel).
5. **Résolution** : combat aux dés, machine à sous de loot, mini-jeu, etc.
6. **Récompense** : or, Trèfles (chance), nouveaux dés ou faces.
7. **Boss** au bout de l'étage, puis étage suivant.
8. **Fin de run** (victoire ou mort) : gain de Jetons méta selon la profondeur atteinte, retour au hub.

| Ressource | Icône | Rôle |
| --- | --- | --- |
| PV | cœur | Vie. À 0, fin de run. |
| Or | pièce | Monnaie de la run : marchand, mises, mini-jeux. |
| Trèfles | trèfle | Monnaie d'influence : relancer, pousser un dé, bloquer un rouleau. |
| Karma | jauge | Monte à chaque échec, donne un bonus garanti quand elle est pleine (anti-frustration). |

## Le moteur Destin

Toute action du jeu passe par un seul module, le **moteur Destin** : il reçoit un pari (dés, roue, rouleaux, cartes, pièce), calcule les probabilités affichées, applique les influences, puis tire le résultat avec le RNG seedé. Un seul endroit pour le hasard = équilibrage, tests et replays faciles.

| Forme | Utilisée pour | Lecture des chances |
| --- | --- | --- |
| Dés (d4 à d12, faces custom) | Déplacement, combat | Faces visibles du dé |
| Roue à parts | Contenu des salles, événements, marchand | Taille des parts |
| Rouleaux (3 rouleaux) | Loot des coffres | Symboles listés par rouleau |
| Cartes / pièce | Mini-jeux, boss | Paquet visible, 50/50 |

Leviers d'influence :

- **Relance** (1 Trèfle) : relancer un dé, refaire tourner la roue une fois.
- **Poussée** (1 Trèfle) : décaler un dé de ±1, ou la roue d'une part.
- **Blocage** (2 Trèfles) : garder un rouleau de la machine à sous avant la relance.
- **Coup d'œil** (1 Trèfle) : voir la prochaine carte ou le prochain résultat de roue.
- **Mise** (Or ou PV) : miser pour multiplier la récompense, avec un « quitte ou double » optionnel.
- **Dés pipés** (objets) : faces modifiées de façon permanente (ex. un d6 dont le 1 devient 4).
- **Charmes** (reliques passives) : règles cassées (ex. « les doubles comptent triple »).
- **Karma** : chaque échec remplit la jauge ; pleine, le prochain pari est garanti au meilleur palier.

Règles de design du hasard :

- Les chances sont toujours affichées avant de valider, et mises à jour en direct quand on applique une influence.
- Pas de « faux % » : ce qui est affiché est exactement ce qui est tiré (tests unitaires dessus).
- RNG seedé et séparé en flux (carte, combat, loot, mini-jeux) : même seed = même run (seed du jour, bugs reproductibles).

## Les systèmes de jeu

### Déplacements

Chaque tour commence par un **jet de déplacement** (2d6 de base). Le total donne les cases parcourues ; on choisit la case d'arrivée parmi celles atteignables, en surbrillance.

- Cases visibles (sol, porte, coffre fermé, flaque de chance) ou cachées sous le brouillard (« ? »).
- Tomber pile sur une case spéciale déclenche un bonus (une **flaque de chance** donne 1 Trèfle).
- Un dépassement peut être corrigé avec une Poussée ou en s'arrêtant plus tôt contre une ressource.
- Entrer dans une salle lance la **roue de salle** ; 1 Trèfle retire une part (ex. le piège) avant le tirage.

### Combats

Tour par tour, sur un petit plateau. Le joueur lance sa **main de dés** (3 dés au départ) et assigne chaque dé à un emplacement.

- **Emplacements** : Attaque (dégâts = valeur), Garde (bouclier = valeur), Sort (effet si la valeur respecte une condition, ex. « pair », « 5 ou plus »).
- **Combos façon poker** : paire (+50 %), brelan (x2), suite (effet spécial du héros).
- **Intention ennemie** : chaque monstre montre son prochain coup *et* son dé (ex. « Mord : 1d6+1 »).
- **Fuite** : pile ou face, avec mise d'or pour améliorer les chances.

### Loots

Tout coffre est une **machine à sous à 3 rouleaux** : Rareté × Type (dé, face, charme, potion, or) × Affixe.

- **Bloquer** un rouleau et relancer les autres (2 Trèfles).
- **Quitte ou double** : pile ou face pour monter d'un cran de rareté.
- Coffres piégés : symbole crâne visible sur les rouleaux avant de tirer.

### Mini-jeux

| Mini-jeu | Principe | Influence possible |
| --- | --- | --- |
| Plus haut / plus bas | Deviner si la carte suivante est plus haute | Coup d'œil |
| Bonneteau du gobelin | Suivre la pièce sous 3 gobelets | Ralentir le mélange (Trèfle) |
| 21 du squelette | Approcher 21 sans dépasser, contre le croupier | Coup d'œil, dés pipés |
| Roue du marchand | Roue d'objets avec prix réduit | Poussée |
| Pile ou face spectral | Série de pile ou face, gains croissants, on encaisse quand on veut | Pièce truquée (objet) |

### Boss

Un par étage, chacun avec une règle de hasard propre : le Roi Rat qui triche (relance ses dés une fois par tour), la Dame de Pique (duel de cartes), le Croupier final (l'arène est une roue qui change les règles chaque tour).

## Progression

Dans une run, on construit une **main de dés** ; entre les runs, on débloque du contenu, pas de la puissance brute.

- **Héros** (3 au lancement) :
  - *Chevalière* : dés lourds (d8), une suite donne un bouclier total.
  - *Voleur* : pièce truquée (55 %), une suite vole de l'or.
  - *Cartomancienne* : 2 Coups d'œil gratuits par étage, une suite pioche une carte-sort.
- **Construction en run** : ajouter un dé, remplacer une face (forge), gagner des charmes. Main max : 6 dés.
- **Méta (Jetons)** : débloquer héros, faces, mini-jeux, cosmétiques. Seul bonus permanent : +1 Trèfle de départ.
- **Mises hautes** 1 à 5 après une première victoire.
- **Seed du jour** (plus tard) : classement via Supabase.

## Direction artistique et assets

Style « jouet low-poly » : formes rondes, peu de polygones, palette limitée, ombres douces. Une ou deux bibliothèques au même style plutôt qu'un mélange.

| Bibliothèque | Usage prévu | Licence (à confirmer par pack) |
| --- | --- | --- |
| [KayKit](https://kaylousberg.itch.io/) | Base principale : donjon, héros, squelettes | CC0 |
| [Kenney](https://kenney.nl/assets) | Props, dés, cartes, sons (pas d'icônes de menu) | CC0 |
| [Quaternius](https://quaternius.com/) | Monstres complémentaires animés | CC0 |
| [Poly Pizza](https://poly.pizza/) | Objets ponctuels | Mixte CC0 / CC-BY |

- Aucun asset généré par IA. Palette fixe (~12 couleurs). Une police ronde (OFL). Pas de néon ni d'effets gratuits.
- Animations de plateau « juicy » mais sobres : rebond des dés, léger tremblement sur gros gain, confettis rares.
- Chaque asset → `CREDITS.md`. CC-BY → attribution dans l'écran Crédits.

### Menus : animations et icônes du design system « DA Alix »

Pour les menus et l'UI hors plateau, on reprend **uniquement** les animations et les icônes du design system [DA Alix](https://claude.ai/artifact/SiTiwQs7za6VdmZJAi68wZ). Couleurs, typo et mise en page restent propres au jeu.

- **Icônes** : Papicons (MIT), SVG inline en `currentColor`, non modifiées, licence dans le dépôt. Pas d'emoji.
- **Entrées** `ease-out`, menus 150–250 ms, lignes décalées de 30 ms ; **sorties** 20 % plus courtes.
- **Déplacements** `ease-in-out`, en courbe, étirement 12 %. Pas de ressort, sauf élastique en fin de glissement.
- **Boutons** : 0,97 à l'appui ; pulsation pour confirmer une réussite.
- **Popovers** : entrée à 0,95 depuis le déclencheur, sortie vers lui.
- **Enchaînements** chevauchés ; icônes en fondu + échelle + flou ; objets partagés via FLIP / View Transitions.
- `prefers-reduced-motion` : pas de mouvement, changements d'état conservés.

## Stack technique

**TypeScript + Vite + three.js**, logique séparée du rendu ; Vitest ; UI des paris en HTML/CSS ; `vite-plugin-singlefile` pour l'artefact ; Supabase plus tard.

```text
src/
  core/       logique pure (RNG, Destin, état, règles)
  content/    données : héros, monstres, dés, charmes, salles
  render3d/   three.js, caméra iso, glTF
  render2d/   rendu de secours Canvas 2D
  ui/         écrans et widgets de pari
  main.ts     boot, détection WebGL
public/models/
tests/
```

- Core sans dépendance : état + actions, testable et rejouable hors navigateur.
- Caméra orthographique inclinée, grille de tuiles, pas de physique.
- Modèles compressés (Meshopt/Draco), budget < 10 Mo (limite artefact 16 Mo).

Fallback WebGL :

1. Tester WebGL2 puis WebGL1 dans un `try/catch` avant le renderer.
2. Écouter `webglcontextlost`.
3. Échec → `render2d` + bandeau « Mode 2D : WebGL indisponible » avec aide (`webgl.disabled` sur Firefox).
4. Écran de chargement HTML d'abord ; erreurs de boot affichées en clair.
5. `?renderer=2d` force le mode 2D.

## Workflow GitHub et artefact

1. Une tâche = une branche courte `feat/...` / `fix/...`, petits commits poussés au fil de l'eau.
2. PR vers `main` en fin de tâche (résumé + capture).
3. GitHub Actions : typecheck + tests + build sur PR ; déploiement Pages sur `main`.
4. Artefact jouable republié au même lien après chaque jalon ; version + hash affichés en jeu.
5. `CHANGELOG.md` à jour.

## Roadmap

1. **J0 Fondations** : Vite + TS, CI, écran de chargement, WebGL + fallback 2D, scène iso avec une tuile et un héros KayKit.
2. **J1 Moteur Destin** : RNG à flux, dés, roue, rouleaux, cartes, influences ; tests ; page démo.
3. **J2 Exploration** : étage en grille, jet de déplacement, brouillard, roue de salle.
4. **J3 Combat** : main de dés, emplacements, combos, intentions, 4 monstres.
5. **J4 Boucle complète** : loot, marchand, 2 mini-jeux, 3 étages, 1 boss, fin de run. *Premier jeu complet.*
6. **J5 Méta** : hub, 3 héros, Jetons, déblocages, sauvegarde locale.
7. **J6 Contenu et polish** : mini-jeux, 3 boss, charmes, sons, animations, équilibrage.
8. **J7 Bonus** : seed du jour Supabase, mobile, Mises hautes.

## Questions ouvertes

- [x] Dépôt : `AlixCORBIN/lucky-delve`, public.
- [ ] Merge des PR : par Claude quand la CI est verte, ou relecture d'alix ?
- [ ] Titre *Lucky Delve* validé ?
- [ ] Langue : français seul ou FR + EN ?
- [ ] Mobile dès J4 ?
