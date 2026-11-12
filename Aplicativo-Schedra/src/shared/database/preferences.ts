import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocalDatabase } from "./database";

export async function loadTheme(): Promise<"dark" | "light" | null> {
  const db = await getLocalDatabase();
  const existing = await db.read((tx) => tx.get("preferences", "theme"));
  if (existing) return existing.value === "light" ? "light" : "dark";
  const legacy = await AsyncStorage.getItem("@schedra/theme");
  if (legacy !== "dark" && legacy !== "light") return null;
  await saveTheme(legacy);
  await AsyncStorage.removeItem("@schedra/theme");
  return legacy;
}

export async function saveTheme(value: "dark" | "light") {
  const db = await getLocalDatabase();
  await db.write((tx) => tx.put("preferences", { id: "theme", scopeId: "device", value }));
}
