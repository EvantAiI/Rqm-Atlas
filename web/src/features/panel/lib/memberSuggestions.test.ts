import { expect, test } from "vitest";
import { memberSuggestions } from "./memberSuggestions";

const kinds = (q: string) => memberSuggestions(q).map((c) => (c.kind === "org" ? c.org.id : c.kind === "town" ? `town:${c.town.name}` : `region:${c.name}`));

test("members only: an empty field proposes nothing, a subject finds no member", () => {
  expect(kinds("")).toEqual([]);
  expect(kinds("érosion")).toEqual([]);
  expect(kinds("uqar")[0]).toBe("UQAR");
});
test("a town that starts that way comes first", () => {
  expect(kinds("rimouski")[0]).toBe("town:Rimouski");
});
test("a region is suggested by the start of its words, accents, case and dashes ignored", () => {
  expect(kinds("gaspésie")[0]).toBe("region:Gaspésie–Îles-de-la-Madeleine");
  expect(kinds("cote-nord")[0]).toBe("region:Côte-Nord");
  expect(kinds("bas-saint")[0]).toBe("region:Bas-Saint-Laurent");
  // la ville d'abord, puis sa région du même nom
  expect(kinds("montréal").slice(0, 2)).toEqual(["town:Montréal", "region:Montréal"]);
});
