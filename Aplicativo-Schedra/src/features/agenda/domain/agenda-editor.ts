import type { Appointment, PersonalEvent } from "../api/agenda-api";

type PersonalFields = {
  title: string;
  location: string;
  notes: string;
  date: Date;
};
type AppointmentFields = {
  clientId: number;
  professionalId: number;
  serviceId: number;
  notes: string;
  date: Date;
};

export function personalEventInput(
  fields: PersonalFields,
  original?: PersonalEvent,
) {
  const duration = original
    ? Date.parse(original.endsAt) - Date.parse(original.startsAt)
    : 60 * 60 * 1000;
  if (
    !Number.isFinite(fields.date.getTime()) ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    throw new Error("Informe uma data e um intervalo válidos.");
  }
  return {
    title: fields.title.trim(),
    location: fields.location.trim(),
    notes: fields.notes.trim(),
    startsAt: fields.date.toISOString(),
    endsAt: new Date(fields.date.getTime() + duration).toISOString(),
    reminderMinutes: original?.reminderMinutes ?? 30,
    completed: original?.completed ?? false,
  };
}

export function appointmentInput(
  fields: AppointmentFields,
  original?: Appointment,
) {
  const { date, ...values } = fields;
  return {
    ...values,
    scheduledAt: date.toISOString(),
    status: original?.status ?? "pendente",
    version: original?.version,
  };
}

export function mergeDatePart(
  current: Date,
  selected: Date,
  part: "date" | "time",
) {
  const result = new Date(current);
  if (part === "date")
    result.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
    );
  else result.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return result;
}

export function personalEventIsHistory(
  event: Pick<PersonalEvent, "completed" | "startsAt" | "endsAt">,
  now: number,
) {
  const end = Date.parse(event.endsAt);
  return (
    event.completed ||
    (Number.isFinite(end) ? end : Date.parse(event.startsAt)) <= now
  );
}
