"""Le dépliage du fond de carte, le placement des membres et leur région administrative."""
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import build_data  # noqa: E402


class Tiles(unittest.TestCase):
    def test_zxy(self):
        # les premiers numéros de la spécification PMTiles v3 (courbe de Hilbert, niveau par niveau)
        expected = {0: (0, 0, 0), 1: (1, 0, 0), 2: (1, 0, 1), 3: (1, 1, 1), 4: (1, 1, 0), 5: (2, 0, 0), 20: (2, 3, 0)}
        for number, zxy in expected.items():
            self.assertEqual(build_data.zxy(number), zxy, number)

    def test_repository_archive(self):
        with tempfile.TemporaryDirectory() as d:
            tiles = build_data.unpack_pmtiles(ROOT / "collected" / "basemap.pmtiles", Path(d))
            self.assertGreater(len(tiles), 1000)
            self.assertTrue((Path(d) / "0" / "0" / "0.pbf").stat().st_size > 0)
            self.assertEqual(max(int(p.name) for p in Path(d).iterdir()), 15)
            # le détail (au-delà du zoom 9) : sous chaque tuile de son premier zoom, toutes ses
            # descendantes jusqu'au 15, et rien d'autre ; la page ne demande que celles-là
            detail = [t for t in tiles if t[0] > 9]
            zd = min(t[0] for t in detail)
            first = {(x, y) for z, x, y in detail if z == zd}
            self.assertEqual(len(detail), len(first) * sum(4 ** (z - zd) for z in range(zd, 16)))
            self.assertTrue(all((x >> (z - zd), y >> (z - zd)) in first for z, x, y in detail))


class Placement(unittest.TestCase):
    towns = {("rimouski", "Québec", "Canada"): (48.45, -68.52)}
    geocoding = {("300, allée des Ursulines", "Rimouski"): {"lat": "48.4515", "lon": "-68.5135"},
                 ("1, rue du Port", "Rimouski"): {"lat": "46.81", "lon": "-71.21"}}   # à Québec : 260 km

    def member(self, address):
        return {"id": "x", "adresse": address, "ville": "Rimouski", "region": "", "pays": ""}

    def test_address_then_town(self):
        p = lambda a: build_data.place(self.member(a), self.towns, self.geocoding)  # noqa: E731
        self.assertEqual(p("300, allée des Ursulines"), ((48.4515, -68.5135), "adresse", None))
        self.assertEqual(p("")[:2], ((48.45, -68.52), "ville"))
        self.assertEqual(p("")[2], None)
        point, precision, warning = p("2, rue Inconnue")
        self.assertEqual((point, precision), ((48.45, -68.52), "ville"))
        self.assertIn("pas encore géocodée", warning)
        point, precision, warning = p("1, rue du Port")
        self.assertEqual(precision, "ville")
        self.assertIn("km de Rimouski", warning)


class Regions(unittest.TestCase):
    holed = [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]]

    def test_point_in_polygon(self):
        regions = [("A", "A", [self.holed]), ("B", "B", [[[[20, 0], [30, 0], [30, 10], [20, 10], [20, 0]]]])]
        self.assertEqual(build_data.region_of((2, 2), regions), "A")      # (lat, lon)
        self.assertEqual(build_data.region_of((5, 5), regions), None)     # dans le trou, loin de tout bord
        self.assertEqual(build_data.region_of((5, 25), regions), "B")
        self.assertEqual(build_data.region_of((5, 10.02), regions), "A")  # à 2 km du bord : l'interstice
        self.assertEqual(build_data.region_of((5, 15), regions), None)

    def test_known_members(self):
        # les vraies limites (collected/regions.geojson) et les points des membres, à leur adresse
        regions = build_data.read_regions(ROOT / "collected" / "regions.geojson")
        name = {code: n for code, n, _ in regions}
        expected = {(48.45281, -68.51255): "Bas-Saint-Laurent",               # UQAR, Rimouski
                    (48.82264, -64.46897): "Gaspésie–Îles-de-la-Madeleine",   # Merinov, Gaspé
                    (47.37676, -61.86717): "Gaspésie–Îles-de-la-Madeleine",   # CERMIM, aux Îles
                    (46.77918, -71.26981): "Capitale-Nationale",              # Université Laval, Québec
                    (46.82914, -71.10407): "Chaudière-Appalaches",            # InnovMarine, Lévis, en face de Québec
                    (50.20869, -66.37304): "Côte-Nord"}                       # INREST, Sept-Îles
        for point, region in expected.items():
            self.assertEqual(name.get(build_data.region_of(point, regions)), region, point)
        self.assertEqual(len(regions), 17)


if __name__ == "__main__":
    unittest.main()
