// La ville tapée, avec ses suggestions (generated/towns.json, chargé à la première demande) ; ou un nouvel essai de la position.
import { useCallback, useRef, useState, type RefObject } from "react";
import { normalize } from "../../../lib/search";
import { useNearbyStore } from "../../../stores/nearbyStore";
import { useCombobox } from "../../../hooks/useCombobox";
import { PinIcon } from "../../../components/PinIcon";
import { Suggestions } from "../../../components/Suggestions";
import { load, useLazy } from "../hooks/useLazy";
import { BUTTON, FIELD } from "../../../styles/classes";

type Town = [name: string, province: string, lat: number, lon: number];
const TOWNS = () => import("../../../../generated/towns.json").then((m) => m.default as Town[]);
const label = ([name, province]: Town) => (province === "Québec" ? name : `${name} (${province})`);
const goTo = (town: Town) => useNearbyStore.getState().goToPlace(town[3], town[2], town[0]);

// Les villes qui contiennent ce qu'on tape (celles qui commencent ainsi d'abord), huit au plus.
function suggest(text: string, list: Town[]) {
  const sought = normalize(text).trim();
  if (sought.length < 2) return [];
  const start = (town: Town) => (normalize(label(town)).trim().startsWith(sought) ? 0 : 1);
  return list.filter((town) => normalize(label(town)).includes(sought)).sort((a, b) => start(a) - start(b) || a[0].length - b[0].length).slice(0, 8);
}
// La ville tapée en entier, avec sa province ou sans.
function typed(text: string, towns: Town[]) {
  const sought = normalize(text).trim();
  return towns.find((town) => normalize(label(town)).trim() === sought) || towns.find(([name]) => normalize(name).trim() === sought);
}

export function PlaceInput({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) {
  const towns = useLazy(TOWNS)?.value;
  const locating = useNearbyStore((state) => state.locating);
  const [text, setText] = useState("");
  const settled = useRef("");   // le dernier texte pris (choisi ou validé) : le quitter ne le revalide pas
  const suggestions = useCallback((t: string) => (towns ? suggest(t.trim(), towns) : []), [towns]);
  const take = (town: Town) => { settled.current = text; goTo(town); };
  const box = useCombobox({ text, suggest: suggestions, take, first: true, inputRef });

  // le texte validé sans suggestion (Entrée, sortie du champ) : une ville connue, sinon on dit de la choisir dans la liste
  const commit = () => {
    const el = inputRef.current;
    if (!el || text === settled.current) return;
    settled.current = text;
    void load(TOWNS).then(({ value }) => {
      const town = typed(text, value || []);
      if (town) goTo(town);
      else { el.setCustomValidity("Ville inconnue : choisissez-la dans la liste qui s'ouvre en tapant."); el.reportValidity(); }
    });
  };

  return (
    <>
      <div className="flex gap-2">
        <input className={`${FIELD} min-w-0 flex-1`} placeholder="Votre ville, par exemple Matane" autoComplete="off" aria-label="Votre ville"
          {...box.field} value={text} aria-expanded={box.open && box.items.length > 0}
          onChange={(e) => { e.target.setCustomValidity(""); setText(e.target.value); box.field.onChange(); }}
          onKeyDown={(e) => { box.field.onKeyDown(e); if (e.key === "Enter" && !e.defaultPrevented) commit(); }}
          onBlur={() => { box.field.onBlur(); commit(); }} />
        <button type="button" className={`${BUTTON} flex-none`} disabled={locating} onClick={() => void useNearbyStore.getState().locate()}>
          <PinIcon /><span>{locating ? "Localisation…" : "Me localiser"}</span>
        </button>
      </div>
      <Suggestions box={box} label="Villes" render={label} />
    </>
  );
}
