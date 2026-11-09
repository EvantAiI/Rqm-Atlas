// Les membres hors du Québec, sans point sur la carte : nommés ici, leur fiche à un clic.
import { MEMBERS } from "../../../data/dataset";
import { isOutsideQuebec } from "../../../data/regions";

import { COLLATION } from "../../../lib/sorting";
import { plural } from "../../../utils/format";
import { Collapsible } from "../../../components/Collapsible";
import { OrgButton } from "../../../components/EntityButtons";

const OUTSIDE = MEMBERS.filter(isOutsideQuebec).sort((a, b) => COLLATION.compare(a.name, b.name));

export function OutsideQuebec() {
  if (!OUTSIDE.length) return null;
  return (
    <Collapsible className="mb-3 text-[13px]" summaryClassName="cursor-pointer text-primary" summary={`${plural(OUTSIDE.length, "membre")} hors du Québec`}>
      <ul className="mt-1 list-none p-0">
        {OUTSIDE.map((o) => <li key={o.id} className="py-0.5"><OrgButton id={o.id} /></li>)}
      </ul>
    </Collapsible>
  );
}
