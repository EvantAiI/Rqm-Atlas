// Avant chaque fichier de test : un écran d'ordinateur (les modules lisent les données de generated/ eux-mêmes).
Object.assign(globalThis, { matchMedia: () => ({ matches: false }) });
