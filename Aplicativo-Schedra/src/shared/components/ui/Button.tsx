import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text } from "react-native";

import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts } from "../../../theme/tokens";
import { ActionPressable, type ActionPressableProps } from "./ActionPressable";
import { buttonTheme, type ButtonVariant } from "./button-theme";

export type ButtonProps = Omit<ActionPressableProps, "children"> & {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  iconPosition?: "start" | "end";
  variant?: ButtonVariant;
  size?: "small" | "medium";
};

export function Button({ label, icon, iconPosition = "start", variant = "primary", size = "medium", loading, style, ...props }: ButtonProps) {
  const { colors } = useAppTheme();
  const theme = buttonTheme(colors, variant);
  const leading = loading
    ? <ActivityIndicator color={theme.foreground} size="small" />
    : icon ? <Ionicons name={icon} size={19} color={theme.foreground} /> : null;

  return (
    <ActionPressable
      accessibilityLabel={label}
      {...props}
      loading={loading}
      style={[styles.button, size === "small" && styles.small, {
        backgroundColor: theme.background, borderColor: theme.border,
      }, style]}
    >
      {iconPosition === "start" && leading}
      <Text style={[styles.label, { color: theme.foreground }]}>{label}</Text>
      {iconPosition === "end" && leading}
    </ActionPressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  small: { minHeight: 44, paddingVertical: 10 },
  label: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, textAlign: "center" },
});
