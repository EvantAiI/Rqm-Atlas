// Sur téléphone, la fiche et les filtres se partagent l'écran à tour de rôle : celui qui s'ouvre cache l'autre, et
// l'autre revient quand il se ferme. Pur : l'état d'avant, l'état d'après, ce qui est caché ; vérifié par phoneTurns.test.ts.
import type { AppState } from "../../../stores/appStore";

export type Sheet = Pick<AppState, "selection" | "backTo" | "sheetAxis">;
export type Seen = Sheet & Pick<AppState, "filtersOpen" | "framing">;
export interface Hidden { sheet: Sheet | null; filters: boolean }
export const NOTHING_HIDDEN: Hidden = { sheet: null, filters: false };
const NO_SHEET: Sheet = { selection: null, backTo: null, sheetAxis: "" };

export function nextTurn(prev: Seen, state: Seen, hidden: Hidden): { hidden: Hidden; change?: Partial<AppState> } {
  const { selection, backTo, sheetAxis } = prev;
  // « Filtres » sur une fiche : la fiche se cache, elle reviendra (et retiendra d'où elle venait)
  if (!prev.filtersOpen && state.filtersOpen && state.selection) return { hidden: { sheet: { selection, backTo, sheetAxis }, filters: hidden.filters }, change: NO_SHEET };
  // une fiche ouverte depuis les filtres (un résultat, un projet de la liste) : les filtres reviendront
  if (prev.filtersOpen && !state.filtersOpen && state.selection) return { hidden: { sheet: null, filters: true } };
  // les filtres repliés sans fiche : la fiche cachée revient, sauf pour « Voir sur la carte » (la vue filtrée)
  if (prev.filtersOpen && !state.filtersOpen && !state.selection) {
    const back = hidden.sheet && state.framing === prev.framing ? hidden.sheet : null;
    return back ? { hidden: { sheet: null, filters: hidden.filters }, change: back } : { hidden: NOTHING_HIDDEN };
  }
  // la fiche fermée (croix, retour) : les filtres d'où elle venait reviennent
  if (prev.selection && !state.selection && !state.filtersOpen && hidden.filters) return { hidden: NOTHING_HIDDEN, change: { filtersOpen: true } };
  return { hidden };
}
