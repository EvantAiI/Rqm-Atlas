// « Près de chez moi » : les villes autour du visiteur, et le membre choisi pour lui.
import { projectCount } from "./dataset";
import type { Category } from "./types";
import { km, mostActive } from "../lib/distance";
import { PLACED_MEMBERS, POSITION, TOWNS, type Town } from "./placement";

export interface Place { lon: number; lat: number; name: string }
export const NEARBY_RADIUS = 100;   // km : les villes listées autour du visiteur
export const CHOICE_RADIUS = 50;     // km : le membre choisi est le plus actif dans ce rayon

// Les villes à moins de NEARBY_RADIUS km, ou au moins la plus proche ; la plus proche d'abord.
export const nearbyTowns = (place: Place): { town: Town; distance: number }[] => TOWNS
  .map((town) => ({ town, distance: km([place.lon, place.lat], [town.lon, town.lat]) }))
  .sort((a, b) => a.distance - b.distance).filter((x, i) => i === 0 || x.distance <= NEARBY_RADIUS);
// Le membre à ouvrir pour ce lieu, parmi les catégories affichées.
export const chosenMember = (place: Place, categories: Set<Category>) => mostActive(PLACED_MEMBERS.filter((o) => categories.has(o.category!))
  .map((o) => ({ id: o.id, d: km([place.lon, place.lat], POSITION.get(o.id)!), n: projectCount(o.id) })), CHOICE_RADIUS);
