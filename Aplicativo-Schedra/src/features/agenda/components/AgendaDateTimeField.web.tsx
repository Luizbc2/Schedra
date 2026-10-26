import { createElement } from "react";
import type { AgendaDateTimeProps } from "./AgendaDateTimeField";

export function AgendaDateTimeField({
  value,
  onChange,
  colors,
}: AgendaDateTimeProps) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
  return createElement("input", {
    type: "datetime-local",
    "aria-label": "Data e horário",
    value: local,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const date = new Date(event.target.value);
      if (Number.isFinite(date.getTime())) onChange(date);
    },
    style: {
      boxSizing: "border-box",
      width: "100%",
      minWidth: 0,
      minHeight: 48,
      padding: 12,
      borderRadius: 8,
      border: `1px solid ${colors.border}`,
      background: colors.surface,
      color: colors.text,
      font: "inherit",
    },
  });
}
