import * as SecureStore from "expo-secure-store";
import type { KeyValueStore } from "./session-store";

export const credentials: KeyValueStore = {
  get: (key) => SecureStore.getItemAsync(key),
  set: (key, value) => SecureStore.setItemAsync(key, value),
  remove: (key) => SecureStore.deleteItemAsync(key),
};
