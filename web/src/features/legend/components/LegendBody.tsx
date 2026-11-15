// Ce que la légende explique : les traits, leur couleur, les membres. Les mots du RQM (rqm.quebec/membres).
import type { ReactNode } from "react";
import { DATA } from "../../../data/dataset";
import { BLOCK_TITLE } from "../../../styles/classes";
import { CATEGORIES, USER_CATEGORIES, categoryColour } from "../../../data/categories";
import { Dot } from "../../../components/Dot";
import { MOBILE } from "../../../utils/screen";
import { forTouch } from "../../../utils/format";

const ROW = "flex items-baseline gap-1.5 py-px";
const LINE = "mr-0.5 inline-block align-middle";
// les rayons et les gares de la carte (features/map/lib/links.ts, layers.ts)
const SPOKE = { stroke: "#64748b", strokeOpacity: 0.55, strokeWidth: 1.4 };
const STATION = { fill: "#fff", stroke: "#334155", strokeWidth: 1.8 };
// Une grappe de quatre : la moitié de Réguliers, deux usagers ; trois membres de trois catégories ; une grappe de quatre
// dont un seul membre est retenu par la fiche ou le filtre, les trois autres en gris (le chiffre ne compte alors que les
// retenus : features/map/lib/images.ts).
const CLUSTER = `conic-gradient(${categoryColour(CATEGORIES[0])} 0 50%, ${categoryColour(USER_CATEGORIES[0])} 0 75%, ${categoryColour(USER_CATEGORIES[1])} 0)`;
const MIXED = `conic-gradient(${categoryColour(CATEGORIES[0])} 0 33.3%, ${categoryColour(CATEGORIES[1])} 0 66.7%, ${categoryColour(USER_CATEGORIES[0])} 0)`;
const PARTLY = `conic-gradient(${categoryColour(CATEGORIES[0])} 0 25%, var(--color-dimmed) 0)`;

// Une bulle comme sur la carte : l'anneau des catégories, le chiffre au centre.
function Bubble({ background, n }: { background: string; n: number }) {
  return (
    <span style={{ background }}
      className="mr-0.5 inline-flex size-5 flex-none items-center justify-center self-center rounded-full shadow-[0_0_0_1.5px_#fff,0_0_0_2.5px_rgba(48,49,51,.8)]">
      <i className="size-[11px] rounded-full bg-white text-center text-[8px] leading-[11px] font-bold not-italic text-ink-strong">{n}</i>
    </span>
  );
}

// Un petit morceau de carte, de la largeur commune aux traits.
function Sketch({ children }: { children: ReactNode }) {
  return <svg aria-hidden="true" width="34" height="14" viewBox="0 0 34 14" className="mr-0.5 flex-none self-center overflow-visible">{children}</svg>;
}

export function LegendBody() {
  const first = DATA.axes[0].color, member = categoryColour(CATEGORIES[0]);
  return (
    // une colonne, à la largeur du panneau ; le texte de la légende, pas le gris des sources
    <div className="mt-1 grid gap-2 pl-4 leading-[1.4] text-ink">
      <div>
        <div className={`${BLOCK_TITLE} pb-0.5`}>Les traits</div>
        <ul>
          <li className={ROW}>
            <Sketch>
              <path d="M5 11 Q17 0 29 11" fill="none" stroke={first} strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={5} cy={11} r={3} {...STATION} /><circle cx={29} cy={11} r={3} {...STATION} />
            </Sketch>
            <span>d'une ville à l'autre, les porteurs de projets et leurs participants</span>
          </li>
          <li className={ROW}>
            <Sketch>
              <path d="M1 7 H13" stroke={first} strokeWidth={1.5} strokeLinecap="round" />
              <path d="M19 7 H33" stroke={first} strokeWidth={5} strokeLinecap="round" />
            </Sketch>
            <span>plus épais, plus de projets en commun</span>
          </li>
          <li className={ROW}>
            <Sketch>
              <path d="M5 2.5 L28 7 M5 11.5 L28 7" fill="none" {...SPOKE} />
              <circle cx={5} cy={2.5} r={3.3} fill={member} stroke="rgba(0,0,0,.4)" strokeWidth={0.8} />
              <circle cx={5} cy={11.5} r={3.3} fill={member} stroke="rgba(0,0,0,.4)" strokeWidth={0.8} />
              <circle cx={28} cy={7} r={3} {...STATION} />
            </Sketch>
            <span>de près, un membre relié en gris au rond blanc, le centre de sa ville</span>
          </li>
        </ul>
        <p className="mt-0.5 text-ink-muted">{forTouch("Cliquez un trait pour voir ses projets.")}</p>
      </div>
      <div>
        <div className={`${BLOCK_TITLE} pb-0.5`}>Leur couleur : l'axe de recherche</div>
        <ul>
          {DATA.axes.map((a) => (
            <li key={a.code} className={ROW}>
              <span className={`${LINE} w-5 border-t-[3px]`} style={{ borderColor: a.color }} />
              <span>{a.short}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className={`${BLOCK_TITLE} pb-0.5`}>Les membres</div>
        <ul>
          <li className={ROW}>
            {MOBILE
              ? <span className="inline-flex flex-none gap-0.5 self-center">{CATEGORIES.map((c) => <Dot key={c.code} colour={categoryColour(c)} />)}</span>
              : <Dot colour={categoryColour(CATEGORIES[0])} className="self-center" />}
            <span>un membre, à la couleur de sa catégorie</span>
          </li>
          <li className={ROW}>
            <Bubble background={CLUSTER} n={7} />
            <span>de loin, une ville : le chiffre compte ses membres</span>
          </li>
          <li className={ROW}>
            <Bubble background={CLUSTER} n={4} />
            <span>de près, 4 membres trop proches pour être séparés</span>
          </li>
          <li className={ROW}>
            <Bubble background={MIXED} n={3} />
            <span>ses couleurs : la part de chaque catégorie</span>
          </li>
          <li className={ROW}>
            <Bubble background={PARTLY} n={1} />
            <span>1 membre de la fiche ou du filtre, les 3 autres en gris</span>
          </li>
          <li className={ROW}>
            <Dot colour={categoryColour(CATEGORIES[0])} className="self-center opacity-25" />
            <span>pâle : de près, un membre hors de la fiche ou du filtre</span>
          </li>
          <li className={ROW}>
            <span aria-hidden="true" className="mx-px inline-block size-[7px] flex-none self-center rounded-full bg-(--color-network)" />
            <span>gris : de loin, une ville dont aucun membre n'est dans la fiche ou le filtre</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
