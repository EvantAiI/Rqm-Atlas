// Le lien de la fiche, copié d'un clic. « Lien copié » s'affiche sous l'en-tête, à droite : à côté du bouton, il
// cacherait la fin du titre.
import type { Selection } from "../../../stores/selection";
import { selectionToHash } from "../../../lib/address";
import { useCopyLink } from "../../../hooks/useCopyLink";

export function CopyLink({ selection, className }: { selection: Selection; className: string }) {
  const { copied, copy } = useCopyLink(() => location.href.split("#")[0] + selectionToHash(selection));
  return (
    <>
      <button type="button" onClick={copy} title="Copier le lien de cette fiche" aria-label="Copier le lien de cette fiche"
        className={`${className} right-11 flex items-center justify-center`}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 9.5l3-3M7 4.5l1.2-1.2a2.8 2.8 0 0 1 4 4L11 8.5M9 11.5l-1.2 1.2a2.8 2.8 0 0 1-4-4L5 7.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
      {copied && <span role="status" className="pointer-events-none absolute top-full right-2 mt-1 whitespace-nowrap rounded-panel bg-primary px-2 py-1 text-[12px] text-white">Lien copié ✓</span>}
    </>
  );
}
