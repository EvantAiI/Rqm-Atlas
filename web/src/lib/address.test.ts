import { expect, test } from "vitest";
import { categoriesOf, isSheetHash, parseAddress, selectionToHash, viewHash, type ViewFields } from "./address";
import type { Selection } from "../stores/selection";
import { CATEGORIES } from "../data/categories";

const link = (from: string[], to: string[], projects: string[]): Selection =>
  ({ type: "link", id: "", from, to, a: [0, 0], b: [0, 0], colour: "", projects });

test("a sheet's address reads back as the same sheet", () => {
  expect(selectionToHash({ type: "member", id: "UQAR" })).toBe("#membre=UQAR");
  expect(selectionToHash({ type: "external", id: "x y" })).toBe("#membre=x%20y");
  expect(selectionToHash({ type: "nearby", id: "here" })).toBe("");
  for (const [s, key] of [[{ type: "project", id: "PLAINE-2022PS02" }, "projet"], [{ type: "subject", id: "érosion" }, "sujet"], [{ type: "town", id: "Gaspé" }, "ville"], [{ type: "region", id: "Gaspésie–Îles-de-la-Madeleine" }, "region"]] as const) {
    expect(parseAddress(selectionToHash(s))).toEqual({ kind: "sheet", key, id: s.id });
  }
});
test("a link between two towns names them; a merged link keeps its projects", () => {
  expect(parseAddress(selectionToHash(link(["Rimouski"], ["Matane"], ["A", "B"])))).toEqual({ kind: "link", from: ["Rimouski"], to: ["Matane"], codes: null });
  expect(parseAddress(selectionToHash(link(["Rimouski", "Matane"], ["Gaspé"], ["A", "B"])))).toEqual({ kind: "link", from: ["Rimouski", "Matane"], to: ["Gaspé"], codes: ["A", "B"] });
});
test("a damaged sheet address is ignored; anything else is a view", () => {
  expect(parseAddress("#membre=%E0%A4")).toEqual({ kind: "broken" });
  expect(parseAddress("#vue=projets&annee=2024").kind).toBe("view");
  expect(isSheetHash("#ville=Gaspé") && !isSheetHash("#vue=membres")).toBe(true);
});
test("the view's address: categories by slug, the other tab's filters left out", () => {
  const all = new Set(CATEGORIES.map((c) => c.code));
  const f: ViewFields = { tab: "members", categories: all, memberAxis: "", memberMainOnly: false,
    projectFilters: { query: "x", year: 2024, programme: "", axis: "", mainOnly: false } };
  expect(viewHash(f)).toBe("");
  const industrial = new Set(CATEGORIES.filter((c) => c.label === "Industriel").map((c) => c.code));
  const hash = viewHash({ ...f, categories: industrial, memberAxis: "A3" });
  expect(hash).toBe("#vue=membres&cat=industriel&axe=A3");
  const back = parseAddress(hash);
  expect(back.kind === "view" && categoriesOf(back.view)).toEqual(industrial);
  expect(viewHash({ ...f, tab: "projects" })).toBe("#vue=projets&annee=2024&q=x");
});
