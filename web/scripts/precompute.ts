// Étape de build, après tools/build_data.py : calcule où chaque membre est dessiné (grappes, décalages, bulles des
// villes) et l'écrit dans generated/placement.json, pour que le navigateur n'ait qu'à le lire. Allège aussi les
// contours des régions (generated/regionOutlines.json), que la carte lit à la première fiche de région.
import { readFileSync, writeFileSync } from "node:fs";
import { isOutsideQuebec } from "../src/data/regions";
import { computePlacement, type MemberSite } from "../src/data/placement/compute";
import { computeLabelHeights } from "../src/data/placement/labelHeights";
import { regionOutlines } from "./regionOutlines";
import type { Dataset } from "../src/data/types";

const DATA: Dataset = JSON.parse(readFileSync("generated/data.json", "utf8"));
const sites: MemberSite[] = DATA.organisations.filter((o) => o.category && o.lat !== undefined && o.lon !== undefined && !isOutsideQuebec(o))
  .map((o) => ({ id: o.id, lat: o.lat!, lon: o.lon!, town: o.town || "", category: o.category! }));
const start = performance.now();
const placement = computePlacement(sites), position = new Map(sites.map((o) => [o.id, o]));
// les hauteurs des noms de ville quand tout le monde est visible : la vue d'ouverture n'a rien à calculer
const labelHeights = computeLabelHeights(placement.towns, new Set(placement.placed), { place: (id) => position.get(id)!,
  clusterOf: (id) => placement.clusterOf[id], clusters: placement.clusters, offsets: (id) => placement.offsets[id] });
writeFileSync("generated/placement.json", JSON.stringify({ ...placement, labelHeights }));
console.log(`placement.json : ${sites.length} membres placés en ${Math.round(performance.now() - start)} ms`);

// le découpage officiel, relevé par collectors/regions.py
const outlines = JSON.stringify(regionOutlines(JSON.parse(readFileSync("../collected/regions.geojson", "utf8")).features));
writeFileSync("generated/regionOutlines.json", outlines);
console.log(`regionOutlines.json : ${Math.round(outlines.length / 1024)} Ko`);
