// La bulle de survol : le nom d'un point, d'une ville ou d'une grappe, le détail d'un trait. Au plus une recherche par
// image ; le contenu n'est refait que si la cible change.
import { useEffect } from "react";
import { Popup, type Map as MapLibre, type MapMouseEvent } from "maplibre-gl";
import { formatNumber, plural } from "../../../utils/format";
import { ORG_BY_ID } from "../../../data/dataset";
import { useAppStore } from "../../../stores/appStore";
import type { TooltipLine } from "../lib/links";
import { offsetAt } from "../../../data/placement";
import { targetAt, type Target } from "../lib/targets";
import { highlightWords } from "../lib/counts";

// Les lignes de la bulle ; les secondaires (`src`) en gris.
function content(lines: TooltipLine[]) {
  const box = document.createDocumentFragment();
  lines.forEach(({ t, src, bold }, i) => {
    if (i) box.append(document.createElement("br"));
    const e = src ? Object.assign(document.createElement("span"), { className: "src" }) : bold ? document.createElement("b") : null;
    if (e) { e.textContent = t; box.append(e); } else box.append(t);
  });
  return box;
}

function linesOf(f: Target): TooltipLine[] {
  if (!f.ids || f.n === 1) return [{ t: ORG_BY_ID.get(f.id || f.ids![0])!.name }];
  const { selection, tab } = useAppStore.getState(), linked = highlightWords(selection, tab);
  return [{ t: f.name || ORG_BY_ID.get(f.ids[0])!.name }, ...(f.others ? [{ t: `et ${f.others}`, src: true }] : []),
    { t: `${plural(f.n, "membre")}${f.a < f.n ? `, dont ${formatNumber(f.a)} ${linked}` : ""}`, src: true }];
}

const isChosen = (f: Target) => { const s = useAppStore.getState().selection; return s?.type === "member" && f.id === s.id; };

export function useTooltip(map: MapLibre | null) {
  useEffect(() => {
    if (!map) return;
    const tip = new Popup({ closeButton: false, closeOnClick: false, className: "map-tooltip", offset: 10, maxWidth: "280px" });
    const canvas = map.getCanvas();
    let shown: string | null = null, frame = 0, last: MapMouseEvent | null = null;
    // une image prévue est annulée : elle remontrerait la bulle qu'on vient de cacher
    const cancel = () => { cancelAnimationFrame(frame); frame = 0; };
    const hide = () => { cancel(); tip.remove(); shown = null; };
    const update = () => {
      frame = 0;
      const e = last!, { point: f, link: t } = targetAt(map, e.point);
      canvas.style.cursor = f || t?.link || t?.open || t?.town ? "pointer" : "";
      if (t) {
        // le trait : la bulle suit le pointeur
        // ce qu'un clic ouvre : les projets du trait, la ville d'une grappe, la fiche d'un membre ou d'une gare
        const hint = t.link ? "Cliquez pour les voir" : t.open && t.open.length > 1 ? "Cliquez pour leur ville" : t.open || t.town ? "Cliquez pour sa fiche" : "";
        if (shown !== t.key) tip.setOffset([0, -8]).setDOMContent(content([...t.text, ...(hint ? [{ t: hint, src: true }] : [])]));
        tip.setLngLat(e.lngLat).addTo(map); shown = t.key;
        return;
      }
      // le membre choisi a déjà son nom écrit au-dessus de lui
      if (!f || isChosen(f)) { hide(); return; }
      if (shown === f.key) return;
      const [dx, dy] = f.ids ? [0, 0] : offsetAt(f.id!, Math.floor(map.getZoom()));
      tip.setLngLat(f.coordinates).setOffset([dx, dy - 10]).setDOMContent(content(linesOf(f))).addTo(map); shown = f.key;
    };
    const onMove = (e: MapMouseEvent) => { last = e; if (!frame) frame = requestAnimationFrame(update); };
    // un trait cliqué ouvre sa fiche : sa bulle n'a plus rien à dire
    const stop = useAppStore.subscribe((state, prev) => { if (state.selection !== prev.selection && state.selection?.type === "link") hide(); });
    map.on("mousemove", onMove);
    map.on("click", cancel);   // un clic dans la même image qu'un mouvement : la fiche s'ouvre, pas la bulle
    map.on("movestart", hide);
    canvas.addEventListener("mouseleave", hide);
    return () => { stop(); map.off("mousemove", onMove); map.off("click", cancel); map.off("movestart", hide); canvas.removeEventListener("mouseleave", hide); hide(); };
  }, [map]);
}
