// La page : la carte, et par-dessus le panneau (recherche, filtres, légende) et la fiche ouverte.
// Chaque partie tient sa zone d'écran et la marque d'un data-zone, que la carte lit pour garder la sélection visible :
// data-zone="panel" (le panneau de gauche, ou la barre du haut sur téléphone), "sheet" (la fiche ouverte).
// Dans le DOM, le panneau vient d'abord (l'ordre du clavier) et la carte en dernier ; à l'écran, les z-index les
// posent sur elle. La carte (MapLibre, ≈ 1 Mo) se charge à part : le panneau s'affiche sans l'attendre, sur le même
// fond.
import { NetworkMap } from "./features/map";
import { Panel } from "./features/panel";
import { Sheet } from "./features/sheets";
import { HelpBubble } from "./features/help";
import { Tour } from "./features/tour";
import { useAddressSync } from "./hooks/useAddressSync";

export function App() {
  useAddressSync();
  return (
    <main className="relative h-full overflow-hidden">
      <Panel />
      <Sheet />
      <NetworkMap />
      <HelpBubble />
      <Tour />
    </main>
  );
}
