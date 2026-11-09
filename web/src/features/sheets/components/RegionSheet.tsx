// Une région administrative : d'abord les projets de ses membres (où qu'ils se déroulent), puis ces membres ville par
// ville (ceux qui ont des projets d'abord), puis les régions avec lesquelles ils en mènent.
import { Fragment } from "react";
import { projectCount } from "../../../data/dataset";
import { municipality } from "../../../data/regions";
import { getOrCreate } from "../../../lib/collections";
import type { Organisation } from "../../../data/types";
import { REGION_MEMBERS, inRegion, regionPartners, regionProjects } from "../../../data/adminRegions";
import { InfoLine } from "../../../components/InfoLine";
import { OrgButton } from "../../../components/EntityButtons";
import { Collapsible } from "../../../components/Collapsible";
import { formatNumber, plural } from "../../../utils/format";
import { PartnerRegion } from "./PartnerRegion";
import { ProjectItem } from "./ProjectItem";
import { Scroller } from "./Scroller";
import { Section } from "./Section";
import { GROUP, INTRO, LIST, ROWS } from "../../../styles/classes";

export function RegionSheet({ name }: { name: string }) {
  // calculés une fois par région (data/adminRegions.ts)
  const members = REGION_MEMBERS.get(name)!, projects = regionProjects(name), partners = regionPartners(name);
  const active = members.filter((o) => projectCount(o.id)), idle = members.filter((o) => !projectCount(o.id));
  // par commune, comme les fiches de ville ; celle du membre le plus actif d'abord, puis la suivante…
  const towns = new Map<string, Organisation[]>();
  for (const o of active) getOrCreate(towns, municipality(o.town), () => []).push(o);
  return (
    <>
      <p className={INTRO}>Les projets auxquels participent des membres du RQM {inRegion(name)}, même quand ils se déroulent ailleurs.<br />
        Puis ces membres, ville par ville, et les régions avec lesquelles ils travaillent.</p>
      {projects.length > 0 && (
        <Section title="Projets" count={formatNumber(projects.length)} open>
          <Scroller className="mt-1">
            <ul className={ROWS}>{projects.map((p) => <li key={p.id}><ProjectItem id={p.id} /></li>)}</ul>
          </Scroller>
        </Section>
      )}
      <Section title="Membres" count={formatNumber(members.length)} open>
        {[...towns].map(([town, l]) => (
          <Fragment key={town}>
            <div className={GROUP}>{town}</div>
            <ul className={LIST}>{l.map((o) => <li key={o.id}><OrgButton id={o.id} withTown={false} /><InfoLine items={[plural(projectCount(o.id), "projet")]} /></li>)}</ul>
          </Fragment>
        ))}
        {idle.length > 0 && (
          <Collapsible className="mt-2 mb-3 text-[13px]" summaryClassName="cursor-pointer text-primary"
            summary={idle.length > 1 ? `${formatNumber(idle.length)} autres membres, sans projet du RQM pour l'instant` : "Un autre membre, sans projet du RQM pour l'instant"}>
            <ul className={LIST}>{idle.map((o) => <li key={o.id}><OrgButton id={o.id} /></li>)}</ul>
          </Collapsible>
        )}
      </Section>
      {partners.size > 0 && (
        <Section title="Travaille avec" count={formatNumber(partners.size)} open>
          <ul className={LIST}>{[...partners].map(([other, l]) => <li key={other}><PartnerRegion name={other} projects={l.projects} /></li>)}</ul>
        </Section>
      )}
    </>
  );
}
