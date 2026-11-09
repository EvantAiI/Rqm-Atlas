// Ce qu'une fiche montre : la sélection.
import type { LinkSelection } from "../data/links";

export type Selection =
  | { type: "member" | "external" | "project" | "subject" | "town" | "region"; id: string }
  | { type: "nearby"; id: "here" }
  | LinkSelection;
export const NEARBY: Selection = { type: "nearby", id: "here" };

// Un carrefour : une liste de membres ou de projets d'où l'on ouvre des fiches, et où l'on revient (« ← … »).
export const isCrossroads = (s: Selection | null) => Boolean(s && (s.type === "nearby" || s.type === "subject" || s.type === "link" || s.type === "town" || s.type === "region"));
export const sameSelection = (a: Selection | null, b: Selection | null) => Boolean(a && b && a.type === b.type && a.id === b.id);
