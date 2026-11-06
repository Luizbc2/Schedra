import type { AppColors } from "../../../theme/tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

export function buttonTheme(colors: AppColors, variant: ButtonVariant) {
  switch (variant) {
    case "primary":
      return { background: colors.accent, border: colors.accent, foreground: "#FFFFFF" };
    case "secondary":
      return { background: colors.surface, border: colors.border, foreground: colors.text };
    case "ghost":
      return { background: "transparent", border: "transparent", foreground: colors.textMuted };
    case "destructive":
      return { background: `${colors.danger}14`, border: colors.danger, foreground: colors.danger };
  }
}
