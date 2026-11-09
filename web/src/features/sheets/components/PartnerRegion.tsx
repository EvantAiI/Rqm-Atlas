// Une région avec laquelle travaille celle de la fiche : ses projets en commun se déplient sur place, sa fiche s'ouvre
// d'un lien. Le compte dit « entre les deux régions » : un trait de la carte, lui, compte entre deux villes.
import { PROJECT_BY_ID } from "../../../data/dataset";
import { useAppStore } from "../../../stores/appStore";
import { InfoLine } from "../../../components/InfoLine";
import { ProjectButton } from "../../../components/EntityButtons";
import { Collapsible } from "../../../components/Collapsible";
import { plural } from "../../../utils/format";
import { LIST, QUIET } from "../../../styles/classes";

// projects : dans l'ordre de regionProjects, les plus récents d'abord
export function PartnerRegion({ name, projects }: { name: string; projects: Set<string> }) {
  return (
    <Collapsible summaryClassName="cursor-pointer text-primary" summary={<>{name}
      <span className="block text-[12px] text-ink-muted">{plural(projects.size, "projet")} en commun entre les deux régions</span></>}>
      <ul className={`${LIST} pl-4`}>
        {[...projects].map((id) => <li key={id}><ProjectButton id={id} /><InfoLine items={[PROJECT_BY_ID.get(id)!.year]} /></li>)}
      </ul>
      <button type="button" className={`${QUIET} mt-1 mb-1 ml-4`}
        onClick={() => useAppStore.getState().open({ type: "region", id: name }, { recenter: true })}>Voir la fiche de la région {name}</button>
    </Collapsible>
  );
}
