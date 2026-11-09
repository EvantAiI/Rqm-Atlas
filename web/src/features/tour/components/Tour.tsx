// « Comment ça marche ? » : au premier passage (puis par le « ? » du panneau), la page s'assombrit et chaque étape
// éclaire un élément. ← → pour avancer, Échap pour sortir.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Organisation } from "../../../data/types";
import { useTourStore } from "../../../stores/tourStore";
import { STEPS } from "../lib/steps";
import { findDemo } from "../lib/demo";
import { useCloseOnHistory, useFirstVisit, useTourKeys } from "../hooks/useTourControls";
import { useTourSession, useTourStep } from "../hooks/useTourSession";
import { TourDialog } from "./TourDialog";

export function Tour() {
  const step = useTourStore((state) => state.step), open = step >= 0;
  const [demo, setDemo] = useState<Organisation | null>(null);
  const tryItRef = useRef(false);   // « Essayer » : la visite se ferme sur « Près de chez moi »

  useFirstVisit();
  useEffect(() => {   // la bulle attend l'exemple : la position, si elle est permise, arrive en moins de 4 s
    if (!open) return;
    let live = true;
    findDemo().then((d) => { if (live) setDemo(d); });
    return () => { live = false; setDemo(null); };
  }, [open]);
  useTourSession(open, tryItRef);
  useTourStep(step, demo);
  const next = useCallback(() => {
    if (step < STEPS.length - 1) { useTourStore.getState().goTo(step + 1); return; }
    tryItRef.current = Boolean(STEPS[step].end);
    useTourStore.getState().closeTour();
  }, [step]);
  useTourKeys(open, step, next);
  useCloseOnHistory(open);

  if (!open || !demo) return null;
  return <TourDialog step={step} demo={demo} onNext={next} onSkip={() => useTourStore.getState().closeTour()} />;
}
