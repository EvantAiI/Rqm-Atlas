// Dans la vue d'ensemble, le survol d'un point, d'une bulle ou d'une grappe met ses traits en avant et efface les autres.
// Celui d'une gare, les traits de tous les membres de sa ville.
import { useEffect } from "react";
import type { ExpressionSpecification, Map as MapLibre, MapMouseEvent } from "maplibre-gl";
import { MUNICIPALITIES } from "../../../data/placement";
import { useAppStore } from "../../../stores/appStore";
import { targetAt } from "../lib/targets";
import { LINK_HALO, LINK_OPACITY } from "../lib/layers";

export function useLinkFocus(map: MapLibre | null) {
  useEffect(() => {
    if (!map) return;
    let frame = 0, last: MapMouseEvent | null = null, focused = "";
    const focus = (ids: string[]) => {
      const key = ids.join(",");
      if (key === focused) return;
      focused = key;
      const touches: ExpressionSpecification = ["any", ...ids.map((id): ExpressionSpecification => ["in", `,${id},`, ["get", "m"]])];
      map.setPaintProperty("links", "line-opacity", ids.length ? ["case", touches, 0.95, 0.07] : LINK_OPACITY);
      map.setPaintProperty("links-halo", "line-opacity", ids.length ? ["case", touches, 0.8, 0] : LINK_HALO);
    };
    const update = () => {
      frame = 0;
      const { point, link } = useAppStore.getState().selection ? {} : targetAt(map, last!.point);
      focus(point ? point.ids ?? [point.id!] : link?.town ? MUNICIPALITIES.get(link.town)?.ids ?? [] : []);
    };
    const onMove = (e: MapMouseEvent) => { last = e; if (!frame) frame = requestAnimationFrame(update); };
    const clear = () => { cancelAnimationFrame(frame); frame = 0; focus([]); };
    const stop = useAppStore.subscribe((state, prev) => { if (state.selection !== prev.selection) clear(); });
    const canvas = map.getCanvas();
    map.on("mousemove", onMove);
    canvas.addEventListener("mouseleave", clear);
    return () => { stop(); map.off("mousemove", onMove); canvas.removeEventListener("mouseleave", clear); clear(); };
  }, [map]);
}
