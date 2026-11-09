import { expect, test } from "vitest";
import { DATA } from "../../data/dataset";
import { DEFAULT_MEMBER_FILTERS } from "./filtersSlice";
import { nextOpen } from "./selectionSlice";
import type { Selection } from "../selection";

const start = { selection: null, backTo: null, tab: "members" as const, ...DEFAULT_MEMBER_FILTERS };
const member = (id: string): Selection => ({ type: "member", id }), town: Selection = { type: "town", id: "Rimouski" };
const UQAR = member("UQAR"), ISMER = member("ISMER");
const link: Selection = { type: "link", id: "Rimouski ↔ Matane", from: ["Rimouski"], to: ["Matane"], a: [0, 0], b: [0, 0], colour: "", projects: [] };

test("the way back: the last crossroads one came from, kept from sheet to sheet", () => {
  const fromTown = nextOpen({ ...start, selection: town }, UQAR);
  expect(fromTown.backTo).toBe(town);
  expect(nextOpen({ ...start, ...fromTown }, ISMER).backTo).toBe(town);   // d'une fiche à l'autre, le carrefour reste
  expect(nextOpen({ ...start, selection: town }, UQAR, true).backTo).toBeNull();   // depuis le panneau : pas de retour
});
test("a crossroads leads back to the crossroads it was opened from, never to one it was left for", () => {
  expect(nextOpen({ ...start, selection: UQAR, backTo: town }, { type: "subject", id: "érosion" }).backTo).toBeNull();
  expect(nextOpen({ ...start, selection: town }, link).backTo).toBe(town);
  const gaspesie: Selection = { type: "region", id: "Gaspésie–Îles-de-la-Madeleine" }, capitale: Selection = { type: "region", id: "Capitale-Nationale" };
  const there = nextOpen({ ...start, selection: gaspesie }, capitale);
  expect(there.backTo).toBe(gaspesie);
  expect(nextOpen({ ...start, ...there }, gaspesie).backTo).toBeNull();   // « ← Gaspésie » : pas de « ← Capitale-Nationale » en retour
  expect(nextOpen({ ...start, ...there }, capitale).backTo).toBe(gaspesie);   // la même fiche rouverte garde son retour
});
test("a member hidden by the filters brings every member back; a new sheet resets its axis", () => {
  const regular = DATA.organisations.find((o) => o.category === "Régulier" && o.lat !== undefined)!;
  const hidden = nextOpen({ ...start, categories: new Set(["Associé"]) }, member(regular.id));
  expect(hidden.categories).toEqual(DEFAULT_MEMBER_FILTERS.categories);
  expect(nextOpen({ ...start, selection: UQAR }, UQAR).sheetAxis).toBeUndefined();
  expect(nextOpen({ ...start, selection: UQAR }, ISMER).sheetAxis).toBe("");
});
