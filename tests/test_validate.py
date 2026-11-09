"""Le validateur attrape les erreurs de saisie et tolère ce qu'Excel produit.

    python3 -m unittest discover tests
"""
import csv
import io
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import validate  # noqa: E402


class Validate(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        shutil.copytree(ROOT / "data", self.root / "data")

    def tearDown(self):
        shutil.rmtree(self.root)

    def file(self, stem):
        return self.root / "data" / f"{stem}.csv"

    def append(self, stem, line):
        with open(self.file(stem), "a", encoding="utf-8") as f:
            f.write(line + "\n")

    def load(self):
        data, report = validate.load(self.root)
        return data, report, "\n".join(report.errors)

    def test_repository_data_passes(self):
        _, report, _ = self.load()
        self.assertEqual(report.errors, [])

    def test_unknown_organisation_with_suggestion(self):
        self.append("participations", "OSL2020.2;UQARR;partenaire")
        _, _, errors = self.load()
        self.assertIn("participations.csv, ligne", errors)
        self.assertIn("« UQARR » n'existe pas", errors)
        self.assertIn("« UQAR »", errors)   # la suggestion

    def test_identifiers_ignore_case(self):
        self.append("participations", "osl2020.2;BIO-LAURENTIA;collaborateur")   # absente de ce projet
        data, report, _ = self.load()
        self.assertEqual(report.errors, [])
        self.assertIn({"projet": "OSL2020.2", "organisation": "bio-laurentia", "role": "collaborateur"}, data["participations"])
        self.append("organisations", "uqar;Doublon;;;;;;;")
        _, _, errors = self.load()
        self.assertIn("déjà pris", errors)

    def test_unknown_axis_and_year(self):
        self.append("projects", "TEST.1;Un projet;;20021;Leviers;A7;A1, A9;;")
        _, _, errors = self.load()
        self.assertIn("data/projects.csv, ligne", errors)
        self.assertIn("année « 20021 »", errors)
        self.assertIn("axe principal « A7 » inconnu", errors)
        self.assertIn("axe secondaire « A9 » inconnu", errors)

    def test_member_without_town_and_category(self):
        self.append("organisations", "nouveau;Nouveau membre;;Associé;;;;Canada;")
        self.append("organisations", "autre;Autre;;Usager - Industriel;;Rimouski;Québec;Canada;")   # trait d'union toléré
        self.append("organisations", "faux;Faux;;Membre d'honneur;;Rimouski;Québec;Canada;")
        data, _, errors = self.load()
        self.assertIn("sa ville est vide", errors)
        self.assertIn("catégorie « Membre d'honneur » inconnue", errors)
        self.assertNotIn("Usager - Industriel", errors)
        self.assertEqual(next(o for o in data["organisations"] if o["id"] == "autre")["categorie"], "Usager – Industriel")

    def test_excel_commas_ansi_without_bom(self):
        # « CSV (séparateur : virgule) » enregistré en ANSI par un Excel anglais
        rows = list(csv.reader(io.StringIO(self.file("axes").read_text(encoding="utf-8-sig")), delimiter=";"))
        out = io.StringIO()
        csv.writer(out, lineterminator="\r\n").writerows(rows)   # guillemets autour de « Santé, bien-être… »
        self.file("axes").write_bytes(out.getvalue().encode("cp1252"))
        data, report, _ = self.load()
        self.assertEqual(report.errors, [])
        self.assertTrue(any("ANSI" in w for w in report.warnings))
        self.assertEqual(data["axes"][0]["libelle"], "Santé des écosystèmes")

    def test_programme_without_description(self):
        text = self.file("programmes").read_text(encoding="utf-8-sig")
        self.file("programmes").write_text("\n".join(l for l in text.splitlines() if not l.startswith("PLAINE;")) + "\n", encoding="utf-8")
        data, report, errors = self.load()
        self.assertEqual(errors, "")
        self.assertTrue(any("programme « PLAINE » absent" in w for w in report.warnings))
        self.assertIn("Temps-navire", [g["programme"] for g in data["programmes"]])

    def test_duplicate_line(self):
        first = self.file("participations").read_text(encoding="utf-8-sig").splitlines()[1]
        self.append("participations", first)
        _, _, errors = self.load()
        self.assertIn("une ligne par organisation et par projet", errors)


if __name__ == "__main__":
    unittest.main()
