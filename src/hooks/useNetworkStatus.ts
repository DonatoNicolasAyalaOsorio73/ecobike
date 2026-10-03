import { useEffect, useState } from "react";
import { onConnectivityChange } from "@/services/connectivity";

/**
 * True/false once NetInfo reports; null only for the first instant before
 * its first event.
 *
 * Deliberately keyed off `isConnected` alone. `isInternetReachable` sounds
 * more accurate but it's derived from a probe request to an external
 * endpoint, and that probe comes back `false` whenever it's merely blocked
 * (corporate proxy, strict browser sandbox, ad blocker) on a perfectly
 * working connection — which showed a permanent false "sin conexión" banner
 * on web. A missed captive-portal case costs the rider nothing here (local
 * tracking works regardless); a banner that lies about being offline
 * teaches them to ignore the banner entirely.
 */
export function useNetworkStatus(): boolean | null {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    return onConnectivityChange(setIsConnected);
  }, []);

  return isConnected;
}
