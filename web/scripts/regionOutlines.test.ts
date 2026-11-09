import { describe, expect, it } from "vitest";
import { regionOutlines, simplify } from "./regionOutlines";

describe("simplify", () => {
  it("drops the vertices that stay near the chord and keeps the corners", () => {
    const ring = [[0, 0], [1, 0.001], [2, 0], [2, 2], [0, 2], [0, 0]];
    expect(simplify(ring, 0.01)).toEqual([[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]);
  });
  it("keeps a vertex further than the tolerance", () => {
    expect(simplify([[0, 0], [1, 0.5], [2, 0]], 0.01)).toEqual([[0, 0], [1, 0.5], [2, 0]]);
  });
});

describe("regionOutlines", () => {
  it("keys the polygons by name and removes the islets that collapse", () => {
    const square = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]], islet = [[5, 5], [5.001, 5], [5, 5.001], [5, 5]];
    const out = regionOutlines([{ properties: { nom: "Côte-Nord" }, geometry: { type: "MultiPolygon", coordinates: [[square], [islet]] } }]);
    expect(out).toEqual({ "Côte-Nord": [[square]] });
  });
});
