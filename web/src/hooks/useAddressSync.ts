// L'adresse de la page et l'historique, dans les deux sens. Une fiche a son adresse ; un sujet, un trait et « près de
// chez moi » vivent aussi dans history.state (rien de la position n'entre dans l'adresse) ; sans fiche, l'adresse dit la
// vue partagée. Ouvrir ou fermer crée une entrée d'historique ; un filtre change l'adresse sans en créer (Précédent quitte
// la vue, pas chaque case cochée). La lecture et l'écriture de l'adresse sont dans lib/address.ts.
import { useEffect } from "react";
import type { LinkSelection } from "../data/links";
import { resolveAddress, validView } from "../data/resolve";
import { categoriesOf, isSheetHash, parseAddress, selectionToHash, viewHash } from "../lib/address";
import type { View } from "../lib/urlView";
import { useAppStore } from "../stores/appStore";
import { useNearbyStore } from "../stores/nearbyStore";
import { NEARBY } from "../stores/selection";
import { isTourRunning } from "../stores/tourStore";

interface HistoryState { subject?: string; link?: LinkSelection; nearby?: 1 }
const go = (hash: string) => hash || location.pathname + location.search;

// La vue lue -> les filtres. Les catégories valent pour les deux onglets ; les filtres de l'autre onglet restent tels
// quels. Une vue nouvelle (lien ouvert, collé) recadre la carte sur ses résultats.
function applyView(read: View) {
  const app = useAppStore.getState(), before = viewHash(app), v = validView(read);
  app.setMemberFilters({ categories: categoriesOf(v) });
  if (v.tab === "members") app.setMemberFilters({ memberAxis: v.axis, memberMainOnly: v.mainOnly });
  else app.setProjectFilters({ query: v.q, year: v.year, programme: v.programme, axis: v.axis, mainOnly: v.mainOnly });
  app.setTab(v.tab);
  const after = viewHash(useAppStore.getState());
  if (after !== before && after !== "#vue=projets" && after) app.showResults();
}

function readHash() {
  const address = parseAddress(location.hash);
  if (address.kind === "view") applyView(address.view);
  else if (address.kind !== "broken") { const s = resolveAddress(address); if (s) useAppStore.getState().openFromAddress(s); }
}

// Précédent / Suivant : l'adresse dit quelle fiche ouvrir, ou aucune ; un sujet, un trait, « près de chez moi »
// reviennent par history.state.
function onPopState() {
  readHash();
  if (isSheetHash(location.hash)) return;
  const app = useAppStore.getState(), st = history.state as HistoryState | null;
  if (st?.subject) app.open({ type: "subject", id: st.subject });
  else if (st?.link) app.open(st.link);
  else if (st?.nearby && useNearbyStore.getState().here) app.open(NEARBY);
  else if (app.selection && app.selection.type !== "nearby") app.close();
}

// L'état -> l'adresse, une fois par rafale de changements (une vue lue pose plusieurs filtres d'affilée).
function writer() {
  let seen = useAppStore.getState().selection, pending = false;
  const write = () => {
    pending = false;
    if (isTourRunning()) return;   // la visite ouvre et ferme des fiches : l'historique n'en garde rien
    const app = useAppStore.getState(), s = app.selection;
    if (s !== seen) {
      seen = s;
      const hash = s && s.type !== "nearby" ? selectionToHash(s) : viewHash(app);
      const state: HistoryState | null = !s ? null : s.type === "nearby" ? { nearby: 1 } : s.type === "subject" ? { subject: s.id } : s.type === "link" ? { link: s } : null;
      if (location.hash !== hash || JSON.stringify(history.state) !== JSON.stringify(state)) history.pushState(state, "", go(hash));
      return;
    }
    // une fiche ouverte garde son adresse
    if (isSheetHash(location.hash) || (s && s.type !== "nearby")) return;
    const hash = viewHash(app);
    if (location.hash !== hash) history.replaceState(history.state, "", go(hash));
  };
  return () => { if (!pending) { pending = true; queueMicrotask(write); } };
}

export function useAddressSync() {
  useEffect(() => {
    const stop = useAppStore.subscribe(writer());
    readHash();   // un lien partagé pose d'abord ses filtres, puis l'adresse se réécrit propre
    addEventListener("popstate", onPopState);
    addEventListener("hashchange", readHash);
    return () => { stop(); removeEventListener("popstate", onPopState); removeEventListener("hashchange", readHash); };
  }, []);
}
