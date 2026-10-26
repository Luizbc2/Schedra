import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { AppColors } from "../../../theme/tokens";
import { mergeDatePart } from "../domain/agenda-editor";

export type AgendaDateTimeProps = {
  value: Date;
  onChange: (value: Date) => void;
  colors: AppColors;
};

export function AgendaDateTimeField({
  value,
  onChange,
  colors,
}: AgendaDateTimeProps) {
  if (Platform.OS === "ios") {
    return (
      <DateTimePicker
        value={value}
        mode="datetime"
        onValueChange={(_event, date) => onChange(date)}
      />
    );
  }
  const open = (mode: "date" | "time") =>
    DateTimePickerAndroid.open({
      value,
      mode,
      is24Hour: true,
      onValueChange: (_event, date) =>
        onChange(mergeDatePart(value, date, mode)),
    });
  return (
    <View style={styles.row}>
      {(["date", "time"] as const).map((part) => (
        <Pressable
          key={part}
          accessibilityRole="button"
          accessibilityLabel={
            part === "date" ? "Escolher data" : "Escolher horário"
          }
          onPress={() => open(part)}
          style={[
            styles.button,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name={part === "date" ? "calendar-outline" : "time-outline"}
            size={20}
            color={colors.accent}
          />
          <Text style={{ color: colors.text }}>
            {part === "date"
              ? value.toLocaleDateString("pt-BR")
              : value.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  button: {
    flexGrow: 1,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
