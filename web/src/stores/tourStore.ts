// La visite guidée « Comment ça marche ? » : l'étape montrée et ce qu'elle demande à la carte. Le reste de la page sait
// seulement qu'elle tourne (isTourRunning : l'adresse, Échap et la recherche la laissent faire). Rien que des données :
// les minuteurs, la caméra et le DOM vivent dans features/tour.
import { create } from "zustand";

interface TourState {
  step: number;          // l'étape montrée ; -1 : fermée
  phase: number;         // certaines étapes changent de cible en cours de route (0, puis 1)
  openTour(): void;
  closeTour(): void;
  goTo(step: number): void;
  setPhase(phase: number): void;
}

export const useTourStore = create<TourState>()((set) => ({
  step: -1,
  phase: 0,
  openTour: () => set({ step: 0, phase: 0 }),
  closeTour: () => set({ step: -1 }),
  goTo: (step) => set({ step, phase: 0 }),
  setPhase: (phase) => set({ phase }),
}));

export const isTourRunning = () => useTourStore.getState().step >= 0;
