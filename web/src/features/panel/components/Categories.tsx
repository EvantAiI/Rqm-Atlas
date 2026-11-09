// Les catégories d'adhésion : Régulier, Associé, puis Usager et ses trois sous-catégories en retrait.
import { useEffect, useRef } from "react";
import { CATEGORIES, CATEGORY_MEANING, USER_CATEGORIES, categoryColour, type CategoryInfo } from "../../../data/categories";
import type { Category } from "../../../data/types";
import { useAppStore } from "../../../stores/appStore";
import { HelpButton } from "../../help";
import { Dot } from "../../../components/Dot";
import { HELP_TEXTS } from "../../../constants/helpTexts";
import { BLOCK_TITLE, CHECKBOX, CHECK_ROW } from "../../../styles/classes";

const USERS = USER_CATEGORIES;
const USERS_COLOUR = `conic-gradient(${USERS.map((c, i) => `${categoryColour(c)} ${i * 120}deg ${(i + 1) * 120}deg`).join(", ")})`;
const MEANING = "ml-auto pl-2 text-right text-[12px] text-ink-muted";

function Box({ c, inset }: { c: CategoryInfo; inset?: boolean }) {
  const ticked = useAppStore((state) => state.categories.has(c.code));
  const toggle = () => {
    const { categories, setMemberFilters } = useAppStore.getState(), next = new Set(categories);
    if (ticked) next.delete(c.code); else next.add(c.code);
    setMemberFilters({ categories: next });
  };
  return (
    <label className={`${CHECK_ROW} ${inset ? "pl-[22px]" : ""}`}>
      <input type="checkbox" className={CHECKBOX} checked={ticked} onChange={toggle} />
      <Dot colour={categoryColour(c)} className="align-[-1px]" /><span>{c.label}</span>
      {CATEGORY_MEANING[c.code] && <span className={MEANING}>{CATEGORY_MEANING[c.code]}</span>}
    </label>
  );
}

// « Usager » coche ou décoche ses trois sous-catégories ; à moitié cochées, la case est indéterminée.
function UsersBox() {
  const n = useAppStore((state) => USERS.filter((c) => state.categories.has(c.code)).length);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current!.indeterminate = n > 0 && n < USERS.length; }, [n]);
  const toggle = () => {
    const { categories, setMemberFilters } = useAppStore.getState(), next = new Set<Category>(categories), all = n < USERS.length;
    for (const c of USERS) if (all) next.add(c.code); else next.delete(c.code);
    setMemberFilters({ categories: next });
  };
  return (
    <label className={CHECK_ROW}>
      <input ref={ref} type="checkbox" className={CHECKBOX} checked={n === USERS.length} onChange={toggle} />
      <Dot colour={USERS_COLOUR} className="align-[-1px]" /><span>Usager</span>
      <span className={MEANING}>acteurs du secteur maritime</span>
    </label>
  );
}

export function Categories() {
  return (
    <fieldset className="mb-3 border-0 p-0">
      <legend className={`${BLOCK_TITLE} flex w-full items-center pb-1`}>
        Adhésion au RQM<HelpButton text={HELP_TEXTS.categories} label="catégories de membres" />
        <a href="https://www.rqm.quebec/devenir-membre/" target="_blank" rel="noopener" className="ml-auto text-[12px] font-normal normal-case tracking-normal">Devenir membre ↗</a>
      </legend>
      {CATEGORIES.filter((c) => !c.isUser).map((c) => <Box key={c.code} c={c} />)}
      <UsersBox />
      {USERS.map((c) => <Box key={c.code} c={c} inset />)}
    </fieldset>
  );
}
