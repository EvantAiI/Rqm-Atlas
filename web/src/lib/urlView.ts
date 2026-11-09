// La vue partagée (onglet et filtres) dans l'adresse, et retour : #vue=membres&cat=industriel&axe=A3. Seuls les filtres
// posés y figurent ; la vue par défaut (Membres, rien de filtré) n'a pas d'adresse. cat : les libellés normalisés, ou
// null (toutes). Les clés et les valeurs de l'adresse sont en français : des liens partagés les portent déjà.
export type Tab = "members" | "projects";
export interface View { tab: Tab; cat: string[] | null; axis: string; mainOnly: boolean; year: number; programme: string; q: string }

const TAB_IN_ADDRESS: Record<Tab, string> = { members: "membres", projects: "projets" };

export function viewToHash(v: View) {
  const p = ([["vue", TAB_IN_ADDRESS[v.tab]], ["cat", v.cat && v.cat.join(",")], ["annee", v.year], ["programme", v.programme],
             ["axe", v.axis], ["principal", v.axis && v.mainOnly && 1], ["q", v.q]] as [string, unknown][])
    .filter(([k, x]) => k === "vue" || x || (k === "cat" && x === ""));   // cat= vide : aucune catégorie
  return p.length === 1 && v.tab === "members" ? ""
    : `#${p.map(([k, x]) => `${k}=${encodeURIComponent(String(x)).replace(/%2C/g, ",")}`).join("&")}`;
}
export function hashToView(hash: string): View {
  const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };   // un lien abîmé ne casse pas la page
  const q = new Map(/^#vue=/.test(hash) ? hash.slice(1).split("&").map((kv) => { const [k, ...x] = kv.split("="); return [k, decode(x.join("="))] as const; }) : []);
  return { tab: q.get("vue") === "projets" ? "projects" : "members", cat: q.has("cat") ? q.get("cat")!.split(",").filter(Boolean) : null,
           axis: q.get("axe") || "", mainOnly: q.get("principal") === "1", year: Number(q.get("annee")) || 0,
           programme: q.get("programme") || "", q: q.get("q") || "" };
}
