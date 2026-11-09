// Sous le zoom, « Tout le réseau » : la vue d'ensemble d'un clic.
import type { Map as MapLibre } from "maplibre-gl";
import { useAppStore } from "../../../stores/appStore";
import { overview } from "../lib/framing";

export function HomeButton({ map }: { map: MapLibre }) {
  return (
    <button type="button" className="home-button" title="Tout le réseau" aria-label="Revenir à tout le réseau"
            onClick={() => { useAppStore.getState().close(); overview(map, 700); }}>
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2.5 7.5 8 3l5.5 4.5M4 6.5V13h3v-3.5h2V13h3V6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
