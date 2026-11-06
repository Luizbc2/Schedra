import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet } from "react-native";

import { useAppTheme } from "../../../theme/ThemeProvider";
import { ActionPressable, type ActionPressableProps } from "./ActionPressable";
import { buttonTheme, type ButtonVariant } from "./button-theme";

export type IconButtonProps = Omit<ActionPressableProps, "children" | "accessibilityLabel"> & {
  accessibilityLabel: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  variant?: ButtonVariant;
  size?: "medium" | "large";
};

export function IconButton({ icon, variant = "secondary", size = "medium", loading, style, ...props }: IconButtonProps) {
  const { colors } = useAppTheme();
  const theme = buttonTheme(colors, variant);

  return (
    <ActionPressable {...props} loading={loading} style={[styles.button, size === "large" && styles.large, {
      backgroundColor: theme.background, borderColor: theme.border,
    }, style]}>
      {loading ? <ActivityIndicator color={theme.foreground} size="small" /> : <Ionicons name={icon} size={size === "large" ? 24 : 20} color={theme.foreground} />}
    </ActionPressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, flexShrink: 0, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  large: { width: 56, height: 56, borderRadius: 28 },
});
