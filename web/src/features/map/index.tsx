// La carte du réseau, chargée à part : MapLibre (≈ 1 Mo) arrive après le panneau, qui s'affiche sans l'attendre ; en
// attendant, le fond de la carte. Pas de Suspense : React y retarde l'affichage du contenu chargé (jusqu'à 300 ms).
// loadMap : à lancer au démarrage, le téléchargement commence aussitôt.
import { useEffect, useState, type ComponentType } from "react";
import { loadMap } from "./preload";

export { loadMap };

export function NetworkMap() {
  const [Loaded, setLoaded] = useState<ComponentType | null>(null);
  useEffect(() => {
    let live = true;
    void loadMap().then((m) => { if (live) setLoaded(() => m.NetworkMap); });
    return () => { live = false; };
  }, []);
  return Loaded ? <Loaded /> : <div className="absolute inset-0 bg-land" />;
}
