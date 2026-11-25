# CLAUDE.md — Lucky Delve

Roguelike dungeon crawler isométrique (web) où **tout se décide par un pari influençable** : déplacements, combats, loots, mini-jeux.
Design complet : `docs/GDD.md`. Ne le lire que pour la section utile (grep le titre), jamais en entier.

## Stack
- TypeScript strict + Vite + three.js. Tests : Vitest. Pas d'autre framework (pas de React).
- UI des paris (dés, roue, rouleaux, cartes) en HTML/CSS par-dessus le canvas.
- Build artefact : `vite-plugin-singlefile` → un seul `dist/index.html`.
- Supabase : pas avant le J7 (seed du jour, classement), sauf si l'interface publique de random.org ne suffit plus (voir Hasard).

## Commandes
```
npm run dev        # serveur local
npm run check      # tsc --noEmit + eslint
npm test           # vitest run (core uniquement)
npm run build      # build GitHub Pages
npm run build:single  # build artefact single-file (dist-single/index.html)
```
Avant chaque commit : `npm run check && npm test`. Avant chaque publication d'artefact : `npm run build:single`.

## Architecture (règles strictes)
```
src/core/      logique pure : rng, destin (moteur de pari), state, rules. AUCUN import de three, DOM ou window.
src/content/   données (héros, monstres, dés, charmes, salles). Pas de logique.
src/render3d/  three.js : scène, caméra ortho iso, chargement glTF.
src/render2d/  secours Canvas 2D MINIMAL (formes simples), jamais prioritaire.
src/ui/        écrans et widgets de pari (DOM).
src/main.ts    boot : écran de chargement, détection WebGL, choix du rendu.
public/models/ .glb optimisés. tests/ tests du core.
```
- Le rendu **lit** l'état et **envoie des actions** au core. Il ne modifie jamais l'état directement.
- Tout hasard passe par `core/destin`. Interdit : `Math.random()` ailleurs (lint).
- RNG seedé avec flux séparés : `map`, `combat`, `loot`, `minigame`. Même seed = même run.
- **Hasard (choix d'alix)** : graine de 256 bits (64 hex) par partie, tirée sur l'interface HTTP publique de random.org (sans clé). Jamais de clé API côté client : si une clé devient nécessaire, elle vit dans une fonction serveur (Supabase) et `VITE_SEED_ENDPOINT` pointe dessus. Repli `crypto.getRandomValues` si random.org est injoignable. Tous les tirages en dérivent via ChaCha20 (`core/rng.ts`) ; pas de LCG ni de PRNG faible.
- Les probabilités affichées au joueur sont calculées par la même fonction que le tirage. Chaque nouveau pari a un test qui le vérifie.
- Équilibrage (coûts en Trèfles, poids des roues, dégâts) dans `src/content/`, jamais en dur dans la logique.

## Fallback WebGL (obligatoire, jamais d'écran noir)
Le jeu est pensé et peaufiné en 3D. Le mode 2D est un simple filet de sécurité, il ne doit jamais devenir un rendu principal.
1. Écran de chargement HTML affiché avant tout JS lourd.
2. Tester WebGL2 puis WebGL1 dans un `try/catch` avant `new WebGLRenderer`.
3. Échec, ou `webglcontextlost` → basculer sur `render2d` + bandeau « Mode 2D : WebGL indisponible » avec aide (accélération matérielle, `webgl.disabled` sur Firefox).
4. Toute erreur au boot est affichée à l'écran, pas seulement en console.
5. `?renderer=2d` force le mode 2D pour le tester.
6. Mode 2D minimal : formes et couleurs unies, pas de sprites, pas d'animations, pas de polish. Il doit seulement permettre de jouer (il lit le même état et envoie les mêmes actions). Aucune feature ne se conçoit pour lui, et on n'y passe pas de temps au-delà de « ça ne plante pas ».

## Direction artistique
- Low-poly mignon, palette fixe (`src/render3d/palette.ts`, ~12 couleurs). Une seule police ronde (OFL).
- Sources d'assets : KayKit (principale), Kenney, Quaternius, Poly Pizza (au cas par cas). Rester sur 1-2 sources par catégorie pour garder un style cohérent.
- **Aucun asset généré par IA.** Pas de néon, de dégradés ou d'effets gratuits.
- Chaque asset ajouté → une ligne dans `CREDITS.md` (nom, auteur, URL, licence). Vérifier la licence sur la page du pack. CC-BY → attribution dans l'écran Crédits. Licence inconnue ou NC → ne pas utiliser.
- Budget : modèles allégés (animations et objets inutiles retirés), total du jeu < 10 Mo (limite artefact 16 Mo).
- L'artefact Claude interdit `fetch()` (data:, blob:) et WebAssembly : pas de Meshopt/Draco, modèles décodés depuis le base64 et textures via `<img>` (voir `src/render3d/models.ts`).

## Menus : animations + icônes du design system « DA Alix »
Source : https://claude.ai/artifact/SiTiwQs7za6VdmZJAi68wZ (lire `project/README.md`, sections Mouvement et Iconographie). On n'en reprend QUE les animations et les icônes, pas les couleurs ni la typo.
- Icônes de menus/UI : Papicons (MIT) uniquement, SVG inline non modifiés en `currentColor`, dans `src/ui/icons/` + `LICENSE`. Pas d'emoji, pas d'autre jeu. Icône manquante → la plus proche dans Papicons.
- Entrées `ease-out` ; menus 150–250 ms, lignes décalées de 30 ms ; sorties 20 % plus courtes.
- Déplacements `ease-in-out`, en courbe, étirement 12 %. Pas de ressort (sauf élastique en fin de glissement).
- Bouton appuyé : `scale(0.97)`. Réussite : petite pulsation.
- Popover/menu : entre à `scale(0.95)` depuis le déclencheur (`transform-origin`), ressort vers lui.
- Étapes qui se chevauchent ; icônes en fondu + échelle + flou ; objet partagé entre vues → FLIP ou View Transitions (pas de React).
- `prefers-reduced-motion` : plus de mouvement, changements d'état conservés.
- Centraliser durées et courbes dans `src/ui/motion.ts`. Les animations du plateau (dés, roue, rouleaux) sont hors de ces règles.

## Conventions de code
- Noms de code en anglais, textes du jeu en français dans `src/content/i18n/fr.ts` (pas de texte en dur dans l'UI).
- Fonctions pures dans `core`, pas de classes sauf si un état interne l'exige. Pas de `any`.
- Un fichier = une responsabilité, < 300 lignes. Pas de commentaires qui paraphrasent le code ; commenter le *pourquoi* des règles de hasard.
- Pas de nouvelle dépendance sans raison écrite dans la PR.

## Git et livraison
- Dépôt : `AlixCORBIN/lucky-delve`. Branche par tâche : `feat/…`, `fix/…`, `chore/…`. Jamais de push direct sur `main`.
- Commits petits et fréquents, en français, à l'impératif : `feat(destin): ajoute la relance de dé`.
- Pousser au moins à chaque étape qui compile et passe les tests.
- PR vers `main` en fin de tâche : résumé, capture, ce qui reste. CI verte obligatoire.
- `main` → déploiement GitHub Pages automatique (Actions).
- Après chaque jalon ou feature visible : `npm run build:single` puis republier **le même** artefact (même lien). Version + hash du commit affichés en jeu.
- `CHANGELOG.md` : une ligne par changement visible.
- Ne jamais committer de secrets (`.env`, clés Supabase service_role).

## Économie de tokens (pour Claude)
- Lire ce fichier, puis seulement les fichiers de la tâche. Utiliser grep/glob avant d'ouvrir un fichier ; lire par plages de lignes.
- Ne jamais lire : `public/models/`, `dist/`, `node_modules/`, fichiers binaires, `package-lock.json`.
- Ne pas relire un fichier qu'on vient d'éditer. Ne pas relancer une commande dont le résultat n'a pas pu changer.
- Après un échec de tests, relancer seulement les tests en échec (`npx vitest run <fichier>`).
- Pas de sous-agents sauf demande explicite.
- Réponses courtes : résultat, lien, ce qui bloque. Pas de récapitulatif du code écrit.
- Une décision de design nouvelle → l'ajouter en une ligne dans `docs/GDD.md` ou ici, pas la répéter dans les messages.

## Jalon courant
J1 Moteur Destin + première boucle jouable (voir `docs/GDD.md` § Roadmap). Mettre à jour cette ligne à chaque jalon.
