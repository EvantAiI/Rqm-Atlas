import { expect, test } from "vitest";
import { isOffMap } from "../regions";
import { MEMBERS } from "../dataset";
import { computePlacement, NOTCHES, BUBBLE_LEVELS } from "./compute";

const sites = MEMBERS.filter((o) => o.lat !== undefined && !isOffMap(o)).map((o) => ({ id: o.id, lat: o.lat!, lon: o.lon!, town: o.town || "", category: o.category!, quebec: o.province === "Québec" }));
const P = computePlacement(sites);

test("each member: one offset per notch, in at most one cluster per notch, never a cluster at the last notch", () => {
  for (const o of sites) {
    expect(P.offsets[o.id].length).toBe(NOTCHES.length);
    P.clusterOf[o.id].forEach((k, i) => { if (k !== -1) expect(P.clusters[i][k].ids).toContain(o.id); });
  }
  expect(P.clusters[NOTCHES.length - 1]).toEqual([]);
});
test("a cluster splits at a later notch; town bubbles hold every member once per level", () => {
  P.clusters.forEach((l, i) => l.forEach((g) => expect(g.splitZoom).toBeGreaterThan(NOTCHES[i])));
  expect(P.bubbles.length).toBe(BUBBLE_LEVELS.length);
  for (const l of P.bubbles) expect(l.flatMap((b) => b.ids).sort()).toEqual(sites.map((o) => o.id).sort());
});

// Une bulle au nom d'Ottawa qui tient Gatineau nomme aussi Gatineau ; tout au loin, la bulle de Montréal qui avale Ottawa
// ne nomme qu'elle. Aucune bulle au seul nom d'une ville hors du Québec ne cache un membre québécois.
test("a bubble named after a town outside Québec that holds a Québec town also names the biggest of them", () => {
  const all = P.bubbles.flat(), inQuebec = (id: string) => sites.find((o) => o.id === id)!.quebec;
  expect(all.filter((b) => b.ids.includes("UQO") && b.ids.length === 3).map((b) => `${b.name}-${b.also}`)).toContain("Ottawa-Gatineau");
  expect(all.filter((b) => b.name === "Montréal").every((b) => !b.also)).toBe(true);
  expect(all.filter((b) => !b.also && !inQuebec(b.ids.find((id) => sites.find((o) => o.id === id)!.town === b.name)!))
    .every((b) => !b.ids.some(inQuebec))).toBe(true);
});
