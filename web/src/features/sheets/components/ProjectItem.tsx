// Un projet dans une liste de fiche : son titre, son accroche, son année, ses axes.
// title / hook : le titre et la phrase à montrer quand ils diffèrent (un sujet les surligne).
import type { ReactNode } from "react";
import { PROJECT_BY_ID } from "../../../data/dataset";
import { InfoLine } from "../../../components/InfoLine";
import { AxisBadges } from "../../../components/AxisBadge";
import { ProjectButton } from "../../../components/EntityButtons";
import { HOOK, SMALL_AXES } from "../../../styles/classes";

export function ProjectItem({ id, title, hook }: { id: string; title?: ReactNode; hook?: ReactNode }) {
  const p = PROJECT_BY_ID.get(id)!, phrase = hook ?? p.teaser;
  return (
    <>
      <ProjectButton id={id}>{title}</ProjectButton>
      {phrase && <div className={HOOK}>{phrase}</div>}
      <InfoLine items={[p.year]} />
      <div className={SMALL_AXES}><AxisBadges project={p} /></div>
    </>
  );
}
