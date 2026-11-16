import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { FeedbackState } from "../../../shared/components/ui/FeedbackState";
import { IconButton } from "../../../shared/components/ui/IconButton";
import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts } from "../../../theme/tokens";
import { agendaApi, type AgendaOptionGroup, type EntityOption } from "../api/agenda-api";

const fields = {
  clients: { label: "Cliente", icon: "person-outline", search: "Nome, e-mail ou telefone" },
  professionals: { label: "Profissional", icon: "people-outline", search: "Nome ou especialidade" },
  services: { label: "Servi\u00e7o", icon: "briefcase-outline", search: "Nome ou categoria" },
} as const;

type Props = {
  token: string;
  group: AgendaOptionGroup;
  value: EntityOption | null;
  expanded: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onSelect: (option: EntityOption) => void;
};

export function AgendaEntityPicker({ token, group, value, expanded, disabled, onToggle, onSelect }: Props) {
  const { colors } = useAppTheme();
  const { label, icon } = fields[group];
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value?.name ?? "Selecionar"}`}
        accessibilityState={{ expanded, disabled }}
        aria-expanded={expanded}
        disabled={disabled}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: colors.surface, borderColor: expanded ? colors.accent : colors.border },
          (pressed || disabled) && styles.dimmed,
        ]}
      >
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name={icon} size={17} color={colors.accent} />
        </View>
        <Text numberOfLines={2} style={[styles.value, { color: value ? colors.text : colors.textMuted }]}>
          {value?.name ?? "Selecionar"}
        </Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
      </Pressable>
      {expanded && (
        <AgendaEntityOptions
          token={token}
          group={group}
          selectedId={value?.id}
          onSelect={(option) => {
            Keyboard.dismiss();
            onSelect(option);
          }}
        />
      )}
    </View>
  );
}

function AgendaEntityOptions({ token, group, selectedId, onSelect }: {
  token: string;
  group: AgendaOptionGroup;
  selectedId?: number;
  onSelect: (option: EntityOption) => void;
}) {
  const { colors } = useAppTheme();
  const { label, search } = fields[group];
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; data: EntityOption[]; totalPages: number; error?: string }>();
  const trimmedQuery = query.trim();
  const key = JSON.stringify([token, group, trimmedQuery, page, retry]);
  const current = result?.key === key ? result : undefined;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await agendaApi.searchOptions(token, group, trimmedQuery, page, controller.signal);
        if (!controller.signal.aborted) setResult({ key, ...response });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({ key, data: [], totalPages: 1, error: error instanceof Error ? error.message : "Tente novamente." });
        }
      }
    }, trimmedQuery && page === 1 ? 250 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [group, key, page, token, trimmedQuery]);

  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  return (
    <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.search, { backgroundColor: colors.surfaceRaised, borderBottomColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          accessibilityLabel={`Buscar ${label.toLowerCase()}`}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          maxLength={120}
          onChangeText={changeQuery}
          placeholder={search}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
          value={query}
        />
        {query.length > 0 && (
          <IconButton accessibilityLabel="Limpar busca" icon="close" variant="ghost" onPress={() => changeQuery("")} />
        )}
      </View>
      {!current ? (
        <FeedbackState kind="loading" title="Buscando..." />
      ) : current.error ? (
        <FeedbackState kind="error" title="Falha ao buscar" detail={current.error} action={{ label: "Tentar novamente", onPress: () => setRetry((value) => value + 1) }} />
      ) : current.data.length === 0 ? (
        <FeedbackState kind="empty" title="Nenhum resultado" icon="search-outline" />
      ) : (
        <ScrollView
          key={page}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          style={styles.options}
        >
          {current.data.map((option, index) => {
            const selected = selectedId === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityLabel={option.detail ? `${option.name}, ${option.detail}` : option.name}
                accessibilityState={{ selected }}
                onPress={() => onSelect(option)}
                style={({ pressed }) => [
                  styles.option,
                  index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                  (selected || pressed) && { backgroundColor: colors.accentSoft },
                ]}
              >
                <View style={styles.optionText}>
                  <Text numberOfLines={2} style={[styles.optionName, { color: selected ? colors.accent : colors.text }]}>{option.name}</Text>
                  {!!option.detail && <Text numberOfLines={1} style={[styles.detail, { color: colors.textMuted }]}>{option.detail}</Text>}
                </View>
                {selected && <Ionicons name="checkmark" size={19} color={colors.accent} />}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {current && !current.error && (current.totalPages > 1 || page > 1) && (
        <View style={[styles.pages, { borderTopColor: colors.border }]}>
          <IconButton accessibilityLabel={"P\u00e1gina anterior"} icon="chevron-back" variant="ghost" disabled={page <= 1} onPress={() => setPage(page - 1)} />
          <Text style={[styles.detail, { color: colors.textMuted }]}>{page} / {Math.max(page, current.totalPages)}</Text>
          <IconButton accessibilityLabel={"Pr\u00f3xima p\u00e1gina"} icon="chevron-forward" variant="ghost" disabled={page >= current.totalPages} onPress={() => setPage(page + 1)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13 },
  trigger: {
    flexDirection: "row", alignItems: "center", minHeight: 52, paddingHorizontal: 11, paddingVertical: 7,
    borderWidth: 1, borderRadius: 8, gap: 10,
  },
  dimmed: { opacity: 0.7 },
  icon: { width: 32, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  value: { flex: 1, minWidth: 0, fontFamily: fonts.bodyMedium, fontSize: 14 },
  dropdown: { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  search: { minHeight: 48, flexDirection: "row", alignItems: "center", paddingHorizontal: 11, gap: 9, borderBottomWidth: 1 },
  input: { flex: 1, minWidth: 0, minHeight: 44, fontFamily: fonts.body, fontSize: 14, paddingVertical: 8 },
  options: { maxHeight: 216 },
  option: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  optionText: { flex: 1, minWidth: 0, gap: 3 },
  optionName: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  detail: { fontFamily: fonts.body, fontSize: 11 },
  pages: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, paddingHorizontal: 6 },
});
