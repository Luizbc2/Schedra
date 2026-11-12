import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts } from "../../../theme/tokens";
import { Button, type ButtonProps } from "./Button";

type FeedbackStateProps = {
  kind: "loading" | "empty" | "error";
  title: string;
  detail?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  action?: Pick<ButtonProps, "label" | "onPress" | "loading" | "disabled">;
};

export function FeedbackState({ kind, title, detail, icon, action }: FeedbackStateProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.container}>
      <View accessibilityLiveRegion="polite" accessibilityRole={kind === "error" ? "alert" : undefined} accessibilityState={{ busy: kind === "loading" }} aria-busy={kind === "loading"} style={styles.message}>
        {kind === "loading" ? <ActivityIndicator color={colors.accent} />
          : <Ionicons name={icon ?? (kind === "error" ? "cloud-offline-outline" : "file-tray-outline")} size={28} color={colors.textMuted} />}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {!!detail && <Text style={[styles.detail, { color: colors.textMuted }]}>{detail}</Text>}
      </View>
      {action && kind !== "loading" && <Button {...action} variant="secondary" size="small" />}
    </View>
  );
}

export function InlineError({ message }: { message: string }) {
  const { colors } = useAppTheme();
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.error, { backgroundColor: `${colors.danger}14`, borderColor: `${colors.danger}50` }]}>
      <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
      <Text style={[styles.errorText, { color: colors.danger }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 28, alignItems: "center", gap: 14 },
  message: { alignItems: "center", gap: 8 },
  title: { fontFamily: fonts.display, fontSize: 22, textAlign: "center" },
  detail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, textAlign: "center" },
  error: { borderWidth: 1, borderRadius: 8, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  errorText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 18 },
});
