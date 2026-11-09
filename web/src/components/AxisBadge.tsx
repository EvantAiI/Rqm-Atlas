// Un axe de recherche, montré par son nom court et sa couleur, jamais par son code : plein pour l'axe principal, cerné
// pour un axe secondaire.
import type { ReactNode } from "react";
import { AXIS_BY_CODE } from "../data/dataset";
import { LIGHT_AXIS_COLOURS, readableColour } from "../data/axes";
import type { Project } from "../data/types";

// children : ce qui suit le nom dans la puce (le compte d'une fiche membre).
export function AxisBadge({ code, secondary = false, children }: { code: string; secondary?: boolean; children?: ReactNode }) {
  const a = AXIS_BY_CODE.get(code);
  if (!a) return null;
  const c = readableColour(a.color), light = LIGHT_AXIS_COLOURS.has(a.color.toUpperCase());
  return (
    <span data-axis={code} title={`${a.label}${secondary ? " (axe secondaire)" : ""}`}
      style={secondary ? { color: light ? undefined : c, borderColor: c } : { background: c, borderColor: c }}
      className={`inline-block rounded-full border px-[7px] text-[11px] leading-[18px] whitespace-nowrap ${secondary ? `bg-surface font-semibold ${light ? "text-ink-strong" : ""}` : light ? "font-bold text-ink-strong" : "font-bold text-white"}`}>
      {a.short}{children}
    </span>
  );
}

export function AxisBadges({ project }: { project: Project }) {
  return (
    <span className="flex flex-wrap gap-1">
      <AxisBadge code={project.axis} />
      {(project.secondaryAxes || []).map((a) => <AxisBadge key={a} code={a} secondary />)}
    </span>
  );
}
