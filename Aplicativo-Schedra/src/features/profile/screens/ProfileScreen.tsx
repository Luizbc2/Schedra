import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "../../../shared/components/AppHeader";
import { Screen } from "../../../shared/components/Screen";
import { ThemeModeSwitch } from "../../../shared/components/ThemeModeSwitch";
import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts } from "../../../theme/tokens";
import { resolveApiAsset } from "../../../shared/api/client";
import { useAuth } from "../../auth/AuthProvider";
import { NotificationsPendingModal, ProfileEditorModal, SecurityModal } from "../components/ProfileModals";

type ProfileModal = "profile" | "notifications" | "security" | null;

export function ProfileScreen({ onOpenAdmin }: { onOpenAdmin?: () => void }) {
  const { colors } = useAppTheme();
  const { signOut, user, workspaceMode } = useAuth();
  const [activeModal, setActiveModal] = useState<ProfileModal>(null);
  const avatarUri = resolveApiAsset(user.avatarUrl);
  const actions: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string; description: string; modal: Exclude<ProfileModal, null>; pending?: boolean }> = [
    { icon: "person-outline", label: "Editar perfil", description: "Foto, nome e CPF", modal: "profile" },
    { icon: "notifications-outline", label: "Notificações", description: "Lembretes e alertas", modal: "notifications", pending: true },
    { icon: "shield-checkmark-outline", label: "Segurança", description: "Alterar sua senha", modal: "security" },
  ];

  return (
    <Screen header={<AppHeader title="Mais" />}>
      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.lime }]}>{avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{user.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</Text>}</View>
        <View style={styles.profileCopy}>
          <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{user.email}</Text>
          <Text style={[styles.accountType, { color: colors.accent }]}>{workspaceMode === "personal" ? "MODO PESSOAL" : `MODO EMPRESARIAL${user.role === "admin" ? " · ADMINISTRADOR" : ""}`}</Text>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CONTA E PREFERÊNCIAS</Text>
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {actions.map((action, index) => (
          <Pressable
            accessibilityRole="button"
            key={action.label}
            onPress={() => setActiveModal(action.modal)}
            style={({ pressed }) => [styles.infoRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }, pressed && { opacity: 0.68 }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.surfaceRaised }]}>
              <Ionicons name={action.icon} size={19} color={action.pending ? colors.textMuted : colors.accent} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={[styles.infoLabel, { color: colors.text }]}>{action.label}</Text>
              <Text style={[styles.infoDescription, { color: colors.textMuted }]}>{action.description}</Text>
            </View>
            {action.pending ? <View style={[styles.pendingBadge, { backgroundColor: colors.accentSoft }]}><Text style={[styles.pendingText, { color: colors.accent }]}>EM BREVE</Text></View> : <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
          </Pressable>
        ))}
        <View style={[styles.infoRow, { borderTopColor: colors.border, borderTopWidth: 1 }]}>
          <View style={[styles.actionIcon, { backgroundColor: colors.surfaceRaised }]}>
            <Ionicons name="color-palette-outline" size={19} color={colors.accent} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>Tema escuro</Text>
            <Text style={[styles.infoDescription, { color: colors.textMuted }]}>Aparência do aplicativo</Text>
          </View>
          <ThemeModeSwitch />
        </View>
      </View>

      {user.role === "admin" && onOpenAdmin ? (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ADMINISTRAÇÃO</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onOpenAdmin}
            style={({ pressed }) => [styles.adminCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={[styles.adminIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.accent} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={[styles.infoLabel, { color: colors.text }]}>Painel administrativo</Text>
              <Text style={[styles.infoDescription, { color: colors.textMuted }]}>Usuários, papéis e permissões</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </>
      ) : null}

      <Pressable onPress={signOut} style={[styles.exitButton, { borderColor: colors.danger, backgroundColor: `${colors.danger}14` }]}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={[styles.exitText, { color: colors.danger }]}>Sair da conta</Text>
      </Pressable>

      <ProfileEditorModal visible={activeModal === "profile"} onClose={() => setActiveModal(null)} />
      <NotificationsPendingModal visible={activeModal === "notifications"} onClose={() => setActiveModal(null)} />
      <SecurityModal visible={activeModal === "security"} onClose={() => setActiveModal(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: "row", gap: 14, alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 18 },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 58, height: 58, borderRadius: 29 },
  avatarText: { color: "#1C2410", fontFamily: fonts.bodyBold, fontSize: 17 },
  profileCopy: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.bodyBold, fontSize: 16 },
  email: { fontFamily: fonts.body, fontSize: 12 },
  accountType: { fontFamily: fonts.bodyBold, fontSize: 10, marginTop: 5 },
  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 10, marginTop: 2 },
  infoCard: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16 },
  infoRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12 },
  actionIcon: { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  infoCopy: { flex: 1, gap: 3 },
  infoLabel: { fontFamily: fonts.bodyBold, fontSize: 14 },
  infoDescription: { fontFamily: fonts.body, fontSize: 11 },
  adminCard: { minHeight: 76, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  adminIcon: { width: 42, height: 42, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  pendingBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  pendingText: { fontFamily: fonts.bodyBold, fontSize: 9 },
  exitButton: { minHeight: 52, borderWidth: 1, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  exitText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
