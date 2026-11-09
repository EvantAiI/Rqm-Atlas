// Ce que la visite fait à la page : chaque étape la prépare, et la fermeture la rend comme avant.
import { useEffect, type RefObject } from "react";
import type { Organisation } from "../../../data/types";
import { useAppStore, type AppState } from "../../../stores/appStore";
import { useMapStore } from "../../../stores/mapStore";
import { MOBILE } from "../../../utils/screen";
import { STEPS } from "../lib/steps";
import { TOUR_SEEN_KEY } from "../../../constants/storageKeys";
import { useNearbyStore } from "../../../stores/nearbyStore";

// Ce que le visiteur regardait : la fiche, l'onglet, les filtres, le champ, les filtres dépliés (téléphone).
const viewOf = ({ selection, backTo, sheetAxis, tab, categories, memberAxis, memberMainOnly, showCollaborations, projectFilters, memberQuery, filtersOpen }: AppState) =>
  ({ selection, backTo, sheetAxis, tab, categories, memberAxis, memberMainOnly, showCollaborations, projectFilters, memberQuery, filtersOpen });

// Le temps de la visite : elle montre tout le réseau (filtres à zéro), puis la page revient telle que le visiteur l'avait
// laissée, caméra comprise. Sauf « Essayer », qui ouvre « Près de chez moi » exprès.
export function useTourSession(open: boolean, tryItRef: RefObject<boolean>) {
  useEffect(() => {
    if (!open) return;
    const page = useAppStore.getState(), view = viewOf(page), map = useMapStore.getState().map;
    const camera = map && { center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() };
    page.resetMemberFilters(); page.resetProjectFilters(); page.setMemberQuery("");
    tryItRef.current = false;
    return () => {
      try { localStorage.setItem(TOUR_SEEN_KEY, "vu"); } catch { /* sans stockage, elle reviendra : tant pis */ }
      // « Essayer » : comme le bouton « Près de chez moi » (position connue, refusée, à demander)
      if (tryItRef.current) {
        useAppStore.setState({ ...view, selection: null, backTo: null, sheetAxis: "", filtersOpen: false });
        useNearbyStore.getState().nearMe();
        return;
      }
      useAppStore.setState(view);
      if (camera) map.easeTo({ ...camera, duration: 600 });
      document.querySelector<HTMLElement>('[data-tour="help"]')?.focus();
    };
  }, [open, tryItRef]);
}

// Chaque étape part de l'onglet Membres, champ des projets vide ; ses minuteurs meurent avec elle.
export function useTourStep(step: number, demo: Organisation | null) {
  useEffect(() => {
    if (step < 0 || !demo) return;
    const s = STEPS[step], timers: number[] = [], page = useAppStore.getState();
    page.setProjectFilters({ query: "" });   // la visite tape un sujet dans le champ des projets
    if (page.tab !== "members") page.setTab("members");
    (s.start ?? (() => page.close()))({ demo, map: useMapStore.getState().map ?? undefined, later: (ms, f) => timers.push(window.setTimeout(f, ms)) });
    if (MOBILE) useAppStore.getState().setFiltersOpen(Boolean(s.filters));
    return () => timers.forEach(clearTimeout);
  }, [step, demo]);
}
