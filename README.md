# Carte des membres et des projets du Réseau Québec maritime

Une carte interactive des membres du Réseau Québec maritime (RQM) et des projets de recherche qu'ils mènent ensemble.
Onglet **Membres** : où sont les membres, leur catégorie, avec qui ils travaillent. Onglet **Projets** : les projets du
RQM, filtrés par année, programme et axe, et leurs organisations reliées sur la carte. C'est un site statique, publié
par GitHub Pages ; la page ne fait appel à aucun service extérieur.

## Le dépôt

| Dossier | Contenu | Tenu par |
|---|---|---|
| `data/` | `organisations.csv`, `projects.csv`, `participations.csv`, `axes.csv`, `programmes.csv` | **le RQM**, dans Excel ou sur GitHub (mode d'emploi : [`docs/data.md`](docs/data.md)) |
| `collected/` | les points des adresses, le répertoire des villes, les limites des régions, le relevé des publications, le fond de carte et son style | les scripts de `collectors/`, jamais à la main |
| `collectors/` | les scripts qui relèvent les sources publiques et écrivent `collected/` | le code |
| `tools/` | `validate.py` (vérifie `data/`), `build_data.py` (écrit les données de la page), `local_ci.sh` (la CI en local) | le code |
| `tests/` | les tests de `tools/` | le code |
| `web/` | la page (React, TypeScript, Vite) ; voir [`web/README.md`](web/README.md) | le code |
| `docs/` | [`data.md`](docs/data.md), [`privacy.md`](docs/privacy.md), [`basemap.md`](docs/basemap.md), [`publishing.md`](docs/publishing.md) | le code |

`collected/` est versionné : le site se construit sans réseau, avec le dernier relevé. Ce qui est produit à la
construction (`web/generated/`, `web/public/basemap/tiles/`, `web/dist/`) n'est pas versionné.

## La chaîne

Elle va dans un seul sens, des CSV à la page :

```
data/ (RQM) ──┐
              ├─ validate.py ─ build_data.py ─ npm ci ─ npm run build ─ npm test ─ GitHub Pages (web/dist)
collected/ ───┘
```

1. `tools/validate.py` vérifie `data/` ; chaque erreur donne, en français, le fichier, la ligne et la correction.
2. `tools/build_data.py` valide à son tour, puis vide et réécrit `web/generated/` (les données de la page, en JSON) et
   `web/public/basemap/tiles/` (les tuiles du fond, environ 11 000 fichiers, 56 Mo).
3. `npm --prefix web ci` installe les dépendances de la page.
4. `npm --prefix web run build` précalcule le placement des membres, vérifie les types, passe ESLint et construit
   `web/dist`.
5. `npm --prefix web test` teste la page sur les données de `web/generated/`.

GitHub Actions ([`.github/workflows/site.yml`](.github/workflows/site.yml)) fait tout cela à chaque push sur `main`,
avec Node 24, puis publie `web/dist` sur GitHub Pages. Sur une pull request, la chaîne tourne sans publier. Une erreur
dans `data/` arrête tout avant la publication : le site en ligne ne change pas, et l'erreur s'affiche sur la ligne du
fichier, dans l'onglet *Actions*. `tools/local_ci.sh` lance le même workflow en local avec act et podman (la
publication y est sautée). Publier : [`docs/publishing.md`](docs/publishing.md).

## En local

Il faut Python 3 (bibliothèque standard seulement) et Node 24.

```sh
python3 tools/validate.py                  # vérifie data/
python3 tools/build_data.py                # écrit web/generated/ et web/public/basemap/tiles/
npm --prefix web ci                        # une fois : les dépendances de la page
npm --prefix web run build                 # la page, dans web/dist
python3 -m http.server -d web/dist 8080    # puis http://localhost:8080
npm --prefix web run dev                   # ou la page en développement, rechargée à chaque modification
python3 -m unittest discover tests         # tests de tools/
npm --prefix web test                      # tests de la page
tools/local_ci.sh                          # le workflow de GitHub, avec act et podman
```

La page se sert par HTTP (les tuiles du fond sont des fichiers à côté d'elle) ; les chemins sont relatifs, si bien que
le même `web/dist` marche sur GitHub Pages et en local. Liens directs : une fiche (`#membre=UQAR`, `#projet=OSL2020.2`)
ou une vue filtrée (`#vue=projets&annee=2024`, que le bouton « Copier le lien » produit).

## Les collecteurs

Ils relèvent les sources publiques et écrivent `collected/`. Aucun n'est nécessaire pour construire le site : on les
relance quand une source ou les données du RQM changent, puis on commite `collected/`.

| Script | Lit → écrit | Quand le lancer |
|---|---|---|
| `collectors/geocode.py` | les adresses de `data/organisations.csv`, par Adresses Québec puis Nominatim (OpenStreetMap) → `collected/geocoding.csv` | après avoir écrit ou changé une adresse |
| `collectors/publications.py` | ROR et OpenAlex, pour les membres qui ont un site web → `collected/publications.json`, daté | quelques fois par an |
| `collectors/regions.py` | les Découpages administratifs du MRNF (Données Québec) → `collected/regions.geojson` | quand le Québec redécoupe ses régions |
| `collectors/towns.py` | le fichier Canada de GeoNames, et trois villes de Wikidata → `collected/towns.csv` | quand une ville d'un membre manque |
| `collectors/basemap/make.sh` | un build OpenStreetMap de Protomaps → `collected/basemap.pmtiles`, `basemap-south.pmtiles`, `basemap-style.json` | rarement ; voir [`docs/basemap.md`](docs/basemap.md) |

`collectors/fetch.py` est leur client HTTP commun : il garde les réponses dans `.cache/` (ignoré par git, qu'on peut
effacer) et ne refait une requête qu'après 14 jours pour OpenAlex, 30 pour les sites des membres, 90 pour ROR,
Adresses Québec et Nominatim. `publications.py --demo` et `towns.py --demo` vérifient leur logique hors ligne.

Un fichier `.env` à la racine (ignoré par git) peut donner deux réglages, tous deux facultatifs :

| Clé | Effet |
|---|---|
| `OPENALEX_API_KEY` | clé gratuite d'OpenAlex : dix fois plus de requêtes permises |
| `CONTACT_EMAIL` | l'adresse de contact donnée à OpenAlex |

## Les règles

- **La position d'un membre, c'est l'adresse écrite dans `organisations.csv`**, si elle tombe à moins de 25 km du centre
  de sa ville ; sinon, ou sans adresse, le point va au centre de sa ville (`collected/towns.csv`).
- **La région administrative se déduit du point**, à la construction, d'après les limites officielles
  (`collected/regions.geojson`) : rien à remplir.
- **Pas de personnes.** Le dépôt ne contient aucun nom de chercheur, et n'en contiendra pas : la carte montre des
  organisations. Pourquoi : [`docs/privacy.md`](docs/privacy.md).
- **Chaque donnée relevée a une source publique**, citée dans la page (« Sources », au pied du panneau).

## Sources et licences

| Source | Usage | Licence |
|---|---|---|
| Réseau Québec maritime | membres, projets, axes, programmes, rôles | données du RQM |
| [Adresses Québec](https://www.donneesquebec.ca/recherche/dataset/referentiel-quebecois-des-adresses) (Données Québec) | points des adresses | CC-BY 4.0 |
| [Nominatim](https://nominatim.openstreetmap.org) ([OpenStreetMap](https://www.openstreetmap.org/copyright)) | points des adresses qu'Adresses Québec ne trouve pas | ODbL |
| [GeoNames](https://www.geonames.org), [Wikidata](https://www.wikidata.org) | centre des villes, villes de « près de chez moi » | CC-BY 4.0, CC0 |
| [Découpages administratifs](https://www.donneesquebec.ca/recherche/dataset/decoupages-administratifs) du MRNF (Données Québec) | régions administratives | CC-BY 4.0 |
| [ROR](https://ror.org), [OpenAlex](https://openalex.org) | publications des membres | CC0 |
| [OpenStreetMap](https://www.openstreetmap.org/copyright), tuiles et style [Protomaps](https://protomaps.com) (`@protomaps/basemaps` 5.7.2) | fond de carte | ODbL ; style BSD-3-Clause |
| [MapLibre GL JS](https://maplibre.org) 6.11.2 | affichage de la carte | BSD-3-Clause |
| Noto Sans (fond), Lato (page) | polices | SIL OFL 1.1 |
| [Icônes de Mapzen](https://github.com/tangrams/icons), par [Protomaps](https://github.com/protomaps/basemaps-assets) | icônes du fond | MIT |

Les textes de ces deux licences accompagnent les fichiers : `web/public/basemap/fonts/OFL.txt` et `web/public/basemap/sprites/LICENSE.md`.
