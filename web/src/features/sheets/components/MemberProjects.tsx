// Les projets d'un membre : en tête ce qu'il fait (la part de chaque axe, en axe principal), chaque puce filtrant
// la liste et les liens de la carte ; puis ses projets selon son rôle, ceux qu'il porte d'abord.
import { Fragment } from "react";
import { DATA } from "../../../data/dataset";
import { ROLE_LABELS, groupByRole } from "../../../data/categories";
import type { Project, Role } from "../../../data/types";
import { useAppStore } from "../../../stores/appStore";
import { HelpButton } from "../../help";
import { AxisBadge } from "../../../components/AxisBadge";
import { formatNumber } from "../../../utils/format";
import { HELP_TEXTS } from "../../../constants/helpTexts";
import { ProjectItem } from "./ProjectItem";
import { Scroller } from "./Scroller";
import { COUNT, GROUP, LIST, QUIET } from "../../../styles/classes";

export interface Part { project: string; role: Role; p: Project }

export function MemberProjects({ parts }: { parts: Part[] }) {
  const axis = useAppStore((state) => state.sheetAxis);
  const choose = (a: string) => useAppStore.getState().setSheetAxis(a);
  const byAxis = DATA.axes.map((a) => [a.code, parts.filter((x) => x.p.axis === a.code).length] as const).filter(([, n]) => n);
  const kept = axis ? parts.filter((x) => x.p.axis === axis) : parts;
  const groups = groupByRole(kept);
  // l'aide des rôles reste sur le premier groupe de la liste entière, même filtrée
  const firstRole = groupByRole(parts)[0]?.[0];
  return (
    <>
      <div aria-label="Filtrer ses projets par axe" className="mt-1 flex flex-wrap items-center gap-1">
        {byAxis.map(([code, n]) => (
          // un bouton : la puce se prend aussi au clavier
          <button key={code} type="button" aria-pressed={axis === code} onClick={() => choose(axis === code ? "" : code)}
            className={`border-0 bg-transparent p-0 leading-none ${axis && axis !== code ? "opacity-35" : ""}`}>
            <AxisBadge code={code}> {n}</AxisBadge>
          </button>
        ))}
        <HelpButton text={HELP_TEXTS.axisBreakdown} label="répartition des projets par axe" />
        {axis && <button type="button" className={QUIET} onClick={() => choose("")}>Tous les axes</button>}
      </div>
      <Scroller>
        {groups.map(([role, l]) => (
          <Fragment key={role}>
            <div className={GROUP}>{ROLE_LABELS[role]} <span className={COUNT}>{formatNumber(l.length)}</span>{role === firstRole && <HelpButton text={HELP_TEXTS.roles} label="rôles dans un projet" />}</div>
            <ul className={LIST}>{l.map(({ p }) => <li key={p.id}><ProjectItem id={p.id} /></li>)}</ul>
          </Fragment>
        ))}
      </Scroller>
    </>
  );
}
