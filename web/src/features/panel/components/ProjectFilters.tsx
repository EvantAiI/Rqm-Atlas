// Les filtres des projets : année, programme (chaque choix avec son compte), axe ; leur compte et de quoi partager la vue.
import { useMemo } from "react";
import { DATA, PROGRAMMES, PROJECT_SEARCH_TEXT, YEARS } from "../../../data/dataset";
import { useAppStore } from "../../../stores/appStore";
import { isViewFiltered, shownProjects } from "../../../stores/selectors";
import type { ProjectFilters as Filters } from "../../../lib/projects";
import { formatNumber, wordFor } from "../../../utils/format";
import { HelpButton } from "../../help";
import { HELP_TEXTS } from "../../../constants/helpTexts";
import { optionCounts } from "../lib/optionCounts";
import { AxisFilter } from "./AxisFilter";
import { ViewTools } from "./ViewTools";
import { QUIET, SELECT } from "../../../styles/classes";

const searchText = (p: { id: string }) => PROJECT_SEARCH_TEXT.get(p.id)!;

// Un choix et son compte ; à zéro, grisé (le choix en cours reste choisissable).
function Option({ value, label, n, chosen }: { value: string | number; label: string; n: number; chosen: boolean }) {
  return <option value={value} disabled={!n && !chosen}>{label} ({formatNumber(n)})</option>;
}

export function ProjectFilters() {
  const f = useAppStore((state) => state.projectFilters), n = useAppStore((state) => shownProjects(state).length);
  const filtered = useAppStore(isViewFiltered);
  const counts = useMemo(() => optionCounts(DATA.projects, f, searchText), [f]);
  const set = (change: Partial<Filters>) => useAppStore.getState().setProjectFilters(change);
  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <select className={`${SELECT} min-w-0 flex-1`} aria-label="Année" value={f.year} onChange={(e) => set({ year: Number(e.target.value) })}>
          <option value={0}>Année</option>
          {YEARS.map((a) => <Option key={a} value={a} label={String(a)} n={counts.years.get(a) ?? 0} chosen={a === f.year} />)}
        </select>
        <select className={`${SELECT} min-w-0 flex-1`} aria-label="Programme" value={f.programme} onChange={(e) => set({ programme: e.target.value })}>
          <option value="">Programme</option>
          {PROGRAMMES.map((p) => <Option key={p} value={p} label={p} n={counts.programmes.get(p) ?? 0} chosen={p === f.programme} />)}
        </select>
        <HelpButton text={DATA.programmes[f.programme] ?? HELP_TEXTS.programmes} label="programmes de financement" />
      </div>
      <AxisFilter axis={f.axis} mainOnly={f.mainOnly} label="Axe thématique" className="mb-2"
        onAxis={(axis) => set({ axis })} onMainOnly={(mainOnly) => set({ mainOnly })} />
      <div className="mb-3 flex items-baseline justify-between gap-2 text-[13px]">
        <span aria-live="polite"><b className="text-ink-strong">{formatNumber(n)}</b> {wordFor(n, "projet")}{n < DATA.projects.length ? ` sur ${formatNumber(DATA.projects.length)}` : ""}</span>
        {filtered && <button type="button" className={QUIET} onClick={() => useAppStore.getState().resetProjectFilters()}>Tout afficher</button>}
      </div>
      {filtered && <div className="-mt-2 mb-3 text-[12px]"><ViewTools /></div>}
    </>
  );
}
