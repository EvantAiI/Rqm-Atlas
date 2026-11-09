// La recherche de projets, par mot-clé : champ vide, les sujets proposés ; en tapant, « Qui travaille sur « bruit » ? »
// si des projets en parlent, puis les projets qui correspondent. Un sujet ouvre sa fiche : les projets, puis leurs membres.
import { useCallback, type ReactNode, type RefObject } from "react";
import type { Project } from "../../../data/types";
import { terms } from "../../../lib/search";
import { SUGGESTED_SUBJECTS, findSubject } from "../../../data/subjects";
import { useAppStore } from "../../../stores/appStore";
import { shownProjects } from "../../../stores/selectors";
import { capitalize, plural } from "../../../utils/format";
import { useCombobox } from "../../../hooks/useCombobox";
import { Suggestions, isShown } from "../../../components/Suggestions";
import { FIELD, SOURCE } from "../../../styles/classes";

type ProjectSuggestion = { project: Project } | { subject: string; label: ReactNode; projects: number };
const SUBJECTS: ProjectSuggestion[] = SUGGESTED_SUBJECTS.map(({ word, label, projects }) => ({ subject: word, label: capitalize(label), projects }));

function take(c: ProjectSuggestion) {
  const app = useAppStore.getState();
  if ("project" in c) app.open({ type: "project", id: c.project.id }, { recenter: true, fromPanel: true });
  else { app.setProjectFilters({ query: "" }); app.open({ type: "subject", id: c.subject }, { recenter: true, fromPanel: true }); }
}

function render(c: ProjectSuggestion) {
  if ("project" in c) return <>{c.project.shortTitle || c.project.title} <span className={SOURCE}>{c.project.year}</span></>;
  return <span className="flex items-baseline justify-between gap-2"><span>{c.label}</span><span className={`flex-none ${SOURCE}`}>{plural(c.projects, "projet")}</span></span>;
}

export function ProjectSearch({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) {
  const text = useAppStore((state) => state.projectFilters.query), shown = useAppStore(shownProjects);
  const suggest = useCallback((t: string): ProjectSuggestion[] => {
    if (!terms(t).length) return SUBJECTS;
    const word = t.trim(), n = findSubject(word).projects.length;
    const subject: ProjectSuggestion[] = n ? [{ subject: word, label: <>Qui travaille sur « <mark>{word}</mark> » ?</>, projects: n }] : [];
    return [...subject, ...shown.slice(0, 6).map((project) => ({ project }))];
  }, [shown]);
  const box = useCombobox({ text, suggest, take, inputRef });
  return (
    <div className="mb-3" data-tour="search">
      <input type="search" value={text} placeholder="Un sujet, un titre : érosion, bruit…" autoComplete="off" className={FIELD}
        aria-label="Rechercher un projet par un mot de son titre ou de sa description, son code ou un organisme participant"
        aria-expanded={isShown(box)} {...box.field}
        onChange={(e) => { useAppStore.getState().setProjectFilters({ query: e.target.value }); box.field.onChange(); }} />
      <Suggestions box={box} label="Sujets et projets correspondants" render={render}
        heading={terms(text).length ? null : "Qui travaille sur…"} />
    </div>
  );
}
