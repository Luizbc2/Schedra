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
import { servicesApi, type Service, type ServiceInput } from "../api/services-api";
import { CatalogEditor } from "../components/CatalogEditor";

type ServiceForm = { name: string; category: string; durationMinutes: string; price: string; description: string };

const emptyService: ServiceForm = { name: "", category: "", durationMinutes: "", price: "", description: "" };
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ServicesScreen() {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const { items: services, search, setSearch, loading, error, localResult, load } = useCatalogList(servicesApi.list, token);
  const [editor, setEditor] = useState<Service | null | undefined>(undefined);

  const emptyTitle = search ? "Nenhum resultado" : "Seu catálogo está vazio";
  const emptyDetail = search ? "Tente buscar com outro termo." : "Cadastre o primeiro serviço para começar.";

  return (
    <Screen
      header={<AppHeader eyebrow="OPERAÇÃO" title="Serviços" />}
      floatingAction={<IconButton accessibilityLabel="Novo serviço" icon="add" variant="primary" size="large" onPress={() => setEditor(null)} style={styles.fab} />}
    >
      <View>
        <Text style={[styles.kicker, { color: colors.accent }]}>CATÁLOGO</Text>
        <Text style={[styles.title, { color: colors.text }]}>O que você oferece</Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>Defina duração, preço e detalhes para agilizar cada agendamento.</Text>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput accessibilityLabel="Buscar serviços" autoCapitalize="words" onChangeText={setSearch} placeholder="Buscar por nome ou categoria" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} value={search} />
        {search ? <IconButton accessibilityLabel="Limpar busca" icon="close-circle" variant="ghost" onPress={() => setSearch("")} /> : null}
      </View>

      <LocalDataHint result={localResult} />
      <View style={styles.resultHeader}>
        <Text style={[styles.resultCount, { color: colors.textMuted }]}>{services.length} {services.length === 1 ? "serviço" : "serviços"}</Text>
        <IconButton accessibilityLabel="Recarregar serviços" icon="refresh" variant="ghost" loading={loading} onPress={() => void load(search)} />
      </View>

      {loading ? <FeedbackState kind="loading" title="Carregando serviços" /> : error || services.length === 0 ? (
        <FeedbackState kind={error ? "error" : "empty"} icon={error ? "cloud-offline-outline" : "cut-outline"}
          title={error ? "Falha ao carregar" : emptyTitle} detail={error || emptyDetail}
          action={{ label: error ? "Tentar novamente" : search ? "Limpar busca" : "Cadastrar serviço", onPress: () => error ? void load(search) : search ? setSearch("") : setEditor(null) }} />
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
    <CatalogEditor eyebrow={service ? "EDITAR SERVIÇO" : "NOVO SERVIÇO"} onClose={onClose} title={service?.name ?? "Cadastro"} visible={service !== undefined} busy={saving}>
      <FormField label="Nome" value={input.name} onChangeText={(name) => change({ name })} autoCapitalize="words" editable={!saving} />
      <FormField label="Categoria" value={input.category} onChangeText={(category) => change({ category })} autoCapitalize="words" editable={!saving} />
      <View style={styles.doubleField}>
        <FormField containerStyle={styles.flexField} label="Duração (min)" value={input.durationMinutes} onChangeText={(durationMinutes) => change({ durationMinutes: durationMinutes.replace(/\D/g, "") })} keyboardType="number-pad" editable={!saving} />
        <FormField containerStyle={styles.flexField} label="Preço (R$)" value={input.price} onChangeText={(price) => change({ price: sanitizePrice(price) })} keyboardType="decimal-pad" editable={!saving} />
      </View>
      <FormField label="Descrição (opcional)" value={input.description} onChangeText={(description) => change({ description })} multiline editable={!saving} />

      {formError ? <InlineError message={formError} /> : null}
      <Button loading={saving} onPress={save} label={service ? "Salvar alterações" : "Cadastrar serviço"} />
      {service ? <Button disabled={saving} onPress={remove} variant="destructive" icon="trash-outline" label="Excluir serviço" /> : null}
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
  list: { gap: 9 },
  card: { minHeight: 96, borderWidth: 1, borderRadius: 10, padding: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  serviceIcon: { width: 46, height: 46, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, minWidth: 0, gap: 3 },
  cardName: { fontFamily: fonts.bodyBold, fontSize: 15 },
  category: { fontFamily: fonts.body, fontSize: 12 },
  metaLine: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 },
  metaChip: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: fonts.bodyMedium, fontSize: 10 },
  fab: { position: "absolute", right: 22, bottom: 18, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 7 },
  doubleField: { flexDirection: "row", gap: 10 },
  flexField: { flex: 1, minWidth: 0 },
});
