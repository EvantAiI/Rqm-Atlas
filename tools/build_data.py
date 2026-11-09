#!/usr/bin/env python3
"""Écrit les données de la page (web/generated/) et les tuiles du fond (web/public/basemap/tiles/)
à partir de data/ (tenu par le RQM) et de collected/ (relevé par collectors/).

    python3 tools/build_data.py             # valide d'abord : une erreur arrête tout
    npm --prefix web run build              # puis la page, dans web/dist

Ce que fait ce script :
- place chaque membre à son adresse (colonne adresse de organisations.csv, traduite en
  point par collectors/geocode.py dans collected/geocoding.csv) si elle tombe dans sa
  ville (à moins de 25 km de son centre), sinon au centre de sa ville (collected/towns.csv) ;
- déduit de ce point la région administrative de chaque membre du Québec (les limites officielles,
  relevées dans collected/regions.geojson) : rien à écrire dans les CSV ;
- ajoute les publications relevées dans collected/publications.json, pour les seules organisations encore présentes ;
- déplie le fond de carte (collected/basemap.pmtiles, puis basemap-south.pmtiles) en tuiles
  web/public/basemap/tiles/z/x/y.pbf, des fichiers simples que GitHub Pages sert sans requêtes partielles ;
- écrit en JSON dans web/generated/ : data.json (tout ce que la page affiche d'emblée), coverage.json
  (les tuiles de détail), basemapStyle.json (le style du fond), towns.json (les villes de « près de chez
  moi ») et details/<id>.json (les publications d'un membre, chargées au clic).
Les deux dossiers sont vidés puis réécrits à chaque passage.
"""
from __future__ import annotations

import csv
import datetime
import gzip
import io
import json
import math
import re
import shutil
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import validate  # noqa: E402

ROOT = HERE.parent
COLLECTED = ROOT / "collected"
GENERATED = ROOT / "web" / "generated"
TILES = ROOT / "web" / "public" / "basemap" / "tiles"
TOLERANCE_KM = 25
REPOSITORY = "https://github.com/EvantAiI/Rqm-Atlas"


def km(a: tuple[float, float], b: tuple[float, float]) -> float:
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def varint(b: bytes, i: int) -> tuple[int, int]:
    n = shift = 0
    while True:
        o = b[i]
        i += 1
        n |= (o & 0x7F) << shift
        shift += 7
        if o < 0x80:
            return n, i


def zxy(tile: int) -> tuple[int, int, int]:
    """Numéro de tuile PMTiles (courbe de Hilbert, niveau par niveau) -> z, x, y."""
    z, start = 0, 0
    while start + 4 ** z <= tile:
        start += 4 ** z
        z += 1
    t, x, y, s = tile - start, 0, 0, 1
    while s < 2 ** z:
        rx = 1 & (t >> 1)
        ry = 1 & (t ^ rx)
        if ry == 0:
            if rx == 1:
                x, y = s - 1 - x, s - 1 - y
            x, y = y, x
        x += s * rx
        y += s * ry
        t >>= 2
        s *= 2
    return z, x, y


def unpack_pmtiles(source: Path, target: Path) -> list[tuple[int, int, int]]:
    """Écrit chaque tuile d'une archive PMTiles v3 (vectorielle, gzip) en target/z/x/y.pbf, décompressée ; rend leurs z, x, y."""
    b = source.read_bytes()
    assert b[:7] == b"PMTiles" and b[7] == 3, f"{source} : pas une archive PMTiles v3"
    integer = lambda i: int.from_bytes(b[i:i + 8], "little")  # noqa: E731
    root_dir, leaves, data = (integer(8), integer(16)), integer(40), integer(56)
    assert b[97] == 2 and b[98] == 2, "répertoires et tuiles attendus en gzip"
    written = []

    def directory(start: int, length: int) -> None:
        d, i = gzip.decompress(b[start:start + length]), 0
        count, i = varint(d, i)
        cols = []
        for _ in range(4):
            col = []
            for _ in range(count):
                v, i = varint(d, i)
                col.append(v)
            cols.append(col)
        ids, runs, lengths, offsets = cols
        tile = end = 0
        for k in range(count):
            tile += ids[k]
            begin = end if k and offsets[k] == 0 else offsets[k] - 1
            end = begin + lengths[k]
            if runs[k] == 0:
                directory(leaves + begin, lengths[k])
                continue
            content = gzip.decompress(b[data + begin:data + end])
            for t in range(tile, tile + runs[k]):
                z, x, y = zxy(t)
                f = target / str(z) / str(x) / f"{y}.pbf"
                f.parent.mkdir(parents=True, exist_ok=True)
                f.write_bytes(content)
                written.append((z, x, y))

    directory(*root_dir)
    return written


def place_name(s: str) -> str:
    """« Les Îles-de-la-Madeleine » et « Iles de la Madeleine » se valent."""
    s = unicodedata.normalize("NFKD", s.replace("œ", "oe").replace("Œ", "OE"))
    s = re.sub(r"[^a-z0-9]+", " ", "".join(c for c in s if not unicodedata.combining(c)).lower()).strip()
    return re.sub(r"^(les|le|la|l) ", "", s)


def read_csv(path: Path) -> list[dict]:
    """Les lignes d'un CSV de collected/ (séparateur « ; »), ou rien si le fichier manque."""
    if not path.exists():
        return []
    return list(csv.DictReader(io.StringIO(path.read_text(encoding="utf-8-sig")), delimiter=";"))


def town_index() -> dict:
    towns = {}
    for v in read_csv(COLLECTED / "towns.csv"):
        towns.setdefault((place_name(v["ville"]), v["region"], v["pays"]), (float(v["lat"]), float(v["lon"])))
    return towns


def town_centre(towns: dict, o: dict) -> tuple[float, float] | None:
    """« Rimouski (Le Bic) » : le secteur s'il est connu, sinon la ville. Sans région, au Canada : le Québec."""
    m = re.match(r"(.*?)\s*\((.*)\)$", o["ville"])
    region = o["region"] or ("Québec" if (o["pays"] or "Canada") == "Canada" else "")
    for attempt in ([m.group(2), m.group(1)] if m else [o["ville"]]):
        point = towns.get((place_name(attempt), region, o["pays"] or "Canada"))
        if point:
            return point
    return None


def place(o: dict, towns: dict, geocoding: dict) -> tuple[tuple[float, float] | None, str, str | None]:
    """(point, précision, avertissement) d'un membre : son adresse géocodée, si elle est
    dans sa ville ; sinon le centre de sa ville ; sinon rien."""
    centre = town_centre(towns, o)
    g = geocoding.get((o["adresse"], o["ville"])) if o["adresse"] else None
    warning = None
    if o["adresse"] and not g:
        warning = f"{o['id']} : adresse « {o['adresse']} » pas encore géocodée (python3 collectors/geocode.py) ; centre de la ville retenu"
    point = (float(g["lat"]), float(g["lon"])) if g else None
    if point and centre and km(point, centre) > TOLERANCE_KM:
        warning = f"{o['id']} : l'adresse est à {km(point, centre):.0f} km de {o['ville']} ; centre de la ville retenu"
        point = None
    if point:
        return point, "adresse", warning
    if centre:
        return centre, "ville", warning
    return None, "", f"{o['id']} : ville « {o['ville']} » introuvable dans collected/towns.csv ; membre non placé"


def read_regions(path: Path) -> list[tuple[str, str, list]]:
    """(code, nom, polygones) de chaque région administrative ; un polygone = [contour, trous…], en [lon, lat]."""
    if not path.exists():
        return []
    return [(f["properties"]["code"], f["properties"]["nom"], f["geometry"]["coordinates"])
            for f in json.loads(path.read_text(encoding="utf-8"))["features"]]


def in_ring(lon: float, lat: float, ring: list) -> bool:
    """Le point est-il dans l'anneau ? (lancer de rayon : un nombre impair de côtés croisés vers l'est)"""
    inside = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > lat) != (y2 > lat) and lon < x1 + (lat - y1) * (x2 - x1) / (y2 - y1):
            inside = not inside
    return inside


def distance_to_edge(point: tuple[float, float], ring: list) -> float:
    """En km, à peu près (degrés ramenés à la latitude du point) : assez pour quelques kilomètres."""
    lat, lon = point
    kx, ky = 111.32 * math.cos(math.radians(lat)), 110.57
    best = math.inf
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        ax, ay, bx, by = (x1 - lon) * kx, (y1 - lat) * ky, (x2 - lon) * kx, (y2 - lat) * ky
        dx, dy = bx - ax, by - ay
        t = max(0.0, min(1.0, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) if dx or dy else 0.0
        best = min(best, math.hypot(ax + t * dx, ay + t * dy))
    return best


def region_of(point: tuple[float, float], regions: list) -> str | None:
    """Le code de la région où tombe le point ; à défaut, celle dont le bord est à moins de 5 km (les tracés,
    simplifiés, laissent de minces interstices entre deux régions) ; sinon rien."""
    lat, lon = point
    for code, _, polygons in regions:
        if any(in_ring(lon, lat, p[0]) and not any(in_ring(lon, lat, h) for h in p[1:]) for p in polygons):
            return code
    near = [(distance_to_edge(point, p[0]), code) for code, _, polygons in regions for p in polygons]
    return min(near)[1] if near and min(near)[0] < 5 else None


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def build() -> int:
    data, report = validate.load(ROOT)
    if report.errors:
        for e in report.errors:
            print(f"ERREUR · {e}")
        print(f"\nConstruction arrêtée : {len(report.errors)} erreur(s) dans data/ (python3 tools/validate.py)")
        return 1
    warnings = []
    towns = town_index()
    geocoding = {(g["adresse"], g["ville"]): g for g in read_csv(COLLECTED / "geocoding.csv")}
    publications_path = COLLECTED / "publications.json"
    survey = json.loads(publications_path.read_text(encoding="utf-8")) if publications_path.exists() else {}
    publications = {k.lower(): v for k, v in survey.get("membres", {}).items()}
    regions = read_regions(COLLECTED / "regions.geojson")

    orgs = []
    for o in data["organisations"]:
        e = {"id": o["id"], "name": o["nom"]}
        for column, field in (("sigle", "acronym"), ("categorie", "category"), ("type", "type"), ("adresse", "address"),
                              ("ville", "town"), ("region", "province"), ("pays", "country"), ("site_web", "website"),
                              ("courriel", "email"), ("telephone", "phone")):
            if o[column]:
                e[field] = o[column]
        if o["categorie"]:
            point, precision, warning = place(o, towns, geocoding)
            if point:
                e.update(lat=round(point[0], 5), lon=round(point[1], 5), precision=precision)
                # la région administrative, pour les seuls membres du Québec (Ottawa jouxte l'Outaouais)
                if (o["pays"] or "Canada") == "Canada" and (o["region"] or "Québec") == "Québec":
                    region = region_of(point, regions)
                    if region:
                        e["region"] = region
                    elif regions:
                        warnings.append(f"{o['id']} : son point n'est dans aucune région de collected/regions.geojson")
            if warning:
                warnings.append(warning)
            p = publications.get(o["id"].lower())
            if p:
                e["publications"] = {"total": p["nb_publications"], "maritime": p["nb_maritimes"], "openalex": p["openalex"],
                                     "evidence": p["preuve_maritimes"], "hasDetail": bool(p["maritimes"])}
        orgs.append(e)
    ids = {o["id"].lower(): o["id"] for o in orgs}
    members = {o["id"] for o in orgs if "category" in o}

    projects = [{k: v for k, v in {"id": p["id"], "title": p["titre"], "shortTitle": p["titre_court"], "year": int(p["annee"]),
                                   "programme": p["programme"], "axis": p["axe_principal"], "secondaryAxes": p["axes_secondaires"],
                                   "transversal": p["transversal"], "pageUrl": p["fiche"], "teaser": p["accroche"],
                                   "description": p["description"]}.items() if v not in ("", [], False)}
                for p in sorted(data["projects"], key=lambda p: (-int(p["annee"]), p["id"]))]

    for d in (GENERATED, TILES):
        if d.exists():
            shutil.rmtree(d)
    tiles = unpack_pmtiles(COLLECTED / "basemap.pmtiles", TILES)
    # le sud (38 à 43° N) aux petits zooms, pour la vue d'ensemble ; dépliées en second, ses tuiles du bord remplacent celles de basemap.pmtiles
    unpack_pmtiles(COLLECTED / "basemap-south.pmtiles", TILES)
    style = json.loads((COLLECTED / "basemap-style.json").read_text(encoding="utf-8"))
    GENERATED.mkdir(parents=True)
    shutil.copyfile(COLLECTED / "basemap-style.json", GENERATED / "basemapStyle.json")
    # Le détail au-delà du fond complet (autour des membres) : ses tuiles du premier zoom suffisent
    # à la page, qui n'en demande pas d'autres (les zooms suivants n'existent que sous elles).
    detail = [t for t in tiles if t[0] > style["sources"]["protomaps"]["maxzoom"]]
    z = min((t[0] for t in detail), default=0)
    write_json(GENERATED / "coverage.json", {"z": z, "tiles": sorted(f"{x}/{y}" for zz, x, y in detail if zz == z)})
    write_json(GENERATED / "data.json", {
        "generated": datetime.date.today().isoformat(), "repository": REPOSITORY,
        "publicationsDate": survey.get("date", ""),
        "axes": [{"code": a["code"], "label": a["libelle"], "short": a["court"], "color": a["couleur"]} for a in data["axes"]],
        "programmes": {g["programme"]: g["description"] for g in data["programmes"]},
        "regions": [{"code": code, "name": name} for code, name, _ in regions],
        "organisations": orgs, "projects": projects,
        "participations": [[x["projet"], x["organisation"], x["role"]] for x in data["participations"]],
    })
    # « Près de chez moi » sans géolocalisation : le visiteur tape sa ville. Toutes celles du Québec,
    # et celles d'au moins 2 000 habitants autour ; la page ne le charge qu'à la demande.
    chosen = {}
    for v in read_csv(COLLECTED / "towns.csv"):
        lat, lon = float(v["lat"]), float(v["lon"])
        if -80 <= lon <= -55 and 43 <= lat <= 63 and (v["region"] == "Québec" or int(v["population"] or 0) >= 2000):
            chosen.setdefault((v["ville"], v["region"]), [v["ville"], v["region"], round(lat, 3), round(lon, 3)])
    write_json(GENERATED / "towns.json", sorted(chosen.values()))
    for k, p in publications.items():
        if k in ids and p["maritimes"]:
            write_json(GENERATED / "details" / f"{ids[k]}.json", {"maritime": [
                {field: w[column] for column, field in (("annee", "year"), ("citations", "citations"), ("etiquette", "label"),
                                                        ("revue", "journal"), ("titre", "title"), ("url", "url"))
                 if w.get(column) not in (None, "")}
                for w in p["maritimes"]]})

    for w in report.warnings + warnings:
        print(f"avertissement · {w}")
    placed = sum(1 for o in orgs if "lat" in o)
    exact = sum(1 for o in orgs if o.get("precision") == "adresse")
    size = sum(f.stat().st_size for d in (GENERATED, TILES) for f in d.rglob("*") if f.is_file())
    print(f"web/generated/ écrit : {len(members)} membres dont {placed} placés ({exact} à l'adresse, {placed - exact} au centre "
          f"de leur ville), {len(projects)} projets, {len(data['participations'])} participations, {len(tiles)} tuiles de fond — "
          f"{size / 1e6:.1f} Mo")
    return 0


if __name__ == "__main__":
    sys.exit(build())
