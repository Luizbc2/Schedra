import { createCatalogData } from "../repositories/catalog-data";

export type Client = { id: number; name: string; email: string; phone: string; cpf: string; notes: string };
export type ClientInput = Omit<Client, "id">;
export const clientsApi = createCatalogData("clients", "client");
