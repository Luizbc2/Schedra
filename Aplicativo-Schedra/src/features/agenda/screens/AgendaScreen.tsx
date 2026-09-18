import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
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

import { AppHeader } from "../../../shared/components/AppHeader";
import { Screen } from "../../../shared/components/Screen";
import { useAppTheme } from "../../../theme/ThemeProvider";
import { fonts, type AppColors } from "../../../theme/tokens";
import { useAuth } from "../../auth/AuthProvider";
import {
  agendaApi,
  type Appointment,
  type EntityOption,
  type PersonalEvent,
} from "../api/agenda-api";
import {
  PersonalMonthCalendar,
  toLocalDayKey,
} from "../components/PersonalMonthCalendar";
import { ApiError } from "../../../shared/api/client";
import { agendaStyles } from "./agenda-screen.styles";
import { AgendaDateTimeField } from "../components/AgendaDateTimeField";
import {
  appointmentInput,
  personalEventInput,
  personalEventIsHistory,
} from "../domain/agenda-editor";

type AgendaItem = {
  at: string;
  detail: string;
  endsAt: string;
  id: number;
  raw: Appointment | PersonalEvent;
  status: string;
  title: string;
};

type PersonalSection = "history" | "upcoming";

const addHour = (date: Date) => new Date(date.getTime() + 60 * 60 * 1000);
const formatPersonalDate = (value: string) => {
  const date = new Date(value);
  const dayAndMonth = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  const weekday = date
    .toLocaleDateString("pt-BR", { weekday: "long" })
    .replace("-feira", "");

  return `${dayAndMonth} ${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`;
};

const sortByStartAscending = (left: AgendaItem, right: AgendaItem) =>
  new Date(left.at).getTime() - new Date(right.at).getTime();
const sortByStartDescending = (left: AgendaItem, right: AgendaItem) =>
  new Date(right.at).getTime() - new Date(left.at).getTime();

function isPersonalHistory(item: AgendaItem, now: number) {
  const event = item.raw as PersonalEvent;
  return personalEventIsHistory(event, now);
}

function getPersonalStatus(
  item: AgendaItem,
  section: PersonalSection,
  now: number,
) {
  const event = item.raw as PersonalEvent;
  if (event.completed) return "Concluído";
  if (section === "history") return "Encerrado";

  const startsAt = new Date(item.at).getTime();
  const endsAt = new Date(item.endsAt).getTime();
  if (startsAt <= now && endsAt >= now) return "Em andamento";

  return "Programado";
}

function formatSelectedDay(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const label = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function AgendaScreen() {
  const { colors } = useAppTheme();
  const { token, user, workspaceMode } = useAuth();
  const personal = workspaceMode === "personal";
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AgendaItem | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [personalSection, setPersonalSection] =
    useState<PersonalSection>("upcoming");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setLoadError("");
    try {
      if (personal) {
        const response = await agendaApi.listPersonal(token);
        if (version !== loadVersion.current) return;
        setItems(
          response.items
            .map((event) => ({
              id: event.id,
              title: event.title,
              detail: event.location || event.notes || "Compromisso pessoal",
              at: event.startsAt,
              endsAt: event.endsAt,
              status: event.completed ? "Concluído" : "Programado",
              raw: event,
            }))
            .sort(sortByStartAscending),
        );
      } else {
        const response = await agendaApi.listAppointments(token);
        if (version !== loadVersion.current) return;
        setItems(
          response.data
            .map((appointment) => ({
              id: appointment.id,
              title: appointment.clientName,
              detail: `${appointment.serviceName} · ${appointment.professionalName}`,
              at: appointment.scheduledAt,
              endsAt: appointment.endsAt,
              status: appointment.status,
              raw: appointment,
            }))
            .sort(sortByStartAscending),
        );
      }
      setNow(new Date());
    } catch (error) {
      if (version !== loadVersion.current) return;
      setItems([]);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a agenda.",
      );
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [personal, token]);

  useEffect(() => {
    void load();
    return () => {
      loadVersion.current += 1;
    };
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    setPersonalSection("upcoming");
    setSelectedDay(null);
    setEditorOpen(false);
    setEditing(null);
  }, [personal]);

  const personalItems = useMemo(() => {
    const nowTime = now.getTime();
    const upcoming = items
      .filter((item) => !isPersonalHistory(item, nowTime))
      .sort(sortByStartAscending);
    const history = items
      .filter((item) => isPersonalHistory(item, nowTime))
      .sort(sortByStartDescending);

    return { history, upcoming };
  }, [items, now]);

  const visibleItems = useMemo(() => {
    const source = personal ? personalItems[personalSection] : items;
    if (!personal || !selectedDay) return source;

    return source.filter(
      (item) => toLocalDayKey(new Date(item.at)) === selectedDay,
    );
  }, [items, personal, personalItems, personalSection, selectedDay]);

  const todayKey = toLocalDayKey(now);
  const todayCount = items.filter(
    (item) => toLocalDayKey(new Date(item.at)) === todayKey,
  ).length;
  const nextCount = personal ? personalItems.upcoming.length : items.length;
  const listTitle = personal
    ? personalSection === "upcoming"
      ? "Próximos horários"
      : "Histórico"
    : "Próximos horários";
  const emptyMessage = personal
    ? personalSection === "upcoming"
      ? selectedDay
        ? "Nenhum compromisso futuro nesta data."
        : "Sua agenda futura está livre."
      : selectedDay
        ? "Nenhum compromisso encerrado nesta data."
        : "Seu histórico ainda está vazio."
    : "Nenhum compromisso por aqui.";

  const openEditor = (item: AgendaItem | null = null) => {
    setEditing(item);
    setEditorOpen(true);
  };

  const selectCalendarDay = (dayKey: string) => {
    setSelectedDay(dayKey);
    setPersonalSection(dayKey < todayKey ? "history" : "upcoming");
  };

  return (
    <Screen
      header={
        <AppHeader
          eyebrow={personal ? "AGENDA PESSOAL" : "GESTÃO DIÁRIA"}
          title={`Olá, ${user.name.split(" ")[0]}`}
        />
      }
      floatingAction={
        <Pressable
          accessibilityLabel={
            personal ? "Novo compromisso" : "Novo agendamento"
          }
          onPress={() => openEditor()}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.accent },
            pressed && agendaStyles.fabPressed,
          ]}
        >
          <Ionicons name="add" color="#FFF" size={28} />
        </Pressable>
      }
    >
      <View>
        <Text style={[styles.kicker, { color: colors.accent }]}>
          {personal ? "MINHA ROTINA" : "VISÃO DO DIA"}
        </Text>
        <Text style={[styles.pageTitle, { color: colors.text }]}>
          {personal ? "Seus compromissos" : "Agenda da equipe"}
        </Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          {personal
            ? "Organize trabalho, saúde e vida pessoal em um só lugar."
            : "Atendimentos e horários da operação em tempo real."}
        </Text>
      </View>

      <View style={styles.metrics}>
        <Metric
          label="HOJE"
          value={String(todayCount).padStart(2, "0")}
          color={colors.accent}
        />
        <Metric
          label="PRÓXIMOS"
          value={String(nextCount).padStart(2, "0")}
          color={colors.amber}
        />
      </View>

      {personal ? (
        <PersonalMonthCalendar
          colors={colors}
          events={items}
          onClearSelection={() => setSelectedDay(null)}
          onSelectDay={selectCalendarDay}
          selectedDay={selectedDay}
        />
      ) : null}

      <View
        style={[
          styles.list,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {personal ? (
          <View
            style={[
              agendaStyles.segmentedControl,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
              },
            ]}
          >
            {(["upcoming", "history"] as const).map((section) => {
              const selected = personalSection === section;
              const count = personalItems[section].length;

              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={section}
                  onPress={() => setPersonalSection(section)}
                  style={({ pressed }) => [
                    agendaStyles.segment,
                    selected && {
                      backgroundColor: colors.accentSoft,
                      borderColor: colors.accent,
                    },
                    pressed && agendaStyles.segmentPressed,
                  ]}
                >
                  <Text
                    style={[
                      agendaStyles.segmentText,
                      { color: selected ? colors.accent : colors.textMuted },
                    ]}
                  >
                    {section === "upcoming" ? "Próximos" : "Histórico"}
                  </Text>
                  <View
                    style={[
                      agendaStyles.segmentCount,
                      {
                        backgroundColor: selected
                          ? colors.accent
                          : colors.border,
                      },
                    ]}
                  >
                    <Text style={agendaStyles.segmentCountText}>{count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.listHeader}>
          <View style={agendaStyles.listHeading}>
            <Text style={[styles.listTitle, { color: colors.text }]}>
              {listTitle}
            </Text>
            {selectedDay ? (
              <Text
                style={[agendaStyles.dateFilter, { color: colors.textMuted }]}
              >
                {formatSelectedDay(selectedDay)}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel="Recarregar"
            onPress={load}
            style={({ pressed }) => [
              agendaStyles.refreshButton,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
              },
              pressed && agendaStyles.segmentPressed,
            ]}
          >
            <Ionicons name="refresh" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.accent} />
        ) : visibleItems.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name={
                personalSection === "history"
                  ? "archive-outline"
                  : "calendar-outline"
              }
              size={28}
              color={colors.textMuted}
            />
            <Text
              style={[
                styles.emptyText,
                { color: loadError ? colors.danger : colors.textMuted },
              ]}
            >
              {loadError || emptyMessage}
            </Text>
          </View>
        ) : (
          visibleItems.map((item, index) => {
            const historical = personal && personalSection === "history";
            const status = personal
              ? getPersonalStatus(item, personalSection, now.getTime())
              : item.status;
            const statusColor = historical ? colors.textMuted : colors.accent;

            return (
              <Pressable
                key={item.id}
                onPress={() => openEditor(item)}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && {
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                  },
                  pressed && agendaStyles.rowPressed,
                ]}
              >
                <View style={[styles.when, personal && styles.personalWhen]}>
                  {personal ? (
                    <Text
                      numberOfLines={1}
                      style={[styles.personalDate, { color: colors.text }]}
                    >
                      {formatPersonalDate(item.at)}
                    </Text>
                  ) : null}
                  <Text style={[styles.time, { color: colors.textMuted }]}>
                    {new Date(item.at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <View
                  style={[
                    styles.accent,
                    {
                      backgroundColor: historical
                        ? colors.border
                        : colors.accent,
                    },
                  ]}
                />
                <View style={styles.rowBody}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.itemDetail, { color: colors.textMuted }]}
                  >
                    {item.detail}
                  </Text>
                  <Text style={[styles.status, { color: statusColor }]}>
                    {status}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            );
          })
        )}
      </View>

      <AgendaEditor
        visible={editorOpen}
        item={editing}
        personal={personal}
        onClose={() => setEditorOpen(false)}
        onSaved={async () => {
          setEditorOpen(false);
          await load();
        }}
      />
    </Screen>
  );

  function Metric({
    label,
    value,
    color,
  }: {
    label: string;
    value: string;
    color: string;
  }) {
    return (
      <View
        style={[
          styles.metric,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderLeftColor: color,
          },
        ]}
      >
        <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
        <Text style={[styles.metricValue, { color: colors.text }]}>
          {value}
        </Text>
      </View>
    );
  }
}

function AgendaEditor({
  visible,
  item,
  personal,
  onClose,
  onSaved,
}: {
  visible: boolean;
  item: AgendaItem | null;
  personal: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const initialDate = useMemo(
    () => (item ? new Date(item.at) : addHour(new Date())),
    [item, visible],
  );
  const [date, setDate] = useState(initialDate);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [options, setOptions] = useState<{
    clients: EntityOption[];
    professionals: EntityOption[];
    services: EntityOption[];
  }>({ clients: [], professionals: [], services: [] });
  const [selected, setSelected] = useState({
    clientId: 0,
    professionalId: 0,
    serviceId: 0,
  });
  const [saving, setSaving] = useState(false);
  const [optionsError, setOptionsError] = useState("");

  useEffect(() => {
    let active = true;
    setOptionsError("");
    setDate(initialDate);
    if (personal && item) {
      const event = item.raw as PersonalEvent;
      setTitle(event.title);
      setLocation(event.location);
      setNotes(event.notes);
    } else if (!personal && item) {
      const appointment = item.raw as Appointment;
      setSelected({
        clientId: appointment.clientId,
        professionalId: appointment.professionalId,
        serviceId: appointment.serviceId,
      });
      setNotes(appointment.notes);
    } else {
      setTitle("");
      setLocation("");
      setNotes("");
      setSelected({ clientId: 0, professionalId: 0, serviceId: 0 });
    }
    if (visible && !personal)
      void agendaApi
        .listOptions(token)
        .then((value) => {
          if (active) setOptions(value);
        })
        .catch((error: unknown) => {
          if (active)
            setOptionsError(
              error instanceof Error
                ? error.message
                : "Não foi possível carregar os cadastros.",
            );
        });
    return () => {
      active = false;
    };
  }, [initialDate, item, personal, token, visible]);

  const save = async () => {
    setSaving(true);
    try {
      if (personal) {
        await agendaApi.savePersonal(
          token,
          personalEventInput(
            { title, location, notes, date },
            item?.raw as PersonalEvent | undefined,
          ),
          item?.id,
        );
      } else {
        await agendaApi.saveAppointment(
          token,
          appointmentInput(
            { ...selected, date, notes },
            item?.raw as Appointment | undefined,
          ),
          item?.id,
        );
      }
      onSaved();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Não foi possível salvar o compromisso.";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Não foi possível salvar", message);
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!item) return;
    const execute = async () => {
      setSaving(true);
      try {
        if (personal) await agendaApi.deletePersonal(token, item.id);
        else await agendaApi.deleteAppointment(token, item.id);
        onSaved();
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Não foi possível excluir o compromisso.";
        if (Platform.OS === "web") window.alert(message);
        else Alert.alert("Não foi possível excluir", message);
      } finally {
        setSaving(false);
      }
    };
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Excluir compromisso?\n\nEsta acao nao pode ser desfeita.",
        )
      )
        void execute();
      return;
    }
    Alert.alert("Excluir compromisso?", "Esta acao nao pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => void execute() },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.modal, { backgroundColor: colors.background }]}
      >
        <View style={styles.modalHeader}>
          <View>
            <Text style={[styles.modalEyebrow, { color: colors.accent }]}>
              {item ? "EDITAR" : "NOVO"}
            </Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {personal ? "Compromisso" : "Agendamento"}
            </Text>
          </View>
          <Pressable accessibilityLabel="Fechar" onPress={onClose}>
            <Ionicons name="close" size={25} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.form}
        >
          {optionsError ? (
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {optionsError}
            </Text>
          ) : null}
          {personal ? (
            <>
              <AgendaField
                colors={colors}
                label="Título"
                value={title}
                onChangeText={setTitle}
              />
              <AgendaField
                colors={colors}
                label="Local"
                value={location}
                onChangeText={setLocation}
              />
            </>
          ) : (
            <>
              {(["clients", "professionals", "services"] as const).map(
                (group) => (
                  <AgendaOptionSelector
                    colors={colors}
                    key={group}
                    title={
                      group === "clients"
                        ? "Cliente"
                        : group === "professionals"
                          ? "Profissional"
                          : "Serviço"
                    }
                    options={options[group]}
                    value={
                      selected[
                        group === "clients"
                          ? "clientId"
                          : group === "professionals"
                            ? "professionalId"
                            : "serviceId"
                      ]
                    }
                    onChange={(value) =>
                      setSelected((current) => ({
                        ...current,
                        [group === "clients"
                          ? "clientId"
                          : group === "professionals"
                            ? "professionalId"
                            : "serviceId"]: value,
                      }))
                    }
                  />
                ),
              )}
            </>
          )}
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            Data e horário
          </Text>
          <AgendaDateTimeField
            value={date}
            onChange={setDate}
            colors={colors}
          />
          <AgendaField
            colors={colors}
            label="Observações"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <Pressable
            disabled={saving}
            onPress={save}
            style={[
              styles.saveButton,
              { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveText}>Salvar compromisso</Text>
            )}
          </Pressable>
          {item ? (
            <Pressable
              disabled={saving}
              onPress={remove}
              style={[styles.deleteButton, { borderColor: colors.danger }]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={[styles.deleteText, { color: colors.danger }]}>
                Excluir compromisso
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function AgendaField({
  colors,
  label,
  ...props
}: { colors: AppColors; label: string } & React.ComponentProps<
  typeof TextInput
>) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        {...props}
      />
    </View>
  );
}

function AgendaOptionSelector({
  colors,
  title,
  options,
  value,
  onChange,
}: {
  colors: AppColors;
  title: string;
  options: EntityOption[];
  value: number;
  onChange: (id: number) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {options.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[
              styles.chip,
              {
                borderColor:
                  value === option.id ? colors.accent : colors.border,
                backgroundColor:
                  value === option.id ? colors.accentSoft : colors.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: value === option.id ? colors.accent : colors.text },
              ]}
            >
              {option.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, marginBottom: 6 },
  pageTitle: { fontFamily: fonts.displayBold, fontSize: 34 },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  metrics: { flexDirection: "row", gap: 10 },
  metric: {
    flex: 1,
    minHeight: 92,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  metricLabel: { fontFamily: fonts.bodyBold, fontSize: 10 },
  metricValue: { fontFamily: fonts.displayBold, fontSize: 31, marginTop: 7 },
  list: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
  },
  listTitle: { fontFamily: fonts.display, fontSize: 23 },
  loader: { margin: 36 },
  empty: { alignItems: "center", gap: 10, padding: 34 },
  emptyText: { fontFamily: fonts.body, fontSize: 13 },
  row: {
    minHeight: 98,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  when: { width: 52, gap: 3 },
  personalWhen: { width: 88 },
  personalDate: { fontFamily: fonts.bodyBold, fontSize: 11 },
  time: { fontFamily: fonts.bodyBold, fontSize: 12 },
  accent: { width: 2, alignSelf: "stretch", marginRight: 13 },
  rowBody: { flex: 1, gap: 4 },
  itemTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  itemDetail: { fontFamily: fonts.body, fontSize: 12 },
  status: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    textTransform: "capitalize",
  },
  fab: {
    position: "absolute",
    right: 22,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 7,
  },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 22,
  },
  modalEyebrow: { fontFamily: fonts.bodyBold, fontSize: 10 },
  modalTitle: { fontFamily: fonts.displayBold, fontSize: 32 },
  form: { gap: 19, paddingHorizontal: 22, paddingBottom: 40 },
  field: { gap: 7 },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 13 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  chips: { gap: 8 },
  chip: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  saveButton: {
    minHeight: 54,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  saveText: { color: "#FFF", fontFamily: fonts.bodyBold, fontSize: 15 },
  deleteButton: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  deleteText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
