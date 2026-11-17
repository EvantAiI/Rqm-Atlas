# La carte du réseau (page web)

React 19, TypeScript strict, Vite 8, Tailwind 4, zustand, MapLibre GL JS 6. Le code (noms de fichiers, de dossiers,
identifiants) est en anglais ; les commentaires et tout ce que le visiteur lit sont en français. Les clés des données
sont en anglais (`name`, `town`, `year`…), leurs valeurs viennent telles quelles des CSV (« Régulier », « principal »…).

## Les données, du CSV à l'écran

```
data/ + collected/ ──tools/build_data.py──> generated/ : data.json, coverage.json, basemapStyle.json, towns.json, details/<id>.json
                                            public/basemap/tiles/<z>/<x>/<y>.pbf
generated/data.json ──scripts/precompute.ts──> generated/placement.json (grappes, décalages, bulles des villes)
                                               generated/regionOutlines.json (contours allégés des régions)
src/ importe generated/*.json ──vite build──> dist/
```

`generated/` ne contient que du JSON, que la page importe par Vite : les données entrent dans le bundle, sous des noms
hachés. D'emblée : `data.json`, `placement.json`, `coverage.json`, `basemapStyle.json`. À la demande, chacun dans son
morceau : `towns.json` (la première fois qu'on ouvre « près de chez moi »), `details/<id>.json` (les publications d'un
membre, à l'ouverture de sa fiche), `regionOutlines.json` (à la première fiche de région). `public/` est copié tel quel
dans `dist/` : les tuiles, polices et icônes du fond (`basemap/`), la police Lato (`vendor/`) et le logo.

Tout ce qui peut se calculer au build l'est (`scripts/precompute.ts`). Le navigateur lit ce placement tel quel pour la
vue d'ouverture ; seule la hauteur des noms de ville se recalcule quand un filtre change les membres affichés.

Les chemins sont relatifs (`base: "./"`) : le même `dist/` marche sur GitHub Pages et en local.

## L'organisation du code

```
scripts/precompute.ts   le placement des membres et les contours des régions, calculés au build
src/
  main.tsx, App.tsx     l'entrée ; App pose la carte et, par-dessus, le panneau, la fiche, l'aide, la visite
  components/           l'interface partagée : puce d'axe, section pliable, ligne d'infos, pastille, épingle, liste de suggestions, boutons d'organisation et de projet
  features/             une fonctionnalité par dossier (components/, hooks/, lib/), qu'on importe par son index.ts
    map/                la carte MapLibre : fond, sources, couches, arcs, survol, clics, cadrage
    panel/              le panneau : recherche, onglets, filtres, listes
    sheets/             la fiche ouverte : organisation, projet, sujet, ville, région, trait, près de chez moi
    legend/             la légende, que le panneau pose à son pied
    help/               les « ? » et leur bulle d'aide (et son store)
    tour/               la visite guidée
  stores/               les stores zustand : la page (app/ : filtres, sélection, écran), près de chez moi, la visite, la carte ;
                        la sélection et les sélecteurs dérivés
  hooks/                les hooks de toute la page : l'adresse et l'historique, un champ à suggestions, copier un lien, la permission de position
  lib/                  la logique pure, avec ses tests (recherche, géométrie, réseau, projets, adresse, vue partagée, tri, distance)
  data/                 les types, les données et leurs index, catégories, axes, lieux, placement, requêtes (sujets, villes, régions, traits,
                        près de chez moi, ce qu'une adresse désigne)
  constants/            les textes d'aide, les clés du stockage local, les identifiants partagés
  utils/                format (nombres, dates, mots) et écran (couleurs, téléphone)
  styles/               index.css (Tailwind, les couleurs, la variante `phone:`), map.css, toutes les classes répétées
  test/                 les tests sur les vraies données, et setup.ts (un écran d'ordinateur simulé)
```

Les fonctionnalités se parlent par les stores : `useAppStore` (filtres, sélection, et les demandes que la carte honore :
`framing`, de sorte `selection`, `filteredView` ou `nearMe`), `useNearbyStore` (le lieu du visiteur), `useTourStore`
(l'étape), `useMapStore` (l'instance MapLibre). Les composants lisent l'état par sélecteur et appellent
les actions par `useXStore.getState()` dans leurs gestionnaires. Une fonctionnalité n'en importe une autre que par son
`index.ts`.

Les paramètres de l'adresse (`#membre=`, `#projet=`, `#vue=projets&annee=…`) et les clés du stockage local (`rqm-tuto`)
restent en français : ce sont des liens déjà partagés et des réglages déjà enregistrés chez les
visiteurs.

Avec `?debug` dans l'adresse, `window.appStore` et `window.mapStore` sont accessibles (scripts de rendu, console).
Avec `?notour`, la visite guidée ne s'ouvre jamais d'elle-même. Le « ? » la lance toujours.

## Lancer

D'abord, à la racine du dépôt : `python3 tools/build_data.py`, qui écrit `generated/` et `public/basemap/tiles/`.
Puis, dans `web/` :

```
npm ci                  # une fois : les dépendances
npm run dev             # précalcul, puis la page en développement
npm run build           # précalcul, types (app, puis tests et scripts), ESLint, puis build dans dist/
npm test                # vitest
npm run typecheck       # seulement les types
npm run lint            # seulement ESLint (TypeScript et règles des hooks de React)
```

`npm test` et `npm run typecheck` lisent `generated/`, précalcul compris : lancer `npm run build` ou `npm run dev` une
fois avant.
