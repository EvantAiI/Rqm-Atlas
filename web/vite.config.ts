import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Les données (generated/) entrent dans le bundle ; les tuiles du fond (public/basemap/) sont servies à côté de la page :
// des chemins relatifs partout, pour que le même build marche sur GitHub Pages et en local. MapLibre a son propre
// morceau : il change rarement, le navigateur le garde en cache d'une version de la page à l'autre.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1100,   // MapLibre seul pèse ~1 Mo : un seul morceau, impossible à couper
    rolldownOptions: { output: { codeSplitting: { groups: [{ name: "maplibre", test: /node_modules[\\/]maplibre-gl/ }] } } },
  },
  worker: { format: "es" },   // le worker de MapLibre 6 est un module
  test: { setupFiles: ["src/test/setup.ts"] },
});
