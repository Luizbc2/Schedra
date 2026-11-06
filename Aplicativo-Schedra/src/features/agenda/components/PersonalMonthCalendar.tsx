import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { fonts, type AppColors } from "../../../theme/tokens";

type CalendarEvent = {
  at: string;
};

type PersonalMonthCalendarProps = {
  colors: AppColors;
  events: CalendarEvent[];
  onClearSelection: () => void;
  onSelectDay: (dayKey: string) => void;
  selectedDay: string | null;
};

type CalendarDay = {
  date: Date;
  key: string;
  outsideMonth: boolean;
};

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function toLocalDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildMonthDays(month: Date): CalendarDay[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstVisibleDay = new Date(year, monthIndex, 1 - new Date(year, monthIndex, 1).getDay());
  const lastMonthDay = new Date(year, monthIndex + 1, 0);
  const visibleDayCount = Math.ceil((new Date(year, monthIndex, 1).getDay() + lastMonthDay.getDate()) / 7) * 7;

  return Array.from({ length: visibleDayCount }, (_, index) => {
    const date = new Date(firstVisibleDay.getFullYear(), firstVisibleDay.getMonth(), firstVisibleDay.getDate() + index);

    return {
      date,
      key: toLocalDayKey(date),
      outsideMonth: date.getMonth() !== monthIndex,
    };
  });
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function PersonalMonthCalendar({ colors, events, onClearSelection, onSelectDay, selectedDay }: PersonalMonthCalendarProps) {
  const today = new Date();
  const todayKey = toLocalDayKey(today);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const transition = useRef(new Animated.Value(1)).current;

  const days = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);
  const eventCountByDay = useMemo(() => {
    const counts = new Map<string, number>();

    events.forEach((event) => {
      const date = new Date(event.at);
      if (Number.isNaN(date.getTime())) return;
      const key = toLocalDayKey(date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return counts;
  }, [events]);
  const monthLabel = capitalize(visibleMonth.toLocaleDateString("pt-BR", { month: "long" }));
  const monthEventCount = days.reduce((total, day) => {
    if (day.outsideMonth) return total;
    return total + (eventCountByDay.get(day.key) ?? 0);
  }, 0);

  const changeMonth = (offset: number) => {
    Animated.timing(transition, {
      toValue: 0,
      duration: 90,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
      transition.setValue(0);
      Animated.timing(transition, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  const selectDay = (day: CalendarDay) => {
    if (day.outsideMonth) {
      setVisibleMonth(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
    }
    onSelectDay(day.key);
  };

  const returnToToday = () => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectDay(todayKey);
  };

  return (
    <View style={[styles.calendar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{visibleMonth.getFullYear()} · VISÃO MENSAL</Text>
          <Text numberOfLines={1} style={[styles.month, { color: colors.text }]}>{monthLabel}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Voltar para hoje"
            onPress={returnToToday}
            style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          </Pressable>
          <Pressable
            accessibilityLabel="Mês anterior"
            onPress={() => changeMonth(-1)}
            style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>
          <Pressable
            accessibilityLabel="Próximo mês"
            onPress={() => changeMonth(1)}
            style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((weekday, index) => (
          <Text key={`${weekday}-${index}`} style={[styles.weekday, { color: colors.textMuted }]}>
            {weekday}
          </Text>
        ))}
      </View>

      <Animated.View
        style={{
          opacity: transition,
          transform: [{ translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }],
        }}
      >
        {Array.from({ length: days.length / 7 }, (_, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {days.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => {
              const eventCount = eventCountByDay.get(day.key) ?? 0;
              const selected = selectedDay === day.key;
              const isToday = day.key === todayKey;

              return (
                <Pressable
                  accessibilityLabel={`${day.date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}${eventCount ? `, ${eventCount} compromisso${eventCount > 1 ? "s" : ""}` : ", sem compromissos"}`}
                  accessibilityState={{ selected }}
                  key={day.key}
                  onPress={() => selectDay(day)}
                  style={({ pressed }) => [
                    styles.day,
                    isToday && !selected && { borderColor: colors.accent, borderWidth: 1 },
                    eventCount > 0 && !selected && { backgroundColor: colors.accentSoft },
                    selected && { backgroundColor: colors.accent },
                    day.outsideMonth && styles.outsideMonth,
                    pressed && styles.dayPressed,
                  ]}
                >
                  <Text style={[styles.dayText, { color: selected ? "#FFFFFF" : colors.text }, isToday && styles.todayDayText]}>{day.date.getDate()}</Text>
                  <View style={styles.dots}>
                    {Array.from({ length: Math.min(eventCount, 3) }, (_, dotIndex) => (
                      <View key={dotIndex} style={[styles.dot, { backgroundColor: selected ? "#FFFFFF" : colors.accent }]} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            {monthEventCount} {monthEventCount === 1 ? "compromisso" : "compromissos"} neste mês
          </Text>
        </View>
        {selectedDay ? (
          <Pressable accessibilityLabel="Remover filtro de data" onPress={onClearSelection} style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
            <Text style={[styles.clearText, { color: colors.accent }]}>Ver todos</Text>
            <Ionicons name="close-circle" size={17} color={colors.accent} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingTop: 14,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    marginBottom: 3,
  },
  month: {
    fontFamily: fonts.display,
    fontSize: 20,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 7,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekday: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    paddingBottom: 6,
    textAlign: "center",
  },
  day: {
    alignItems: "center",
    aspectRatio: 1,
    borderColor: "transparent",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    margin: 1,
  },
  outsideMonth: {
    opacity: 0.32,
  },
  dayPressed: {
    transform: [{ scale: 0.92 }],
  },
  dayText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  todayDayText: {
    fontFamily: fonts.bodyBold,
  },
  dots: {
    bottom: 4,
    flexDirection: "row",
    gap: 2,
    height: 3,
    position: "absolute",
  },
  dot: {
    borderRadius: 2,
    height: 3,
    width: 3,
  },
  footer: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    minHeight: 43,
  },
  legend: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  legendDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 10,
  },
  clearButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    minHeight: 32,
  },
  clearText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
});
