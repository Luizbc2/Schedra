import { test } from "node:test";
import assert from "node:assert/strict";
import { personalEventInput, appointmentInput, mergeDatePart, personalEventIsHistory } from "../src/features/agenda/domain/agenda-editor.ts";

const original = { title: "Consulta", location: "Clínica", notes: "Observação", startsAt: "2026-09-01T10:00:00.000Z", endsAt: "2026-09-01T11:30:00.000Z", completed: true, reminderMinutes: 0 };
const referenceNow = Date.parse("2026-08-01T00:00:00.000Z");
test("editar texto preserva duração, conclusão e lembrete", () => {
  const result = personalEventInput({ ...original, title: "Consulta revisada", date: new Date(original.startsAt) }, original, referenceNow);
  assert.equal(result.endsAt, original.endsAt);
  assert.equal(result.completed, true);
  assert.equal(result.reminderMinutes, 0);
  assert.equal(result.startsAt, original.startsAt);
});
test("reagendar preserva os 90 minutos originais", () => {
  const result = personalEventInput({ ...original, date: new Date("2026-09-12T15:00:00Z") }, original, referenceNow);
  assert.equal(result.endsAt, "2026-09-12T16:30:00.000Z");
});
test("novo compromisso recebe duração padrão sem herdar conclusão", () => {
  const result = personalEventInput({ ...original, date: new Date(original.startsAt) }, undefined, referenceNow);
  assert.equal(result.endsAt, "2026-09-01T11:00:00.000Z");
  assert.equal(result.completed, false);
});
for (const status of ["confirmado", "cancelado", "pendente"]) {
  test(`editar agendamento preserva status ${status} e versão`, () => {
    const result = appointmentInput({ date: new Date(original.startsAt), clientId: 1, professionalId: 2, serviceId: 3, notes: "Atualizado" }, { status, version: 4 }, referenceNow);
    assert.equal(result.status, status);
    assert.equal(result.version, 4);
  });
}
test("impede compromisso pessoal e agendamento no passado", () => {
  const pastDate = new Date("2026-07-31T23:59:00.000Z");
  assert.throws(() => personalEventInput({ ...original, date: pastDate }, undefined, referenceNow), /futuros/);
  assert.throws(() => appointmentInput({ date: pastDate, clientId: 1, professionalId: 2, serviceId: 3, notes: "" }, undefined, referenceNow), /futuros/);
});
test("Android altera data sem perder hora e hora sem perder data", () => {
  const initial = new Date(2026, 8, 8, 15, 30);
  const date = mergeDatePart(initial, new Date(2026, 9, 2), "date");
  assert.equal(date.getDate(), 2); assert.equal(date.getHours(), 15);
  const time = mergeDatePart(date, new Date(2026, 0, 1, 9, 45), "time");
  assert.equal(time.getMonth(), 9); assert.equal(time.getHours(), 9); assert.equal(time.getMinutes(), 45);
});
test("evento encerrado ou concluído sai dos próximos; em andamento permanece", () => {
  assert.equal(personalEventIsHistory({ ...original, completed: false }, Date.parse(original.endsAt)), true);
  assert.equal(personalEventIsHistory({ ...original, completed: false }, Date.parse(original.startsAt)), false);
  assert.equal(personalEventIsHistory(original, Date.parse(original.startsAt)), true);
});
