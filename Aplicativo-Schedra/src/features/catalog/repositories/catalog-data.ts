import { apiRequest, fetchAllPages } from "../../../shared/api/client";
import { cachedQuery, cacheChangedRecord, cacheRemovedRecord } from "../../../shared/database/cached-query";
import type { RemoteEntities } from "../../../shared/database/types";

type CatalogTable = "clients" | "services" | "professionals";

export function createCatalogData<T extends CatalogTable, K extends "client" | "service" | "professional">(table: T, field: K) {
  type Item = RemoteEntities[T];
  type Input = Omit<Item, "id">;
  type Result = Record<K, Item> & { message: string };
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  const save = async (token: string, input: Input, id?: number) => {
    const result = await apiRequest<Result>(id ? `/${table}/${id}` : `/${table}`, {
      method: id ? "PUT" : "POST", headers: headers(token), body: JSON.stringify(input),
    });
    // A cache failure must not turn a server-confirmed create into a duplicate retry.
    await cacheChangedRecord<T>(table, token, result[field] as Item).catch(() => console.warn("O cadastro foi salvo no servidor, mas o cache local nao foi atualizado."));
    return result;
  };
  return {
    list: async (token: string, search = "") => {
      const result = await cachedQuery(table, token, () => fetchAllPages<Item>(`/${table}?limit=100&search=${encodeURIComponent(search.trim())}`, token), search);
      return { ...result, page: 1, limit: result.data.length, totalItems: result.data.length, totalPages: 1 };
    },
    create: (token: string, input: Input) => save(token, input),
    update: (token: string, id: number, input: Input) => save(token, input, id),
    remove: async (token: string, id: number) => {
      const result = await apiRequest<{ message: string }>(`/${table}/${id}`, { method: "DELETE", headers: headers(token) });
      await cacheRemovedRecord(table, token, id).catch(() => console.warn("O registro foi removido do servidor, mas o cache local nao foi atualizado."));
      return result;
    },
  };
}
