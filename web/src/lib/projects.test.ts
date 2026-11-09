import { expect, test } from "vitest";
import { DATA } from "../data/dataset";
import type { Project } from "../data/types";
import { filterProjects, projectsAbout, touchesAxis, type ProjectFilters } from "./projects";

const NO_FILTERS: ProjectFilters = { query: "", year: 0, programme: "", axis: "", mainOnly: false };

const searchText = (p: Project) => [p.id, p.title, p.programme].join(" ");
const filtered = (f: Partial<ProjectFilters>) => filterProjects(DATA.projects, { ...NO_FILTERS, ...f }, searchText);

test("year, programme, axis (principal only or not) and search filters", () => {
  expect(filtered({}).length).toBe(DATA.projects.length);
  const a1 = filtered({ axis: "A1" }), a1p = filtered({ axis: "A1", mainOnly: true });
  expect(a1p.length > 0 && a1p.length < a1.length && a1p.every((p) => p.axis === "A1")).toBe(true);
  expect(a1.every((p) => touchesAxis(p, "A1", false))).toBe(true);
  const an = DATA.projects[0].year;
  expect(filtered({ year: an }).every((p) => p.year === an)).toBe(true);
  expect(filtered({ query: "OSL2020.2" })[0].id).toBe("OSL2020.2");
});

const ids = (l: { p: { id: string } }[]) => l.map((x) => x.p.id);
const samples = [{ id: "a", year: 2020, title: "Les baleines du golfe", description: "", axis: "", programme: "" },
  { id: "b", year: 2024, title: "Autre chose", teaser: "Le bruit des navires.", description: "Une baleine, l'érosion.", axis: "", programme: "" },
  { id: "c", year: 2022, title: "Érosion des côtes", description: "Merci.", axis: "", programme: "" },
  { id: "d", year: 2023, title: "Érosion", description: "", axis: "", programme: "" }];
test("subjects: whole words, accents and simple plurals ignored, small words out, title first, newest first", () => {
  expect(ids(projectsAbout(samples, "baleine"))).toEqual(["a", "b"]);
  expect(ids(projectsAbout(samples, "Baleines"))).toEqual(["a", "b"]);
  expect(ids(projectsAbout(samples, "erosion"))).toEqual(["d", "c", "b"]);
  expect(ids(projectsAbout(samples, "baleine bruit"))).toEqual(["b"]);
  expect(ids(projectsAbout(samples, "aleine"))).toEqual([]);
  expect(ids(projectsAbout(samples, "mer"))).toEqual([]);
  expect(ids(projectsAbout(samples, "les des"))).toEqual([]);
});
test("subjects on the real data", () => {
  const noise = projectsAbout(DATA.projects, "bruit");
  expect(noise.length).toBeGreaterThanOrEqual(3);
  expect(noise.every(({ p }) => /bruit/i.test([p.title, p.teaser, p.description].join(" ")))).toBe(true);
  expect(ids(projectsAbout(DATA.projects, "bruits"))).toEqual(ids(noise));
});
