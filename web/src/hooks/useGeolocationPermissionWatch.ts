// La position débloquée dans les réglages du navigateur pendant que la page est ouverte : on localise aussitôt.
import { useEffect } from "react";
import { useNearbyStore } from "../stores/nearbyStore";

export function useGeolocationPermissionWatch() {
  useEffect(() => {
    let status: PermissionStatus | null = null, live = true;
    const onChange = () => { if (status?.state === "granted" && useNearbyStore.getState().blocked) { useNearbyStore.setState({ blocked: false }); void useNearbyStore.getState().locate(); } };
    navigator.permissions?.query({ name: "geolocation" }).then((p) => {
      if (!live) return;
      status = p; p.addEventListener("change", onChange);
    }).catch(() => {});
    return () => { live = false; status?.removeEventListener("change", onChange); };
  }, []);
}
