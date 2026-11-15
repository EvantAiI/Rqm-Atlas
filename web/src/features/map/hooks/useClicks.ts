// Un clic sur la carte : un point ouvre sa fiche, une bulle ou une grappe la fiche de sa ville en zoomant sur elle, un
// trait ouvre son lien, un rayon la fiche de ce qu'il relie à sa gare, une gare la fiche de sa ville.
// Le vide ne ferme rien : un clic pour fermer une bulle d'aide, ou un doigt qui manque un trait, ne perd pas la fiche
// (✕ et Échap la ferment).
import { useEffect } from "react";
import type { Map as MapLibre, MapMouseEvent } from "maplibre-gl";
import { useAppStore } from "../../../stores/appStore";
import { TOUCH_SLOP, targetAt } from "../lib/targets";

// un clic venu du doigt (le clic est un PointerEvent dans les navigateurs récents)
const isTouch = (e: MouseEvent) => "pointerType" in e && e.pointerType === "touch";

export function useClicks(map: MapLibre | null) {
  useEffect(() => {
    if (!map) return;
    const onClick = (e: MapMouseEvent) => {
      const app = useAppStore.getState();
      const { point: f, link: t } = targetAt(map, e.point, isTouch(e.originalEvent) ? TOUCH_SLOP : 0);
      if (t?.link) app.open(t.link);
      else if (t?.town) app.open({ type: "town", id: t.town });
      else if (t?.open) { if (t.open.length === 1) app.open({ type: "member", id: t.open[0] }); else app.openGroup(t.open); }
      else if (!f) return;
      else if (!f.ids) app.open({ type: "member", id: f.id! });
      else if (f.n === 1) app.open({ type: "member", id: f.ids[0] });
      else app.openGroup(f.ids);
    };
    map.on("click", onClick);
    return () => { map.off("click", onClick); };
  }, [map]);
}
