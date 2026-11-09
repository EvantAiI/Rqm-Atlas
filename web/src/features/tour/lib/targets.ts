// Ce que la visite éclaire : des morceaux de page tenus par d'autres parties, trouvés par leurs attributs stables
// (data-zone, data-tour), en coordonnées de la fenêtre.
import { BUBBLE_OF, DOT_ZOOM, bubbleLevel } from "../../../data/placement";
import { useMapStore } from "../../../stores/mapStore";
import { bubbleRadius } from "../../../lib/geometry";
import { MOBILE } from "../../../utils/screen";

export interface Rect { left: number; top: number; right: number; bottom: number; width: number; height: number }

const rect = (left: number, top: number, right: number, bottom: number): Rect =>
  ({ left, top, right, bottom, width: right - left, height: bottom - top });

// Un élément absent ou caché (largeur nulle) : pas de cible, la bulle se pose au centre.
export const rectOf = (selector: string): Rect | null => {
  const r = document.querySelector(selector)?.getBoundingClientRect();
  return r && r.width ? r : null;
};

// Le champ et sa liste de suggestions, qui flotte sous lui : le trou les éclaire ensemble.
export const around = (a: Rect | null, b: Rect | null): Rect | null =>
  (a && b ? rect(Math.min(a.left, b.left), Math.min(a.top, b.top), Math.max(a.right, b.right), Math.max(a.bottom, b.bottom)) : a ?? b);

// La carte hors du panneau : à droite sur ordinateur, fiche comprise ; sur téléphone, entre le panneau et la fiche.
export function mapZone(): Rect {
  const p = document.querySelector('[data-zone="panel"]')?.getBoundingClientRect(), m = 10;
  return MOBILE ? rect(m, (p?.bottom ?? 0) + m, innerWidth - m, (rectOf('[data-zone="sheet"]')?.top ?? innerHeight) - m)
    : rect((p?.right ?? 0) + m, m, innerWidth - m, innerHeight - m);
}

// La bulle où est dessiné un membre, son chiffre compris (null aux zooms des points).
export function bubbleOf(id: string): Rect | null {
  const map = useMapStore.getState().map;
  if (!map || map.getZoom() >= DOT_ZOOM) return null;
  const g = BUBBLE_OF.get(bubbleLevel(map.getZoom()))?.get(id);
  if (!g) return null;
  const p = map.project(g.center), c = map.getCanvas().getBoundingClientRect(), r = bubbleRadius(g.ids.length) + 4;
  return rect(c.left + p.x - r, c.top + p.y - r - 16, c.left + p.x + r, c.top + p.y + r);
}
