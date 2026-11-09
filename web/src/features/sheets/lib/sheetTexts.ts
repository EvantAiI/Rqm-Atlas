// Ce que l'en-tête d'une fiche dit d'elle : son titre, son nom pour les lecteurs d'écran, le chemin du retour.
import { ORG_BY_ID, PROJECT_BY_ID } from "../../../data/dataset";
import { SUBJECT_LABELS, subjectTitle } from "../../../data/subjects";
import type { Place } from "../../../data/nearby";
import type { Selection } from "../../../stores/selection";
import { capitalize } from "../../../utils/format";

export function sheetTitle(s: Selection, here: Place | null) {
  switch (s.type) {
    case "link": case "town": case "region": return s.id;
    case "subject": return subjectTitle(s.id);
    case "nearby": return `Près de ${here ? here.name : "chez vous"}`;
    case "project": { const p = PROJECT_BY_ID.get(s.id)!; return p.shortTitle || p.title; }
    default: return ORG_BY_ID.get(s.id)!.name;
  }
}

export const REGION_LABEL: Record<Selection["type"], string> = {
  town: "Les membres de cette ville et leurs collaborations", region: "Les membres de cette région et leurs collaborations", link: "Les projets en commun de ce trait",
  subject: "Les organisations qui travaillent sur ce sujet", nearby: "Les membres près de vous",
  project: "Fiche du projet", member: "Fiche de l'organisation", external: "Fiche de l'organisation",
};

// « ← … » : le carrefour d'où l'on vient ; rien pour « près de chez moi » sans lieu.
export function backLabel(r: Selection, here: Place | null) {
  if (r.type === "link" || r.type === "town" || r.type === "region") return `← ${r.id}`;
  if (r.type === "subject") return `← ${capitalize(SUBJECT_LABELS.get(r.id) || r.id)}`;
  return here ? `← Près de ${here.name}` : "";
}
