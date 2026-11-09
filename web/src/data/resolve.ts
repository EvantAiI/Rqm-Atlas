// Ce qu'une adresse désigne dans les données : l'organisation, le projet (sans tenir compte de la casse), la
// ville, la région (accents et tirets ignorés aussi), le sujet ou le trait ; null s'il n'existe pas.
import { AXIS_BY_CODE, DATA, PROGRAMMES, YEARS } from "./dataset";
import { MUNICIPALITIES } from "./placement";
import { linkFromAddress } from "./links";
import { findRegion } from "./adminRegions";
import type { Address } from "../lib/address";
import type { View } from "../lib/urlView";
import type { Selection } from "../stores/selection";

export function resolveAddress(address: Extract<Address, { kind: "sheet" | "link" }>): Selection | null {
  if (address.kind === "link") return linkFromAddress(address.from, address.to, address.codes);
  const { key, id } = address, same = (x: string) => x.toLowerCase() === id.toLowerCase();
  if (key === "ville") { const town = [...MUNICIPALITIES.keys()].find(same); return town ? { type: "town", id: town } : null; }
  if (key === "region") { const region = findRegion(id); return region ? { type: "region", id: region } : null; }
  if (key === "sujet") return { type: "subject", id };
  if (key === "projet") { const p = DATA.projects.find((x) => same(x.id)); return p ? { type: "project", id: p.id } : null; }
  const o = DATA.organisations.find((x) => same(x.id));
  return o ? { type: o.category ? "member" : "external", id: o.id } : null;
}

// Une vue lue dans l'adresse, ramenée à ce qui existe : un axe, une année, un programme inconnus sont ignorés.
export const validView = (v: View): View => ({ ...v, axis: AXIS_BY_CODE.has(v.axis) ? v.axis : "", year: YEARS.includes(v.year) ? v.year : 0,
  programme: PROGRAMMES.includes(v.programme) ? v.programme : "" });
