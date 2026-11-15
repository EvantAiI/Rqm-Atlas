// La fiche ouverte, le chemin du retour, et les demandes de cadrage que la carte honore.
import type { StateCreator } from "zustand";
import { ORG_BY_ID } from "../../data/dataset";
import type { Place } from "../../data/nearby";
import { POSITION } from "../../data/placement";
import { mainTown } from "../../data/towns";
import { NEARBY, isCrossroads, sameSelection, type Selection } from "../selection";
import { visibleMembers } from "../selectors";
import { DEFAULT_MEMBER_FILTERS, type FiltersSlice, type MemberFilters } from "./filtersSlice";
import type { UiSlice } from "./uiSlice";

// Une demande à la carte : elle répond à chaque nouveau `seq`. selection : que la sélection soit visible (recenter :
// la cadrer même si elle l'est) ; filteredView : les membres de la vue filtrée (« Voir sur la carte ») ; nearMe : le lieu
// du visiteur et le membre choisi pour lui ; group : une bulle ou une grappe cliquée, ses membres ; overview : la vue
// d'ensemble (la visite guidée la rejoue).
export type FramingRequest =
  | { seq: number; kind: "selection"; recenter: boolean }
  | { seq: number; kind: "filteredView" }
  | { seq: number; kind: "nearMe"; here: [number, number]; id: string }
  | { seq: number; kind: "group"; ids: string[] }
  | { seq: number; kind: "overview"; duration: number };
export interface OpenOptions { recenter?: boolean; fromPanel?: boolean }

export interface SelectionSlice {
  selection: Selection | null;          // la fiche ouverte
  backTo: Selection | null;             // le carrefour d'où l'on vient, gardé de fiche en fiche
  sheetAxis: string;                    // les projets d'une fiche d'organisation : l'axe choisi dans sa répartition
  framing: FramingRequest;
  open(selection: Selection, options?: OpenOptions): void;
  openOrganisation(id: string, fromPanel?: boolean): void;
  openFromAddress(selection: Selection): void;
  openNearbyChoice(here: Place, id: string): void;
  openGroup(ids: string[]): void;
  close(): void;
  setSheetAxis(axis: string): void;
  showResults(): void;
  showOverview(duration: number): void;
}

type Opening = Pick<SelectionSlice, "selection" | "backTo"> & MemberFilters & Pick<FiltersSlice, "tab">;
// Ouvrir une fiche, sans effet : la nouvelle sélection, le chemin du retour, et les filtres des membres remis à tous si
// le membre ouvert était caché par eux (choisi par la recherche, un lien).
export function nextOpen(state: Opening, selection: Selection, fromPanel = false): Partial<SelectionSlice & MemberFilters> {
  const previous = state.selection;
  const backTo = fromPanel ? null : wayBack(state, selection);
  const o = selection.type === "member" ? ORG_BY_ID.get(selection.id) : undefined;
  const hidden = Boolean(o?.category && POSITION.has(o.id) && !visibleMembers(state).has(o.id));
  return { selection, backTo, ...(sameSelection(previous, selection) ? {} : { sheetAxis: "" }), ...(hidden ? DEFAULT_MEMBER_FILTERS : {}) };
}

// Le retour : le dernier carrefour d'où l'on vient, gardé de fiche en fiche (une région ouverte depuis une autre revient
// à la première) ; rien pour un carrefour où l'on revient, sinon les deux se renverraient l'un à l'autre.
function wayBack({ selection: previous, backTo }: Opening, selection: Selection) {
  if (sameSelection(previous, selection)) return backTo;
  const cameFrom = isCrossroads(previous) ? previous : null;
  if (!isCrossroads(selection)) return cameFrom ?? backTo;
  return sameSelection(backTo, selection) ? null : cameFrom;
}

type AppSlices = SelectionSlice & FiltersSlice & UiSlice;
export const createSelectionSlice: StateCreator<AppSlices, [], [], SelectionSlice> = (set, get) => ({
  selection: null,
  backTo: null,
  sheetAxis: "",
  framing: { seq: 0, kind: "selection", recenter: false },

  open: (selection, { recenter = false, fromPanel = false } = {}) => set((state) => ({
    ...nextOpen(state, selection, fromPanel), filtersOpen: false, framing: { seq: state.framing.seq + 1, kind: "selection", recenter },
  })),
  // une organisation : membre (un point sur la carte) ou hors réseau
  openOrganisation: (id, fromPanel = false) => {
    const o = ORG_BY_ID.get(id);
    if (o) get().open({ type: o.category ? "member" : "external", id }, { recenter: true, fromPanel });
  },
  // une fiche nommée par l'adresse (lien partagé, Précédent) : rien si elle est déjà ouverte ; un projet passe à son onglet
  openFromAddress: (selection) => {
    if (sameSelection(get().selection, selection)) return;
    if (selection.type === "project") get().setTab("projects");
    get().open(selection, { recenter: true });
  },
  // « près de chez moi » : la liste des proches, puis d'un même geste le membre choisi (le retour mène à la liste)
  openNearbyChoice: (here, id) => set((state) => {
    const list = nextOpen(state, NEARBY);
    return { ...list, ...nextOpen({ ...state, ...list }, { type: "member", id }), filtersOpen: false,
             framing: { seq: state.framing.seq + 1, kind: "nearMe", here: [here.lon, here.lat], id } };
  }),
  // une bulle ou une grappe : la fiche de sa ville, et la carte zoome sur elle (pas sur la ville et tous ses partenaires)
  openGroup: (ids) => set((state) => ({ ...nextOpen(state, { type: "town", id: mainTown(ids) }), filtersOpen: false,
    framing: { seq: state.framing.seq + 1, kind: "group", ids } })),
  close: () => set({ selection: null, backTo: null, sheetAxis: "" }),
  setSheetAxis: (sheetAxis) => set({ sheetAxis }),
  // voir les résultats, c'est voir la carte : la fiche ouverte se ferme (elle garderait ses membres à elle en couleur, et à
  // côté d'elle la place manque pour cadrer les résultats), et sur téléphone les filtres se replient
  showResults: () => set((state) => ({ selection: null, backTo: null, sheetAxis: "", filtersOpen: false,
    framing: { seq: state.framing.seq + 1, kind: "filteredView" } })),
  showOverview: (duration) => set((state) => ({ framing: { seq: state.framing.seq + 1, kind: "overview", duration } })),
});
