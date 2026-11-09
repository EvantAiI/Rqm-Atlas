// La fiche ouverte : le cadre seulement (en-tête collant, retour, focus, défilement, feuille basse sur téléphone).
// Son contenu dépend de ce qui est ouvert (SheetBody).
import { useRef, useState } from "react";
import { useAppStore } from "../../../stores/appStore";
import { useNearbyStore } from "../../../stores/nearbyStore";
import { MOBILE } from "../../../utils/screen";
import { REGION_LABEL, backLabel, sheetTitle } from "../lib/sheetTexts";
import { CopyLink } from "./CopyLink";
import { SheetBody } from "./SheetBody";
import { QUIET } from "../../../styles/classes";
import { useSheetFocus } from "../hooks/useSheetFocus";
import { useScrollMemory } from "../hooks/useScrollMemory";
import { useCloseOnEscape } from "../hooks/useCloseOnEscape";

const FRAME = "absolute top-4 right-4 z-[1001] w-[400px] max-h-[calc(100%-56px)] overflow-y-auto rounded-panel border border-line "
  + "bg-surface px-5 pt-4 pb-5 shadow-panel transition-[opacity,translate] duration-200 ease-out starting:translate-y-2 starting:opacity-0 "
  + "motion-reduce:transition-none phone:inset-x-0 phone:top-auto phone:bottom-0 phone:w-auto phone:rounded-t-lg "
  + "phone:rounded-b-none phone:border-x-0 phone:border-b-0 phone:px-4 phone:pt-3 phone:pb-4 "
  + "phone:shadow-[0_-4px_12px_rgba(0,0,0,.06)] phone:starting:translate-y-6";
const HEAD = "sticky -top-4 z-[2] -mx-5 -mt-4 mb-2 border-b border-line bg-surface px-5 pt-4 pb-2 "
  + "phone:-top-3 phone:-mx-4 phone:-mt-3 phone:px-4 phone:pt-3";
// au doigt, une cible plus haute que le dessin
const ICON = "absolute top-2 size-8 rounded-panel border-0 bg-transparent p-0 text-[17px] leading-none text-ink-muted hover:bg-background hover:text-primary "
  + "phone:after:absolute phone:after:inset-x-0 phone:after:-inset-y-1.5 phone:after:content-['']";

export function Sheet() {
  const selection = useAppStore((state) => state.selection), back = useAppStore((state) => state.backTo), here = useNearbyStore((state) => state.here);
  const frame = useRef<HTMLDivElement>(null), title = useRef<HTMLHeadingElement>(null);
  const [tall, setTall] = useState(false);   // téléphone : la feuille agrandie, d'une ouverture à l'autre
  useSheetFocus(selection, frame, title);
  useScrollMemory(selection, frame);
  useCloseOnEscape(Boolean(selection));
  if (!selection) return null;
  const backText = back && backLabel(back, here);
  return (
    <div ref={frame} data-zone="sheet" role="region" aria-label={REGION_LABEL[selection.type]}
      className={`${FRAME} ${tall ? "phone:max-h-[88%]" : "phone:max-h-[55%]"}`}>
      <div className={HEAD}>
        <button type="button" onClick={() => useAppStore.getState().close()} aria-label="Fermer la fiche" title="Fermer (Échap)"
          className={`${ICON} right-2`}>✕</button>
        {selection.type !== "nearby" && <CopyLink selection={selection} className={ICON} />}
        <h2 ref={title} tabIndex={-1} onClick={() => { if (MOBILE) setTall(!tall); }}
          className="m-0 pr-[72px] text-[17px] font-bold leading-[1.3] text-ink-strong phone:cursor-ns-resize">
          {sheetTitle(selection, here)}
        </h2>
        <hr className="mt-2 mb-3 h-0.5 w-[90px] border-0 bg-accent phone:hidden" />
      </div>
      <div key={`${selection.type}:${selection.id}`} className="text-[13px] leading-[1.45]">
        {backText && <button type="button" className={`${QUIET} mb-2 block`}
          onClick={() => useAppStore.getState().open(back, { recenter: true })}>{backText}</button>}
        <SheetBody selection={selection} />
      </div>
    </div>
  );
}
