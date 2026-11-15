import { expect, test } from "vitest";
import type { LineString } from "geojson";
import { DEFAULT_PROJECT_FILTERS, DEFAULT_MEMBER_FILTERS } from "../../../stores/app/filtersSlice";
import { visibleMembers } from "../../../stores/selectors";
import { orgTown } from "../../../data/dataset";
import { townLink } from "../../../data/links";
import { drawnAt } from "../../../data/placement";
import { toPixels } from "../../../lib/geometry";
import { geometry, plan, type LinkInput, type PlannedArc } from "./links";

const filters = { tab: "members" as const, ...DEFAULT_MEMBER_FILTERS };
const input: LinkInput = { ...filters, selection: null, showCollaborations: true, projectFilters: DEFAULT_PROJECT_FILTERS,
  sheetProjects: null, visible: visibleMembers(filters) };

// Les mêmes liens, de ville à ville, à tous les zooms : en zoomant, aucun n'apparaît, ne disparaît ni ne change d'épaisseur.
test("the overview: the same town-to-town links, all alike, at every zoom", () => {
  const arcs = plan(input, 5.2), shape = (l: PlannedArc[]) => l.map((x) => `${x.text[0].t}:${x.width}`).sort();
  expect(arcs.length).toBeGreaterThan(25);
  expect(arcs.every((x) => x.opacity === 0.8)).toBe(true);
  for (const x of arcs) expect(x.link!.projects.length).toBeGreaterThan(0);
  expect(arcs[0].text[0].t).toMatch(/ ↔ /);
  for (const z of [6, 7, 9, 12]) expect(shape(plan(input, z))).toEqual(shape(arcs));
});
// De près, les traits partent de chaque acteur, pas du plus actif de la ville : un faisceau par paire de villes.
const branchIds = (x: PlannedArc, side: 0 | 1) => x.fan!.sides[side].flatMap((b) => b.ids);
const endsIn = (arcs: PlannedArc[], town: string) => new Set(arcs.flatMap((x) => [...branchIds(x, 0), ...branchIds(x, 1)]).filter((id) => orgTown(id) === town));
test("a town sheet, up close, draws from each of its members, one fan per partner town", () => {
  const arcs = plan({ ...input, selection: { type: "town", id: "Rimouski" } }, 13);
  expect(endsIn(arcs, "Rimouski").size).toBeGreaterThan(3);
  expect(new Set(arcs.map((x) => x.text[0].t)).size).toBe(arcs.length);
  expect(arcs.every((x) => x.text[0].t.startsWith("Rimouski ↔ "))).toBe(true);   // la fiche ouverte se nomme en premier
});
test("a town-to-town link, up close, is one trunk with a branch per member on each side", () => {
  const arcs = plan({ ...input, selection: townLink("Rimouski", "Montréal")! }, 13);
  expect(arcs.length).toBe(1);
  const [x] = arcs, towns = [0, 1].map((i) => new Set(branchIds(x, i as 0 | 1).map(orgTown)));
  expect(towns.map((t) => [...t].join()).sort()).toEqual(["Montréal", "Rimouski"]);
  expect(x.fan!.sides.every((side) => side.length > 1)).toBe(true);
});
// De près, chaque point n'a qu'un rayon vers la gare de sa ville, quel que soit le nombre de villes partenaires.
test("a town sheet, drawn: one spoke per drawn member, one line per partner town", () => {
  const arcs = plan({ ...input, selection: { type: "town", id: "Rimouski" } }, 13), all = geometry(arcs, 13).features;
  const lines = all.filter((f) => f.geometry.type === "LineString");
  // la gare n'est jamais un membre : chaque point dessiné de Rimouski a son rayon, l'UQAR comme les autres
  expect(all.length).toBeGreaterThan(lines.length);
  const key = (ids: string[]) => [...ids].sort().join(), here = new Set(arcs.flatMap((x) => x.fan!.sides[0].map((b) => key(b.ids))));
  expect(lines.filter((f) => f.properties!.open && here.has(key(JSON.parse(f.properties!.open)))).length).toBe(here.size);
  const spokes = lines.filter((f) => f.properties!.colour === "#64748b"), starts = spokes.map((f) => JSON.stringify((f.geometry as LineString).coordinates[0]));
  expect(spokes.length).toBeGreaterThan(3);
  expect(new Set(starts).size).toBe(starts.length);
  expect(lines.length - spokes.length).toBe(arcs.length);
});
// Sans acteur choisi, deux acteurs d'une même ville qui travaillent ensemble sont reliés par leur gare : un rayon chacun,
// pas d'arc de la ville à elle-même.
test("the overview, up close: two members of one town are linked through its station", () => {
  const arcs = plan(input, 13), local = arcs.filter((x) => x.fan!.stations[0] === x.fan!.stations[1]);
  expect(local.map((x) => x.fan!.stations[0])).toContain("Rimouski");
  const lines = geometry(arcs, 13).features.filter((f) => f.geometry.type === "LineString");
  expect(lines.some((f) => /^Rimouski ↔ Rimouski/.test(JSON.parse(f.properties!.text)[0].t))).toBe(false);
  const spoked = new Set(lines.flatMap((f) => (f.properties!.open ? JSON.parse(f.properties!.open) : [])));
  expect(local.flatMap((x) => x.fan!.sides.flat().flatMap((b) => b.ids)).filter((id) => spoked.has(id)).length).toBeGreaterThan(0);
});
// Un acteur choisi : un arc direct de son point vers chaque partenaire, de sa ville comme d'ailleurs ; ni gare ni rayon.
test("a member sheet: direct arcs from its own point, no station", () => {
  const arcs = plan({ ...input, selection: { type: "member", id: "UQAR" } }, 13), lines = geometry(arcs, 13).features;
  expect(lines.every((f) => f.geometry.type === "LineString" && !f.properties!.open)).toBe(true);
  expect(arcs.some((x) => typeof x.b === "string" && orgTown(x.b) === "Rimouski")).toBe(true);
  // côte à côte, chaque trait part du point même avant de rejoindre sa bande
  const [lon, lat] = drawnAt("UQAR", 13), own = toPixels(lat, lon, 13);
  const starts = lines.filter((f) => f.geometry.type === "LineString" && !f.properties!.open).map((f) => {
    const [x, y] = (f.geometry as LineString).coordinates[0], p = toPixels(y, x, 13);
    return Math.hypot(p.x - own.x, p.y - own.y);
  });
  expect(starts.length).toBeGreaterThan(1);
  expect(starts.every((d) => d < 0.5)).toBe(true);
});
// Ce qu'on clique et ce qu'on lit : la fiche d'un lien entre deux villes liste exactement les projets de son arc.
test("a town-to-town link sheet lists exactly the projects of its arc", () => {
  const arc = plan(input, 13).find((x) => [...x.fan!.stations].sort().join() === "Montréal,Rimouski")!;
  expect([...arc.link!.projects].sort()).toEqual([...townLink("Rimouski", "Montréal")!.projects].sort());
});
test("without collaborations, no arc", () => {
  expect(plan({ ...input, showCollaborations: false }, 5.2)).toEqual([]);
});
test("a project sheet draws from its leads to its other shown participants", () => {
  const arcs = plan({ ...input, selection: { type: "project", id: "PLAINE-2022PS02" } }, 7);
  expect(arcs.length).toBeGreaterThan(0);
  expect(arcs.every((x) => x.width === 2 && !x.link)).toBe(true);
});
