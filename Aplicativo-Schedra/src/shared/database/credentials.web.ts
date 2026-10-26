import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStore } from "./session-store";

export const credentials: KeyValueStore = {
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value),
  remove: (key) => AsyncStorage.removeItem(key),
};
