// « Près de chez moi » : le lieu connu, la fiche qui demande la ville, ou la position (stores/nearbyStore).
import { useNearbyStore } from "../../../stores/nearbyStore";
import { useGeolocationPermissionWatch } from "../../../hooks/useGeolocationPermissionWatch";
import { PinIcon } from "../../../components/PinIcon";
import { BUTTON } from "../../../styles/classes";

export function NearMe({ className = "" }: { className?: string }) {
  const locating = useNearbyStore((state) => state.locating);
  useGeolocationPermissionWatch();
  return (
    <div className={`mt-2 mb-1 text-[13px] ${className}`}>
      <button type="button" data-tour="near-me" disabled={locating} onClick={() => useNearbyStore.getState().nearMe()}
        className={BUTTON}>
        <PinIcon /><span>{locating ? "Localisation…" : "Près de chez moi"}</span>
      </button>
    </div>
  );
}
