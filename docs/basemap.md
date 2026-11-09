# Le fond de carte

Le fond est fait de tuiles vectorielles OpenStreetMap, découpées dans un build de [Protomaps](https://protomaps.com) et
dessinées par MapLibre avec le style `@protomaps/basemaps` (variante claire, noms en français). Tout est servi avec la
page : aucune requête vers un serveur de tuiles tiers.

## Ce qui est versionné

| Fichier | Contenu |
|---|---|
| `collected/basemap.pmtiles` (≈ 43 Mo) | les tuiles du territoire, du zoom 0 au 15 |
| `collected/basemap-south.pmtiles` (≈ 0,5 Mo) | le sud du territoire, pour la vue d'ensemble |
| `collected/basemap-style.json` | le style MapLibre |
| `web/public/basemap/fonts/` | les polices Noto Sans (Regular, Medium, Italic) en glyphes |
| `web/public/basemap/sprites/` | les icônes du style (`light`, `light@2x`) |

Les polices et les icônes viennent de [protomaps/basemaps-assets](https://github.com/protomaps/basemaps-assets), copiées
telles quelles.

## Ce qu'on garde

| Zone | Zooms |
|---|---|
| tout le territoire : longitude −80 à −55, latitude 43 à 63 | 0 à 8 |
| le sud, latitude 38 à 43 (`basemap-south.pmtiles`) : la vue d'ensemble sur téléphone y descend | 0 à 6 |
| le couloir habité, jusqu'à la latitude 52,5 | 9 |
| autour des membres : les tuiles du zoom 12 à moins de 1 km d'un membre, et toutes leurs descendantes | 12 à 15 |

Seules les couches terre, eau, routes, lieux et limites restent ; ni bâtiments, ni commerces, ni transports, ni
occupation du sol. Entre ces zooms, la carte agrandit les tuiles du zoom inférieur.

## Refaire le fond

`collectors/basemap/make.sh` refait les trois fichiers de `collected/`. On le relance pour des données OpenStreetMap
plus récentes, ou quand des membres arrivent (le détail les suit). Il lit directement un build mondial de Protomaps,
dont il ne télécharge que l'emprise voulue : le lancer dans une machine qui a du réseau.

Il faut :
- `pmtiles` 1.31.2 ([go-pmtiles](https://github.com/protomaps/go-pmtiles)) ;
- `tile-join` (paquet `tippecanoe`) ;
- `node` et `npm` (pour `@protomaps/basemaps` 5.7.2, installé dans un dossier temporaire).

```sh
python3 tools/build_data.py              # d'abord : make.sh lit la position des membres dans web/generated/data.json
collectors/basemap/make.sh 20261105      # la date d'un build de https://build.protomaps.com (AAAAMMJJ)
python3 tools/build_data.py              # puis : déplier le nouveau fond
```

Ce qu'il fait :
1. `pmtiles extract` découpe dans le build distant les quatre parties du tableau ci-dessus. L'emprise du détail vient
   de `collectors/basemap/extents.py`, qui écrit en GeoJSON un carré par tuile du zoom 12 à moins de 1 km d'un membre
   (les membres hors de l'emprise du fond, comme ceux d'Europe, sont ignorés).
2. `tile-join` retire les couches inutiles, puis assemble le territoire, le couloir et le détail dans
   `collected/basemap.pmtiles` ; le sud va dans `collected/basemap-south.pmtiles`.
3. `collectors/basemap/style.mjs` écrit `collected/basemap-style.json` : les couches de `@protomaps/basemaps`, les
   couleurs de la carte, les noms en français, et seulement les couches gardées dans les tuiles.

Aucun de ces outils ne sert à construire le site.

## Du `.pmtiles` à la page

`tools/build_data.py` déplie `basemap.pmtiles`, puis `basemap-south.pmtiles`, en fichiers simples
`web/public/basemap/tiles/<z>/<x>/<y>.pbf` (environ 11 000 tuiles, 56 Mo, décompressées), que GitHub Pages sert comme
n'importe quel fichier. Il écrit aussi dans `web/generated/` :
- `basemapStyle.json`, copie de `collected/basemap-style.json` ;
- `coverage.json`, `{ "z": 12, "tiles": ["x/y", …] }` : les tuiles du premier zoom de détail qui existent.

La page (`web/src/features/map/lib/baseStyle.ts`) rend absolus les chemins du style (tuiles, polices, icônes) et
déclare deux protocoles, qui rendent une tuile vide, sans requête, là où le fond n'en a pas :
- `basemap://` : le fond complet ; au sud de 43° N, rien au-delà du zoom 6 ;
- `detail://` : une seconde source aux mêmes couches, peinte par-dessus du zoom 12 au 15, seulement sous les tuiles
  listées dans `coverage.json` ; ailleurs, le fond moins détaillé agrandi reste visible.

La carte ne se déplace pas au sud du fond qu'elle a : jusqu'au zoom 6 elle descend à 38° N, au-delà à 43° N environ
(`web/src/features/map/lib/bounds.ts`). Le style ne nomme pas les villes d'au moins deux membres, que la carte nomme
déjà au-dessus de leurs points.

## Licences

Données © contributeurs OpenStreetMap, sous ODbL, créditées dans la page. Style `@protomaps/basemaps` : BSD-3-Clause.
Polices Noto Sans : SIL OFL 1.1.
