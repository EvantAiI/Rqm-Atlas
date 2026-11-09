// Les sources et les couches du réseau, posées sur le fond. Rien que des descriptions : les données viennent des effets.
import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { cssColour } from "../../../utils/screen";
import { bubbleRadius } from "../../../lib/geometry";
import { NOTCHES, LABEL_EM, BUBBLE_LEVELS, DOT_ZOOM } from "../../../data/placement";

export const clusterSource = (z: number) => `clusters-${z}`;
export const bubbleSource = (n: number) => `bubbles-${n}`;
export const CLUSTER_ZOOMS = NOTCHES.slice(0, -1);   // au dernier cran, plus aucune grappe
export const SOURCES = ["region", "links", "members", "ring", "towns", "chosen", "you", ...BUBBLE_LEVELS.map(bubbleSource), ...CLUSTER_ZOOMS.map(clusterSource)];
// Ce qu'un clic ou un survol peut viser : les points, les bulles des villes, les grappes.
export const CLICKABLE = ["members", ...BUBBLE_LEVELS.map(bubbleSource), ...CLUSTER_ZOOMS.map(clusterSource)];

// La propriété `key` (un nombre par cran) prise au cran du zoom courant. Pas de seuil à DOT_ZOOM ici : une expression de
// zoom ET de donnée n'est évaluée qu'aux zooms entiers, un seuil à 6,5 y vaudrait 0 jusqu'au zoom 7 ; la couche a son minzoom.
const perNotch = (key: string, factor: unknown = 1) => ["step", ["zoom"], ["*", factor, ["at", 0, ["get", key]]],
  ...NOTCHES.slice(1).flatMap((z, i) => [z, ["*", factor, ["at", i + 1, ["get", key]]]])] as ExpressionSpecification;
// La propriété `key` (un [x, y] par cran) suivie d'un cran à l'autre.
const alongZoom = (key: string) => ["interpolate", ["linear"], ["zoom"],
  ...NOTCHES.flatMap((z, i) => [z, ["array", "number", 2, ["at", i, ["get", key]]]])] as ExpressionSpecification;
// La propriété `key` au cran i, sans zoom : une couche par cran. Un décalage de texte qui dépend du zoom ET de la donnée
// est dessiné à la valeur du cran suivant mais heurte les autres noms à celle du cran courant : deux noms se chevauchent.
const atNotch = (key: string, i: number) => ["array", "number", 2, ["at", i, ["get", key]]] as ExpressionSpecification;
// Une couche par cran, de NOTCHES[i] au cran suivant (la première dès DOT_ZOOM).
const perNotchLayers = (id: string, layer: (i: number) => Omit<LayerSpecification, "id" | "minzoom" | "maxzoom">) =>
  NOTCHES.map((z, i) => ({ ...layer(i), id: `${id}-${z}`, minzoom: i === 0 ? DOT_ZOOM : z, maxzoom: z + 1 }) as LayerSpecification);
const FONT = ["Noto Sans Medium"];
// Le nom d'une bulle, juste au-dessus d'elle : (rayon + 3 px) / 12,5 px, en em. Le rayon est linéaire en √n (bubbleRadius)
// dès deux membres : l'interpolation entre deux tailles le suit exactement (une bulle d'un membre n'a pas de nom).
const labelAbove = (n: number): [number, number] => [0, -(bubbleRadius(n) + 3) / 12.5];
const bubbleLabelOffset = ["interpolate", ["linear"], ["sqrt", ["get", "n"]], Math.SQRT2, ["literal", labelAbove(2)], 20, ["literal", labelAbove(400)]] as ExpressionSpecification;

// Dans l'ordre de dessin, de bas en haut.
export function layers(): LayerSpecification[] {
  const strong = cssColour("--color-ink-strong");
  const placed = { "icon-allow-overlap": true, "icon-offset": alongZoom("d") };
  const primary = cssColour("--color-primary");
  return [
    // la région de la fiche ouverte, sous tout le reste
    { id: "region-fill", type: "fill", source: "region", paint: { "fill-color": primary, "fill-opacity": 0.06 } },
    { id: "region-line", type: "line", source: "region", paint: { "line-color": primary, "line-width": 1.5, "line-opacity": 0.6 } },
    { id: "you", type: "circle", source: "you",
      paint: { "circle-radius": 6, "circle-color": strong, "circle-stroke-color": "#fff", "circle-stroke-width": 2.5 } },
    { id: "links-halo", type: "line", source: "links", layout: { "line-cap": "round" },
      paint: { "line-color": "#fff", "line-width": ["+", ["get", "width"], 2], "line-opacity": 0.7 } },
    { id: "links", type: "line", source: "links", layout: { "line-cap": "round" },
      paint: { "line-color": ["get", "colour"], "line-width": ["get", "width"], "line-opacity": ["get", "opacity"] } },
    { id: "links-target", type: "line", source: "links", paint: { "line-color": "#000", "line-width": 12, "line-opacity": 0 } },
    // les points cachent les noms du fond qu'ils recouvriraient (placement non ignoré)
    { id: "members", type: "symbol", source: "members", minzoom: DOT_ZOOM,
      layout: { ...placed, "icon-image": ["get", "image"], "symbol-sort-key": ["get", "dimmed"], "icon-padding": 0 },
      paint: { "icon-opacity": perNotch("v", ["case", ["==", ["get", "dimmed"], 1], 0.25, 1]) } },
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
    ...CLUSTER_ZOOMS.map((z, i): LayerSpecification => ({ id: clusterSource(z), type: "symbol", source: clusterSource(z),
      minzoom: i === 0 ? DOT_ZOOM : z, maxzoom: z + 1,
      layout: { "icon-image": ["get", "image"], "icon-allow-overlap": true, "icon-padding": 0, "symbol-sort-key": ["-", 0, ["get", "n"]] } })),
    { id: "ring", type: "symbol", source: "ring", minzoom: DOT_ZOOM,
      layout: { ...placed, "icon-image": "ring", "icon-ignore-placement": true }, paint: { "icon-opacity": perNotch("v") } },
    // le nom du membre choisi, au-dessus de son point
    ...perNotchLayers("chosen", (i) => ({ type: "symbol", source: "chosen",
      layout: { "text-field": ["get", "name"], "text-font": FONT, "text-size": LABEL_EM, "text-anchor": "bottom",
                "text-offset": atNotch("t", i), "text-allow-overlap": true, "text-max-width": 16 },
      paint: { "text-color": strong, "text-halo-color": "#fff", "text-halo-width": 2 } })),
    ...BUBBLE_LEVELS.map((n): LayerSpecification => ({ id: bubbleSource(n), type: "symbol", source: bubbleSource(n),
      minzoom: n === BUBBLE_LEVELS[0] ? 0 : n, maxzoom: n === BUBBLE_LEVELS[BUBBLE_LEVELS.length - 1] ? DOT_ZOOM : n + 1,
      layout: { "icon-image": ["get", "image"], "icon-allow-overlap": true,
                "text-field": ["get", "name"], "text-font": FONT, "text-size": 12.5, "text-anchor": "bottom",
                "text-offset": bubbleLabelOffset, "text-optional": true, "text-padding": 3, "symbol-sort-key": ["-", 0, ["get", "n"]] },
      paint: { "text-color": strong, "text-halo-color": "#fff", "text-halo-width": 1.6 } })),
  ];
}
