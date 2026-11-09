// Le contenu de la fiche, selon ce qui est ouvert.
import type { Selection } from "../../../stores/selection";
import { useNearbyStore } from "../../../stores/nearbyStore";
import { OrgSheet } from "./OrgSheet";
import { ProjectSheet } from "./ProjectSheet";
import { SubjectSheet } from "./SubjectSheet";
import { TownSheet } from "./TownSheet";
import { RegionSheet } from "./RegionSheet";
import { LinkSheet } from "./LinkSheet";
import { NearbySheet } from "./NearbySheet";

export function SheetBody({ selection }: { selection: Selection }) {
  const here = useNearbyStore((state) => state.here);
  switch (selection.type) {
    case "member": case "external": return <OrgSheet id={selection.id} />;
    case "project": return <ProjectSheet id={selection.id} />;
    case "subject": return <SubjectSheet text={selection.id} />;
    case "town": return <TownSheet name={selection.id} />;
    case "region": return <RegionSheet name={selection.id} />;
    case "link": return <LinkSheet link={selection} />;
    // un autre lieu : une fiche neuve, ses villes dépliées
    case "nearby": return <NearbySheet key={here ? `${here.lon},${here.lat}` : ""} />;
  }
}
