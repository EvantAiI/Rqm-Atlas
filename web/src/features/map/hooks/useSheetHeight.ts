// Téléphone : la hauteur de la feuille ouverte (elle couvre le bas de la carte), suivie quand son contenu change ; 0 sans fiche.
import { useEffect, useState } from "react";
import { MOBILE } from "../../../utils/screen";

export function useSheetHeight(open: boolean) {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const sheet = open && MOBILE ? document.querySelector('[data-zone="sheet"]') : null;
    if (!sheet) return;
    const watch = new ResizeObserver(() => setHeight(sheet.getBoundingClientRect().height));
    watch.observe(sheet);
    return () => watch.disconnect();
  }, [open]);
  return open && MOBILE ? height : 0;
}
