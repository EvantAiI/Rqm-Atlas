// Un trait entre deux villes : leurs projets en commun, puis leurs membres ville par ville (les bouts du trait
// d'abord) ; la phrase d'en tête nomme les autres villes qui y participent.
import { Fragment, useMemo } from "react";
import { ORG_BY_ID, PROJECT_BY_ID, groupByTown, projectOrgs } from "../../../data/dataset";
import { endLabel, type LinkSelection } from "../../../data/links";
import type { Project } from "../../../data/types";
import { COLLATION } from "../../../lib/sorting";
import { OrgButton } from "../../../components/EntityButtons";
import { formatNumber, joinWithAnd } from "../../../utils/format";
import { ProjectItem } from "./ProjectItem";
import { Section } from "./Section";
import { GROUP, INTRO, LIST } from "../../../styles/classes";

// « Des membres d'autres villes y participent aussi : A, B et C. » ; au-delà de quatre, les trois premières et le compte.
function elsewhere(others: string[]) {
  if (!others.length) return "";
  if (others.length === 1) return ` Des membres d'une autre ville y participent aussi : ${others[0]}.`;
  return ` Des membres d'autres villes y participent aussi : ${others.length > 4 ? `${others.slice(0, 3).join(", ")} et ${others.length - 3} autres`
    : joinWithAnd(others)}.`;
}

export function LinkSheet({ link }: { link: LinkSelection }) {
  const { projects, members, towns } = useMemo(() => {
    const projects = link.projects.map((id) => PROJECT_BY_ID.get(id)).filter((p): p is Project => Boolean(p)).sort((a, b) => b.year - a.year);
    const members = [...new Set(projects.flatMap((p) => projectOrgs(p.id)))].filter((id) => ORG_BY_ID.get(id)!.category);
    const ends = [...link.from, ...link.to];
    const byTown = groupByTown([...members].sort((a, b) => COLLATION.compare(ORG_BY_ID.get(a)!.name, ORG_BY_ID.get(b)!.name)), (id) => id);
    const towns = [...byTown].sort((a, b) => Number(ends.includes(b[0])) - Number(ends.includes(a[0])) || b[1].length - a[1].length);
    return { projects, members, towns: towns.map(([name, ids]) => ({ name, ids, end: ends.includes(name) })) };
  }, [link]);
  const [a, b] = [endLabel(link.from), endLabel(link.to)];
  return (
    <>
      <p className={INTRO}>Les projets du RQM qui réunissent des membres de {a} et de {b}.{elsewhere(towns.filter((t) => !t.end).map((t) => t.name))}</p>
      <Section title="Projets" count={formatNumber(projects.length)} open>
        <ul className={LIST}>{projects.map((p) => <li key={p.id}><ProjectItem id={p.id} /></li>)}</ul>
      </Section>
      <Section title="Membres" count={formatNumber(members.length)} open>
        {towns.map(({ name, ids }) => (
          <Fragment key={name}>
            <div className={GROUP}>{name}</div>
            <ul className={LIST}>{ids.map((id) => <li key={id}><OrgButton id={id} withTown={false} /></li>)}</ul>
          </Fragment>
        ))}
      </Section>
    </>
  );
}
