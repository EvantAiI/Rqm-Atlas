import { expect, test } from "vitest";
import { optionCounts } from "./optionCounts";
import { DEFAULT_PROJECT_FILTERS } from "../../../stores/app/filtersSlice";

const P = [
  { year: 2023, programme: "Leviers", axis: "A" },
  { year: 2023, programme: "Conjoints", axis: "B" },
  { year: 2024, programme: "Leviers", axis: "A" },
];
const counts = (f: Partial<typeof DEFAULT_PROJECT_FILTERS>) => optionCounts(P, { ...DEFAULT_PROJECT_FILTERS, ...f }, () => "");

test("each option counts the projects it would keep, with the other filters applied", () => {
  expect(counts({})).toEqual({ years: new Map([[2023, 2], [2024, 1]]), programmes: new Map([["Leviers", 2], ["Conjoints", 1]]) });
  // une année choisie ne se compte pas elle-même : les autres années restent proposées
  expect(counts({ year: 2024 })).toEqual({ years: new Map([[2023, 2], [2024, 1]]), programmes: new Map([["Leviers", 1]]) });
  expect(counts({ programme: "Conjoints", axis: "B" }).years).toEqual(new Map([[2023, 1]]));
});
