import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ApiError } from "../../../shared/api/client";
import { AppHeader } from "../../../shared/components/AppHeader";
import { Screen } from "../../../shared/components/Screen";
import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts } from "../../../theme/tokens";
import { useAuth } from "../../auth/AuthProvider";
import { servicesApi, type Service, type ServiceInput } from "../api/services-api";
import { CatalogEditor, CatalogEditorField } from "../components/CatalogEditor";

type ServiceForm = { name: string; category: string; durationMinutes: string; price: string; description: string };

const emptyService: ServiceForm = { name: "", category: "", durationMinutes: "", price: "", description: "" };
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ServicesScreen() {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Service | null | undefined>(undefined);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError("");
    try {
      setServices((await servicesApi.list(token, query)).data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar os serviços.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(search), 350);
    return () => clearTimeout(timeout);
  }, [load, search]);

  const emptyTitle = search ? "Nenhum resultado" : "Seu catálogo está vazio";
  const emptyDetail = search ? "Tente buscar com outro termo." : "Cadastre o primeiro serviço para começar.";

  return (
    <Screen
      header={<AppHeader eyebrow="OPERAÇÃO" title="Serviços" />}
      floatingAction={<Pressable accessibilityLabel="Novo serviço" onPress={() => setEditor(null)} style={[styles.fab, { backgroundColor: colors.accent }]}><Ionicons name="add" color="#FFF" size={28} /></Pressable>}
    >
      <View>
        <Text style={[styles.kicker, { color: colors.accent }]}>CATÁLOGO</Text>
        <Text style={[styles.title, { color: colors.text }]}>O que você oferece</Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>Defina duração, preço e detalhes para agilizar cada agendamento.</Text>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput accessibilityLabel="Buscar serviços" autoCapitalize="words" onChangeText={setSearch} placeholder="Buscar por nome ou categoria" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} value={search} />
        {search ? <Pressable accessibilityLabel="Limpar busca" onPress={() => setSearch("")}><Ionicons name="close-circle" size={19} color={colors.textMuted} /></Pressable> : null}
      </View>

      <View style={styles.resultHeader}>
        <Text style={[styles.resultCount, { color: colors.textMuted }]}>{services.length} {services.length === 1 ? "serviço" : "serviços"}</Text>
        <Pressable accessibilityLabel="Recarregar serviços" onPress={() => void load(search)}><Ionicons name="refresh" size={20} color={colors.textMuted} /></Pressable>
      </View>

      {loading ? <ActivityIndicator style={styles.loader} color={colors.accent} /> : error || services.length === 0 ? (
        <View style={[styles.feedback, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name={error ? "cloud-offline-outline" : "cut-outline"} size={30} color={colors.textMuted} />
          <Text style={[styles.feedbackTitle, { color: colors.text }]}>{error ? "Falha ao carregar" : emptyTitle}</Text>
          <Text style={[styles.feedbackDetail, { color: colors.textMuted }]}>{error || emptyDetail}</Text>
          <Pressable onPress={() => error ? void load(search) : search ? setSearch("") : setEditor(null)} style={[styles.secondaryButton, { borderColor: colors.accent }]}>
            <Text style={[styles.secondaryText, { color: colors.accent }]}>{error ? "Tentar novamente" : search ? "Limpar busca" : "Cadastrar serviço"}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.list}>
          {services.map((service) => (
            <Pressable key={service.id} accessibilityLabel={`Editar ${service.name}`} onPress={() => setEditor(service)} style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.72 : 1 }]}>
              <View style={[styles.serviceIcon, { backgroundColor: colors.accentSoft }]}><Ionicons name="cut-outline" size={21} color={colors.accent} /></View>
              <View style={styles.cardBody}>
                <Text numberOfLines={1} style={[styles.cardName, { color: colors.text }]}>{service.name}</Text>
                <Text numberOfLines={1} style={[styles.category, { color: colors.textMuted }]}>{service.category}</Text>
                <View style={styles.metaLine}>
                  <View style={[styles.metaChip, { backgroundColor: colors.surfaceRaised }]}><Ionicons name="time-outline" size={13} color={colors.teal} /><Text style={[styles.metaText, { color: colors.text }]}>{service.durationMinutes} min</Text></View>
                  <View style={[styles.metaChip, { backgroundColor: colors.surfaceRaised }]}><Ionicons name="cash-outline" size={13} color={colors.success} /><Text style={[styles.metaText, { color: colors.text }]}>{currency.format(Number(service.price))}</Text></View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      <ServiceEditor service={editor} onClose={() => setEditor(undefined)} onChanged={async () => { setEditor(undefined); await load(search); }} />
    </Screen>
  );
}

function ServiceEditor({ service, onClose, onChanged }: { service: Service | null | undefined; onClose: () => void; onChanged: () => void }) {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const [input, setInput] = useState<ServiceForm>(emptyService);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setInput(service ? {
      name: service.name,
      category: service.category,
      durationMinutes: String(service.durationMinutes),
      price: Number(service.price).toFixed(2).replace(".", ","),
      description: service.description,
    } : emptyService);
    setFormError("");
  }, [service]);

  const change = (next: Partial<ServiceForm>) => {
    setInput((current) => ({ ...current, ...next }));
    if (formError) setFormError("");
  };

  const save = async () => {
    const validation = validateService(input);
    if (validation) return setFormError(validation);
    const payload = toServiceInput(input);
    setSaving(true);
    setFormError("");
    try {
      if (service) await servicesApi.update(token, service.id, payload);
      else await servicesApi.create(token, payload);
      onChanged();
    } catch (requestError) {
      setFormError(requestError instanceof ApiError ? requestError.message : "Não foi possível salvar o serviço.");
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!service) return;
    const execute = async () => {
      setSaving(true);
      setFormError("");
      try {
        await servicesApi.remove(token, service.id);
        onChanged();
      } catch (requestError) {
        setFormError(requestError instanceof Error ? requestError.message : "Não foi possível excluir o serviço.");
      } finally {
        setSaving(false);
      }
    };
    const message = `${service.name} será removido do catálogo.`;
    if (Platform.OS === "web") {
      if (window.confirm(`Excluir serviço?\n\n${message}`)) void execute();
      return;
    }
    Alert.alert("Excluir serviço?", message, [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: () => void execute() }]);
  };

  return (
    <CatalogEditor eyebrow={service ? "EDITAR SERVIÇO" : "NOVO SERVIÇO"} onClose={onClose} title={service?.name ?? "Cadastro"} visible={service !== undefined}>
      <CatalogEditorField colors={colors} label="Nome" value={input.name} onChangeText={(name) => change({ name })} autoCapitalize="words" />
      <CatalogEditorField colors={colors} label="Categoria" value={input.category} onChangeText={(category) => change({ category })} autoCapitalize="words" />
      <View style={styles.doubleField}>
        <View style={styles.flexField}><CatalogEditorField colors={colors} label="Duração (min)" value={input.durationMinutes} onChangeText={(durationMinutes) => change({ durationMinutes: durationMinutes.replace(/\D/g, "") })} keyboardType="number-pad" /></View>
        <View style={styles.flexField}><CatalogEditorField colors={colors} label="Preço (R$)" value={input.price} onChangeText={(price) => change({ price: sanitizePrice(price) })} keyboardType="decimal-pad" /></View>
      </View>
      <CatalogEditorField colors={colors} label="Descrição (opcional)" value={input.description} onChangeText={(description) => change({ description })} multiline />

      {formError ? <View style={[styles.errorBox, { backgroundColor: colors.accentSoft }]}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={[styles.errorText, { color: colors.danger }]}>{formError}</Text></View> : null}
      <Pressable disabled={saving} onPress={() => void save()} style={[styles.saveButton, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{service ? "Salvar alterações" : "Cadastrar serviço"}</Text>}</Pressable>
      {service ? <Pressable disabled={saving} onPress={remove} style={[styles.deleteButton, { borderColor: colors.danger }]}><Ionicons name="trash-outline" size={18} color={colors.danger} /><Text style={[styles.deleteText, { color: colors.danger }]}>Excluir serviço</Text></Pressable> : null}
    </CatalogEditor>
  );
}

function sanitizePrice(value: string) {
  const normalized = value.replace(/[^\d,.]/g, "").replace(".", ",");
  const [integer = "", decimals = ""] = normalized.split(",");
  return decimals.length > 0 || normalized.includes(",") ? `${integer},${decimals.slice(0, 2)}` : integer;
}

function validateService(input: ServiceForm) {
  if (input.name.trim().length < 2) return "Informe o nome do serviço.";
  if (input.category.trim().length < 2) return "Informe a categoria do serviço.";
  const duration = Number(input.durationMinutes);
  if (!Number.isInteger(duration) || duration < 1 || duration > 1440) return "A duração deve estar entre 1 e 1440 minutos.";
  if (!input.price.trim()) return "Informe o preço do serviço.";
  const price = Number(input.price.replace(",", "."));
  if (!Number.isFinite(price) || price < 0 || price > 99999.99) return "Informe um preço válido entre R$ 0,00 e R$ 99.999,99.";
  if (input.description.trim() && input.description.trim().length < 5) return "A descrição precisa ter ao menos 5 caracteres.";
  return "";
}

function toServiceInput(input: ServiceForm): ServiceInput {
  return {
    name: input.name.trim(),
    category: input.category.trim(),
    durationMinutes: Number(input.durationMinutes),
    price: Number(Number(input.price.replace(",", ".")).toFixed(2)),
    description: input.description.trim(),
  };
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
  card: { minHeight: 96, borderWidth: 1, borderRadius: 10, padding: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  serviceIcon: { width: 46, height: 46, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, minWidth: 0, gap: 3 },
  cardName: { fontFamily: fonts.bodyBold, fontSize: 15 },
  category: { fontFamily: fonts.body, fontSize: 12 },
  metaLine: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 },
  metaChip: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: fonts.bodyMedium, fontSize: 10 },
  feedback: { alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 28, gap: 8 },
  feedbackTitle: { fontFamily: fonts.display, fontSize: 22, marginTop: 3 },
  feedbackDetail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, textAlign: "center" },
  secondaryButton: { minHeight: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", marginTop: 7 },
  secondaryText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  fab: { position: "absolute", right: 22, bottom: 18, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 7 },
  doubleField: { flexDirection: "row", gap: 10 },
  flexField: { flex: 1, minWidth: 0 },
  errorBox: { borderRadius: 8, padding: 11, flexDirection: "row", alignItems: "center", gap: 8 },
  errorText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 17 },
  saveButton: { minHeight: 52, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#FFF", fontFamily: fonts.bodyBold, fontSize: 15 },
  deleteButton: { minHeight: 48, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  deleteText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
