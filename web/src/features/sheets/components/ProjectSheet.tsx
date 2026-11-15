// La fiche d'un projet : son titre long, son accroche, sa description ; année, programme, axes ; puis ses
// organisations par rôle.
import { Fragment } from "react";
import { AXIS_BY_CODE, DATA, ORG_BY_ID, PARTICIPANTS_BY_PROJECT, PROJECT_BY_ID } from "../../../data/dataset";
import { ROLE_LABELS, ROLE_LABELS_PLURAL, groupByRole } from "../../../data/categories";
import { COLLATION } from "../../../lib/sorting";
import { HelpButton } from "../../help";
import { AxisBadge } from "../../../components/AxisBadge";
import { OrgButton } from "../../../components/EntityButtons";
import { formatNumber } from "../../../utils/format";
import { HELP_TEXTS } from "../../../constants/helpTexts";
import { Section } from "./Section";
import { ACTIONS, GROUP, LIST, SOURCE } from "../../../styles/classes";

export function ProjectSheet({ id }: { id: string }) {
  const p = PROJECT_BY_ID.get(id)!, parts = PARTICIPANTS_BY_PROJECT.get(id) || [];
  const outside = parts.filter((x) => !ORG_BY_ID.get(x.org)!.category).length;
  // un trait part toujours du porteur : sans porteur membre, la carte n'en trace aucun
  const noLines = !parts.some((x) => x.role === "principal" && ORG_BY_ID.get(x.org)!.category);
  const axes = [[p.axis, false] as const, ...(p.secondaryAxes || []).map((a) => [a, true] as const)].filter(([a]) => AXIS_BY_CODE.has(a));
  const programme = DATA.programmes?.[p.programme];
  // membres d'abord, puis par nom
  const groups = groupByRole([...parts].sort((a, b) => Number(Boolean(ORG_BY_ID.get(b.org)!.category)) - Number(Boolean(ORG_BY_ID.get(a.org)!.category))
    || COLLATION.compare(ORG_BY_ID.get(a.org)!.name, ORG_BY_ID.get(b.org)!.name)));
  return (
    <>
      {p.shortTitle && p.shortTitle !== p.title && <p className={`mb-2 ${SOURCE}`}>{p.title}</p>}
      {p.teaser && <p className="mb-1.5 text-[14px] leading-[1.4] text-ink-strong">{p.teaser}</p>}
      {p.description && <p className="mb-2">{p.description}</p>}
      <div className="mt-2 grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-1">
        <span className={SOURCE}>Année</span><span>{p.year}</span>
        <span className={SOURCE}>Programme{programme && <HelpButton text={programme} label="programme de financement" />}</span><span>{p.programme}</span>
        {axes.map(([a, secondary]) => (
          <Fragment key={a}>
            <span className={SOURCE}>{secondary ? "Axe secondaire" : <>Axe principal<HelpButton text={HELP_TEXTS.axes} label="axes de recherche" /></>}</span>
            <span><AxisBadge code={a} secondary={secondary} /></span>
          </Fragment>
        ))}
      </div>
      {p.transversal && <div className="mt-1.5"><span className="inline-block rounded-[9px] border border-line-strong bg-background px-1.5 text-[11px] leading-[17px] text-ink">Projet transversal : tous les axes</span></div>}
      {p.pageUrl && <div className={ACTIONS}><a href={p.pageUrl} target="_blank" rel="noopener">Fiche sur rqm.quebec</a></div>}
      <Section title="Organisations" count={formatNumber(parts.length)} open>
        {groups.map(([role, l], i) => (
          <Fragment key={role}>
            <div className={GROUP}>{l.length > 1 ? ROLE_LABELS_PLURAL[role] : ROLE_LABELS[role]}{i === 0 && <HelpButton text={HELP_TEXTS.roles} label="rôles dans un projet" />}</div>
            <ul className={LIST}>{l.map((x) => <li key={x.org}><OrgButton id={x.org} /></li>)}</ul>
          </Fragment>
        ))}
        {outside > 0 && <p className={`my-3 ${SOURCE}`}>{outside > 1
          ? `${formatNumber(outside)} d'entre elles ne sont pas membres du RQM : elles n'ont pas de point sur la carte.`
          : "L'une d'elles n'est pas membre du RQM : elle n'a pas de point sur la carte."}</p>}
        {noLines && <p className={`my-3 ${SOURCE}`}>Son porteur n'est pas membre du RQM : la carte ne trace aucun trait pour ce projet.</p>}
      </Section>
    </>
  );
}
