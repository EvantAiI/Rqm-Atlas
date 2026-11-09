// Ce que la page lit de l'écran : téléphone ou non, mouvement réduit ou non, et les couleurs de styles/index.css
// (une seule source) pour ce qui se dessine hors du DOM (la carte, ses toiles). Les couleurs se lisent au moment du
// dessin, jamais à l'import : la feuille de style est alors chargée.
export const PHONE_QUERY = "(max-width: 900px)";   // le même seuil que la variante `phone:` de Tailwind
export const MOBILE = matchMedia(PHONE_QUERY).matches;
export const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;

const colours = new Map<string, string>();
// cssColour("--color-primary") -> "#007199"
export function cssColour(name: string) {
  if (!colours.has(name)) colours.set(name, getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  return colours.get(name)!;
}
