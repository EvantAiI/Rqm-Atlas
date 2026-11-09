// Une longue liste défile dans son cadre : les sections suivantes restent en vue sous elle. Tant qu'il en reste
// à voir, une ligne le dit ; au bout, elle s'efface mais garde sa place, sinon la feuille remonterait d'un cran. Défilée, un filet et un fondu marquent son bord haut : sans eux, une ligne coupée sous les
// puces d'axe se lit comme une puce en double. Sur téléphone la feuille entière défile : ni cadre ni ligne.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export function Scroller({ className = "", children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState<boolean | null>(null), [scrolled, setScrolled] = useState(false);   // null : la liste tient dans son cadre
  const measure = () => {
    const l = ref.current!, hidden = l.scrollHeight - l.clientHeight;
    setMore(hidden >= 4 ? hidden - l.scrollTop >= 4 : null); setScrolled(l.scrollTop > 0);
  };
  useLayoutEffect(measure);   // après chaque rendu : un filtre a pu raccourcir la liste
  return (
    <>
      <div ref={ref} data-scroll="" onScroll={measure}
        className={`max-h-[min(420px,45vh)] overflow-y-auto border-b border-line-strong phone:max-h-none phone:overflow-visible ${scrolled ? "border-t" : ""} ${className}`}>
        {scrolled && <div aria-hidden="true" className="pointer-events-none sticky top-0 z-[1] -mb-5 h-5 bg-linear-to-b from-surface to-transparent" />}
        {children}
      </div>
      {more !== null && <p className={`mt-1 text-[12px] text-primary phone:hidden ${more ? "" : "invisible"}`}>La liste continue : faites-la défiler ↓</p>}
    </>
  );
}
