// L'adresse de la page, lue et écrite : une fiche (#membre=, #projet=, #sujet=, #ville=, #region=, #lien=) ou la vue partagée
// (#vue=…, lib/urlView.ts). Pur : retrouver l'organisation ou la ville nommée revient aux données. Les clés restent en
// français : des liens partagés (rqm.quebec) les portent déjà.
import { CATEGORIES } from "../data/categories";
import type { Category } from "../data/types";
import type { Selection } from "../stores/selection";
import type { ProjectFilters } from "./projects";
import { normalize } from "./search";
import { hashToView, viewToHash, type Tab, type View } from "./urlView";

const KEYS = "membre|projet|sujet|lien|ville|region";
const SHEET = new RegExp(`^#(${KEYS})=`), SHEET_ID = new RegExp(`^#(${KEYS})=(.+)$`);
export type SheetKey = "membre" | "projet" | "sujet" | "ville" | "region";
const SHEET_KEY: Record<Exclude<Selection["type"], "link" | "nearby">, SheetKey> =
  { member: "membre", external: "membre", project: "projet", subject: "sujet", town: "ville", region: "region" };

export type Address =
  | { kind: "sheet"; key: SheetKey; id: string }
  | { kind: "link"; from: string[]; to: string[]; codes: string[] | null }
  | { kind: "view"; view: View }
  | { kind: "broken" };   // une adresse de fiche abîmée : on l'ignore

// L'adresse nomme-t-elle une fiche ?
export const isSheetHash = (hash: string) => SHEET.test(hash);

export function parseAddress(hash: string): Address {
  const m = SHEET_ID.exec(hash);
  if (!m) return { kind: "view", view: hashToView(hash) };
  let id: string;
  try { id = decodeURIComponent(m[2]); } catch { return { kind: "broken" }; }
  if (m[1] !== "lien") return { kind: "sheet", key: m[1] as SheetKey, id };
  const [from = "", to = "", codes] = id.split("|");
  return { kind: "link", from: from.split(", "), to: to.split(", "), codes: codes ? codes.split(",") : null };
}

// L'adresse qui rouvre une fiche ; un trait entre deux grappes de villes (« a, b ↔ c ») garde ses projets, qu'on ne
// saurait pas retrouver. « Près de chez moi » n'a pas d'adresse.
export function selectionToHash(s: Selection) {
  const v = (x: string) => encodeURIComponent(x);
  if (s.type === "nearby") return "";
  if (s.type === "link") {
    const merged = s.from.length > 1 || s.to.length > 1;
    return `#lien=${v([s.from.join(", "), s.to.join(", "), ...(merged ? [s.projects.join(",")] : [])].join("|"))}`;
  }
  return `#${SHEET_KEY[s.type]}=${v(s.id)}`;
}

// La vue partagée : les catégories par leur libellé normalisé (« Industriel » -> industriel).
const SLUG = new Map(CATEGORIES.map((c) => [c.code, normalize(c.label)]));
export interface ViewFields { tab: Tab; categories: Set<Category>; memberAxis: string; memberMainOnly: boolean; projectFilters: ProjectFilters }
export function viewOf(f: ViewFields): View {
  const members = f.tab === "members", p = f.projectFilters;
  return { tab: f.tab, cat: f.categories.size < CATEGORIES.length ? CATEGORIES.filter((c) => f.categories.has(c.code)).map((c) => SLUG.get(c.code)!) : null,
           axis: members ? f.memberAxis : p.axis, mainOnly: members ? f.memberMainOnly : p.mainOnly,
           year: members ? 0 : p.year, programme: members ? "" : p.programme, q: members ? "" : p.query };
}
export const viewHash = (f: ViewFields) => viewToHash(viewOf(f));
export const categoriesOf = (view: View) => new Set(CATEGORIES.filter((c) => !view.cat || view.cat.includes(SLUG.get(c.code)!)).map((c) => c.code));
