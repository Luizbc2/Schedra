import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ApiError } from "../../../shared/api/client";
import { AppHeader } from "../../../shared/components/AppHeader";
import { Screen } from "../../../shared/components/Screen";
import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts } from "../../../theme/tokens";
import { useAuth } from "../../auth/AuthProvider";
import { professionalsApi, type Professional, type ProfessionalInput, type ProfessionalStatus } from "../api/professionals-api";
import { CatalogEditor, CatalogEditorField } from "../components/CatalogEditor";

const emptyProfessional: ProfessionalInput = { name: "", email: "", phone: "", specialty: "", status: "ativo" };

export function ProfessionalsScreen() {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Professional | null | undefined>(undefined);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError("");
    try {
      setProfessionals((await professionalsApi.list(token, query)).data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar os profissionais.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(search), 350);
    return () => clearTimeout(timeout);
  }, [load, search]);

  const emptyTitle = search ? "Nenhum resultado" : "Sua equipe está vazia";
  const emptyDetail = search ? "Tente buscar com outro termo." : "Cadastre o primeiro profissional para começar.";

  return (
    <Screen
      header={<AppHeader eyebrow="OPERAÇÃO" title="Profissionais" />}
      floatingAction={<Pressable accessibilityLabel="Novo profissional" onPress={() => setEditor(null)} style={[styles.fab, { backgroundColor: colors.accent }]}><Ionicons name="person-add-outline" color="#FFF" size={23} /></Pressable>}
    >
      <View>
        <Text style={[styles.kicker, { color: colors.accent }]}>EQUIPE</Text>
        <Text style={[styles.title, { color: colors.text }]}>Quem faz acontecer</Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>Organize especialidades, contatos e disponibilidade da equipe.</Text>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput accessibilityLabel="Buscar profissionais" autoCapitalize="words" onChangeText={setSearch} placeholder="Buscar por nome ou especialidade" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} value={search} />
        {search ? <Pressable accessibilityLabel="Limpar busca" onPress={() => setSearch("")}><Ionicons name="close-circle" size={19} color={colors.textMuted} /></Pressable> : null}
      </View>

      <View style={styles.resultHeader}>
        <Text style={[styles.resultCount, { color: colors.textMuted }]}>{professionals.length} {professionals.length === 1 ? "profissional" : "profissionais"}</Text>
        <Pressable accessibilityLabel="Recarregar profissionais" onPress={() => void load(search)}><Ionicons name="refresh" size={20} color={colors.textMuted} /></Pressable>
      </View>

      {loading ? <ActivityIndicator style={styles.loader} color={colors.accent} /> : error || professionals.length === 0 ? (
        <View style={[styles.feedback, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name={error ? "cloud-offline-outline" : "briefcase-outline"} size={30} color={colors.textMuted} />
          <Text style={[styles.feedbackTitle, { color: colors.text }]}>{error ? "Falha ao carregar" : emptyTitle}</Text>
          <Text style={[styles.feedbackDetail, { color: colors.textMuted }]}>{error || emptyDetail}</Text>
          <Pressable onPress={() => error ? void load(search) : search ? setSearch("") : setEditor(null)} style={[styles.secondaryButton, { borderColor: colors.accent }]}>
            <Text style={[styles.secondaryText, { color: colors.accent }]}>{error ? "Tentar novamente" : search ? "Limpar busca" : "Cadastrar profissional"}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.list}>
          {professionals.map((professional) => (
            <Pressable key={professional.id} accessibilityLabel={`Editar ${professional.name}`} onPress={() => setEditor(professional)} style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.72 : 1 }]}>
              <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}><Text style={[styles.avatarText, { color: colors.accent }]}>{initials(professional.name)}</Text></View>
              <View style={styles.cardBody}>
                <View style={styles.nameLine}>
                  <Text numberOfLines={1} style={[styles.cardName, { color: colors.text }]}>{professional.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: professional.status === "ativo" ? `${colors.success}1F` : `${colors.amber}1F` }]}>
                    <Text style={[styles.statusText, { color: professional.status === "ativo" ? colors.success : colors.amber }]}>{professional.status === "ativo" ? "ATIVO" : "FÉRIAS"}</Text>
                  </View>
                </View>
                <Text numberOfLines={1} style={[styles.specialty, { color: colors.accent }]}>{professional.specialty}</Text>
                <Text numberOfLines={1} style={[styles.detail, { color: colors.textMuted }]}>{professional.phone} · {professional.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      <ProfessionalEditor professional={editor} onClose={() => setEditor(undefined)} onChanged={async () => { setEditor(undefined); await load(search); }} />
    </Screen>
  );
}

function ProfessionalEditor({ professional, onClose, onChanged }: { professional: Professional | null | undefined; onClose: () => void; onChanged: () => void }) {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const [input, setInput] = useState<ProfessionalInput>(emptyProfessional);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setInput(professional ? { name: professional.name, email: professional.email, phone: professional.phone, specialty: professional.specialty, status: professional.status } : emptyProfessional);
    setFormError("");
  }, [professional]);

  const change = (next: Partial<ProfessionalInput>) => {
    setInput((current) => ({ ...current, ...next }));
    if (formError) setFormError("");
  };

  const save = async () => {
    const validation = validateProfessional(input);
    if (validation) return setFormError(validation);
    setSaving(true);
    setFormError("");
    try {
      if (professional) await professionalsApi.update(token, professional.id, input);
      else await professionalsApi.create(token, input);
      onChanged();
    } catch (requestError) {
      setFormError(requestError instanceof ApiError ? requestError.message : "Não foi possível salvar o profissional.");
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!professional) return;
    const execute = async () => {
      setSaving(true);
      setFormError("");
      try {
        await professionalsApi.remove(token, professional.id);
        onChanged();
      } catch (requestError) {
        setFormError(requestError instanceof Error ? requestError.message : "Não foi possível excluir o profissional.");
      } finally {
        setSaving(false);
      }
    };
    const message = `${professional.name} será removido da equipe.`;
    if (Platform.OS === "web") {
      if (window.confirm(`Excluir profissional?\n\n${message}`)) void execute();
      return;
    }
    Alert.alert("Excluir profissional?", message, [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: () => void execute() }]);
  };

  return (
    <CatalogEditor eyebrow={professional ? "EDITAR PROFISSIONAL" : "NOVO PROFISSIONAL"} onClose={onClose} title={professional?.name ?? "Cadastro"} visible={professional !== undefined}>
      <CatalogEditorField colors={colors} label="Nome" value={input.name} onChangeText={(name) => change({ name })} autoCapitalize="words" />
      <CatalogEditorField colors={colors} label="E-mail" value={input.email} onChangeText={(email) => change({ email })} autoCapitalize="none" keyboardType="email-address" />
      <CatalogEditorField colors={colors} label="Telefone" value={input.phone} onChangeText={(phone) => change({ phone })} keyboardType="phone-pad" />
      <CatalogEditorField colors={colors} label="Especialidade" value={input.specialty} onChangeText={(specialty) => change({ specialty })} autoCapitalize="words" />

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>Status</Text>
        <View style={[styles.segment, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(["ativo", "ferias"] as ProfessionalStatus[]).map((status) => {
            const selected = input.status === status;
            return <Pressable key={status} onPress={() => change({ status })} style={[styles.segmentButton, selected && { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}><Text style={[styles.segmentText, { color: selected ? colors.accent : colors.textMuted }]}>{status === "ativo" ? "Ativo" : "Férias"}</Text></Pressable>;
          })}
        </View>
      </View>

      {formError ? <View style={[styles.errorBox, { backgroundColor: colors.accentSoft }]}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={[styles.errorText, { color: colors.danger }]}>{formError}</Text></View> : null}
      <Pressable disabled={saving} onPress={() => void save()} style={[styles.saveButton, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{professional ? "Salvar alterações" : "Cadastrar profissional"}</Text>}</Pressable>
      {professional ? <Pressable disabled={saving} onPress={remove} style={[styles.deleteButton, { borderColor: colors.danger }]}><Ionicons name="trash-outline" size={18} color={colors.danger} /><Text style={[styles.deleteText, { color: colors.danger }]}>Excluir profissional</Text></Pressable> : null}
    </CatalogEditor>
  );
}

function validateProfessional(input: ProfessionalInput) {
  if (input.name.trim().length < 2) return "Informe o nome completo do profissional.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return "Informe um e-mail válido.";
  const phone = input.phone.replace(/\D/g, "");
  if (phone.length !== 10 && phone.length !== 11) return "Informe um telefone com DDD.";
  if (input.specialty.trim().length < 2) return "Informe a especialidade do profissional.";
  return "";
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, marginBottom: 6 },
  title: { fontFamily: fonts.displayBold, fontSize: 34 },
  description: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 8 },
  searchBox: { minHeight: 52, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14 },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  resultCount: { fontFamily: fonts.bodyBold, fontSize: 12 },
  loader: { marginVertical: 42 },
  list: { gap: 9 },
  card: { minHeight: 88, borderWidth: 1, borderRadius: 10, padding: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  cardBody: { flex: 1, minWidth: 0, gap: 3 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15 },
  specialty: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  detail: { fontFamily: fonts.body, fontSize: 11 },
  statusBadge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 4 },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 8 },
  feedback: { alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 28, gap: 8 },
  feedbackTitle: { fontFamily: fonts.display, fontSize: 22, marginTop: 3 },
  feedbackDetail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, textAlign: "center" },
  secondaryButton: { minHeight: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", marginTop: 7 },
  secondaryText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  fab: { position: "absolute", right: 22, bottom: 18, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 7 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 13 },
  segment: { minHeight: 50, borderWidth: 1, borderRadius: 8, padding: 4, flexDirection: "row", gap: 4 },
  segmentButton: { flex: 1, borderWidth: 1, borderColor: "transparent", borderRadius: 6, alignItems: "center", justifyContent: "center" },
  segmentText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  errorBox: { borderRadius: 8, padding: 11, flexDirection: "row", alignItems: "center", gap: 8 },
  errorText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 17 },
  saveButton: { minHeight: 52, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#FFF", fontFamily: fonts.bodyBold, fontSize: 15 },
  deleteButton: { minHeight: 48, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  deleteText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
