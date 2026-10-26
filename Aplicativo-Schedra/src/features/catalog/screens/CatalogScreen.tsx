import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ApiError } from "../../../shared/api/client";
import { AppHeader } from "../../../shared/components/AppHeader";
import { Screen } from "../../../shared/components/Screen";
import { LocalDataHint } from "../../../shared/components/LocalDataHint";
import { useCatalogList } from "../hooks/useCatalogList";
import { Button } from "../../../shared/components/ui/Button";
import { IconButton } from "../../../shared/components/ui/IconButton";
import { FormField } from "../../../shared/components/ui/FormField";
import { FeedbackState, InlineError } from "../../../shared/components/ui/FeedbackState";
import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts } from "../../../theme/tokens";
import { useAuth } from "../../auth/AuthProvider";
import { clientsApi, type Client, type ClientInput } from "../api/clients-api";
import { validateClient } from "../validation/client-validation";
import { CatalogEditor } from "../components/CatalogEditor";
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
  const { items: clients, search, setSearch, loading, error, localResult, load } = useCatalogList(clientsApi.list, token);
  const [editor, setEditor] = useState<Client | null | undefined>(undefined);

  const feedback = error
    ? { icon: "cloud-offline-outline" as const, title: "Falha ao carregar", detail: error, action: "Tentar novamente", run: () => void load(search) }
    : { icon: "people-outline" as const, title: search ? "Nenhum resultado" : "Sua carteira esta vazia", detail: search ? "Tente buscar com outro termo." : "Cadastre o primeiro cliente para comecar.", action: search ? "Limpar busca" : "Cadastrar cliente", run: () => search ? setSearch("") : setEditor(null) };

  return <Screen header={<AppHeader eyebrow="RELACIONAMENTOS" title="Clientes" />} floatingAction={<IconButton accessibilityLabel="Novo cliente" icon="person-add-outline" variant="primary" size="large" onPress={() => setEditor(null)} style={styles.fab} />}>
    <View><Text style={[styles.kicker, { color: colors.accent }]}>CARTEIRA DE CLIENTES</Text><Text style={[styles.title, { color: colors.text }]}>Relacionamentos em ordem</Text><Text style={[styles.description, { color: colors.textMuted }]}>Cadastre, encontre e mantenha os dados importantes de cada cliente.</Text></View>
    <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="search" size={20} color={colors.textMuted} /><TextInput accessibilityLabel="Buscar clientes" autoCapitalize="words" onChangeText={setSearch} placeholder="Buscar por nome, e-mail ou telefone" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} value={search} />{search ? <IconButton accessibilityLabel="Limpar busca" icon="close-circle" variant="ghost" onPress={() => setSearch("")} /> : null}</View>
    <LocalDataHint result={localResult} />
    <View style={styles.resultHeader}><Text style={[styles.resultCount, { color: colors.textMuted }]}>{clients.length} {clients.length === 1 ? "cliente" : "clientes"}</Text><IconButton accessibilityLabel="Recarregar clientes" icon="refresh" variant="ghost" loading={loading} onPress={() => void load(search)} /></View>
    {loading ? <FeedbackState kind="loading" title="Carregando clientes" /> : clients.length === 0 || error ? (
      <FeedbackState kind={error ? "error" : "empty"} icon={feedback.icon} title={feedback.title} detail={feedback.detail} action={{ label: feedback.action, onPress: feedback.run }} />
    ) : <View style={styles.clientList}>{clients.map((client) => <Pressable key={client.id} accessibilityLabel={`Editar ${client.name}`} onPress={() => setEditor(client)} style={({ pressed }) => [styles.clientCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}><View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}><Text style={[styles.avatarText, { color: colors.accent }]}>{initials(client.name)}</Text></View><View style={styles.clientBody}><Text numberOfLines={1} style={[styles.clientName, { color: colors.text }]}>{client.name}</Text><Text numberOfLines={1} style={[styles.clientDetail, { color: colors.textMuted }]}>{client.phone || client.email}</Text>{client.phone && client.email ? <Text numberOfLines={1} style={[styles.clientDetail, { color: colors.textMuted }]}>{client.email}</Text> : null}</View><Ionicons name="chevron-forward" size={19} color={colors.textMuted} /></Pressable>)}</View>}
    <ClientEditor client={editor} onClose={() => setEditor(undefined)} onChanged={async () => { setEditor(undefined); await load(search); }} />
  </Screen>;
}

function ClientEditor({ client, onClose, onChanged }: { client: Client | null | undefined; onClose: () => void; onChanged: () => void }) {
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

  return (
    <CatalogEditor eyebrow={client ? "EDITAR CLIENTE" : "NOVO CLIENTE"} title={client?.name ?? "Cadastro"} visible={client !== undefined} onClose={onClose} busy={saving}>
      <FormField label="Nome" value={input.name} onChangeText={(name) => change({ name })} autoCapitalize="words" editable={!saving} />
      <FormField label="E-mail" value={input.email} onChangeText={(email) => change({ email })} autoCapitalize="none" keyboardType="email-address" editable={!saving} />
      <FormField label="Telefone" value={input.phone} onChangeText={(phone) => change({ phone })} keyboardType="phone-pad" editable={!saving} />
      <FormField label="CPF (opcional)" value={input.cpf} onChangeText={(cpf) => change({ cpf })} keyboardType="number-pad" editable={!saving} />
      <FormField label="Observacoes (opcional)" value={input.notes} onChangeText={(notes) => change({ notes })} multiline editable={!saving} />
      {formError ? <InlineError message={formError} /> : null}
      <Button loading={saving} onPress={save} label={client ? "Salvar alteracoes" : "Cadastrar cliente"} />
      {client ? <Button disabled={saving} onPress={remove} variant="destructive" icon="trash-outline" label="Excluir cliente" /> : null}
    </CatalogEditor>
  );
}

function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(""); }

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, marginBottom: 6 },
  title: { fontFamily: fonts.displayBold, fontSize: 34 },
  description: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 8 },
  searchBox: { minHeight: 52, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14 },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  resultCount: { fontFamily: fonts.bodyBold, fontSize: 12 },
  clientList: { gap: 9 },
  clientCard: { minHeight: 82, borderWidth: 1, borderRadius: 10, padding: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  clientBody: { flex: 1, gap: 3 },
  clientName: { fontFamily: fonts.bodyBold, fontSize: 15 },
  clientDetail: { fontFamily: fonts.body, fontSize: 12 },
  fab: { position: "absolute", right: 22, bottom: 18, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 7 },
});
