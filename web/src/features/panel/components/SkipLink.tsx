// « Aller à la recherche » : le premier arrêt du clavier, visible seulement au focus. Sur téléphone, il déplie d'abord
// les filtres où vit le champ.
import type { MouseEvent, RefObject } from "react";
import { flushSync } from "react-dom";
import { useAppStore } from "../../../stores/appStore";

export function SkipLink({ target }: { target: RefObject<HTMLInputElement | null> }) {
  const go = (e: MouseEvent) => {
    e.preventDefault();   // pas de #… : l'adresse dit la vue partagée
    flushSync(() => useAppStore.getState().setFiltersOpen(true));
    target.current?.focus();
  };
  return (
    <a href="#recherche" onClick={go}
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[3] focus:rounded-panel focus:bg-surface focus:px-2 focus:py-1 focus:text-[13px]">
      Aller à la recherche
    </a>
  );
}
