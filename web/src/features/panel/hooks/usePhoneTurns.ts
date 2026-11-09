// Sur téléphone, la fiche et les filtres à tour de rôle (lib/phoneTurns.ts) : ce qui se cache revient ensuite.
// La visite guidée mène l'écran à sa façon : on la laisse faire, sans rien retenir.
import { useEffect } from "react";
import { useAppStore } from "../../../stores/appStore";
import { isTourRunning } from "../../../stores/tourStore";
import { MOBILE } from "../../../utils/screen";
import { NOTHING_HIDDEN, nextTurn } from "../lib/phoneTurns";

export function usePhoneTurns() {
  useEffect(() => {
    if (!MOBILE) return;
    let hidden = NOTHING_HIDDEN;
    return useAppStore.subscribe((state, prev) => {
      if (isTourRunning()) { hidden = NOTHING_HIDDEN; return; }
      const turn = nextTurn(prev, state, hidden);
      hidden = turn.hidden;
      if (turn.change) useAppStore.setState(turn.change);
    });
  }, []);
}
