const DAYS_PER_WEEK = 7;
const MILLISECONDS_PER_DAY = 86_400_000;

export function toLocalDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayParts(key: string): [number, number, number] {
  const [year, month, day] = key.split("-").map(Number);
  return [year, month - 1, day];
}

export function dateFromDayKey(key: string) {
  return new Date(...dayParts(key));
}

export function shiftDayKey(key: string, days: number) {
  const [year, month, day] = dayParts(key);
  return toLocalDayKey(new Date(year, month, day + days));
}

export function agendaWeek(today: string, selectedDay: string) {
  // Compare calendar dates, not elapsed hours, so daylight saving cannot shift the week.
  const daysFromToday = (Date.UTC(...dayParts(selectedDay)) - Date.UTC(...dayParts(today))) / MILLISECONDS_PER_DAY;
  const offset = Math.floor(daysFromToday / DAYS_PER_WEEK) * DAYS_PER_WEEK;
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => shiftDayKey(today, offset + index));
}

export function groupAgendaByDay<T extends { at: string }>(items: readonly T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const date = new Date(item.at);
    if (!Number.isFinite(date.getTime())) continue;
    const key = toLocalDayKey(date);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}
