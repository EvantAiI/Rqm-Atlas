// Un texte dont les mots du sujet sont surlignés (sur le jaune de la charte).
import { subjectWords } from "../../../lib/projects";
import { MARK } from "../../../styles/classes";

export function Highlight({ text, words }: { text: string; words: string[] }) {
  return text.split(/([\p{L}\p{N}\p{M}]+)/u).map((x, i) =>
    i % 2 && subjectWords(x).some((m) => words.includes(m)) ? <mark key={i} className={MARK}>{x}</mark> : x);
}
