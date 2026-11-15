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
// Un arc de a à b ([lon, lat]) : une courbe de Bézier tracée en pixels Mercator, bombée de `k` fois sa longueur,
// toujours vers le nord-ouest : deux arcs de même direction s'emboîtent en arc-en-ciel au lieu de se croiser en X.
// La même forme à tout zoom. 25 points.
export function arc(a: [number, number], b: [number, number], k: number) {
  const p = toPixels(a[1], a[0], 6), q = toPixels(b[1], b[0], 6);
  const nx = q.y - p.y, ny = p.x - q.x, side = nx + ny > 0 ? -1 : 1;   // nord-ouest = x et y négatifs en pixels
  const c = { x: (p.x + q.x) / 2 + nx * k * side, y: (p.y + q.y) / 2 + ny * k * side };
  return Array.from({ length: 25 }, (_, i) => {
    const t = i / 24, u = 1 - t;
    return fromPixels(u * u * p.x + 2 * u * t * c.x + t * t * q.x, u * u * p.y + 2 * u * t * c.y + t * t * q.y, 6);
  });
}

// Les traits qui partent d'un même bout presque dans la même direction sont posés côte à côte, comme les bandes d'un
// arc-en-ciel, au lieu de se recouvrir. Rien n'est attiré : chaque trait reçoit, à chacun de ses bouts, un décalage en
// pixels écran (positif à droite du sens du trait), que `shift` applique au zoom dessiné.
// Dans une bande, l'ordre suit l'endroit où chaque trait s'en va, pour qu'ils ne se croisent pas en sortant.
// Les bandes s'ouvrent sur LANE_EASE pixels écran : chaque trait part du point même, puis rejoint sa bande en douceur.
export const LANE_ANGLE = (8 * Math.PI) / 180, LANE_GAP = 1, LANE_EASE = 40;
const ease = (d: number) => { const s = Math.min(d / LANE_EASE, 1); return s * s * (3 - 2 * s); };
// Un trait ([lon, lat]) poussé sur sa droite de o0 pixels écran au départ à o1 à l'arrivée, au zoom z ; nul aux deux bouts.
export function shift(line: [number, number][], o0: number, o1: number, z: number) {
  const px = line.map(([lon, lat]) => toPixels(lat, lon, z)), at = [0];
  for (let i = 1; i < px.length; i++) at.push(at[i - 1] + Math.hypot(px[i].x - px[i - 1].x, px[i].y - px[i - 1].y));
  const total = at[at.length - 1];
  // assez de points près des bouts pour que la courbe d'ouverture reste lisse, même quand un segment est long
  const steps = Array.from({ length: 8 }, (_, k) => (LANE_EASE * (k + 1)) / 8);
  const ds = [...new Set([...at, ...steps, ...steps.map((d) => total - d)])].filter((d) => d >= 0 && d <= total).sort((a, b) => a - b);
  let seg = 0;
  return ds.map((d) => {
    while (seg < px.length - 2 && at[seg + 1] < d) seg++;
    const a = px[seg], b = px[seg + 1], len = at[seg + 1] - at[seg] || 1, t = (d - at[seg]) / len;
    const o = (o0 + ((o1 - o0) * d) / (total || 1)) * ease(d) * ease(total - d);
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    return fromPixels(x - ((b.y - a.y) / len) * o, y + ((b.x - a.x) / len) * o, z);
  });
}
export function lanes(lines: { line: [number, number][]; width: number }[]): [number, number][] {
  const offsets = lines.map((): [number, number] => [0, 0]);
  const ends = new Map<string, { i: number; end: 0 | 1; dir: number; mid: Pixel }[]>();
  lines.forEach(({ line }, i) => {
    for (const end of [0, 1] as const) {
      const pts = (end ? [...line].reverse() : line).map(([lon, lat]) => toPixels(lat, lon, 6));
      const e = pts[0], next = pts[1], mid = pts[pts.length >> 1];
      getOrCreate(ends, `${e.x.toFixed(1)},${e.y.toFixed(1)}`, () => [])
        .push({ i, end, dir: Math.atan2(next.y - e.y, next.x - e.x), mid: { x: mid.x - e.x, y: mid.y - e.y } });
    }
  });
  for (const here of ends.values()) {
    if (here.length < 2) continue;
    here.sort((a, b) => a.dir - b.dir);
    // on commence après le plus grand vide entre deux directions, pour ne pas couper une bande à -π/π
    let start = 0, widest = -1;
    here.forEach((x, k) => { const gap = (x.dir - here[(k + here.length - 1) % here.length].dir + 2 * Math.PI) % (2 * Math.PI); if (gap > widest) { widest = gap; start = k; } });
    // une bande ne s'ouvre pas sur plus de LANE_ANGLE en tout : sinon des traits qui tournent peu à peu s'enchaîneraient en
    // un ruban sans fin
    const turned = [...here.slice(start), ...here.slice(0, start)], bands: (typeof here)[] = [[turned[0]]];
    for (let k = 1; k < turned.length; k++) {
      const band = bands[bands.length - 1], spread = (turned[k].dir - band[0].dir + 2 * Math.PI) % (2 * Math.PI);
      if (spread < LANE_ANGLE) band.push(turned[k]); else bands.push([turned[k]]);
    }
    for (const band of bands) {
      if (band.length < 2) continue;
      const dx = band.reduce((s, x) => s + Math.cos(x.dir), 0), dy = band.reduce((s, x) => s + Math.sin(x.dir), 0), d = Math.hypot(dx, dy);
      const ux = dx / d, uy = dy / d, n = { x: -uy, y: ux };   // n : la droite de la direction commune, à l'écran
      const side = (m: Pixel) => Math.atan2(n.x * m.x + n.y * m.y, ux * m.x + uy * m.y);
      band.sort((a, b) => side(a.mid) - side(b.mid));
      const total = band.reduce((s, x) => s + lines[x.i].width, 0) + LANE_GAP * (band.length - 1);
      let at = -total / 2;
      for (const x of band) {
        const p = at + lines[x.i].width / 2;
        offsets[x.i][x.end] = x.end ? -p : p;   // au bout d'arrivée, le trait va dans l'autre sens : sa droite est à gauche
        at += lines[x.i].width + LANE_GAP;
      }
    }
  }
  return offsets;
}
