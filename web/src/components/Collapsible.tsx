// Une section qui se plie et se déplie en glissant plutôt que d'un coup. Elle reste un <details> (clavier et lecteurs
// d'écran le connaissent) ; son contenu n'est rendu qu'ouvert ou en mouvement : une longue liste pliée ne coûte rien.
import { useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { REDUCED_MOTION } from "../utils/screen";

interface Props {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;                        // imposé du dehors, avec onToggle
  onToggle?: (open: boolean) => void;
  className?: string;
  summaryClassName?: string;
}

export function Collapsible({ summary, children, defaultOpen = false, open: controlled, onToggle, className = "", summaryClassName = "" }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  // le mouvement en cours : sa hauteur de départ (un objet neuf à chaque clic) ; null : immobile
  const [move, setMove] = useState<{ from: number } | null>(null);
  const open = controlled ?? internalOpen;

  const toggle = (e: MouseEvent) => {
    e.preventDefault();
    // un clic pendant le mouvement le renverse, depuis la hauteur où il en est
    if (!REDUCED_MOTION) setMove({ from: ref.current!.getBoundingClientRect().height });
    setInternalOpen(!open);
    onToggle?.(!open);
  };

  useLayoutEffect(() => {
    const d = ref.current;
    if (!move || !d) return;
    const startHeight = move.from;
    d.open = open;
    const endHeight = d.offsetHeight;   // mesurée dans son état final, puis ouverte le temps du mouvement
    d.open = true;
    // sous le bas de son cadre qui défile, le mouvement ne se voit pas : il s'arrête au bord visible
    // (sinon une longue liste jaillirait d'un coup)
    const frame = d.parentElement?.closest("[data-zone]");
    const edge = frame ? frame.getBoundingClientRect().bottom - d.getBoundingClientRect().top : Infinity;
    const visible = (h: number) => Math.min(h, Math.max(edge, Math.min(startHeight, endHeight)));
    d.style.overflow = "hidden";
    const animation = d.animate({ height: [`${visible(startHeight)}px`, `${visible(endHeight)}px`] }, { duration: 220, easing: "ease-out" });
    animation.onfinish = () => { d.style.overflow = ""; setMove(null); };
    return () => animation.cancel();
  }, [move, open]);   // un mouvement par clic : move ne change qu'au clic

  return (
    <details ref={ref} open={open || move !== null} className={className}>
      <summary onClick={toggle} className={summaryClassName}>{summary}</summary>
      {(open || move !== null) && children}
    </details>
  );
}
