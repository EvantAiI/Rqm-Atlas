import { expect, test } from "vitest";
import { MEMBERS } from "../data/dataset";
import { arc, fromPixels, spreadDots, groupTouching, bubbleRadius, mergeBubbles, splitWide, toPixels, lanes, shift, LANE_EASE } from "./geometry";

const PLACED = MEMBERS.filter((o) => o.lat !== undefined);

test.each([[4, 3.5], [5.5, 4.5], [7, 6], [10, 6]])("at zoom %s no two dots overlap, each stays near its place, fast", (z, radius) => {
  const spacing = 2 * radius + 2;
  const pts = PLACED.map((o, i) => ({ id: o.id, ...toPixels(o.lat!, o.lon!, z - 1), rank: i % 5 }));   // tuiles de 256 px
  const start = performance.now(), place = spreadDots(pts, spacing), ms = performance.now() - start;
  let closest = Infinity, moved = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = place.get(pts[i].id)!;
    moved = Math.max(moved, Math.hypot(a.x - pts[i].x, a.y - pts[i].y));
    for (let j = i + 1; j < pts.length; j++) { const b = place.get(pts[j].id)!; closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y)); }
  }
  expect(closest).toBeGreaterThanOrEqual(spacing * 0.85);
  expect(moved).toBeLessThan(30 * spacing);
  expect(ms).toBeLessThan(150);
});
test("dots on the same address separate", () => {
  const xs = [...spreadDots([1, 2, 3, 4].map((k) => ({ id: `p${k}`, x: 100, y: 100, rank: 0 })), 14).values()];
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) expect(Math.hypot(xs[i].x - xs[j].x, xs[i].y - xs[j].y)).toBeGreaterThanOrEqual(14 * 0.85);
});
test("pixels -> degrees -> pixels gives the start point back", () => {
  for (const [lat, lon, z] of [[48.45, -68.52, 7], [45.5, -73.6, 3.5], [0, 0, 0]]) {
    const p = toPixels(lat, lon, z), [lo, la] = fromPixels(p.x, p.y, z);
    expect(Math.abs(la - lat) < 1e-9 && Math.abs(lo - lon) < 1e-9).toBe(true);
  }
});
test("town bubbles: none touches another, each member in exactly one, Rimouski keeps its name", () => {
  const byTown = new Map<string, typeof PLACED>();
  for (const o of PLACED) byTown.set(o.town!, [...(byTown.get(o.town!) || []), o]);
  const mean = (os: typeof PLACED, k: "lat" | "lon") => os.reduce((t, o) => t + o[k]!, 0) / os.length;
  for (const n of [3, 4, 5, 6]) {
    const groups = mergeBubbles([...byTown].map(([name, os]) => ({ name, ids: os.map((o) => o.id), ...toPixels(mean(os, "lat"), mean(os, "lon"), n + 0.5) })), 3);
    expect(groups.flatMap((g) => g.ids).sort()).toEqual(PLACED.map((o) => o.id).sort());
    for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
      const a = groups[i], b = groups[j];
      expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.name} / ${b.name}`).toBeGreaterThanOrEqual(bubbleRadius(a.ids.length) + bubbleRadius(b.ids.length) + 3);
    }
    if (n === 6) expect(groups.some((g) => g.name === "Rimouski" && g.ids.length >= 20)).toBe(true);
  }
  expect(mergeBubbles([{ name: "A", x: 0, y: 0, ids: ["a", "b"] }, { name: "B", x: 5, y: 0, ids: ["c"] }, { name: "C", x: 500, y: 0, ids: ["d"] }], 3)
    .map((g) => [g.name, g.ids.length])).toEqual([["A", 3], ["C", 1]]);
});
// Tous les arcs bombent vers le nord-ouest, dans un sens comme dans l'autre : ils s'emboîtent en arc-en-ciel.
test("an arc leaves a, reaches b and always bulges to the north-west", () => {
  const rimouski: [number, number] = [-68.52, 48.45], montreal: [number, number] = [-73.57, 45.5];
  const curve = arc(rimouski, montreal, 0.1), straight = arc(rimouski, montreal, 0)[12];
  expect(curve.length).toBe(25);
  for (const [u, v] of [[curve[0], rimouski], [curve[24], montreal]]) expect(Math.abs(u[0] - v[0]) < 1e-9 && Math.abs(u[1] - v[1]) < 1e-9).toBe(true);
  for (const mid of [curve[12], arc(montreal, rimouski, 0.1)[12]]) {
    expect(mid[0]).toBeLessThan(straight[0]);
    expect(mid[1]).toBeGreaterThan(straight[1]);
  }
});
// Deux traits qui partent d'un même bout presque dans la même direction se posent côte à côte, chacun d'un côté ; un
// trait qui part ailleurs, et chaque bout seul, ne bouge pas.
test("lines leaving one end in nearly the same direction lie side by side", () => {
  const from: [number, number] = [-68.52, 48.45], far = (lon: number, lat: number) => arc(from, [lon, lat], 0.1);
  const [a, b, c] = lanes([{ line: far(-73.57, 45.5), width: 3 }, { line: far(-73.3, 45.6), width: 3 }, { line: far(-64.5, 48.8), width: 3 }]);
  expect([Math.abs(a[0]), Math.abs(b[0])]).toEqual([2, 2]);
  expect(a[0]).toBe(-b[0]);
  expect([a[1], b[1], c[0], c[1]]).toEqual([0, 0, 0, 0]);
});
// Un trait poussé sur sa droite : vers l'est, la droite est le sud. Il part du point même, s'écarte en douceur sur
// LANE_EASE pixels, puis court à 3 pixels écran de sa place, au zoom dessiné, jusqu'à revenir sur l'autre bout.
test("a shifted line leaves from its very end, eases into its lane, runs the given pixels to its right", () => {
  const z = 7, line: [number, number][] = [[-70, 47], [-69, 47], [-68, 47]], moved = shift(line, 3, 3, z);
  const base = toPixels(47, -70, z), px = moved.map(([lon, lat]) => toPixels(lat, lon, z)), last = px[px.length - 1];
  expect(Math.hypot(px[0].x - base.x, px[0].y - base.y)).toBeLessThan(1e-6);
  expect(Math.hypot(last.x - toPixels(47, -68, z).x, last.y - base.y)).toBeLessThan(1e-6);
  const off = px.map((p) => ({ along: p.x - base.x, by: p.y - base.y }));
  for (let i = 1; i < off.length; i++) expect(off[i].along).toBeGreaterThan(off[i - 1].along);   // dans l'ordre, sans recul
  const middle = off.filter((p) => p.along >= LANE_EASE && p.along <= px[px.length - 1].x - base.x - LANE_EASE);
  expect(middle.length).toBeGreaterThan(0);
  expect(middle.every((p) => Math.abs(p.by - 3) < 1e-6)).toBe(true);
  const opening = off.filter((p) => p.along > 0 && p.along < LANE_EASE);
  expect(opening.length).toBeGreaterThan(4);   // assez de points pour une ouverture lisse
  for (let i = 1; i < opening.length; i++) expect(opening[i].by).toBeGreaterThanOrEqual(opening[i - 1].by);
});
const sorted = (l: string[][]) => l.map((g) => [...g].sort().join(",")).sort();
test("dots touching neighbour to neighbour make a group; a far one stays alone", () => {
  expect(sorted(groupTouching([{ id: "a", x: 0, y: 0 }, { id: "b", x: 10, y: 0 }, { id: "c", x: 20, y: 0 }, { id: "d", x: 100, y: 0 }], 16))).toEqual(["a,b,c", "d"]);
  expect(sorted(groupTouching([{ id: "a", x: 0, y: 0 }, { id: "b", x: 0, y: 0 }], 16))).toEqual(["a,b"]);
  expect(groupTouching([], 16)).toEqual([]);
});
test("a chain along a coast is split into compact groups; a compact group is kept", () => {
  const chain = [0, 12, 24, 36, 48, 60].map((x, i) => ({ id: `c${i}`, x, y: 0 }));
  const groups = splitWide(chain, 16, 20);
  expect(groups.length).toBeGreaterThan(1);
  for (const g of groups) {
    const xs = g.map((id) => chain.find((p) => p.id === id)!.x), c = xs.reduce((t, x) => t + x, 0) / xs.length;
    expect(xs.every((x) => Math.abs(x - c) <= 20)).toBe(true);
  }
  expect(sorted(splitWide([{ id: "a", x: 0, y: 0 }, { id: "b", x: 5, y: 0 }, { id: "c", x: 100, y: 0 }], 16, 20))).toEqual(["a,b", "c"]);
});
