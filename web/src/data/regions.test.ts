import { expect, test } from "vitest";
import { isOffMap } from "./regions";
import { ORG_BY_ID } from "./dataset";
import { PLACED_MEMBERS } from "./placement";

// Ottawa et Toronto sont sur la carte, avec leur point et leurs traits ; Vancouver et Montpellier, trop loin, n'en ont pas.
test("only members too far to follow a line to are off the map", () => {
  const placed = new Set(PLACED_MEMBERS.map((o) => o.id)), byTown = (town: string) => [...ORG_BY_ID.values()].filter((o) => o.category && o.town === town);
  for (const town of ["Ottawa", "Toronto", "Rimouski"]) for (const o of byTown(town)) { expect(isOffMap(o)).toBe(false); expect(placed.has(o.id)).toBe(true); }
  for (const town of ["Vancouver", "Montpellier"]) for (const o of byTown(town)) { expect(isOffMap(o)).toBe(true); expect(placed.has(o.id)).toBe(false); }
  expect(byTown("Ottawa").length).toBeGreaterThan(0);
});
