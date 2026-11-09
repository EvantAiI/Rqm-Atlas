// « Près de chez moi » : les distances, et le membre le plus actif autour d'un lieu. candidates : [{ id, d (km), n (projets) }].
// Parmi ceux à moins de `radius` km (sinon les cinq plus proches) : le plus de projets, puis le plus proche.
export function mostActive<C extends { d: number; n: number }>(candidates: C[], radius: number): C | null {
  const sorted = [...candidates].sort((a, b) => a.d - b.d), near = sorted.filter((c) => c.d <= radius);
  return (near.length ? near : sorted.slice(0, 5)).reduce<C | null>((m, c) => (!m || c.n > m.n || (c.n === m.n && c.d < m.d) ? c : m), null);
}
// La distance à vol d'oiseau, en km, entre deux [lon, lat].
export function km(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
