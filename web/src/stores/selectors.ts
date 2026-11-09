// Ce qui découle de l'état : les membres affichés, ceux mis en avant, les projets listés, les projets d'une fiche.
// Des fonctions pures des champs de l'état, chacune gardant sa dernière réponse (l'état change par remplacement :
// mêmes champs, même réponse).
import { CATEGORIES } from "../data/categories";
import { DATA, MEMBERS, PARTICIPATIONS_BY_ORG, PARTNERS_BY_ORG, PROJECT_BY_ID, PROJECT_SEARCH_TEXT, projectOrgs } from "../data/dataset";
import type { Place } from "../data/nearby";
import { nearbyTowns } from "../data/nearby";
import { MUNICIPALITIES, POSITION } from "../data/placement";
import { findSubject } from "../data/subjects";
import { REGION_MEMBERS } from "../data/adminRegions";
import { filterProjects, touchesAxis, type ProjectFilters } from "../lib/projects";
import type { Tab } from "../lib/urlView";
import type { FiltersSlice } from "./app/filtersSlice";
import type { Selection } from "./selection";

function memoize<A extends unknown[], R>(f: (...a: A) => R): (...a: A) => R {
  let previous: A | null = null, result: R;
  return (...a) => {
    if (!previous || a.length !== previous.length || a.some((x, i) => x !== previous![i])) { previous = a; result = f(...a); }
    return result;
  };
}

type MemberView = Pick<FiltersSlice, "categories" | "tab" | "memberAxis" | "memberMainOnly">;
// Les membres sur la carte : par catégorie et par axe dans l'onglet Membres ; dans l'onglet Projets ils restent tous, ceux
// des projets filtrés en couleur.
const visibleOf = memoize((categories: Set<string>, tab: Tab, axis: string, mainOnly: boolean) => {
  const visible = new Set<string>();
  for (const o of MEMBERS) {
    if (!POSITION.has(o.id) || !categories.has(o.category!)) continue;
    if (tab === "members" && axis && !(PARTICIPATIONS_BY_ORG.get(o.id) || []).some(({ project }) => touchesAxis(PROJECT_BY_ID.get(project)!, axis, mainOnly))) continue;
    visible.add(o.id);
  }
  return visible;
});
export const visibleMembers = (state: MemberView) => visibleOf(state.categories, state.tab, state.memberAxis, state.memberMainOnly);

const shownOf = memoize((f: ProjectFilters) => filterProjects(DATA.projects, f, (p) => PROJECT_SEARCH_TEXT.get(p.id)!));
export const shownProjects = (state: Pick<FiltersSlice, "projectFilters">) => shownOf(state.projectFilters);

const partnersOf = (id: string) => (PARTNERS_BY_ORG.get(id) || []).map((c) => c.other);
// Ceux à mettre en avant : la sélection et ses voisins, ou les membres des projets filtrés ; null : tous pareils.
const highlightedOf = memoize((s: Selection | null, here: Place | null, tab: Tab, f: ProjectFilters): Set<string> | null => {
  if (s) switch (s.type) {
    case "project": return new Set(projectOrgs(s.id));
    case "member": return new Set([s.id, ...partnersOf(s.id)]);
    case "subject": return new Set(findSubject(s.id).orgs.map((o) => o.id));
    case "nearby": return here ? new Set(nearbyTowns(here).flatMap((x) => x.town.ids)) : null;
    case "link": return new Set(s.projects.flatMap(projectOrgs));
    case "town": return new Set(MUNICIPALITIES.get(s.id)!.ids.flatMap((id) => [id, ...partnersOf(id)]));
    case "region": return new Set(REGION_MEMBERS.get(s.id)!.map((o) => o.id));   // ses membres seuls : leurs partenaires couvriraient presque tout
    case "external": return new Set((PARTICIPATIONS_BY_ORG.get(s.id) || []).flatMap(({ project }) => projectOrgs(project)));
  }
  if (tab === "projects") return new Set(shownOf(f).flatMap((p) => projectOrgs(p.id)));
  return null;
});
interface SelectionState { selection: Selection | null }
export const highlightedMembers = (state: Pick<FiltersSlice, "tab" | "projectFilters"> & SelectionState, here: Place | null) =>
  highlightedOf(state.selection, here, state.tab, state.projectFilters);

// Les membres de la vue filtrée : ceux affichés (Membres), ou ceux des projets retenus (Projets).
const viewMembersOf = memoize((visible: Set<string>, tab: Tab, f: ProjectFilters) => (tab === "members" ? [...visible]
  : [...new Set(shownOf(f).flatMap((p) => projectOrgs(p.id)))].filter((id) => visible.has(id))));
export const viewMembers = (state: MemberView & Pick<FiltersSlice, "projectFilters">) => viewMembersOf(visibleMembers(state), state.tab, state.projectFilters);

// Les projets d'une fiche d'organisation que garde l'axe choisi dans sa répartition (la carte ne trace que leurs liens).
const sheetProjectsOf = memoize((s: Selection | null, axis: string) => (!s || !axis || (s.type !== "member" && s.type !== "external") ? null
  : new Set((PARTICIPATIONS_BY_ORG.get(s.id) || []).map((x) => x.project).filter((id) => PROJECT_BY_ID.get(id)!.axis === axis))));
export const sheetProjects = (state: SelectionState & { sheetAxis: string }) => sheetProjectsOf(state.selection, state.sheetAxis);

// Les filtres posés dans l'onglet courant (repliés sur téléphone, ils agissent encore sur la carte).
export const activeFilterCount = (state: MemberView & Pick<FiltersSlice, "projectFilters">) => {
  const f = state.projectFilters;
  return state.tab === "projects" ? [f.query, f.year, f.programme, f.axis].filter(Boolean).length
    : Number(state.categories.size < CATEGORIES.length) + Number(Boolean(state.memberAxis));
};
export const isViewFiltered = (state: MemberView & Pick<FiltersSlice, "projectFilters">) => activeFilterCount(state) > 0;
