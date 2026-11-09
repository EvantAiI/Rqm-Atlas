// La hauteur du nom de chaque ville, par cran : au-dessus de ce qui est dessiné sous lui. Pur (ni DOM ni window) :
// la vue par défaut (tout le monde visible) est calculée au build (scripts/precompute.ts), les vues filtrées ici.
import { bubbleRadius, toPixels } from "../../lib/geometry";
import { municipality } from "../regions";
import { NOTCHES, LABEL_EM, DOT_RADIUS, type Cluster, type Town } from "./compute";

export type LabelHeights = Record<string, [number, number][]>;   // ville -> par cran, son text-offset en em
export interface Drawing {
  place: (id: string) => { lat: number; lon: number };
  clusterOf: (id: string) => number[];             // par cran : l'index de sa grappe, ou -1
  clusters: Cluster[][];
  offsets: (id: string) => [number, number][];     // par cran : son décalage en pixels
}

const NOTCH_SAMPLES = [0, 0.25, 0.5, 0.75, 0.99];   // cinq zooms de chaque intervalle entre deux crans

// Ce qui est dessiné pour chaque membre visible ([id, x, y, rayon] en pixels) au zoom NOTCHES[i] + s : son point (son
// décalage glisse d'un cran à l'autre) ou la grappe du cran i qui le contient.
function view(ids: string[], d: Drawing, i: number, s: number) {
  const z = NOTCHES[i] + s;
  return {
    z, drawn: ids.map((id): [string, number, number, number] => {
      const k = d.clusterOf(id)[i] ?? -1;
      if (k !== -1) {
        const g = d.clusters[i][k], q = toPixels(g.center[1], g.center[0], z);
        return [id, q.x, q.y, bubbleRadius(g.ids.length)];
      }
      const o = d.place(id), p = toPixels(o.lat, o.lon, z), l = d.offsets(id), a = l[i], b = l[Math.min(i + 1, l.length - 1)];
      return [id, p.x + a[0] + s * (b[0] - a[0]), p.y + a[1] + s * (b[1] - a[1]), DOT_RADIUS];
    }),
  };
}

export function computeLabelHeights(towns: Town[], visible: Set<string>, d: Drawing): LabelHeights {
  const ids = [...visible], views = NOTCHES.map((_, i) => NOTCH_SAMPLES.map((s) => view(ids, d, i, s)));
  const municipalities = new Map<string, string[]>();
  for (const town of towns) municipalities.set(municipality(town.name), [...(municipalities.get(municipality(town.name)) || []), ...town.ids]);
  const heights: LabelHeights = {};
  for (const town of towns) {
    if (town.ids.filter((id) => visible.has(id)).length < 2) continue;
    // au-dessus des membres de sa commune (quartiers compris) groupés autour du centre (à moins de 60 px : les adresses
    // éloignées n'y comptent pas)
    const own = new Set(municipalities.get(municipality(town.name))!.filter((id) => visible.has(id))), half = town.name.length * 3.6;
    const top = ({ drawn, z }: ReturnType<typeof view>) => {
      const c = toPixels(town.lat, town.lon, z), l = drawn.map(([id, x, y, r]) => [id, x - c.x, y - c.y, r] as const);
      let y0 = Math.min(...l.filter(([id, x, y]) => own.has(id) && Math.hypot(x, y) < 60).map(([, , y, r]) => y - r), -DOT_RADIUS) - 4;   // l'image d'une grappe déborde de 2 px
      // un voisin collé juste sous le nom (13 px de haut, ~3,6 px par lettre de chaque côté) : le nom passe au-dessus
      for (let k = 0; k < 3; k++) for (const [id, x, y, r] of l) if (!own.has(id) && Math.abs(x) < half + r && y + r > y0 - 15 && y - r < y0) y0 = y - r - 4;
      return y0;
    };
    // le nom change de hauteur d'un cran à l'autre (palier) : au plus haut de ce qu'il faut sur tout l'intervalle
    heights[town.name] = views.map((l) => [0, Math.round((Math.min(...l.map(top)) / LABEL_EM) * 1000) / 1000]);
  }
  return heights;
}
