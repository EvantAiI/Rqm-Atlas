// Copier un lien d'un clic : « copié » le dit deux secondes ; presse-papiers refusé ou absent (page hors https), on
// l'offre à copier à la main.
import { useEffect, useState } from "react";

export function useCopyLink(url: () => string) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async () => {
    const link = url();
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { prompt("Copiez le lien de cette vue :", link); }
  };
  return { copied, copy };
}
