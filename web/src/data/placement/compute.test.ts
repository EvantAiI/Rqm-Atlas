import { expect, test } from "vitest";
import { isOutsideQuebec } from "../regions";
import { MEMBERS } from "../dataset";
import { computePlacement, NOTCHES, BUBBLE_LEVELS } from "./compute";

const sites = MEMBERS.filter((o) => o.lat !== undefined && !isOutsideQuebec(o)).map((o) => ({ id: o.id, lat: o.lat!, lon: o.lon!, town: o.town || "", category: o.category! }));
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
