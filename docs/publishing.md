# Publier la carte sur GitHub Pages

Le site est publié par GitHub Actions, à chaque push sur `main`. Il n'y a rien à construire ni à commiter à la main.

## Réglages du dépôt, une fois

- *Settings → Pages → Build and deployment → Source* : **GitHub Actions**.
- Aucun secret ni droit d'écriture n'est nécessaire : le workflow ne lit que le dépôt et ne commite rien.

Le site est alors à l'adresse `https://<compte>.github.io/<dépôt>/`. Le lien « dépôt du projet », au pied du panneau,
vient de la constante `REPOSITORY` de `tools/build_data.py` : elle doit nommer le dépôt qui publie.

## Ce que fait le workflow

[`.github/workflows/site.yml`](../.github/workflows/site.yml), sur Ubuntu 24.04 avec Node 24 :

1. valide `data/` (`tools/validate.py`) ;
2. teste les outils Python (`python3 -m unittest discover tests`) ;
3. écrit les données de la page (`tools/build_data.py`) ;
4. installe la page (`npm --prefix web ci`), la construit (`npm --prefix web run build`) et la teste
   (`npm --prefix web test`) ;
5. dépose `web/dist` comme artefact Pages, puis le job `deploy` le publie (environnement `github-pages`).

Il se déclenche sur un push sur `main`, sur une pull request (étapes 1 à 4 seulement : rien n'est publié) et à la main
(*Actions → Site → Run workflow*). Si une étape échoue, rien n'est publié et le site en ligne ne change pas ; une erreur
dans `data/` s'affiche aussi sur la ligne du fichier. Un nouveau push sur la même branche annule le passage en cours.

`tools/local_ci.sh` lance le même workflow en local avec [act](https://github.com/nektos/act) et podman, sans l'étape
de publication. Il faut act dans le `PATH`, le service podman de l'utilisateur
(`systemctl --user enable --now podman.socket`) et l'image `catthehacker/ubuntu:act-24.04` déjà présente (le script ne
la télécharge pas).

## Ce qui est versionné, et ce qui ne l'est pas

| Versionné | Produit à la construction (ignoré par git) |
|---|---|
| `data/` : les CSV du RQM (≈ 0,15 Mo) | `web/generated/` : les données de la page, en JSON (≈ 1,3 Mo) |
| `collected/` : le dernier relevé des collecteurs (≈ 46 Mo, dont le fond `basemap.pmtiles`, 43 Mo) | `web/public/basemap/tiles/` : le fond déplié (≈ 11 000 fichiers, 56 Mo) |
| le code : `tools/`, `collectors/`, `tests/`, `web/` (polices et icônes du fond comprises, ≈ 2 Mo) | `web/node_modules/`, `web/dist/` (le site, ≈ 61 Mo) |

`collected/` est versionné pour que le site se construise sans réseau ni collecteur. Chaque nouveau relevé ou nouveau
fond ajoute sa taille à l'historique : refaire le fond (43 Mo) est ce qui pèse ; le reste se compte en centaines de Ko.
Aucun fichier n'approche la limite de 100 Mo de GitHub.

## Rien de personnel dans le dépôt

- aucun nom de personne (voir [`privacy.md`](privacy.md)) ; les courriels et téléphones sont ceux de l'accueil des
  organismes ;
- `.env` (clés des collecteurs) et `.cache/` (réponses HTTP gardées par les collecteurs) sont ignorés par git ;
- aucun chemin ni réglage propre à une machine.

## Intégrer la carte dans une autre page

```html
<iframe src="https://<compte>.github.io/<dépôt>/" title="Carte du Réseau Québec maritime"
        style="width: 100%; height: 80vh; border: 0" allow="geolocation"></iframe>
```

Dans une iframe, la molette fait défiler la page qui l'accueille ; on zoome sur la carte avec Ctrl (ou ⌘) et la molette.
`allow="geolocation"` laisse « près de chez moi » demander la position du visiteur.

## Licence

Le dépôt n'a pas de fichier `LICENSE`. Le titulaire des droits en choisit une pour le code avant d'ouvrir le dépôt ; les
données gardent les licences de leurs sources (README, « Sources et licences »).
