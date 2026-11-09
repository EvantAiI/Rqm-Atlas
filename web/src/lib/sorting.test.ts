import { expect, test } from "vitest";
import { sortBy } from "./sorting";

test("missing values go last", () => {
  const pubs = [{ title: "b", year: 2020 }, { title: "a", year: null }, { title: "c", year: 2024 }];
  expect(sortBy(pubs, "year").map((p) => p.title)).toEqual(["c", "b", "a"]);
});
