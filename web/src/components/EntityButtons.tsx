// Le nom d'une organisation ou d'un projet, qui ouvre sa fiche : dans les fiches et les listes du panneau.
// data-org / data-project : la fiche refermée rend le focus au même bouton, même si la liste a été redessinée.
import type { ReactNode } from "react";
import { ORG_BY_ID, PROJECT_BY_ID } from "../data/dataset";
import { CATEGORY_BY_CODE, categoryColour } from "../data/categories";
import { useAppStore } from "../stores/appStore";
import { LINK_BUTTON } from "../styles/classes";
import { Dot } from "./Dot";

// Un membre : sa pastille et son nom, sa ville dessous ; hors réseau : son nom, sa ville et son pays hors Canada.
export function OrgButton({ id, withTown = true, fromPanel = false }: { id: string; withTown?: boolean; fromPanel?: boolean }) {
  const o = ORG_BY_ID.get(id);
  if (!o) return <>{id}</>;
  const place = o.category ? (withTown ? o.town : "") : [o.town, o.country !== "Canada" ? o.country : ""].filter(Boolean).join(", ");
  return (
    <>
      <button type="button" data-org={id} className={LINK_BUTTON} onClick={() => useAppStore.getState().openOrganisation(id, fromPanel)}>
        {o.category && <Dot colour={categoryColour(CATEGORY_BY_CODE.get(o.category)!)} className="mr-1.5 align-[-1px]" />}{o.name}
      </button>
      {place && <div className="text-[12px] text-ink-muted">{place}</div>}
    </>
  );
}

// Un projet : son titre court ; children remplace le titre (le mot d'un sujet surligné).
export function ProjectButton({ id, children }: { id: string; children?: ReactNode }) {
  const p = PROJECT_BY_ID.get(id)!;
  return (
    <button type="button" data-project={id} className={`${LINK_BUTTON} font-bold`}
      onClick={() => useAppStore.getState().open({ type: "project", id }, { recenter: true })}>
      {children ?? (p.shortTitle || p.title)}
    </button>
  );
}
