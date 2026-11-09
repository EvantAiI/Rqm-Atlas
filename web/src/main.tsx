import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { App } from "./App";
import { loadMap } from "./features/map";
import { useAppStore } from "./stores/appStore";
import { useMapStore } from "./stores/mapStore";

// ?debug : les stores, du dehors (scripts de rendu, console) ; la carte est dans mapStore.getState().map.
declare global { interface Window { appStore?: typeof useAppStore; mapStore?: typeof useMapStore } }
if (new URLSearchParams(location.search).has("debug")) Object.assign(window, { appStore: useAppStore, mapStore: useMapStore });

// la carte se télécharge pendant que React rend le panneau
void loadMap();
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
