import { createCatalogData } from "../repositories/catalog-data";

export type Service = {
  id: number;
  name: string;
  category: string;
  durationMinutes: number;
  price: number;
  description: string;
};

export type ServiceInput = Omit<Service, "id">;

export const servicesApi = createCatalogData("services", "service");
