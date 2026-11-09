// La légende, au pied du panneau sous les sources (sur téléphone, dans les filtres dépliés) : une section pliable comme
// elles, son contenu sur une colonne. Dépliée à chaque chargement : on lit la carte avec elle.
import { useEffect, useRef, useState } from "react";
import { Collapsible } from "../../../components/Collapsible";
import { REDUCED_MOTION } from "../../../utils/screen";
import { LegendBody } from "./LegendBody";

export function Legend() {
  const [open, setOpen] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const unfolded = useRef(false);   // dépliée par le visiteur (pas au chargement)

  // Au pied du panneau, elle se déplierait sous son bord : une fois dépliée, le panneau défile jusqu'à elle.
  useEffect(() => {
    const b = box.current;
    if (!open || !unfolded.current || !b) return;
    unfolded.current = false;
    Promise.all(b.getAnimations({ subtree: true }).map((a) => a.finished))
      .then(() => b.scrollIntoView({ block: "nearest", behavior: REDUCED_MOTION ? "auto" : "smooth" }), () => { /* repliée en route */ });
  }, [open]);

  return (
    <div ref={box} className="mt-1">
      <Collapsible summary="Légende" open={open} onToggle={(o) => { unfolded.current = o; setOpen(o); }}
        summaryClassName="cursor-pointer text-primary">
        <LegendBody />
      </Collapsible>
    </div>
  );
}
