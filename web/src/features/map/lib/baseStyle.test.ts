import { expect, test, vi } from "vitest";
import { createPropertyExpression, latest, validateStyleMin, type StylePropertySpecification } from "@maplibre/maplibre-gl-style-spec";
import { SYLLABIC_ZOOM, baseStyle } from "./baseStyle";

// les couleurs viennent des variables CSS : sans page, une couleur quelconque
vi.stubGlobal("document", { documentElement: {} });
vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => "#000" }));

const style = baseStyle("http://localhost/");
const SYLLABIC = /[\u1400-\u167F]/;
// Kuujjuaq tel que les tuiles le décrivent : son nom local en syllabique, ses noms français et anglais en latin
const KUUJJUAQ = { name: "ᑰᑦᔪᐊᖅ", "name:fr": "Kuujjuaq", "name:en": "Kuujjuaq", script: "Canadian_aboriginal", kind: "locality" };
const MONTREAL = { name: "Montréal", "name:fr": "Montréal", "name:en": "Montreal", kind: "locality" };
const textAt = (field: unknown, zoom: number, properties: Record<string, string>) => {
  const e = createPropertyExpression(field, "text-field", latest.layout_symbol["text-field"] as unknown as StylePropertySpecification);
  if (e.result !== "success") throw new Error(JSON.stringify(e.value));
  const out = e.value.evaluate({ zoom }, { type: 1, properties, geometry: [] } as never) as { sections?: { text: string }[] } | string;
  return typeof out === "string" ? out : (out.sections || []).map((s) => s.text).join("");
};

test("the basemap style is valid", () => {
  expect(validateStyleMin(style)).toEqual([]);
});

// De loin, un lieu du Nord ne s'écrit qu'en latin : l'ouverture ne télécharge pas les lettres du syllabique. De près, son
// nom local revient. Un lieu au nom latin ne change pas.
test("syllabics only from SYLLABIC_ZOOM on; Latin names unchanged", () => {
  const fields = style.layers.flatMap((l) => (l.type === "symbol" && l.id === "places_locality" ? [l.layout!["text-field"]] : []));
  expect(fields.length).toBe(1);
  const [field] = fields;
  expect(textAt(field, SYLLABIC_ZOOM - 1, KUUJJUAQ)).toBe("Kuujjuaq");
  expect(textAt(field, SYLLABIC_ZOOM, KUUJJUAQ)).toMatch(SYLLABIC);
  expect(textAt(field, SYLLABIC_ZOOM - 1, MONTREAL)).toBe(textAt(field, SYLLABIC_ZOOM, MONTREAL));
});

// Aucune couche du fond n'écrit de syllabique de loin, quelle que soit la place du nom local (premier, deuxième nom).
test("no basemap layer writes syllabics below SYLLABIC_ZOOM", () => {
  const fields = style.layers.flatMap((l) => (l.type === "symbol" && JSON.stringify(l.layout?.["text-field"] ?? "").includes('"name"') ? [l.layout!["text-field"]] : []));
  expect(fields.length).toBeGreaterThan(5);
  const second = { name: "Iqaluit", "name:fr": "Iqaluit", "name:en": "Iqaluit", name2: "ᐃᖃᓗᐃᑦ", script2: "Canadian_aboriginal", kind: "locality" };
  for (const field of fields) for (const place of [KUUJJUAQ, second]) expect(textAt(field, SYLLABIC_ZOOM - 1, place)).not.toMatch(SYLLABIC);
});
