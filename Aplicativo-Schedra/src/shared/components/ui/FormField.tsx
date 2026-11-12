import { useId, useState, type Ref } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps, type StyleProp, type ViewStyle } from "react-native";

import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts } from "../../../theme/tokens";
import { IconButton } from "./IconButton";

export type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: Ref<TextInput>;
};

export function FormField({ label, error, helperText, containerStyle, style, editable = true, secureTextEntry, onFocus, onBlur, accessibilityLabel, ...props }: FormFieldProps) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const labelId = useId();

  return (
    <View style={[styles.field, containerStyle]}>
      <Text nativeID={labelId} style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={[styles.inputFrame, {
        backgroundColor: editable ? colors.surface : colors.surfaceRaised,
        borderColor: error ? colors.danger : focused ? colors.accent : colors.border,
      }]}>
        <TextInput
          autoCapitalize={secureTextEntry ? "none" : undefined}
          autoCorrect={secureTextEntry ? false : undefined}
          {...props}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityLabelledBy={labelId}
          aria-invalid={Boolean(error)}
          accessibilityHint={error || helperText || props.accessibilityHint}
          editable={editable}
          secureTextEntry={secureTextEntry && !visible}
          placeholderTextColor={props.placeholderTextColor ?? colors.textMuted}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          style={[styles.input, props.multiline && styles.multiline, { color: editable ? colors.text : colors.textMuted }, style]}
        />
        {secureTextEntry && <IconButton
          icon={visible ? "eye-off-outline" : "eye-outline"}
          accessibilityLabel={`${visible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
          variant="ghost"
          disabled={!editable}
          onPress={() => setVisible((current) => !current)}
        />}
      </View>
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.helper, { color: colors.danger }]}>{error}</Text>
        : helperText ? <Text style={[styles.helper, { color: colors.textMuted }]}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, minWidth: 0 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18 },
  inputFrame: { minHeight: 52, borderWidth: 1, borderRadius: 8, flexDirection: "row", alignItems: "center", paddingRight: 4 },
  input: { flex: 1, minWidth: 0, minHeight: 50, paddingHorizontal: 13, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14 },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  helper: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
});
