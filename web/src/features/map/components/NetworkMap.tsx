// La carte du réseau : MapLibre et ses couches ; chaque hook tient un aspect (sources, arcs, survol, clics, cadrage,
// contour de région). Sous la carte, ce que comptent ses chiffres.
import { createPortal } from "react-dom";
import { useAppStore } from "../../../stores/appStore";
import { useMapStore } from "../../../stores/mapStore";
import { HomeButton } from "./HomeButton";
import { CountCaption } from "./CountCaption";
import { useClicks } from "../hooks/useClicks";
import { useFraming } from "../hooks/useFraming";
import { useLinks } from "../hooks/useLinks";
import { useMap } from "../hooks/useMap";
import { useRegionOutline } from "../hooks/useRegionOutline";
import { useSources } from "../hooks/useSources";
import { useTooltip } from "../hooks/useTooltip";
import "maplibre-gl/dist/maplibre-gl.css";
import "../../../styles/map.css";

export function NetworkMap() {
  const [container, homeSlot] = useMap(), map = useMapStore((state) => state.map);
  useSources(map);
  useLinks(map);
  useTooltip(map);
  useClicks(map);
  useFraming(map);
  useRegionOutline(map);
  const sheetOpen = useAppStore((state) => state.selection !== null);
  return (
    <>
      <div ref={container} className="map-root" data-sheet-open={sheetOpen || undefined}>
        {homeSlot && map && createPortal(<HomeButton map={map} />, homeSlot)}
      </div>
      <CountCaption />
    </>
  );
}
