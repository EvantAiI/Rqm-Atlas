// Les liens, en arcs : la couleur dit l'axe des projets partagés, l'épaisseur leur nombre. Entre deux villes, une seule
// ligne, de gare à gare ; chaque acteur (ou grappe) dessiné n'est relié qu'une fois à la gare de sa ville, par un rayon.
// Ailleurs (la fiche d'un membre, d'un projet, d'un sujet), chaque bout tombe sur ce qui est dessiné au zoom courant
// (drawnAt) ; deux bouts sur le même dessin ne font pas d'arc, des arcs aux mêmes bouts n'en font qu'un.
// En deux temps : le plan (qui relie qui) ne change qu'avec l'état et le cran de dessin ; la géométrie suit le zoom. Un
// planificateur par sorte de sélection (PLANNERS), la vue d'ensemble sans sélection.
import type { Feature, FeatureCollection } from "geojson";
import { joinWithAnd, plural } from "../../../utils/format";
import { ROLE_LABELS } from "../../../data/categories";
import { axisColour, dominantAxis } from "../../../data/axes";
import { AXIS_BY_CODE, DATA, ORG_BY_ID, PARTICIPATIONS_BY_ORG, PARTICIPANTS_BY_PROJECT, PROJECT_BY_ID, orgTown, projectOrgs, starPartners } from "../../../data/dataset";
import { endLabel, linkLabel } from "../../../data/links";
import { MUNICIPALITIES, TOWN_BY_NAME, DOT_ZOOM, bubbleLevel, notchOf, drawnAt } from "../../../data/placement";
import { findSubject } from "../../../data/subjects";
import { municipality } from "../../../data/regions";
import { REGION_MEMBERS, orgRegion } from "../../../data/adminRegions";
import { getOrCreate } from "../../../lib/collections";
import { arc, fromPixels, lanes, shift, toPixels } from "../../../lib/geometry";
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
// Un bout de faisceau : les membres d'un même point dessiné (un acteur, une grappe), leurs partenaires d'en face et leurs
// projets dans le faisceau.
export interface Twig { ids: string[]; partners: string[]; projects: string[] }
// Un faisceau : de chaque côté, sa gare (la commune, à tous les zooms), ses brindilles et le nom du côté d'en face.
export interface Fanned { stations: [string, string]; sides: [Twig[], Twig[]]; names: [string, string] }
// Un arc ; avec `fan`, un faisceau, dont `width` est la ligne de gare à gare et dont a et b ne servent plus qu'à le nommer.
export interface PlannedArc { a: End; b: End; k: number; colour: string; width: number; opacity?: number; text: TooltipLine[]; link?: ArcLink;
                              fan?: Fanned }
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

// Un lien d'acteur à acteur sur un projet, nommé par leurs villes (ou par `from` pour le membre d'une fiche).
const pair = (a: string, b: string, project: string, axis = PROJECT_BY_ID.get(project)!.axis, from = orgTown(a)): Bundle =>
  ({ a, b, from, to: orgTown(b), byAxis: new Map([[axis, new Set([project])]]) });

// Dans une fiche, chaque membre de `here` vers chaque membre affiché, hors de `here`, à qui un projet le relie (en étoile).
function partnersOf(here: string[], outside: (id: string) => boolean, visible: Set<string>, projects?: Set<string> | null, from?: (id: string) => string) {
  const links: Bundle[] = [];
  for (const id of here) for (const { project } of PARTICIPATIONS_BY_ORG.get(id) || []) {
    if (projects && !projects.has(project)) continue;
    const star = new Set(starPartners(id, project));
    for (const other of shownParticipants(project, visible, id)) if (star.has(other) && outside(other)) links.push(pair(id, other, project, undefined, from?.(id)));
  }
  return links;
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

const linkOf = (x: Pick<Merged, "from" | "to" | "byAxis">, colour: string): ArcLink => ({ from: x.from, to: x.to, colour, projects: [...new Set([...x.byAxis.values()].flatMap((l) => [...l]))] });

// Un arc fin par axe, du plus fourni au moins fourni.
function perAxis(bundles: Merged[], k0: number): PlannedArc[] {
  const max = Math.max(1, ...sizes(bundles));
  return bundles.flatMap((x) => [...x.byAxis].sort((u, v) => v[1].size - u[1].size).map(([axis, projects], i) => ({
    a: x.a, b: x.b, k: k0 + 0.06 * i, colour: axisColour(axis), width: 1.2 + 3.3 * Math.sqrt(projects.size / max), link: linkOf(x, axisColour(axis)),
    text: [{ t: linkLabel(x.from, x.to) }, { t: plural(projects.size, "projet"), src: true }, { t: AXIS_BY_CODE.get(axis)!.short, src: true }] })));
}

// Les deux côtés d'un faisceau : les communes, à tous les zooms. Une bulle tient parfois plusieurs villes ; grouper les
// liens par bulle en cacherait (ceux d'une ville à l'autre de la bulle) et les ferait réapparaître en zoomant.
const sideOf = (id: string) => municipality(orgTown(id));
interface Point { ids: string[]; partners: Set<string>; projects: Set<string> }
interface Fan { stations: [string, string]; sides: [Map<string, Point>, Map<string, Point>]; from: string[]; to: string[]; byAxis: Map<string, Set<string>>; total: number }

// Les liens d'acteur à acteur, rangés en faisceaux de côté à côté ; de chaque côté, un point par dessin (acteur ou grappe).
// `unordered` : a -> b et b -> a sont le même ; sinon le côté de a (la fiche ouverte) se nomme en premier. Deux acteurs
// d'une même ville font un faisceau d'un côté au même : pas d'arc, mais chacun a son rayon, reliés par leur gare.
function gather(bundles: Bundle[], z: number, unordered: boolean): Fan[] {
  const m = new Map<string, { stations: [string, string]; sides: [Map<string, Point>, Map<string, Point>]; from: Set<string>; to: Set<string>; byAxis: Map<string, Set<string>> }>();
  for (const x of bundles) {
    let { a, b, from, to } = x, [sa, sb] = [sideOf(a), sideOf(b)];
    if (unordered && sa > sb) [a, b, from, to, sa, sb] = [b, a, to, from, sb, sa];
    const f = getOrCreate(m, `${sa}|${sb}`, () => ({ stations: [sa, sb] as [string, string], sides: [new Map(), new Map()] as Fan["sides"], from: new Set<string>(), to: new Set<string>(), byAxis: new Map<string, Set<string>>() }));
    f.from.add(from); f.to.add(to);
    const ends = [a, b].map((id, i) => {
      const point = getOrCreate(f.sides[i], drawn(id, z), () => ({ ids: [], partners: new Set<string>(), projects: new Set<string>() }));
      if (!point.ids.includes(id)) point.ids.push(id);
      point.partners.add(i ? a : b);
      return point;
    });
    for (const [axis, projects] of x.byAxis) for (const p of projects) { addTo(f.byAxis, axis, p); ends.forEach((e) => e.projects.add(p)); }
  }
  return [...m.values()].map((f) => ({ ...f, from: [...f.from], to: [...f.to], total: [...f.byAxis.values()].reduce((t, l) => t + l.size, 0) }))
    .sort((x, y) => y.total - x.total);
}

const pointName = (ids: string[]) => (ids.length > 2 ? `${shortName(ids[0])} et ${ids.length - 1} autres` : joinWithAnd(ids.map(shortName)));
const together = (n: number) => `${plural(n, "projet")} en commun`;

// Un faisceau planifié : l'épaisseur de la ligne dit tous ses projets ; ses rayons se calculent au dessin.
interface FanStyle { unordered?: boolean; k: number; colour?: string; opacity?: number; base: number; gain: number; max: number; clickable: boolean }
function fanArc(f: Fan, { k, colour = axisColour(dominantAxis(f.byAxis)), opacity, base, gain, max, clickable }: FanStyle): PlannedArc {
  const sides = f.sides.map((side) => [...side.values()].map((p) => ({ ids: p.ids, partners: [...p.partners], projects: [...p.projects] }))) as Fanned["sides"];
  return { a: sides[0][0].ids[0], b: sides[1][0].ids[0], k, colour, width: base + gain * Math.sqrt(f.total / max), opacity,
           fan: { stations: f.stations, sides, names: [endLabel(f.to), endLabel(f.from)] },
           text: [{ t: linkLabel(f.from, f.to), bold: true }, { t: together(f.total), src: true }], ...(clickable && { link: linkOf(f, colour) }) };
}
// L'épaisseur se mesure au plus fourni des arcs (un faisceau dans une seule ville n'en dessine pas).
const fans = (bundles: Bundle[], z: number, style: Omit<FanStyle, "max">) => {
  const all = gather(bundles, z, Boolean(style.unordered)), max = Math.max(1, ...all.filter((f) => f.stations[0] !== f.stations[1]).map((f) => f.total));
  return all.map((f) => fanArc(f, { ...style, max }));
};
const SHEET: Omit<FanStyle, "max"> = { k: 0.08, base: 1.2, gain: 4.3, clickable: true };

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

// La fiche d'un membre : un arc direct de son point vers chacun de ses partenaires de projet, en étoile (ceux de l'axe
// choisi dans la fiche), de sa ville comme d'ailleurs, sans gare ; des partenaires dessinés au même endroit (une grappe)
// n'en font qu'un.
function planMember(s: Selection, input: LinkInput, { z, visible }: Drawing): PlannedArc[] {
  if (!visible.has(s.id)) return [];
  const links = partnersOf([s.id], (id) => id !== s.id, visible, input.sheetProjects, shortName).map((x) => ({ ...x, to: shortName(x.b) }));
  const merged = merge(links, z), max = Math.max(1, ...merged.map((x) => x.total));
  return merged.map((x) => {
    const colour = axisColour(dominantAxis(x.byAxis));
    return { a: x.a, b: x.b, k: SHEET.k, colour, width: SHEET.base + SHEET.gain * Math.sqrt(x.total / max), link: linkOf(x, colour),
             text: [{ t: linkLabel(x.from, x.to), bold: true }, { t: together(x.total), src: true }] };
  });
}

// Une ville : de chacun de ses membres vers chacun de leurs partenaires de projet hors de la commune.
function planTown(s: Selection, _: LinkInput, { z, visible }: Drawing): PlannedArc[] {
  const here = MUNICIPALITIES.get(s.id)!.ids.filter((id) => visible.has(id));
  return fans(partnersOf(here, (id) => municipality(orgTown(id)) !== s.id, visible, null, () => s.id), z, SHEET);
}

// Une région : de chacun de ses membres vers chacun de leurs partenaires de projet hors de la région.
function planRegion(s: Selection, _: LinkInput, { z, visible }: Drawing): PlannedArc[] {
  const here = REGION_MEMBERS.get(s.id)!.map((o) => o.id).filter((id) => visible.has(id));
  return fans(partnersOf(here, (id) => orgRegion(id) !== s.id, visible), z, SHEET);
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

// Les membres qu'un bout de lien nomme : ceux de ses villes (ou communes), ou l'organisation qu'il nomme.
const named = (names: string[], visible: Set<string>) => [...visible].filter((id) =>
  names.includes(orgTown(id)) || names.includes(municipality(orgTown(id))) || names.includes(shortName(id)));

// Un lien ouvert : de chaque membre d'un bout vers chaque membre de l'autre avec qui il partage l'un de ses projets.
function planLink(s: Selection, _: LinkInput, { z, visible }: Drawing): PlannedArc[] {
  if (s.type !== "link") return [];
  const { from, to, projects, colour } = s, b = new Set(named(to, visible)), mine = new Set(projects);
  return fans(partnersOf(named(from, visible), (id) => b.has(id), visible, mine), z, { k: 0.12, colour, opacity: 0.9, base: 2, gain: 3, clickable: false });
}

// La vue d'ensemble : dans chaque projet (de l'axe choisi s'il y en a un), son porteur vers chaque autre participant
// affiché, comme dans les fiches ; les liens d'une ville à l'autre n'en font qu'un, plus épais.
export function planOverview(input: LinkInput, { z, visible }: Drawing): PlannedArc[] {
  const tab = input.tab, links: Bundle[] = [];
  for (const p of tab === "projects" ? shownProjects(input) : DATA.projects) {
    if (tab === "members" && !touchesAxis(p, input.memberAxis, input.memberMainOnly)) continue;
    const axis = (tab === "members" ? input.memberAxis : input.projectFilters.axis) || p.axis, shown = new Set(shownParticipants(p.id, visible));
    const parts = (PARTICIPANTS_BY_PROJECT.get(p.id) || []).filter((x) => shown.has(x.org));
    for (const lead of parts.filter((x) => x.role === "principal")) for (const x of parts) {
      if (x.org !== lead.org) links.push(pair(lead.org, x.org, p.id, axis));
    }
  }
  return fans(links, z, { unordered: true, k: 0.12, opacity: 0.8, base: 1.2, gain: 4.3, clickable: true });
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
export const endsKey = (arcs: PlannedArc[], z: number) => arcs.map((x) =>
  (x.fan ? x.fan.sides.flat().map((b) => at(b.ids[0], z)).join("|") : `${at(x.a, z)}|${at(x.b, z)}`)).join(";");

// Les membres qu'un trait touche, en « ,id,id, » : le survol d'un point, d'une bulle ou d'une grappe qui les tient le
// met en avant.
const touching = (ids: End[]) => `,${ids.filter((e) => typeof e === "string").join(",")},`;

type Pixel = { x: number; y: number };
// `open` : les membres dont un clic ouvre la fiche (un rayon)
interface Line { width: number; text: TooltipLine[]; m: string; link?: ArcLink & { ends: LngLat[] }; open?: string[] }

// Un point relié à sa gare : les membres qu'il tient, leurs partenaires, leurs projets, les villes d'en face.
interface Spoke { at: Pixel; ids: Set<string>; partners: Set<string>; projects: Set<string>; towards: Set<string> }
const SPOKE = { colour: "#64748b", opacity: 0.55, width: 1.4 };

// Les gares au zoom z : une par côté, quel que soit le faisceau ; chaque point n'y a qu'un rayon, même s'il travaille
// avec dix villes. Toujours sur la ville elle-même, à tous les zooms : un arc ne bouge pas quand on zoome, et la gare n'est
// jamais un membre (on croirait que tous les autres travaillent avec lui). Sous DOT_ZOOM, la bulle couvre la gare : ni
// rayon ni rond. Au-dessus, un rond quand plusieurs points s'y relient.
function stations(arcs: PlannedArc[], z: number) {
  const all = new Map<string, Map<string, Spoke>>();
  for (const x of arcs) x.fan?.sides.forEach((side, i) => {
    for (const b of side) {
      const [lon, lat] = at(b.ids[0], z);
      if (!isOnArcMap([lon, lat])) continue;
      const spokes = getOrCreate(all, x.fan!.stations[i], () => new Map<string, Spoke>());
      const s = getOrCreate(spokes, `${lon},${lat}`, () => ({ at: toPixels(lat, lon, z), ids: new Set<string>(), partners: new Set<string>(), projects: new Set<string>(), towards: new Set<string>() }));
      b.ids.forEach((id) => s.ids.add(id)); b.partners.forEach((id) => s.partners.add(id)); b.projects.forEach((p) => s.projects.add(p));
      s.towards.add(x.fan!.names[i]);
    }
  });
  return new Map([...all].map(([key, m]) => {
    const all = [...m.values()], town = MUNICIPALITIES.get(key), spokes = z < DOT_ZOOM ? [] : all;
    return [key, { at: town ? toPixels(town.lat, town.lon, z) : all[0].at, marked: spokes.length > 1, spokes }];
  }));
}

const towardsText = (towns: Set<string>) => (towns.size > 2 ? `${towns.size} villes` : joinWithAnd([...towns]));

export function geometry(arcs: PlannedArc[], z: number): FeatureCollection {
  const features: Feature[] = [], ll = (p: Pixel) => fromPixels(p.x, p.y, z), hubs = stations(arcs, z);
  const push = (line: LngLat[], { text, link, open, ...props }: Line & { colour: string; opacity: number }) => {
    features.push({ type: "Feature", geometry: { type: "LineString", coordinates: line },
      properties: { ...props, text: JSON.stringify(text), ...(link && { link: JSON.stringify(link) }), ...(open && { open: JSON.stringify(open) }) } });
  };
  // les rayons : de chaque point à sa gare, droits, fins et neutres ; la couleur reste aux lignes entre villes. Une gare
  // à rayons est marquée d'un rond neutre, qui n'est pas un membre.
  for (const [town, { at: g, marked, spokes }] of hubs) for (const s of spokes) {
    if (s === spokes[0] && marked) features.push({ type: "Feature", geometry: { type: "Point", coordinates: ll(g) }, properties: { town } });
    if (Math.hypot(s.at.x - g.x, s.at.y - g.y) < 1) continue;
    const ids = [...s.ids];
    push([ll(s.at), ll(g)], { ...SPOKE, m: touching([...ids, ...s.partners]), open: ids,
      text: [{ t: pointName(ids), bold: true }, { t: `${plural(s.projects.size, "projet")} avec ${towardsText(s.towards)}`, src: true }] });
  }
  const drawn: { line: LngLat[]; width: number; props: Line & { colour: string; opacity: number } }[] = [];
  for (const x of arcs) {
    const feature = (line: LngLat[], props: Line) => drawn.push({ line, width: props.width, props: { opacity: x.opacity ?? 0.85, colour: x.colour, ...props } });
    if (x.fan) {
      const [g0, g1] = x.fan.stations.map((key) => hubs.get(key)?.at);
      if (!g0 || !g1 || Math.hypot(g1.x - g0.x, g1.y - g0.y) < 1) continue;
      const ends = [ll(g0), ll(g1)];
      feature(arc(ends[0], ends[1], x.k), { width: x.width, text: x.text, m: touching(x.fan.sides.flat().flatMap((b) => b.ids)),
        ...(x.link && { link: { ...x.link, ends } }) });
      continue;
    }
    const a = at(x.a, z), b = at(x.b, z);
    // un membre hors des limites de la carte (Vancouver, Montpellier) : pas d'arc qu'on ne pourrait pas suivre
    if (!isOnArcMap(a) || !isOnArcMap(b)) continue;
    feature(arc(a, b, x.k), { width: x.width, text: x.text, m: touching([x.a, x.b]), ...(x.link && { link: { ...x.link, ends: [a, b] } }) });
  }
  // côte à côte : chaque arc poussé sur sa droite, du décalage de départ à celui d'arrivée ; un seul trait, sans jointure
  lanes(drawn).forEach(([o0, o1], i) => push(o0 || o1 ? shift(drawn[i].line, o0, o1, z) : drawn[i].line, drawn[i].props));
  return { type: "FeatureCollection", features };
}
