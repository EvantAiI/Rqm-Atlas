// « Près de chez moi » a choisi ce membre : on dit pourquoi, et à quelle distance.
import { useAppStore } from "../../../stores/appStore";
import { useNearbyStore } from "../../../stores/nearbyStore";
import { POSITION } from "../../../data/placement";
import { km } from "../../../lib/distance";
import { HelpButton } from "../../help";
import { formatNumber } from "../../../utils/format";
import { HELP_TEXTS } from "../../../constants/helpTexts";
import { NOTE } from "../../../styles/classes";

export function NearestNote({ id }: { id: string }) {
  const back = useAppStore((state) => state.backTo), here = useNearbyStore((state) => state.here), chosen = useNearbyStore((state) => state.nearbyChoice);
  const at = POSITION.get(id);
  if (back?.type !== "nearby" || !here || chosen !== id || !at) return null;
  return (
    <p className={NOTE}>
      Le plus actif près de {here.name}<HelpButton text={HELP_TEXTS.nearby} label="le membre le plus actif près de vous" /><br />
      à {formatNumber(Math.max(1, Math.round(km([here.lon, here.lat], at))))} km
    </p>
  );
}
