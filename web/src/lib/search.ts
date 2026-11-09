// La recherche approchée dans les noms et les titres : normalisation, appariement, classement, surlignage.
// La normalisation : minuscules, sans accents, œ -> oe, ce qui n'est ni lettre ni chiffre devient une espace.
// Un caractère brut donne un caractère normalisé (deux pour œ, aucun pour un signe seul) : splitMatches() en dépend.
export const normalize = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/œ/g, "oe").replace(/[^\p{L}\p{N}]/gu, " ");
export const terms = (query: string) => normalize(query).split(" ").filter(Boolean);

// L'appariement approché, façon fzf : une sous-chaîne bat toujours une suite de lettres éparses ; sinon, une
// programmation dynamique où un caractère en début de mot compte double (« uqar » trouve l'Université du Québec à
// Rimouski par ses initiales). `abbreviates` : le terme abrège le texte comme un sigle (débuts de mots, seuls de petits
// mots sautés).
const CHAR = 16, WORD_START = 16, TEXT_START = 8, CONSECUTIVE = 4, GAP = 3, SUBSTRING = 1000, PARTICLE = 3;
export interface Match { score: number; positions: number[]; abbreviates: boolean }
export function matchTerm(term: string, text: string): Match | null {
  const m = term.length;
  const isWordStart = (j: number) => j === 0 || text.charCodeAt(j - 1) === 32;
  let k = text.indexOf(term), j = k;
  while (j !== -1 && !isWordStart(j)) j = text.indexOf(term, j + 1);
  if (j !== -1) k = j;
  if (k !== -1) {
    return { score: SUBSTRING + m * CHAR + (m - 1) * CONSECUTIVE + (isWordStart(k) ? WORD_START : 0) + (k === 0 ? TEXT_START : 0),
             positions: Array.from({ length: m }, (_, i) => k + i), abbreviates: true };
  }
  const occ: number[][] = new Array(m);
  for (let i = 0, p = -1; i < m; i++) {
    const l: number[] = [];
    for (let q = text.indexOf(term[i], p + 1); q !== -1; q = text.indexOf(term[i], q + 1)) l.push(q);
    if (!l.length) return null;
    occ[i] = l; p = l[0];
  }
  const sc: number[][] = occ.map((l) => new Array(l.length)), pr: number[][] = occ.map((l) => new Array(l.length));
  for (let x = 0; x < occ[0].length; x++) {
    const q = occ[0][x];
    sc[0][x] = CHAR + (isWordStart(q) ? WORD_START : 0) + (q === 0 ? TEXT_START : 0); pr[0][x] = -1;
  }
  for (let i = 1; i < m; i++) {
    const prev = occ[i - 1], prevScores = sc[i - 1], cur = occ[i], curScores = sc[i], curPrev = pr[i];
    let y = 0, best = -1e9, bestAt = -1;
    for (let x = 0; x < cur.length; x++) {
      const q = cur[x];
      for (; y < prev.length && prev[y] <= q - 2; y++) {
        if (prevScores[y] + prev[y] > best) { best = prevScores[y] + prev[y]; bestAt = y; }
      }
      let s = best - GAP - (q - 2), p = bestAt;
      if (y < prev.length && prev[y] === q - 1 && prevScores[y] + CONSECUTIVE >= s) { s = prevScores[y] + CONSECUTIVE; p = y; }
      curScores[x] = s + CHAR + (isWordStart(q) ? WORD_START : 0); curPrev[x] = p;
    }
  }
  let x = 0;
  for (let i = 1; i < sc[m - 1].length; i++) if (sc[m - 1][i] > sc[m - 1][x]) x = i;
  const score = sc[m - 1][x], positions: number[] = new Array(m);
  for (let i = m - 1; i >= 0; i--) { positions[i] = occ[i][x]; x = pr[i][x]; }
  let abbreviates = isWordStart(positions[0]);
  for (let i = 1; abbreviates && i < m; i++) {
    const p = positions[i - 1], q = positions[i];
    abbreviates = q === p + 1 || (isWordStart(q) && text.slice(p + 1, q).split(" ").slice(1, -1).every((w) => w.length <= PARTICLE));
  }
  return { score, positions, abbreviates };
}
export function matchAll(words: string[], text: string): Match | null {
  const r: Match = { score: 0, positions: [], abbreviates: true };
  for (const word of words) {
    const a = matchTerm(word, text);
    if (!a) return null;
    r.score += a.score; r.abbreviates = r.abbreviates && a.abbreviates; r.positions.push(...a.positions);
  }
  return r;
}
// Le texte brut coupé en morceaux [fragment, apparié], pour surligner ce qui correspond.
export function splitMatches(text: string, positions: number[]): [string, boolean][] {
  const p = new Set(positions), fragments: [string, boolean][] = [];
  let k = 0;
  for (const c of text) {
    const n = normalize(c).length, last = fragments[fragments.length - 1];
    const matched = n ? p.has(k) || (n > 1 && p.has(k + 1)) : Boolean(last && last[1]);
    if (last && last[1] === matched) last[0] += c; else fragments.push([c, matched]);
    k += n;
  }
  return fragments;
}
// Les éléments dont le champ correspond, meilleur score d'abord (à égalité, le plus court), `max` au plus.
export function rankMatches<T extends object>(elements: T[], query: string, key: keyof T, max: number) {
  const words = terms(query);
  if (!words.length) return [];
  return elements.map((e) => ({ e, r: matchAll(words, normalize(e[key])) }))
    .filter((c): c is { e: T; r: Match } => Boolean(c.r && c.r.abbreviates))
    .sort((x, y) => y.r.score - x.r.score || String(x.e[key]).length - String(y.e[key]).length).slice(0, max);
}
// Chaque mot tapé doit être dans les champs, en sous-chaîne ou abrégé (pas en lettres éparses). Par score, l'ordre
// d'arrivée départageant.
const NORMALIZED = new WeakMap<object, { key: string; text: string }>();
export function filterMatches<T extends object>(elements: T[], query: string, keys: (keyof T)[]): T[] {
  const words = terms(query);
  if (!words.length) return elements;
  const key = keys.join(), kept: { e: T; score: number }[] = [];
  for (const e of elements) {
    let n = NORMALIZED.get(e);
    if (!n || n.key !== key) NORMALIZED.set(e, n = { key, text: normalize(keys.map((c) => e[c] ?? "").join(" ")) });
    const r = matchAll(words, n.text);
    if (r && r.abbreviates) kept.push({ e, score: r.score });
  }
  return kept.sort((a, b) => b.score - a.score).map((g) => g.e);
}
