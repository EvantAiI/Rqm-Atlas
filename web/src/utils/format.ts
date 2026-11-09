// Les nombres, les mots et les dates en français.
import { MOBILE } from "./screen";

export const formatNumber = (n: number) => n.toLocaleString("fr-CA");
// le mot au singulier ou au pluriel, selon n
export const wordFor = (n: number, word: string, words = `${word}s`) => (n > 1 ? words : word);
export const plural = (n: number, word: string, words = `${word}s`) => `${formatNumber(n)} ${wordFor(n, word, words)}`;
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
// Sur téléphone, on touche, on ne clique pas : les textes le disent.
export const forTouch = (t: string) => (MOBILE ? t.replace(/Cliquez/g, "Touchez").replace(/Un clic sur/g, "Toucher").replace(/clic/g, "toucher") : t);
// « A, B et C »
export const joinWithAnd = (names: string[]) => names.join(", ").replace(/, ([^,]*)$/, " et $1");
// « 6 novembre 2026 », d'une date ISO (à midi : pas de veille selon le fuseau)
export const longDate = (iso: string) => new Date(`${iso}T12:00`).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
