import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { AgendaScreen } from "../../src/features/agenda/screens/AgendaScreen";
import { dateFromDayKey, shiftDayKey, toLocalDayKey } from "../../src/features/agenda/domain/agenda-days";

const listAppointments = vi.hoisted(() => vi.fn());
const searchOptions = vi.hoisted(() => vi.fn());
const saveAppointment = vi.hoisted(() => vi.fn());
vi.mock("../../src/features/agenda/api/agenda-api", () => ({ agendaApi: { listAppointments, searchOptions, saveAppointment } }));
vi.mock("../../src/features/auth/AuthProvider", () => ({
  useAuth: () => ({ token: "test-token", user: { name: "Maria" }, workspaceMode: "business" }),
}));
vi.mock("../../src/shared/components/AppHeader", () => ({ AppHeader: () => null }));
vi.mock("../../src/features/agenda/components/AgendaDateTimeField", () => ({ AgendaDateTimeField: () => null }));
vi.mock("react-native-safe-area-context", async () => ({ SafeAreaView: (await import("react-native")).View }));

it("opens on today, shows daily totals and filters without reloading", async () => {
  const today = toLocalDayKey(new Date());
  const tomorrow = shiftDayKey(today, 1);
  const shortDate = (key: string) => `${key.slice(8)}/${key.slice(5, 7)}`;
  const appointment = (id: number, name: string, day: string) => ({
    id, clientName: name, serviceName: "Corte", professionalName: "Ana",
    scheduledAt: dateFromDayKey(day).toISOString(),
    status: "confirmado",
  });
  listAppointments.mockResolvedValue({
    data: [appointment(1, "Cliente de hoje", today), appointment(2, "Primeiro de amanha", tomorrow), appointment(3, "Segundo de amanha", tomorrow)],
    local: { source: "server" },
  });

  render(<AgendaScreen />);
  const todayTab = await screen.findByRole("tab", { name: `Hoje, ${shortDate(today)}, 1 atendimento` });
  expect(todayTab.getAttribute("aria-selected")).toBe("true");
  expect(screen.getByText("Cliente de hoje")).toBeTruthy();
  expect(screen.queryByText("Primeiro de amanha")).toBeNull();

  const tomorrowTab = screen.getByRole("tab", { name: `${shortDate(tomorrow)}, 2 atendimentos` });
  fireEvent.click(tomorrowTab);
  expect(tomorrowTab.getAttribute("aria-selected")).toBe("true");
  expect(screen.queryByText("Cliente de hoje")).toBeNull();
  expect(screen.getByText("Primeiro de amanha")).toBeTruthy();
  expect(screen.getByText("Segundo de amanha")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Pr\u00f3xima semana" }));
  expect(screen.getByRole("tab", { name: `${shortDate(shiftDayKey(tomorrow, 7))}, 0 atendimentos` }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByText("Nenhum atendimento")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Voltar para hoje" }));
  expect(screen.getByText("Cliente de hoje")).toBeTruthy();
  expect(listAppointments).toHaveBeenCalledTimes(1);
});

it("searches each catalog in the editor and saves the chosen IDs", async () => {
  listAppointments.mockResolvedValue({ data: [], local: { source: "server" } });
  searchOptions.mockImplementation(async (_token: string, group: string, query: string, page: number) => {
    if (group === "clients") {
      if (query === "Maria") return { data: [{ id: 320, name: "Maria Lopes" }], totalPages: 1 };
      if (page === 2) return { data: [{ id: 13, name: "Outra cliente" }], totalPages: 2 };
      return { data: [{ id: 1, name: "Primeira cliente" }], totalPages: 2 };
    }
    if (group === "professionals") return { data: [{ id: 25, name: "Ana Silva" }], totalPages: 1 };
    return { data: [{ id: 49, name: "Corte" }], totalPages: 1 };
  });
  saveAppointment.mockResolvedValue({});

  render(<AgendaScreen />);
  fireEvent.click(screen.getByRole("button", { name: "Novo agendamento" }));
  const client = await screen.findByRole("button", { name: "Cliente: Selecionar" });
  const save = screen.getByRole("button", { name: "Salvar agendamento" });
  expect(save.getAttribute("aria-disabled")).toBe("true");
  expect(searchOptions).not.toHaveBeenCalled();
  fireEvent.click(client);
  await screen.findByRole("button", { name: "Primeira cliente" });
  fireEvent.click(screen.getByRole("button", { name: "Pr\u00f3xima p\u00e1gina" }));
  await screen.findByRole("button", { name: "Outra cliente" });
  const search = screen.getByRole("textbox", { name: "Buscar cliente" });
  fireEvent.change(search, { target: { value: "Maria" } });
  fireEvent.click(await screen.findByRole("button", { name: "Maria Lopes" }));
  expect(searchOptions).toHaveBeenCalledWith("test-token", "clients", "Maria", 1, expect.any(AbortSignal));
  expect(screen.getByRole("button", { name: "Cliente: Maria Lopes" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Buscar cliente" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Profissional: Selecionar" }));
  fireEvent.click(await screen.findByRole("button", { name: "Ana Silva" }));
  fireEvent.click(screen.getByRole("button", { name: "Servi\u00e7o: Selecionar" }));
  fireEvent.click(await screen.findByRole("button", { name: "Corte" }));
  expect(save.getAttribute("aria-disabled")).not.toBe("true");
  const loadsBeforeSave = listAppointments.mock.calls.length;
  fireEvent.click(save);
  expect(saveAppointment).toHaveBeenCalledWith("test-token", expect.objectContaining({ clientId: 320, professionalId: 25, serviceId: 49 }), undefined);
  await waitFor(() => expect(listAppointments).toHaveBeenCalledTimes(loadsBeforeSave + 1));
});
