import { expect, test } from "vitest";
import { km, mostActive } from "./distance";

const c = (id: string, d: number, n: number) => ({ id, d, n });
test("the most projects within the radius, the closest on a tie, else the most active of the five closest", () => {
  expect(mostActive([c("a", 3, 2), c("b", 40, 9), c("c", 60, 30)], 50)!.id).toBe("b");
  expect(mostActive([c("a", 10, 4), c("b", 5, 4)], 50)!.id).toBe("b");
  expect(mostActive([c("a", 90, 1), c("b", 120, 7), c("c", 80, 0)], 50)!.id).toBe("b");
  expect(mostActive([], 50)).toBeNull();
});
test("Rimouski to Québec is about 270 km as the crow flies", () => {
  expect(Math.round(km([-68.52, 48.45], [-71.21, 46.81]) / 10)).toBe(27);
});
