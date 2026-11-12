import { apiRequest, fetchAllPages } from "../../../shared/api/client";
import { cachedQuery, cacheChangedRecord, cacheRemovedRecord } from "../../../shared/database/cached-query";
import { clientsApi } from "../../catalog/api/clients-api";
import { professionalsApi } from "../../catalog/api/professionals-api";
import { servicesApi } from "../../catalog/api/services-api";

export type Appointment = { id: number; clientId: number; clientName: string; professionalId: number; professionalName: string; serviceId: number; serviceName: string; scheduledAt: string; endsAt: string; durationMinutes: number; priceSnapshot: number; version: number; status: "confirmado" | "pendente" | "cancelado"; notes: string };
type AppointmentInput = Pick<Appointment, "clientId" | "professionalId" | "serviceId" | "scheduledAt" | "status" | "notes"> & { version?: number };
export type PersonalEvent = { id: number; title: string; startsAt: string; endsAt: string; location: string; notes: string; reminderMinutes: number; completed: boolean };
export type EntityOption = { id: number; name: string };
type Page<T> = { data: T[] };
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export const agendaApi = {
  listAppointments: (token: string) => cachedQuery("appointments", token, () => fetchAllPages<Appointment>("/appointments?limit=100", token)),
  saveAppointment: async (token: string, input: AppointmentInput, id?: number) => {
    const result = await apiRequest<{ appointment: Appointment }>(id ? `/appointments/${id}` : "/appointments", { method: id ? "PUT" : "POST", headers: auth(token), body: JSON.stringify(input) });
    await cacheChangedRecord("appointments", token, result.appointment).catch(() => console.warn("Nao foi possivel atualizar o agendamento local."));
    return result;
  },
  deleteAppointment: async (token: string, id: number) => {
    const result = await apiRequest<{ message: string }>(`/appointments/${id}`, { method: "DELETE", headers: auth(token) });
    await cacheRemovedRecord("appointments", token, id).catch(() => console.warn("Nao foi possivel remover o agendamento local."));
    return result;
  },
  listPersonal: async (token: string) => {
    const result = await cachedQuery("personal_events", token, async () => (await apiRequest<{ items: PersonalEvent[] }>("/personal-events", { headers: auth(token) })).items);
    return { items: result.data, local: result.local };
  },
  savePersonal: async (token: string, input: Omit<PersonalEvent, "id">, id?: number) => {
    const result = await apiRequest<{ event: PersonalEvent }>(id ? `/personal-events/${id}` : "/personal-events", { method: id ? "PUT" : "POST", headers: auth(token), body: JSON.stringify(input) });
    await cacheChangedRecord("personal_events", token, result.event).catch(() => console.warn("Nao foi possivel atualizar o compromisso local."));
    return result;
  },
  deletePersonal: async (token: string, id: number) => {
    const result = await apiRequest<{ message: string }>(`/personal-events/${id}`, { method: "DELETE", headers: auth(token) });
    await cacheRemovedRecord("personal_events", token, id).catch(() => console.warn("Nao foi possivel remover o compromisso local."));
    return result;
  },
  listOptions: async (token: string) => {
    const [clients, professionals, services] = await Promise.all([clientsApi.list(token), professionalsApi.list(token), servicesApi.list(token)]);
    return { clients: clients.data, professionals: professionals.data, services: services.data };
  },
};
