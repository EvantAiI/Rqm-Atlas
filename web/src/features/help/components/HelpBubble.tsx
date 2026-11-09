// Une seule bulle d'aide pour toute la page, posée sous son « ? » (au-dessus s'il est trop bas). Épinglée par un clic,
// elle se ferme au clic ailleurs, à Échap ou au défilement ; sinon elle suit le survol (components/HelpButton.tsx).
import { useEffect, useLayoutEffect, useRef } from "react";
import { MOBILE } from "../../../utils/screen";
import { HELP_TIP_ID, useHelpStore } from "../store";

export function HelpBubble() {
  const tip = useHelpStore((state) => state.tip);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!tip || !el) return;
    el.style.left = "0px";   // mesurée à sa largeur naturelle, pas serrée contre le bord droit
    const r = tip.anchor.getBoundingClientRect(), l = el.getBoundingClientRect();
    // sur ordinateur, le « ? » d'un panneau ouvre sa bulle à côté du panneau : elle ne cache pas ce qu'elle explique
    const p = !MOBILE && tip.anchor.closest('[data-zone="panel"], [data-zone="sheet"]')?.getBoundingClientRect();
    if (p) {
      el.style.left = `${p.left < innerWidth / 2 ? p.right + 8 : p.left - 8 - l.width}px`;
      el.style.top = `${Math.max(8, Math.min(r.top - 8, innerHeight - l.height - 8))}px`;
      return;
    }
    el.style.left = `${Math.max(8, Math.min(r.left + r.width / 2 - l.width / 2, innerWidth - l.width - 8))}px`;
    el.style.top = `${r.bottom + 6 + l.height > innerHeight - 8 ? r.top - 6 - l.height : r.bottom + 6}px`;
  }, [tip]);

  useEffect(() => {
    if (!tip) return;
    // à la capture : un clic qu'un autre élément arrête ferme quand même la bulle
    const onClick = (e: MouseEvent) => { if (tip.pinned && !(e.target as Element).closest?.("[data-help]")) useHelpStore.getState().hide(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { useHelpStore.getState().hide(); e.stopPropagation(); } };   // l'Échap ne ferme pas aussi la fiche
    const onScroll = () => useHelpStore.getState().hide();
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [tip]);

  if (!tip) return null;
  return (
    <div ref={ref} id={HELP_TIP_ID} role="tooltip"
      className="pointer-events-none fixed top-0 z-[1500] max-w-[280px] whitespace-pre-line rounded bg-ink-strong px-2.5 py-2 text-[12px] leading-[1.45] text-white shadow-[0_4px_12px_rgba(0,0,0,.2)]">
      {tip.text}
    </div>
  );
}
