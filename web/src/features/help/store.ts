// La seule bulle d'aide de la page : quel « ? » elle explique, et si un clic l'a épinglée.
import { create } from "zustand";

export const HELP_TIP_ID = "help-tip";   // la bulle, que le « ? » montré désigne (aria-describedby)
export interface HelpTip { text: string; anchor: HTMLElement; pinned: boolean }
interface HelpState {
  tip: HelpTip | null;
  show(text: string, anchor: HTMLElement, pinned: boolean): void;
  hide(hoverOnly?: boolean): void;   // hoverOnly : ne ferme pas une bulle épinglée
}
export const useHelpStore = create<HelpState>()((set, get) => ({
  tip: null,
  show: (text, anchor, pinned) => set({ tip: { text, anchor, pinned } }),
  hide: (hoverOnly = false) => { if (!hoverOnly || !get().tip?.pinned) set({ tip: null }); },
}));
