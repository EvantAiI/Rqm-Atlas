// L'instance MapLibre, une fois la carte prête : la visite guidée la fait bouger. Posée par features/map (useMap).
import { create } from "zustand";
import type { Map as MapLibre } from "maplibre-gl";

export const useMapStore = create<{ map: MapLibre | null }>()(() => ({ map: null }));
