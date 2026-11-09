// Le membre des premières étapes : le plus actif près du visiteur si sa position est déjà permise, sinon le plus
// actif du réseau. Aucune question à l'ouverture de la visite.
import { CATEGORIES } from "../../../data/categories";
import { projectCount, ORG_BY_ID } from "../../../data/dataset";
import { chosenMember } from "../../../data/nearby";
import type { Organisation } from "../../../data/types";
import { PLACED_MEMBERS } from "../../../data/placement";
import { currentPosition, positionPermission } from "../../../stores/nearbyStore";

const MOST_ACTIVE = PLACED_MEMBERS.reduce((m, o) => (projectCount(o.id) > projectCount(m.id) ? o : m));
const ALL = new Set(CATEGORIES.map((c) => c.code));

export async function findDemo(): Promise<Organisation> {
  try {
    if (await positionPermission() === "granted") {
      const p = await currentPosition({ timeout: 4000, maximumAge: 3600000 });
      const c = chosenMember({ lon: p.coords.longitude, lat: p.coords.latitude, name: "" }, ALL);
      if (c) return ORG_BY_ID.get(c.id)!;
    }
  } catch { /* pas de position : l'exemple reste le membre le plus actif */ }
  return MOST_ACTIVE;
}
