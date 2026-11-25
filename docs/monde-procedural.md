# Monde procédural : proposition de conception

> Statut : **proposition à relire** (2026-11-25), aucun code. Rien ici ne remplace le GDD tant qu'alix n'a pas tranché les questions de la fin.
> Les hypothèses sont marquées **[H]**. Les questions qui changent le plus la conception sont regroupées à la fin.

## 1. Ce qu'on garde de l'existant

- Une run = 3 étages, 15 à 25 min, un boss par étage (GDD § Boucle de jeu).
- Le déplacement se fait au dé (2d4 aujourd'hui), on choisit la case d'arrivée, les salles cachées « ? » déclenchent une roue (`ROOM_WHEEL`).
- Tout le hasard vient de la graine de 256 bits → ChaCha20 (`core/rng.ts`), flux `map` / `combat` / `loot` / `minigame`. Même graine = même monde.
- Les poids et coûts vivent dans `src/content/`, la logique dans `src/core/`.

L'idée : **l'étage carré 7×7 devient une « contrée »** (une région extérieure avec un biome), et les lieux spéciaux (château, crypte, village) deviennent des **patterns réutilisables** posés dessus.

## 2. Structure du monde

```
Run (graine)
 └─ Acte 1..3        = une contrée, un biome dominant, un boss
     ├─ Carte extérieure : grille hexagonale ~9×9 (≈ 60 cases)
     │   ├─ terrain (biome, relief, eau)
     │   ├─ réseau de routes (départ → lieux → château du boss)
     │   ├─ lieux = prefabs (village, tour, camp, sanctuaire…)
     │   └─ mobs visibles (camps, patrouilles) + rencontres cachées
     └─ Intérieurs (optionnels) : château, crypte, mine
         = petite grille carrée, la boucle actuelle du J1
```

- **[H] Trois actes, une carte par acte** plutôt qu'un seul grand monde : la durée de run reste tenue, chaque acte a son ambiance, et le code actuel de l'étage se réutilise pour les intérieurs.
- **[H] Grille hexagonale à l'extérieur.** Raison principale : le pack *KayKit Medieval Hexagon* (CC0, vérifié) fournit déjà plaines, forêts, collines, montagnes, rivières, routes, côtes, châteaux, villages, tous au même style que nos modèles KayKit. Une grille carrée nous obligerait à mélanger des sources. Distance hexagonale en coordonnées axiales, même règle « tomber pile » qu'aujourd'hui.
- Les intérieurs gardent la grille carrée du J1 (tuiles *Dungeon Remastered* déjà en place).

### Ordre des biomes

**[H]** Acte 1 toujours en Plaines (tutoriel), acte 3 toujours les Terres du Croupier (boss final). L'acte 2 est **tiré** parmi Forêt, Collines ou Marais hanté. Ça donne de la variété sans perdre la courbe de difficulté.

## 3. Génération d'une contrée (pipeline)

Chaque étape est une fonction pure de `core/world/` : `(graine, acte, données de content) → résultat`. Le rendu ne fait que lire la carte.

1. **Sous-flux par étape.** Le nonce ChaCha20 a un 3ᵉ mot libre (aujourd'hui `0`). On y met un hash du libellé de l'étape (`map:acte2:terrain`, `map:acte2:lieux`…). Pourquoi : ajouter un lieu ou un mob ne doit pas changer le terrain d'une graine connue. Les tests de « graine dorée » restent stables d'une version à l'autre.
2. **Masque de la carte.** Forme d'île ou de vallée (hexagones hors-carte = eau ou montagnes infranchissables), pour que le bord ait l'air naturel.
3. **Relief et biome.** Bruit de valeurs simple (grille de valeurs tirées sur le flux, interpolées) pour l'altitude et l'humidité. Seuils → eau, prairie, forêt, colline, montagne. Pas de Perlin de bibliothèque : 30 lignes suffisent et restent dans `core/destin` côté tirages.
4. **Départ et château.** Départ sur un bord, château du boss sur le bord opposé (distance hexagonale maximale, comme `start`/`exit` aujourd'hui).
5. **Routes.** Chemin le moins coûteux (A* sur le coût du terrain) du départ au château, puis embranchements vers les lieux. Chaque hexagone de route choisit sa tuile KayKit (`hex_road_A..M`) selon ses voisins (auto-tuilage par masque de 6 bits). Pareil pour la rivière (`hex_river_A..L`) tracée par une marche descendante sur le relief, et les ponts aux croisements.
6. **Lieux (prefabs).** Placement par emplacements : chaque prefab déclare son biome, sa distance au départ (tôt / milieu / près du boss), son espacement minimal et son nombre min/max par acte. On tire dans les hexagones valides (même technique que `place()` dans `floor.ts`).
7. **Mobs.** Voir § 6 : budget de danger par acte, réparti selon la distance au départ.
8. **Validation.** Le core vérifie les invariants : château atteignable, au moins un marchand, aucun camp sur la case de départ ni à 2 cases, tout lieu relié par une route. Si un invariant échoue, on retire **la même étape** avec un compteur de tentative dans le libellé du sous-flux (`…:lieux#2`). Déterministe, donc rejouable.

Tests : invariants sur 1 000 graines, plus 3 graines dorées dont la carte est comparée en instantané.

## 4. Biomes

Chaque biome = une entrée de `src/content/biomes.ts` : tuiles et props, table de mobs, poids de la roue des « ? », et **une règle de hasard propre** affichée à l'entrée de l'acte.

| Biome | Ambiance | Règle de hasard **[H]** | Mobs |
| --- | --- | --- | --- |
| **Plaines** | prairie, champs, moulins, villages | Aucune : biome d'apprentissage. Les routes donnent +1 au jet. | slime, chauve-souris, gobelin |
| **Forêt** | arbres serrés, clairières, rivière | Brouillard plus épais : on ne voit qu'à 1 case. Le Coup d'œil coûte 0 Trèfle une fois par tour. | gobelin archer, loup, araignée |
| **Collines et mines** | relief, rochers, entrées de mine | Monter coûte 2 points de dé par hexagone. Les mines sont des machines à sous à 4 rouleaux. | squelette mineur, golem, chauve-souris |
| **Marais hanté** | eau, nénuphars, tombes, arbres morts | Le Karma monte deux fois plus vite, mais les pièges sont plus fréquents sur la roue. | squelettes, feu follet, slime |
| **Terres du Croupier** (acte 3) | remparts, tours, bannières rouges | Chaque tour, une carte « Présage » change une règle (comme l'arène du Croupier, en plus doux). | squelettes armés, gardes, élites |

Le relief et l'eau traversent les biomes : une rivière peut couler de la Forêt vers les Plaines dans le même acte. **[H]** Un acte = un biome dominant (≈ 70 % des cases) + un biome voisin en lisière.

## 5. Patterns réutilisables (prefabs)

Un prefab est **une donnée**, pas du code : empreinte en hexagones relatifs, tuiles et props, emplacements variables, et le pari qu'il déclenche. Fichier `src/content/prefabs.ts`.

```ts
// Exemple de forme (indicatif, pas du code à écrire maintenant)
{
  id: 'village',
  biomes: ['plains', 'forest'],
  footprint: [[0,0],[1,0],[0,1]],          // hexagones occupés
  zone: 'early',                           // early | mid | late
  perAct: [1, 2],
  spacing: 3,
  slots: [                                 // variantes tirées sur le sous-flux du lieu
    { at: [0,0], pick: [['tavern', 2], ['market', 2], ['blacksmith', 1]] },
    { at: [1,0], pick: [['home_A', 1], ['home_B', 1], ['well', 1]] },
  ],
  wheel: 'village',                        // roue propre au lieu (§ 7)
}
```

| Prefab | Où | Ce qu'on y fait (pari) |
| --- | --- | --- |
| **Château fort** | fin d'acte, toujours | Entrée = intérieur en grille carrée (la boucle J1), boss au bout. Porte : clé trouvée, ou crochetage aux dés. |
| **Village** | tôt, Plaines/Forêt | Marchand (roue du marchand), taverne (21 du squelette, plus haut/plus bas), forge (changer une face de dé). Lieu sûr. |
| **Tour de guet** | milieu | Monter = révéler le brouillard dans un rayon de 3, contre un pile ou face (raté : une patrouille vous repère). |
| **Camp de gobelins** | milieu, Plaines/Forêt | 2 à 3 mobs visibles qui gardent un coffre. Combat, ou bonneteau du gobelin pour passer. |
| **Crypte** | milieu, Marais | Petit intérieur 5×5, coffres piégés (crâne sur les rouleaux) plus fréquents, meilleur loot. |
| **Mine** | Collines | Machine à sous à 4 rouleaux (or, gemme, dé, éboulement). On peut rejouer en payant en PV. |
| **Sanctuaire** | partout, rare | Autel : échanger PV ↔ Trèfles, ou bénir un dé (une face devient la meilleure). |
| **Puits aux souhaits** | village ou isolé | Jeter de l'or, roue de vœux (Trèfle, soin, charme, rien). |
| **Pont à péage** | sur la rivière | Payer, ou parier le passage (pile ou face, perte = gué : un tour perdu). |
| **Moulin / ferme** | Plaines | Rencontre douce : soin ou or contre un mini-jeu. |
| **Ruines** | partout | « ? » garanti mais roue plus risquée (plus de pièges, plus de trésors). |

Les bâtiments KayKit existent en 4 couleurs (bleu, vert, rouge, jaune) : **[H]** une couleur par contrée pour la lisibilité (Plaines jaune, Forêt verte, Collines bleue, Croupier rouge), en restant dans la palette fixe.

## 6. Placement des mobs

Trois familles, toutes visibles sur la carte sauf la dernière :

1. **Camps** (fixes) : gardent un lieu ou un coffre. Leur intention et leur dé sont affichés au survol, comme en combat.
2. **Patrouilles** (mobiles) : se déplacent après le joueur avec **leur propre dé visible** (ex. 1d4 le long de la route). On peut prévoir leur trajet et les éviter : c'est le pilier « influence > chance ».
3. **Rencontres cachées** : sortent de la roue des « ? ».

Règles de placement :

- **Budget de danger** par acte (dans `balance.ts`) : chaque mob a un coût ; le budget est réparti en anneaux selon la distance au départ (≈ 20 % tôt, 35 % milieu, 45 % près du château).
- Zone sûre : rien à 2 cases du départ ni dans les villages.
- Table de mobs par biome × anneau, avec poids (comme `FLOOR_MONSTERS`, mais par biome).
- Une **élite** par acte, placée près du meilleur coffre de la carte.
- Laisse : une patrouille ne s'éloigne pas à plus de 3 cases de son point d'origine, pour que la carte reste lisible.

## 7. Le pari dans l'exploration

Le déplacement reste un pari, mais le terrain le rend plus intéressant :

- **Jet de déplacement** sur hexagones, avec coûts de terrain : route 1, prairie 1, forêt 2 **[H]**, colline 2, rivière infranchissable sauf pont ou gué. Les cases atteignables sont calculées par la même fonction que l'affichage (règle « pas de faux % »).
- **Gué** : pile ou face pour traverser sans pont (raté = on reste sur la rive, jet perdu).
- **Roue par lieu** au lieu d'une roue globale : la roue d'un « ? » dépend du biome et du lieu (une crypte a plus de monstres, une clairière plus de sources). Retirer une part avec un Trèfle reste possible.
- **Brouillard** : on voit les lieux mais pas leur contenu exact. Coup d'œil = révéler une case.
- **Présage d'acte** : en entrant dans une contrée, on retourne une carte qui modifie une règle pour l'acte (ex. « les doubles au déplacement donnent un Trèfle »). On peut payer pour en voir deux et choisir.
- **Carrefours** : à une bifurcation de route, les deux roues des lieux suivants sont montrées, on choisit son risque.

Ces mécaniques dépendent du fil qui réajuste le gambling : à aligner avec ses conclusions avant de coder.

## 8. Assets disponibles par biome

Vérifié le 2026-11-25 sur les dépôts GitHub officiels de KayKit (fichier `LICENSE.txt` du pack) : **KayKit Medieval Hexagon Pack 1.0, CC0**. Les autres lignes sont à vérifier sur la page du pack avant import, comme le veut `CREDITS.md`.

| Biome / usage | Source principale | Modèles utiles |
| --- | --- | --- |
| Terrain hexagonal (tous) | KayKit Medieval Hexagon (CC0 ✓) | `hex_grass`, `hex_water`, `hex_coast_A..E`, `hex_river_A..L` + `crossing`, `hex_road_A..M`, pentes |
| Plaines | KayKit Medieval Hexagon | `building_home_A/B`, `windmill`, `watermill`, `grain`, `well`, `market`, `tavern`, `fence_wood` |
| Forêt | KayKit Medieval Hexagon | `trees_A/B_small..large`, `tree_single_A/B`, `hills_*_trees`, `lumbermill`, `tent` |
| Collines | KayKit Medieval Hexagon | `hills_A..C`, `mountain_A..C(_grass)(_trees)`, `rock_single_A..E`, `building_mine`, `resource_stone` |
| Château fort | KayKit Medieval Hexagon | `building_castle`, `tower_A/B`, `tower_catapult`, `wall_straight(_gate)`, `wall_corner_*`, `barracks`, `flag_*` |
| Marais hanté | KayKit Halloween Bits (licence à vérifier) | `grave_*`, `gravestone`, `crypt`, `tree_dead_*`, `fence` cassée, `lantern_*`, `skull`, `shrine` ; + `waterlily`, `waterplant` du pack hexagonal |
| Mobs squelettes | KayKit Skeletons (licence à vérifier) | `Skeleton_Minion`, `Warrior`, `Rogue`, `Mage` (animés) |
| Intérieurs | KayKit Dungeon Remastered (déjà utilisé) | murs, sols, coffres, portes |
| Autres monstres (loup, araignée, slime, golem) | Quaternius « Ultimate Monsters » ou « Monster pack » (à vérifier) | Une seule source pour tous les monstres non squelettes, pour la cohérence |
| Secours props | Kenney Nature Kit / Castle Kit / Graveyard Kit (CC0, à vérifier) | Seulement si un objet manque chez KayKit |

Budget : le pack hexagonal partage **une seule texture** pour tous ses modèles, et on n'importe que les ≈ 60 modèles utilisés. Les arbres et tuiles répétés passent en `InstancedMesh`. **[H]** Objectif ≈ 3 Mo de modèles pour tout l'extérieur, dans le budget de 10 Mo.

## 9. Où ça vit dans le code (plus tard)

```
src/core/world/     hex.ts (axial, distance, voisins), noise.ts, terrain.ts, roads.ts,
                    places.ts, mobs.ts, validate.ts, region.ts (assemble le tout)
src/content/        biomes.ts, prefabs.ts, worldBalance.ts (budgets, coûts de terrain)
src/render3d/       region3d.ts (pose les tuiles et props, instancing)
src/render2d/       hexagones de couleur unie, rien de plus
tests/world/        invariants sur 1 000 graines, graines dorées
```

Proposition de découpage en jalons, à insérer après J4 dans la roadmap : **M1** hexagones + terrain + routes (Plaines seules, sans mobs) · **M2** prefabs + roue par lieu · **M3** mobs (camps, patrouilles) · **M4** 2ᵉ et 3ᵉ biomes + intérieurs de château · **M5** présages, carrefours, équilibrage.

## 10. Questions pour alix

Celles qui changent le plus la conception, de la plus structurante à la moins :

1. **Échelle** : trois contrées séparées (une par acte, ma proposition) ou un seul grand monde continu qu'on explore pendant toute la run ?
2. **Hexagones dehors** (pour profiter du pack KayKit qui a déjà châteaux, forêts, rivières) ou on garde les cases carrées partout ?
3. **Intérieurs** : on entre dans le château et la crypte sur une carte à part (réutilise le J1), ou tout se passe sur la carte extérieure ?
4. **Mobs visibles qui bougent** (patrouilles à éviter) ou rencontres seulement via la roue des « ? », comme aujourd'hui ?
5. **Ordre des biomes** : fixe (Plaines → Forêt → Château), à moitié tiré (ma proposition), ou entièrement tiré par la graine ?
6. **Durée** : on garde 15 à 25 min par run, ou le monde ouvert justifie des runs plus longues ?
