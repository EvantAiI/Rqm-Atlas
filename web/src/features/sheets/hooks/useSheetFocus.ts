// Le focus suit la fiche : sur son titre à chaque ouverture, rendu à ce qui l'a ouverte à la fermeture.
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { Selection } from "../../../stores/selection";

export function useSheetFocus(selection: Selection | null, frame: RefObject<HTMLElement | null>, title: RefObject<HTMLElement | null>) {
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!selection) return;
    // ouverte depuis la fiche elle-même : on garde le premier ouvreur (le bouton cliqué a pu disparaître : body)
    const a = document.activeElement;
    if (a instanceof HTMLElement && a !== document.body && !frame.current?.contains(a)) opener.current = a;
    title.current?.focus({ preventScroll: true });
  }, [selection, frame, title]);   // une fois par ouverture (les refs ne changent pas)

  const wasOpen = useRef(false);
  useEffect(() => {
    if (selection) { wasOpen.current = true; return; }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    let target = opener.current;
    opener.current = null;
    // après les rendus du panneau : sa liste redessinée, on y retrouve le même projet ou la même organisation
    const t = setTimeout(() => {
      if (target && !target.isConnected) {
        const { project, org } = target.dataset;
        const key = project ? `[data-project="${CSS.escape(project)}"]` : org ? `[data-org="${CSS.escape(org)}"]` : null;
        target = key ? document.querySelector<HTMLElement>(`[data-zone="panel"] ${key}`) : null;
      }
      if (target?.isConnected && !target.closest("[hidden]")) target.focus({ preventScroll: true });
    });
    return () => clearTimeout(t);
  }, [selection]);
}
