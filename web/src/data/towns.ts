// Les villes où les membres d'une commune ont des partenaires de projet (membres du RQM).
import { ORG_BY_ID, PARTICIPATIONS_BY_ORG, PROJECT_BY_ID, starPartners } from "./dataset";
import { municipality } from "./regions";
import { MUNICIPALITIES, POSITION } from "./placement";
import { getOrCreate } from "../lib/collections";

// La commune d'une bulle ou d'une grappe : celle qui y a le plus de membres.
export function mainTown(ids: string[]) {
  const count = new Map<string, number>();
  for (const id of ids) { const name = municipality(ORG_BY_ID.get(id)!.town); count.set(name, (count.get(name) || 0) + 1); }
  return [...count].sort((a, b) => b[1] - a[1])[0][0];
}

export interface TownPartner { ids: string[]; byAxis: Map<string, Set<string>>; projects: Set<string> }

// commune -> ses partenaires, par axe, en étoile (les traits de la carte) ; les plus fournis d'abord. Calculé une fois par
// commune.
const PARTNERS = new Map<string, Map<string, TownPartner>>();
export const townPartners = (name: string) => getOrCreate(PARTNERS, name, () => {
  const partners = new Map<string, TownPartner>(), ids = new Set(MUNICIPALITIES.get(name)!.ids);
  for (const id of ids) for (const { project } of PARTICIPATIONS_BY_ORG.get(id) || []) {
    for (const org of starPartners(id, project)) {
      const o = ORG_BY_ID.get(org)!, other = municipality(o.town);
      if (!o.category || !POSITION.has(org) || other === name) continue;
      const partner = getOrCreate(partners, other, () => ({ ids: [], byAxis: new Map<string, Set<string>>(), projects: new Set<string>() }));
      if (!partner.ids.includes(org)) partner.ids.push(org);
      getOrCreate(partner.byAxis, PROJECT_BY_ID.get(project)!.axis, () => new Set<string>()).add(project);
      partner.projects.add(project);
    }
  }
  return new Map([...partners].sort((a, b) => b[1].projects.size - a[1].projects.size));
});
