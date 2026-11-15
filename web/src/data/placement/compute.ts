// Où chaque membre est dessiné, calculé une fois au build (scripts/precompute.ts -> generated/placement.json) : le navigateur
// ne fait que le lire. Pas de DOM ici.
import { CATEGORY_RANK } from "../categories";
import { getOrCreate } from "../../lib/collections";
import type { Category } from "../types";
import { fromPixels, spreadDots, groupTouching, mergeBubbles, splitWide, toPixels } from "../../lib/geometry";

export const DOT_ZOOM = 6.5;   // en dessous : une bulle par ville
export const DOT_RADIUS = 5, DOT_SPACING = 2 * DOT_RADIUS + 6, LABEL_EM = 13;   // le point d'un membre ; 6 px de vide entre deux points
export const CLUSTER_MIN_SIZE = 4, CLUSTER_RADIUS = 36;   // une grappe tient ses membres à moins de 36 px de son centre
export const NOTCHES = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];   // des entiers : MapLibre évalue icon-offset aux zooms entiers
export const BUBBLE_LEVELS = [3, 4, 5, 6];   // le niveau n vaut pour les zooms [n, n + 1[ (le premier dès 0, le dernier jusqu'à DOT_ZOOM)

export interface MemberSite { id: string; lat: number; lon: number; town: string; category: Category; quebec: boolean }
export interface Cluster { ids: string[]; center: [number, number]; splitZoom: number }
// also : la ville du Québec nommée avec elle (« Ottawa-Gatineau »)
export interface Bubble { name: string; also?: string; ids: string[]; center: [number, number] }
export interface Town { name: string; ids: string[]; lat: number; lon: number }
export interface Placement {
  placed: string[];                       // les membres dessinés sur la carte
  clusterOf: Record<string, number[]>;     // id -> par cran, l'index de sa grappe, ou -1 (un point)
  clusters: Cluster[][];                    // par cran
  offsets: Record<string, [number, number][]>;   // id -> par cran, son décalage en pixels depuis sa vraie place
  towns: Town[];                        // le champ ville du RQM, à la position moyenne de ses membres
  bubbles: Bubble[][];                      // par niveau de BUBBLE_LEVELS
}

const round1 = (value: number) => Math.round(value * 10) / 10;

export function computePlacement(sites: MemberSite[]): Placement {
  const pixels = NOTCHES.map((z) => new Map(sites.map((o) => [o.id, toPixels(o.lat, o.lon, z)])));
  const asPoints = (i: number) => sites.map((o) => ({ id: o.id, ...pixels[i].get(o.id)! }));
  // Les membres encore ensemble au dernier cran (une même adresse, un centre-ville) sont inséparables : jamais une grappe.
  const atLastNotch = new Map<string, number>();
  groupTouching(asPoints(NOTCHES.length - 1), DOT_SPACING).forEach((g, k) => g.forEach((id) => atLastNotch.set(id, k)));
  const clusters: (Cluster & { x: number; y: number })[][] = NOTCHES.map(() => []);
  const clusterOf: Record<string, number[]> = Object.fromEntries(sites.map((o) => [o.id, []]));
  NOTCHES.forEach((z, i) => {
    for (const g of splitWide(asPoints(i), DOT_SPACING, CLUSTER_RADIUS)) {
      const isCluster = g.length >= CLUSTER_MIN_SIZE && i < NOTCHES.length - 1 && new Set(g.map((id) => atLastNotch.get(id))).size > 1;
      if (!isCluster) { g.forEach((id) => { clusterOf[id][i] = -1; }); continue; }
      const x = g.reduce((t, id) => t + pixels[i].get(id)!.x, 0) / g.length, y = g.reduce((t, id) => t + pixels[i].get(id)!.y, 0) / g.length;
      clusters[i].push({ ids: g, x, y, center: fromPixels(x, y, z), splitZoom: 0 });
      g.forEach((id) => { clusterOf[id][i] = clusters[i].length - 1; });
    }
  });
  // Le zoom où une grappe s'ouvre : le premier cran où ses membres ne sont plus tous dans une même grappe.
  clusters.forEach((l, i) => l.forEach((g) => {
    const j = NOTCHES.findIndex((_, k) => k > i && (clusterOf[g.ids[0]][k] === -1 || g.ids.some((id) => clusterOf[id][k] !== clusterOf[g.ids[0]][k])));
    g.splitZoom = NOTCHES[j === -1 ? NOTCHES.length - 1 : j];
  }));
  // Le décalage de chaque membre par cran : un point libre s'écarte de ses voisins ; un membre de grappe va au centre de la grappe.
  const offsets: Record<string, [number, number][]> = Object.fromEntries(sites.map((o) => [o.id, []]));
  NOTCHES.forEach((_, i) => {
    const free = sites.filter((o) => clusterOf[o.id][i] === -1).map((o) => ({ id: o.id, ...pixels[i].get(o.id)!, rank: CATEGORY_RANK.get(o.category) ?? 9 }));
    const place = spreadDots(free, DOT_SPACING);
    for (const o of sites) {
      const p = pixels[i].get(o.id)!, k = clusterOf[o.id][i], q = k === -1 ? place.get(o.id)! : clusters[i][k];
      offsets[o.id].push([round1(q.x - p.x), round1(q.y - p.y)]);
    }
  });
  const towns = [...sites.reduce((m, o) => {
    const town = getOrCreate(m, o.town, () => ({ name: o.town, ids: [] as string[], lat: 0, lon: 0 }));
    town.ids.push(o.id); town.lat += o.lat; town.lon += o.lon;
    return m;
  }, new Map<string, Town>()).values()].map((town) => ({ ...town, lat: town.lat / town.ids.length, lon: town.lon / town.ids.length }));
  // Une bulle au nom d'une ville hors du Québec qui tient aussi une ville du Québec nomme aussi la plus grosse de celles-ci
  // (« Ottawa-Gatineau », features/map/lib/sources.ts) : un membre québécois ne se range pas sous le seul nom d'une ville
  // voisine hors du Québec.
  const quebec = new Map(sites.map((o) => [o.town, o.quebec]));
  const alsoNamed = (g: { name: string; ids: string[] }) => {
    if (quebec.get(g.name)) return {};
    const inside = towns.filter((t) => quebec.get(t.name) && t.ids.every((id) => g.ids.includes(id)))
      .sort((a, b) => b.ids.length - a.ids.length || (a.name < b.name ? -1 : 1))[0];
    return inside ? { also: inside.name } : {};
  };
  const bubbles = BUBBLE_LEVELS.map((n) => mergeBubbles(towns.map((town) => ({ name: town.name, ids: town.ids, ...toPixels(town.lat, town.lon, n + 0.5) })), 3)
    .map((g) => ({ name: g.name, ...alsoNamed(g), ids: g.ids, center: fromPixels(g.x, g.y, n + 0.5) })));
  return { placed: sites.map((o) => o.id), clusterOf, clusters: clusters.map((l) => l.map(({ ids, center, splitZoom }) => ({ ids, center, splitZoom }))),
           offsets, towns, bubbles };
}
