// L'adresse sur deux lignes (« 310, allée des Ursulines » / « Rimouski G5L 3A1 »), ou la ville ; et pourquoi le
// point est là où il est quand ce n'est pas l'adresse.
import { Fragment } from "react";
import { isOutsideQuebec } from "../../../data/regions";
import type { Organisation } from "../../../data/types";
import { POSITION } from "../../../data/placement";
import { SOURCE } from "../../../styles/classes";

export function Address({ org: o }: { org: Organisation }) {
  const place = [o.town, o.province && o.province !== "Québec" ? o.province : "", o.country && o.country !== "Canada" ? o.country : ""].filter(Boolean).join(", ");
  const note = isOutsideQuebec(o) ? "Hors du Québec : pas sur la carte."
    : !POSITION.has(o.id) ? "Ville introuvable : pas sur la carte."
    : o.precision !== "adresse" ? <>Adresse non publiée.<br />Le point marque {o.town}, pas un lieu précis.</> : null;
  const parts = (o.address || "").split(", ");
  const lines = !o.address ? [place] : parts.length > 2 ? [parts.slice(0, 2).join(", "), parts.slice(2).join(", ")] : [o.address];
  return (
    <address className="mt-2 not-italic leading-[1.4] text-ink-strong">
      {lines.map((l, i) => <Fragment key={i}>{i > 0 && <br />}{l}</Fragment>)}
      {note && <span className={`${SOURCE} block`}>{note}</span>}
    </address>
  );
}
