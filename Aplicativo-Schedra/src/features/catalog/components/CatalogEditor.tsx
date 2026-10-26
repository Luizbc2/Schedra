import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts, type AppColors } from "../../../theme/tokens";

type CatalogEditorProps = PropsWithChildren<{
  eyebrow: string;
  onClose: () => void;
  title: string;
  visible: boolean;
}>;

export function CatalogEditor({ children, eyebrow, onClose, title, visible }: CatalogEditorProps) {
  const { colors } = useAppTheme();

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text>
              <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{title}</Text>
            </View>
            <Pressable accessibilityLabel="Fechar" onPress={onClose} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}>
              <Ionicons name="close" size={23} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export function CatalogEditorField({ colors, label, ...props }: { colors: AppColors; label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, props.multiline && styles.multiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingVertical: 18 },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 10, marginBottom: 3 },
  title: { fontFamily: fonts.displayBold, fontSize: 30 },
  closeButton: { width: 42, height: 42, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  form: { gap: 14, paddingHorizontal: 22, paddingBottom: 42 },
  field: { gap: 6 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 13, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14 },
  multiline: { minHeight: 88, textAlignVertical: "top" },
});
