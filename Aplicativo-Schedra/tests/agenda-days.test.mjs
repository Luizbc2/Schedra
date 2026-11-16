import assert from "node:assert/strict";
import { test } from "node:test";
import { agendaWeek, groupAgendaByDay, shiftDayKey } from "../src/features/agenda/domain/agenda-days.ts";

test("starts the first seven-day window on today and navigates across month boundaries", () => {
  assert.deepEqual(agendaWeek("2026-11-28", "2026-11-28"), [
    "2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01",
    "2026-12-02", "2026-12-03", "2026-12-04",
  ]);
  assert.equal(agendaWeek("2026-11-28", "2026-11-27")[0], "2026-11-21");
  assert.equal(agendaWeek("2026-11-28", "2026-12-05")[0], "2026-12-05");
  assert.equal(shiftDayKey("2026-12-28", 7), "2027-01-04");
});

test("groups appointments by the local date shown in the agenda", () => {
  const late = { id: 1, at: new Date(2026, 10, 12, 23, 45).toISOString() };
  const early = { id: 2, at: new Date(2026, 10, 13, 0, 15).toISOString() };
  const another = { id: 3, at: new Date(2026, 10, 13, 14).toISOString() };
  const groups = groupAgendaByDay([late, early, another, { id: 4, at: "invalid" }]);

  assert.deepEqual(groups.get("2026-11-12"), [late]);
  assert.deepEqual(groups.get("2026-11-13"), [early, another]);
  assert.equal(groups.size, 2);
});
