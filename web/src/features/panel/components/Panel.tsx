// Le panneau de gauche (sur téléphone, la barre du haut) : recherche, filtres, listes. Sur téléphone, son corps se
// déplie sous l'en-tête (filtersOpen). La légende est à son pied, sous les sources.
import { useRef } from "react";
import { useAppStore } from "../../../stores/appStore";
import { SkipLink } from "./SkipLink";
import { Header } from "./Header";
import { NearMe } from "./NearMe";
import { Tabs, panelId, tabId } from "./Tabs";
import { PANEL_BODY_ID } from "../../../constants/ids";
import { MemberSearch } from "./MemberSearch";
import { Categories } from "./Categories";
import { OutsideQuebec } from "./OutsideQuebec";
import { MemberFilters } from "./MemberFilters";
import { MemberCount } from "./MemberCount";
import { ProjectSearch } from "./ProjectSearch";
import { ProjectFilters } from "./ProjectFilters";
import { ProjectList } from "./ProjectList";
import { Footer } from "./Footer";
import { usePhoneTurns } from "../hooks/usePhoneTurns";

export function Panel() {
  const tab = useAppStore((state) => state.tab), open = useAppStore((state) => state.filtersOpen);
  // sur téléphone, une fiche ouverte : plus de carte entre l'en-tête et la fiche
  const sheet = useAppStore((state) => state.selection !== null);
  const phoneHidden = sheet ? "phone:hidden" : "";
  const search = useRef<HTMLInputElement>(null);   // le champ de recherche de l'onglet ouvert, où mène le lien d'évitement
  usePhoneTurns();
  return (
    <div data-zone="panel" role="region" aria-label="Recherche et filtres"
      className="absolute top-4 left-4 z-[1001] max-h-[calc(100%-32px)] w-[300px] overflow-y-auto rounded-panel border border-line bg-surface p-4 shadow-panel
        phone:top-0 phone:left-0 phone:max-h-[55%] phone:w-full phone:rounded-none phone:border-0 phone:border-b phone:px-4 phone:py-3 phone:shadow-none">
      <SkipLink target={search} />
      <Header />
      <p className={`mt-2 mb-0 text-[13px] leading-[1.4] text-ink ${phoneHidden}`}>Les membres du Réseau Québec maritime et les projets de recherche qu'ils mènent ensemble.</p>
      <NearMe className={phoneHidden} />
      <div id={PANEL_BODY_ID} className={open ? "phone:mt-3" : "phone:hidden"}>
        <Tabs />
        {tab === "members" ? (
          <div id={panelId("members")} role="tabpanel" aria-labelledby={tabId("members")}>
            <MemberSearch inputRef={search} /><Categories /><OutsideQuebec /><MemberFilters /><MemberCount />
          </div>
        ) : (
          <div id={panelId("projects")} role="tabpanel" aria-labelledby={tabId("projects")}>
            <ProjectSearch inputRef={search} /><ProjectFilters /><ProjectList />
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}
