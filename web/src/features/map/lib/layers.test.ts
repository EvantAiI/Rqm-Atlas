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
