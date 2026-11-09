import { expect, test } from "vitest";
import { endLabel, linkLabel } from "./links";
import { TOWN_BY_NAME } from "./placement";

test("a merged end names a town once, by its municipality; a lone district and an organisation keep their name", () => {
  const district = [...TOWN_BY_NAME.keys()].find((n) => / \(.*\)$/.test(n))!, town = district.replace(/ \(.*\)$/, "");
  expect(endLabel([town, district])).toBe(town);
  expect(endLabel([district])).toBe(district);
  expect(endLabel(["INRS (ETE)", "INRS"])).toBe("INRS (ETE), INRS");
  expect(linkLabel([town, district], ["Montréal"])).toBe(`${town} ↔ Montréal`);
});
