// Les sources et les couches du réseau, posées sur le fond. Rien que des descriptions : les données viennent des effets.
import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { cssColour } from "../../../utils/screen";
import { bubbleRadius } from "../../../lib/geometry";
import { NOTCHES, LABEL_EM, BUBBLE_LEVELS, DOT_ZOOM } from "../../../data/placement";

// Tout ce qui change d'un cran à l'autre (bulle, grappe ou point, son décalage) passe par une couche par cran, sur des
// données qui ne dépendent pas du zoom. Une expression de zoom ET de donnée est évaluée au zoom de la tuile : pendant un
// geste, la carte garde les tuiles du cran d'avant le temps de refaire les nouvelles, et les points d'un cran s'y
// dessineraient avec les grappes de l'autre. Le zoom d'une couche (minzoom, maxzoom) bascule, lui, à l'instant.
export const CLUSTER_ZOOMS = NOTCHES.slice(0, -1);   // au dernier cran, plus aucune grappe
export const SOURCES = ["region", "links", "members", "ring", "towns", "chosen", "you", "bubbles", "clusters"];
const membersLayer = (z: number) => `members-${z}`;
export const BOTTOM_DOTS = membersLayer(NOTCHES[0]);   // la plus basse des couches de points
// Ce qu'un clic ou un survol peut viser : les points, les bulles des villes, les grappes.
export const CLICKABLE = [...NOTCHES.map(membersLayer), ...BUBBLE_LEVELS.map((n) => `bubbles-${n}`), ...CLUSTER_ZOOMS.map((z) => `clusters-${z}`)];

// La propriété `key` au cran i, sans zoom. Un décalage de texte qui dépend du zoom ET de la donnée est dessiné à la
// valeur du cran suivant mais heurte les autres noms à celle du cran courant : deux noms se chevauchent.
const atNotch = (key: string, i: number) => ["array", "number", 2, ["at", i, ["get", key]]] as ExpressionSpecification;
const dotAt = (i: number) => ["==", ["at", i, ["get", "v"]], 1] as ExpressionSpecification;   // dessiné en point au cran i
// Une couche par cran, de NOTCHES[i] au cran suivant (la première dès DOT_ZOOM).
const perNotchLayers = (id: string, layer: (i: number) => Omit<LayerSpecification, "id" | "minzoom" | "maxzoom">) =>
  NOTCHES.map((z, i) => ({ ...layer(i), id: `${id}-${z}`, minzoom: i === 0 ? DOT_ZOOM : z, maxzoom: z + 1 }) as LayerSpecification);
const FONT = ["Noto Sans Medium"];
export const LINK_OPACITY: ExpressionSpecification = ["get", "opacity"];
export const LINK_HALO: ExpressionSpecification = ["*", 0.8, ["get", "opacity"]];
// Le nom d'une bulle, juste au-dessus d'elle : (rayon + 3 px) / 12,5 px, en em. Le rayon est linéaire en √n (bubbleRadius)
// dès deux membres : l'interpolation entre deux tailles le suit exactement (une bulle d'un membre n'a pas de nom).
const labelAbove = (n: number): [number, number] => [0, -(bubbleRadius(n) + 3) / 12.5];
const bubbleLabelOffset = ["interpolate", ["linear"], ["sqrt", ["get", "n"]], Math.SQRT2, ["literal", labelAbove(2)], 20, ["literal", labelAbove(400)]] as ExpressionSpecification;

// Dans l'ordre de dessin, de bas en haut.
export function layers(): LayerSpecification[] {
  const strong = cssColour("--color-ink-strong");
  const primary = cssColour("--color-primary");
  return [
    // la région de la fiche ouverte, sous tout le reste
    { id: "region-fill", type: "fill", source: "region", paint: { "fill-color": primary, "fill-opacity": 0.06 } },
    { id: "region-line", type: "line", source: "region", paint: { "line-color": primary, "line-width": 1.5, "line-opacity": 0.6 } },
    { id: "you", type: "circle", source: "you",
      paint: { "circle-radius": 6, "circle-color": strong, "circle-stroke-color": "#fff", "circle-stroke-width": 2.5 } },
    // les plus épais par-dessus ; le halo d'un trait pâle est pâle aussi, sinon il hache les autres
    { id: "links-halo", type: "line", source: "links", layout: { "line-cap": "round", "line-sort-key": ["get", "width"] },
      paint: { "line-color": "#fff", "line-width": ["+", ["get", "width"], 2], "line-opacity": LINK_HALO } },
    { id: "links", type: "line", source: "links", layout: { "line-cap": "round", "line-sort-key": ["get", "width"] },
      paint: { "line-color": ["get", "colour"], "line-width": ["get", "width"], "line-opacity": LINK_OPACITY } },
    { id: "links-target", type: "line", source: "links", paint: { "line-color": "#000", "line-width": 12, "line-opacity": 0 } },
    // les gares : un rond blanc cerclé de gris, qui ne se confond ni avec un membre ni avec une grappe
    { id: "links-stations", type: "circle", source: "links", filter: ["==", ["geometry-type"], "Point"],
      paint: { "circle-radius": 5, "circle-color": "#fff", "circle-stroke-color": "#334155", "circle-stroke-width": 2.5 } },
    // les points cachent les noms du fond qu'ils recouvriraient (placement non ignoré)
    ...perNotchLayers("members", (i) => ({ type: "symbol", source: "members", filter: dotAt(i),
      layout: { "icon-allow-overlap": true, "icon-offset": atNotch("d", i), "icon-image": ["get", "image"], "symbol-sort-key": ["get", "dimmed"], "icon-padding": 0 },
      paint: { "icon-opacity": ["case", ["==", ["get", "dimmed"], 1], 0.25, 1] } })),
    // « Vous » cède la place au membre choisi, aux bulles et aux grappes, placés avant lui : il passe d'un autre côté de son
    // point, puis plus loin (au-delà de la plus grosse grappe) ; nulle part, il se pose dessous quand même. Les noms de
    // ville, placés après, lui cèdent la leur.
    { id: "you-name", type: "symbol", source: "you",
      layout: { "text-field": ["get", "name"], "text-font": FONT, "text-size": 12, "text-allow-overlap": true,
                "text-variable-anchor-offset": ["top", [0, 0.9], "bottom", [0, -0.9], "left", [0.9, 0], "right", [-0.9, 0],
                                                "top", [0, 2.6], "bottom", [0, -2.6], "left", [2.6, 0], "right", [-2.6, 0]] },
      paint: { "text-color": strong, "text-halo-color": "#fff", "text-halo-width": 2 } },
    // les noms de ville au-dessus de leurs membres, dès que les points sont là ; sous les grappes, qui les effacent
    ...perNotchLayers("towns", (i) => ({ type: "symbol", source: "towns",
      layout: { "text-field": ["get", "name"], "text-font": FONT, "text-size": 13, "text-anchor": "bottom", "text-offset": atNotch("t", i),
                "symbol-sort-key": ["-", 0, ["get", "n"]], "text-padding": 0 },
      paint: { "text-color": strong, "text-halo-color": "#fff", "text-halo-width": 1.6,
               "text-opacity": ["interpolate", ["linear"], ["zoom"], DOT_ZOOM, 0, DOT_ZOOM + 0.5, 1] } })),
    // les grappes : une couche par cran, comme les bulles des villes
    ...CLUSTER_ZOOMS.map((z, i): LayerSpecification => ({ id: `clusters-${z}`, type: "symbol", source: "clusters",
      filter: ["==", ["get", "notch"], i], minzoom: i === 0 ? DOT_ZOOM : z, maxzoom: z + 1,
      layout: { "icon-image": ["get", "image"], "icon-allow-overlap": true, "icon-padding": 0, "symbol-sort-key": ["-", 0, ["get", "n"]] } })),
    ...perNotchLayers("ring", (i) => ({ type: "symbol", source: "ring", filter: dotAt(i),
      layout: { "icon-allow-overlap": true, "icon-offset": atNotch("d", i), "icon-image": "ring", "icon-ignore-placement": true } })),
    // le nom du membre choisi, au-dessus de son point
    ...perNotchLayers("chosen", (i) => ({ type: "symbol", source: "chosen",
      layout: { "text-field": ["get", "name"], "text-font": FONT, "text-size": LABEL_EM, "text-anchor": "bottom",
                "text-offset": atNotch("t", i), "text-allow-overlap": true, "text-max-width": 16 },
      paint: { "text-color": strong, "text-halo-color": "#fff", "text-halo-width": 2 } })),
    ...BUBBLE_LEVELS.map((n): LayerSpecification => ({ id: `bubbles-${n}`, type: "symbol", source: "bubbles", filter: ["==", ["get", "level"], n],
      minzoom: n === BUBBLE_LEVELS[0] ? 0 : n, maxzoom: n === BUBBLE_LEVELS[BUBBLE_LEVELS.length - 1] ? DOT_ZOOM : n + 1,
      layout: { "icon-image": ["get", "image"], "icon-allow-overlap": true,
                "text-field": ["get", "name"], "text-font": FONT, "text-size": 12.5, "text-anchor": "bottom",
                "text-offset": bubbleLabelOffset, "text-optional": true, "text-padding": 3, "symbol-sort-key": ["-", 0, ["get", "n"]] },
      paint: { "text-color": strong, "text-halo-color": "#fff", "text-halo-width": 1.6 } })),
  ];
}
