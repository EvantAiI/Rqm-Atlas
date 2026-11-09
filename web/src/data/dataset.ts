// Les données écrites par tools/build_data.py (generated/data.json), et les index dont toute la page se sert.
import { collaborations } from "../lib/network";
import { getOrCreate } from "../lib/collections";
import { COLLATION } from "../lib/sorting";
import data from "../../generated/data.json";
import type { Dataset, Organisation, Role } from "./types";

export const DATA = data as unknown as Dataset;
export const AXIS_BY_CODE = new Map(DATA.axes.map((a) => [a.code, a]));
export const ORG_BY_ID = new Map(DATA.organisations.map((o) => [o.id, o]));
export const PROJECT_BY_ID = new Map(DATA.projects.map((p) => [p.id, p]));
export const MEMBERS = DATA.organisations.filter((o) => o.category);

// Les participations par projet et par organisation ; les collaborations par membre.
export const PARTICIPANTS_BY_PROJECT = new Map<string, { org: string; role: Role }[]>();
export const PARTICIPATIONS_BY_ORG = new Map<string, { project: string; role: Role }[]>();
for (const [project, org, role] of DATA.participations) {
  getOrCreate(PARTICIPANTS_BY_PROJECT, project, () => []).push({ org, role });
  getOrCreate(PARTICIPATIONS_BY_ORG, org, () => []).push({ project, role });
}
// Les organisations d'un projet (membres ou non)
export const projectOrgs = (project: string) => (PARTICIPANTS_BY_PROJECT.get(project) || []).map((x) => x.org);
export const projectCount = (id: string) => (PARTICIPATIONS_BY_ORG.get(id) || []).length;
export const COLLABORATIONS = collaborations(DATA.participations, (id) => Boolean(ORG_BY_ID.get(id)?.category));
export const PARTNERS_BY_ORG = new Map<string, { other: string; projects: string[] }[]>();
for (const c of COLLABORATIONS) for (const [x, y] of [[c.a, c.b], [c.b, c.a]]) getOrCreate(PARTNERS_BY_ORG, x, () => []).push({ other: y, projects: c.projects });
// Ce que fouille la recherche de projets : code, titres, programme, textes, noms et sigles des participants.
export const PROJECT_SEARCH_TEXT = new Map(DATA.projects.map((p) => [p.id, [p.id, p.title, p.shortTitle, p.programme, p.teaser, p.description,
  ...(PARTICIPANTS_BY_PROJECT.get(p.id) || []).map(({ org: o }) => `${ORG_BY_ID.get(o)!.name} ${ORG_BY_ID.get(o)!.acronym || ""}`)].join(" ")]));
// Les années et les programmes des projets, pour les filtres (les plus récentes d'abord ; programmes dans l'ordre alphabétique).
export const YEARS = [...new Set(DATA.projects.map((p) => p.year))].sort((a, b) => b - a);
export const PROGRAMMES = [...new Set(DATA.projects.map((p) => p.programme))].sort(COLLATION.compare);
// La ville d'une organisation, telle que les données la nomment.
export const orgTown = (id: string) => ORG_BY_ID.get(id)!.town || "";
// Des organisations rangées par ville, dans l'ordre où elles viennent.
export function groupByTown<T>(items: T[], idOf: (item: T) => string) {
  const towns = new Map<string, T[]>();
  for (const item of items) getOrCreate(towns, orgTown(idOf(item)) || "Ville inconnue", () => []).push(item);
  return towns;
}
// Les organisations les plus actives d'abord, puis par nom.
export const byActivity = (a: Organisation, b: Organisation) => projectCount(b.id) - projectCount(a.id) || COLLATION.compare(a.name, b.name);
