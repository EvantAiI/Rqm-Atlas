// Le placement calculé au build (scripts/precompute.ts -> generated/placement.json), tel que la page s'en sert.
import { fromPixels, bubbleRadius, toPixels } from "../../lib/geometry";
import { municipality } from "../regions";
import { getOrCreate } from "../../lib/collections";
import { NOTCHES, LABEL_EM, BUBBLE_LEVELS, DOT_RADIUS, DOT_ZOOM, type Bubble, type Cluster, type Placement, type Town } from "./compute";
import type { LabelHeights } from "./labelHeights";
import { ORG_BY_ID } from "../dataset";
import placement from "../../../generated/placement.json";

export * from "./compute";

const PRECOMPUTED = placement as unknown as Placement & { labelHeights: LabelHeights };

export const PLACED_MEMBERS = PRECOMPUTED.placed.map((id) => ORG_BY_ID.get(id)!);
export const POSITION = new Map(PLACED_MEMBERS.map((o) => [o.id, [o.lon!, o.lat!] as [number, number]]));
export const CLUSTERS: Cluster[][] = PRECOMPUTED.clusters;
export const CLUSTER_OF = new Map(Object.entries(PRECOMPUTED.clusterOf));
export const OFFSETS = new Map(Object.entries(PRECOMPUTED.offsets));
export const TOWNS: Town[] = PRECOMPUTED.towns;
export const TOWN_BY_NAME = new Map(TOWNS.map((town) => [town.name, town]));
export const BUBBLES = new Map<number, Bubble[]>(BUBBLE_LEVELS.map((n, i) => [n, PRECOMPUTED.bubbles[i]]));
export const LABEL_HEIGHTS = PRECOMPUTED.labelHeights;   // la vue par défaut, tout le monde visible
export const BUBBLE_OF = new Map(BUBBLE_LEVELS.map((n) => [n, new Map(BUBBLES.get(n)!.flatMap((g) => g.ids.map((id) => [id, g] as const)))]));

export const MUNICIPALITIES = new Map<string, Town>();
for (const town of [...TOWNS].sort((a, b) => b.ids.length - a.ids.length)) {   // sa position : le quartier qui a le plus de membres
  const name = municipality(town.name);
  getOrCreate(MUNICIPALITIES, name, () => ({ name, ids: [], lon: town.lon, lat: town.lat })).ids.push(...town.ids);
}

// Le niveau de bulle d'un zoom (sous DOT_ZOOM).
export const bubbleLevel = (zoom: number) => Math.min(BUBBLE_LEVELS[BUBBLE_LEVELS.length - 1], Math.max(BUBBLE_LEVELS[0], Math.floor(zoom)));
export const notchOf = (zoom: number) => Math.min(NOTCHES.length - 1, Math.max(0, Math.floor(zoom) - NOTCHES[0]));
export const isDot = (id: string, zoom: number) => CLUSTER_OF.get(id)![notchOf(zoom)] === -1;   // dessiné en point (hors grappe) à ce zoom
export const dotPerNotch = (id: string) => CLUSTER_OF.get(id)!.map((k) => (k === -1 ? 1 : 0));
// Le nom du membre choisi, par cran : au-dessus de son point, ou de la grappe qui le tient (en em).
export const nameOffsets = (id: string) => OFFSETS.get(id)!.map(([x, y], i) => {
  const k = CLUSTER_OF.get(id)![i];
  return [x / LABEL_EM, (y - (k === -1 ? DOT_RADIUS + 6 : bubbleRadius(CLUSTERS[i][k].ids.length) + 5)) / LABEL_EM];
});
// Le zoom où un membre quitte toute grappe et devient son propre point.
export const dotZoom = (id: string) => (CLUSTER_OF.has(id) ? NOTCHES[Math.max(0, CLUSTER_OF.get(id)!.indexOf(-1))] + 0.3 : DOT_ZOOM + 1);
// Le décalage d'un membre à tout zoom, interpolé entre deux crans (la bulle de survol).
export function offsetAt(id: string, zoom: number): [number, number] {
  const d = OFFSETS.get(id)!, i = NOTCHES.findIndex((z) => z >= zoom);
  if (i === 0) return d[0];
  if (i === -1) return d[d.length - 1];
  const t = (zoom - NOTCHES[i - 1]) / (NOTCHES[i] - NOTCHES[i - 1]);
  return [d[i - 1][0] + t * (d[i][0] - d[i - 1][0]), d[i - 1][1] + t * (d[i][1] - d[i - 1][1])];
}
// Où un membre est dessiné au zoom z ([lon, lat]), pour y accrocher les arcs : sous DOT_ZOOM le centre de sa bulle ;
// au-dessus, le centre de sa grappe, ou sa vraie place décalée (MapLibre évalue icon-offset au zoom entier).
export function drawnAt(id: string, z: number): [number, number] {
  if (z < DOT_ZOOM) return BUBBLE_OF.get(bubbleLevel(z))!.get(id)!.center;
  const k = CLUSTER_OF.get(id)![notchOf(z)];
  if (k !== -1) return CLUSTERS[notchOf(z)][k].center;
  const [lon, lat] = POSITION.get(id)!, p = toPixels(lat, lon, z), [dx, dy] = offsetAt(id, Math.floor(z));
  return fromPixels(p.x + dx, p.y + dy, z);
}
