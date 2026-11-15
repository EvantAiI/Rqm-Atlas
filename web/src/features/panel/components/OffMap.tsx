// Les membres hors de la carte (trop loin pour y suivre un trait), sans point : nommés ici, leur fiche à un clic.
import { MEMBERS } from "../../../data/dataset";
import { isOffMap } from "../../../data/regions";

import { COLLATION } from "../../../lib/sorting";
import { plural } from "../../../utils/format";
import { Collapsible } from "../../../components/Collapsible";
import { OrgButton } from "../../../components/EntityButtons";

const OUTSIDE = MEMBERS.filter(isOffMap).sort((a, b) => COLLATION.compare(a.name, b.name));

export function OffMap() {
  if (!OUTSIDE.length) return null;
  return (
    <Collapsible className="mb-3 text-[13px]" summaryClassName="cursor-pointer text-primary" summary={`${plural(OUTSIDE.length, "membre")} hors de la carte`}>
      <ul className="mt-1 list-none p-0">
        {OUTSIDE.map((o) => <li key={o.id} className="py-0.5"><OrgButton id={o.id} /></li>)}
      </ul>
    </Collapsible>
  );
}
