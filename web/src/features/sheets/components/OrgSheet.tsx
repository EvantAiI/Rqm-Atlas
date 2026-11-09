// La fiche d'une organisation, membre ou hors réseau : qui elle est, où, ses contacts ; puis ses projets, ses
// collaborations, ses publications (la première section dépliée).
import { useMemo } from "react";
import { PARTNERS_BY_ORG, ORG_BY_ID, PARTICIPATIONS_BY_ORG, PROJECT_BY_ID } from "../../../data/dataset";
import { categoryLabel } from "../../../data/categories";
import { orgRegion } from "../../../data/adminRegions";
import { HelpButton } from "../../help";
import { InfoLine } from "../../../components/InfoLine";
import { OrgButton } from "../../../components/EntityButtons";
import { formatNumber, plural } from "../../../utils/format";
import { HELP_TEXTS } from "../../../constants/helpTexts";
import { Address } from "./Address";
import { Contacts } from "./Contacts";
import { MemberProjects, type Part } from "./MemberProjects";
import { NearestNote } from "./NearestNote";
import { Publications, detailLoader } from "./Publications";
import { RegionLink } from "./RegionLink";
import { Scroller } from "./Scroller";
import { Section } from "./Section";
import { useLazy } from "../hooks/useLazy";
import { REACH, ROWS, SOURCE } from "../../../styles/classes";

export function OrgSheet({ id }: { id: string }) {
  const o = ORG_BY_ID.get(id)!;
  const parts: Part[] = useMemo(() => (PARTICIPATIONS_BY_ORG.get(id) || []).map((x) => ({ ...x, p: PROJECT_BY_ID.get(x.project)! }))
    .sort((a, b) => b.p.year - a.p.year), [id]);
  const collabs = useMemo(() => (PARTNERS_BY_ORG.get(id) || []).slice().sort((a, b) => b.projects.length - a.projects.length), [id]);
  useLazy(detailLoader(o));   // tôt : la section s'ouvrira déjà remplie
  const first = parts.length ? "projects" : collabs.length ? "collaborations" : "publications";
  return (
    <>
      {o.category && <NearestNote id={id} />}
      <div className="mt-0.5">{categoryLabel(o)}</div>
      {o.type && <div className={SOURCE}>{o.type}</div>}
      {o.category ? <Address org={o} /> : <div className={SOURCE}>Pas de point sur la carte.</div>}
      <RegionLink name={orgRegion(id)} className="mt-1" />
      <Contacts org={o} />
      {!parts.length && o.category && <p className={REACH}>Pas encore de projet du RQM.</p>}
      {parts.length > 0 && <Section title="Projets" count={formatNumber(parts.length)} open><MemberProjects parts={parts} /></Section>}
      {collabs.length > 0 && (
        <Section title="Collaborations" count={formatNumber(collabs.length)} open={first === "collaborations"}>
          <Scroller className="mt-1">
            <ul className={ROWS}>
              {collabs.map((c) => <li key={c.other}><OrgButton id={c.other} /><InfoLine items={[`${plural(c.projects.length, "projet")} en commun`]} /></li>)}
            </ul>
          </Scroller>
        </Section>
      )}
      {o.publications && (
        <Section title={<>Publications maritimes<HelpButton text={HELP_TEXTS.publications} label="publications maritimes" /></>} count={`${formatNumber(o.publications.maritime)} sur ${formatNumber(o.publications.total)}`}
          open={first === "publications"}>
          <Publications org={o} />
        </Section>
      )}
    </>
  );
}
