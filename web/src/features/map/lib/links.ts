// Les liens, en arcs : la couleur dit l'axe des projets partagés, l'épaisseur leur nombre. Chaque bout tombe sur ce qui
// est dessiné au zoom courant (drawnAt). Deux bouts sur le même dessin ne font pas d'arc ; des arcs aux mêmes bouts n'en
// font qu'un. En deux temps : le plan (qui relie qui) ne change qu'avec l'état et le cran de dessin ; la géométrie suit
// le zoom. Un planificateur par sorte de sélection (PLANNERS), la vue d'ensemble sans sélection.
import type { Feature, FeatureCollection } from "geojson";
import { plural } from "../../../utils/format";
import { ROLE_LABELS } from "../../../data/categories";
import { axisColour, dominantAxis } from "../../../data/axes";
import { AXIS_BY_CODE, DATA, ORG_BY_ID, PARTICIPATIONS_BY_ORG, PARTICIPANTS_BY_PROJECT, PROJECT_BY_ID, orgTown, projectCount, projectOrgs } from "../../../data/dataset";
import { linkLabel } from "../../../data/links";
import { MUNICIPALITIES, TOWN_BY_NAME, DOT_ZOOM, bubbleLevel, notchOf, drawnAt } from "../../../data/placement";
import { findSubject } from "../../../data/subjects";
import { townPartners } from "../../../data/towns";
import { REGION_MEMBERS, regionPartners } from "../../../data/adminRegions";
import { getOrCreate } from "../../../lib/collections";
import { arc, toPixels } from "../../../lib/geometry";
import { touchesAxis } from "../../../lib/projects";
import type { FiltersSlice } from "../../../stores/app/filtersSlice";
import type { Selection } from "../../../stores/selection";
import { shownProjects } from "../../../stores/selectors";
import { isOnArcMap } from "./bounds";

type LngLat = [number, number];
export interface LinkInput extends Pick<FiltersSlice, "showCollaborations" | "tab" | "memberAxis" | "memberMainOnly" | "projectFilters"> {
  selection: Selection | null;
  sheetProjects: Set<string> | null;   // la fiche d'une organisation filtrée par axe : seuls ces projets
  visible: Set<string>;
}
export interface TooltipLine { t: string; src?: boolean; bold?: boolean }
type End = string | LngLat;   // un membre, là où il est dessiné ; ou un lieu fixe
// Ce qu'un clic sur l'arc ouvre : la fiche « lien » (ses bouts sont ajoutés au dessin).
export interface ArcLink { from: string[]; to: string[]; projects: string[]; colour: string }
export interface PlannedArc { a: End; b: End; k: number; colour: string; width: number; opacity?: number; text: TooltipLine[]; link?: ArcLink }
// Un faisceau : des projets entre deux bouts, par axe ; from / to le nomment.
interface Bundle { a: string; b: string; from: string; to: string; byAxis: Map<string, Set<string>> }
interface Merged { a: string; b: string; from: string[]; to: string[]; byAxis: Map<string, Set<string>>; total: number }
// Ce que chaque planificateur sait du dessin : le zoom, les membres affichés.
interface Drawing { z: number; visible: Set<string> }

// Le cran de dessin : sous DOT_ZOOM, le niveau des bulles ; au-dessus, le cran des points et des grappes.
export const drawKey = (z: number) => (z < DOT_ZOOM ? `b${bubbleLevel(z)}` : `c${notchOf(z)}`);

const addTo = <K, V>(m: Map<K, Set<V>>, key: K, value: V) => getOrCreate(m, key, () => new Set<V>()).add(value);
const sizes = (bundles: Merged[]) => bundles.flatMap((b) => [...b.byAxis.values()].map((l) => l.size));
const shortName = (id: string) => ORG_BY_ID.get(id)!.acronym || ORG_BY_ID.get(id)!.name;
const drawn = (id: string, z: number) => String(drawnAt(id, z));

// Le bout « ville » : celui des membres `ids` qui a le plus de projets (à égalité, le plus central).
function towardTown(town: string, ids: string[], z: number) {
  const center = TOWN_BY_NAME.get(town) || MUNICIPALITIES.get(town)!, c = toPixels(center.lat, center.lon, z);
  const far = (id: string) => { const o = ORG_BY_ID.get(id)!, p = toPixels(o.lat!, o.lon!, z); return Math.hypot(p.x - c.x, p.y - c.y); };
  return ids.reduce((m, id) => (projectCount(id) > projectCount(m) || (projectCount(id) === projectCount(m) && far(id) < far(m)) ? id : m));
}

// Les mêmes faisceaux, fusionnés par bouts dessinés ; `unordered` : a -> b et b -> a sont le même.
function merge(bundles: Bundle[], z: number, unordered = false): Merged[] {
  const m = new Map<string, { a: string; b: string; from: Set<string>; to: Set<string>; byAxis: Map<string, Set<string>> }>();
  for (const x of bundles) {
    let { a, b, from, to } = x, [ka, kb] = [drawn(a, z), drawn(b, z)];
    if (ka === kb) continue;
    if (unordered && ka > kb) [a, b, from, to, ka, kb] = [b, a, to, from, kb, ka];
    const y = getOrCreate(m, `${ka}|${kb}`, () => ({ a, b, from: new Set<string>(), to: new Set<string>(), byAxis: new Map<string, Set<string>>() }));
    y.from.add(from); y.to.add(to);
    for (const [axis, projects] of x.byAxis) for (const p of projects) addTo(y.byAxis, axis, p);
  }
  return [...m.values()].map((x) => ({ ...x, from: [...x.from], to: [...x.to], total: [...x.byAxis.values()].reduce((t, l) => t + l.size, 0) }));
}

const linkOf = (x: Merged, colour: string): ArcLink => ({ from: x.from, to: x.to, colour, projects: [...new Set([...x.byAxis.values()].flatMap((l) => [...l]))] });

// Un arc fin par axe, du plus fourni au moins fourni.
function perAxis(bundles: Merged[], k0: number): PlannedArc[] {
  const max = Math.max(1, ...sizes(bundles));
  return bundles.flatMap((x) => [...x.byAxis].sort((u, v) => v[1].size - u[1].size).map(([axis, projects], i) => ({
    a: x.a, b: x.b, k: k0 + 0.06 * i, colour: axisColour(axis), width: 1.2 + 3.3 * Math.sqrt(projects.size / max), link: linkOf(x, axisColour(axis)),
    text: [{ t: linkLabel(x.from, x.to) }, { t: plural(projects.size, "projet"), src: true }, { t: AXIS_BY_CODE.get(axis)!.short, src: true }] })));
}

// Les participants affichés d'un projet, dans une ville connue.
const shownParticipants = (project: string, visible: Set<string>, except?: string) => projectOrgs(project)
  .filter((id) => id !== except && visible.has(id) && TOWN_BY_NAME.has(orgTown(id)));

// Le pissenlit d'un projet : de chaque porteur vers chaque autre participant affiché.
function planProject(s: Selection, _: LinkInput, { z, visible }: Drawing): PlannedArc[] {
  const arcs: PlannedArc[] = [], p = PROJECT_BY_ID.get(s.id)!, seen = new Map<string, PlannedArc>();
  const parts = (PARTICIPANTS_BY_PROJECT.get(s.id) || []).filter((x) => visible.has(x.org));
  for (const lead of parts.filter((x) => x.role === "principal")) for (const x of parts) {
    const a = drawn(lead.org, z), b = drawn(x.org, z), key = `${a}|${b}`;
    if (x.org === lead.org || a === b) continue;
    const text = [{ t: ORG_BY_ID.get(x.org)!.name }, { t: ROLE_LABELS[x.role], src: true }, { t: orgTown(x.org), src: true }];
    const same = seen.get(key);
    if (same) { same.text.push(...text); continue; }
    const planned = { a: lead.org, b: x.org, k: 0.1, colour: axisColour(p.axis), width: 2, text };
    arcs.push(planned); seen.set(key, planned);
  }
  return arcs;
}

// La fiche d'un membre : vers chaque ville où sont ses partenaires de projet (ceux de l'axe choisi dans la fiche).
function planMember(s: Selection, input: LinkInput, { z, visible }: Drawing): PlannedArc[] {
  if (!visible.has(s.id)) return [];
  const o = ORG_BY_ID.get(s.id)!, byTown = new Map<string, Map<string, Set<string>>>(), partners = new Map<string, Set<string>>();
  for (const { project } of PARTICIPATIONS_BY_ORG.get(s.id) || []) {
    if (input.sheetProjects && !input.sheetProjects.has(project)) continue;
    for (const id of shownParticipants(project, visible, s.id)) {
      const town = orgTown(id);
      if (town === o.town) continue;
      addTo(getOrCreate(byTown, town, () => new Map<string, Set<string>>()), PROJECT_BY_ID.get(project)!.axis, project); addTo(partners, town, id);
    }
  }
  return perAxis(merge([...byTown].map(([town, byAxis]) => ({ a: s.id, b: towardTown(town, [...partners.get(town)!], z), from: shortName(s.id), to: town, byAxis })), z), 0.08);
}

// Une ville : vers chaque ville où ses membres ont des partenaires de projet.
function planTown(s: Selection, _: LinkInput, { z, visible }: Drawing): PlannedArc[] {
  const here = MUNICIPALITIES.get(s.id)!.ids.filter((id) => visible.has(id)), shown = (ids: string[]) => ids.filter((id) => visible.has(id));
  if (!here.length) return [];
  return perAxis(merge([...townPartners(s.id)].filter(([town]) => MUNICIPALITIES.has(town)).map(([town, l]) => ({
    a: towardTown(s.id, here, z), b: towardTown(town, shown(l.ids).length ? shown(l.ids) : l.ids, z), from: s.id, to: town, byAxis: l.byAxis })), z), 0.08);
}

// Une région : de son membre le plus actif vers celui de chaque région où ses membres ont des partenaires de projet.
// Sans fiche « lien » au clic : un trait entre deux régions n'a pas d'adresse.
function planRegion(s: Selection, _: LinkInput, { z, visible }: Drawing): PlannedArc[] {
  const mostActive = (ids: string[]) => ids.reduce((m, id) => (projectCount(id) > projectCount(m) ? id : m));
  const here = REGION_MEMBERS.get(s.id)!.map((o) => o.id).filter((id) => visible.has(id));
  if (!here.length) return [];
  const bundles = [...regionPartners(s.id)].map(([other, l]) => {
    const byAxis = new Map<string, Set<string>>(), shown = l.ids.filter((id) => visible.has(id));
    for (const p of l.projects) addTo(byAxis, PROJECT_BY_ID.get(p)!.axis, p);
    return { a: mostActive(here), b: mostActive(shown.length ? shown : l.ids), from: s.id, to: other, byAxis };
  });
  return perAxis(merge(bundles, z), 0.08).map((x) => ({ ...x, link: undefined }));
}

// Un sujet : de chaque porteur vers les autres membres de ses projets sur ce sujet, un arc par paire de bouts et par axe.
function planSubject(s: Selection, _: LinkInput, { z, visible }: Drawing): PlannedArc[] {
  const bundles: Bundle[] = [];
  for (const p of findSubject(s.id).projects) {
    const parts = (PARTICIPANTS_BY_PROJECT.get(p.id) || []).filter((x) => visible.has(x.org));
    for (const lead of parts.filter((x) => x.role === "principal")) for (const x of parts) {
      if (x.org !== lead.org) bundles.push({ a: lead.org, b: x.org, from: shortName(lead.org), to: shortName(x.org), byAxis: new Map([[p.axis, new Set([p.id])]]) });
    }
  }
  return perAxis(merge(bundles, z, true), 0.1);
}

// Un lien ouvert : son trait seul, épais.
function planLink(s: Selection): PlannedArc[] {
  return s.type === "link" ? [{ a: s.a, b: s.b, k: 0.12, colour: s.colour, width: 5, opacity: 0.9, text: [{ t: s.id }] }] : [];
}

// La vue d'ensemble : les 25 paires (de villes, ou de bulles aux zooms éloignés) qui partagent le plus de projets, de
// l'axe choisi s'il y en a un.
export function planOverview(input: LinkInput, { z, visible }: Drawing): PlannedArc[] {
  const pairs = new Map<string, Map<string, Set<string>>>(), members = new Map<string, Set<string>>(), tab = input.tab;
  for (const p of tab === "projects" ? shownProjects(input) : DATA.projects) {
    if (tab === "members" && !touchesAxis(p, input.memberAxis, input.memberMainOnly)) continue;
    const ids = shownParticipants(p.id, visible), towns = [...new Set(ids.map(orgTown))].sort();
    for (const id of ids) addTo(members, orgTown(id), id);
    const axis = (tab === "members" ? input.memberAxis : input.projectFilters.axis) || p.axis;
    for (let i = 0; i < towns.length; i++) for (let j = i + 1; j < towns.length; j++) {
      addTo(getOrCreate(pairs, `${towns[i]}\u0000${towns[j]}`, () => new Map<string, Set<string>>()), axis, p.id);
    }
  }
  const bundles = merge([...pairs].map(([key, byAxis]) => {
    const [a, b] = key.split("\u0000");
    return { a: towardTown(a, [...members.get(a)!], z), b: towardTown(b, [...members.get(b)!], z), from: a, to: b, byAxis };
  }), z, true).sort((x, y) => y.total - x.total).slice(0, 25);
  const max = Math.max(1, ...bundles.map((x) => x.total));
  return bundles.map((x) => {
    const colour = axisColour(dominantAxis(x.byAxis));
    return { a: x.a, b: x.b, k: 0.12, colour, width: 1.2 + 4.3 * Math.sqrt(x.total / max), opacity: 0.8, link: linkOf(x, colour),
      text: [{ t: linkLabel(x.from, x.to), bold: true }, { t: `${plural(x.total, "projet")} en commun`, src: true }] };
  });
}

type Planner = (s: Selection, input: LinkInput, drawing: Drawing) => PlannedArc[];
const PLANNERS: Partial<Record<Selection["type"], Planner>> = {
  project: planProject, member: planMember, town: planTown, region: planRegion, subject: planSubject, link: planLink,
};

export function plan(input: LinkInput, z: number): PlannedArc[] {
  const s = input.selection, drawing = { z, visible: input.visible };
  if (!s) return input.showCollaborations ? planOverview(input, drawing) : [];
  return PLANNERS[s.type]?.(s, input, drawing) ?? [];
}

const at = (e: End, z: number) => (typeof e === "string" ? drawnAt(e, z) : e);

// Les bouts de chaque arc au zoom z : si rien n'a bougé depuis la dernière fois, la source n'a pas à changer.
export const endsKey = (arcs: PlannedArc[], z: number) => arcs.map((x) => `${at(x.a, z)}|${at(x.b, z)}`).join(";");

export function geometry(arcs: PlannedArc[], z: number): FeatureCollection {
  const features: Feature[] = [];
  for (const x of arcs) {
    const a = at(x.a, z), b = at(x.b, z);
    // un membre hors des limites de la carte (Vancouver, Montpellier) : pas d'arc qu'on ne pourrait pas suivre
    if (!isOnArcMap(a) || !isOnArcMap(b)) continue;
    features.push({ type: "Feature", geometry: { type: "LineString", coordinates: arc(a, b, x.k) },
      properties: { opacity: x.opacity ?? 0.85, colour: x.colour, width: x.width, text: JSON.stringify(x.text),
                    ...(x.link && { link: JSON.stringify({ ...x.link, ends: [a, b] }) }) } });
  }
  return { type: "FeatureCollection", features };
}
