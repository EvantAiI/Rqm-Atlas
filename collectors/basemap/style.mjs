// Écrit le style MapLibre du fond (collected/basemap-style.json) à partir de @protomaps/basemaps 5.7.2 :
// variante claire, noms en français, seulement les couches gardées dans basemap.pmtiles (make.sh).
//   node style.mjs <fichier de sortie>
// La page remplace à l'exécution les adresses des tuiles, des polices et des icônes par des adresses absolues.
import { layers, namedFlavor } from "@protomaps/basemaps";
import fs from "fs";
const KEPT = new Set(["earth", "water", "roads", "places", "boundaries"]);
const flavor = { ...namedFlavor("light"), background: "#f4f3ef", earth: "#f4f3ef", water: "#cbe0ea",
  ocean_label: "#4a7893", city_label: "#4f4f4f", city_label_halo: "#f4f3ef", subplace_label_halo: "#f4f3ef",
  state_label_halo: "#f4f3ef", country_label_halo: "#f4f3ef", highway_casing_early: "#dadada", highway_casing_late: "#dadada",
  major_casing_early: "#e2e2e2", major_casing_late: "#e2e2e2", boundaries: "#b4b4b4" };
const style = {
  version: 8,
  sources: { protomaps: { type: "vector", tiles: ["basemap/tiles/{z}/{x}/{y}.pbf"], minzoom: 0, maxzoom: 9,
    bounds: [-80, 43, -55, 63],
    attribution: "© <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\" rel=\"noopener\">OpenStreetMap</a> · <a href=\"https://protomaps.com\" target=\"_blank\" rel=\"noopener\">Protomaps</a>" } },
  glyphs: "basemap/fonts/{fontstack}/{range}.pbf",
  sprite: "basemap/sprites/light",
  layers: layers("protomaps", flavor, { lang: "fr" }).filter((l) => !l["source-layer"] || KEPT.has(l["source-layer"])),
};
fs.writeFileSync(process.argv[2], JSON.stringify(style));
console.log(style.layers.length, "layers");
