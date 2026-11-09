// Un « ? » discret à côté d'une donnée : son explication au survol, ou épinglée par un clic (une touche sur téléphone).
import { useRef, type MouseEvent } from "react";
import { HELP_TIP_ID, useHelpStore } from "../store";

// label : ce que le « ? » explique, pour son nom accessible (« Aide : catégories de membres »)
export function HelpButton({ text, label }: { text: string; label: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  // ouvert : la bulle épinglée est la sienne (deux « ? » au même texte ne s'ouvrent pas ensemble)
  const open = useHelpStore((state) => Boolean(state.tip?.pinned && state.tip.anchor === ref.current));
  const shown = useHelpStore((state) => state.tip?.anchor === ref.current);   // la bulle montrée est la sienne : elle le décrit
  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); e.stopPropagation();   // un « ? » dans un label ou un résumé ne coche pas la case ni ne plie la section
    const help = useHelpStore.getState();
    if (open) help.hide(); else help.show(text, e.currentTarget, true);
  };
  return (
    <button ref={ref} type="button" data-help aria-label={`Aide : ${label}`} aria-expanded={open} aria-describedby={shown ? HELP_TIP_ID : undefined} onClick={toggle}
      onMouseEnter={(e) => { const help = useHelpStore.getState(); if (!help.tip?.pinned) help.show(text, e.currentTarget, false); }}
      onMouseLeave={() => useHelpStore.getState().hide(true)}
      className="relative ml-1 inline-flex size-[15px] flex-none items-center justify-center rounded-full border border-current p-0 align-[1px] text-[10px] font-bold leading-none normal-case tracking-normal text-ink-muted hover:text-primary aria-expanded:text-primary phone:after:absolute phone:after:-inset-3.5 phone:after:content-['']">
      ?
    </button>
  );
}
