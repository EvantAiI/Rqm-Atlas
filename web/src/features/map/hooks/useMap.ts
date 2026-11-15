// La carte MapLibre, créée une fois : fond, contrôles, images, sources et couches. Rendue quand le style est chargé.
import { useEffect, useRef, useState } from "react";
import { AttributionControl, Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
// MapLibre 6 cherche son worker à côté de son propre fichier, que le build fond dans un morceau : il est construit à part
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { MOBILE } from "../../../utils/screen";
import { SYLLABIC_GLYPHS, Z_MAX, baseStyle, registerTileProtocols } from "../lib/baseStyle";
import { overview } from "../lib/framing";
import { maxBounds } from "../lib/bounds";
import { addFixedImages, drawBubble } from "../lib/images";
import { BOTTOM_DOTS, SOURCES, layers } from "../lib/layers";

import { useMapStore } from "../../../stores/mapStore";

const EMBEDDED = window.self !== window.top;   // intégrée dans une autre page : la molette fait d'abord défiler celle-ci
const LOCALE = {
  "Map.Title": "Carte du réseau", "NavigationControl.ZoomIn": "Zoom avant", "NavigationControl.ZoomOut": "Zoom arrière",
  "AttributionControl.ToggleAttribution": "Sources du fond de carte",
  "CooperativeGesturesHandler.WindowsHelpText": "Ctrl + molette pour zoomer la carte",
  "CooperativeGesturesHandler.MacHelpText": "⌘ + molette pour zoomer la carte",
  "CooperativeGesturesHandler.MobileHelpText": "Deux doigts pour déplacer la carte",
};
// les régions (leurs contours, et la région de chaque membre) : le découpage officiel, sous CC BY 4.0
const CREDITS = 'Villes : <a href="https://www.geonames.org" target="_blank" rel="noopener">GeoNames</a> et <a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a> · Régions : <a href="https://www.donneesquebec.ca" target="_blank" rel="noopener">Données Québec</a> · <a href="https://maplibre.org" target="_blank" rel="noopener">MapLibre</a>';

// Rend [le conteneur à poser, la place du bouton « Tout le réseau » dans les contrôles] ; la carte prête va dans useMapStore.
export function useMap() {
  const container = useRef<HTMLDivElement>(null);
  const [homeSlot, setHomeSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const base = new URL(".", location.href).href;
    registerTileProtocols(base);
    setWorkerUrl(workerUrl);
    const m = new MapLibreMap({
      container: container.current!, style: baseStyle(base), center: [-68.5, 48.4], zoom: 5,
      minZoom: 3.5, maxZoom: Z_MAX, maxBounds: maxBounds(5), renderWorldCopies: false,
      dragRotate: false, pitchWithRotate: false, touchPitch: false, attributionControl: false, cooperativeGestures: EMBEDDED, locale: LOCALE,
      // MapLibre 6 n'agrandit plus les tuiles qu'aux 4 derniers zooms : undefined garde le comportement de la 5
      // (placement des noms du fond, résultats de queryRenderedFeatures)
      zoomLevelsToOverscale: undefined,
    });
    m.touchZoomRotate.disableRotation();
    m.keyboard.disableRotation();
    // sur ordinateur, contre le panneau : la fiche s'ouvre à droite sans jamais les couvrir ni les déplacer
    const corner = MOBILE ? "bottom-right" : "top-left";
    m.addControl(new NavigationControl({ showCompass: false }), corner);
    m.addControl({
      onAdd() { const d = document.createElement("div"); d.className = "maplibregl-ctrl maplibregl-ctrl-group"; setHomeSlot(d); return d; },
      onRemove() { setHomeSlot(null); },
    }, corner);
    const credits = new AttributionControl({ compact: true, customAttribution: CREDITS });
    m.addControl(credits, "bottom-right");
    if (MOBILE) credits._updateCompactMinimize();   // téléphone : repliées dès l'ouverture, elles couvriraient Montréal
    // une bulle se dessine la première fois que la carte la demande (son nom dit sa composition)
    m.setMissingStyleImageResolver((id) => { if (id.startsWith("bubble:")) drawBubble(m, id); });
    m.on("load", () => {
      addFixedImages(m);
      for (const id of SOURCES) m.addSource(id, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      for (const c of layers()) m.addLayer(c);
      // les noms de lieux du fond passent au-dessus des traits (qu'aucune collision ne voit), sous les points : placés
      // après eux, ils leur cèdent toujours la place
      for (const id of ["places_subplace", "places_locality"]) for (const c of [id, `${id}-detail`]) m.moveLayer(c, BOTTOM_DOTS);
      useMapStore.setState({ map: m });
    });
    // la carte complète, les lettres du syllabique en dernier, dans le cache du navigateur : prêtes pour le Nord
    // (baseStyle.ts)
    m.once("idle", () => { for (const path of SYLLABIC_GLYPHS) fetch(`${base}${path}`).catch(() => {}); });
    overview(m, 0);
    return () => { useMapStore.setState({ map: null }); m.remove(); };
  }, []);
  return [container, homeSlot] as const;
}
