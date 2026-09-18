import { apiRequest } from "../../../shared/api/client";

export type Service = {
  id: number;
  name: string;
  category: string;
  durationMinutes: number;
  price: number;
  description: string;
};

export type ServiceInput = Omit<Service, "id">;

type ServicePage = {
  data: Service[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export const servicesApi = {
  list: (token: string, search = "") => apiRequest<ServicePage>(`/services?limit=100&search=${encodeURIComponent(search.trim())}`, { headers: auth(token) }),
  create: (token: string, input: ServiceInput) => apiRequest<{ message: string; service: Service }>("/services", { method: "POST", headers: auth(token), body: JSON.stringify(input) }),
  update: (token: string, id: number, input: ServiceInput) => apiRequest<{ message: string; service: Service }>(`/services/${id}`, { method: "PUT", headers: auth(token), body: JSON.stringify(input) }),
  remove: (token: string, id: number) => apiRequest<{ message: string }>(`/services/${id}`, { method: "DELETE", headers: auth(token) }),
};
