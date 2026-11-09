// Ce que propose la recherche de membres : des villes, des régions, des organisations (huit au plus). Les sujets se
// cherchent dans l'onglet Projets : ce sont les projets qui disent pourquoi un membre touche à un sujet.
import { DATA } from "../../../data/dataset";
import type { Organisation } from "../../../data/types";
import { rankMatches, normalize, terms } from "../../../lib/search";
import { MUNICIPALITIES, type Town } from "../../../data/placement";
import { REGION_MEMBERS, matchRegions } from "../../../data/adminRegions";

export type MemberSuggestion =
  | { kind: "town"; town: Town }
  | { kind: "region"; name: string; members: number }
  | { kind: "org"; org: Organisation; text: string; positions: number[] };

const SEARCHABLE = DATA.organisations.map((o) => ({ o, label: o.acronym && !o.name.includes(o.acronym) ? `${o.name} (${o.acronym})` : o.name }));
const TOWNS = [...MUNICIPALITIES.values()].filter((town) => town.ids.length > 1).map((town) => ({ town, label: town.name }));
// En tête la ville qui commence ainsi et la région dont les mots commencent ainsi, puis les organisations.
export function memberSuggestions(raw: string): MemberSuggestion[] {
  const text = raw.trim(), typed = normalize(text).trim();
  if (!terms(text).length) return [];
  const orgs: MemberSuggestion[] = rankMatches(SEARCHABLE, raw, "label", 8)
    .map(({ e, r }) => ({ kind: "org", org: e.o, text: e.label, positions: r.positions }));
  const towns: MemberSuggestion[] = rankMatches(TOWNS, text, "label", 2)
    .filter((c) => normalize(c.e.label).trim().startsWith(typed)).map((c) => ({ kind: "town", town: c.e.town }));
  const places: MemberSuggestion[] = [...towns, ...matchRegions(text).map((name) => ({ kind: "region" as const, name, members: REGION_MEMBERS.get(name)!.length }))];
  return [...places, ...orgs];
}
