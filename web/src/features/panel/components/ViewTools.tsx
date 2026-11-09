// Une vue filtrée : la recadrer sur la carte, et partager son lien.
import { useAppStore } from "../../../stores/appStore";
import { viewHash } from "../../../lib/address";
import { useCopyLink } from "../../../hooks/useCopyLink";
import { QUIET } from "../../../styles/classes";

const viewUrl = () => location.href.split("#")[0] + viewHash(useAppStore.getState());

export function ViewTools() {
  const { copied, copy } = useCopyLink(viewUrl);
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      <button type="button" className={QUIET} onClick={() => useAppStore.getState().showResults()}>Voir sur la carte</button>
      <button type="button" className={QUIET} onClick={copy}>{copied ? "Lien copié ✓" : "Copier le lien"}</button>
    </div>
  );
}
