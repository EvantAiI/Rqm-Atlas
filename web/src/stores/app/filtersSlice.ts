// Les filtres de la vue : l'onglet, les catégories et l'axe des membres, les filtres des projets, les collaborations.
import type { StateCreator } from "zustand";
import { CATEGORIES } from "../../data/categories";
import type { Category } from "../../data/types";
import type { ProjectFilters } from "../../lib/projects";
import type { Tab } from "../../lib/urlView";

export interface MemberFilters { categories: Set<Category>; memberAxis: string; memberMainOnly: boolean }
export const DEFAULT_MEMBER_FILTERS: MemberFilters = { categories: new Set(CATEGORIES.map((c) => c.code)), memberAxis: "", memberMainOnly: false };
export const DEFAULT_PROJECT_FILTERS: ProjectFilters = { query: "", year: 0, programme: "", axis: "", mainOnly: false };

export interface FiltersSlice extends MemberFilters {
  tab: Tab;
  showCollaborations: boolean;          // la vue d'ensemble montre les traits, du porteur de chaque projet à ses participants
  projectFilters: ProjectFilters;
  setTab(tab: Tab): void;
  setMemberFilters(f: Partial<MemberFilters>): void;
  resetMemberFilters(): void;
  setShowCollaborations(show: boolean): void;
  setProjectFilters(f: Partial<ProjectFilters>): void;
  resetProjectFilters(): void;
}

export const createFiltersSlice: StateCreator<FiltersSlice, [], [], FiltersSlice> = (set) => ({
  tab: "members",
  ...DEFAULT_MEMBER_FILTERS,
  showCollaborations: true,
  projectFilters: DEFAULT_PROJECT_FILTERS,
  setTab: (tab) => set({ tab }),
  setMemberFilters: (f) => set(f),
  resetMemberFilters: () => set(DEFAULT_MEMBER_FILTERS),
  setShowCollaborations: (showCollaborations) => set({ showCollaborations }),
  setProjectFilters: (f) => set((state) => ({ projectFilters: { ...state.projectFilters, ...f } })),
  resetProjectFilters: () => set({ projectFilters: DEFAULT_PROJECT_FILTERS }),
});
