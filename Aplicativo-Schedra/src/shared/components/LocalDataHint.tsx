import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { fonts } from "../../theme/tokens";
import type { LocalResult } from "../database/cached-query";

export function LocalDataHint({ result }: { result: LocalResult | null }) {
  const { colors } = useAppTheme();
  if (result?.source !== "device") return null;
  const saved = new Date(result.savedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return <View accessibilityLiveRegion="polite" style={[styles.hint, { backgroundColor: colors.surfaceRaised }]}>
    <Ionicons name="cloud-offline-outline" size={18} color={colors.amber} />
    <Text style={[styles.text, { color: colors.textMuted }]}>Dados deste aparelho · Atualizados em {saved}</Text>
  </View>;
}

const styles = StyleSheet.create({ hint: { padding: 12, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 8 }, text: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 } });
