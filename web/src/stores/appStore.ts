// L'état de la page, partagé par la carte, le panneau et la fiche, en trois tranches : les filtres, la
// sélection, l'écran. Rien que des données : ce que l'écran en fait (caméra, focus, adresse, défilement) vit dans les
// composants et les hooks qui tiennent ce morceau d'écran.
// Les composants lisent l'état par sélecteur (useAppStore((state) => …)) et appellent les actions par
// useAppStore.getState() dans leurs gestionnaires.
import { create } from "zustand";
import { createFiltersSlice, type FiltersSlice } from "./app/filtersSlice";
import { createSelectionSlice, type SelectionSlice } from "./app/selectionSlice";
import { createUiSlice, type UiSlice } from "./app/uiSlice";

export type { Tab } from "../lib/urlView";
export type AppState = FiltersSlice & SelectionSlice & UiSlice;

export const useAppStore = create<AppState>()((...a) => ({ ...createFiltersSlice(...a), ...createSelectionSlice(...a), ...createUiSlice(...a) }));
