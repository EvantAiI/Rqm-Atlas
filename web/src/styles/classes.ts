// Les classes Tailwind répétées : une seule écriture pour un même rendu. Les communes d'abord, puis celles du panneau et
// celles des fiches.
// Le gris du texte indicatif : celui du navigateur (Tailwind le remplace sinon).
export const FIELD = "w-full rounded-panel border border-line-strong bg-surface px-2 py-1.5 text-[13px] leading-[1.5] text-ink placeholder:text-[#757575]";
export const SELECT = "w-full rounded-panel border border-line-strong bg-surface px-1.5 py-[5px] text-[13px] text-ink";
// Un lien discret, souligné (« Tout afficher », « Changer de lieu »…).
export const QUIET = "border-0 bg-transparent p-0 text-[12px] text-primary underline hover:text-accent";
// Un bouton qui se lit comme un lien (un nom d'organisation, de projet, de ville).
export const LINK_BUTTON = "border-0 bg-transparent p-0 text-left text-primary no-underline hover:underline";
// Un bouton cerné de bleu (« Près de chez moi », « Me localiser »).
const BUTTON_BASE = "inline-flex items-center gap-1.5 rounded-panel border border-primary px-2.5 py-[5px] text-[13px] disabled:cursor-progress disabled:opacity-60";
export const BUTTON = `${BUTTON_BASE} bg-surface text-primary hover:bg-primary hover:text-white`;
export const PRIMARY_BUTTON = `${BUTTON_BASE} bg-primary text-white hover:border-accent hover:bg-accent`;
export const SOURCE = "text-[12px] text-ink-muted";
// La liste d'un champ à suggestions, et ses options. Elle flotte sous le champ (components/Suggestions.tsx) : en
// s'ouvrant ou en se fermant, elle ne pousse pas le panneau sous le prochain clic.
export const LISTBOX = "absolute inset-x-0 top-0 z-10 mt-1 max-h-[260px] list-none overflow-y-auto border border-line bg-surface p-0 shadow-panel";
export const OPTION = "cursor-pointer px-2 py-1 text-[13px] hover:bg-background hover:text-ink-strong aria-selected:bg-background aria-selected:text-ink-strong";
// Le titre d'un bloc, en petites capitales (le panneau, la légende).
export const BLOCK_TITLE = "text-[12px] font-bold uppercase tracking-[.05em] text-ink-strong";

// Le panneau : les cases à cocher et leur ligne.
export const CHECK_ROW = "flex cursor-pointer items-center gap-2 py-0.5 text-[13px] hover:text-ink-strong phone:min-h-10";
export const CHECKBOX = "m-0 flex-none accent-primary phone:size-5";

// Les fiches.
// Une liste de la fiche : un filet entre deux lignes.
export const ROWS = "[&>li]:border-t [&>li]:border-line [&>li]:py-2 [&>li:first-child]:border-t-0";
export const LIST = `mt-1 ${ROWS}`;
// L'en-tête d'un groupe : un rôle, une ville.
export const GROUP = "mt-2.5 mb-0.5 text-[12px] font-bold text-ink-strong";
export const COUNT = "font-normal text-ink-muted";
export const HOOK = "mt-0.5 block text-[12px] text-ink";
// Les axes d'un projet dans une liste : des puces plus petites que dans la fiche du projet.
export const SMALL_AXES = "mt-1 [&_[data-axis]]:px-[5px] [&_[data-axis]]:text-[10px] [&_[data-axis]]:leading-[15px]";
export const NOTE = "mb-3 border-l-[3px] border-accent bg-background px-2.5 py-2 text-[13px]";
export const REACH = "mt-3 text-[13px] text-ink-strong";
// Un paragraphe de source sous le titre : les marges d'un <p> à 12 px.
export const INTRO = "my-3 text-[12px] text-ink-muted";
// Les liens vers l'extérieur sous un en-tête de fiche : « ↗ » après chacun.
export const ACTIONS = "mt-3 flex flex-wrap gap-x-4 gap-y-1 [&_a]:text-[13px] [&_a]:no-underline [&_a:hover]:underline [&_a[target]]:after:content-['_↗']";
export const MARK = "bg-[rgba(217,188,79,.35)] text-inherit";
