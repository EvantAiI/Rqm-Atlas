#!/usr/bin/env python3
"""Emprise du détail du fond : les tuiles du zoom GRID à moins de RADIUS_KM d'un membre.

    python3 collectors/basemap/extents.py web/generated/data.json > extents.geojson

Lit les organisations de web/generated/data.json (écrit par tools/build_data.py) ; écrit sur
la sortie standard un MultiPolygon de carrés, un par tuile, rétrécis d'un rien pour ne pas
toucher leurs voisins, que « pmtiles extract --region » découpe aux zooms GRID à 15
(collectors/basemap/make.sh).
"""
import json
import math
import sys

GRID, RADIUS_KM = 12, 1


def to_tile(lat: float, lon: float) -> tuple[float, float]:
    n = 2 ** GRID
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n


def to_lonlat(x: float, y: float) -> list[float]:
    n = 2 ** GRID
    return [x / n * 360 - 180, math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))]


data = json.load(open(sys.argv[1], encoding="utf-8"))
tiles = set()
for o in data["organisations"]:
    # hors de l'emprise du fond (Vancouver, Montpellier…), la carte ne va pas les voir
    if "category" in o and "lat" in o and -80 < o["lon"] < -55 and 43 < o["lat"] < 63:
        dlat, dlon = RADIUS_KM / 111.32, RADIUS_KM / (111.32 * math.cos(math.radians(o["lat"])))
        x0, y0 = to_tile(o["lat"] + dlat, o["lon"] - dlon)
        x1, y1 = to_tile(o["lat"] - dlat, o["lon"] + dlon)
        tiles |= {(x, y) for x in range(int(x0), int(x1) + 1) for y in range(int(y0), int(y1) + 1)}
e = 0.01
squares = [[[to_lonlat(x + e, y + e), to_lonlat(x + 1 - e, y + e), to_lonlat(x + 1 - e, y + 1 - e),
             to_lonlat(x + e, y + 1 - e), to_lonlat(x + e, y + e)]] for x, y in sorted(tiles)]
print(json.dumps({"type": "MultiPolygon", "coordinates": squares}))
print(f"{len(tiles)} tuiles au zoom {GRID}", file=sys.stderr)
