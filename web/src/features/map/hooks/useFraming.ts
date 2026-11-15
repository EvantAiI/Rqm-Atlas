// La carte répond à chaque demande de cadrage du store (framing.seq), une fois la fiche rendue (ses marges en dépendent) :
// la sélection, une bulle ou une grappe cliquée, les membres de la vue filtrée, le lieu de « près de chez moi » et son
// membre, ou la vue d'ensemble.
import { useEffect } from "react";
import type { Map as MapLibre } from "maplibre-gl";
import { useAppStore } from "../../../stores/appStore";
import { useNearbyStore } from "../../../stores/nearbyStore";
import { viewMembers } from "../../../stores/selectors";
import { bound, frame, frameGroup, frameNearMe, frameView, overview } from "../lib/framing";
import { SOUTH_MAX_ZOOM } from "../lib/bounds";

export function useFraming(map: MapLibre | null) {
  const request = useAppStore((state) => state.framing), open = useAppStore((state) => state.selection !== null);

  useEffect(() => {
    if (!map || !request.seq) return;
    const app = useAppStore.getState(), s = app.selection;
    switch (request.kind) {
      case "filteredView": frameView(map, viewMembers(app), s !== null); break;
      case "nearMe": bound(map, true); frameNearMe(map, request.here, request.id); break;
      case "group": bound(map, true); frameGroup(map, request.ids); break;
      case "overview": overview(map, request.duration); break;
      case "selection":
        if (s) frame(map, s, { categories: app.categories, here: useNearbyStore.getState().here }, request.recenter, () => useAppStore.getState().selection === s);
    }
  }, [map, request]);
  useEffect(() => { if (map && !open) bound(map, false); }, [map, open]);
  // le fond au sud de 43° N n'existe qu'en vue d'ensemble : la borne suit le zoom, posée de nouveau au passage du seuil
  useEffect(() => {
    if (!map) return;
    let near = map.getZoom() >= SOUTH_MAX_ZOOM + 1;
    const rebound = () => {
      const now = map.getZoom() >= SOUTH_MAX_ZOOM + 1;
      if (now !== near) { near = now; bound(map, useAppStore.getState().selection !== null); }
    };
    map.on("zoom", rebound);
    return () => { map.off("zoom", rebound); };
  }, [map]);
}
