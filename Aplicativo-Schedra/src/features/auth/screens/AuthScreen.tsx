import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "../../../shared/api/client";
import { Button } from "../../../shared/components/ui/Button";
import { IconButton } from "../../../shared/components/ui/IconButton";
import { FormField } from "../../../shared/components/ui/FormField";
import { InlineError } from "../../../shared/components/ui/FeedbackState";
import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts } from "../../../theme/tokens";
import { useAuth } from "../AuthProvider";
import { formatCpf, normalizeCpf, validateCpf } from "../cpf";

type AuthMode = "login" | "signup";

const getPasswordRequirements = (password: string) => [
  { id: "length", label: "Pelo menos 8 caracteres", met: password.length >= 8 },
  { id: "uppercase", label: "Uma letra maiúscula", met: /[A-Z]/.test(password) },
  { id: "lowercase", label: "Uma letra minúscula", met: /[a-z]/.test(password) },
  { id: "number", label: "Um número", met: /\d/.test(password) },
  { id: "special", label: "Um caractere especial", met: /[^A-Za-z0-9]/.test(password) },
];

const getCpfRequirements = (cpf: string) => {
  const digits = normalizeCpf(cpf);

  return [
    { id: "length", label: "11 dígitos", met: digits.length === 11 },
    { id: "valid", label: "CPF válido", met: validateCpf(digits) },
  ];
};

export function AuthScreen() {
  const { colors, mode, toggleTheme } = useAppTheme();
  const { signIn, signUp } = useAuth();
  const [screen, setScreen] = useState<AuthMode>("login");
  const [form, setForm] = useState({ name: "", cpf: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [switchWidth, setSwitchWidth] = useState(0);
  const transitionLocked = useRef(false);
  const selectorProgress = useRef(new Animated.Value(0)).current;
  const contentOffset = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentScale = useRef(new Animated.Value(1)).current;

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const changeScreen = (nextScreen: AuthMode) => {
    if (nextScreen === screen || transitionLocked.current) return;

    transitionLocked.current = true;
    setError("");
    const direction = nextScreen === "signup" ? 1 : -1;

    Animated.timing(selectorProgress, {
      toValue: nextScreen === "signup" ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(contentOffset, {
        toValue: -direction * 34,
        duration: 140,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(contentScale, {
        toValue: 0.985,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setScreen(nextScreen);
      contentOffset.setValue(direction * 34);

      Animated.parallel([
        Animated.timing(contentOffset, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(contentScale, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        transitionLocked.current = false;
      });
    });
  };

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      if (screen === "login") {
        await signIn({ email: form.email, password: form.password });
      } else {
        await signUp({ ...form, cpf: normalizeCpf(form.cpf) });
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível acessar sua conta.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectorWidth = Math.max(0, (switchWidth - 8) / 2);
  const selectorTranslate = selectorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, selectorWidth],
  });
  const passwordRequirements = getPasswordRequirements(form.password);
  const cpfRequirements = getCpfRequirements(form.cpf);
  const passwordIsStrong = passwordRequirements.every((requirement) => requirement.met);
  const cpfIsValid = cpfRequirements.every((requirement) => requirement.met);
  const submitDisabled = submitting || (screen === "signup" && (!passwordIsStrong || !cpfIsValid));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <View>
              <Text style={[styles.brand, { color: colors.text }]}>Schedra</Text>
              <Text style={[styles.tagline, { color: colors.textMuted }]}>Agenda inteligente</Text>
            </View>
            <IconButton
              accessibilityLabel="Alternar tema"
              icon={mode === "dark" ? "sunny-outline" : "moon-outline"}
              onPress={toggleTheme}
            />
          </View>

          <View
            onLayout={(event) => setSwitchWidth(event.nativeEvent.layout.width)}
            style={[styles.authSwitch, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {selectorWidth > 0 && (
              <Animated.View
                style={[
                  styles.authSwitchSelector,
                  {
                    width: selectorWidth,
                    backgroundColor: colors.accent,
                    transform: [{ translateX: selectorTranslate }],
                  },
                ]}
              />
            )}
            <AuthSwitchOption label="Entrar" selected={screen === "login"} onPress={() => changeScreen("login")} colors={colors} />
            <AuthSwitchOption label="Criar conta" selected={screen === "signup"} onPress={() => changeScreen("signup")} colors={colors} />
          </View>

          <Animated.View
            style={[
              styles.animatedContent,
              {
                opacity: contentOpacity,
                transform: [{ perspective: 900 }, { translateX: contentOffset }, { scale: contentScale }],
              },
            ]}
          >
            <View style={styles.heading}>
              <Text style={[styles.eyebrow, { color: colors.accent }]}>
                {screen === "signup" ? "COMECE AGORA" : "ACESSO SEGURO"}
              </Text>
              <Text style={[styles.title, { color: colors.text }]}>
                {screen === "login" ? "Entrar no Schedra" : "Crie sua rotina"}
              </Text>
              <Text style={[styles.description, { color: colors.textMuted }]}>
                {screen === "login"
                  ? "Continue de onde sua rotina parou."
                  : "Uma conta, dois jeitos de organizar o seu dia."}
              </Text>
            </View>

            <View style={styles.form}>
              {screen === "signup" && (
                <>
                  <FormField label="Nome" value={form.name} onChangeText={(value) => update("name", value)} editable={!submitting} />
                  <FormField
                    label="CPF"
                    value={form.cpf}
                    onChangeText={(value) => update("cpf", formatCpf(value))}
                    keyboardType="numeric"
                    maxLength={14}
                    placeholder="000.000.000-00"
                    editable={!submitting}
                  />
                  <ValidationChecklist
                    accessibilityLabel="Requisitos do CPF"
                    title="Seu CPF precisa ter"
                    requirements={cpfRequirements}
                    colors={colors}
                  />
                </>
              )}
              <FormField
                label="E-mail"
                value={form.email}
                onChangeText={(value) => update("email", value)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!submitting}
              />
              <FormField
                label="Senha"
                value={form.password}
                onChangeText={(value) => update("password", value)}
                secureTextEntry
                maxLength={72}
                editable={!submitting}
              />
              {screen === "signup" && (
                <ValidationChecklist
                  accessibilityLabel="Requisitos da senha"
                  title="Sua senha precisa ter"
                  requirements={passwordRequirements}
                  colors={colors}
                />
              )}
              {!!error && <InlineError message={error} />}
              <Button
                label={screen === "login" ? "Entrar" : "Criar conta"}
                icon="arrow-forward"
                iconPosition="end"
                disabled={submitDisabled}
                loading={submitting}
                onPress={submit}
              />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AuthSwitchOption({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.authSwitchOption, pressed && styles.pressed]}
    >
      <Text style={[styles.authSwitchText, { color: selected ? "#FFF" : colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

function ValidationChecklist({
  accessibilityLabel,
  title,
  requirements,
  colors,
}: {
  accessibilityLabel: string;
  title: string;
  requirements: Array<{ id: string; label: string; met: boolean }>;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.passwordChecklist, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
    >
      <Text style={[styles.passwordChecklistTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.passwordRequirements}>
        {requirements.map((requirement) => {
          const color = requirement.met ? colors.success : colors.danger;

          return (
            <View key={requirement.id} style={styles.passwordRequirement}>
              <Ionicons
                name={requirement.met ? "checkmark-circle" : "close-circle-outline"}
                size={18}
                color={color}
              />
              <Text style={[styles.passwordRequirementText, { color }]}>{requirement.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: 24, gap: 24 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontFamily: fonts.bodyBold, fontSize: 23 },
  tagline: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  authSwitch: { height: 52, padding: 4, borderRadius: 8, borderWidth: 1, flexDirection: "row", position: "relative" },
  authSwitchSelector: { position: "absolute", left: 4, top: 4, bottom: 4, borderRadius: 6 },
  authSwitchOption: { flex: 1, alignItems: "center", justifyContent: "center", zIndex: 1 },
  authSwitchText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  animatedContent: { gap: 24 },
  heading: { gap: 8, marginTop: 8 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11 },
  title: { fontFamily: fonts.displayBold, fontSize: 42 },
  description: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  form: { gap: 18 },
  passwordChecklist: { borderWidth: 1, borderRadius: 8, padding: 14, gap: 11 },
  passwordChecklistTitle: { fontFamily: fonts.bodyBold, fontSize: 12 },
  passwordRequirements: { gap: 8 },
  passwordRequirement: { flexDirection: "row", alignItems: "center", gap: 8 },
  passwordRequirementText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12 },
  pressed: { opacity: 0.72 },
});
