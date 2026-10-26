import { createCatalogData } from "../repositories/catalog-data";

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

export const professionalsApi = createCatalogData("professionals", "professional");
