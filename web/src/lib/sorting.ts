// Le tri des listes de publications (les clés sont les champs des données).
export const COLLATION = new Intl.Collator("fr");
interface Sortable { year?: number | null; title?: string; journal?: string; citations?: number }
export const SORTS = {
  year:      { label: "Plus récentes", key: (e: Sortable) => e.year, desc: true },
  title:     { label: "Titre",         key: (e: Sortable) => e.title, desc: false },
  journal:   { label: "Revue",         key: (e: Sortable) => e.journal, desc: false },
  citations: { label: "Plus citées",   key: (e: Sortable) => e.citations, desc: true },
};
export function sortBy<T extends Sortable>(items: T[], sort: keyof typeof SORTS): T[] {
  const t = SORTS[sort];
  const isEmpty = (v: unknown) => v === null || v === undefined || v === "";
  return [...items].sort((a, b) => {
    const x = t.key(a), y = t.key(b);
    if (isEmpty(x) || isEmpty(y)) return Number(isEmpty(x)) - Number(isEmpty(y));
    const c = typeof x === "number" ? x - (y as number) : COLLATION.compare(String(x), String(y));
    return t.desc ? -c : c;
  });
}
