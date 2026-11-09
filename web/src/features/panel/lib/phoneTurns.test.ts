import { expect, test } from "vitest";
import { NOTHING_HIDDEN, nextTurn, type Seen } from "./phoneTurns";
import type { Selection } from "../../../stores/selection";

const framing = { seq: 0, kind: "selection" as const, recenter: false };
const project: Selection = { type: "project", id: "P1" };
const view = (selection: Selection | null, filtersOpen: boolean, f = framing): Seen => ({ selection, backTo: null, sheetAxis: "", filtersOpen, framing: f });

test("Filtres over a sheet hides it, and closing the filters brings it back", () => {
  const open = nextTurn(view(project, false), view(project, true), NOTHING_HIDDEN);
  expect(open.change).toEqual({ selection: null, backTo: null, sheetAxis: "" });
  const close = nextTurn(view(null, true), view(null, false), open.hidden);
  expect(close.change).toEqual({ selection: project, backTo: null, sheetAxis: "" });
  expect(close.hidden).toEqual(NOTHING_HIDDEN);
});
test("« Voir sur la carte » closes the filters without bringing the sheet back", () => {
  const open = nextTurn(view(project, false), view(project, true), NOTHING_HIDDEN);
  const results = nextTurn(view(null, true), view(null, false, { ...framing, seq: 1 }), open.hidden);
  expect(results.change).toBeUndefined();
});
test("a sheet opened from the filters gives them back when it closes", () => {
  const open = nextTurn(view(null, true), view(project, false), NOTHING_HIDDEN);
  expect(open.hidden.filters).toBe(true);
  const other = nextTurn(view(project, false), view({ type: "member", id: "UQAR" }, false), open.hidden);   // de fiche en fiche
  expect(other.change).toBeUndefined();
  expect(nextTurn(view({ type: "member", id: "UQAR" }, false), view(null, false), other.hidden).change).toEqual({ filtersOpen: true });
});
test("a sheet opened from the map closes without opening the filters", () => {
  expect(nextTurn(view(project, false), view(null, false), NOTHING_HIDDEN).change).toBeUndefined();
});
test("a sheet from the filters, hidden by Filtres and brought back, still gives the filters back when it closes", () => {
  const fromFilters = nextTurn(view(null, true), view(project, false), NOTHING_HIDDEN);
  const filters = nextTurn(view(project, false), view(project, true), fromFilters.hidden);
  const back = nextTurn(view(null, true), view(null, false), filters.hidden);
  expect(back.change).toEqual({ selection: project, backTo: null, sheetAxis: "" });
  expect(nextTurn(view(project, false), view(null, false), back.hidden).change).toEqual({ filtersOpen: true });
});
