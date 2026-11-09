// « Près de chez moi » : les membres autour du lieu, ville par ville, de la plus proche à la plus loin ; sans lieu,
// la ville à taper (et, la position bloquée, où la débloquer).
import { useEffect, useMemo, useRef, useState } from "react";
import { ORG_BY_ID, byActivity, projectCount } from "../../../data/dataset";
import { NEARBY_RADIUS, nearbyTowns } from "../../../data/nearby";
import { useAppStore } from "../../../stores/appStore";
import { OrgButton } from "../../../components/EntityButtons";
import { formatNumber, plural } from "../../../utils/format";
import { PlaceInput } from "./PlaceInput";
import { useNearbyStore } from "../../../stores/nearbyStore";
import { Section } from "./Section";
import { INTRO, LIST, NOTE, QUIET, REACH, SOURCE } from "../../../styles/classes";

export function NearbySheet() {
  const here = useNearbyStore((state) => state.here), selection = useAppStore((state) => state.selection);
  const blocked = useNearbyStore((state) => state.blocked), blockedTries = useNearbyStore((state) => state.blockedTries);
  const input = useRef<HTMLInputElement>(null);
  const [changing, setChanging] = useState(false);
  // sans lieu, le focus va au champ, pas au titre (cet effet passe après celui du cadre)
  const listRequest = useNearbyStore((state) => state.listRequest);
  useEffect(() => { if (!here || changing) input.current?.focus(); }, [selection, here, changing, listRequest]);
  const towns = useMemo(() => (here ? nearbyTowns(here) : []), [here]);

  if (!here) return (
    <>
      {blocked && <p className={NOTE}>Votre navigateur bloque la position pour ce site.<br />
        Pour l'autoriser, cliquez l'icône à gauche de l'adresse, puis « Position ».
        {blockedTries > 1 && <><br /><b>Elle est toujours bloquée.</b></>}</p>}
      <p className="my-[13px]">Tapez votre ville pour voir les membres autour d'elle :</p>
      <PlaceInput inputRef={input} />
      <p className={INTRO}>Votre position reste dans votre navigateur.</p>
    </>
  );
  const n = towns.reduce((t, x) => t + x.town.ids.length, 0);
  return (
    <>
      <p className={REACH}>{towns[0].distance > NEARBY_RADIUS
        ? <>Aucun membre à moins de {NEARBY_RADIUS} km.<br />Le plus proche est à {formatNumber(Math.round(towns[0].distance))} km.</>
        : <><b>{plural(n, "membre")}</b> à moins de {NEARBY_RADIUS} km</>}</p>
      <p className={INTRO}>Votre position reste dans votre navigateur.<br />
        <button type="button" className={QUIET} onClick={() => setChanging(true)}>Changer de lieu</button></p>
      <div hidden={!changing}><PlaceInput inputRef={input} /></div>
      {towns.map(({ town, distance }) => (
        <Section key={town.name} title={town.name} count={distance < 1 ? "ici" : `${formatNumber(Math.round(distance))} km`} open>
          <ul className={LIST}>
            {town.ids.map((id) => ORG_BY_ID.get(id)!).sort(byActivity).map((o) => (
              <li key={o.id}><OrgButton id={o.id} withTown={false} />
                <div className={SOURCE}>{projectCount(o.id) ? plural(projectCount(o.id), "projet") : "Pas encore de projet du RQM"}</div></li>
            ))}
          </ul>
        </Section>
      ))}
    </>
  );
}
