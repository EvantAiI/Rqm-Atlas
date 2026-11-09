// Ce que l'écran garde d'un instant à l'autre : le texte de la recherche des membres, les filtres dépliés (téléphone).
import type { StateCreator } from "zustand";

export interface UiSlice {
  memberQuery: string;                  // gardé d'un onglet à l'autre
  filtersOpen: boolean;                 // téléphone : les filtres sont dépliés sous l'en-tête
  setMemberQuery(query: string): void;
  setFiltersOpen(open: boolean): void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
  memberQuery: "",
  filtersOpen: false,
  setMemberQuery: (memberQuery) => set({ memberQuery }),
  setFiltersOpen: (filtersOpen) => set({ filtersOpen }),
});
