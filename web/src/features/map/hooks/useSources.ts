// Les sources de la carte suivent l'état : chaque effet n'écoute que ce dont sa source dépend.
import { useEffect } from "react";
import type { Map as MapLibre } from "maplibre-gl";
import { highlightedMembers, visibleMembers } from "../../../stores/selectors";
import { useAppStore } from "../../../stores/appStore";
import { useNearbyStore } from "../../../stores/nearbyStore";
import { CLUSTER_ZOOMS, bubbleSource, clusterSource } from "../lib/layers";
import { BUBBLE_LEVELS } from "../../../data/placement";
import { bubbles, chosenName, clusters, members, ring, setData, townNames, you } from "../lib/sources";

export function useSources(map: MapLibre | null) {
  const here = useNearbyStore((state) => state.here);
  const visible = useAppStore(visibleMembers), lit = useAppStore((state) => highlightedMembers(state, here));
  const selection = useAppStore((state) => state.selection), backTo = useAppStore((state) => state.backTo);

  // les points, les grappes et les bulles : visibles, mis en avant ou éteints
  useEffect(() => {
    if (!map) return;
    setData(map, "members", members(visible, lit));
    CLUSTER_ZOOMS.forEach((z, i) => setData(map, clusterSource(z), clusters(i, visible, lit)));
    for (const n of BUBBLE_LEVELS) setData(map, bubbleSource(n), bubbles(n, visible, lit));
  }, [map, visible, lit]);
  useEffect(() => { if (map) setData(map, "towns", townNames(visible)); }, [map, visible]);
  useEffect(() => {
    if (!map) return;
    setData(map, "ring", ring(selection));
    setData(map, "chosen", chosenName(selection));
  }, [map, selection]);
  useEffect(() => { if (map) setData(map, "you", you(selection, backTo, here)); }, [map, selection, backTo, here]);
}
