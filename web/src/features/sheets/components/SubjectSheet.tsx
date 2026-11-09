// « Qui travaille sur… » : d'abord les projets qui parlent du sujet, le mot surligné (ils disent pourquoi) ; puis les
// membres qui les mènent, ville par ville ; puis les partenaires hors réseau.
import { Fragment, useMemo } from "react";
import { ORG_BY_ID, groupByTown } from "../../../data/dataset";
import { excerpt, subjectTerms, findSubject, type SubjectOrg } from "../../../data/subjects";
import { COLLATION } from "../../../lib/sorting";
import { HelpButton } from "../../help";
import { InfoLine } from "../../../components/InfoLine";
import { OrgButton } from "../../../components/EntityButtons";
import { formatNumber, plural } from "../../../utils/format";
import { HELP_TEXTS } from "../../../constants/helpTexts";
import { Highlight } from "./Highlight";
import { ProjectItem } from "./ProjectItem";
import { Section } from "./Section";
import { GROUP, INTRO, LIST, REACH } from "../../../styles/classes";

const byCount = (a: SubjectOrg, b: SubjectOrg) => b.projects.size - a.projects.size || b.leads.size - a.leads.size
  || COLLATION.compare(ORG_BY_ID.get(a.id)!.name, ORG_BY_ID.get(b.id)!.name);

function Row({ org, withTown }: { org: SubjectOrg; withTown: boolean }) {
  return <li><OrgButton id={org.id} withTown={withTown} /><InfoLine items={[plural(org.projects.size, "projet")]} /></li>;
}

export function SubjectSheet({ text }: { text: string }) {
  const { projects, orgs } = useMemo(() => findSubject(text), [text]);
  const words = useMemo(() => subjectTerms(text), [text]);
  if (!projects.length) return <p className={REACH}>Aucun projet du RQM ne parle de « {text} ».</p>;
  const members = orgs.filter((o) => ORG_BY_ID.get(o.id)!.category).sort(byCount), outside = orgs.filter((o) => !ORG_BY_ID.get(o.id)!.category).sort(byCount);
  // la ville du membre le plus engagé sur le sujet d'abord, puis la suivante…
  const towns = groupByTown(members, (o) => o.id);
  return (
    <>
      <p className={INTRO}>Les projets du RQM qui en parlent dans leur titre ou leur description, et les organisations qui les mènent.</p>
      <Section title="Projets" count={formatNumber(projects.length)} open>
        <ul className={LIST}>
          {projects.map((p) => {
            const phrase = excerpt(p, words) || p.teaser;
            return <li key={p.id}><ProjectItem id={p.id} title={<Highlight text={p.shortTitle || p.title} words={words} />}
              hook={phrase ? <Highlight text={phrase} words={words} /> : null} /></li>;
          })}
        </ul>
      </Section>
      {members.length > 0 && (
        <Section title="Membres" count={formatNumber(members.length)} open>
          {[...towns].map(([town, l]) => (
            <Fragment key={town}>
              <div className={GROUP}>{town}</div>
              <ul className={LIST}>{l.map((o) => <Row key={o.id} org={o} withTown={false} />)}</ul>
            </Fragment>
          ))}
        </Section>
      )}
      {outside.length > 0 && (
        <Section title={<>Hors du réseau<HelpButton text={HELP_TEXTS.outsideNetwork} label="organisations hors du réseau" /></>} count={formatNumber(outside.length)} open>
          <ul className={LIST}>{outside.map((o) => <Row key={o.id} org={o} withTown />)}</ul>
        </Section>
      )}
    </>
  );
}
