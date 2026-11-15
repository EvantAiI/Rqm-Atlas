import { expect, test, vi } from "vitest";
import { layers } from "./layers";

// les couleurs viennent des variables CSS : sans page, une couleur quelconque
vi.stubGlobal("document", { documentElement: {} });
vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => "#000" }));

// Un décalage de texte qui dépend du zoom ET de la donnée heurte les autres noms ailleurs que là où il est dessiné.
test("aucun décalage de texte ne dépend du zoom", () => {
  const offsets = layers().flatMap((l) => (l.type === "symbol" && l.layout?.["text-offset"] ? [JSON.stringify(l.layout["text-offset"])] : []));
  expect(offsets.length).toBeGreaterThan(0);
  for (const o of offsets) expect(o).not.toContain('"zoom"');
});

// Une valeur de zoom ET de donnée est évaluée au zoom de la tuile, qui retarde pendant un geste : un point s'y montrerait
// avec la grappe qui le contient. Ce qui change d'un cran à l'autre passe par une couche par cran.
test("aucune propriété ni filtre ne dépend à la fois du zoom et de la donnée", () => {
  for (const l of layers()) {
    const parts = { ...("layout" in l ? l.layout : {}), ...("paint" in l ? l.paint : {}), ...("filter" in l ? { filter: l.filter } : {}) };
    for (const [name, value] of Object.entries(parts)) {
      const json = JSON.stringify(value);
      expect(json.includes('"zoom"') && json.includes('"get"'), `${l.id} ${name}`).toBe(false);
    }
  }
});

test("chaque cran a ses points, et ses grappes sauf le dernier", () => {
  const ids = layers().map((l) => l.id);
  for (const z of [6, 7, 14, 15]) expect(ids).toContain(`members-${z}`);
  expect(ids).toContain("clusters-14");
  expect(ids).not.toContain("clusters-15");
});
