# Pas de personnes sur la carte

La carte montre des organisations, jamais des personnes. Le dépôt ne contient aucun nom de chercheur : ni dans `data/`,
ni dans `collected/`, ni dans la page. Le classeur des projets du RQM nomme les chercheurs ; ces noms n'entrent jamais
dans le dépôt. Dans un projet, un organisme porte le rôle le plus fort de ses chercheurs (principal, partenaire,
collaborateur), sans dire lesquels.

## Pourquoi

Ce texte résume le cadre légal ; ce n'est pas un avis juridique. Avant d'afficher des personnes, le RQM le ferait valider
par le responsable de la protection des renseignements personnels de l'établissement qui l'héberge.

**La loi applicable.** La Loi 25 (L.Q. 2021, c. 25) a modifié la *Loi sur l'accès aux documents des organismes publics
et sur la protection des renseignements personnels* (RLRQ, c. A-2.1) et la *Loi sur la protection des renseignements
personnels dans le secteur privé* (RLRQ, c. P-39.1). Le RQM est rattaché à l'UQAR, un organisme public : c'est la Loi
sur l'accès qui s'applique.

**Un profil de chercheur est un renseignement personnel.** Est personnel « tout renseignement qui concerne une personne
physique et permet, directement ou indirectement, de l'identifier » (art. 54), qu'il soit public ou non : la loi n'a pas
d'exception générale pour les données déjà publiées. Un nom associé à une organisation, des projets, des publications
et une position sur une carte forme une fiche qui n'existe nulle part ailleurs ; c'est le RQM qui la créerait.

**Ce que la loi exige pour en publier.** Une collecte nécessaire aux attributions de l'organisme (art. 64), une
utilisation limitée à sa fin (art. 65.1), le consentement de la personne pour communiquer ses renseignements au public
(art. 53, 53.1 et 59), une évaluation des facteurs relatifs à la vie privée avant tout système qui en traite (art.
63.5), et des droits d'accès et de rectification (art. 83 et 89). Le Code civil (art. 35 à 37) pose les mêmes limites à
quiconque constitue un dossier sur une personne.

**Ce que l'exception couvre, et ne couvre pas.** Le nom, la fonction et les coordonnées de travail du personnel d'un
organisme public sont publics (art. 57), et ceux du personnel d'une entreprise échappent aux règles de protection (art.
55). Cette exception couvre l'annuaire (qui, où, comment le joindre), pas le profil (sur quoi la personne travaille,
avec qui). Elle ne vise pas non plus les étudiants, les stagiaires ou les retraités, nombreux parmi les auteurs.

Les licences des sources ne changent rien : OpenAlex est sous CC0, mais une licence règle le droit d'auteur sur le jeu
de données, pas la protection des renseignements personnels de ceux qu'il nomme.

## La règle

- Aucun nom de personne dans `data/`, `collected/`, la page ou les tests.
- Les courriels et téléphones de `organisations.csv` sont ceux de l'accueil de l'organisme, jamais ceux d'une personne.
- Les publications sont rattachées aux institutions (OpenAlex), jamais à leurs auteurs.
- Montrer des personnes demanderait leur consentement explicite, une évaluation des facteurs relatifs à la vie privée et
  l'accord du responsable de la protection des renseignements personnels.

Textes : [Loi sur l'accès](https://www.legisquebec.gouv.qc.ca/fr/document/lc/A-2.1),
[Loi sur le privé](https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-39.1),
[Loi 25](https://www.legisquebec.gouv.qc.ca/fr/document/la/2021C25),
[Code civil](https://www.legisquebec.gouv.qc.ca/fr/document/lc/CCQ-1991),
[guide de la CAI sur l'EFVP](https://www.cai.gouv.qc.ca/uploads/pdfs/CAI_GU_EFVP.pdf).
