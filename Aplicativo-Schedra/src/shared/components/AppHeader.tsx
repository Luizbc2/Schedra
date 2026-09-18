import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../../theme/ThemeProvider";
import { fonts } from "../../theme/tokens";
import { WorkspaceModeSwitch } from "./WorkspaceModeSwitch";

type AppHeaderProps = {
  eyebrow?: string;
  onBack?: () => void;
  title?: string;
};

export function AppHeader({ eyebrow = "SCHEDRA", onBack, title = "Sua agenda, no ritmo certo" }: AppHeaderProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          accessibilityLabel="Voltar"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, { borderColor: colors.border, opacity: pressed ? 0.68 : 1 }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.titleGroup}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
      <WorkspaceModeSwitch />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20 },
  backButton: { width: 40, height: 40, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", marginRight: 10 },
  titleGroup: { flex: 1, minWidth: 0, gap: 2, paddingRight: 10 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11 },
  title: { fontFamily: fonts.display, fontSize: 20 },
});
