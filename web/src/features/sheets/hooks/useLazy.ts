// Les données que seule une fiche lit (generated/details/<id>.json, generated/towns.json), chargées à la première
// demande puis gardées ; un échec (hors ligne) est retenu aussi.
import { useEffect, useReducer } from "react";

export type Loaded<T> = { status: "loading" | "missing"; value?: undefined } | { status: "ok"; value: T };
type Loader<T> = () => Promise<T>;
const settled = new Map<Loader<unknown>, Loaded<unknown>>(), pending = new Map<Loader<unknown>, Promise<unknown>>();

export function load<T>(loader: Loader<T>): Promise<Loaded<T>> {
  if (!pending.has(loader)) pending.set(loader, loader().then((value) => settled.set(loader, { status: "ok", value }),
    () => settled.set(loader, { status: "missing" })));
  return pending.get(loader)!.then(() => settled.get(loader) as Loaded<T>);
}

// null : rien à charger.
export function useLazy<T>(loader: Loader<T> | null): Loaded<T> | null {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!loader || settled.has(loader)) return;
    let live = true;
    void load(loader).then(() => { if (live) refresh(); });
    return () => { live = false; };
  }, [loader]);
  return loader ? (settled.get(loader) as Loaded<T> | undefined) ?? { status: "loading" } : null;
}
