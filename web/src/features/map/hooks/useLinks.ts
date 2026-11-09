// Les arcs de la carte : le plan suit l'état, la géométrie suit le zoom (au plus une fois par image pendant le geste).
import { useEffect } from "react";
import type { Map as MapLibre } from "maplibre-gl";
import { useShallow } from "zustand/react/shallow";
import { sheetProjects, visibleMembers } from "../../../stores/selectors";
import { getOrCreate } from "../../../lib/collections";
import { useAppStore } from "../../../stores/appStore";
import { drawKey, endsKey, geometry, plan, type LinkInput, type PlannedArc } from "../lib/links";
import { setData } from "../lib/sources";

export function useLinks(map: MapLibre | null) {
  const state = useAppStore(useShallow((app) => ({ selection: app.selection, showCollaborations: app.showCollaborations, tab: app.tab,
    memberAxis: app.memberAxis, memberMainOnly: app.memberMainOnly, projectFilters: app.projectFilters, sheetProjects: sheetProjects(app),
    visible: visibleMembers(app) })));
  useEffect(() => {
    if (!map) return;
    const input: LinkInput = state;
    // un plan par cran de dessin, gardé : un zoom qui va et vient pendant le geste ne replanifie pas
    const plans = new Map<string, PlannedArc[]>();
    let frame = 0, drawn: string | null = null;
    const draw = () => {
      const z = map.getZoom(), planned = getOrCreate(plans, drawKey(z), () => plan(input, z));
      const key = endsKey(planned, z);
      if (key === drawn) return;   // sous DOT_ZOOM ou vers des grappes, les bouts ne bougent pas : rien à renvoyer
      drawn = key;
      setData(map, "links", geometry(planned, z));
    };
    const onZoom = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); }); };
    draw();
    map.on("zoom", onZoom);
    map.on("zoomend", draw);
    return () => { map.off("zoom", onZoom); map.off("zoomend", draw); cancelAnimationFrame(frame); };
  }, [map, state]);
}
