import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError, resolveApiAsset } from "../../../shared/api/client";
import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts, type AppColors } from "../../../theme/tokens";
import { uploadAvatar } from "../../auth/api/auth-api";
import { useAuth } from "../../auth/AuthProvider";
import { updateProfile } from "../api/profile-api";

type ModalProps = {
  visible: boolean;
  onClose: () => void;
};

const formatCpf = (value: string) => value
  .replace(/\D/g, "")
  .slice(0, 11)
  .replace(/^(\d{3})(\d)/, "$1.$2")
  .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
  .replace(/\.(\d{3})(\d)/, ".$1-$2");

const passwordRequirements = (password: string) => [
  { label: "Pelo menos 8 caracteres", met: password.length >= 8 },
  { label: "Uma letra maiúscula", met: /[A-Z]/.test(password) },
  { label: "Uma letra minúscula", met: /[a-z]/.test(password) },
  { label: "Um número", met: /\d/.test(password) },
  { label: "Um caractere especial", met: /[^A-Za-z0-9]/.test(password) },
];

const errorMessage = (error: unknown, fallback: string) => error instanceof ApiError ? error.message : fallback;

export function ProfileEditorModal({ visible, onClose }: ModalProps) {
  const { colors } = useAppTheme();
  const { setUser, token, user } = useAuth();
  const [name, setName] = useState(user.name);
  const [cpf, setCpf] = useState(formatCpf(user.cpf));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const avatarUri = resolveApiAsset(user.avatarUrl);

  useEffect(() => {
    if (!visible) return;
    setName(user.name);
    setCpf(formatCpf(user.cpf));
    setError("");
  }, [user.cpf, user.name, visible]);

  const chooseAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Acesso às fotos", "Permita o acesso à galeria para alterar sua foto.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploading(true);
    setError("");
    try {
      const response = await uploadAvatar(token, result.assets[0].uri, result.assets[0].mimeType);
      await setUser({ ...user, ...response.user });
    } catch (uploadError) {
      setError(errorMessage(uploadError, "Não foi possível atualizar sua foto."));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await updateProfile(token, {
        name,
        email: user.email,
        cpf: cpf.replace(/\D/g, ""),
      });
      await setUser({ ...user, ...response.user });
      onClose();
    } catch (saveError) {
      setError(errorMessage(saveError, "Não foi possível salvar seu perfil."));
    } finally {
      setSaving(false);
    }
  };

  const initials = user.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("");

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <SheetHeader title="Editar perfil" onClose={onClose} colors={colors} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.avatarSection}>
              <Pressable
                accessibilityLabel="Alterar foto do perfil"
                disabled={uploading}
                onPress={chooseAvatar}
                style={[styles.avatarButton, { backgroundColor: colors.lime }]}
              >
                {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{initials}</Text>}
                <View style={[styles.cameraBadge, { backgroundColor: colors.accent, borderColor: colors.background }]}>
                  {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="camera" size={16} color="#FFF" />}
                </View>
              </Pressable>
              <Text style={[styles.avatarTitle, { color: colors.text }]}>Foto do perfil</Text>
              <Text style={[styles.helper, { color: colors.textMuted }]}>Toque na foto para escolher uma imagem.</Text>
            </View>

            <ProfileField colors={colors} label="Nome" value={name} onChangeText={setName} autoCapitalize="words" maxLength={120} />
            <ProfileField colors={colors} label="E-mail" value={user.email} editable={false} />
            <ProfileField colors={colors} label="CPF" value={cpf} onChangeText={(value) => setCpf(formatCpf(value))} keyboardType="number-pad" maxLength={14} />
            {!!error && <InlineError message={error} colors={colors} />}

            <Pressable
              disabled={saving || uploading}
              onPress={save}
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.accent, opacity: saving || uploading ? 0.5 : pressed ? 0.86 : 1 }]}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Salvar alterações</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export function SecurityModal({ visible, onClose }: ModalProps) {
  const { colors } = useAppTheme();
  const { setUser, token, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
    setShowPasswords(false);
    setError("");
  }, [visible]);

  const requirements = useMemo(() => passwordRequirements(newPassword), [newPassword]);
  const strongPassword = requirements.every(({ met }) => met);
  const passwordsMatch = confirmation.length > 0 && newPassword === confirmation;
  const canSave = currentPassword.length > 0 && strongPassword && passwordsMatch && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const response = await updateProfile(token, {
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        currentPassword,
        password: newPassword,
      });
      await setUser({ ...user, ...response.user });
      onClose();
      Alert.alert("Senha alterada", "Sua nova senha já está ativa.");
    } catch (saveError) {
      setError(errorMessage(saveError, "Não foi possível alterar sua senha."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <SheetHeader title="Segurança" onClose={onClose} colors={colors} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={[styles.securityIntro, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="shield-checkmark-outline" size={24} color={colors.accent} />
              <View style={styles.flex}>
                <Text style={[styles.securityTitle, { color: colors.text }]}>Proteja sua conta</Text>
                <Text style={[styles.helper, { color: colors.textMuted }]}>Confirme sua senha atual antes de definir uma nova.</Text>
              </View>
            </View>

            <PasswordField colors={colors} label="Senha atual" value={currentPassword} onChangeText={setCurrentPassword} visible={showPasswords} onToggle={() => setShowPasswords((current) => !current)} />
            <PasswordField colors={colors} label="Nova senha" value={newPassword} onChangeText={setNewPassword} visible={showPasswords} onToggle={() => setShowPasswords((current) => !current)} />
            <PasswordChecklist colors={colors} requirements={requirements} />
            <PasswordField colors={colors} label="Confirmar nova senha" value={confirmation} onChangeText={setConfirmation} visible={showPasswords} onToggle={() => setShowPasswords((current) => !current)} />
            {confirmation.length > 0 && !passwordsMatch ? <InlineError message="As senhas não coincidem." colors={colors} /> : null}
            {!!error && <InlineError message={error} colors={colors} />}

            <Pressable
              disabled={!canSave}
              onPress={save}
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.accent, opacity: canSave ? (pressed ? 0.86 : 1) : 0.5 }]}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Alterar senha</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export function NotificationsPendingModal({ visible, onClose }: ModalProps) {
  const { colors } = useAppTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <SheetHeader title="Notificações" onClose={onClose} colors={colors} />
        <View style={styles.pendingContent}>
          <View style={[styles.pendingIcon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="notifications-outline" size={34} color={colors.accent} />
          </View>
          <View style={[styles.pendingBadge, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.pendingBadgeText, { color: colors.accent }]}>EM DESENVOLVIMENTO</Text>
          </View>
          <Text style={[styles.pendingTitle, { color: colors.text }]}>Estamos preparando seus lembretes</Text>
          <Text style={[styles.pendingDescription, { color: colors.textMuted }]}>Em breve você poderá escolher alertas para compromissos pessoais e agendamentos da equipe.</Text>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Entendi</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function SheetHeader({ title, onClose, colors }: { title: string; onClose: () => void; colors: AppColors }) {
  return (
    <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
      <View>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>MINHA CONTA</Text>
        <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <Pressable accessibilityLabel="Fechar" onPress={onClose} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.72 : 1 }]}>
        <Ionicons name="close" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

function ProfileField({ colors, label, editable = true, ...props }: { colors: AppColors; label: string; editable?: boolean } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        editable={editable}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: editable ? colors.text : colors.textMuted, backgroundColor: editable ? colors.surface : colors.surfaceRaised, borderColor: colors.border }]}
        {...props}
      />
    </View>
  );
}

function PasswordField({ colors, label, value, onChangeText, visible, onToggle }: { colors: AppColors; label: string; value: string; onChangeText: (value: string) => void; visible: boolean; onToggle: () => void }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <View style={[styles.passwordInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={72}
          onChangeText={onChangeText}
          placeholder="Digite sua senha"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!visible}
          style={[styles.passwordTextInput, { color: colors.text }]}
          value={value}
        />
        <Pressable accessibilityLabel={visible ? "Ocultar senhas" : "Mostrar senhas"} onPress={onToggle} hitSlop={10}>
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

function PasswordChecklist({ colors, requirements }: { colors: AppColors; requirements: ReturnType<typeof passwordRequirements> }) {
  return (
    <View style={[styles.checklist, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
      {requirements.map(({ label, met }) => (
        <View key={label} style={styles.requirement}>
          <Ionicons name={met ? "checkmark-circle" : "close-circle"} size={16} color={met ? colors.success : colors.danger} />
          <Text style={[styles.requirementText, { color: met ? colors.success : colors.danger }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function InlineError({ message, colors }: { message: string; colors: AppColors }) {
  return (
    <View style={[styles.errorBox, { backgroundColor: `${colors.danger}14`, borderColor: `${colors.danger}50` }]}>
      <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
      <Text style={[styles.errorText, { color: colors.danger }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  sheetHeader: { minHeight: 82, borderBottomWidth: 1, paddingHorizontal: 22, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 10, marginBottom: 3 },
  sheetTitle: { fontFamily: fonts.displayBold, fontSize: 28 },
  closeButton: { width: 42, height: 42, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 22, paddingBottom: 44, gap: 18 },
  avatarSection: { alignItems: "center", marginBottom: 4 },
  avatarButton: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { color: "#1C2410", fontFamily: fonts.bodyBold, fontSize: 24 },
  cameraBadge: { position: "absolute", right: -1, bottom: 2, width: 30, height: 30, borderRadius: 15, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  avatarTitle: { fontFamily: fonts.bodyBold, fontSize: 15, marginBottom: 3 },
  helper: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  field: { gap: 7 },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 13 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 14 },
  passwordInput: { minHeight: 52, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  passwordTextInput: { flex: 1, minHeight: 50, fontFamily: fonts.body, fontSize: 14 },
  primaryButton: { minHeight: 54, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryButtonText: { color: "#FFF", fontFamily: fonts.bodyBold, fontSize: 15 },
  securityIntro: { borderRadius: 8, padding: 15, flexDirection: "row", gap: 12, alignItems: "center" },
  securityTitle: { fontFamily: fonts.bodyBold, fontSize: 14, marginBottom: 2 },
  checklist: { borderWidth: 1, borderRadius: 8, padding: 13, gap: 8 },
  requirement: { flexDirection: "row", alignItems: "center", gap: 8 },
  requirementText: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  errorBox: { borderWidth: 1, borderRadius: 8, padding: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  errorText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 17 },
  pendingContent: { flex: 1, paddingHorizontal: 30, alignItems: "center", justifyContent: "center" },
  pendingIcon: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  pendingBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 14 },
  pendingBadgeText: { fontFamily: fonts.bodyBold, fontSize: 10 },
  pendingTitle: { fontFamily: fonts.displayBold, fontSize: 28, textAlign: "center", marginBottom: 10 },
  pendingDescription: { maxWidth: 330, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 28 },
  secondaryButton: { minWidth: 150, minHeight: 50, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
