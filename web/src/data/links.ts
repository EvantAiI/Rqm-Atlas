// Un trait entre deux groupes de villes (ou d'organisations), tel qu'une fiche « lien » le montre. Son nom, sa couleur
// et ses bouts se calculent ici, une seule fois : personne ne relit le nom pour retrouver les villes.
import { PROJECT_BY_ID } from "./dataset";
import { axisColour, dominantAxis } from "./axes";
import { MUNICIPALITIES, TOWN_BY_NAME } from "./placement";
import { municipality } from "./regions";
import { townPartners } from "./towns";
import { getOrCreate } from "../lib/collections";

type LngLat = [number, number];
export interface LinkSelection {
  type: "link";
  id: string;                 // « Rimouski ↔ Matane », ou « Rimouski, Matane ↔ Gaspé » quand des traits fusionnent
  from: string[]; to: string[];
  a: LngLat; b: LngLat;       // les bouts dessinés
  colour: string;
  projects: string[];
}

// Un bout nommé : une ville et l'un de ses quartiers fusionnés ne se disent que par la commune (« Saguenay » et
// « Saguenay (Chicoutimi) » : « Saguenay ») ; un quartier seul garde son nom, une organisation aussi.
export function endLabel(names: string[]) {
  const shared = (n: string) => TOWN_BY_NAME.has(n) && names.some((other) => other !== n && municipality(other) === municipality(n));
  return [...new Set(names.map((n) => (shared(n) ? municipality(n) : n)))].join(", ");
}
export const linkLabel = (from: string[], to: string[]) => `${endLabel(from)} ↔ ${endLabel(to)}`;

// La couleur d'un ensemble de projets : celle de leur axe le plus fréquent.
function projectsColour(projects: string[]) {
  const byAxis = new Map<string, Set<string>>();
  for (const c of projects) getOrCreate(byAxis, PROJECT_BY_ID.get(c)!.axis, () => new Set<string>()).add(c);
  return axisColour(dominantAxis(byAxis));
}

// colour : imposée par un arc d'un seul axe (la fiche d'un sujet) ; sinon l'axe le plus fréquent.
export function makeLink(from: string[], to: string[], projects: string[], [a, b]: [LngLat, LngLat], colour = projectsColour(projects)): LinkSelection {
  return { type: "link", id: linkLabel(from, to), from, to, a, b, colour, projects };
}

// Le trait entre deux communes, tel que la fiche d'une ville l'ouvre : tous leurs projets en commun.
export function townLink(a: string, b: string): LinkSelection | null {
  const l = townPartners(a).get(b);
  if (!l) return null;
  const [ca, cb] = [MUNICIPALITIES.get(a)!, MUNICIPALITIES.get(b)!];
  return makeLink([a], [b], [...l.projects], [[ca.lon, ca.lat], [cb.lon, cb.lat]]);
}

// Le trait que nomme une adresse : tous les projets de deux communes, ou ceux qu'elle cite (un bout fait de plusieurs
// villes, « Rimouski, Matane », quand les traits fusionnent aux zooms éloignés).
export function linkFromAddress(from: string[], to: string[], codes: string[] | null): LinkSelection | null {
  if (!codes) return from.length === 1 && to.length === 1 && MUNICIPALITIES.has(from[0]) && MUNICIPALITIES.has(to[0]) ? townLink(from[0], to[0]) : null;
  const end = (names: string[]) => TOWN_BY_NAME.get(names[0]) || MUNICIPALITIES.get(names[0]);
  const a = end(from), b = end(to), projects = codes.filter((c) => PROJECT_BY_ID.has(c));
  if (!a || !b || !projects.length) return null;
  return makeLink(from, to, projects, [[a.lon, a.lat], [b.lon, b.lat]]);
}
