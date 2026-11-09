#!/usr/bin/env python3
"""Le répertoire des villes du Canada, dans collected/towns.csv.

    python3 collectors/towns.py          # rarement : quand une ville du RQM manque au répertoire
    python3 collectors/towns.py --demo   # contrôle hors ligne du choix d'une ville par nom

Télécharge le fichier Canada de GeoNames (https://download.geonames.org/export/dump/CA.zip,
CC-BY 4.0), gardé dans .cache/geonames-CA.zip ; écrit collected/towns.csv
(ville;region;pays;lat;lon;population;source), où tools/build_data.py trouve le centre de la
ville d'un membre sans adresse géocodée, et la page les villes de « près de chez moi ».

Une ville est un lieu habité de GeoNames (classe P) ou une municipalité (A.ADM3), une seule par
nom et par province : le lieu habité d'abord, puis le plus peuplé, puis le plus ancien
identifiant. Trois villes du RQM absentes de GeoNames viennent de Wikidata (CC0).
"""
from __future__ import annotations

import csv
import io
import os
import sys
import urllib.request
import zipfile
from pathlib import Path

from fetch import UA

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "collected" / "towns.csv"
ARCHIVE = ROOT / ".cache" / "geonames-CA.zip"
URL = "https://download.geonames.org/export/dump/CA.zip"
COLUMNS = ["ville", "region", "pays", "lat", "lon", "population", "source"]
PROVINCES = {"10": "Québec", "01": "Alberta", "02": "Colombie-Britannique", "03": "Manitoba",
             "04": "Nouveau-Brunswick", "05": "Terre-Neuve-et-Labrador", "07": "Nouvelle-Écosse",
             "08": "Ontario", "09": "Île-du-Prince-Édouard", "11": "Saskatchewan", "12": "Yukon",
             "13": "Territoires du Nord-Ouest", "14": "Nunavut"}   # codes admin1 de GeoNames
WIKIDATA = [{"ville": "Gesgapegiag", "region": "Québec", "pays": "Canada", "lat": "48.2014", "lon": "-65.926",
             "population": "", "source": "wikidata:Q3104462"},
            {"ville": "Odanak", "region": "Québec", "pays": "Canada", "lat": "46.07712", "lon": "-72.82521",
             "population": "", "source": "wikidata:Q1607741"},
            {"ville": "Montpellier", "region": "", "pays": "France", "lat": "43.61092", "lon": "3.87723",
             "population": "", "source": "wikidata:Q6441"}]


def towns(lines) -> list[dict]:
    """Les lignes de CA.txt (colonnes de GeoNames séparées par des tabulations) -> une ville par
    nom et par province, le Québec d'abord, puis par province et par nom."""
    best: dict[tuple[str, str], tuple[tuple, list[str]]] = {}
    for line in lines:
        f = line.rstrip("\n").split("\t")
        name, feature_class, feature_code, admin1, population = f[1], f[6], f[7], f[10], int(f[14] or 0)
        if admin1 not in PROVINCES or not (feature_class == "P" or (feature_class, feature_code) == ("A", "ADM3")):
            continue
        rank = (feature_class != "P", -population, int(f[0]))
        key = (name, admin1)
        if key not in best or rank < best[key][0]:
            best[key] = (rank, f)
    rows = [{"ville": f[1], "region": PROVINCES[f[10]], "pays": "Canada", "lat": round(float(f[4]), 5),
             "lon": round(float(f[5]), 5), "population": f[14], "source": f"geonames:{f[0]}"}
            for _, f in best.values()]
    return sorted(rows, key=lambda t: (t["region"] != "Québec", t["region"], t["ville"]))


def main() -> int:
    if not ARCHIVE.exists():
        ARCHIVE.parent.mkdir(exist_ok=True)
        with urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": UA}), timeout=300) as r:
            ARCHIVE.write_bytes(r.read())
    with zipfile.ZipFile(ARCHIVE) as z, z.open("CA.txt") as raw:
        rows = towns(io.TextIOWrapper(raw, encoding="utf-8")) + WIKIDATA
    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=COLUMNS, delimiter=";", lineterminator="\n")
    w.writeheader()
    w.writerows(rows)
    tmp = OUTPUT.with_suffix(".tmp")
    tmp.write_text(out.getvalue(), encoding="utf-8-sig")
    os.replace(tmp, OUTPUT)
    print(f"{len(rows)} villes (collected/towns.csv)")
    return 0


def demo() -> None:
    def line(gid, name, cls, code, admin1, pop, lat="46.8", lon="-71.2"):
        return "\t".join([gid, name, name, "", lat, lon, cls, code, "CA", "", admin1, "", "", "", pop]) + "\n"
    rows = towns([line("3", "Gore", "A", "ADM3", "10", "1775"), line("2", "Gore", "P", "PPL", "10", "0"),
                  line("5", "Gore", "P", "PPL", "10", "0"), line("4", "Gore", "P", "PPL", "08", "9"),
                  line("6", "Hatley", "A", "ADM3", "10", "2230", "45.0", "-72.0"),
                  line("7", "Lac", "H", "LK", "10", "0"), line("8", "Nulle part", "P", "PPL", "", "0")])
    # le lieu habité avant la municipalité, puis le plus ancien identifiant ; une ville par province
    assert [(t["ville"], t["region"], t["source"]) for t in rows] == [
        ("Gore", "Québec", "geonames:2"), ("Hatley", "Québec", "geonames:6"), ("Gore", "Ontario", "geonames:4")]
    assert (rows[1]["lat"], rows[1]["lon"]) == (45.0, -72.0)   # écrit « 45.0 », comme le fichier
    print("demo: ok")


if __name__ == "__main__":
    demo() if "--demo" in sys.argv else sys.exit(main())
