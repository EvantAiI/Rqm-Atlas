// Une ville : ses membres (ceux qui ont des projets d'abord), puis les villes avec lesquelles ils mènent des
// projets ; chacune ouvre leur trait.
import { useMemo } from "react";
import { ORG_BY_ID, byActivity, projectCount } from "../../../data/dataset";
import { MUNICIPALITIES } from "../../../data/placement";
import { townPartners } from "../../../data/towns";
import { townLink } from "../../../data/links";
import { townRegion } from "../../../data/adminRegions";
import { useAppStore } from "../../../stores/appStore";
import { InfoLine } from "../../../components/InfoLine";
import { OrgButton } from "../../../components/EntityButtons";
import { Collapsible } from "../../../components/Collapsible";
import { formatNumber, plural } from "../../../utils/format";
import { Scroller } from "./Scroller";
import { RegionLink } from "./RegionLink";
import { Section } from "./Section";
import { INTRO, LINK_BUTTON, LIST, ROWS } from "../../../styles/classes";

export function TownSheet({ name }: { name: string }) {
  const partners = useMemo(() => townPartners(name), [name]);
  const members = useMemo(() => MUNICIPALITIES.get(name)!.ids.map((id) => ORG_BY_ID.get(id)!)
    .sort(byActivity), [name]);
  const active = members.filter((o) => projectCount(o.id)), idle = members.filter((o) => !projectCount(o.id));
  const openLink = (other: string) => { const s = townLink(name, other); if (s) useAppStore.getState().open(s, { recenter: true }); };
  return (
    <>
      <RegionLink name={townRegion(name)} className="mt-0.5" />
      <p className={INTRO}>Les membres du RQM à {name}, et les villes avec lesquelles ils mènent des projets.</p>
      <Section title="Membres" count={formatNumber(members.length)} open>
        <ul className={LIST}>{active.map((o) => <li key={o.id}><OrgButton id={o.id} withTown={false} /><InfoLine items={[plural(projectCount(o.id), "projet")]} /></li>)}</ul>
        {idle.length > 0 && (
          <Collapsible className="mb-3 text-[13px]" summaryClassName="cursor-pointer text-primary"
            summary={idle.length > 1 ? `${formatNumber(idle.length)} autres membres, sans projet du RQM pour l'instant` : "Un autre membre, sans projet du RQM pour l'instant"}>
            <ul className={LIST}>{idle.map((o) => <li key={o.id}><OrgButton id={o.id} withTown={false} /></li>)}</ul>
          </Collapsible>
        )}
      </Section>
      {partners.size > 0 && (
        <Section title="Travaille avec" count={formatNumber(partners.size)} open>
          <Scroller className="mt-1">
            <ul className={ROWS}>
              {[...partners].map(([other, l]) => (
                <li key={other}><button type="button" className={LINK_BUTTON} onClick={() => openLink(other)}>{other}</button>
                  <InfoLine items={[`${plural(l.projects.size, "projet")} en commun`]} /></li>
              ))}
            </ul>
          </Scroller>
        </Section>
      )}
    </>
  );
}
