// Ce que vise le pointeur : un point, une bulle, une grappe, ou à défaut un trait. Au doigt, une marge autour du geste :
// un trait fait 3 px, un point 14 px.
import type { MapGeoJSONFeature, Map as MapLibre, PointLike } from "maplibre-gl";
import { makeLink, type LinkSelection } from "../../../data/links";
import { isDot, offsetAt } from "../../../data/placement";
import { CLICKABLE } from "./layers";
import type { ArcLink, TooltipLine } from "./links";

type LngLat = [number, number];
export interface Target { key: string; coordinates: LngLat; id?: string; ids?: string[]; name?: string; others?: string; n: number; a: number }

type Pixel = { x: number; y: number };
export const TOUCH_SLOP = 20;   // px autour du doigt
const PALE_PENALTY = 12;        // px : un point pâle (hors de la fiche ou du filtre) ne l'emporte que nettement plus près
const around = ({ x, y }: Pixel, slop: number): PointLike | [PointLike, PointLike] =>
  (slop ? [[x - slop, y - slop], [x + slop, y + slop]] : [x, y]);

// La boîte d'un point (son image, 22 px) déborde du disque dessiné (10 px) : dans une pile, celle du voisin du dessus
// couvre le bord du point visé. On prend le point dessiné le plus près, un point vif plutôt qu'un pâle.
function under(map: MapLibre, at: Pixel, slop: number): Target | undefined {
  const z = Math.floor(map.getZoom());
  let best: MapGeoJSONFeature | undefined, bestDistance = Infinity;
  for (const f of map.queryRenderedFeatures(around(at, slop), { layers: CLICKABLE })) {
    const p = f.properties, isGroup = p.ids !== undefined;
    if (!isGroup && !isDot(p.id, z)) continue;
    const q = map.project((f.geometry as GeoJSON.Point).coordinates as LngLat), [dx, dy] = isGroup ? [0, 0] : offsetAt(p.id, z);
    const pale = isGroup ? p.a === 0 : p.dimmed === 1;
    const distance = Math.hypot(q.x + dx - at.x, q.y + dy - at.y) + (pale ? PALE_PENALTY : 0);
    if (distance < bestDistance) { best = f; bestDistance = distance; }
  }
  if (!best) return undefined;
  const { id, ids, name, others, n, a } = best.properties;
  return { key: `${best.layer.id}:${id ?? ids}:${a}`, coordinates: (best.geometry as GeoJSON.Point).coordinates as LngLat, id,
           ids: ids === undefined ? undefined : JSON.parse(ids), name, others, n, a };
}

export interface LinkTarget { key: string; text: TooltipLine[]; link?: LinkSelection }
function linkUnder(map: MapLibre, at: Pixel, slop: number): LinkTarget | undefined {
  const f = map.queryRenderedFeatures(around(at, slop), { layers: ["links-target"] })[0];
  if (!f) return undefined;
  const raw = f.properties.link ? JSON.parse(f.properties.link) as ArcLink & { ends: [LngLat, LngLat] } : undefined;
  return { key: `link:${f.properties.text}`, text: JSON.parse(f.properties.text),
           link: raw && makeLink(raw.from, raw.to, raw.projects, raw.ends, raw.colour) };
}

// Ce qui est sous le pointeur, exactement, puis (au doigt) dans la marge : un point avant un trait à chaque fois.
export function targetAt(map: MapLibre, at: Pixel, slop = 0): { point?: Target; link?: LinkTarget } {
  for (const r of slop ? [0, slop] : [0]) {
    const point = under(map, at, r);
    if (point) return { point };
    const link = linkUnder(map, at, r);
    if (link) return { link };
  }
  return {};
}
