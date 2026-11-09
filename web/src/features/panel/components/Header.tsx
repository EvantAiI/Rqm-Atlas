// L'en-tête du panneau : le logo, le titre, le « ? » de la visite guidée ; sur téléphone, le bouton « Filtres ».
import { useTourStore } from "../../../stores/tourStore";
import { FiltersButton } from "./FiltersButton";

export function Header() {
  return (
    <div className="sticky -top-4 z-[2] -mx-4 -mt-4 flex items-center gap-3 border-b border-line bg-surface px-4 pt-4 pb-2 phone:static phone:m-0 phone:p-0">
      <a href="https://www.rqm.quebec/" target="_blank" rel="noopener">
        <img src="./logo-rqm.svg" alt="Réseau Québec maritime" width={117} height={30} className="inline h-[30px] w-auto align-baseline flex-none phone:h-6" />
      </a>
      <h1 tabIndex={-1} className="m-0 flex-1 text-[17px] leading-tight font-semibold text-primary phone:text-[15px]">La carte du réseau</h1>
      <button type="button" aria-label="Comment ça marche ?" title="Comment ça marche ?" data-tour="help" onClick={() => useTourStore.getState().openTour()}
        className="relative size-6 flex-none rounded-full border-[1.5px] border-primary bg-surface p-0 text-[13px] leading-none font-bold text-primary hover:bg-primary hover:text-white phone:after:absolute phone:after:-inset-2.5 phone:after:content-['']">?</button>
      <FiltersButton />
    </div>
  );
}
