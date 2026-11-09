import { expect, test } from "vitest";
import { DEFAULT_PROJECT_FILTERS, DEFAULT_MEMBER_FILTERS } from "../../../stores/app/filtersSlice";
import { visibleMembers } from "../../../stores/selectors";
import { plan, type LinkInput } from "./links";

const filters = { tab: "members" as const, ...DEFAULT_MEMBER_FILTERS };
const input: LinkInput = { ...filters, selection: null, showCollaborations: true, projectFilters: DEFAULT_PROJECT_FILTERS,
  sheetProjects: null, visible: visibleMembers(filters) };

test("the overview links the 25 pairs of towns sharing the most projects, thickest first", () => {
  const arcs = plan(input, 5.2);
  expect(arcs.length).toBe(25);
  for (let i = 1; i < arcs.length; i++) expect(arcs[i - 1].width).toBeGreaterThanOrEqual(arcs[i].width);
  for (const x of arcs) expect(x.link!.projects.length).toBeGreaterThan(0);
  expect(arcs[0].text[0].t).toMatch(/ ↔ /);
});
test("without collaborations, no arc", () => {
  expect(plan({ ...input, showCollaborations: false }, 5.2)).toEqual([]);
});
test("a project sheet draws from its leads to its other shown participants", () => {
  const arcs = plan({ ...input, selection: { type: "project", id: "PLAINE-2022PS02" } }, 7);
  expect(arcs.length).toBeGreaterThan(0);
  expect(arcs.every((x) => x.width === 2 && !x.link)).toBe(true);
});
