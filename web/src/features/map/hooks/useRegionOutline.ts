// Une fiche de région : son contour et un fond léger sur la carte. Les contours (generated/regionOutlines.json, écrit au build) ne se
// chargent qu'à la première fiche de région.
import { useEffect } from "react";
import type { Map as MapLibre } from "maplibre-gl";
import type { Position } from "geojson";
import { useAppStore } from "../../../stores/appStore";
import { setData } from "../lib/sources";

type Outlines = Record<string, Position[][][]>;
let outlines: Promise<Outlines> | null = null;
// un échec (hors ligne) : pas de contour, et la prochaine fiche de région réessaie
const loadOutlines = () => (outlines ??= import("../../../../generated/regionOutlines.json").then((m): Outlines => m.default)
  .catch((): Outlines => { outlines = null; return {}; }));

export function useRegionOutline(map: MapLibre | null) {
  const region = useAppStore((state) => (state.selection?.type === "region" ? state.selection.id : null));
  useEffect(() => {
    if (!map) return;
    let live = true;
    setData(map, "region", { type: "FeatureCollection", features: [] });
    if (region) void loadOutlines().then((all) => {
      if (live && all[region]) setData(map, "region", { type: "FeatureCollection",
        features: [{ type: "Feature", geometry: { type: "MultiPolygon", coordinates: all[region] }, properties: {} }] });
    });
    return () => { live = false; };
  }, [map, region]);
}
