// Sur téléphone, « Filtres » déplie le corps du panneau sous l'en-tête (la fiche ouverte se cache : hooks/usePhoneTurns.ts).
import { useAppStore } from "../../../stores/appStore";
import { activeFilterCount } from "../../../stores/selectors";
import { PANEL_BODY_ID } from "../../../constants/ids";

// Le bouton compte les filtres posés : repliés, ils agissent encore sur la carte.

export function FiltersButton() {
  const n = useAppStore(activeFilterCount), open = useAppStore((state) => state.filtersOpen);
  const toggle = () => useAppStore.getState().setFiltersOpen(!open);
  return (
    <button type="button" aria-expanded={open} aria-controls={PANEL_BODY_ID} aria-label={n ? `Filtres, ${n} actif${n > 1 ? "s" : ""}` : "Filtres"} onClick={toggle}
      className="group relative hidden rounded-panel border border-primary bg-surface px-2.5 py-1 text-[12px] text-primary after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] aria-expanded:bg-primary aria-expanded:text-white phone:inline-block">
      Filtres
      {n > 0 && <span className="ml-1.5 inline-block h-4 min-w-4 rounded-lg bg-primary px-1 text-center text-[11px] font-bold leading-4 text-white group-aria-expanded:bg-white group-aria-expanded:text-primary">{n}</span>}
    </button>
  );
}
