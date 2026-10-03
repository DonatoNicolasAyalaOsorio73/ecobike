/**
 * Web: the browser's own online/offline state. NetInfo isn't used here: its
 * web reachability probe sent HEAD / requests without end, and with the probe
 * off it reported a false "offline".
 */
export function onConnectivityChange(cb: (connected: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const emit = () => cb(navigator.onLine);
  emit();
  window.addEventListener("online", emit);
  window.addEventListener("offline", emit);
  return () => {
    window.removeEventListener("online", emit);
    window.removeEventListener("offline", emit);
  };
}
