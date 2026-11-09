// La liste des projets retenus par les filtres ; chacun ouvre sa fiche.
import { useAppStore } from "../../../stores/appStore";
import { shownProjects } from "../../../stores/selectors";
import { InfoLine } from "../../../components/InfoLine";
import { AxisBadges } from "../../../components/AxisBadge";

export function ProjectList() {
  const projects = useAppStore(shownProjects);
  const current = useAppStore((state) => (state.selection?.type === "project" ? state.selection.id : null));
  const open = (id: string) => useAppStore.getState().open({ type: "project", id }, { fromPanel: true });
  return (
    <ul className="m-0 list-none p-0">
      {projects.map((p) => (
        <li key={p.id} className="border-t border-line">
          <button type="button" data-project={p.id} aria-current={p.id === current || undefined} onClick={() => open(p.id)}
            className="block w-full border-0 bg-transparent px-1 py-2 text-left text-[13px] leading-[1.35] text-ink hover:bg-background aria-[current=true]:bg-background">
            <span className="mt-0.5 block font-semibold text-ink-strong">{p.shortTitle || p.title}</span>
            {p.teaser && <span className="mt-0.5 block text-[12px] text-ink">{p.teaser}</span>}
            <InfoLine items={[p.year]} />
            <span className="mt-1 block"><AxisBadges project={p} /></span>
          </button>
        </li>
      ))}
      {!projects.length && <li className="border-t border-line py-2 text-[12px] text-ink-muted">Aucun projet ne correspond.</li>}
    </ul>
  );
}
