// Les contours des régions administratives pour la carte : le découpage officiel (collected/regions.geojson, ~130 Ko)
// allégé à ce qu'un écran montre (un sommet tous les ~1 km au plus, 3 décimales), indexé par le nom de la région.
type Position = number[];
type Ring = Position[];
interface RegionFeature { properties: { nom: string }; geometry: { type: "Polygon" | "MultiPolygon"; coordinates: Ring[] | Ring[][] } }

const TOLERANCE = 0.01;   // degrés, ~1 km : invisible au zoom où l'on voit une région entière

// distance de p au segment [a, b]
function distance(p: Position, a: Position, b: Position) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]], length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

// Douglas-Peucker : garde les sommets qui s'écartent de plus de `tolerance` de la corde
export function simplify(ring: Ring, tolerance: number): Ring {
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const todo: [number, number][] = [[0, ring.length - 1]];
  while (todo.length) {
    const [a, b] = todo.pop()!;
    let worst = 0, at = -1;
    for (let i = a + 1; i < b; i++) { const d = distance(ring[i], ring[a], ring[b]); if (d > worst) { worst = d; at = i; } }
    if (worst > tolerance) { keep[at] = 1; todo.push([a, at], [at, b]); }
  }
  return ring.filter((_, i) => keep[i]);
}

const round = (ring: Ring) => ring.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);

// nom -> polygones (MultiPolygon) ; un îlot qui se réduit à moins d'un triangle disparaît
export function regionOutlines(features: RegionFeature[]): Record<string, Ring[][]> {
  return Object.fromEntries(features.map(({ properties, geometry }) => {
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates as Ring[]] : geometry.coordinates as Ring[][];
    return [properties.nom, polygons.map((rings) => rings.map((r) => round(simplify(r, TOLERANCE))).filter((r) => r.length >= 4))
      .filter((rings) => rings.length)];
  }));
}
