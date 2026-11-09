// L'axe des membres et l'interrupteur des collaborations (les traits de la vue d'ensemble).
import { DATA } from "../../../data/dataset";
import { useAppStore } from "../../../stores/appStore";
import { HelpButton } from "../../help";
import { HELP_TEXTS } from "../../../constants/helpTexts";
import { AxisFilter } from "./AxisFilter";
import { CHECKBOX, CHECK_ROW } from "../../../styles/classes";

// le trait de l'interrupteur : les couleurs des axes, bout à bout
const MIXED = `linear-gradient(90deg, ${DATA.axes.map((a, i) => `${a.color} ${(100 * i) / DATA.axes.length}% ${(100 * (i + 1)) / DATA.axes.length}%`).join(", ")})`;

export function MemberFilters() {
  const axis = useAppStore((state) => state.memberAxis), mainOnly = useAppStore((state) => state.memberMainOnly);
  const links = useAppStore((state) => state.showCollaborations);
  return (
    <fieldset className="mb-3 border-0 p-0">
      <AxisFilter axis={axis} mainOnly={mainOnly} label="Membres ayant au moins un projet dans cet axe"
        onAxis={(memberAxis) => useAppStore.getState().setMemberFilters({ memberAxis })}
        onMainOnly={(memberMainOnly) => useAppStore.getState().setMemberFilters({ memberMainOnly })} />
      <label className={`${CHECK_ROW} mt-2`}>
        <input type="checkbox" className={CHECKBOX} checked={links} onChange={(e) => useAppStore.getState().setShowCollaborations(e.target.checked)} />
        <span aria-hidden="true" className="h-[3px] w-4 flex-none" style={{ background: MIXED }} />
        <span>Collaborations</span><HelpButton text={HELP_TEXTS.collaborations} label="collaborations" />
      </label>
    </fieldset>
  );
}
