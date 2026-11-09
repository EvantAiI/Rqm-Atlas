import { expect, test } from "vitest";
import { DATA } from "../data/dataset";
import { matchTerm, rankMatches, matchAll, splitMatches, filterMatches, normalize, terms } from "./search";

const searchable = DATA.organisations.map((o) => ({ o, label: o.acronym && !o.name.includes(o.acronym) ? `${o.name} (${o.acronym})` : o.name }));
const first = (q: string) => rankMatches(searchable, q, "label", 8)[0].e.o.id;

test("acronyms find their organisation, substrings come first", () => {
  expect(first("uqar")).toBe("UQAR");
  expect(first("ismer")).toBe("ISMER");
  expect(first("merinov")).toBe("merinov");
  expect(first("universite laval")).toBe("ULaval");
  expect(matchTerm("uqar", normalize("Université du Québec à Rimouski"))!.abbreviates).toBe(true);
});
test("highlighting lands on the accented text", () => {
  const label = "Université du Québec à Rimouski";
  const pieces = splitMatches(label, matchAll(terms("quebec"), normalize(label))!.positions);
  expect(pieces.filter(([, m]) => m).map(([t]) => t)).toEqual(["Québec"]);
});
test("a search that matches nothing keeps nothing", () => {
  expect(filterMatches([{ title: "b" }], "zzz", ["title"])).toEqual([]);
});
