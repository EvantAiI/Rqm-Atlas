// De courts faits sur une ligne, espacés plutôt que séparés par « · » ; une entrée vide est sautée.
import type { ReactNode } from "react";

export function InfoLine({ items }: { items: ReactNode[] }) {
  const filled = items.filter((x) => x || x === 0);
  if (!filled.length) return null;
  return <div className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-ink-muted">{filled.map((x, i) => <span key={i}>{x}</span>)}</div>;
}
