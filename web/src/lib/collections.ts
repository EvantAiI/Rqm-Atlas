// La valeur d'une clé, créée au premier besoin : m.get(k) || m.set(k, …).get(k)! en un mot.
export function getOrCreate<K extends object, V>(m: Map<K, V> | WeakMap<K, V>, key: K, make: () => V): V;
export function getOrCreate<K, V>(m: Map<K, V>, key: K, make: () => V): V;
export function getOrCreate<K extends object, V>(m: Map<K, V> | WeakMap<K, V>, key: K, make: () => V): V {
  let v = m.get(key);
  if (v === undefined) m.set(key, (v = make()));
  return v;
}
