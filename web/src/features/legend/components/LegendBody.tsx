// Ce que la légende explique : les traits, leur couleur, les membres. Les mots du RQM (rqm.quebec/membres).
import { DATA } from "../../../data/dataset";
import { BLOCK_TITLE } from "../../../styles/classes";
import { CATEGORIES, USER_CATEGORIES, categoryColour } from "../../../data/categories";
import { Dot } from "../../../components/Dot";
import { MOBILE } from "../../../utils/screen";
import { forTouch } from "../../../utils/format";

const ROW = "flex items-baseline gap-1.5 py-px";
const LINE = "mr-0.5 inline-block align-middle";
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

export function LegendBody() {
  const first = DATA.axes[0].color;
  return (
    // une colonne, à la largeur du panneau ; le texte de la légende, pas le gris des sources
    <div className="mt-1 grid gap-2 pl-4 leading-[1.4] text-ink">
      <div>
        <div className={`${BLOCK_TITLE} pb-0.5`}>Les traits</div>
        <ul>
          <li className={ROW}>
            <span className={`${LINE} w-[18px] border-t-[1.5px]`} style={{ borderColor: first }} />
            <span className={`${LINE} w-[18px] border-t-[5px]`} style={{ borderColor: first }} />
            <span>plus épais, plus de projets en commun</span>
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
            <Bubble background={CLUSTER} n={4} />
            <span>4 membres trop proches pour être séparés</span>
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
