// Le pied du panneau : la date des données, les sources, la légende.
import { DATA } from "../../../data/dataset";
import { longDate } from "../../../utils/format";
import { Collapsible } from "../../../components/Collapsible";
import { Legend } from "../../legend";

const DATE = longDate(DATA.generated);
const ExternalLink = ({ href, children }: { href: string; children: string }) => <a href={href} target="_blank" rel="noopener">{children}</a>;

export function Footer() {
  return (
    <div className="relative border-t border-line pt-3 text-[12px] leading-normal text-ink-muted">
      <span className="absolute top-3 right-0">Données du {DATE}</span>
      <Collapsible summary="Sources" summaryClassName="cursor-pointer text-primary">
        <ul className="mt-1 mb-0 list-none pl-4 [&>li]:my-1">
          <li>Membres et projets : Réseau Québec maritime (<ExternalLink href="https://www.rqm.quebec/devenir-membre/">devenir membre</ExternalLink>)</li>
          <li>Adresses : <ExternalLink href="https://adressesquebec.gouv.qc.ca">Adresses Québec</ExternalLink> et <ExternalLink href="https://www.openstreetmap.org/copyright">OpenStreetMap</ExternalLink></li>
          <li>Villes : <ExternalLink href="https://www.geonames.org">GeoNames</ExternalLink> et <ExternalLink href="https://www.wikidata.org">Wikidata</ExternalLink></li>
          <li>Régions : <ExternalLink href="https://www.donneesquebec.ca/recherche/dataset/decoupages-administratifs">Découpages administratifs</ExternalLink> du MRNF (Données Québec, CC-BY 4.0)</li>
          <li>Contacts : sites des membres</li>
          <li>Publications : <ExternalLink href="https://openalex.org">OpenAlex</ExternalLink> et <ExternalLink href="https://ror.org">ROR</ExternalLink></li>
          <li>Fond : © <ExternalLink href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</ExternalLink></li>
          <li>Tuiles : <ExternalLink href="https://protomaps.com">Protomaps</ExternalLink></li>
          <li>Code : <ExternalLink href={DATA.repository}>dépôt du projet</ExternalLink></li>
        </ul>
      </Collapsible>
      <Legend />
    </div>
  );
}
