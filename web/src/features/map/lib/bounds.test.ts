import { expect, test } from "vitest";
import { maxBounds, tileNorth } from "./bounds";

test("a tile's north edge, in degrees", () => {
  expect(tileNorth(0, 0)).toBeCloseTo(85.0511, 3);
  expect(tileNorth(1, 1)).toBeCloseTo(0, 6);
  // zoom 7 : la rangée 47 touche encore 43° N (le fond l'a), la 48 est toute au sud (il ne l'a pas)
  expect(tileNorth(7, 47)).toBeGreaterThan(43);
  expect(tileNorth(7, 48)).toBeLessThan(43);
});
test("the south bound follows the zoom", () => {
  expect(maxBounds(5)[0][1]).toBe(38);
  expect(maxBounds(8)[0][1]).toBeCloseTo(42.6);
  expect(maxBounds(8, true)[0][1]).toBe(15);
});
