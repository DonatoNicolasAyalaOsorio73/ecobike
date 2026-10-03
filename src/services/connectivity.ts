import NetInfo from "@react-native-community/netinfo";

/**
 * Calls back with whether the device has a network connection (now and on
 * every change); returns the unsubscribe. Native: NetInfo. Web: see
 * connectivity.web.ts. Deliberately `isConnected`, not `isInternetReachable`
 * (a blocked probe would show a false "offline").
 */
export function onConnectivityChange(cb: (connected: boolean) => void): () => void {
  return NetInfo.addEventListener((state) => cb(state.isConnected ?? true));
}
