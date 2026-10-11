import { useSyncExternalStore } from "react";

/** Browser connectivity hint only. A true value does not prove API reachability. */
export const browserIsOnline = (): boolean => navigator.onLine;

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function useBrowserOnline(): boolean {
  return useSyncExternalStore(subscribe, browserIsOnline, () => false);
}
