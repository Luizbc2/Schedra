import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../../theme/ThemeProvider";
import { fonts } from "../../theme/tokens";
import { WorkspaceModeSwitch } from "./WorkspaceModeSwitch";
import { IconButton } from "./ui/IconButton";

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
        <IconButton
          accessibilityLabel="Voltar"
          icon="arrow-back"
          onPress={onBack}
          style={styles.backButton}
        />
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
  backButton: { marginRight: 10 },
  titleGroup: { flex: 1, minWidth: 0, gap: 2, paddingRight: 10 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11 },
  title: { fontFamily: fonts.display, fontSize: 20 },
});
