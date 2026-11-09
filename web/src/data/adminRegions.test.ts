import { expect, test } from "vitest";
import { REGION_MEMBERS, findRegion, inRegion, matchRegions, orgRegion, regionPartners, regionProjects, townRegion } from "./adminRegions";
import { PARTICIPANTS_BY_PROJECT } from "./dataset";

const GASPESIE = "Gaspésie–Îles-de-la-Madeleine";

test("each member placed in Québec has its region, deduced at build time from its point", () => {
  expect(orgRegion("UQAR")).toBe("Bas-Saint-Laurent");
  expect(orgRegion("merinov")).toBe(GASPESIE);
  expect(orgRegion("ULaval")).toBe("Capitale-Nationale");
  expect(orgRegion("CGC")).toBeUndefined();   // Ottawa
  expect(townRegion("Rimouski")).toBe("Bas-Saint-Laurent");
});
test("a region's members are the most active first", () => {
  const members = REGION_MEMBERS.get("Bas-Saint-Laurent")!;
  expect(members.every((o) => orgRegion(o.id) === "Bas-Saint-Laurent")).toBe(true);
  expect(members[0].id).toBe("UQAR");
});
test("a region works with the other regions of its projects' members, the most projects in common first", () => {
  const partners = regionPartners(GASPESIE), projects = new Set(regionProjects(GASPESIE).map((p) => p.id));
  expect(partners.has(GASPESIE)).toBe(false);
  const sizes = [...partners.values()].map((l) => l.projects.size);
  expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
  for (const [other, l] of partners) for (const p of l.projects) {
    expect(projects.has(p)).toBe(true);
    expect(PARTICIPANTS_BY_PROJECT.get(p)!.some(({ org }) => orgRegion(org) === other)).toBe(true);
  }
});
test("a region is found by the start of its words, and from an address written loosely", () => {
  expect(matchRegions("gaspesie")).toEqual([GASPESIE]);
  expect(matchRegions("Îles madeleine")).toEqual([GASPESIE]);
  expect(matchRegions("COTE-NORD")).toEqual(["Côte-Nord"]);
  expect(matchRegions("nord")).toContain("Côte-Nord");
  expect(matchRegions("rimouski")).toEqual([]);
  expect(findRegion("gaspesie-iles-de-la-madeleine")).toBe(GASPESIE);
  expect(findRegion("gaspesie")).toBe(GASPESIE);
  expect(findRegion("Atlantide")).toBeUndefined();
});
test("a region is named with its own preposition", () => {
  expect(inRegion("Bas-Saint-Laurent")).toBe("au Bas-Saint-Laurent");
  expect(inRegion("Côte-Nord")).toBe("sur la Côte-Nord");
  expect(inRegion(GASPESIE)).toBe(`en ${GASPESIE}`);
});
