// La liste d'un champ à suggestions : ses options, et au besoin une ligne de tête ou un « rien trouvé ».
import type { ReactNode } from "react";
import type { Combobox } from "../hooks/useCombobox";
import { LISTBOX, OPTION } from "../styles/classes";

interface Props<T> {
  box: Combobox<T>;
  label: string;
  render(item: T): ReactNode;
  heading?: string | null;
  nothing?: string | null;
}

// la ligne de tête ne vient qu'avec des options ; sans option, seul un « rien trouvé » montre la liste
export const isShown = <T,>(box: Combobox<T>, nothing?: string | null) => box.open && (box.items.length > 0 || Boolean(nothing));

export function Suggestions<T>({ box, label, render, heading, nothing }: Props<T>) {
  const shown = isShown(box, nothing);
  // une ancre de hauteur nulle sous le champ : la liste flotte par-dessus ce qui suit, sans le pousser
  return (
    <div className="relative">
      <ul id={box.listId} role="listbox" aria-label={label} hidden={!shown} tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}   // le clic ne retire pas le focus du champ
        className={`${LISTBOX} [&_mark]:bg-transparent [&_mark]:font-bold [&_mark]:text-primary`}>
        {heading && box.items.length > 0 && <li role="presentation" className="px-2 py-1 text-[12px] text-ink-muted">{heading}</li>}
        {box.items.map((item, i) => (
          <li key={i} id={box.optionId(i)} role="option" aria-selected={i === box.active} onClick={() => box.choose(item)}
            className={OPTION}>{render(item)}</li>
        ))}
        {!box.items.length && nothing && <li aria-disabled="true" className="px-2 py-1 text-[13px] text-ink-muted">{nothing}</li>}
      </ul>
    </div>
  );
}
