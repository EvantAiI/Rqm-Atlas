# Tenir les données de la carte

La carte se construit à partir des fichiers du dossier `data/`. Ce sont des tableaux ordinaires (CSV) : on les ouvre
dans Excel, on les modifie, on les enregistre, et la carte se met à jour toute seule une fois les fichiers déposés sur
GitHub. Une vérification passe avant chaque mise en ligne : si quelque chose cloche, rien n'est publié et un message
dit quelle ligne corriger.

| Fichier | Une ligne = | Sert à |
|---|---|---|
| `organisations.csv` | un organisme, membre ou partenaire d'un projet | les points de la carte, les fiches |
| `projects.csv` | un projet du RQM | l'onglet Projets |
| `participations.csv` | un organisme dans un projet | relier les deux : qui travaille sur quoi |
| `axes.csv` | un axe de la stratégie scientifique | les couleurs et le filtre par axe |
| `programmes.csv` | un programme de financement du RQM | l'explication du programme dans la fiche d'un projet |

Les noms des colonnes ne changent pas : la vérification les reconnaît par leur nom, et l'ordre des colonnes est libre.

## Les identifiants

Chaque organisme a un **identifiant** (colonne `id`), et c'est lui qu'on écrit dans `participations.csv`. C'est le nom
court qu'on utilise déjà : `UQAR`, `ULaval`, `ISMER`, `Merinov`, `MPO`. Pour un organisme sans sigle connu, un nom court
en minuscules avec des tirets : `bio-laurentia`, `cegep-rimouski`.

- un identifiant ne change **jamais**, même si l'organisme change de nom (on change la colonne `nom`, pas `id`) ;
- un identifiant supprimé n'est pas réutilisé pour un autre organisme ;
- lettres, chiffres, tirets et points, sans espace ; majuscules et minuscules se valent (`uqar` désigne `UQAR`).

Les projets gardent leurs codes : `OSL2020.2`, `TN2021.3`, `Stratégique.7`.

## `organisations.csv`

| Colonne | Contenu | Obligatoire |
|---|---|---|
| `id` | l'identifiant (voir plus haut) | oui |
| `nom` | le nom complet | oui |
| `sigle` | le sigle, s'il y en a un | |
| `categorie` | `Régulier`, `Associé`, `Usager – Industriel`, `Usager – Communautaire`, `Usager – Gouvernemental` ; **vide pour un organisme qui n'est pas membre** | |
| `type` | `Université`, `Collège - CCTT`, `OBNL`, `Industriel`, `Fédéral`, `Provincial`, `Municipal`, `Autochtone` | |
| `adresse` | l'adresse du siège, comme sur une enveloppe : `310, allée des Ursulines, Rimouski G5L 3A1`. Celle où une source publique nomme l'organisme (son site, un registre) ; sans bureau ni case postale ; aux Îles, la municipalité `Les Îles-de-la-Madeleine`. Vide dans le doute : le point va au centre de la ville | |
| `ville` | la ville du siège social. Un secteur entre parenthèses est accepté : `Rimouski (Pointe-au-Père)` | oui pour un membre |
| `region` | la province (`Québec`, `Ontario`…) ; vide hors Canada | |
| `pays` | `Canada`, `France`… ; vide vaut `Canada` | |
| `site_web` | l'adresse du site, avec `https://` | |
| `courriel` | le courriel d'accueil, jamais celui d'une personne | |
| `telephone` | le téléphone d'accueil | |

**Où tombe le point.** Un membre est placé à son `adresse` si elle est dans sa ville (à moins de 25 km de son centre) ;
sinon, ou sans adresse, au centre de sa ville. Après avoir écrit ou changé des adresses, `python3 collectors/geocode.py`
les traduit en points dans `collected/geocoding.csv`. Une adresse pas encore traduite donne un avertissement à la
construction, et le point reste au centre de la ville. Les organismes qui ne sont pas membres n'ont pas de point : ils
apparaissent dans les fiches des projets.

**La région administrative** d'un membre (Bas-Saint-Laurent, Côte-Nord…) ne s'écrit nulle part : la construction la
déduit de son point, d'après les limites officielles des 17 régions. Un membre hors du Québec n'en a pas. La colonne
`region`, elle, est la province.

## `projects.csv`

| Colonne | Contenu | Obligatoire |
|---|---|---|
| `id` | le code du projet | oui |
| `titre` | le titre complet | oui |
| `titre_court` | 60 caractères au plus, pour les listes : « AUDITIF 2.1 : bruit des navires et moules » ; vide, les listes montrent le titre complet | |
| `annee` | l'année, quatre chiffres | oui |
| `programme` | `Odyssée St-Laurent`, `Temps-navire`, `Valorisation`, `PLAINE`, `Conjoints`, `Leviers`, `Stratégiques`, `Premiers projets`… | oui |
| `axe_principal` | `A1` à `A5` | oui |
| `axes_secondaires` | séparés par une virgule : `A1, A4` ; vide s'il n'y en a pas | |
| `transversal` | `oui` pour un projet de valorisation qui touche l'ensemble des axes ; sinon vide | |
| `fiche` | l'adresse de la page du projet sur rqm.quebec | |
| `accroche` | une phrase pour le grand public, souvent une question : « Comment passe-t-on à l'action avec les plans d'adaptation ? » ; vide si le titre suffit | |
| `description` | deux ou trois phrases : ce que le projet cherche ou a trouvé. **Sans nom de personne** | |

## `participations.csv`

| Colonne | Contenu |
|---|---|
| `projet` | le code du projet |
| `organisation` | l'identifiant de l'organisme |
| `role` | `principal` (l'organisme du chercheur principal), `partenaire` ou `collaborateur` |

Une ligne par organisme et par projet, pas par personne : si deux chercheurs du même organisme participent, une seule
ligne, avec le rôle le plus fort. **On n'écrit jamais de nom de personne dans ces fichiers** : ils sont publics.

## `axes.csv`

`code` (`A1`…), `libelle`, `court`, `couleur` (`#2E8B57`). `court` est le nom affiché sur la carte et dans les listes
(deux ou trois mots, « Transport maritime ») ; vide, la carte reprend `libelle`. Les codes ne sont jamais montrés aux
visiteurs. À ne toucher que si la stratégie scientifique change.

## `programmes.csv`

`programme` (écrit exactement comme dans la colonne `programme` de `projects.csv`) et `description` : une ou deux
phrases simples pour un visiteur qui ne connaît pas le RQM, montrées par le « ? » à côté du programme dans la fiche d'un
projet. Un programme de `projects.csv` sans sa ligne ici donne un avertissement, pas une erreur.

## Exemples

**Un nouveau membre** : une ligne dans `organisations.csv` (ici sans adresse : le point ira au centre de Gaspé).

```
nouvel-org;Nouvel Organisme maritime;NOM;Usager – Industriel;Industriel;;Gaspé;Québec;Canada;https://www.exemple.ca;;
```

**Une nouvelle cohorte de projets** : une ligne par projet dans `projects.csv`, puis une ligne par organisme et par
projet dans `participations.csv`. Un partenaire qui n'est pas encore dans `organisations.csv` y est d'abord ajouté,
catégorie vide.

```
OSL2026.1;Titre du projet;;2026;Odyssée St-Laurent;A1;A2;;;;
```
```
OSL2026.1;UQAR;principal
OSL2026.1;Merinov;partenaire
```

**Un membre qui quitte le RQM** : on vide sa catégorie. Il reste dans ses projets, sans point sur la carte ; on ne
supprime pas sa ligne s'il figure dans des projets.

## Avec Excel

- **Ouvrir** : double-clic sur le fichier ; Excel en français reconnaît le séparateur « ; ».
- **Enregistrer** : *Fichier → Enregistrer sous → CSV UTF-8*. L'autre format CSV d'Excel (ANSI) est accepté aussi, avec
  un avertissement, mais les accents peuvent s'y abîmer sur un Mac.
- La vérification tolère ce qu'Excel produit : séparateur « ; » ou « , », espaces autour des valeurs, lignes vides,
  majuscules ou minuscules dans les identifiants, trait d'union à la place du tiret (`Usager - Industriel`).
- Excel transforme parfois une valeur en date ou en nombre : si une cellule change d'allure après l'ouverture, annuler
  et mettre la colonne au format *Texte*.
- Les listes déroulantes d'Excel ne survivent pas à un CSV : c'est la vérification qui rattrape les fautes de frappe.

On peut aussi modifier un fichier directement sur GitHub : ouvrir le fichier, cliquer sur le crayon, modifier, puis
*Commit changes*.

## Quand la vérification refuse

Le message donne le fichier, la ligne et la correction, par exemple :

```
data/participations.csv, ligne 42 : l'organisation « uqarr » n'existe pas dans organisations.csv (voulez-vous dire « UQAR » ?)
data/projects.csv, ligne 12 : axe principal « A2* » inconnu ; axes définis : A1, A2, A3, A4, A5
data/organisations.csv, ligne 80 : « Nouvel Organisme » est membre mais sa ville est vide : elle place le point sur la carte
```

Sur GitHub, le message s'affiche aussi sur la ligne du fichier, dans l'onglet *Actions*. Les **avertissements** ne
bloquent rien : un projet sans participation ou sans chercheur principal, un organisme qui n'est ni membre ni dans un
projet, un `titre_court` de plus de 60 caractères, un programme sans explication.

Pour vérifier avant de déposer : `python3 tools/validate.py`, à la racine du dépôt.
