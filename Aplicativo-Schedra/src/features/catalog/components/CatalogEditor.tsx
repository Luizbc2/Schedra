import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts } from "../../../theme/tokens";
import { IconButton } from "../../../shared/components/ui/IconButton";

type CatalogEditorProps = PropsWithChildren<{
  eyebrow: string;
  onClose: () => void;
  title: string;
  visible: boolean;
  busy?: boolean;
}>;

export function CatalogEditor({ children, eyebrow, onClose, title, visible, busy = false }: CatalogEditorProps) {
  const { colors } = useAppTheme();

  return (
    <Modal animationType="slide" onRequestClose={() => { if (!busy) onClose(); }} presentationStyle="pageSheet" visible={visible}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text>
              <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{title}</Text>
            </View>
            <IconButton accessibilityLabel="Fechar" icon="close" onPress={onClose} disabled={busy} />
          </View>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingVertical: 18 },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 10, marginBottom: 3 },
  title: { fontFamily: fonts.displayBold, fontSize: 30 },
  form: { gap: 14, paddingHorizontal: 22, paddingBottom: 42 },
});
