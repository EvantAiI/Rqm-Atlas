// Les projets que gardent les filtres, et ceux qui parlent d'un sujet.
import { filterMatches, normalize, terms } from "./search";
import { getOrCreate } from "./collections";

interface ProjectFields { axis: string; secondaryAxes?: string[]; year: number; programme: string }
// Le projet touche-t-il l'axe ? en axe principal seulement, ou principal et secondaire.
export const touchesAxis = (p: ProjectFields, axis: string, mainOnly: boolean) => !axis || p.axis === axis || (!mainOnly && (p.secondaryAxes || []).includes(axis));
export interface ProjectFilters { query: string; year: number; programme: string; axis: string; mainOnly: boolean }
// Les projets que gardent les filtres ; `text(p)` donne ce que fouille la recherche.
export function filterProjects<P extends ProjectFields>(projects: P[], f: ProjectFilters, text: (p: P) => string): P[] {
  const kept = projects.filter((p) => (!f.year || p.year === f.year) && (!f.programme || p.programme === f.programme)
                                    && touchesAxis(p, f.axis, f.mainOnly));
  if (!terms(f.query || "").length) return kept;
  return filterMatches(kept.map((p) => ({ p, t: text(p) })), f.query, ["t"]).map((x) => x.p);
}

// « Qui travaille sur… » : les projets qui parlent d'un sujet. Des mots entiers (« mer » ne trouve pas « mercure »),
// sans accents, le pluriel simple ôté des deux côtés ; les petits mots ne comptent pas. Chaque mot doit y être ; le score :
// ses occurrences, le titre pesant plus que l'accroche, l'accroche plus que la description. À égalité, le plus récent.
const STOP_WORDS = new Set("les des une dans pour par sur avec aux est sont qui que leur ces cette entre plus sous vers ainsi comme".split(" "));
const stem = (word: string) => (word.length > 3 ? word.replace(/[sx]$/, "") : word);
export const subjectWords = (text: unknown) => normalize(text).split(" ").filter((m) => m.length > 2 && !STOP_WORDS.has(m)).map(stem);
const SUBJECT_WEIGHTS = [["title", 4], ["teaser", 2], ["description", 1]] as const;
// Les mots de chaque champ d'un projet, normalisés une fois par projet (les données ne changent pas).
const FIELD_WORDS = new WeakMap<object, (readonly [string[], number])[]>();
type SubjectFields = ProjectFields & { title: string; teaser?: string; description?: string };
const fieldWords = (p: SubjectFields) => getOrCreate(FIELD_WORDS, p, () => SUBJECT_WEIGHTS.map(([field, weight]) => [subjectWords(p[field]), weight] as const));
export function projectsAbout<P extends SubjectFields>(projects: P[], query: string) {
  const sought = [...new Set(subjectWords(query))];
  if (!sought.length) return [];
  return projects.map((p) => {
    const words = fieldWords(p);
    let score = 0;
    for (const m of sought) {
      const n = words.reduce((t, [l, weight]) => t + weight * l.filter((x) => x === m).length, 0);
      if (!n) return null;
      score += n;
    }
    return { p, score };
  }).filter((x): x is { p: P; score: number } => x !== null).sort((a, b) => b.score - a.score || b.p.year - a.p.year);
}
