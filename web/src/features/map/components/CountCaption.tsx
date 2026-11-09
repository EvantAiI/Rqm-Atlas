// Sous la carte, une ligne qui dit ce que comptent les chiffres des bulles : ils changent avec l'onglet et la fiche ouverte.
import { useAppStore } from "../../../stores/appStore";
import { countCaption } from "../lib/counts";
import { useSheetHeight } from "../hooks/useSheetHeight";

export function CountCaption() {
  const selection = useAppStore((state) => state.selection), tab = useAppStore((state) => state.tab);
  const above = useSheetHeight(selection !== null);   // téléphone : posée sur la feuille, pas dessous
  return (
    <p style={above ? { bottom: above + 10 } : undefined}
      className="pointer-events-none absolute bottom-2.5 left-[326px] z-[2] m-0 rounded-[3px] bg-white/80 px-1.5 text-[12px] leading-5 text-ink-strong phone:left-2.5">
      {countCaption(selection, tab)}
    </p>
  );
}
