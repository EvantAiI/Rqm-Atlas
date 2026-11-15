// Ce que comptent les chiffres des bulles et des grappes : tous leurs membres, ou ceux mis en avant (stores/selectors.ts,
// highlightedMembers). La bulle de survol et la légende des chiffres disent la même chose avec les mêmes mots.
import type { Tab } from "../../../lib/urlView";
import type { Selection } from "../../../stores/selection";

// Les membres mis en avant, ou null quand tous le sont.
export const highlightWords = (selection: Selection | null, tab: Tab) =>
  selection ? "liés à la fiche ouverte" : tab === "projects" ? "dans les projets affichés" : null;

export const countCaption = (selection: Selection | null, tab: Tab) =>
  `Les chiffres : les membres ${highlightWords(selection, tab) ?? "de chaque bulle"}`;
