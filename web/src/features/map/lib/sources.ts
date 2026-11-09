// Le GeoJSON de chaque source, fonction pure de l'état et du placement précalculé.
import type { Feature, FeatureCollection, Point } from "geojson";
import type { GeoJSONSource, Map as MapLibre } from "maplibre-gl";
import { CATEGORIES, CATEGORY_RANK } from "../../../data/categories";
import { ORG_BY_ID, PARTICIPANTS_BY_PROJECT, orgTown } from "../../../data/dataset";
import type { Place } from "../../../data/nearby";
import { joinWithAnd } from "../../../utils/format";
import { findSubject } from "../../../data/subjects";
import type { Selection } from "../../../stores/selection";
import { computeLabelHeights } from "../../../data/placement/labelHeights";
import { BUBBLES, OFFSETS, CLUSTERS, CLUSTER_OF, LABEL_HEIGHTS, PLACED_MEMBERS, POSITION, TOWNS, dotPerNotch, nameOffsets } from "../../../data/placement";
import { bubbleImage, dotImage } from "./images";

// Poser les données d'une source de la carte.
export const setData = (map: MapLibre, id: string, data: FeatureCollection) => map.getSource<GeoJSONSource>(id)!.setData(data);

type Lit = Set<string> | null;   // les membres mis en avant ; null : tous pareils
const collection = (features: Feature[]): FeatureCollection => ({ type: "FeatureCollection", features });
const point = (coordinates: [number, number], properties: Record<string, unknown>): Feature<Point> =>
  ({ type: "Feature", geometry: { type: "Point", coordinates }, properties });
const isLit = (lit: Lit, id: string) => !lit || lit.has(id);
const cat = (id: string) => ORG_BY_ID.get(id)!.category!;

export const members = (visible: Set<string>, lit: Lit) => collection([...visible].map((id) => point(POSITION.get(id)!, {
  id, image: dotImage(CATEGORY_RANK.get(cat(id))!), dimmed: isLit(lit, id) ? 0 : 1, d: OFFSETS.get(id), v: dotPerNotch(id) })));

// Le camembert d'un groupe de membres : les catégories de ceux mis en avant ; aucun : une pastille grise.
function pie(ids: string[], lit: Set<string> | null) {
  const on = ids.filter((id) => isLit(lit, id));
  const parts = CATEGORIES.map((c, rank): [number, number] => [rank, on.filter((id) => cat(id) === c.code).length]).filter(([, k]) => k);
  return { on, image: on.length ? bubbleImage(parts, ids.length) : bubbleImage([], 1) };
}

// Les grappes du cran i : nommées par la ville de la plupart de leurs membres.
export const clusters = (i: number, visible: Set<string>, lit: Lit) => collection(CLUSTERS[i].flatMap((cluster) => {
  const ids = cluster.ids.filter((id) => visible.has(id));
  if (!ids.length) return [];
  const { on, image } = pie(ids, lit);
  const byTown = ids.reduce((m, id) => m.set(orgTown(id), (m.get(orgTown(id)) || 0) + 1), new Map<string, number>());
  return [point(cluster.center, { name: [...byTown].sort((a, b) => b[1] - a[1])[0][0], n: ids.length, a: on.length, ids: JSON.stringify(ids), image })];
}));

// « Matane, Rimouski et Gaspé », ou « Matane, Rimouski et 3 autres villes »
function otherTowns(names: string[]) {
  return names.length > 3 ? `${names.slice(0, 2).join(", ")} et ${names.length - 2} autres villes` : joinWithAnd(names);
}
// Les bulles des villes au niveau n ; une ville sans aucun membre mis en avant n'est plus qu'une pastille grise, sans nom.
export const bubbles = (n: number, visible: Set<string>, lit: Lit) => collection(BUBBLES.get(n)!.flatMap((bubble) => {
  const ids = bubble.ids.filter((id) => visible.has(id));
  if (!ids.length) return [];
  const { on, image } = pie(ids, lit), others = otherTowns([...new Set(ids.map(orgTown))].filter((name) => name !== bubble.name));
  if (!on.length) return [point(bubble.center, { name: "", n: ids.length, a: 0, others, ids: JSON.stringify(ids), image })];
  return [point(bubble.center, { name: ids.length > 1 ? bubble.name : "", n: ids.length, a: on.length, others, ids: JSON.stringify(ids),
    image })];
}));

// Un nom par ville d'au moins deux membres visibles ; ses hauteurs par cran viennent du build pour la vue par défaut.
export function townNames(visible: Set<string>) {
  const t = visible.size === PLACED_MEMBERS.length ? LABEL_HEIGHTS : computeLabelHeights(TOWNS, visible, {
    place: (id) => ORG_BY_ID.get(id) as { lat: number; lon: number }, clusterOf: (id) => CLUSTER_OF.get(id)!, clusters: CLUSTERS, offsets: (id) => OFFSETS.get(id)! });
  return collection(TOWNS.flatMap((town) => (t[town.name] ? [point([town.lon, town.lat], { name: town.name, n: town.ids.filter((id) => visible.has(id)).length, t: t[town.name] })] : [])));
}

// L'anneau autour de la sélection (les porteurs d'un projet) et le nom du membre choisi.
const carriers = (project: string) => (PARTICIPANTS_BY_PROJECT.get(project) || []).filter((x) => x.role === "principal").map((x) => x.org);
export function ring(s: Selection | null) {
  const ids = s?.type === "member" ? [s.id] : s?.type === "project" ? carriers(s.id)
    : s?.type === "subject" ? [...new Set(findSubject(s.id).projects.flatMap((p) => carriers(p.id)))] : [];
  return collection(ids.filter((id) => POSITION.has(id)).map((id) => point(POSITION.get(id)!, { d: OFFSETS.get(id), v: dotPerNotch(id) })));
}
export const chosenName = (s: Selection | null) => collection(s?.type === "member" && POSITION.has(s.id)
  ? [point(POSITION.get(s.id)!, { name: ORG_BY_ID.get(s.id)!.name, t: nameOffsets(s.id) })] : []);

// « Vous » : le lieu de « près de chez moi », tant qu'on en vient.
export function you(s: Selection | null, backTo: Selection | null, here: Place | null) {
  const fromNearMe = s && (s.type === "nearby" || (s.type === "member" && backTo?.type === "nearby"));
  return collection(fromNearMe && here ? [point([here.lon, here.lat], { name: here.name === "chez vous" ? "Vous" : here.name })] : []);
}
