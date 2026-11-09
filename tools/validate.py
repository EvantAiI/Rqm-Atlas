#!/usr/bin/env python3
"""Vérifie les fichiers de data/ (tenus par le RQM) avant toute construction.

    python3 tools/validate.py

Chaque erreur dit le fichier, la ligne et quoi corriger ; une seule erreur
bloque la construction, et le site en ligne ne change pas. Les avertissements
signalent ce qui mérite un coup d'œil sans rien bloquer.

Ce que la lecture tolère, parce qu'Excel le produit : le séparateur « ; » (Excel
en français) ou « , », le BOM UTF-8 ou son absence, un fichier enregistré en
ANSI (Windows-1252), les espaces autour des valeurs, la casse des identifiants
(« uqar » désigne « UQAR ») et le trait d'union à la place du tiret
(« Usager - Industriel »).
"""
from __future__ import annotations

import csv
import difflib
import io
import os
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CATEGORIES = ["Régulier", "Associé", "Usager – Industriel", "Usager – Communautaire", "Usager – Gouvernemental"]
ROLES = {"principal": "Chercheur principal", "partenaire": "Partenaire", "collaborateur": "Collaborateur"}
# les colonnes de chaque fichier de data/, par nom de fichier
COLUMNS = {
    "organisations": ["id", "nom", "sigle", "categorie", "type", "adresse", "ville", "region", "pays", "site_web", "courriel", "telephone"],
    "projects": ["id", "titre", "titre_court", "annee", "programme", "axe_principal", "axes_secondaires", "transversal", "fiche",
                 "accroche", "description"],
    "participations": ["projet", "organisation", "role"],
    "axes": ["code", "libelle", "court", "couleur"],
    "programmes": ["programme", "description"],
}
REQUIRED = {"organisations": ["id", "nom"], "projects": ["id", "titre", "annee", "programme", "axe_principal"],
            "participations": ["projet", "organisation", "role"], "axes": ["code", "libelle", "couleur"],
            "programmes": ["programme"]}
IDENTIFIER = re.compile(r"^\w[\w.-]*$")


class Report:
    def __init__(self) -> None:
        self.entries: list[tuple[str, str, int | None, str]] = []   # (niveau, fichier, ligne, message)

    def error(self, file: str, line: int | None, message: str) -> None:
        self.entries.append(("error", file, line, message))

    def warn(self, file: str, line: int | None, message: str) -> None:
        self.entries.append(("warning", file, line, message))

    def _text(self, level: str) -> list[str]:
        return [f"{f}, ligne {l} : {m}" if l else f"{f} : {m}" for n, f, l, m in self.entries if n == level]

    @property
    def errors(self) -> list[str]:
        return self._text("error")

    @property
    def warnings(self) -> list[str]:
        return self._text("warning")


def key(text: str) -> str:
    """Comparaison tolérante : sans casse, sans accents, tirets unifiés, espaces réduites."""
    t = unicodedata.normalize("NFKD", text.replace("œ", "oe").replace("Œ", "OE"))
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    return re.sub(r"\s+", " ", re.sub(r"[‐-―−-]", "-", t)).strip()


def read_csv(path: Path, name: str, report: Report) -> tuple[list[dict], list[str]] | None:
    """Les lignes d'un CSV en dictionnaires, avec « _ligne », le numéro de ligne dans le fichier, et ses colonnes."""
    if not path.exists():
        report.error(name, None, "fichier introuvable")
        return None
    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp1252")
        report.warn(name, None, "enregistré en ANSI (Windows-1252) : préférer « CSV UTF-8 » dans Excel ; lu quand même")
    header = text.split("\n", 1)[0]
    reader = csv.reader(io.StringIO(text, newline=""), delimiter=";" if header.count(";") >= header.count(",") else ",")
    rows, columns = [], None
    for values in reader:
        if columns is None:
            columns = [key(v) for v in values]
            continue
        if not any(v.strip() for v in values):
            continue   # ligne vide laissée par Excel
        if len(values) > len(columns) and any(v.strip() for v in values[len(columns):]):
            report.error(name, reader.line_num, f"{len(values)} valeurs pour {len(columns)} colonnes "
                                                "(un « ; » ou une « , » de trop dans une cellule non entre guillemets ?)")
        row = {c: (values[i].strip() if i < len(values) else "") for i, c in enumerate(columns) if c}
        row["_ligne"] = reader.line_num
        rows.append(row)
    return rows, columns or []


def load(root: Path) -> tuple[dict[str, list[dict]], Report]:
    """Lit et vérifie root/data/ ; rend les lignes normalisées, par nom de fichier, et le rapport."""
    r = Report()
    t: dict[str, list[dict]] = {}
    for stem, expected in COLUMNS.items():
        file = f"data/{stem}.csv"
        read = read_csv(root / file, file, r)
        if not read:
            t[stem] = []
            continue
        rows, columns = read
        for c in REQUIRED[stem]:
            if c not in columns:
                r.error(file, 1, f"colonne « {c} » absente (colonnes attendues : {'; '.join(expected)})")
        for c in columns:
            if c and c not in expected:
                r.warn(file, 1, f"colonne « {c} » inconnue, ignorée")
        for row in rows:
            for c in expected:
                row.setdefault(c, "")
            for c in REQUIRED[stem]:
                if c in columns and not row[c]:
                    r.error(file, row["_ligne"], f"« {c} » est vide")
        t[stem] = rows

    # axes
    axes = {}
    for a in t["axes"]:
        if not re.fullmatch(r"#[0-9A-Fa-f]{6}", a["couleur"]):
            r.error("data/axes.csv", a["_ligne"], f"couleur « {a['couleur']} » : attendu #RRVVBB, par exemple #2E8B57")
        if a["code"].upper() in axes:
            r.error("data/axes.csv", a["_ligne"], f"l'axe « {a['code']} » est déjà défini")
        axes[a["code"].upper()] = {"code": a["code"].upper(), "libelle": a["libelle"],
                                    "court": a.get("court") or a["libelle"], "couleur": a["couleur"]}

    # programmes : l'explication de chacun, montrée dans la fiche d'un projet
    programmes = {}
    for g in t["programmes"]:
        if key(g["programme"]) in programmes:
            r.error("data/programmes.csv", g["_ligne"], f"le programme « {g['programme']} » est déjà défini")
        programmes[key(g["programme"])] = {"programme": g["programme"], "description": g["description"]}

    # organisations
    orgs, by_id = [], {}
    categories = {key(c): c for c in CATEGORIES}
    for o in t["organisations"]:
        f, n = "data/organisations.csv", o["_ligne"]
        if o["id"] and not IDENTIFIER.fullmatch(o["id"]):
            r.error(f, n, f"identifiant « {o['id']} » : lettres, chiffres, « - » ou « . » seulement, sans espace")
            continue
        if o["id"].lower() in by_id:
            r.error(f, n, f"l'identifiant « {o['id']} » est déjà pris, ligne {by_id[o['id'].lower()]['_ligne']}")
            continue
        if o["categorie"] and key(o["categorie"]) not in categories:
            r.error(f, n, f"catégorie « {o['categorie']} » inconnue ; valeurs possibles : {', '.join(CATEGORIES)}, "
                          "ou vide pour une organisation qui n'est pas membre")
            continue
        o["categorie"] = categories.get(key(o["categorie"]), "")
        if o["categorie"] and not o["ville"]:
            r.error(f, n, f"« {o['nom']} » est membre mais sa ville est vide : elle place le point sur la carte")
        if o["courriel"] and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", o["courriel"]):
            r.error(f, n, f"courriel « {o['courriel']} » : attendu nom@domaine.ca")
        if o["site_web"] and not re.match(r"https?://", o["site_web"]):
            r.error(f, n, f"site web « {o['site_web']} » : l'adresse doit commencer par http:// ou https://")
        if o["id"]:
            by_id[o["id"].lower()] = o
            orgs.append(o)

    # projets
    projects, by_project = [], {}
    for p in t["projects"]:
        f, n = "data/projects.csv", p["_ligne"]
        if p["id"] and not IDENTIFIER.fullmatch(p["id"]):
            r.error(f, n, f"code « {p['id']} » : lettres, chiffres, « - » ou « . » seulement")
            continue
        if p["id"].lower() in by_project:
            r.error(f, n, f"le code « {p['id']} » est déjà pris, ligne {by_project[p['id'].lower()]['_ligne']}")
            continue
        if p["annee"] and not re.fullmatch(r"(19|20)\d\d", p["annee"]):
            r.error(f, n, f"année « {p['annee']} » : attendu quatre chiffres, par exemple 2021")
        main_axis = p["axe_principal"].upper()
        if main_axis and main_axis not in axes:
            r.error(f, n, f"axe principal « {p['axe_principal']} » inconnu ; axes définis : {', '.join(axes)}")
        secondary = [a.upper() for a in re.split(r"[,;\s/]+", p["axes_secondaires"]) if a and a not in "—-"]
        for a in secondary:
            if a not in axes:
                r.error(f, n, f"axe secondaire « {a} » inconnu ; axes définis : {', '.join(axes)} "
                              "(séparer plusieurs axes par une virgule : A1, A2)")
        if main_axis in secondary:
            r.warn(f, n, f"{main_axis} est à la fois principal et secondaire")
        if p["programme"] and key(p["programme"]) not in programmes:
            r.warn(f, n, f"programme « {p['programme']} » absent de data/programmes.csv : la fiche du projet ne l'expliquera pas")
        if key(p["transversal"]) not in ("", "oui", "non"):
            r.error(f, n, f"transversal « {p['transversal']} » : « oui », « non » ou vide")
        if p["fiche"] and not re.match(r"https?://", p["fiche"]):
            r.error(f, n, f"fiche « {p['fiche']} » : l'adresse doit commencer par http:// ou https://")
        p.update(axe_principal=main_axis, axes_secondaires=[a for a in secondary if a != main_axis],
                 transversal=key(p["transversal"]) == "oui")
        if p["id"]:
            by_project[p["id"].lower()] = p
            projects.append(p)

    # participations
    participations, seen = [], {}
    org_ids = [o["id"].lower() for o in orgs]
    for x in t["participations"]:
        f, n = "data/participations.csv", x["_ligne"]
        p, o = by_project.get(x["projet"].lower()), by_id.get(x["organisation"].lower())
        if x["projet"] and not p:
            r.error(f, n, f"le projet « {x['projet']} » n'existe pas dans projects.csv")
        if x["organisation"] and not o:
            close = [by_id[c]["id"] for c in difflib.get_close_matches(x["organisation"].lower(), org_ids, n=1, cutoff=0.6)]
            r.error(f, n, f"l'organisation « {x['organisation']} » n'existe pas dans organisations.csv"
                          + (f" (voulez-vous dire « {close[0]} » ?)" if close else ""))
        role = key(x["role"])
        if x["role"] and role not in ROLES:
            r.error(f, n, f"rôle « {x['role']} » inconnu ; valeurs possibles : {', '.join(ROLES)}")
        if not (p and o and role in ROLES):
            continue
        k = (p["id"], o["id"])
        if k in seen:
            r.error(f, n, f"{o['id']} figure déjà dans {p['id']}, ligne {seen[k]} : une ligne par organisation et par projet")
            continue
        seen[k] = n
        participations.append({"projet": p["id"], "organisation": o["id"], "role": role})

    # ce qui ne bloque pas, mais mérite un regard
    with_participation = {x["projet"] for x in participations}
    with_lead = {x["projet"] for x in participations if x["role"] == "principal"}
    for p in projects:
        if p["id"] not in with_participation:
            r.warn("data/projects.csv", p["_ligne"], f"{p['id']} n'a aucune participation")
        elif p["id"] not in with_lead:
            r.warn("data/projects.csv", p["_ligne"], f"{p['id']} n'a pas de chercheur principal (rôle « principal »)")
    cited = {x["organisation"] for x in participations}
    for o in orgs:
        if not o["categorie"] and o["id"] not in cited:
            r.warn("data/organisations.csv", o["_ligne"], f"{o['id']} n'est ni membre ni dans un projet")

    for p in projects:
        if len(p["titre_court"]) > 60:
            r.warn("data/projects.csv", p["_ligne"], f"{p['id']} : titre_court de {len(p['titre_court'])} caractères, 60 au plus pour tenir dans les listes")
    return {"axes": list(axes.values()), "programmes": list(programmes.values()), "organisations": orgs,
            "projects": projects, "participations": participations}, r


def main() -> int:
    data, r = load(ROOT)
    if os.environ.get("GITHUB_ACTIONS") == "true":   # chaque problème s'affiche aussi sur la ligne du fichier, dans GitHub
        for level, file, line, message in r.entries:
            print(f"::{level} file={file}{f',line={line}' if line else ''}::{message}")
    for w in r.warnings:
        print(f"avertissement · {w}")
    for e in r.errors:
        print(f"ERREUR · {e}")
    members = sum(1 for o in data["organisations"] if o["categorie"])
    print(f"\n{len(data['organisations'])} organisations dont {members} membres, {len(data['projects'])} projets, "
          f"{len(data['participations'])} participations, {len(data['axes'])} axes — "
          f"{len(r.errors)} erreur{'s' if len(r.errors) > 1 else ''}, "
          f"{len(r.warnings)} avertissement{'s' if len(r.warnings) > 1 else ''}")
    return 1 if r.errors else 0


if __name__ == "__main__":
    sys.exit(main())
