// Les publications maritimes d'un membre : la source, puis la liste (generated/details/<id>.json, chargée à la demande),
// à chercher et trier, montrée par tranches de 50.
import { useMemo, useState } from "react";
import { DATA } from "../../../data/dataset";
import type { Article, Detail, Organisation } from "../../../data/types";
import { filterMatches, terms } from "../../../lib/search";
import { SORTS, sortBy } from "../../../lib/sorting";
import { InfoLine } from "../../../components/InfoLine";
import { longDate, plural } from "../../../utils/format";
import { useLazy } from "../hooks/useLazy";
import { FIELD, LIST, QUIET, SOURCE } from "../../../styles/classes";

const SLICE = 50;
// la liste part de cette année (DEPUIS, collectors/publications.py) ; le compte de la section, lui, les prend toutes
const SINCE = 2015;
// un fichier par membre qui a des publications relevées
const DETAILS = import.meta.glob<Detail>("../../../../generated/details/*.json", { import: "default" });
export const detailLoader = (o: Organisation) => DETAILS[`../../../../generated/details/${o.id}.json`] ?? null;

export function Publications({ org: o }: { org: Organisation }) {
  const detail = useLazy(detailLoader(o));
  const p = o.publications!;
  const surveyed = DATA.publicationsDate
    ? `, relevé du ${longDate(DATA.publicationsDate)}` : "";
  return (
    <>
      <p className="mt-1 text-[12px] leading-[1.4] text-ink-muted">
        Source : <a href={p.openalex} target="_blank" rel="noopener">OpenAlex</a>{surveyed}<br />
        Océanographie et sciences aquatiques
        {p.evidence && <><br /><a href={p.evidence} target="_blank" rel="noopener">La liste complète</a></>}
      </p>
      {detail?.status === "ok" ? <ArticleList articles={detail.value.maritime} />
        : detail && <p className={`my-3 ${SOURCE}`}>{detail.status === "missing" ? "Détail indisponible." : "Chargement…"}</p>}
    </>
  );
}

function ArticleList({ articles }: { articles: Article[] }) {
  const [query, setQuery] = useState(""), [sort, setSort] = useState<keyof typeof SORTS>("year"), [shown, setShown] = useState(SLICE);
  const searching = terms(query).length > 0;
  const list = useMemo(() => (searching ? filterMatches(sortBy(articles, sort), query, ["title", "journal", "year"]) : sortBy(articles, sort)),
    [articles, sort, query, searching]);
  const k = Math.min(shown, list.length);
  return (
    <>
      <div className="mt-2 flex gap-2">
        <input type="search" className={`${FIELD} flex-[1_1_100px]`} placeholder="Titre, revue, année…" aria-label="Rechercher dans les publications"
          value={query} onChange={(e) => { setQuery(e.target.value); setShown(SLICE); }} />
        <select className={`${FIELD} w-auto max-w-1/2 flex-[0_1_auto] px-1.5 py-[5px]`} aria-label="Trier les publications"
          value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}>
          {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((t) => <option key={t} value={t}>{SORTS[t].label}</option>)}
        </select>
      </div>
      <div className={`mt-1 ${SOURCE}`} aria-live="polite">
        {!list.length ? "Aucun résultat" : searching ? plural(list.length, "trouvée") : `${plural(list.length, "publication")} depuis ${SINCE}`}
      </div>
      <ul className={`${LIST} [&_a]:no-underline [&_a:hover]:underline`}>
        {list.slice(0, k).map((r, i) => (
          <li key={i}>
            <a href={r.url} target="_blank" rel="noopener">{r.title || r.url}</a>
            <InfoLine items={[r.year, r.journal, r.citations != null && plural(r.citations, "citation")]} />
          </li>
        ))}
      </ul>
      {list.length > shown && <button type="button" className={QUIET} onClick={() => setShown(shown + SLICE)}>
        Afficher {Math.min(SLICE, list.length - shown)} de plus</button>}
    </>
  );
}
