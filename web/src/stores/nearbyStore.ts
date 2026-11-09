// « Près de chez moi » : le lieu du visiteur (sa position, ou la ville tapée), le membre choisi pour lui, et l'état de la
// demande de position. Le lieu ne sert qu'au calcul, dans cette page : rien n'est envoyé, rien n'entre dans l'adresse ;
// arrondi au centième de degré (≈ 1 km). Le bouton du panneau et « Me localiser » de la fiche partagent cet état : tous
// deux disent « Localisation… ».
import { create } from "zustand";
import { chosenMember, type Place } from "../data/nearby";
import { NEARBY } from "./selection";
import { useAppStore } from "./appStore";

// La position du navigateur, ou une erreur.
export const currentPosition = (options: PositionOptions) =>
  new Promise<GeolocationPosition>((ok, ko) => navigator.geolocation.getCurrentPosition(ok, ko, options));
// La permission de position : granted, denied, prompt (« prompt » sans l'API).
export const positionPermission = async () => {
  try { return (await navigator.permissions.query({ name: "geolocation" })).state; } catch { return "prompt"; }
};

interface NearbyState {
  here: Place | null;
  nearbyChoice: string | null;   // le membre choisi pour ce lieu
  locating: boolean;
  noPosition: boolean;           // refusée ou absente : la fiche demande la ville
  blocked: boolean;              // bloquée dans le navigateur : il ne redemandera pas, on dit où la débloquer
  blockedTries: number;
  listRequest: number;           // chaque ouverture de la liste (openList)
  goToPlace(lon: number, lat: number, name: string): void;
  locate(): Promise<void>;
  nearMe(): void;
}

// la liste des proches (ou, sans lieu, la fiche qui demande la ville) ; chaque ouverture est une demande neuve, même si
// la fiche est déjà là : son champ reprend le focus
const openList = () => { useNearbyStore.setState((s) => ({ listRequest: s.listRequest + 1 })); useAppStore.getState().open(NEARBY); };

export const useNearbyStore = create<NearbyState>()((set, get) => ({
  here: null, nearbyChoice: null, locating: false, noPosition: false, blocked: false, blockedTries: 0, listRequest: 0,

  // Le lieu, puis le membre le plus actif autour, ouvert d'office : la liste des proches reste à un clic (« ← Près de… »).
  goToPlace: (lon, lat, name) => {
    const here = { lon: Math.round(lon * 100) / 100, lat: Math.round(lat * 100) / 100, name };
    const chosen = chosenMember(here, useAppStore.getState().categories);
    set({ here, nearbyChoice: chosen?.id ?? null });
    if (chosen) useAppStore.getState().openNearbyChoice(here, chosen.id); else openList();
  },

  locate: async () => {
    const giveUp = () => { set({ here: null, nearbyChoice: null }); openList(); };
    if (!navigator.geolocation) { set({ noPosition: true }); openList(); return; }
    if (await positionPermission() === "denied") {
      set((s) => ({ blocked: true, blockedTries: s.blockedTries + 1, noPosition: true }));
      giveUp();
      return;
    }
    set({ locating: true });
    try {
      const p = await currentPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 3600000 });
      set({ locating: false, noPosition: false, blocked: false });
      get().goToPlace(p.coords.longitude, p.coords.latitude, "chez vous");
    } catch { set({ locating: false, noPosition: true }); giveUp(); }
  },

  // Le bouton « Près de chez moi » : le lieu connu, sinon la fiche qui demande la ville, sinon la position.
  nearMe: () => {
    const { here, noPosition } = get();
    if (here) get().goToPlace(here.lon, here.lat, here.name);
    else if (noPosition) openList();
    else void get().locate();
  },
}));
