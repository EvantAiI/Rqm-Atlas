#!/usr/bin/env python3
"""Géocode les adresses de data/organisations.csv dans collected/geocoding.csv.

    python3 collectors/geocode.py     # après avoir écrit ou changé une adresse

Lit data/organisations.csv (par tools/validate.py) et collected/geocoding.csv ; écrit
collected/geocoding.csv (adresse;ville;lat;lon;source).

L'adresse est la donnée (le RQM l'écrit, un humain la relit) ; le point n'est que sa
traduction. Seules les adresses absentes de collected/geocoding.csv sont demandées : au
géocodeur officiel du Québec (Adresses Québec), à OpenStreetMap (Nominatim) quand il ne
trouve pas. Une adresse introuvable est signalée, et le membre reste au centre de sa ville.
Les adresses qui ne sont plus dans organisations.csv quittent le fichier.
"""
from __future__ import annotations

import csv
import io
import os
import re
import sys
import urllib.parse
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / "tools"))
from fetch import fetch_json  # noqa: E402
import validate  # noqa: E402

GEOCODING = ROOT / "collected" / "geocoding.csv"
COLUMNS = ["adresse", "ville", "lat", "lon", "source"]
# Référentiel québécois des adresses (ministère des Ressources naturelles et des Forêts),
# sur Données Québec en CC-BY 4.0 : ni clé, ni compte, ni limite à la conservation des
# coordonnées. Il exige une adresse civique complète, pas un code postal seul ni une ville.
GEOCODER_QC = ("https://servicescarto.mrnf.gouv.qc.ca/pes/rest/services/Territoire/"
               "Adresse_Geocodage/GeocodeServer/findAddressCandidates")
MIN_SCORE_QC = 80
QC_BOX = {"lat": (44.5, 63.0), "lon": (-80.0, -56.0)}
POSTAL = re.compile(r"\b([GHJ]\d[A-Z])[  -]?(\d[A-Z]\d)\b")


def in_quebec(point: tuple[float, float]) -> bool:
    lat, lon = point
    return QC_BOX["lat"][0] <= lat <= QC_BOX["lat"][1] and QC_BOX["lon"][0] <= lon <= QC_BOX["lon"][1]


def query(o: dict) -> str:
    """L'adresse, suivie de la ville si elle ne la contient pas déjà."""
    return o["adresse"] if o["ville"].lower() in o["adresse"].lower() else f"{o['adresse']}, {o['ville']}"


def points_qc(address: str) -> list[tuple[float, float]]:
    """Positions que le géocodeur officiel donne à une adresse civique, dans son ordre.
    Sans parenthèses (« Rimouski (secteur Le Bic) ») ni code postal, qui font chuter son
    score ; un score faible est un rapprochement approximatif, écarté. Il répond tantôt par
    l'adresse civique (Loc_name RQA_Adresse), tantôt par le seul segment de rue (RQA_Rue),
    souvent mieux noté et à 3 km du numéro : seule l'adresse civique compte."""
    single_line = POSTAL.sub("", re.sub(r"\s*\([^)]*\)", "", address)).strip(" ,; \t")
    url = GEOCODER_QC + "?" + urllib.parse.urlencode(
        {"SingleLine": single_line, "f": "json", "outSR": "4326", "maxLocations": 3, "outFields": "Loc_name"})
    points = []
    for c in (fetch_json(url, ttl_days=90, min_interval=0.5) or {}).get("candidates", []):
        if c.get("score", 0) >= MIN_SCORE_QC and (c.get("attributes") or {}).get("Loc_name") == "RQA_Adresse":
            point = (c["location"]["y"], c["location"]["x"])
            if in_quebec(point):
                points.append(point)
    return points


def same_door(address: str) -> tuple[float, float] | None:
    """Le géocodeur sous-note une adresse dont la rue porte un secteur (« 1re Avenue
    (Mont-Louis) Ouest ») : on accepte sa réponse si le numéro et le code postal sont les nôtres."""
    number, postal = re.match(r"\d+", address), re.search(r"[A-Z]\d[A-Z] ?\d[A-Z]\d", address)
    if not (number and postal):
        return None
    url = GEOCODER_QC + "?" + urllib.parse.urlencode(
        {"SingleLine": address, "f": "json", "outSR": "4326", "maxLocations": 3, "outFields": "Loc_name"})
    for c in (fetch_json(url, ttl_days=90, min_interval=0.5) or {}).get("candidates", []):
        if ((c.get("attributes") or {}).get("Loc_name") == "RQA_Adresse" and c["address"].startswith(number[0] + " ")
                and postal[0].replace(" ", "") in c["address"].replace(" ", "")):
            return c["location"]["y"], c["location"]["x"]
    return None


def nominatim(q: str) -> tuple[float, float] | None:
    """Le premier résultat d'OpenStreetMap au Québec."""
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"q": f"{q}, Québec, Canada", "format": "jsonv2", "limit": 3, "countrycodes": "ca"})
    for hit in fetch_json(url, ttl_days=90, min_interval=1.1) or []:
        point = (float(hit["lat"]), float(hit["lon"]))
        if in_quebec(point):
            return point
    return None


def geocode(o: dict) -> tuple[tuple[float, float], str] | None:
    # ponytail: Québec seulement (les membres hors Québec sont hors de la carte et restent au
    # centre de leur ville) ; ajouter un géocodeur mondial le jour où l'un d'eux compte.
    if (o["pays"] or "Canada") != "Canada" or (o["region"] or "Québec") != "Québec":
        return None
    # L'adresse telle qu'écrite d'abord : y ajouter la ville du RQM (« Rimouski (Le Bic) »,
    # « Ile des Sœurs ») fait échouer Adresses Québec quand l'adresse porte déjà la sienne.
    for q in dict.fromkeys((o["adresse"], query(o))):
        point = next(iter(points_qc(q)), None)
        if point:
            return point, "adresses_quebec"
    point = same_door(o["adresse"])
    if point:
        return point, "adresses_quebec"
    point = nominatim(query(o))   # hors du référentiel québécois : OpenStreetMap
    return (point, "openstreetmap") if point else None


def read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return list(csv.DictReader(io.StringIO(path.read_text(encoding="utf-8-sig")), delimiter=";"))


def write_csv(path: Path, columns: list[str], rows: list[dict]) -> None:
    """« ; » et BOM, comme les CSV du RQM, pour qu'Excel l'ouvre tel quel ; écriture atomique."""
    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=columns, delimiter=";", lineterminator="\n", extrasaction="ignore")
    w.writeheader()
    w.writerows(rows)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(out.getvalue(), encoding="utf-8-sig")
    os.replace(tmp, path)


def main() -> int:
    data, report = validate.load(ROOT)
    if report.errors:
        raise SystemExit("data/ contient des erreurs : python3 tools/validate.py")
    known = {(g["adresse"], g["ville"]): g for g in read_csv(GEOCODING)}
    used, missing = [], []
    for o in data["organisations"]:
        if not o["adresse"]:
            continue
        key = (o["adresse"], o["ville"])
        if key not in known:
            found = geocode(o)
            if not found:
                missing.append(f"{o['id']} : « {query(o)} »")
                continue
            (lat, lon), source = found
            known[key] = {"adresse": o["adresse"], "ville": o["ville"], "lat": round(lat, 5),
                          "lon": round(lon, 5), "source": source}
        used.append(known[key])
    write_csv(GEOCODING, COLUMNS, sorted({(g["adresse"], g["ville"]): g for g in used}.values(),
                                         key=lambda g: (g["ville"], g["adresse"])))
    print(f"{len(used)} adresses géocodées (collected/geocoding.csv)")
    for m in missing:
        print(f"  introuvable · {m}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
