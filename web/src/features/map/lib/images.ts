// Les images de la carte, dessinées sur une toile : le point de chaque catégorie, l'anneau de la sélection, les bulles.
import type { Map as MapLibre } from "maplibre-gl";
import { cssColour } from "../../../utils/screen";
import { CATEGORIES } from "../../../data/categories";
import { bubbleRadius } from "../../../lib/geometry";
import { DOT_RADIUS } from "../../../data/placement";

const RATIO = 2;
type Part = [rank: number, count: number];   // le rang d'une catégorie, son nombre de membres

function draw(map: MapLibre, id: string, side: number, paint: (g: CanvasRenderingContext2D, c: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = side * RATIO;
  const g = canvas.getContext("2d")!;
  g.scale(RATIO, RATIO);
  paint(g, side / 2);
  map.addImage(id, g.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: RATIO });
}
// le liseré blanc puis le trait sombre autour d'un disque de rayon r
function outline(g: CanvasRenderingContext2D, c: number, r: number) {
  g.beginPath(); g.arc(c, c, r, 0, 2 * Math.PI); g.lineWidth = 1.5; g.strokeStyle = "#fff"; g.stroke();
  g.beginPath(); g.arc(c, c, r + 1.4, 0, 2 * Math.PI); g.lineWidth = 1; g.strokeStyle = "rgba(48, 49, 51, .8)"; g.stroke();
}

export const dotImage = (rank: number) => `dot-${rank}`;

export function addFixedImages(map: MapLibre) {
  CATEGORIES.forEach((c, i) => draw(map, dotImage(i), 2 * DOT_RADIUS + 12, (g, m) => {
    g.beginPath(); g.arc(m, m, DOT_RADIUS, 0, 2 * Math.PI); g.fillStyle = cssColour(c.token); g.fill();
    outline(g, m, DOT_RADIUS);
  }));
  draw(map, "ring", 2 * DOT_RADIUS + 12, (g, m) => {
    g.beginPath(); g.arc(m, m, DOT_RADIUS + 3.5, 0, 2 * Math.PI); g.lineWidth = 2; g.strokeStyle = cssColour("--color-ink-strong"); g.stroke();
  });
}

// Une bulle est un camembert des catégories de ses `n` membres, en gris ceux hors de la sélection ; au centre, le nombre
// de membres (mis en avant, s'il y a une sélection). Sans aucun membre mis en avant, une pastille grise discrète : elle
// situe le réseau sans se lire comme un acteur du projet, ni comme le rond creux d'une ville du fond. Son nom dit sa composition : les sources le donnent sans rien
// dessiner, la carte la demande (styleimagemissing) la première fois qu'elle la montre.
export const bubbleImage = (parts: Part[], n: number) => `bubble:${n}:${parts.map(([rank, k]) => `${rank}=${k}`).join(",")}`;

export function drawBubble(map: MapLibre, id: string) {
  const [, total, list] = id.split(":"), n = Number(total);
  const parts: Part[] = list ? list.split(",").map((p) => { const [rank, k] = p.split("="); return [Number(rank), Number(k)]; }) : [];
  const lit = parts.reduce((t, [, k]) => t + k, 0), grey = n - lit, r = bubbleRadius(n);
  if (!lit) return draw(map, id, Math.ceil(2 * r + 4), (g, c) => {
    g.beginPath(); g.arc(c, c, r - 1, 0, 2 * Math.PI); g.fillStyle = cssColour("--color-network"); g.fill();
  });
  draw(map, id, Math.ceil(2 * r + 4), (g, c) => {
    let angle = -Math.PI / 2;
    for (const [colour, k] of [...parts.map(([rank, k]) => [cssColour(CATEGORIES[rank].token), k] as const), [cssColour("--color-dimmed"), grey] as const]) {
      if (!k) continue;
      const step = (2 * Math.PI * k) / n;
      g.beginPath(); g.moveTo(c, c); g.arc(c, c, r, angle, angle + step); g.closePath();
      g.fillStyle = colour; g.fill(); angle += step;
    }
    outline(g, c, r);
    if (n > 1) {
      g.beginPath(); g.arc(c, c, r * 0.58, 0, 2 * Math.PI); g.fillStyle = "#fff"; g.fill();
      g.fillStyle = cssColour("--color-ink-strong"); g.font = `700 ${r > 15 ? 12 : 11}px Lato, sans-serif`;
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(grey ? lit : n), c, c + 0.5);
    }
  });
}
