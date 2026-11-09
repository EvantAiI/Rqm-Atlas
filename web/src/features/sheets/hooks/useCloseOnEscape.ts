// Échap ferme la fiche, sauf dans un champ de recherche rempli (Échap l'y vide). Qui consomme Échap avant
// (une liste de suggestions) arrête sa propagation.
import { useEffect } from "react";
import { useAppStore } from "../../../stores/appStore";

export function useCloseOnEscape(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (e.target instanceof HTMLInputElement && e.target.type === "search" && e.target.value) return;
      useAppStore.getState().close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
}
