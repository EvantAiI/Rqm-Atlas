// Un champ à suggestions (combobox) : quelle liste se montre, l'option active, flèches, Entrée, Échap.
import { useEffect, useId, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type RefObject } from "react";
import { isTourRunning } from "../stores/tourStore";

export interface ComboboxOptions<T> {
  text: string;
  suggest(text: string, focused: boolean): T[];   // stable (module ou useCallback) : la liste n'est recalculée qu'à son changement
  take(item: T): void;
  first?: boolean;     // Entrée prend la première suggestion, même sans flèche
  clear?(): void;      // recherche de membres : Échap vide le champ, et un champ non vide garde sa liste sans le focus
  inputRef?: RefObject<HTMLInputElement | null>;   // le champ, quand son parent doit aussi le tenir (pour lui donner le focus)
}

export function useCombobox<T>({ text, suggest, take, first = false, clear, inputRef }: ComboboxOptions<T>) {
  const listId = useId();
  const ownRef = useRef<HTMLInputElement>(null), input = inputRef ?? ownRef;
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [seen, setSeen] = useState(text);
  // le texte changé d'ailleurs (la visite qui tape, ou qui efface) : la liste suit
  if (seen !== text) { setSeen(text); setActive(-1); if (!focused) setOpen(Boolean(text.trim())); }
  const items = useMemo(() => suggest(text, focused), [suggest, text, focused]);

  const close = () => { setOpen(false); setActive(-1); };
  // recherche de membres : le champ vidé repropose ses sujets tant qu'il a le focus (comme suggerer() avant)
  const choose = (item: T) => { if (clear) setActive(-1); else close(); take(item); };

  // une liste restée ouverte hors du champ : Échap la ferme, avant de fermer la fiche
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape" || document.activeElement === input.current || isTourRunning()) return;
      e.stopPropagation(); close();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, input]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && items.length) {
      e.preventDefault(); setOpen(true);
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length);
    } else if (e.key === "Enter" && items.length && (first || active >= 0 || items.length === 1)) {
      e.preventDefault(); choose(items[Math.max(active, 0)]);
    } else if (e.key === "Escape" && ((open && items.length > 0) || (clear && text))) {
      e.stopPropagation(); clear?.(); close();
    }
  };

  return {
    items, active, open, listId, choose,
    optionId: (i: number) => `${listId}-${i}`,
    field: {
      ref: input, role: "combobox", "aria-autocomplete": "list" as const, "aria-controls": listId,
      "aria-activedescendant": open && active >= 0 ? `${listId}-${active}` : undefined, onKeyDown,
      onChange: () => { setOpen(true); setActive(-1); },   // à composer avec l'écriture du texte
      // un focus rendu par une fiche qui se ferme (sans élément d'origine) n'ouvre pas la liste ; un clic, si
      onFocus: (e: FocusEvent<HTMLInputElement>) => { setFocused(true); if (e.relatedTarget) setOpen(true); },
      onClick: () => setOpen(true),
      onBlur: () => { setFocused(false); if (!clear || !text.trim()) close(); },
    },
  };
}
export type Combobox<T> = ReturnType<typeof useCombobox<T>>;
