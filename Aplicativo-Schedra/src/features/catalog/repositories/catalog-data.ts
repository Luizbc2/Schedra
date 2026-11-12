import { ApiError, apiRequest, fetchAllPages } from "../../../shared/api/client";
import { cachedQuery, cacheChangedRecord, cacheRemovedRecord } from "../../../shared/database/cached-query";
import { createCollectionRepository } from "../../../shared/database/collection-repository";
import { getLocalDatabase } from "../../../shared/database/database";
import { captureDataSession } from "../../../shared/database/scope";
import type { RemoteEntities } from "../../../shared/database/types";
import { isOnline } from "../../../shared/network/connection";

type CatalogTable = "clients" | "services" | "professionals";
type CatalogPage<T> = { data: T[]; totalPages: number };
const OPTION_PAGE_SIZE = 12;

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
    searchPage: async (token: string, search: string, page: number, signal?: AbortSignal): Promise<CatalogPage<Item>> => {
      const session = captureDataSession(token);
      const readLocal = async () => {
        session.assertCurrent();
        const repository = createCollectionRepository(getLocalDatabase, table);
        const { data, known, totalItems } = await repository.read(session.scope, search, page, OPTION_PAGE_SIZE);
        session.assertCurrent();
        if (!known) throw new Error("Conecte-se para consultar os cadastros.");
        return { data, totalPages: Math.max(1, Math.ceil(totalItems / OPTION_PAGE_SIZE)) };
      };
      if (!(await isOnline())) return readLocal();
      try {
        const query = new URLSearchParams({ search: search.trim(), page: String(page), limit: String(OPTION_PAGE_SIZE) });
        const result = await apiRequest<CatalogPage<Item>>(`/${table}?${query}`, { headers: headers(token), signal });
        session.assertCurrent();
        return result;
      } catch (error) {
        session.assertCurrent();
        if (signal?.aborted || (error instanceof ApiError && error.status >= 400 && error.status < 500)) throw error;
        try { return await readLocal(); } catch { throw error; }
      }
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
