import { AXIS_BY_CODE, DATA } from "./dataset";
import { cssColour } from "../utils/screen";

// Un axe se montre par son nom court et sa couleur, jamais par son code. Sa couleur, assombrie juste assez pour un
// texte blanc (≥ 4,6:1), sauf si elle est assez claire pour garder un texte sombre (LIGHT_AXIS_COLOURS).
const luminance = (hex: string) => {
  const lum = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const l = [1, 3, 5].map((i) => lum(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
export const LIGHT_AXIS_COLOURS = new Set(DATA.axes.map((a) => a.color.toUpperCase()).filter((hex) => {
  const L = luminance(hex);
  return (L + 0.05) / 0.081 >= 4.5 && 1.05 / (L + 0.05) < 4.5;   // le texte sombre #303133 (L ≈ 0,031) se lit, le blanc non
}));
export function readableColour(hex: string) {
  if (LIGHT_AXIS_COLOURS.has(hex.toUpperCase())) return hex;
  for (let k = 1; k > 0.3; k -= 0.02) {
    const rgb = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k));
    const l = luminance(`#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`);
    if (1.05 / (l + 0.05) >= 4.6) return `rgb(${rgb.join(",")})`;
  }
  return hex;
}

// La couleur d'un axe sur la carte ; un code inconnu prend la couleur du RQM.
export const axisColour = (code: string) => AXIS_BY_CODE.get(code)?.color || cssColour("--color-primary");
// L'axe qui compte le plus de projets (axe -> ses projets).
export const dominantAxis = (byAxis: Map<string, Set<string>>) => [...byAxis].sort((x, y) => y[1].size - x[1].size)[0][0];
