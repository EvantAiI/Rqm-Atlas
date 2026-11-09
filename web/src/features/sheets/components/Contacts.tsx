// Les contacts d'une organisation : son site, son courriel, son téléphone.
import type { Organisation } from "../../../data/types";
import { ACTIONS } from "../../../styles/classes";

export function Contacts({ org: o }: { org: Organisation }) {
  if (!o.website && !o.email && !o.phone) return null;
  return (
    <div className={ACTIONS}>
      {o.website && <a href={o.website} target="_blank" rel="noopener">Site web</a>}
      {o.email && <a href={`mailto:${o.email}`} target="_blank" rel="noopener">{o.email}</a>}
      {o.phone && <a href={`tel:${o.phone.replace(/[^\d+]/g, "")}`} target="_blank" rel="noopener">{o.phone}</a>}
    </div>
  );
}
