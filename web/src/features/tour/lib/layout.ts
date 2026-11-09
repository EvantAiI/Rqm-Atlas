// Où poser le trou de lumière et la bulle : le trou autour de la cible, la bulle à côté (à droite, à gauche, à mi-hauteur
// de la cible pour laisser libres les boutons du haut de la carte ; sinon dessous ou dessus) ; quand la cible est la carte,
// sur le panneau (sur téléphone, au-dessus ou au-dessous de la carte, du côté qui a le plus de place) ; au centre sans
// cible. Pur : vérifié par layout.test.ts.
interface Box { left: number; top: number; right: number; bottom: number; width: number; height: number }
export interface Layout { hole: { left: number; top: number; width: number; height: number }; bubble: { left: number; top: number } }

const M = 6, E = 16;   // le bord du trou autour de la cible ; l'écart de la bulle aux bords

export function layoutTour(r: Box | null, size: { width: number; height: number }, besidePanel: boolean,
  W: number, H: number, mobile: boolean): Layout {
  const hole = r ? { left: r.left - M, top: r.top - M, width: r.width + 2 * M, height: r.height + 2 * M }
    : { left: W / 2, top: H / 2, width: 0, height: 0 };
  let x = (W - size.width) / 2, y = (H - size.height) / 2;
  const middle = r ? r.top + (r.height - size.height) / 2 : y;
  if (r && besidePanel) { x = E; y = !mobile ? y : r.top > H - r.bottom ? E : H - size.height - E; }
  else if (r && r.right + M + E + size.width < W) { x = r.right + M + E; y = middle; }
  else if (r && r.left - M - E - size.width > 0) { x = r.left - M - E - size.width; y = middle; }
  else if (r) { x = r.left; y = r.bottom + M + E + size.height < H ? r.bottom + M + E : r.top - M - E - size.height; }
  return { hole, bubble: { left: Math.max(E, Math.min(x, W - size.width - E)), top: Math.max(E, Math.min(y, H - size.height - E)) } };
}
