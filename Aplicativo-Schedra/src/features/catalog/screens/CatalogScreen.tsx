import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "../../../shared/api/client";
import { AppHeader } from "../../../shared/components/AppHeader";
import { Screen } from "../../../shared/components/Screen";
import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts, type AppColors } from "../../../theme/tokens";
import { useAuth } from "../../auth/AuthProvider";
import { clientsApi, type Client, type ClientInput } from "../api/clients-api";
import { validateClient } from "../validation/client-validation";
import { ProfessionalsScreen } from "./ProfessionalsScreen";
import { ServicesScreen } from "./ServicesScreen";

const emptyInput: ClientInput = { name: "", email: "", phone: "", cpf: "", notes: "" };

export function CatalogScreen({ kind }: { kind: "clients" | "professionals" | "services" }) {
  if (kind === "professionals") return <ProfessionalsScreen />;
  if (kind === "services") return <ServicesScreen />;
  return <ClientsScreen />;
}

function ClientsScreen() {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Client | null | undefined>(undefined);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await clientsApi.list(token, query);
      setClients(response.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nao foi possivel carregar os clientes.");
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(search), 350);
    return () => clearTimeout(timeout);
  }, [load, search]);

  const feedback = error
    ? { icon: "cloud-offline-outline" as const, title: "Falha ao carregar", detail: error, action: "Tentar novamente", run: () => void load(search) }
    : { icon: "people-outline" as const, title: search ? "Nenhum resultado" : "Sua carteira esta vazia", detail: search ? "Tente buscar com outro termo." : "Cadastre o primeiro cliente para comecar.", action: search ? "Limpar busca" : "Cadastrar cliente", run: () => search ? setSearch("") : setEditor(null) };

  return <Screen header={<AppHeader eyebrow="RELACIONAMENTOS" title="Clientes" />} floatingAction={<Pressable accessibilityLabel="Novo cliente" onPress={() => setEditor(null)} style={[styles.fab, { backgroundColor: colors.accent }]}><Ionicons name="person-add-outline" color="#FFF" size={23} /></Pressable>}>
    <View><Text style={[styles.kicker, { color: colors.accent }]}>CARTEIRA DE CLIENTES</Text><Text style={[styles.title, { color: colors.text }]}>Relacionamentos em ordem</Text><Text style={[styles.description, { color: colors.textMuted }]}>Cadastre, encontre e mantenha os dados importantes de cada cliente.</Text></View>
    <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="search" size={20} color={colors.textMuted} /><TextInput accessibilityLabel="Buscar clientes" autoCapitalize="words" onChangeText={setSearch} placeholder="Buscar por nome, e-mail ou telefone" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} value={search} />{search ? <Pressable accessibilityLabel="Limpar busca" onPress={() => setSearch("")}><Ionicons name="close-circle" size={19} color={colors.textMuted} /></Pressable> : null}</View>
    <View style={styles.resultHeader}><Text style={[styles.resultCount, { color: colors.textMuted }]}>{clients.length} {clients.length === 1 ? "cliente" : "clientes"}</Text><Pressable accessibilityLabel="Recarregar clientes" onPress={() => void load(search)}><Ionicons name="refresh" size={20} color={colors.textMuted} /></Pressable></View>
    {loading ? <ActivityIndicator style={styles.loader} color={colors.accent} /> : clients.length === 0 || error ? <View style={[styles.feedback, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name={feedback.icon} size={30} color={colors.textMuted} /><Text style={[styles.feedbackTitle, { color: colors.text }]}>{feedback.title}</Text><Text style={[styles.feedbackDetail, { color: colors.textMuted }]}>{feedback.detail}</Text><Pressable onPress={feedback.run} style={[styles.secondaryButton, { borderColor: colors.accent }]}><Text style={[styles.secondaryText, { color: colors.accent }]}>{feedback.action}</Text></Pressable></View> : <View style={styles.clientList}>{clients.map((client) => <Pressable key={client.id} accessibilityLabel={`Editar ${client.name}`} onPress={() => setEditor(client)} style={({ pressed }) => [styles.clientCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}><View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}><Text style={[styles.avatarText, { color: colors.accent }]}>{initials(client.name)}</Text></View><View style={styles.clientBody}><Text numberOfLines={1} style={[styles.clientName, { color: colors.text }]}>{client.name}</Text><Text numberOfLines={1} style={[styles.clientDetail, { color: colors.textMuted }]}>{client.phone || client.email}</Text>{client.phone && client.email ? <Text numberOfLines={1} style={[styles.clientDetail, { color: colors.textMuted }]}>{client.email}</Text> : null}</View><Ionicons name="chevron-forward" size={19} color={colors.textMuted} /></Pressable>)}</View>}
    <ClientEditor client={editor} onClose={() => setEditor(undefined)} onChanged={async () => { setEditor(undefined); await load(search); }} />
  </Screen>;
}

function ClientEditor({ client, onClose, onChanged }: { client: Client | null | undefined; onClose: () => void; onChanged: () => void }) {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const [input, setInput] = useState<ClientInput>(emptyInput);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setInput(client ? { name: client.name, email: client.email, phone: client.phone, cpf: client.cpf, notes: client.notes } : emptyInput);
    setFormError("");
  }, [client]);

  const save = async () => {
    const validation = validateClient(input);
    if (validation) return setFormError(validation);
    setSaving(true); setFormError("");
    try {
      if (client) await clientsApi.update(token, client.id, input); else await clientsApi.create(token, input);
      onChanged();
    } catch (requestError) { setFormError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar o cliente."); }
    finally { setSaving(false); }
  };

  const remove = () => {
    if (!client) return;
    const execute = async () => {
      setSaving(true);
      try { await clientsApi.remove(token, client.id); onChanged(); }
      catch (requestError) { setFormError(requestError instanceof Error ? requestError.message : "Nao foi possivel excluir o cliente."); }
      finally { setSaving(false); }
    };
    const message = `${client.name} sera removido da sua carteira.`;
    if (Platform.OS === "web") {
      if (window.confirm(`Excluir cliente?\n\n${message}`)) void execute();
      return;
    }
    Alert.alert("Excluir cliente?", message, [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: () => void execute() }]);
  };
  const change = (next: Partial<ClientInput>) => { setInput((current) => ({ ...current, ...next })); if (formError) setFormError(""); };

  return <Modal visible={client !== undefined} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modal}><View style={styles.modalHeader}><View><Text style={[styles.modalEyebrow, { color: colors.accent }]}>{client ? "EDITAR CLIENTE" : "NOVO CLIENTE"}</Text><Text numberOfLines={1} style={[styles.modalTitle, { color: colors.text }]}>{client ? client.name : "Cadastro"}</Text></View><Pressable accessibilityLabel="Fechar" onPress={onClose}><Ionicons name="close" size={26} color={colors.text} /></Pressable></View><View style={styles.form}><EditorField colors={colors} label="Nome" value={input.name} onChangeText={(name) => change({ name })} autoCapitalize="words" /><EditorField colors={colors} label="E-mail" value={input.email} onChangeText={(email) => change({ email })} autoCapitalize="none" keyboardType="email-address" /><EditorField colors={colors} label="Telefone" value={input.phone} onChangeText={(phone) => change({ phone })} keyboardType="phone-pad" /><EditorField colors={colors} label="CPF (opcional)" value={input.cpf} onChangeText={(cpf) => change({ cpf })} keyboardType="number-pad" /><EditorField colors={colors} label="Observacoes (opcional)" value={input.notes} onChangeText={(notes) => change({ notes })} multiline />{formError ? <View style={[styles.errorBox, { backgroundColor: colors.accentSoft }]}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={[styles.errorText, { color: colors.danger }]}>{formError}</Text></View> : null}<Pressable disabled={saving} onPress={() => void save()} style={[styles.saveButton, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{client ? "Salvar alteracoes" : "Cadastrar cliente"}</Text>}</Pressable>{client ? <Pressable disabled={saving} onPress={remove} style={[styles.deleteButton, { borderColor: colors.danger }]}><Ionicons name="trash-outline" size={18} color={colors.danger} /><Text style={[styles.deleteText, { color: colors.danger }]}>Excluir cliente</Text></Pressable> : null}</View></KeyboardAvoidingView></SafeAreaView></Modal>;
}

function EditorField({ colors, label, ...props }: { colors: AppColors; label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text><TextInput placeholderTextColor={colors.textMuted} style={[styles.input, props.multiline && styles.notesInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} {...props} /></View>;
}

function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(""); }

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, marginBottom: 6 }, title: { fontFamily: fonts.displayBold, fontSize: 34 }, description: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 8 }, searchBox: { minHeight: 52, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }, searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14 }, resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, resultCount: { fontFamily: fonts.bodyBold, fontSize: 12 }, loader: { marginVertical: 42 }, clientList: { gap: 9 }, clientCard: { minHeight: 82, borderWidth: 1, borderRadius: 10, padding: 13, flexDirection: "row", alignItems: "center", gap: 12 }, avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" }, avatarText: { fontFamily: fonts.bodyBold, fontSize: 14 }, clientBody: { flex: 1, gap: 3 }, clientName: { fontFamily: fonts.bodyBold, fontSize: 15 }, clientDetail: { fontFamily: fonts.body, fontSize: 12 }, feedback: { alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 28, gap: 8 }, feedbackTitle: { fontFamily: fonts.display, fontSize: 22, marginTop: 3 }, feedbackDetail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, textAlign: "center" }, secondaryButton: { minHeight: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", marginTop: 7 }, secondaryText: { fontFamily: fonts.bodyBold, fontSize: 13 }, fab: { position: "absolute", right: 22, bottom: 18, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 7 }, modal: { flex: 1 }, modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 22 }, modalEyebrow: { fontFamily: fonts.bodyBold, fontSize: 10 }, modalTitle: { fontFamily: fonts.displayBold, fontSize: 31, maxWidth: 280 }, form: { gap: 14, paddingHorizontal: 22, paddingBottom: 42 }, field: { gap: 6 }, fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 13 }, input: { minHeight: 49, borderWidth: 1, borderRadius: 8, padding: 13, fontFamily: fonts.body, fontSize: 14 }, notesInput: { minHeight: 76, textAlignVertical: "top" }, errorBox: { borderRadius: 8, padding: 11, flexDirection: "row", alignItems: "center", gap: 8 }, errorText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 17 }, saveButton: { minHeight: 52, borderRadius: 8, alignItems: "center", justifyContent: "center" }, saveText: { color: "#FFF", fontFamily: fonts.bodyBold, fontSize: 15 }, deleteButton: { minHeight: 48, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, deleteText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
