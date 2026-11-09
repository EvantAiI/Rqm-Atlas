// La visite à l'écran : la page assombrie, l'élément expliqué éclairé, la bulle de l'étape à côté.
import { useEffect, useLayoutEffect, useRef } from "react";
import type { Organisation } from "../../../data/types";
import { MOBILE } from "../../../utils/screen";
import { useTourStore } from "../../../stores/tourStore";
import { useAppStore } from "../../../stores/appStore";
import { STEPS } from "../lib/steps";
import { layoutTour } from "../lib/layout";
import { BUTTON, PRIMARY_BUTTON } from "../../../styles/classes";

interface Props { step: number; demo: Organisation; onNext(): void; onSkip(): void }

export function TourDialog({ step, demo, onNext, onSkip }: Props) {
  const phase = useTourStore((state) => state.phase), typing = useAppStore((state) => state.projectFilters.query);
  const sheet = useAppStore((state) => state.selection);   // une fiche qui s'ouvre réduit la carte (téléphone)
  const hole = useRef<HTMLDivElement>(null), bubble = useRef<HTMLDivElement>(null), next = useRef<HTMLButtonElement>(null);
  const s = STEPS[step], last = step === STEPS.length - 1;

  // le focus reste dans la bulle : les fiches que la visite ouvre le prendraient sinon (dialogue modal)
  useEffect(() => {
    let last: HTMLElement | null = next.current;
    last?.focus();
    const keep = (e: FocusEvent) => {
      if (bubble.current?.contains(e.target as Node)) last = e.target as HTMLElement;
      else last?.focus({ preventScroll: true });
    };
    // Tab et Maj+Tab tournent entre les boutons de la bulle, sans jamais en sortir
    const cycle = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !bubble.current) return;
      const buttons = [...bubble.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
      if (!buttons.length) return;
      const i = buttons.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      buttons[(i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    };
    document.addEventListener("focusin", keep);
    document.addEventListener("keydown", cycle, true);
    return () => { document.removeEventListener("focusin", keep); document.removeEventListener("keydown", cycle, true); };
  }, []);

  // La cible bouge : une lettre tapée allonge la liste, la carte se cadre, une fiche s'ouvre.
  // On replace tout de suite, à l'image suivante, puis après le cadrage (650 ms), et au redimensionnement.
  useLayoutEffect(() => {
    const place = () => {
      const h = hole.current, b = bubble.current;
      if (!h || !b) return;
      const r = s.target?.(demo, phase) ?? null, size = b.getBoundingClientRect();
      const l = layoutTour(r, size, Boolean(s.besidePanel), innerWidth, innerHeight, MOBILE);
      Object.assign(h.style, { left: `${l.hole.left}px`, top: `${l.hole.top}px`, width: `${l.hole.width}px`, height: `${l.hole.height}px` });
      Object.assign(b.style, { left: `${l.bubble.left}px`, top: `${l.bubble.top}px` });
    };
    place();
    const frame = requestAnimationFrame(place), timer = setTimeout(place, 650);
    addEventListener("resize", place);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); removeEventListener("resize", place); };
  }, [s, demo, phase, typing, sheet]);

  return (
    <>
      <div className="fixed inset-0 z-[2000]" />
      <div ref={hole} className="pointer-events-none fixed z-[2001] rounded-md shadow-[0_0_0_2px_#fff,0_0_0_9999px_rgba(20,24,28,.62)] transition-all duration-[350ms] ease-[ease] motion-reduce:transition-none" />
      <div ref={bubble} role="dialog" aria-modal="true" aria-labelledby="tour-title"
        className="fixed z-[2002] w-[340px] max-w-[calc(100%-32px)] rounded bg-surface px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,.25)] transition-[top,left] duration-[350ms] ease-[ease] motion-reduce:transition-none">
        <div aria-live="polite">
          <div className="text-[12px] text-ink-muted">{step + 1} sur {STEPS.length}</div>
          <h2 id="tour-title" className="mt-1 mb-2 text-[17px] font-semibold leading-[1.3] text-primary">{s.title}</h2>
          <p className="mb-4 whitespace-pre-line text-[14px] text-ink-strong">{s.text(demo)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={`${BUTTON} mr-auto`} onClick={onSkip}>Passer</button>
          <button type="button" className={BUTTON} aria-label="Étape précédente"
            disabled={step === 0} onClick={() => useTourStore.getState().goTo(step - 1)}>←</button>
          <button ref={next} type="button" className={PRIMARY_BUTTON} onClick={onNext}>
            {s.end || (last ? "Terminer" : "Suivant →")}
          </button>
        </div>
      </div>
    </>
  );
}
