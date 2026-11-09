// Le morceau de la carte (MapLibre, ≈ 1 Mo), demandé une seule fois : main.tsx le lance dès le démarrage, pour qu'il se
// télécharge pendant que le panneau s'affiche.
let mapModule: Promise<typeof import("./components/NetworkMap")> | null = null;
export const loadMap = () => (mapModule ??= import("./components/NetworkMap"));
