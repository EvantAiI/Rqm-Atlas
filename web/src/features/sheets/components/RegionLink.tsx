// « Région : Gaspésie–Îles-de-la-Madeleine » : la région d'un membre ou d'une ville, qui ouvre sa fiche.
import { useAppStore } from "../../../stores/appStore";
import { LINK_BUTTON } from "../../../styles/classes";

export function RegionLink({ name, className = "" }: { name: string | undefined; className?: string }) {
  if (!name) return null;
  return (
    <div className={className}>Région : <button type="button" className={LINK_BUTTON}
      onClick={() => useAppStore.getState().open({ type: "region", id: name }, { recenter: true })}>{name}</button></div>
  );
}
