// La recherche de membres : un membre par son nom ou son sigle, une ville, une région. Les sujets se cherchent dans
// l'onglet Projets.
import type { ReactNode, RefObject } from "react";
import { useAppStore } from "../../../stores/appStore";
import { POSITION } from "../../../data/placement";
import { terms, splitMatches } from "../../../lib/search";
import { plural } from "../../../utils/format";
import { memberSuggestions, type MemberSuggestion } from "../lib/memberSuggestions";
import { useCombobox } from "../../../hooks/useCombobox";
import { Suggestions, isShown } from "../../../components/Suggestions";
import { FIELD, SOURCE } from "../../../styles/classes";

const NOTHING = "Aucun membre trouvé";

function take(c: MemberSuggestion) {
  const app = useAppStore.getState();
  app.setMemberQuery("");
  if (c.kind === "town") app.open({ type: "town", id: c.town.name }, { recenter: true, fromPanel: true });
  else if (c.kind === "region") app.open({ type: "region", id: c.name }, { recenter: true, fromPanel: true });
  else app.openOrganisation(c.org.id, true);
}

function Row({ left, right }: { left: ReactNode; right: string }) {
  return <span className="flex items-baseline justify-between gap-2"><span>{left}</span><span className={`flex-none ${SOURCE}`}>{right}</span></span>;
}

export function MemberSearch({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) {
  // le texte vit dans le store : il reste d'un onglet à l'autre, et la visite guidée y tape lettre par lettre
  const text = useAppStore((state) => state.memberQuery);
  const setText = (query: string) => useAppStore.getState().setMemberQuery(query);
  const box = useCombobox({ text, suggest: memberSuggestions, take, first: true, clear: () => setText(""), inputRef });
  const nothing = terms(text).length ? NOTHING : null;

  const render = (c: MemberSuggestion) => {
    if (c.kind === "town") return <Row left={`${c.town.name} : ses membres et leurs liens`} right={plural(c.town.ids.length, "membre")} />;
    if (c.kind === "region") return <Row left={`Région : ${c.name}`} right={plural(c.members, "membre")} />;
    const o = c.org, note = o.category ? (POSITION.has(o.id) ? "" : "membre, hors de la carte") : "hors du réseau";
    return <>{splitMatches(c.text, c.positions).map(([f, m], i) => (m ? <mark key={i}>{f}</mark> : f))}{note && <> <span className={SOURCE}>— {note}</span></>}</>;
  };

  return (
    <div className="mb-3">
      <input type="search" value={text} placeholder="Un membre, une ville, une région…" autoComplete="off" className={FIELD}
        aria-label="Rechercher un membre par son nom ou son sigle, une ville ou une région"
        aria-expanded={isShown(box, nothing)} {...box.field}
        onChange={(e) => { setText(e.target.value); box.field.onChange(); }} />
      <Suggestions box={box} label="Membres, villes et régions correspondants" render={render} nothing={nothing} />
    </div>
  );
}
