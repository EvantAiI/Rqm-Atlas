// Revenir à un carrefour (« ← … ») le retrouve défilé là où on l'a laissé : la fiche et ses listes qui défilent.
// Toute autre ouverture part du haut.
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { isCrossroads, type Selection } from "../../../stores/selection";

// le cadre de la fiche et les listes qui défilent dedans
const scrolling = (f: HTMLElement | null) => (f ? [f, ...f.querySelectorAll<HTMLElement>("[data-scroll]")] : []);

export function useScrollMemory(selection: Selection | null, frame: RefObject<HTMLElement | null>) {
  // par objet : « ← retour » rouvre le même objet, une nouvelle recherche en crée un autre
  const memory = useRef(new WeakMap<Selection, number[]>());

  useLayoutEffect(() => {
    const saved = (selection && memory.current.get(selection)) || [];
    const restore = () => scrolling(frame.current).forEach((e, i) => { e.scrollTop = saved[i] || 0; });
    restore();
    // et une image plus tard : les listes ajoutent alors leur ligne « La liste continue », qui allonge la fiche
    const again = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(again);
  }, [selection, frame]);

  useEffect(() => {
    const f = frame.current;
    if (!f || !selection || !isCrossroads(selection)) return;
    const save = () => memory.current.set(selection, scrolling(f).map((e) => e.scrollTop));
    f.addEventListener("scroll", save, true);   // capture : les listes intérieures aussi
    return () => f.removeEventListener("scroll", save, true);
  }, [selection, frame]);
}
