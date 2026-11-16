import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconButton } from "../../../shared/components/ui/IconButton";
import { fonts, type AppColors } from "../../../theme/tokens";
import { agendaWeek, dateFromDayKey, shiftDayKey } from "../domain/agenda-days";

type Props = {
  colors: AppColors;
  today: string;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  countForDay: (day: string) => number | undefined;
};

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "S\u00e1b"];
const shortDate = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`;

export function AppointmentDayPicker({ colors, today, selectedDay, onSelectDay, countForDay }: Props) {
  const days = agendaWeek(today, selectedDay);
  const month = dateFromDayKey(selectedDay).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <View style={styles.picker}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: colors.text }]}>Agenda por dia</Text>
          <Text style={[styles.month, { color: colors.textMuted }]}>
            {month[0].toUpperCase() + month.slice(1)}
          </Text>
        </View>
        <IconButton icon="today-outline" accessibilityLabel="Voltar para hoje" onPress={() => onSelectDay(today)} />
        <IconButton icon="chevron-back" accessibilityLabel="Semana anterior" onPress={() => onSelectDay(shiftDayKey(selectedDay, -7))} />
        <IconButton icon="chevron-forward" accessibilityLabel={"Pr\u00f3xima semana"} onPress={() => onSelectDay(shiftDayKey(selectedDay, 7))} />
      </View>
      <View accessibilityRole="tablist" style={styles.days}>
        {days.map((day) => {
          const isToday = day === today;
          const selected = day === selectedDay;
          const count = countForDay(day);
          const date = shortDate(day);
          const countLabel = count === undefined ? "contagem indispon\u00edvel" : `${count} ${count === 1 ? "atendimento" : "atendimentos"}`;
          return (
            <Pressable
              key={day}
              accessibilityRole="tab"
              accessibilityLabel={`${isToday ? "Hoje, " : ""}${date}, ${countLabel}`}
              accessibilityState={{ selected }}
              aria-selected={selected}
              onPress={() => onSelectDay(day)}
              style={({ pressed }) => [
                styles.day,
                {
                  backgroundColor: selected ? colors.accentSoft : colors.surface,
                  borderColor: selected ? colors.accent : colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text maxFontSizeMultiplier={1.15} style={[styles.weekday, { color: selected || isToday ? colors.accent : colors.textMuted }]}>
                {isToday ? "Hoje" : weekdays[dateFromDayKey(day).getDay()]}
              </Text>
              <Text maxFontSizeMultiplier={1.15} style={[styles.date, { color: colors.text }]}>{date}</Text>
              <View style={[styles.badge, { backgroundColor: selected ? colors.accentSoft : colors.surfaceRaised }]}>
                <Text maxFontSizeMultiplier={1.15} style={[styles.count, { color: count ? colors.accent : colors.textMuted }]}>
                  {count === undefined ? "-" : count > 99 ? "99+" : count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  heading: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: fonts.bodyBold, fontSize: 14 },
  month: { fontFamily: fonts.body, fontSize: 11 },
  days: { flexDirection: "row", gap: 4 },
  day: {
    flex: 1,
    minWidth: 0,
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 2,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  pressed: { opacity: 0.72 },
  weekday: { fontFamily: fonts.bodyMedium, fontSize: 10 },
  date: { fontFamily: fonts.bodyBold, fontSize: 11 },
  badge: { minWidth: 19, minHeight: 18, paddingHorizontal: 2, borderRadius: 5, alignItems: "center", justifyContent: "center" },
  count: { fontFamily: fonts.bodyBold, fontSize: 10, fontVariant: ["tabular-nums"] },
});
