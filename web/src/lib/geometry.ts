// La géométrie de l'écran : pixels Web Mercator, points écartés, groupes, bulles, arcs.
import { getOrCreate } from "./collections";

export interface Pixel { x: number; y: number }
// Des points trop proches à l'écran (un campus, une ville vue de loin) s'écartent juste assez pour ne pas se chevaucher,
// au plus près de leur vraie place : ceux d'un même pixel partent d'abord en spirale (angle d'or), puis à chaque tour
// chaque paire plus proche que `spacing` se repousse et chaque point revient un peu ; les derniers tours ne font que
// repousser. points : [{ id, x, y, rank }] en pixels ; rend Map id -> { x, y }.
export function spreadDots(points: (Pixel & { id: string; rank: number })[], spacing: number) {
  const sorted = [...points].sort((a, b) => a.rank - b.rank || (a.id < b.id ? -1 : 1));
  const n = sorted.length, goldenAngle = Math.PI * (3 - Math.sqrt(5)), x = new Float64Array(n), y = new Float64Array(n), seen = new Map<string, number>();
  sorted.forEach((p, i) => {
    const key = `${Math.round(p.x)},${Math.round(p.y)}`, k = seen.get(key) || 0;
    seen.set(key, k + 1);
    const r = k ? spacing * 0.62 * Math.sqrt(k + 0.5) : 0;
    x[i] = p.x + r * Math.cos(k * goldenAngle); y[i] = p.y + r * Math.sin(k * goldenAngle);
  });
  for (let round = 0; round < 200; round++) {
    const pull = round < 120 ? 0.03 : 0;
    for (let i = 0; i < n; i++) { x[i] += (sorted[i].x - x[i]) * pull; y[i] += (sorted[i].y - y[i]) * pull; }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = x[j] - x[i], dy = y[j] - y[i];
        if (dx >= spacing || dx <= -spacing || dy >= spacing || dy <= -spacing) continue;
        const d = Math.hypot(dx, dy);
        if (d >= spacing) continue;
        if (d < 1e-6) { dx = Math.cos(i + j); dy = Math.sin(i + j); } else { dx /= d; dy /= d; }
        const push = (spacing - d) / 2;
        x[i] -= dx * push; y[i] -= dy * push; x[j] += dx * push; y[j] += dy * push;
      }
    }
  }
  return new Map(sorted.map((p, i) => [p.id, { x: x[i], y: y[i] }]));
}
// Les points qui se touchent de proche en proche (à moins de `spacing`) : un tableau d'ids par groupe, point seul compris.
export function groupTouching(points: (Pixel & { id: string })[], spacing: number) {
  const parent = points.map((_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (Math.abs(points[i].x - points[j].x) < spacing && Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < spacing) parent[root(i)] = root(j);
    }
  }
  const g = new Map<number, string[]>();
  points.forEach((p, i) => getOrCreate(g, root(i), () => []).push(p.id));
  return [...g.values()];
}
// Un groupe plus large que `radius` autour de son centre (une chaîne de voisins le long d'une côte) se redivise avec un
// écart plus serré, jusqu'à des groupes compacts.
export function splitWide(points: (Pixel & { id: string })[], spacing: number, radius: number): string[][] {
  const isWide = (g: string[]) => {
    const pts = g.map((id) => points.find((p) => p.id === id)!), cx = pts.reduce((t, p) => t + p.x, 0) / pts.length, cy = pts.reduce((t, p) => t + p.y, 0) / pts.length;
    return pts.some((p) => Math.hypot(p.x - cx, p.y - cy) > radius);
  };
  return groupTouching(points, spacing).flatMap((g) => (!isWide(g) || spacing < 2 ? [g]
    : splitWide(points.filter((p) => g.includes(p.id)), spacing * 0.7, radius)));
}
// Web Mercator en pixels, pour une carte de 512 × 2^z px de large (la convention de MapLibre).
export function toPixels(lat: number, lon: number, z: number): Pixel {
  const w = 512 * 2 ** z, s = Math.sin((lat * Math.PI) / 180);
  return { x: (w * (lon + 180)) / 360, y: w * (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) };
}
export function fromPixels(x: number, y: number, z: number): [number, number] {
  const w = 512 * 2 ** z;
  return [(x / w) * 360 - 180, (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / w))) * 180) / Math.PI];
}
// Aux zooms éloignés, une bulle par ville ; deux bulles qui se toucheraient n'en font qu'une, au nom de la plus grosse.
export const bubbleRadius = (n: number) => (n > 1 ? 7 + 2.4 * Math.sqrt(n) : 4.5);
export function mergeBubbles(towns: (Pixel & { name: string; ids: string[] })[], margin: number) {
  const groups = [...towns].sort((a, b) => b.ids.length - a.ids.length || (a.name < b.name ? -1 : 1))
    .map((town) => ({ name: town.name, x: town.x, y: town.y, ids: [...town.ids] }));
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < groups.length && !merged; i++) {
      for (let j = i + 1; j < groups.length && !merged; j++) {
        const a = groups[i], b = groups[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) < bubbleRadius(a.ids.length) + bubbleRadius(b.ids.length) + margin) {
          a.ids.push(...b.ids); groups.splice(j, 1); merged = true;
        }
      }
    }
  }
  return groups;
}
// Un arc de a à b ([lon, lat]) : une courbe de Bézier tracée en pixels Mercator, bombée à gauche de a -> b de `k` fois
// sa longueur ; la même forme à tout zoom. 25 points.
export function arc(a: [number, number], b: [number, number], k: number) {
  const p = toPixels(a[1], a[0], 6), q = toPixels(b[1], b[0], 6);
  const c = { x: (p.x + q.x) / 2 + (q.y - p.y) * k, y: (p.y + q.y) / 2 - (q.x - p.x) * k };
  return Array.from({ length: 25 }, (_, i) => {
    const t = i / 24, u = 1 - t;
    return fromPixels(u * u * p.x + 2 * u * t * c.x + t * t * q.x, u * u * p.y + 2 * u * t * c.y + t * t * q.y, 6);
  });
}
