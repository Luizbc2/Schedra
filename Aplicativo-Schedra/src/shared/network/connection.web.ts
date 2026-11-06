export async function isOnline() { return typeof navigator === "undefined" || navigator.onLine !== false; }
export function subscribeNetwork(listener: () => void) {
  window.addEventListener("online", listener);
  return () => window.removeEventListener("online", listener);
}
