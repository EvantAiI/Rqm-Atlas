// Combien de projets garderait chaque année, chaque programme, les autres filtres posés : « 2023 (3) ». Un choix à zéro
// se grise au lieu de mener à « 0 projet ».
import { filterProjects, type ProjectFilters } from "../../../lib/projects";

interface Counted { year: number; programme: string; axis: string; secondaryAxes?: string[] }

export function optionCounts<P extends Counted>(projects: P[], f: ProjectFilters, text: (p: P) => string) {
  const count = <K extends string | number>(kept: P[], key: (p: P) => K) => {
    const n = new Map<K, number>();
    for (const p of kept) n.set(key(p), (n.get(key(p)) ?? 0) + 1);
    return n;
  };
  return {
    years: count(filterProjects(projects, { ...f, year: 0 }, text), (p) => p.year),
    programmes: count(filterProjects(projects, { ...f, programme: "" }, text), (p) => p.programme),
  };
}
