import { apiRequest } from "../../../shared/api/client";

export type ProfessionalStatus = "ativo" | "ferias";

export type Professional = {
  id: number;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  status: ProfessionalStatus;
};

export type ProfessionalInput = Omit<Professional, "id">;

type ProfessionalPage = {
  data: Professional[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export const professionalsApi = {
  list: (token: string, search = "") => apiRequest<ProfessionalPage>(`/professionals?limit=100&search=${encodeURIComponent(search.trim())}`, { headers: auth(token) }),
  create: (token: string, input: ProfessionalInput) => apiRequest<{ message: string; professional: Professional }>("/professionals", { method: "POST", headers: auth(token), body: JSON.stringify(input) }),
  update: (token: string, id: number, input: ProfessionalInput) => apiRequest<{ message: string; professional: Professional }>(`/professionals/${id}`, { method: "PUT", headers: auth(token), body: JSON.stringify(input) }),
  remove: (token: string, id: number) => apiRequest<{ message: string }>(`/professionals/${id}`, { method: "DELETE", headers: auth(token) }),
};
