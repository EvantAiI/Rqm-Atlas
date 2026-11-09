// « Qui travaille sur… » : les organisations des projets qui parlent d'un sujet.
import { DATA, PARTICIPANTS_BY_PROJECT } from "./dataset";
import type { Project } from "./types";
import { subjectWords, projectsAbout } from "../lib/projects";
import { getOrCreate } from "../lib/collections";
import { normalize } from "../lib/search";

// Les mots voisins d'un sujet proposé, choisis sur les projets (ceux qui disent la même chose autrement).
// Trouvés par le texte normalisé : « erosion » sans accent vaut « érosion ».
const RELATED_WORDS = new Map([["erosion", ["érosion", "submersion", "berges"]], ["bruit", ["bruit", "acoustique"]]]);
const related = (text: string) => RELATED_WORDS.get(normalize(text).trim()) || [text];
export const subjectTerms = (text: string) => related(text).flatMap(subjectWords);

export interface SubjectOrg { id: string; projects: Set<string>; leads: Set<string> }
export interface Subject { projects: Project[]; orgs: SubjectOrg[] }
// Les données ne changent pas : chaque sujet n'est cherché qu'une fois (la carte, la fiche et la recherche le redemandent).
const SUBJECTS = new Map<string, Subject>();
export const findSubject = (text: string) => getOrCreate(SUBJECTS, text, () => {
  const projects = [...new Set(related(text).flatMap((t) => projectsAbout(DATA.projects, t).map((x) => x.p)))];
  const orgs = new Map<string, SubjectOrg>();
  for (const p of projects) for (const { org, role } of PARTICIPANTS_BY_PROJECT.get(p.id) || []) {
    const entry = getOrCreate(orgs, org, () => ({ id: org, projects: new Set<string>(), leads: new Set<string>() }));
    entry.projects.add(p.id); if (role === "principal") entry.leads.add(p.id);
  }
  return { projects, orgs: [...orgs.values()] };
});

// Les sujets proposés quand le champ est vide : le mot cherché, et comment le dire (3 à 6 projets chacun, données du
// 6 nov. 2026). Seuls ceux qui ont des projets sont proposés.
const PROPOSED: [string, string][] = [["érosion", "l'érosion et la submersion des côtes"], ["bruit", "le bruit sous l'eau"],
  ["inondations", "les inondations"], ["algues", "les algues"], ["pêche", "la pêche"], ["navigation", "la navigation"],
  ["épaves", "les épaves"], ["autochtones", "les communautés autochtones"]];
export const SUBJECT_LABELS = new Map(PROPOSED);
export const SUGGESTED_SUBJECTS = PROPOSED.map(([word, label]) => ({ word, label, projects: findSubject(word).projects.length }))
  .filter((x) => x.projects > 0);
export const subjectTitle = (id: string) => (SUBJECT_LABELS.has(id) ? `Qui travaille sur ${SUBJECT_LABELS.get(id)} ?` : `Qui travaille sur « ${id} » ?`);
// La première phrase de l'accroche ou de la description qui contient un mot du sujet.
export const excerpt = (p: Project, words: string[]) => [p.teaser, p.description].filter((t): t is string => Boolean(t))
  .flatMap((t) => t.split(/(?<=[.!?])\s+/)).find((sentence) => subjectWords(sentence).some((m) => words.includes(m)));
