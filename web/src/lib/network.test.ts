import { expect, test } from "vitest";
import { DATA } from "../data/dataset";
import { collaborations } from "./network";

test("pairs of members of one project, no duplicate, non-members out, richest first", () => {
  const orgs = new Map(DATA.organisations.map((o) => [o.id, o])), isMember = (id: string) => Boolean(orgs.get(id)!.category);
  const collabs = collaborations(DATA.participations, isMember);
  expect(new Set(collabs.map((c) => `${c.a}|${c.b}`)).size).toBe(collabs.length);
  for (const c of collabs) expect(c.a < c.b && isMember(c.a) && isMember(c.b) && c.projects.length >= 1).toBe(true);
  for (let i = 1; i < collabs.length; i++) expect(collabs[i - 1].projects.length).toBeGreaterThanOrEqual(collabs[i].projects.length);
  expect(collaborations([["P", "a", "principal"], ["P", "b", "partenaire"], ["P", "x", "partenaire"], ["Q", "b", "principal"], ["Q", "a", "collaborateur"]],
    (id) => id !== "x")).toEqual([{ a: "a", b: "b", projects: ["P", "Q"] }]);
});
