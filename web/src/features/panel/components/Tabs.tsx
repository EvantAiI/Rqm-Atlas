// Les onglets Membres et Projets, avec les comptes du réseau ; ← → passent de l'un à l'autre.
import { useRef, type KeyboardEvent } from "react";
import { DATA, MEMBERS } from "../../../data/dataset";
import { useAppStore, type Tab } from "../../../stores/appStore";
import { formatNumber } from "../../../utils/format";

const TABS: { tab: Tab; label: string; n: number }[] = [
  { tab: "members", label: "Membres", n: MEMBERS.length },
  { tab: "projects", label: "Projets", n: DATA.projects.length },
];
export const tabId = (tab: Tab) => `tab-${tab}`;
export const panelId = (tab: Tab) => `tab-panel-${tab}`;

export function Tabs() {
  const current = useAppStore((state) => state.tab);
  const choose = (tab: Tab) => useAppStore.getState().setTab(tab);
  const buttons = useRef(new Map<Tab, HTMLButtonElement>());
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next: Tab = current === "members" ? "projects" : "members";
    choose(next); buttons.current.get(next)?.focus();
  };
  return (
    <div role="tablist" aria-label="Vue" onKeyDown={onKeyDown} className="mb-3 flex border-b border-line-strong">
      {TABS.map(({ tab, label, n }) => (
        <button key={tab} type="button" role="tab" id={tabId(tab)} aria-controls={panelId(tab)} aria-selected={tab === current}
          tabIndex={tab === current ? 0 : -1} data-tour={tab === "projects" ? "projects-tab" : undefined}
          ref={(b) => { if (b) buttons.current.set(tab, b); }} onClick={() => choose(tab)}
          className="-mb-px flex-1 border-0 border-b-2 border-transparent bg-transparent py-1.5 text-[13px] font-bold uppercase tracking-[.05em] text-ink-muted hover:text-primary aria-selected:border-primary aria-selected:text-primary">
          {label}<span className="ml-1 font-normal tracking-normal opacity-80">{formatNumber(n)}</span>
        </button>
      ))}
    </div>
  );
}
