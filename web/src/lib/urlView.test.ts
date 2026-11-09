import { expect, test } from "vitest";
import { hashToView, viewToHash, type View } from "./urlView";

const DEFAULT: View = { tab: "members", cat: null, axis: "", mainOnly: false, year: 0, programme: "", q: "" };
test("the default view has no address; a read address gives the view back", () => {
  expect(viewToHash(DEFAULT)).toBe("");
  expect(hashToView("")).toEqual(DEFAULT);
  expect(viewToHash({ ...DEFAULT, cat: ["industriel"], axis: "A3" })).toBe("#vue=membres&cat=industriel&axe=A3");
  expect(viewToHash({ ...DEFAULT, mainOnly: true })).toBe("");
  for (const v of [{ ...DEFAULT, cat: ["regulier", "industriel"], axis: "A1", mainOnly: true }, { ...DEFAULT, cat: [] },
                   { ...DEFAULT, tab: "projects" as const, year: 2024, programme: "Odyssée St-Laurent", axis: "A4", q: "bruit & glace; 50 %" }]) {
    expect(hashToView(viewToHash(v))).toEqual(v);
  }
});
test("a damaged link doesn't throw; another kind of address is the default view", () => {
  expect(hashToView("#vue=projets&q=%E0%A4").q).toBe("%E0%A4");
  expect(viewToHash({ ...DEFAULT, tab: "projects" })).toBe("#vue=projets");
  expect(hashToView("#membre=UQAR").tab).toBe("members");
});
