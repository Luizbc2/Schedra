import { getNetworkStateAsync, addNetworkStateListener } from "expo-network";

export async function isOnline() {
  try {
    const state = await getNetworkStateAsync();
    return state.isConnected !== false && state.isInternetReachable !== false;
  } catch { return true; }
}

export function subscribeNetwork(listener: () => void) {
  const subscription = addNetworkStateListener(listener);
  return () => subscription.remove();
}
