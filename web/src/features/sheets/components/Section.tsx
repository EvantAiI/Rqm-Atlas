// Une section de fiche qui se replie : son titre en capitales, son compte à côté, un chevron qui tourne.
import type { ReactNode } from "react";
import { Collapsible } from "../../../components/Collapsible";

const SUMMARY = "flex cursor-pointer list-none items-baseline gap-2 text-[12px] font-bold uppercase tracking-[.05em] text-primary "
  + "[&::-webkit-details-marker]:hidden before:size-1.5 before:flex-none before:self-center before:border-solid before:border-current "
  + "before:[border-width:0_1.5px_1.5px_0] before:-rotate-45 before:transition-[rotate] before:duration-150 before:content-[''] "
  + "group-open:before:rotate-45 motion-reduce:before:transition-none";

export function Section({ title, count, open = false, children }: { title: ReactNode; count: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <Collapsible defaultOpen={open} className="group mt-3 border-t border-line pt-2" summaryClassName={SUMMARY}
      summary={<>{title} <span className="font-normal normal-case tracking-normal text-ink-muted">{count}</span></>}>
      {children}
    </Collapsible>
  );
}
