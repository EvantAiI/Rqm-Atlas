// Les étapes de la visite : chacune éclaire un élément et dit à quoi il sert ; certaines le font (taper un sujet,
// ouvrir une fiche). Les textes vivent ici, les chiffres viennent des données : rien à réécrire quand les CSV changent.
import { DATA, MEMBERS } from "../../../data/dataset";
import type { Map as MapLibre } from "maplibre-gl";
import type { Organisation } from "../../../data/types";
import { TOWN_BY_NAME, dotZoom } from "../../../data/placement";
import { forTouch, formatNumber } from "../../../utils/format";
import { useAppStore } from "../../../stores/appStore";
import { useTourStore } from "../../../stores/tourStore";
import { around, bubbleOf, mapZone, rectOf, type Rect } from "./targets";

export const DEMO_SUBJECT = "érosion";

export interface StepContext { demo: Organisation; map?: MapLibre; later(ms: number, f: () => void): void }
export interface Step {
  title: string;
  text(demo: Organisation): string;
  target?(demo: Organisation, phase: number): Rect | null;
  besidePanel?: boolean;   // la bulle se pose sur le panneau : la carte éclairée reste libre
  filters?: boolean;       // téléphone : la cible est dans les filtres, dépliés le temps de l'étape
  end?: string;            // le libellé du dernier bouton, s'il fait autre chose que fermer
  start?(c: StepContext): void;   // sans start : la fiche ouverte se ferme
}

const page = () => useAppStore.getState();
const tour = () => useTourStore.getState();
// La ville du membre, au zoom où il devient un point.
const town = (o: Organisation) => { const town = TOWN_BY_NAME.get(o.town!)!; return { center: [town.lon, town.lat] as [number, number], zoom: dotZoom(o.id) }; };

export const STEPS: Step[] = [
  { title: "La carte du réseau", target: mapZone, besidePanel: true,
    text: () => `Voici les ${formatNumber(MEMBERS.length)} membres du Réseau Québec maritime et les ${formatNumber(DATA.projects.length)} projets de recherche qu'ils mènent ensemble.\nLes traits relient le porteur de chaque projet à ses participants. D'une ville à l'autre, ils n'en font qu'un.`,
    start: () => { page().close(); page().showOverview(600); page().setShowCollaborations(true); } },
  { title: "Une bulle, une ville", target: (demo, phase) => (phase ? mapZone() : bubbleOf(demo.id)), besidePanel: true,
    text: (demo) => `De loin, les membres d'une même ville sont réunis dans une bulle, et le chiffre au centre dit combien ils sont.\nChoisir la bulle de ${demo.town} zoome jusqu'à ses membres : un point pour chacun.`,
    start: ({ demo, map, later }) => {
      page().close(); page().showOverview(0);
      // d'abord glisser jusqu'à la ville, puis zoomer sur elle : un zoom qui glisse en même temps passe par le large
      later(1800, () => { tour().setPhase(1); map?.easeTo({ center: town(demo).center, duration: 700 }); });
      later(2600, () => map?.easeTo({ zoom: town(demo).zoom, duration: 1400 }));
    } },
  { title: "Un point, un membre", target: mapZone, besidePanel: true,
    text: (demo) => forTouch(`Un clic sur un point ouvre la fiche du membre, ici ${demo.acronym || demo.name} : son adresse et ses projets.\nSur la carte, ses traits le relient aux porteurs de ses projets et, pour ceux qu'il porte, à chaque participant.`),
    start: ({ demo, map, later }) => {
      page().close(); map?.jumpTo(town(demo));
      later(900, () => page().open({ type: "member", id: demo.id }, { recenter: true }));
    } },
  { title: "Les projets", filters: true, target: () => rectOf('[data-tour="projects-tab"]'),
    text: () => `L'onglet Projets liste les ${formatNumber(DATA.projects.length)} projets financés par le RQM.\nChoisissez-en un : la carte relie son porteur à chacun de ses participants.`,
    start: () => { page().close(); page().setTab("projects"); } },
  { title: "Cherchez par sujet", filters: true,
    target: (_, phase) => (phase ? rectOf('[data-zone="sheet"]') : around(rectOf('[data-tour="search"]'), rectOf('[data-tour="search"] [role="listbox"]'))),
    text: () => `Le champ des projets cherche un sujet, comme «\u00a0${DEMO_SUBJECT}\u00a0».\nLa fiche montre les projets qui en parlent, puis les membres qui les mènent.`,
    start: ({ later }) => {
      page().close(); page().setTab("projects");
      const type = (query: string) => page().setProjectFilters({ query });
      for (let i = 1; i <= DEMO_SUBJECT.length; i++) later(120 * i, () => type(DEMO_SUBJECT.slice(0, i)));   // une lettre après l'autre
      later(2600, () => { tour().setPhase(1); type(""); page().open({ type: "subject", id: DEMO_SUBJECT }, { recenter: true }); });
    } },
  { title: "Près de chez vous", end: "Essayer", target: () => rectOf('[data-tour="near-me"]'),
    text: () => "Ce bouton trouve le membre le plus actif autour de vous.\nVotre position reste dans votre navigateur : elle n'est envoyée nulle part." },
];
