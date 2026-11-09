// Le fond de carte : tuiles vectorielles OpenStreetMap (Protomaps) servies avec la page, aucune requête vers un tiers.
import { addProtocol, type LayerSpecification, type StyleSpecification, type VectorSourceSpecification } from "maplibre-gl";
import { municipality } from "../../../data/regions";
import { cssColour } from "../../../utils/screen";
import { TOWNS } from "../../../data/placement";
import { BASE_SOUTH, DETAILED_SOUTH, SOUTH_MAX_ZOOM, tileNorth } from "./bounds";
import coverage from "../../../../generated/coverage.json";
import basemapStyle from "../../../../generated/basemapStyle.json";

export const Z_MAX = 15;

const EMPTY = { data: new ArrayBuffer(0) };
const fetchTile = async (base: string, z: number, x: number, y: number, signal: AbortSignal) =>
  ({ data: await (await fetch(`${base}basemap/tiles/${z}/${x}/${y}.pbf`, { signal })).arrayBuffer() });
const tileOf = (url: string) => url.slice(url.indexOf("://") + 3).split("/").map(Number);

// Les tuiles du fond n'existent pas partout, et une tuile absente serait une erreur 404 : le protocole rend une tuile vide
// sans requête là où le fond n'en a pas.
// - « basemap » : au sud de 43° N, seulement jusqu'au zoom 6 (collected/basemap-south.pmtiles) ;
// - « detail » : au-delà du zoom coverage.z, seulement autour des membres (collectors/basemap/make.sh), le fond
//   moins détaillé agrandi restant visible dessous.
export function registerTileProtocols(base: string) {
  addProtocol("basemap", async ({ url }, abort) => {
    const [z, x, y] = tileOf(url);
    return z > SOUTH_MAX_ZOOM && tileNorth(z, y) <= DETAILED_SOUTH ? EMPTY : fetchTile(base, z, x, y, abort.signal);
  });
  const zCover = coverage.z, covered = new Set(coverage.tiles);
  addProtocol("detail", async ({ url }, abort) => {
    const [z, x, y] = tileOf(url), d = z - zCover;
    return covered.has(`${x >> d}/${y >> d}`) ? fetchTile(base, z, x, y, abort.signal) : EMPTY;
  });
}

// Le style du fond (generated/basemapStyle.json), ses chemins rendus absolus (MapLibre les veut ainsi), une seconde source « detail » aux
// mêmes couches peinte par-dessus, et les noms de lieux adaptés aux villes du réseau.
export function baseStyle(base: string): StyleSpecification {
  const style = structuredClone(basemapStyle as unknown as StyleSpecification), protomaps = style.sources.protomaps as VectorSourceSpecification;
  protomaps.tiles = ["basemap://{z}/{x}/{y}"];
  protomaps.bounds = [protomaps.bounds![0], BASE_SOUTH, protomaps.bounds![2], protomaps.bounds![3]];
  style.glyphs = `${base}basemap/fonts/{fontstack}/{range}.pbf`;
  style.sprite = `${base}basemap/sprites/light`;
  // une ville d'au moins deux membres a déjà son nom, au-dessus de ses points : le fond ne la nomme pas
  const named = TOWNS.filter((town) => town.ids.length > 1).map((town) => municipality(town.name));
  for (const c of style.layers as (LayerSpecification & { filter?: unknown; paint?: object })[]) {
    if (c.id === "places_locality") c.filter = ["all", ["==", ["get", "kind"], "locality"], ["!", ["in", ["get", "name"], ["literal", named]]]];
    if (["places_locality", "places_region", "places_subplace"].includes(c.id)) c.paint = { ...c.paint, "text-color": cssColour("--color-ink-muted") };
  }
  const zCover = coverage.z;
  style.sources.detail = { ...protomaps, tiles: ["detail://{z}/{x}/{y}"], minzoom: zCover, maxzoom: Z_MAX };
  style.layers.push(...style.layers.filter((c) => "source" in c && c.source === "protomaps")
    .map((c) => ({ ...c, id: `${c.id}-detail`, source: "detail", minzoom: Math.max(c.minzoom || 0, zCover) }) as LayerSpecification));
  return style;
}
