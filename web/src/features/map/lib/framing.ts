// Le cadrage : que la sélection soit visible, ni sous le panneau, ni sous la fiche. Les zones de
// l'écran se lisent sur leur data-zone (voir App.tsx).
import { LngLatBounds, type LngLatLike, type Map as MapLibre, type PaddingOptions } from "maplibre-gl";
import { MOBILE } from "../../../utils/screen";
import { MEMBERS, ORG_BY_ID, PARTICIPATIONS_BY_ORG, projectOrgs } from "../../../data/dataset";
import { nearbyTowns, type Place } from "../../../data/nearby";
import { findSubject } from "../../../data/subjects";
import { townPartners } from "../../../data/towns";
import { REGION_MEMBERS } from "../../../data/adminRegions";
import type { Category } from "../../../data/types";
import { isInEast, isInOpeningExtent, maxBounds } from "./bounds";
import { km } from "../../../lib/distance";
import type { Selection } from "../../../stores/selection";
import { MUNICIPALITIES, POSITION, DOT_ZOOM, dotZoom } from "../../../data/placement";

type LngLat = [number, number];
const EMPTY = { top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 };
const zone = (name: string) => {
  const r = document.querySelector(`[data-zone="${name}"]`)?.getBoundingClientRect();
  return r && r.width ? r : EMPTY;
};
const boundsOf = (lls: LngLat[]) => lls.reduce((b, ll) => b.extend(ll), new LngLatBounds(lls[0], lls[0]));

// Le centre de la partie libre, en décalage depuis le centre de la carte. Jamais `padding` dans easeTo : MapLibre le
// garde, et chaque fitBounds suivant l'ajouterait à ses propres marges (« Voir sur la carte » restait alors au zoom minimal).
const centreOf = (m: PaddingOptions): [number, number] => [(m.left! - m.right!) / 2, (m.top! - m.bottom!) / 2];

export function margins(map: MapLibre, sheetOpen: boolean): PaddingOptions {
  const p = zone("panel"), f = zone("sheet");
  const m = MOBILE ? { top: p.bottom + 32, bottom: (sheetOpen ? f.height : 0) + 56, left: 56, right: 48 }
                   : { top: 56, bottom: 40, left: p.right + 56, right: (sheetOpen ? f.width + 16 : 0) + 80 };
  // jamais moins de 200 px de carte utile dans chaque sens : les marges rétrécissent d'autant
  const box = map.getContainer().getBoundingClientRect();
  for (const [a, b, side] of [["left", "right", box.width], ["top", "bottom", box.height]] as const) {
    const over = m[a] + m[b] - (side - 200);
    if (over > 0) { const k = over / (m[a] + m[b]); m[a] -= m[a] * k; m[b] -= m[b] * k; }
  }
  return m;
}

// Une fiche ouverte sur téléphone : la feuille couvre le bas de l'écran (plus de la moitié) ; la carte peut alors
// descendre plus au sud, la zone sans fond restant dessous (bounds.ts). Ailleurs, rien ne couvre le bas : pas de bande
// vide sous le fond, à ce zoom-ci.
export function bound(map: MapLibre, sheetOpen: boolean) {
  map.setMaxBounds(maxBounds(map.getZoom(), sheetOpen && MOBILE));
}

// L'ouverture : l'emprise des membres du Québec et des environs, sans les membres isolés (aucun autre à moins de
// ISOLATED_KM) qui tireraient le cadre vers un coin vide ; sur téléphone, le cœur du réseau (du 5e au 95e centile en
// longitude et en latitude) plutôt que tout le Québec.
const ISOLATED_KM = 200;
const EXTENT = (() => {
  const near = MEMBERS.filter((o) => isInOpeningExtent(o.lon!, o.lat!)).map((o): LngLat => [o.lon!, o.lat!]);
  let core = near.filter((p) => near.some((q) => q !== p && km(p, q) < ISOLATED_KM));
  if (MOBILE) {
    const centile = (l: number[], q: number) => l.slice().sort((a, b) => a - b)[Math.floor(q * (l.length - 1))];
    const inside = (i: 0 | 1) => { const l = core.map((p) => p[i]), lo = centile(l, 0.05), hi = centile(l, 0.95); return (p: LngLat) => p[i] >= lo && p[i] <= hi; };
    const [lonOk, latOk] = [inside(0), inside(1)];
    core = core.filter((p) => lonOk(p) && latOk(p));
  }
  return boundsOf(core);
})();
export const overview = (map: MapLibre, duration: number) =>
  map.fitBounds(EXTENT, { padding: margins(map, false), duration });

// Une bulle, une grappe : ses membres cadrés, au zoom où chacun est un point si le cadre le permet.
export function frameGroup(map: MapLibre, ids: string[]) {
  const placed = ids.filter((id) => POSITION.has(id));
  map.fitBounds(boundsOf(placed.map((id) => POSITION.get(id)!)),
    { padding: margins(map, true), maxZoom: Math.max(...placed.map(dotZoom), map.getZoom() + 1), duration: 700 });
}

// « Voir sur la carte » : les membres de la vue filtrée ; 24 px de plus, car aux zooms rapprochés un point est dessiné
// jusqu'à ~40 px de sa vraie place (DECALAGES). Ceux d'Europe ou d'ailleurs n'emportent pas le cadre.
export function frameView(map: MapLibre, ids: string[], sheetOpen: boolean) {
  const lls = ids.map((id) => POSITION.get(id)).filter((ll): ll is LngLat => Boolean(ll && isInEast(ll[0])));
  if (!lls.length) return;
  const m = margins(map, sheetOpen);
  map.fitBounds(boundsOf(lls), { padding: { top: m.top! + 24, bottom: m.bottom! + 24, left: m.left! + 24, right: m.right! + 24 },
    maxZoom: lls.length > 1 ? 8 : DOT_ZOOM + 1, duration: 600 });
}

// « Près de chez moi » : le lieu et le membre choisi pour lui.
export function frameNearMe(map: MapLibre, here: LngLat, id: string) {
  map.fitBounds(boundsOf([here, POSITION.get(id)!]), { padding: margins(map, true), maxZoom: 10, duration: 800 });
}

const withPartners = (id: string) => [id, ...(PARTICIPATIONS_BY_ORG.get(id) || []).flatMap(({ project }) => projectOrgs(project))];
// Ce que le cadrage lit de l'état : les catégories affichées, le lieu de « près de chez moi ».
export interface FrameContext { categories: Set<Category>; here: Place | null }
// Les membres ou les lieux qu'une sélection doit montrer.
function places(s: Selection, { categories, here }: FrameContext, recenter: boolean): { lls: LngLat[]; ids: string[] } {
  if (s.type === "nearby") return { ids: [], lls: here ? [[here.lon, here.lat], ...nearbyTowns(here).map(({ town }): LngLat => [town.lon, town.lat])] : [] };
  if (s.type === "link") return { ids: [], lls: [s.a, s.b] };
  const ids = s.type === "project" ? projectOrgs(s.id)
    : s.type === "subject" ? findSubject(s.id).orgs.map((o) => o.id)
    : s.type === "town" ? [...MUNICIPALITIES.get(s.id)!.ids, ...[...townPartners(s.id).values()].flatMap((l) => l.ids)]   // la ville et ses liens
    : s.type === "region" ? REGION_MEMBERS.get(s.id)!.map((o) => o.id)   // la région seule : ses liens partent vers tout le Québec
    : (s.type === "member" && recenter && !MOBILE) || s.type === "external" ? withPartners(s.id) : [s.id];
  return { ids, lls: ids.filter((id) => POSITION.has(id) && categories.has(ORG_BY_ID.get(id)!.category!) && isInEast(ORG_BY_ID.get(id)!.lon!))
    .map((id) => POSITION.get(id)!) };
}

// Le nom du membre choisi est centré sur son point (~3,6 px par lettre de chaque côté, une ligne fait au plus ~10 em) :
// sa demi-largeur s'ajoute aux marges, sinon il passe sous le panneau ou la fiche.
function withName(m: PaddingOptions, s: Selection): PaddingOptions {
  const half = s.type === "member" ? Math.min(ORG_BY_ID.get(s.id)!.name.length * 3.6, 65) : 0;
  return { ...m, left: m.left! + half, right: m.right! + half };
}

// Cadrer la sélection ; sans `recenter`, seulement si elle sort de la partie libre de la carte.
export function frame(map: MapLibre, s: Selection, context: FrameContext, recenter: boolean, stillOpen: () => boolean) {
  bound(map, true);
  const found = places(s, context, recenter), ids = found.ids;
  let lls = found.lls;
  if (!lls.length) return;
  const south = lls.filter((ll) => ll[1] < 52);   // ponytail: seuil fixe au nord du couloir habité ; à revoir si des membres s'y installent
  if (south.length && south.length < lls.length && s.type !== "link") lls = south;
  const b = boundsOf(lls), m = withName(margins(map, true), s), box = map.getContainer().getBoundingClientRect();
  const inside = [b.getSouthWest(), b.getNorthEast()].map((ll) => map.project(ll))
    .every((p) => p.x >= m.left! && p.x <= box.width - m.right! && p.y >= m.top! && p.y <= box.height - m.bottom!);
  if (!recenter && inside) return;
  // un seul membre : au moins le zoom où il est un point, pas caché dans une grappe
  const alone = s.type === "member" || s.type === "external";
  map.fitBounds(b, { padding: m, maxZoom: lls.length > 1 || !alone ? 8 : Math.max(map.getZoom(), DOT_ZOOM + 1, dotZoom(ids[0])), duration: 600 });
  if (s.type === "member" && POSITION.has(s.id)) map.once("moveend", () => {
    if (!stillOpen()) return;
    const at: LngLatLike = POSITION.get(s.id)!, q = map.project(at), mm = withName(margins(map, true), s), r = map.getContainer().getBoundingClientRect();
    if (q.x < mm.left! || q.x > r.width - mm.right! || q.y < mm.top! || q.y > r.height - mm.bottom!) map.easeTo({ center: at, offset: centreOf(mm), duration: 400 });
  });
}
