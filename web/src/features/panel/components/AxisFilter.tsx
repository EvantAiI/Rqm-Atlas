// Le choix d'un axe de recherche, et « Axe principal seulement » dès qu'un axe est choisi.
import { DATA } from "../../../data/dataset";
import { HelpButton } from "../../help";
import { HELP_TEXTS } from "../../../constants/helpTexts";
import { CHECKBOX, CHECK_ROW, SELECT } from "../../../styles/classes";

interface Props {
  axis: string; mainOnly: boolean; label: string; className?: string;
  onAxis(axis: string): void;
  onMainOnly(mainOnly: boolean): void;
}

export function AxisFilter({ axis, mainOnly, label, className = "", onAxis, onMainOnly }: Props) {
  return (
    <>
      <select className={`${SELECT} ${className}`} aria-label={label} value={axis} onChange={(e) => onAxis(e.target.value)}>
        <option value="">Tous les axes de recherche</option>
        {DATA.axes.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}
      </select>
      {axis && (
        <label className={CHECK_ROW}>
          <input type="checkbox" className={CHECKBOX} checked={mainOnly} onChange={(e) => onMainOnly(e.target.checked)} />
          <span>Axe principal seulement</span><HelpButton text={HELP_TEXTS.mainAxisOnly} label="axe principal seulement" />
        </label>
      )}
    </>
  );
}
