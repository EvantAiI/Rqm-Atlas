// Ce qui ouvre et ferme la visite : le premier passage, les touches, Précédent / Suivant.
import { useEffect } from "react";
import { flushSync } from "react-dom";
import { useAppStore } from "../../../stores/appStore";
import { useMapStore } from "../../../stores/mapStore";
import { useTourStore } from "../../../stores/tourStore";
import { TOUR_SEEN_KEY } from "../../../constants/storageKeys";

// Premier passage, sans lien vers une fiche ou une vue : la visite, une fois le réseau tissé.
export function useFirstVisit() {
  const map = useMapStore((state) => state.map);
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(TOUR_SEEN_KEY) === "vu"; } catch { /* sans stockage : comme une première fois */ }
    if (seen || location.hash || !map) return;
    let timer = 0;
    const go = () => { timer = window.setTimeout(() => { if (!useAppStore.getState().selection) useTourStore.getState().openTour(); }, 2600); };
    if (map.loaded()) go(); else map.once("idle", go);
    return () => { clearTimeout(timer); map.off("idle", go); };
  }, [map]);
}

// Pendant la visite, ← → Échap sont à elle : l'Échap ne ferme pas aussi la fiche.
export function useTourKeys(open: boolean, step: number, next: () => void) {
  useEffect(() => {
    if (!open) return;
    const keys = (e: KeyboardEvent) => {
      const tour = useTourStore.getState();
      if (e.key === "Escape") tour.closeTour();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") tour.goTo(Math.max(0, step - 1));
      else return;
      e.preventDefault(); e.stopPropagation();
    };
    addEventListener("keydown", keys, true);
    return () => removeEventListener("keydown", keys, true);
  }, [open, step, next]);
}

// Précédent / Suivant ferment la visite, avant que l'adresse n'ouvre sa fiche : à la capture, et sa fermeture
// (onglet, fiche) appliquée tout de suite, sinon elle refermerait la fiche que l'adresse vient d'ouvrir.
export function useCloseOnHistory(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const close = () => flushSync(() => useTourStore.getState().closeTour());
    addEventListener("popstate", close, true);
    return () => removeEventListener("popstate", close, true);
  }, [open]);
}
