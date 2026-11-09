#!/usr/bin/env python3
"""Les limites des 17 régions administratives du Québec, dans collected/regions.geojson.

    python3 collectors/regions.py     # quand le Québec redécoupe ses régions (rare)

La région d'un membre ne s'écrit nulle part : tools/build_data.py la déduit de son point et
de ces limites. Elles viennent des Découpages administratifs (SDA, 1/20 000) du ministère des
Ressources naturelles et des Forêts, publiés sur Données Québec sous licence CC-BY 4.0
(https://www.donneesquebec.ca/recherche/dataset/decoupages-administratifs), couche « Région
administrative » (regio_s), lue par le service REST du jeu de données ; sans cache.

Écrit une FeatureCollection : une entité par région, propriétés {"code", "nom"}, géométrie
MultiPolygon. Le service simplifie lui-même les tracés (maxAllowableOffset, en degrés) : à
0,005° (environ 500 m), le fichier pèse quelque 120 Ko et chaque membre tombe dans la même
région qu'avec le tracé complet. Les limites suivent le milieu du fleuve et du golfe : Lévis et
Québec, Rimouski, les Îles-de-la-Madeleine sont chacun dans leur région. La Côte-Nord vient en
deux morceaux (le second, « Tracé de 1927 », borde le Labrador) : ils sont réunis ici.
"""
from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from fetch import UA

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "collected" / "regions.geojson"
SERVICE = "https://servicescarto.mern.gouv.qc.ca/pes/rest/services/Territoire/SDA_WMS/MapServer/0/query"
TOLERANCE = 0.005   # degrés : la simplification faite par le service


def download() -> dict:
    url = SERVICE + "?" + urllib.parse.urlencode({
        "where": "1=1", "outFields": "RES_CO_REG,RES_NM_REG,RES_CO_VER", "outSR": 4326,
        "maxAllowableOffset": TOLERANCE, "geometryPrecision": 4, "f": "geojson"})
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120) as r:
        return json.load(r)


def regions(source: dict) -> dict:
    """Une entité par région (son code et son nom), ses morceaux réunis en un MultiPolygon."""
    by_code: dict[str, dict] = {}
    versions = set()
    for f in source["features"]:
        p, g = f["properties"], f["geometry"]
        versions.add(p["RES_CO_VER"])
        r = by_code.setdefault(p["RES_CO_REG"], {"type": "Feature", "properties": {"code": p["RES_CO_REG"], "nom": ""},
                                                 "geometry": {"type": "MultiPolygon", "coordinates": []}})
        if "Tracé de 1927" not in p["RES_NM_REG"]:
            r["properties"]["nom"] = p["RES_NM_REG"]
        r["geometry"]["coordinates"] += g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    assert len(by_code) == 17 and all(r["properties"]["nom"] for r in by_code.values()), "17 régions nommées attendues"
    return {"type": "FeatureCollection",
            "source": "Découpages administratifs (SDA), MRNF, Données Québec, CC-BY 4.0",
            "version": ", ".join(sorted(versions)),
            "features": [by_code[c] for c in sorted(by_code)]}


def main() -> int:
    collection = regions(download())
    OUTPUT.write_text(json.dumps(collection, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{OUTPUT.relative_to(ROOT)} : {len(collection['features'])} régions ({collection['version']}), "
          f"{OUTPUT.stat().st_size / 1e3:.0f} Ko")
    return 0


if __name__ == "__main__":
    sys.exit(main())
