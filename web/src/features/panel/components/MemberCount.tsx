// Combien de membres la vue filtrée garde, et leur liste à emporter (repliée), chacun ouvrant sa fiche.
import { useMemo } from "react";
import { MEMBERS, ORG_BY_ID, projectCount } from "../../../data/dataset";
import { isOffMap } from "../../../data/regions";
import { COLLATION } from "../../../lib/sorting";
import { PLACED_MEMBERS } from "../../../data/placement";
import { useAppStore } from "../../../stores/appStore";
import { isViewFiltered, visibleMembers } from "../../../stores/selectors";
import { formatNumber, plural } from "../../../utils/format";
import { InfoLine } from "../../../components/InfoLine";
import { Collapsible } from "../../../components/Collapsible";
import { OrgButton } from "../../../components/EntityButtons";
import { ViewTools } from "./ViewTools";
import { QUIET } from "../../../styles/classes";

// Les membres sans point : l'onglet les compte, la carte non.
const OUTSIDE = MEMBERS.filter(isOffMap).length;

function FilteredList({ ids }: { ids: Set<string> }) {
  const members = useMemo(() => [...ids].map((id) => ORG_BY_ID.get(id)!).sort((a, b) => COLLATION.compare(a.name, b.name)), [ids]);
  return (
    <ul className="mb-2 max-h-[min(220px,30vh)] list-none overflow-y-auto border-y border-line p-0">
      {members.map((o) => (
        <li key={o.id} className="border-t border-line py-1 text-[13px] leading-[1.35] first:border-t-0">
          <OrgButton id={o.id} withTown={false} fromPanel />
          <InfoLine items={[o.town, projectCount(o.id) ? plural(projectCount(o.id), "projet") : "aucun projet"]} />
        </li>
      ))}
      {!members.length && <li className="py-1 text-[12px] text-ink-muted">Aucun membre ne correspond.</li>}
    </ul>
  );
}

export function MemberCount() {
  const visible = useAppStore(visibleMembers);
  const filtered = useAppStore(isViewFiltered);
  const n = visible.size;
  return (
    <>
      {n < PLACED_MEMBERS.length && (
        <>
          <div className="mb-3 flex items-baseline justify-between gap-2 text-[13px]">
            <span aria-live="polite"><b className="text-ink-strong">{plural(n, "membre")}</b> affichés sur les {formatNumber(PLACED_MEMBERS.length)} de la carte</span>
            {filtered && <button type="button" className={QUIET} onClick={() => useAppStore.getState().resetMemberFilters()}>Tout afficher</button>}
          </div>
          {OUTSIDE > 0 && <p className="-mt-2 mb-3 text-[12px] text-ink-muted">Sur les {formatNumber(MEMBERS.length)} membres, {formatNumber(OUTSIDE)} sont hors de la carte et n'ont pas de point.</p>}
        </>
      )}
      {filtered && (
        <div className="-mt-2 mb-3 text-[12px]">
          <Collapsible summary={`La liste (${formatNumber(n)})`} summaryClassName="mb-1 cursor-pointer text-primary"><FilteredList ids={visible} /></Collapsible>
          <ViewTools />
        </div>
      )}
    </>
  );
}
