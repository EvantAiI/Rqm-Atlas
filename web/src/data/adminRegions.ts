// Les régions administratives du Québec : celle de chaque membre est déduite de son point au build (champ `region`,
// tools/build_data.py) ; ici, leurs membres, leurs projets, les régions avec lesquelles elles travaillent, et ce que la
// recherche en propose. Une région se nomme par son nom officiel (« Gaspésie–Îles-de-la-Madeleine »).
import { DATA, ORG_BY_ID, PARTICIPATIONS_BY_ORG, PARTICIPANTS_BY_PROJECT, PROJECT_BY_ID, byActivity } from "./dataset";
import { MUNICIPALITIES } from "./placement";
import { getOrCreate } from "../lib/collections";
import { normalize } from "../lib/search";
import type { Organisation, Project } from "./types";

const NAME_BY_CODE = new Map((DATA.regions || []).map((r) => [r.code, r.name]));
// « en Gaspésie… », « au Bas-Saint-Laurent » : la préposition de chaque région, par son code officiel.
const IN_REGION: Record<string, string> = {
  "01": "au", "02": "au", "03": "dans la", "04": "en", "05": "en", "06": "à", "07": "en", "08": "en", "09": "sur la",
  "10": "dans le", "11": "en", "12": "en", "13": "à", "14": "dans", "15": "dans les", "16": "en", "17": "dans le",
};

// La région d'une organisation (membre placé au Québec), ou rien.
export const orgRegion = (id: string) => NAME_BY_CODE.get(ORG_BY_ID.get(id)?.region || "");

// région -> ses membres, les plus actifs d'abord ; seules les régions qui en ont.
export const REGION_MEMBERS = new Map<string, Organisation[]>();
for (const o of DATA.organisations) { const name = orgRegion(o.id); if (name) getOrCreate(REGION_MEMBERS, name, () => []).push(o); }
for (const l of REGION_MEMBERS.values()) l.sort(byActivity);

const CODE_BY_NAME = new Map([...NAME_BY_CODE].map(([code, name]) => [name, code]));
export const inRegion = (name: string) => `${IN_REGION[CODE_BY_NAME.get(name)!]} ${name}`;

// La région d'une ville : celle de ses membres (une commune ne chevauche pas deux régions).
export const townRegion = (town: string) => MUNICIPALITIES.get(town)?.ids.map(orgRegion).find(Boolean);

// Les projets des membres d'une région, les plus récents d'abord.
const PROJECTS = new Map<string, Project[]>();
export const regionProjects = (name: string) => getOrCreate(PROJECTS, name, () => {
  const ids = new Set((REGION_MEMBERS.get(name) || []).flatMap((o) => (PARTICIPATIONS_BY_ORG.get(o.id) || []).map((x) => x.project)));
  return [...ids].map((id) => PROJECT_BY_ID.get(id)!).sort((a, b) => b.year - a.year || a.id.localeCompare(b.id));
});

// Les autres régions où ses membres ont des partenaires de projet : leurs membres partenaires, leurs projets en commun ;
// les plus fournies d'abord. Calculé une fois par région.
export interface RegionPartner { ids: string[]; projects: Set<string> }
const PARTNERS = new Map<string, Map<string, RegionPartner>>();
export const regionPartners = (name: string) => getOrCreate(PARTNERS, name, () => {
  const partners = new Map<string, RegionPartner>();
  for (const project of regionProjects(name)) for (const { org } of PARTICIPANTS_BY_PROJECT.get(project.id) || []) {
    const other = orgRegion(org);
    if (!other || other === name) continue;
    const partner = getOrCreate(partners, other, () => ({ ids: [], projects: new Set<string>() }));
    if (!partner.ids.includes(org)) partner.ids.push(org);
    partner.projects.add(project.id);
  }
  return new Map([...partners].sort((a, b) => b[1].projects.size - a[1].projects.size));
});

// Les régions qu'un texte tapé désigne : chaque mot tapé commence un mot du nom, accents, casse et tirets ignorés
// (« cote-nord », « bas-saint », « gaspésie », « madeleine ») ; celles qui ont le plus de membres d'abord.
const SEARCHABLE = [...REGION_MEMBERS].sort((a, b) => b[1].length - a[1].length).map(([name]) => ({ name, words: normalize(name).split(" ").filter(Boolean) }));
export function matchRegions(text: string, max = 2): string[] {
  const typed = normalize(text).split(" ").filter(Boolean);
  if (!typed.length) return [];
  return SEARCHABLE.filter((r) => typed.every((t) => r.words.some((w) => w.startsWith(t)))).slice(0, max).map((r) => r.name);
}

// Le nom officiel d'une région, écrit à peu près (une adresse tapée à la main, « gaspesie » suffit) ; rien si elle n'a pas de membre.
export const findRegion = (text: string) =>
  [...REGION_MEMBERS.keys()].find((name) => normalize(name).trim() === normalize(text).trim()) ?? matchRegions(text, 1)[0];
